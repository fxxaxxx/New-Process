using Dapper;
using ErpApi.Data;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Production;
using ErpApi.Features.Styles;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

// 多层级半成品（DB 集成；未设置 ERP_TEST_DB 时自动跳过）：
// 1) 保存 BOM 既调半成品又直接列其组成物料 → 返回重复扣料警告；
// 2) 生产制单算法4 对半成品行递归展开，按半成品 BOM 计物料需求，半成品行本身不产生需求行。
[Collection("db")]
public sealed class SemiHierarchyDbTests(DbFixture fx)
{
    private const string 成品款号 = "SH-FIN";
    private const string 半成品款号 = "SH-SEM";
    private const string 物料编号 = "SH-MAT-1";

    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private StyleService Style() => new(Factory(), new ErpDbContext(
        new DbContextOptionsBuilder<ErpDbContext>().UseSqlServer(fx.ConnectionString!).Options));

    private ProductionService Production() =>
        new(Factory(), new DocumentNumberGenerator(),
            new ErpApi.Engines.Inventory.MaterialInventoryService(Factory()));

    private void Seed()
    {
        using var c = fx.Open();
        Cleanup();
        // FK 父行：款号物料明细表.物料编号→物料资料(FK_133，半成品行编号即款号)，
        // 生产制单.客户编号→客户资料(FK_143)、.加工厂编号→加工厂资料(FK_142)
        c.Execute("INSERT INTO [客户资料]([客户编号],[客户名称]) VALUES(N'SH-C01',N'SH测试客户')");
        c.Execute("INSERT INTO [加工厂资料]([加工厂编号],[加工厂名称]) VALUES(N'SH-F01',N'SH测试加工厂')");
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[单位],[单价]) VALUES(N'SH-MAT-1',N'SH测试物料',N'个',5)");
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[单位]) VALUES(N'SH-SEM',N'SH半成品',N'个')");
        c.Execute("INSERT INTO [款号总表]([款号],[款式]) VALUES(N'SH-SEM',N'SH半成品'),(N'SH-FIN',N'SH成品')");
        // 半成品判定集：SH-SEM 已在 半成品共用物料设置 中设置
        c.Execute("INSERT INTO [半成品共用物料设置]([产品货号],[类别]) VALUES(N'SH-SEM',N'半成品')");
        // 半成品自己的 BOM：SH-MAT-1 × 3
        c.Execute(@"INSERT INTO [款号物料明细表]([款号],[款式],[物料编号],[物料名称],[单位],[使用数量])
                    VALUES(N'SH-SEM',N'SH半成品',N'SH-MAT-1',N'SH测试物料',N'个',3)");
    }

    private void Cleanup()
    {
        using var c = fx.Open();
        c.Execute("DELETE FROM [生产BOM物料清单] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [生产制单工序表] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [生产制单数量] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [生产制单货号] WHERE [BOM款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [生产制单] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [款号物料明细表] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [半成品共用物料设置] WHERE [产品货号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [款号总表] WHERE [款号] IN (N'SH-FIN',N'SH-SEM')");
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号] IN (N'SH-MAT-1',N'SH-SEM')");
        c.Execute("DELETE FROM [客户资料] WHERE [客户编号]=N'SH-C01'");
        c.Execute("DELETE FROM [加工厂资料] WHERE [加工厂编号]=N'SH-F01'");
    }

    [SkippableFact]
    public async Task ReplaceMaterials_warns_when_bom_pulls_semi_and_its_component_material()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Seed();
        try
        {
            // 成品 BOM：调入半成品 SH-SEM，同时又直接列了它的组成物料 SH-MAT-1
            var dto = new BomSaveDto(null, null, null, null,
            [
                new StyleMaterialDto(半成品款号, "SH半成品", null, null, null, "个", 1),
                new StyleMaterialDto(物料编号, "SH测试物料", null, null, null, "个", 1),
            ]);

            var 警告 = await Style().ReplaceMaterialsAsync(成品款号, dto);

            var warning = Assert.Single(警告);
            Assert.Contains(物料编号, warning);
            Assert.Contains(半成品款号, warning);
        }
        finally { Cleanup(); }
    }

    [SkippableFact]
    public async Task ReplaceMaterials_no_warning_when_bom_only_pulls_semi()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Seed();
        try
        {
            var dto = new BomSaveDto(null, null, null, null,
                [new StyleMaterialDto(半成品款号, "SH半成品", null, null, null, "个", 2)]);

            var 警告 = await Style().ReplaceMaterialsAsync(成品款号, dto);

            Assert.Empty(警告);
        }
        finally { Cleanup(); }
    }

    [SkippableFact]
    public async Task Create_production_recursively_expands_semi_rows_算法4()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Seed();
        try
        {
            // 成品 BOM：只调入半成品 SH-SEM × 2（不直接列物料）
            await Style().ReplaceMaterialsAsync(成品款号, new BomSaveDto(null, null, null, null,
                [new StyleMaterialDto(半成品款号, "SH半成品", null, null, null, "个", 2)]));

            var 生产单号 = await Production().CreateAsync(new ProductionNoticeCreateDto
            {
                客户编号 = "SH-C01", 客户名称 = "SH测试客户",
                加工厂编号 = "SH-F01", 加工厂名称 = "SH测试加工厂",
                货号明细 =
                [
                    new ProductionGoodsLineDto
                    {
                        货号 = "SH-HH1", BOM款号 = 成品款号, 款号名称 = "SH成品", 比例 = 1m, 分析 = true,
                        数量明细 = [new ProductionQtyDto { 颜色 = "黑", 尺码 = "S", 数量 = 10 }]
                    }
                ]
            }, "tester");

            using var c = fx.Open();
            // 半成品行被递归替换：SH-MAT-1 需求 = 2(半成品用量) × 3(半成品 BOM 用量) × 10(计划数量) = 60
            var row = c.QueryFirst(
                "SELECT * FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 AND [物料编号]=N'SH-MAT-1'",
                new { 生产单号 });
            Assert.Equal(60m, (decimal)row.总数量);
            Assert.Equal(300m, (decimal)row.金额);   // 60 × 单价5
            // 半成品行本身不产生物料需求行（防止重复扣料）
            Assert.Equal(0, c.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 AND [物料编号]=N'SH-SEM'",
                new { 生产单号 }));
            Assert.Equal(1, c.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号",
                new { 生产单号 }));
            Assert.Equal(300m, c.ExecuteScalar<decimal>(
                "SELECT [物料金额] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));

            Assert.True(await Production().DeleteAsync(生产单号));
        }
        finally { Cleanup(); }
    }
}
