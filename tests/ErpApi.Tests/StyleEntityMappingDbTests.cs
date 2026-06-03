using ErpApi.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

[Collection("db")]
public class StyleEntityMappingDbTests(DbFixture fx)
{
    private ErpDbContext Ctx()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        return new ErpDbContext(new DbContextOptionsBuilder<ErpDbContext>()
            .UseSqlServer(fx.ConnectionString!).Options);
    }

    [SkippableFact]
    public async Task Style_entities_query_without_mapping_error()
    {
        using var db = Ctx();
        _ = await db.款号总表.Take(1).ToListAsync();
        _ = await db.款号明细表.Take(1).ToListAsync();
        _ = await db.款号物料明细表.Take(1).ToListAsync();
        Assert.True(true);
    }
}
