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
}
