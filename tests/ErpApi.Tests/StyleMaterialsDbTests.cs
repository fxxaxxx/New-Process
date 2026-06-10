using Dapper;
using ErpApi.Data;
using ErpApi.Features.Styles;
using ErpApi.Infrastructure.Db;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class StyleMaterialsDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private ErpDbContext Ctx() => new(new DbContextOptionsBuilder<ErpDbContext>()
        .UseSqlServer(fx.ConnectionString!).Options);

    private StyleService Svc() => new(Factory(), Ctx());

    private void Cleanup()
    {
        using var c = fx.Open();
        c.Execute("DELETE FROM [款号物料明细表] WHERE [款号]='BOMK1'");
        c.Execute("DELETE FROM [款号总表] WHERE [款号]='BOMK1'");
        // 物料编号 有 FK→物料资料；明细删净后再删父
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号] IN ('M1','M2')");
    }

    [SkippableFact]
    public async Task ReplaceMaterials_整组替换_then_get_full()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        Cleanup();
        using (var c = fx.Open())
        {
            c.Execute("INSERT INTO [款号总表]([款号],[款式]) VALUES(N'BOMK1',N'BOM测试款')");
            // 款号物料明细表.物料编号 FK→物料资料.物料编号，需先建父行
            c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称]) VALUES(N'M1',N'面料')");
            c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称]) VALUES(N'M2',N'纽扣')");
        }

        var svc = Svc();
        await svc.ReplaceMaterialsAsync("BOMK1",
        [
            new StyleMaterialDto("M1", "面料", "主料", "1.5m", "黑色", "米", 2m),
            new StyleMaterialDto("M2", "纽扣", "辅料", "12mm", "白色", "粒", 3m),
        ]);

        var full = await svc.GetFullAsync("BOMK1");
        Assert.NotNull(full);
        Assert.Equal("BOM测试款", full!.主档.款式);
        Assert.Equal(2, full.物料.Count);
        var m1 = full.物料.Single(x => x.物料编号 == "M1");
        var m2 = full.物料.Single(x => x.物料编号 == "M2");
        Assert.Equal(2m, m1.使用数量);
        Assert.Equal(3m, m2.使用数量);
        Assert.Equal("主料", m1.物料类别);
        Assert.Equal("BOM测试款", m1.款式);

        // 再次替换 1 行 = 覆盖（整组替换，不是追加）
        await svc.ReplaceMaterialsAsync("BOMK1",
            [new StyleMaterialDto("M1", "面料", "主料", null, null, "米", 5m)]);
        full = await svc.GetFullAsync("BOMK1");
        Assert.Single(full!.物料);
        Assert.Equal(5m, full.物料[0].使用数量);

        Cleanup();
    }

    [SkippableFact]
    public async Task ReplaceMaterials_throws_for_missing_style()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Svc().ReplaceMaterialsAsync("不存在的款号XX", [new StyleMaterialDto("M1", null, null, null, null, null, 1m)]));
    }
}
