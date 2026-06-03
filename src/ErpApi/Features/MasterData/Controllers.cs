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

[Route("api/master/supplier-categories")]
public sealed class SupplierCategoryController(
    MasterCrudService<供应商类别> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<供应商类别>(s, p, a, f)
{ protected override string Menu => "供应商类别"; protected override string TableName => "供应商类别"; }

[Route("api/master/suppliers")]
public sealed class SupplierController(
    MasterCrudService<供应商资料> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<供应商资料>(s, p, a, f)
{ protected override string Menu => "供应商资料"; protected override string TableName => "供应商资料"; }

[Route("api/master/factory-categories")]
public sealed class FactoryCategoryController(
    MasterCrudService<加工厂类别> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<加工厂类别>(s, p, a, f)
{ protected override string Menu => "加工厂类别"; protected override string TableName => "加工厂类别"; }

[Route("api/master/factories")]
public sealed class FactoryController(
    MasterCrudService<加工厂资料> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<加工厂资料>(s, p, a, f)
{ protected override string Menu => "加工厂资料"; protected override string TableName => "加工厂资料"; }

[Route("api/master/material-categories")]
public sealed class MaterialCategoryController(
    MasterCrudService<物料类别> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<物料类别>(s, p, a, f)
{ protected override string Menu => "物料类别"; protected override string TableName => "物料类别"; }

[Route("api/master/materials")]
public sealed class MaterialController(
    MasterCrudService<物料资料> s, IPermissionService p, IAuditLogger a, ISqlConnectionFactory f)
    : MasterCrudController<物料资料>(s, p, a, f)
{ protected override string Menu => "物料资料"; protected override string TableName => "物料资料"; }
