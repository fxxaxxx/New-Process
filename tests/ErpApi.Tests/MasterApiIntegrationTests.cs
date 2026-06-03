using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Dapper;
using ErpApi.Infrastructure.Security;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class MasterApiIntegrationTests(DbFixture fx)
{
    private static IConfiguration JwtCfg() => new ConfigurationBuilder().AddInMemoryCollection(
        new Dictionary<string, string?> {
            ["Erp:Jwt:Issuer"] = "ErpApi", ["Erp:Jwt:Audience"] = "ErpClient", ["Erp:Jwt:ExpireMinutes"] = "60"
        }).Build();

    private WebApplicationFactory<Program> Factory()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Environment.SetEnvironmentVariable("ERP_DB", fx.ConnectionString);
        Environment.SetEnvironmentVariable("ERP_JWT_KEY", "test-key-please-change-0123456789abcdef");
        return new WebApplicationFactory<Program>();
    }

    private void SeedPerms(string user, bool canSave)
    {
        using var c = new SqlConnection(fx.ConnectionString);
        c.Open();
        c.Execute("DELETE FROM [userbqrpower] WHERE [用户]=@user", new { user });
        c.Execute(@"INSERT INTO [userbqrpower]([用户],[菜单],[打开],[保存],[删除])
                    VALUES(@user,N'客户资料',1,@canSave,1)", new { user, canSave });
    }

    private static string Token(string user) => new JwtTokenService(JwtCfg()).Issue(user);

    [SkippableFact]
    public async Task List_requires_open_permission_and_returns_data()
    {
        using var app = Factory();
        SeedPerms("p1viewer", canSave: false);
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("p1viewer"));

        var resp = await client.GetAsync("/api/master/customers?page=1&size=5");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [SkippableFact]
    public async Task Create_forbidden_without_save_permission()
    {
        using var app = Factory();
        SeedPerms("p1viewer", canSave: false);
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("p1viewer"));

        var resp = await client.PostAsJsonAsync("/api/master/customers",
            new { 客户编号 = "INT1", 客户名称 = "应被拒" });
        Assert.Equal(HttpStatusCode.Forbidden, resp.StatusCode);
    }

    [SkippableFact]
    public async Task Create_succeeds_with_save_permission_and_writes_audit()
    {
        using var app = Factory();
        SeedPerms("p1editor", canSave: true);
        using (var c = new SqlConnection(fx.ConnectionString))
        {
            c.Open();
            c.Execute("DELETE FROM [客户资料] WHERE [客户编号]='INT2'");
            c.Execute("DELETE FROM [c操作记录] WHERE [操作员]='p1editor' AND [表名]=N'客户资料'");
        }
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("p1editor"));

        var resp = await client.PostAsJsonAsync("/api/master/customers",
            new { 客户编号 = "INT2", 客户名称 = "集成新增" });
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        using var verify = new SqlConnection(fx.ConnectionString);
        verify.Open();
        Assert.Equal(1, verify.ExecuteScalar<int>("SELECT COUNT(*) FROM [客户资料] WHERE [客户编号]='INT2'"));
        Assert.True(verify.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [c操作记录] WHERE [操作员]='p1editor' AND [行为]=N'新增'") >= 1);
    }
}
