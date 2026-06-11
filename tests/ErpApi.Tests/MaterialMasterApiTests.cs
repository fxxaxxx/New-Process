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
public class MaterialMasterApiTests(DbFixture fx)
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

    private void SeedPerms(string user, bool open, bool price)
    {
        using var c = new SqlConnection(fx.ConnectionString);
        c.Open();
        c.Execute("DELETE FROM [userbqrpower] WHERE [用户]=@user AND [菜单]=N'物料资料'", new { user });
        c.Execute(@"INSERT INTO [userbqrpower]([用户],[菜单],[打开],[单价]) VALUES(@user,N'物料资料',@open,@price)",
            new { user, open, price });
    }

    private HttpClient Client(WebApplicationFactory<Program> app, string user)
    {
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(user));
        return client;
    }

    private static void Seed(SqlConnection c)
    {
        Clean(c);
        c.Execute(@"INSERT INTO [物料资料]([物料类别],[物料编号],[物料名称],[单位],[单价],[销售价])
                    VALUES(N'面料API',N'MMA01',N'API面料',N'米',10,15)");
    }
    private static void Clean(SqlConnection c)
        => c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'MMA01'");

    [SkippableFact]
    public async Task Forbidden_without_open_permission()
    {
        using var app = Factory();
        SeedPerms("mmnoopen", open: false, price: false);
        var resp = await Client(app, "mmnoopen").GetAsync("/api/material-master/categories");
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [SkippableFact]
    public async Task List_masks_price_without_单价_permission()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); Seed(c); }
        try
        {
            SeedPerms("mmnoprice", open: true, price: false);
            var noprice = await Client(app, "mmnoprice")
                .GetFromJsonAsync<JsonElement>("/api/material-master?keyword=MMA01");
            var row = noprice.GetProperty("items")[0];
            Assert.Equal(JsonValueKind.Null, row.GetProperty("单价").ValueKind);
            Assert.Equal(JsonValueKind.Null, row.GetProperty("销售价").ValueKind);

            SeedPerms("mmprice", open: true, price: true);
            var withprice = await Client(app, "mmprice")
                .GetFromJsonAsync<JsonElement>("/api/material-master?keyword=MMA01");
            Assert.Equal(10m, withprice.GetProperty("items")[0].GetProperty("单价").GetDecimal());
        }
        finally { using var c = new SqlConnection(fx.ConnectionString); c.Open(); Clean(c); }
    }
}
