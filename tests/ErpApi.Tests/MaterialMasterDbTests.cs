using Dapper;
using ErpApi.Features.Materials.MaterialMaster;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class MaterialMasterDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private MaterialMasterService Svc() => new(Factory());

    // 分类「面料MM」2 个物料、「辅料MM」1 个、1 个无类别物料
    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute(@"INSERT INTO [物料资料]([物料类别],[物料编号],[物料名称],[规格],[单位],[单价],[销售价],[库存],[最低库存],[供应商名称])
                    VALUES(N'面料MM',N'MM001',N'面料甲',N'规X',N'米',10,15,100,5,N'供A'),
                          (N'面料MM',N'MM002',N'面料乙',N'规Y',N'米',12,0,0,0,N'供A'),
                          (N'辅料MM',N'MM003',N'纽扣',N'规Z',N'粒',0.5,1,500,50,N'供B'),
                          (NULL,      N'MM999',N'无类别料',N'规W',N'个',1,2,0,0,N'供C')");
    }

    private static void Cleanup(SqlConnection c)
        => c.Execute("DELETE FROM [物料资料] WHERE [物料编号] IN (N'MM001',N'MM002',N'MM003',N'MM999')");

    [SkippableFact]
    public async Task Categories_groups_nonempty_with_counts()
    {
        using var c = fx.Open();
        Seed(c);
        try
        {
            var cats = await Svc().CategoriesAsync();
            var 面料 = cats.Single(x => x.类别 == "面料MM");
            var 辅料 = cats.Single(x => x.类别 == "辅料MM");
            Assert.Equal(2, 面料.数量);
            Assert.Equal(1, 辅料.数量);
            Assert.DoesNotContain(cats, x => x.类别 is null);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task List_filters_by_category()
    {
        using var c = fx.Open();
        Seed(c);
        try
        {
            var page = await Svc().ListAsync("面料MM", null, 1, 20);
            Assert.Equal(2, page.Total);
            Assert.All(page.Items, r => Assert.Equal("面料MM", r.物料类别));
            Assert.Contains(page.Items, r => r.物料编号 == "MM001" && r.库存 == 100m && r.供应商名称 == "供A");
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task List_filters_by_keyword_within_all()
    {
        using var c = fx.Open();
        Seed(c);
        try
        {
            var page = await Svc().ListAsync(null, "纽扣", 1, 20);
            var row = Assert.Single(page.Items);
            Assert.Equal("MM003", row.物料编号);
        }
        finally { Cleanup(c); }
    }
}
