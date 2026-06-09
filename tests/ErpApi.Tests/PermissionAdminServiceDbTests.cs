using Dapper;
using ErpApi.Features.Admin;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PermissionAdminServiceDbTests(DbFixture fx)
{
    private static ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private static PermissionAdminService Svc() => new(Factory());

    [SkippableFact]
    public async Task UserPerms_save_skips_allfalse_get_covers_catalog_and_replace()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        var svc = Svc();
        using var c = fx.Open();
        void Clean() => c.Execute("DELETE FROM [userbqrpower] WHERE [用户]=N'PERM_T1'");
        Clean();
        try
        {
            // 保存:客户资料 打开+保存=true;另带两条全 false 行(应被跳过)
            await svc.SaveUserPermsAsync("PERM_T1",
            [
                new MenuPermRow { 组 = "基础资料", 菜单 = "客户资料", 打开 = true, 保存 = true },
                new MenuPermRow { 组 = "基础资料", 菜单 = "供应商资料" },
                new MenuPermRow { 组 = "工资管理", 菜单 = "工资表" },
            ], "admin");

            // GetUserPerms 覆盖全部 MenuCatalog 菜单
            var perms = await svc.GetUserPermsAsync("PERM_T1");
            Assert.Equal(MenuCatalog.All.Count, perms.Count);
            foreach (var m in MenuCatalog.All)
                Assert.Contains(perms, p => p.菜单 == m.菜单);

            // 客户资料:打开&保存 true,其它位 false
            var 客户 = perms.Single(p => p.菜单 == "客户资料");
            Assert.True(客户.打开);
            Assert.True(客户.保存);
            Assert.False(客户.删除); Assert.False(客户.打印); Assert.False(客户.单价);
            Assert.False(客户.金额); Assert.False(客户.审核); Assert.False(客户.反审核); Assert.False(客户.功能);

            // 工资表:无行 → 全 false
            var 工资表 = perms.Single(p => p.菜单 == "工资表");
            Assert.False(工资表.打开); Assert.False(工资表.保存); Assert.False(工资表.删除);
            Assert.False(工资表.打印); Assert.False(工资表.单价); Assert.False(工资表.金额);
            Assert.False(工资表.审核); Assert.False(工资表.反审核); Assert.False(工资表.功能);

            // 库内只写了一行(全 false 行被跳过)
            var count = c.ExecuteScalar<int>("SELECT COUNT(*) FROM [userbqrpower] WHERE [用户]=N'PERM_T1'");
            Assert.Equal(1, count);

            // 整组替换:仅保存 库存月结 打开=true → 客户资料 行消失
            await svc.SaveUserPermsAsync("PERM_T1",
            [
                new MenuPermRow { 组 = "月结管理", 菜单 = "库存月结", 打开 = true },
            ], "admin");

            var perms2 = await svc.GetUserPermsAsync("PERM_T1");
            var 客户2 = perms2.Single(p => p.菜单 == "客户资料");
            Assert.False(客户2.打开); Assert.False(客户2.保存);
            var 月结 = perms2.Single(p => p.菜单 == "库存月结");
            Assert.True(月结.打开);

            var count2 = c.ExecuteScalar<int>("SELECT COUNT(*) FROM [userbqrpower] WHERE [用户]=N'PERM_T1'");
            Assert.Equal(1, count2);
        }
        finally
        {
            Clean();
        }
    }
}
