using Dapper;
using ErpApi.Engines.Inventory;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class InventorySummaryDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string,string?>{ ["Erp:ConnectionStringEnvVar"]="ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    [SkippableFact]
    public async Task In_minus_out_only_counts_approved()
    {
        using var c = fx.Open();
        // 清理（先删明细，再删主单/基础资料，满足外键顺序）
        c.Execute(@"DELETE FROM [成品入仓明细单] WHERE 款号=N'K0';
                    DELETE FROM [成品出仓明细单] WHERE 款号=N'K0';
                    DELETE FROM [成品入仓单]   WHERE 单号 IN (N'I1',N'I2');
                    DELETE FROM [成品出仓单]   WHERE 单号 = N'O1';
                    DELETE FROM [款号总表]     WHERE 款号 = N'K0';");

        // 满足外键：款号总表(款号) + 成品入仓单/出仓单(单号)
        c.Execute(@"INSERT INTO [款号总表](款号,款式) VALUES (N'K0', N'测试款');");
        c.Execute(@"INSERT INTO [成品入仓单](单号,仓库,审核) VALUES (N'I1',N'W1',N'1'),(N'I2',N'W1',N'0');");
        c.Execute(@"INSERT INTO [成品出仓单](单号,仓库,审核) VALUES (N'O1',N'W1',N'1');");

        // 入100(审核) + 入50(未审,应忽略) - 出30(审核) = 70
        c.Execute(@"INSERT INTO [成品入仓明细单](单号,仓库,款号,颜色,尺码,数量,审核) VALUES(N'I1',N'W1',N'K0',N'红',N'M',100,N'1')");
        c.Execute(@"INSERT INTO [成品入仓明细单](单号,仓库,款号,颜色,尺码,数量,审核) VALUES(N'I2',N'W1',N'K0',N'红',N'M',50,N'0')");
        c.Execute(@"INSERT INTO [成品出仓明细单](单号,仓库,款号,颜色,尺码,数量,审核) VALUES(N'O1',N'W1',N'K0',N'红',N'M',30,N'1')");

        var rows = await new InventorySummaryService(Factory()).FinishedGoodsAsync("W1");
        var k0 = rows.Single(r => r.款号 == "K0" && r.颜色 == "红" && r.尺码 == "M");
        Assert.Equal(70m, k0.库存);
    }

    [SkippableFact]
    public async Task FinishedGoods_includes_审核入仓_minus_出仓_plus_盘点盈亏()
    {
        using var c = fx.Open();
        P5TestData.Seed(c);
        try
        {
            // 主从 FK：明细单.单号 → 各主单.单号，故先插主单
            c.Execute("INSERT INTO [成品入仓单]([单号],[仓库],[审核]) VALUES(N'P5RKD',N'P5成品仓','1')");
            c.Execute("INSERT INTO [成品出仓单]([单号],[仓库],[审核]) VALUES(N'P5CKD',N'P5成品仓','1')");
            c.Execute("INSERT INTO [成品盘点单]([单号],[仓库],[审核]) VALUES(N'P5PDD',N'P5成品仓','1')");

            c.Execute(@"INSERT INTO [成品入仓明细单]([单号],[仓库],[生产单号],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核])
                        VALUES(N'P5RKD',N'P5成品仓',N'P5SC01',N'P5K01',N'P5测试款式',N'01',N'黑色',N'M',100,'1')");
            c.Execute(@"INSERT INTO [成品出仓明细单]([单号],[仓库],[生产单号],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核])
                        VALUES(N'P5CKD',N'P5成品仓',N'P5SC01',N'P5K01',N'P5测试款式',N'01',N'黑色',N'M',30,'1')");
            c.Execute(@"INSERT INTO [成品盘点明细单]([单号],[仓库],[生产单号],[款号],[款式],[色号],[颜色],[尺码],[系统数量],[盘点数量],[盈亏数量],[审核])
                        VALUES(N'P5PDD',N'P5成品仓',N'P5SC01',N'P5K01',N'P5测试款式',N'01',N'黑色',N'M',70,68,-2,'1')");

            var rows = await new InventorySummaryService(Factory()).FinishedGoodsAsync("P5成品仓");
            var r = Assert.Single(rows);
            Assert.Equal("P5K01", r.款号);
            Assert.Equal(68m, r.库存);
        }
        finally
        {
            c.Execute("DELETE FROM [成品入仓明细单] WHERE [单号]='P5RKD'");
            c.Execute("DELETE FROM [成品出仓明细单] WHERE [单号]='P5CKD'");
            c.Execute("DELETE FROM [成品盘点明细单] WHERE [单号]='P5PDD'");
            P5TestData.Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task FinishedGoods_transfer_moves_qty_between_warehouses()
    {
        using var c = fx.Open();
        P5TestData.Seed(c);
        try
        {
            c.Execute("INSERT INTO [成品入仓单]([单号],[仓库],[审核]) VALUES(N'P5BRK',N'P5成品仓','1')");
            c.Execute("INSERT INTO [成品调拨单]([单号],[源仓库],[目标仓库],[审核]) VALUES(N'P5BCD',N'P5成品仓',N'P5半成品仓','1')");
            c.Execute(@"INSERT INTO [成品入仓明细单]([单号],[仓库],[生产单号],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核])
                        VALUES(N'P5BRK',N'P5成品仓',N'P5SC01',N'P5K01',N'P5测试款式',N'01',N'黑色',N'M',100,'1')");
            c.Execute(@"INSERT INTO [成品调拨明细单]([单号],[源仓库],[目标仓库],[生产单号],[款号],[款式],[色号],[颜色],[尺码],[数量],[审核])
                        VALUES(N'P5BCD',N'P5成品仓',N'P5半成品仓',N'P5SC01',N'P5K01',N'P5测试款式',N'01',N'黑色',N'M',30,'1')");
            var svc = new InventorySummaryService(Factory());
            Assert.Equal(70m, (await svc.FinishedGoodsAsync("P5成品仓"))[0].库存);     // 100-30
            Assert.Equal(30m, (await svc.FinishedGoodsAsync("P5半成品仓"))[0].库存);   // +30
        }
        finally
        {
            c.Execute("DELETE FROM [成品入仓明细单] WHERE [单号]='P5BRK'");
            c.Execute("DELETE FROM [成品调拨明细单] WHERE [单号]='P5BCD'");
            c.Execute("DELETE FROM [成品入仓单] WHERE [单号]='P5BRK'");
            c.Execute("DELETE FROM [成品调拨单] WHERE [单号]='P5BCD'");
            P5TestData.Cleanup(c);
        }
    }
}
