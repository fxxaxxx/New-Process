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
}
