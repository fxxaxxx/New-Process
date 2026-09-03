using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Materials.PurchaseOrder;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PurchaseOrderDbTests(DbFixture fx)
{
    private const string 供应商编号 = "POS01";
    private const string 生产单号 = "POMO0001";
    private const string 物料1 = "POM01";
    private const string 物料2 = "POM02";
    private const string 塑胶物料 = "POM03";
    private const string 未建档物料 = "POM99";

    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private PurchaseOrderService Svc() => new(Factory(), new DocumentNumberGenerator());

    // FK-safe 种子：供应商资料 + 生产制单(生产单号) + 物料资料 + 生产BOM物料清单(2行)。
    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute("INSERT INTO [供应商资料]([供应商编号],[供应商名称]) VALUES(@s,N'PO测试供应商')", new { s = 供应商编号 });
        c.Execute("INSERT INTO [生产制单]([生产单号],[审核]) VALUES(@mo,'0')", new { mo = 生产单号 });
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价]) VALUES(N'POM01',N'PO面料',N'规格A',N'米',10)");
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价]) VALUES(N'POM02',N'PO纽扣',N'规格B',N'粒',0.5)");
        c.Execute(@"INSERT INTO [生产BOM物料清单]([生产单号],[物料编号],[物料名称],[规格],[颜色],[单位],[总数量],[库存数量],[可用库存],[需订数量],[预算单价],[供应商编号],[供应商名称])
                    VALUES(@mo,N'POM01',N'PO面料',N'规格A',N'黑色',N'米',100,20,20,80,10,@s,N'PO测试供应商'),
                          (@mo,N'POM02',N'PO纽扣',N'规格B',N'白色',N'粒',200,0,0,200,0.5,@s,N'PO测试供应商')",
            new { mo = 生产单号, s = 供应商编号 });
    }

    private static void Cleanup(SqlConnection c)
    {
        c.Execute("DELETE FROM [采购明细单] WHERE [物料编号] IN (N'POM01',N'POM02') OR [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [采购订单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [生产BOM物料清单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号] IN (N'POM01',N'POM02')");
        c.Execute("DELETE FROM [供应商资料] WHERE [供应商编号]=@s", new { s = 供应商编号 });
    }

    [SkippableFact]
    public async Task Basis_returns_bom_rows()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        Seed(c);
        try
        {
            var rows = await Svc().BasisAsync(生产单号);
            Assert.Equal(2, rows.Count);
            Assert.Equal("POM01", rows[0].物料编号);
            Assert.Equal(80m, rows[0].需订数量);
            Assert.Equal(供应商编号, rows[0].供应商编号);
        }
        finally { Cleanup(c); }
    }

    // 来料仓口径：物料类别含「塑胶」的行 + 未在物料资料建档的行 都不带出；合同号随行返回（前端自动填 PO号）。
    [SkippableFact]
    public async Task Basis_excludes_plastic_and_unfiled_materials_and_returns_contract_no()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        Seed(c);
        c.Execute("UPDATE [生产制单] SET [合同号]=N'HT-001' WHERE [生产单号]=@mo", new { mo = 生产单号 });
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价],[物料类别]) VALUES(N'POM03',N'PO胶壳',N'规格C',N'PCS',1,N'ZURU塑胶')");
        c.Execute(@"INSERT INTO [生产BOM物料清单]([生产单号],[物料编号],[物料名称],[规格],[颜色],[单位],[总数量],[库存数量],[可用库存],[需订数量],[预算单价])
                    VALUES(@mo,N'POM03',N'PO胶壳',N'规格C',N'',N'PCS',10,0,0,10,1),
                          (@mo,N'POM99',N'未建档胶件',N'',N'',N'PCS',5,0,0,5,1)",
            new { mo = 生产单号 });
        try
        {
            var rows = await Svc().BasisAsync(生产单号);
            Assert.Equal(2, rows.Count);
            Assert.DoesNotContain(rows, r => r.物料编号 == 塑胶物料 || r.物料编号 == 未建档物料);
            Assert.All(rows, r => Assert.Equal("HT-001", r.合同号));
        }
        finally
        {
            c.Execute("DELETE FROM [生产BOM物料清单] WHERE [生产单号]=@mo AND [物料编号] IN (N'POM03',N'POM99')", new { mo = 生产单号 });
            c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'POM03'");
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task Create_from_basis_writes_header_and_lines_with_totals()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        Seed(c);
        var basis = await Svc().BasisAsync(生产单号);
        var dto = new PurchaseOrderCreateDto
        {
            生产单号 = 生产单号, 供应商编号 = 供应商编号, 供应商名称 = "PO测试供应商", 仓库 = "物料仓",
            明细 = [.. basis.Select(b => new PurchaseOrderLineDto
            {
                物料编号 = b.物料编号, 物料名称 = b.物料名称, 规格 = b.规格, 颜色 = b.颜色, 单位 = b.单位,
                数量 = b.需订数量 ?? 0, 单价 = b.预算单价, 预算数量 = b.总数量
            })]
        };
        var 单号 = await Svc().CreateAsync(dto, "tester");
        try
        {
            Assert.StartsWith("PO", 单号);
            // 数量合计 = 80 + 200 = 280；金额合计 = 80*10 + 200*0.5 = 900
            Assert.Equal(280m, c.ExecuteScalar<decimal>("SELECT [数量] FROM [采购订单] WHERE [单号]=@单号", new { 单号 }));
            Assert.Equal(900m, c.ExecuteScalar<decimal>("SELECT [金额] FROM [采购订单] WHERE [单号]=@单号", new { 单号 }));
            Assert.Equal("0", c.ExecuteScalar<string>("SELECT [审核] FROM [采购订单] WHERE [单号]=@单号", new { 单号 }));
            Assert.Equal(2, c.ExecuteScalar<int>("SELECT COUNT(*) FROM [采购明细单] WHERE [单号]=@单号", new { 单号 }));
            Assert.Equal(800m, c.ExecuteScalar<decimal>("SELECT [金额] FROM [采购明细单] WHERE [单号]=@单号 AND [物料编号]=N'POM01'", new { 单号 }));

            var detail = await Svc().GetAsync(单号);
            Assert.NotNull(detail);
            Assert.Equal(2, detail!.明细.Count);
            Assert.Equal(生产单号, detail.单头!.生产单号);

            Assert.True(await Svc().DeleteAsync(单号));
            Assert.Equal(0, c.ExecuteScalar<int>("SELECT COUNT(*) FROM [采购订单] WHERE [单号]=@单号", new { 单号 }));
            Assert.Equal(0, c.ExecuteScalar<int>("SELECT COUNT(*) FROM [采购明细单] WHERE [单号]=@单号", new { 单号 }));
        }
        finally
        {
            c.Execute("DELETE FROM [采购明细单] WHERE [单号]=@单号", new { 单号 });
            c.Execute("DELETE FROM [采购订单] WHERE [单号]=@单号", new { 单号 });
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task Create_rejects_empty_lines_and_blank_supplier()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(
            new PurchaseOrderCreateDto { 供应商编号 = 供应商编号, 明细 = [] }, "tester"));
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(
            new PurchaseOrderCreateDto { 供应商编号 = null, 明细 = [new PurchaseOrderLineDto { 物料编号 = "X", 数量 = 1 }] }, "tester"));
    }
}
