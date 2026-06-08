using Dapper;
using ErpApi.Features.MonthEnd;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class MonthEndServiceDbTests(DbFixture fx)
{
    private static ISqlConnectionFactory Factory(string envVar)
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = envVar }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private MonthEndService Svc() => new(Factory("ERP_TEST_DB"));

    private const string 上月日期 = "2026-01-15";
    private const string 本月日期 = "2026-02-10";
    private const string 年月 = "202602";

    private static void Clean成品(Microsoft.Data.SqlClient.SqlConnection c, string wh)
    {
        c.Execute("DELETE FROM [成品入仓明细单] WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [成品入仓单]   WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [成品出仓明细单] WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [成品出仓单]   WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [结存快照表] WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'MEK'");
    }
    // 明细表对 款号总表(款号) 有外键，须先种父行
    private static void Seed款号(Microsoft.Data.SqlClient.SqlConnection c) =>
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [款号总表] WHERE [款号]=N'MEK') INSERT INTO [款号总表]([款号],[款式]) VALUES(N'MEK',N'演示')");
    private static void Clean半成品(Microsoft.Data.SqlClient.SqlConnection c, string wh)
    {
        foreach (var d in new[] { "半成品入仓明细单", "半成品领料明细单", "半成品盘点明细单" })
            c.Execute($"DELETE FROM [{d}] WHERE [仓库]=@wh", new { wh });
        foreach (var h in new[] { "半成品入仓单", "半成品领料单", "半成品盘点单" })
            c.Execute($"DELETE FROM [{h}] WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [结存快照表] WHERE [仓库]=@wh", new { wh });
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'BM1'");
    }
    // 半成品明细表对 物料资料(物料编号) 有外键，须先种父行
    private static void Seed物料(Microsoft.Data.SqlClient.SqlConnection c) =>
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [物料资料] WHERE [物料编号]=N'BM1') INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位]) VALUES(N'BM1',N'半料',N'规A',N'件')");

    [SkippableFact]
    public async Task Close_成品_单仓_期初本期入本期出结存()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        const string wh = "ME成品仓A";
        using var c = fx.Open();
        Clean成品(c, wh);
        Seed款号(c);
        try
        {
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'MER_L',@d,@wh,'1')", new { d = 上月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'MER_L',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',100,'1')", new { d = 上月日期, wh });
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'MER_T',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'MER_T',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',50,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品出仓单]([单号],[日期],[仓库],[审核]) VALUES(N'MEC_T',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品出仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'MEC_T',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',30,'1')", new { d = 本月日期, wh });

            var res = await Svc().CloseAsync(new MonthEndCloseRequest { 年月 = 年月, 口径 = "成品", 仓库 = wh }, "tester");
            Assert.Equal(1, res.结数);

            var row = c.QueryFirst<(decimal 期初, decimal 本期入, decimal 本期出, decimal 结存)>(
                "SELECT [期初],[本期入],[本期出],[结存] FROM [结存快照表] WHERE [年月]=@年月 AND [口径]=N'成品' AND [仓库]=@wh", new { 年月, wh });
            Assert.Equal(100m, row.期初);
            Assert.Equal(50m,  row.本期入);
            Assert.Equal(30m,  row.本期出);
            Assert.Equal(120m, row.结存);
        }
        finally { Clean成品(c, wh); }
    }

    [SkippableFact]
    public async Task Close_半成品_单仓_含盘点real()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        const string wh = "ME半成品仓A";
        using var c = fx.Open();
        Clean半成品(c, wh);
        Seed物料(c);
        try
        {
            c.Execute("INSERT INTO [半成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'BMER_L',@d,@wh,'1')", new { d = 上月日期, wh });
            c.Execute("INSERT INTO [半成品入仓明细单]([单号],[日期],[仓库],[物料编号],[物料名称],[规格],[颜色],[数量]) VALUES(N'BMER_L',@d,@wh,N'BM1',N'半料',N'规A',N'黑',100)", new { d = 上月日期, wh });
            c.Execute("INSERT INTO [半成品领料单]([单号],[日期],[仓库],[审核]) VALUES(N'BML_T',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [半成品领料明细单]([单号],[日期],[仓库],[物料编号],[物料名称],[规格],[颜色],[数量]) VALUES(N'BML_T',@d,@wh,N'BM1',N'半料',N'规A',N'黑',30)", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [半成品盘点单]([单号],[日期],[仓库],[审核]) VALUES(N'BMP_T',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [半成品盘点明细单]([单号],[日期],[仓库],[物料编号],[物料名称],[规格],[颜色],[系统数量],[盘点数量],[盈亏数量]) VALUES(N'BMP_T',@d,@wh,N'BM1',N'半料',N'规A',N'黑',70,68,-2)", new { d = 本月日期, wh });

            var res = await Svc().CloseAsync(new MonthEndCloseRequest { 年月 = 年月, 口径 = "半成品", 仓库 = wh }, "tester");
            Assert.Equal(1, res.结数);

            var row = c.QueryFirst<(decimal 期初, decimal 本期入, decimal 本期出, decimal 结存)>(
                "SELECT [期初],[本期入],[本期出],[结存] FROM [结存快照表] WHERE [年月]=@年月 AND [口径]=N'半成品' AND [仓库]=@wh", new { 年月, wh });
            Assert.Equal(100m, row.期初);
            Assert.Equal(0m,   row.本期入);
            Assert.Equal(32m,  row.本期出);
            Assert.Equal(68m,  row.结存);
        }
        finally { Clean半成品(c, wh); }
    }

    [SkippableFact]
    public async Task Close_只计审核1_未审核不计()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        const string wh = "ME成品仓B";
        using var c = fx.Open();
        Clean成品(c, wh);
        Seed款号(c);
        try
        {
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'MER_OK',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'MER_OK',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',10,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'MER_NO',@d,@wh,'0')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'MER_NO',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',999,'0')", new { d = 本月日期, wh });

            await Svc().CloseAsync(new MonthEndCloseRequest { 年月 = 年月, 口径 = "成品", 仓库 = wh }, "tester");
            var 结存 = c.QueryFirst<decimal>("SELECT [结存] FROM [结存快照表] WHERE [年月]=@年月 AND [仓库]=@wh AND [口径]=N'成品'", new { 年月, wh });
            Assert.Equal(10m, 结存);
        }
        finally { Clean成品(c, wh); }
    }

    [SkippableFact]
    public async Task Close_净零但本期有流水_保留行()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        const string wh = "ME净零仓";
        using var c = fx.Open();
        Clean成品(c, wh);
        Seed款号(c);
        try
        {
            // 本月入50 + 本月出50 → 结存0，但本期有真实流水，应保留一行
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'NZ_R',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'NZ_R',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',50,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品出仓单]([单号],[日期],[仓库],[审核]) VALUES(N'NZ_C',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品出仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'NZ_C',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',50,'1')", new { d = 本月日期, wh });

            var res = await Svc().CloseAsync(new MonthEndCloseRequest { 年月 = 年月, 口径 = "成品", 仓库 = wh }, "tester");
            Assert.Equal(1, res.结数);
            var row = c.QueryFirst<(decimal 期初, decimal 本期入, decimal 本期出, decimal 结存)>(
                "SELECT [期初],[本期入],[本期出],[结存] FROM [结存快照表] WHERE [年月]=@年月 AND [口径]=N'成品' AND [仓库]=@wh", new { 年月, wh });
            Assert.Equal(0m, row.期初);
            Assert.Equal(50m, row.本期入);
            Assert.Equal(50m, row.本期出);
            Assert.Equal(0m, row.结存);
        }
        finally { Clean成品(c, wh); }
    }

    [SkippableFact]
    public async Task Close_仅NULL数量流水_不产生行()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        const string wh = "ME空量仓";
        using var c = fx.Open();
        Clean成品(c, wh);
        Seed款号(c);
        try
        {
            // 一条已审核但数量为 NULL 的本月入仓 → 不应产生快照行
            c.Execute("INSERT INTO [成品入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'NQ_R',@d,@wh,'1')", new { d = 本月日期, wh });
            c.Execute("INSERT INTO [成品入仓明细单]([单号],[日期],[仓库],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核]) VALUES(N'NQ_R',@d,@wh,N'MEK',N'演示',N'01',N'黑',N'M',NULL,'1')", new { d = 本月日期, wh });

            var res = await Svc().CloseAsync(new MonthEndCloseRequest { 年月 = 年月, 口径 = "成品", 仓库 = wh }, "tester");
            Assert.Equal(0, res.结数);
        }
        finally { Clean成品(c, wh); }
    }
}
