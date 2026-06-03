using Dapper;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Posting;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PostingEngineDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string,string?>{ ["Erp:ConnectionStringEnvVar"]="ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    [SkippableFact]
    public async Task Approve_then_unapprove_flips_flag_and_audits()
    {
        using var c = fx.Open();
        c.Execute("DELETE FROM [成品入仓单] WHERE [单号]='P0TEST'");
        c.Execute("DELETE FROM [c操作记录] WHERE [操作记录]=N'单号=P0TEST'");
        c.Execute("INSERT INTO [成品入仓单]([单号],[审核]) VALUES('P0TEST','0')");

        var engine = new PostingEngine(Factory(), new AuditLogger());

        Assert.True(await engine.ApproveAsync("成品入仓单", "P0TEST", "tester"));
        Assert.Equal("1", c.ExecuteScalar<string>("SELECT [审核] FROM [成品入仓单] WHERE [单号]='P0TEST'"));
        Assert.Equal("tester", c.ExecuteScalar<string>("SELECT [审核人] FROM [成品入仓单] WHERE [单号]='P0TEST'"));

        Assert.False(await engine.ApproveAsync("成品入仓单", "P0TEST", "tester")); // 已是1，重复审核返回false
        Assert.True(await engine.UnapproveAsync("成品入仓单", "P0TEST", "tester"));
        Assert.Equal("0", c.ExecuteScalar<string>("SELECT [审核] FROM [成品入仓单] WHERE [单号]='P0TEST'"));

        Assert.True(c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [c操作记录] WHERE [操作记录]=N'单号=P0TEST'") >= 2);
    }
}
