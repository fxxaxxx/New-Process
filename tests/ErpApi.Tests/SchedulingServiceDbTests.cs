using Dapper;
using ErpApi.Features.Scheduling;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

// 排期导入/查询/批次的 DB 集成测试(需 ERP_TEST_DB 指向已建库;未设置自动跳过)
[Collection("db")]
public class SchedulingServiceDbTests(DbFixture fx)
{
    private const string Cust = "测试客户SCH";

    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private SchedulingService Svc() => new(Factory());

    private static ScheduleImportRequest Req(params ScheduleImportRow[] rows)
        => new() { 排期客户 = Cust, 文件名 = "测试排期.xlsx", Rows = rows.ToList() };

    private static ScheduleImportRow Row(string po, string 货号, string 状态 = "在排", string 走货期 = "2026-03-01")
        => new() { 行号 = 2, 状态 = 状态, 来源工作表 = "总排期", PO号 = po, 货号 = 货号, 数量 = 100m, 走货期 = 走货期 };

    private static void Cleanup(SqlConnection c)
    {
        c.Execute("DELETE FROM [生产排期] WHERE [排期客户]=@Cust", new { Cust });
        c.Execute("DELETE FROM [生产排期批次] WHERE [排期客户]=@Cust", new { Cust });
    }

    [SkippableFact]
    public async Task Import_inserts_and_reimport_updates_by_natural_key()
    {
        using var c = fx.Open();
        Cleanup(c);
        try
        {
            var first = await Svc().ImportAsync(Req(Row("SCH-PO-1", "SCH-H-1")), "ut");
            Assert.Equal(1, first.新增);
            Assert.Equal(0, first.更新);

            // 重复导入同一行(状态改为已走货) → 不重复新增,按自然键更新
            var second = await Svc().ImportAsync(Req(Row("SCH-PO-1", "SCH-H-1", "已走货", "2026-04-02")), "ut");
            Assert.Equal(0, second.新增);
            Assert.Equal(1, second.更新);

            var list = await Svc().ListAsync(1, 20, "SCH-PO-1", Cust, null, null, null);
            var row = Assert.Single(list.Items);
            Assert.Equal("已走货", row.状态);
            Assert.Equal("2026-04-02", row.走货期?.ToString("yyyy-MM-dd"));
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task List_filters_and_delete_batch_cascades()
    {
        using var c = fx.Open();
        Cleanup(c);
        try
        {
            var res = await Svc().ImportAsync(Req(Row("SCH-PO-2", "SCH-H-2"), Row("SCH-PO-3", "SCH-H-3", "已取消")), "ut");
            Assert.Equal(2, res.新增);

            var cancelled = await Svc().ListAsync(1, 20, null, Cust, "已取消", null, null);
            Assert.Single(cancelled.Items);

            var ranged = await Svc().ListAsync(1, 20, null, Cust, null,
                new DateTime(2026, 2, 1), new DateTime(2026, 3, 31));
            Assert.Equal(2, ranged.Total);

            Assert.True(await Svc().DeleteBatchAsync(res.批次ID));
            var left = await Svc().ListAsync(1, 20, null, Cust, null, null, null);
            Assert.Equal(0, left.Total);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task MaterialIssue_shipped_remark_marks_schedule_via_production_order()
    {
        const string mo = "SC-SCH-UT-1";
        const string ll = "LL-SCH-UT-1";
        using var c = fx.Open();
        void CleanAll()
        {
            Cleanup(c);
            c.Execute("DELETE FROM [领料明细单] WHERE [单号]=@ll", new { ll });
            c.Execute("DELETE FROM [领料单] WHERE [单号]=@ll", new { ll });
            c.Execute("DELETE FROM [生产制单货号] WHERE [生产单号]=@mo", new { mo });
            c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=@mo", new { mo });
            c.Execute("DELETE FROM [物料资料] WHERE [物料编号]='SCH-H-9'");
        }
        CleanAll();
        try
        {
            // 领料明细单.物料编号 有外键指向 物料资料，先种父行
            c.Execute("IF NOT EXISTS (SELECT 1 FROM [物料资料] WHERE [物料编号]='SCH-H-9') INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位]) VALUES('SCH-H-9','排期联动料','规','PCS')");
            // 同一货号挂在两个 PO 的在排行上：溯源只应翻生产单对应的那个 PO
            var res = await Svc().ImportAsync(Req(Row("SCH-PO-A", "SCH-H-9"), Row("SCH-PO-B", "SCH-H-9")), "ut");
            Assert.Equal(2, res.新增);
            c.Execute("INSERT INTO [生产制单]([生产单号],[合同号],[客户款号]) VALUES(@mo,'SCH-PO-A','SCH-H-9')", new { mo });
            c.Execute("INSERT INTO [生产制单货号]([生产单号],[序号],[货号]) VALUES(@mo,1,'SCH-H-9')", new { mo });
            c.Execute("INSERT INTO [领料单]([单号],[日期],[领料部门],[仓库],[审核],[备注]) VALUES(@ll,GETDATE(),'装配部','半成品仓','0','走货')", new { ll });
            c.Execute("INSERT INTO [领料明细单]([单号],[生产单号],[物料编号],[数量]) VALUES(@ll,@mo,'SCH-H-9',10)", new { ll, mo });

            Assert.Equal(1, await Svc().MarkShippedForMaterialIssueAsync(ll, "ut"));
            var states = (await c.QueryAsync<(string PO号, string 状态)>(
                "SELECT [PO号],[状态] FROM [生产排期] WHERE [排期客户]=@Cust ORDER BY [PO号]", new { Cust })).AsList();
            Assert.Equal(2, states.Count);
            Assert.Equal("已走货", states[0].状态); // SCH-PO-A
            Assert.Equal("在排", states[1].状态);   // SCH-PO-B 不受影响

            // 备注不含"走货" → 不动排期
            c.Execute("UPDATE [领料单] SET [备注]='正常领料' WHERE [单号]=@ll", new { ll });
            Assert.Equal(0, await Svc().MarkShippedForMaterialIssueAsync(ll, "ut"));

            // 无生产单号的行 → 按货号兜底翻全部在排行
            c.Execute("UPDATE [领料单] SET [备注]='走货' WHERE [单号]=@ll", new { ll });
            c.Execute("UPDATE [领料明细单] SET [生产单号]=NULL WHERE [单号]=@ll", new { ll });
            Assert.Equal(1, await Svc().MarkShippedForMaterialIssueAsync(ll, "ut"));
            var left = await c.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM [生产排期] WHERE [排期客户]=@Cust AND [状态]='在排'", new { Cust });
            Assert.Equal(0, left);
        }
        finally { CleanAll(); }
    }
}
