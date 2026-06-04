using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using ErpApi.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class P4ApiIntegrationTests(DbFixture fx)
{
    private static IConfiguration JwtCfg() => new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?>
        { ["Erp:Jwt:Issuer"] = "ErpApi", ["Erp:Jwt:Audience"] = "ErpClient", ["Erp:Jwt:ExpireMinutes"] = "60" }).Build();

    private WebApplicationFactory<Program> Factory()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Environment.SetEnvironmentVariable("ERP_DB", fx.ConnectionString);
        Environment.SetEnvironmentVariable("ERP_JWT_KEY", "test-key-please-change-0123456789abcdef");
        return new WebApplicationFactory<Program>();
    }

    private static string Token(string user) => new JwtTokenService(JwtCfg()).Issue(user);

    private void SeedPerms(string user, string menu,
        bool open = true, bool save = false, bool del = false,
        bool price = false, bool approve = false, bool unapprove = false)
    {
        using var c = new SqlConnection(fx.ConnectionString);
        c.Open();
        c.Execute("DELETE FROM [userbqrpower] WHERE [用户]=@user AND [菜单]=@menu", new { user, menu });
        c.Execute(@"INSERT INTO [userbqrpower]([用户],[菜单],[打开],[保存],[删除],[单价],[审核],[反审核])
                    VALUES(@user,@menu,@open,@save,@del,@price,@approve,@unapprove)",
            new { user, menu, open, save, del, price, approve, unapprove });
    }

    private HttpClient Client(WebApplicationFactory<Program> app, string user)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(user));
        return client;
    }

    private static object CuttingBody() => new
    {
        生产单号 = P4TestData.生产单号, 款号 = P4TestData.款号, 款式 = "P4测试款式",
        客户编号 = P4TestData.客户编号, 客户名称 = "P4测试客户",
        加工厂编号 = P4TestData.加工厂编号, 加工厂名称 = "P4测试加工厂", 床号 = "1", 布种 = "全棉",
        明细 = new[]
        {
            new { 扎号 = 1, 缸号 = "G1", 颜色 = "黑色", 尺码 = "M", 数量 = 40 },
            new { 扎号 = 2, 缸号 = "G1", 颜色 = "白色", 尺码 = "L", 数量 = 30 },
        }
    };

    [SkippableFact]
    public async Task Cutting_create_forbidden_without_save_permission()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); P4TestData.Seed(c); }
        SeedPerms("p4cbviewer", "裁床单", open: true, save: false);
        var resp = await Client(app, "p4cbviewer").PostAsJsonAsync("/api/cuttings", CuttingBody());
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); P4TestData.Cleanup(c); }
    }

    [SkippableFact]
    public async Task Cutting_lifecycle_create_approve_unapprove_delete()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); P4TestData.Seed(c); }
        SeedPerms("p4cb", "裁床单", open: true, save: true, del: true, approve: true, unapprove: true);
        var client = Client(app, "p4cb");

        var create = await client.PostAsJsonAsync("/api/cuttings", CuttingBody());
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var 裁床单号 = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("裁床单号").GetString()!;
        try
        {
            var list = await client.GetFromJsonAsync<JsonElement>($"/api/cuttings?keyword={裁床单号}");
            Assert.Equal(1, list.GetProperty("total").GetInt32());
            var detail = await client.GetFromJsonAsync<JsonElement>($"/api/cuttings/{裁床单号}");
            Assert.Equal(2, detail.GetProperty("明细").GetArrayLength());
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/cuttings/{裁床单号}/approve", null)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/cuttings/{裁床单号}")).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/cuttings/{裁床单号}/unapprove", null)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/cuttings/{裁床单号}")).StatusCode);
        }
        finally
        {
            using var c = new SqlConnection(fx.ConnectionString); c.Open();
            c.Execute("DELETE FROM [裁床明细表] WHERE [裁床单号]=@n", new { n = 裁床单号 });
            c.Execute("DELETE FROM [裁床总表] WHERE [裁床单号]=@n", new { n = 裁床单号 });
            P4TestData.Cleanup(c);
        }
    }
}
