using Dapper;
using ErpApi.Data;
using ErpApi.Features.Styles;
using ErpApi.Features.Warehouse.Semi.CommonMaterials;
using ErpApi.Infrastructure.Db;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public sealed class StyleAssemblyMaterialsDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private ErpDbContext Ctx() => new(new DbContextOptionsBuilder<ErpDbContext>()
        .UseSqlServer(fx.ConnectionString!).Options);

    private StyleService Style() => new(Factory(), Ctx());
    private SemiFinishedCommonMaterialService Common() => new(Factory());

    private void SkipIfDatabaseUnavailable()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        try
        {
            using var c = fx.Open();
        }
        catch (SqlException ex)
        {
            Skip.If(true, $"ERP_TEST_DB 不可连接：{ex.Message}");
        }
    }

    private void Cleanup()
    {
        using var c = fx.Open();
        c.Execute("DELETE FROM [装配物料报价] WHERE [产品货号]=N'STYLE-1'");
        c.Execute("DELETE FROM [半成品共用物料设置] WHERE [产品货号]=N'STYLE-1'");
        c.Execute("DELETE FROM [款号物料明细表] WHERE [款号]=N'STYLE-1'");
        c.Execute("DELETE FROM [款号物料总表] WHERE [款号]=N'STYLE-1'");
        c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'STYLE-1'");
    }

    private void SeedStyle()
    {
        using var c = fx.Open();
        c.Execute("INSERT INTO [款号总表]([款号],[款式]) VALUES(N'STYLE-1',N'产品一')");
        c.Execute(@"
INSERT INTO [款号物料总表]([日期],[客户编号],[客户名称],[产品编号],[款号],[款式],[备注],[单位])
VALUES('2026-07-13',N'0003',N'ZURU',N'PART-1',N'STYLE-1',N'产品一',N'头备注',N'盒')");
    }

    [SkippableFact]
    public async Task ReplaceMaterials_round_trips_extension_quotes_and_row_fields()
    {
        SkipIfDatabaseUnavailable();
        Cleanup();
        SeedStyle();

        await Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload());

        var loaded = await Style().GetMaterialsViewAsync("STYLE-1");
        Assert.NotNull(loaded);
        Assert.Equal("COMMON-1", loaded!.扩展.共用物料编号);
        Assert.Equal("加工厂", Assert.Single(loaded.报价).合作方类型);
        Assert.Equal("MOULD-1", loaded.物料.Single().工模编号);
        Assert.Equal("主盒彩盒", loaded.物料.Single().备注);

        Cleanup();
    }

    [SkippableFact]
    public async Task ReplaceMaterials_rolls_back_all_sections_when_quote_is_invalid()
    {
        SkipIfDatabaseUnavailable();
        Cleanup();
        SeedStyle();
        await Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload());

        using var before = fx.Open();
        var originalBomCount = await before.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM [款号物料明细表] WHERE [款号]=N'STYLE-1'");
        var originalCommonCode = await before.ExecuteScalarAsync<string?>(
            "SELECT [共用物料编号] FROM [半成品共用物料设置] WHERE [产品货号]=N'STYLE-1'");

        var invalidPayload = ValidPayload() with
        {
            报价 = [new AssemblyMaterialQuoteDto(
                null, "MAT-1", "彩盒", "其他", "X", "非法合作方",
                new DateTime(2026, 7, 13), "HK$", 1, 1, 0, 0, false, 1, null)]
        };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => Style().ReplaceMaterialsAsync("STYLE-1", invalidPayload));

        using var after = fx.Open();
        Assert.Equal(originalBomCount, await after.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM [款号物料明细表] WHERE [款号]=N'STYLE-1'"));
        Assert.Equal(originalCommonCode, await after.ExecuteScalarAsync<string?>(
            "SELECT [共用物料编号] FROM [半成品共用物料设置] WHERE [产品货号]=N'STYLE-1'"));

        Cleanup();
    }

    [SkippableFact]
    public async Task Omitted_extension_and_quotes_preserve_existing_values_but_empty_quotes_clear()
    {
        SkipIfDatabaseUnavailable();
        Cleanup();
        SeedStyle();
        await Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload());

        await Style().ReplaceMaterialsAsync("STYLE-1", new BomSaveDto(
            null, null, null, null,
            [new StyleMaterialDto("MAT-2", "新物料", "包装", null, null, null, 2)]));
        var preserved = await Style().GetMaterialsViewAsync("STYLE-1");
        Assert.Equal("COMMON-1", preserved!.扩展.共用物料编号);
        Assert.Single(preserved.报价);

        await Style().ReplaceMaterialsAsync("STYLE-1", new BomSaveDto(
            null, null, null, null, [], null, []));
        var cleared = await Style().GetMaterialsViewAsync("STYLE-1");
        Assert.Empty(cleared!.报价);
        Assert.Equal("COMMON-1", cleared.扩展.共用物料编号);

        Cleanup();
    }

    [SkippableFact]
    public async Task Audited_style_rejects_save_until_reverse_audit_and_preserves_audit_fields_on_save()
    {
        SkipIfDatabaseUnavailable();
        Cleanup();
        SeedStyle();
        await Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload());

        await Common().SetAuditAsync("STYLE-1", true, "auditor");
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload()));

        using (var c = fx.Open())
        {
            var audit = await c.QuerySingleAsync<(bool 调整审核, string 审核人)>(
                "SELECT [调整审核],[审核人] FROM [半成品共用物料设置] WHERE [产品货号]=N'STYLE-1'");
            Assert.True(audit.调整审核);
            Assert.Equal("auditor", audit.审核人);
        }

        await Common().SetAuditAsync("STYLE-1", false, "auditor");
        await Style().ReplaceMaterialsAsync("STYLE-1", ValidPayload());
        var loaded = await Style().GetMaterialsViewAsync("STYLE-1");
        Assert.False(loaded!.扩展.调整审核);

        Cleanup();
    }

    [SkippableFact]
    public async Task Audit_creates_extension_for_existing_bom_without_extension()
    {
        SkipIfDatabaseUnavailable();
        Cleanup();
        SeedStyle();

        await Style().ReplaceMaterialsAsync("STYLE-1", new BomSaveDto(
            "0003", "ZURU", new DateTime(2026, 7, 13), "盒",
            [new StyleMaterialDto("MAT-1", "彩盒", "包装", null, null, "PCS", 1)]));
        await Common().SetAuditAsync("STYLE-1", true, "auditor");

        var loaded = await Style().GetMaterialsViewAsync("STYLE-1");
        Assert.True(loaded!.扩展.调整审核);
        Assert.Equal("auditor", loaded.扩展.审核人);

        Cleanup();
    }

    private static BomSaveDto ValidPayload() => new(
        "0003", "ZURU", new DateTime(2026, 7, 13), "盒",
        [new StyleMaterialDto(
            "MAT-1", "彩盒", "包装", "41*30MM", "4C", "PCS", 1,
            "MOULD-1", "主盒彩盒")],
        new AssemblyMaterialExtensionDto(
            "产品一装配", "PART-1", "COMMON-1", "组装半成品", "装彩盒半成品",
            2.5m, 0.3m, 1, "盒", true, "测试备注", false, null, null),
        [new AssemblyMaterialQuoteDto(
            null, "MAT-1", "彩盒", "加工厂", "0088", "东莞加工厂",
            new DateTime(2026, 7, 13), "HK$", 2.5m, 2.5m, 0, 0, true, 1, null)]);
}
