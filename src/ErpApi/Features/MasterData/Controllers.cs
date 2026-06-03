using ErpApi.Data.Entities;
using ErpApi.Engines.Authorization;
using ErpApi.Infrastructure.Db;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.MasterData;

[Route("api/master/customer-categories")]
public sealed class CustomerCategoryController(
    MasterCrudService<客户类别> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<客户类别>(s, p, a, f)
{
    protected override string Menu => "客户类别";
    protected override string TableName => "客户类别";
}

[Route("api/master/customers")]
public sealed class CustomerController(
    MasterCrudService<客户资料> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<客户资料>(s, p, a, f)
{
    protected override string Menu => "客户资料";
    protected override string TableName => "客户资料";
}
