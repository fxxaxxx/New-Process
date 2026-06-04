using Dapper;
using ErpApi.Engines.Inventory;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class MaterialInventoryDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private MaterialInventoryService Svc() => new(Factory());

    private void Seed(Microsoft.Data.SqlClient.SqlConnection c)
    {
        Cleanup(c);
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价]) VALUES(N'P3M01',N'P3面料',N'规格A',N'米',10)");
        c.Execute("INSERT INTO [采购入仓单]([单号],[仓库],[审核]) VALUES(N'P3RK01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [采购入仓明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'P3RK01',N'物料仓',N'P3M01',N'P3面料',N'规格A',N'米',100)");
        c.Execute("INSERT INTO [领料单]([单号],[仓库],[审核]) VALUES(N'P3LL01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [领料明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'P3LL01',N'物料仓',N'P3M01',N'P3面料',N'规格A',N'米',30)");
        c.Execute("INSERT INTO [退料单]([单号],[仓库],[审核]) VALUES(N'P3TL01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [退料明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'P3TL01',N'物料仓',N'P3M01',N'P3面料',N'规格A',N'米',5)");
        c.Execute("INSERT INTO [领料单]([单号],[仓库],[审核]) VALUES(N'P3LL99',N'物料仓','0')");
        c.Execute(@"INSERT INTO [领料明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'P3LL99',N'物料仓',N'P3M01',N'P3面料',N'规格A',N'米',999)");
    }

    private void Cleanup(Microsoft.Data.SqlClient.SqlConnection c)
    {
        c.Execute("DELETE FROM [采购入仓明细单] WHERE [物料编号]=N'P3M01'");
        c.Execute("DELETE FROM [采购入仓单] WHERE [单号] IN (N'P3RK01')");
        c.Execute("DELETE FROM [领料明细单] WHERE [物料编号]=N'P3M01'");
        c.Execute("DELETE FROM [领料单] WHERE [单号] IN (N'P3LL01',N'P3LL99')");
        c.Execute("DELETE FROM [退料明细单] WHERE [物料编号]=N'P3M01'");
        c.Execute("DELETE FROM [退料单] WHERE [单号] IN (N'P3TL01')");
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'P3M01'");
    }

    [SkippableFact]
    public async Task StockOf_applies_signs_and_only_counts_approved()
    {
        using var c = fx.Open();
        Seed(c);
        var stock = await Svc().StockOfAsync("P3M01", null);
        Assert.Equal(75m, stock);   // 入100 + 退5 − 领30 = 75（未审核 999 不计）
        Cleanup(c);
    }

    [SkippableFact]
    public async Task List_groups_by_material_and_warehouse_with_nonzero_filter()
    {
        using var c = fx.Open();
        Seed(c);
        var rows = await Svc().ListAsync(仓库: null, keyword: "P3M01");
        var row = Assert.Single(rows);
        Assert.Equal("P3M01", row.物料编号);
        Assert.Equal("物料仓", row.仓库);
        Assert.Equal(75m, row.库存数量);
        Assert.Equal("规格A", row.规格);
        Cleanup(c);
    }

    [SkippableFact]
    public async Task List_filters_by_warehouse()
    {
        using var c = fx.Open();
        Seed(c);
        Assert.Empty(await Svc().ListAsync(仓库: "不存在仓", keyword: "P3M01"));
        Assert.Single(await Svc().ListAsync(仓库: "物料仓", keyword: "P3M01"));
        Cleanup(c);
    }

    [SkippableFact]
    public async Task StockOf_within_caller_transaction_does_not_commit_it()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        Seed(c);
        // 在一个会回滚的事务里再插 50 入仓,StockOfAsync 应能看到事务内未提交数据(75+50=125)
        using (var tx = c.BeginTransaction())
        {
            c.Execute("INSERT INTO [采购入仓单]([单号],[仓库],[审核]) VALUES(N'P3RKTX',N'物料仓','1')", transaction: tx);
            c.Execute(@"INSERT INTO [采购入仓明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                        VALUES(N'P3RKTX',N'物料仓',N'P3M01',N'P3面料',N'规格A',N'米',50)", transaction: tx);
            var inTx = await Svc().StockOfAsync("P3M01", (c, tx));
            Assert.Equal(125m, inTx);
            tx.Rollback();   // 回滚后那 50 不应留下
        }
        var afterRollback = await Svc().StockOfAsync("P3M01", null);
        Assert.Equal(75m, afterRollback);
        Cleanup(c);
    }

    [SkippableFact]
    public async Task List_excludes_net_zero_material()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        Cleanup(c);
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[单位]) VALUES(N'P3M01',N'P3面料',N'米')");
        // 入100 + 领100 = 净0,不应出现在库存列表
        c.Execute("INSERT INTO [采购入仓单]([单号],[仓库],[审核]) VALUES(N'P3RK01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [采购入仓明细单]([单号],[仓库],[物料编号],[物料名称],[单位],[数量])
                    VALUES(N'P3RK01',N'物料仓',N'P3M01',N'P3面料',N'米',100)");
        c.Execute("INSERT INTO [领料单]([单号],[仓库],[审核]) VALUES(N'P3LL01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [领料明细单]([单号],[仓库],[物料编号],[物料名称],[单位],[数量])
                    VALUES(N'P3LL01',N'物料仓',N'P3M01',N'P3面料',N'米',100)");
        Assert.Empty(await Svc().ListAsync(null, "P3M01"));
        Cleanup(c);
    }
}
