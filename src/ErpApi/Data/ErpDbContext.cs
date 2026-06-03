using ErpApi.Data.Entities;
using Microsoft.EntityFrameworkCore;
namespace ErpApi.Data;

public sealed class ErpDbContext(DbContextOptions<ErpDbContext> options) : DbContext(options)
{
    public DbSet<客户类别> 客户类别 => Set<客户类别>();
    public DbSet<客户资料> 客户资料 => Set<客户资料>();
    public DbSet<供应商类别> 供应商类别 => Set<供应商类别>();
    public DbSet<供应商资料> 供应商资料 => Set<供应商资料>();
    public DbSet<加工厂类别> 加工厂类别 => Set<加工厂类别>();
    public DbSet<加工厂资料> 加工厂资料 => Set<加工厂资料>();
    public DbSet<物料类别> 物料类别 => Set<物料类别>();
    public DbSet<物料资料> 物料资料 => Set<物料资料>();
}
