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
public class PurchaseOrderApiTests(DbFixture fx)
{
    private const string 供应商编号 = "POAS01";
    private const string 生产单号 = "POAMO001";

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

    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute("INSERT INTO [供应商资料]([供应商编号],[供应商名称]) VALUES(@s,N'PO测试供应商')", new { s = 供应商编号 });
        c.Execute("INSERT INTO [生产制单]([生产单号],[审核]) VALUES(@mo,'0')", new { mo = 生产单号 });
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价]) VALUES(N'POAM01',N'PO面料',N'规格A',N'米',10)");
        c.Execute(@"INSERT INTO [生产BOM物料清单]([生产单号],[物料编号],[物料名称],[规格],[单位],[总数量],[需订数量],[预算单价],[供应商编号])
                    VALUES(@mo,N'POAM01',N'PO面料',N'规格A',N'米',100,80,10,@s)", new { mo = 生产单号, s = 供应商编号 });
    }

    private static void Cleanup(SqlConnection c)
    {
        c.Execute("DELETE FROM [采购明细单] WHERE [物料编号]=N'POAM01' OR [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [采购订单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [生产BOM物料清单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'POAM01'");
        c.Execute("DELETE FROM [供应商资料] WHERE [供应商编号]=@s", new { s = 供应商编号 });
    }

    private static object OrderBody() => new
    {
        生产单号 = 生产单号, 供应商编号 = 供应商编号, 供应商名称 = "PO测试供应商", 仓库 = "物料仓",
        明细 = new[]
        {
            new { 物料编号 = "POAM01", 物料名称 = "PO面料", 规格 = "规格A", 单位 = "米", 数量 = 80, 单价 = 10.0, 预算数量 = 100.0 },
        }
    };

    [SkippableFact]
    public async Task List_and_basis_forbidden_without_open_permission()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); Seed(c); }
        SeedPerms("ponoopen", "采购订单", open: false);
        try
        {
            var client = Client(app, "ponoopen");
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/purchase-orders")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/purchase-orders/basis?生产单号={生产单号}")).StatusCode);
        }
        finally { using var c = new SqlConnection(fx.ConnectionString); c.Open(); Cleanup(c); }
    }

    [SkippableFact]
    public async Task Lifecycle_create_approve_block_delete_unapprove_delete()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); Seed(c); }
        SeedPerms("pofull", "采购订单", open: true, save: true, del: true, price: true, approve: true, unapprove: true);
        var client = Client(app, "pofull");

        // basis 带料
        var basis = await client.GetFromJsonAsync<JsonElement>($"/api/purchase-orders/basis?生产单号={生产单号}");
        Assert.Equal(1, basis.GetArrayLength());

        var create = await client.PostAsJsonAsync("/api/purchase-orders", OrderBody());
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var 单号 = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("单号").GetString()!;
        try
        {
            var list = await client.GetFromJsonAsync<JsonElement>($"/api/purchase-orders?keyword={单号}");
            Assert.Equal(1, list.GetProperty("total").GetInt32());

            var detail = await client.GetFromJsonAsync<JsonElement>($"/api/purchase-orders/{单号}");
            Assert.Equal(1, detail.GetProperty("明细").GetArrayLength());

            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/purchase-orders/{单号}/approve", null)).StatusCode);
            // 已审核 → 重复审核冲突 + 删除冲突
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsync($"/api/purchase-orders/{单号}/approve", null)).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/purchase-orders/{单号}")).StatusCode);

            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/purchase-orders/{单号}/unapprove", null)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/purchase-orders/{单号}")).StatusCode);
        }
        finally
        {
            using var c = new SqlConnection(fx.ConnectionString); c.Open();
            c.Execute("DELETE FROM [采购明细单] WHERE [单号]=@单号", new { 单号 });
            c.Execute("DELETE FROM [采购订单] WHERE [单号]=@单号", new { 单号 });
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task Amounts_masked_without_单价_permission()
    {
        using var app = Factory();
        using (var c = new SqlConnection(fx.ConnectionString)) { c.Open(); Seed(c); }
        SeedPerms("poeditor", "采购订单", open: true, save: true, price: true);
        var editor = Client(app, "poeditor");
        var create = await editor.PostAsJsonAsync("/api/purchase-orders", OrderBody());
        var 单号 = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("单号").GetString()!;
        try
        {
            SeedPerms("ponoprice", "采购订单", open: true, price: false);
            var viewer = Client(app, "ponoprice");
            var list = await viewer.GetFromJsonAsync<JsonElement>($"/api/purchase-orders?keyword={单号}");
            Assert.Equal(JsonValueKind.Null, list.GetProperty("items").EnumerateArray().First().GetProperty("金额").ValueKind);
            var detail = await viewer.GetFromJsonAsync<JsonElement>($"/api/purchase-orders/{单号}");
            Assert.Equal(JsonValueKind.Null, detail.GetProperty("单头").GetProperty("金额").ValueKind);
            Assert.Equal(JsonValueKind.Null, detail.GetProperty("明细")[0].GetProperty("单价").ValueKind);
            Assert.Equal(JsonValueKind.Null, detail.GetProperty("明细")[0].GetProperty("金额").ValueKind);
            // 有单价权限者可见
            var d2 = await editor.GetFromJsonAsync<JsonElement>($"/api/purchase-orders/{单号}");
            Assert.Equal(10m, d2.GetProperty("明细")[0].GetProperty("单价").GetDecimal());
        }
        finally
        {
            using var c = new SqlConnection(fx.ConnectionString); c.Open();
            c.Execute("DELETE FROM [采购明细单] WHERE [单号]=@单号", new { 单号 });
            c.Execute("DELETE FROM [采购订单] WHERE [单号]=@单号", new { 单号 });
            Cleanup(c);
        }
    }
}
