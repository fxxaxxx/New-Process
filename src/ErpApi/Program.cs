using System.Text;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Engines.Posting;
using ErpApi.Features.Auth;
using ErpApi.Infrastructure.Db;
using ErpApi.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 基础设施
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddDbContext<ErpApi.Data.ErpDbContext>((sp, o) =>
    o.UseSqlServer(sp.GetRequiredService<ISqlConnectionFactory>().GetConnectionString()));
builder.Services.AddScoped(typeof(ErpApi.Features.MasterData.MasterCrudService<>));
builder.Services.AddScoped<ErpApi.Features.MasterData.Pricing.PricingService>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
// 4 横切引擎
builder.Services.AddScoped<IDocumentNumberGenerator, DocumentNumberGenerator>();
builder.Services.AddScoped<IPostingEngine, PostingEngine>();
builder.Services.AddScoped<IInventorySummaryService, InventorySummaryService>();
builder.Services.AddScoped<IMaterialInventoryService, MaterialInventoryService>();
builder.Services.AddSingleton<IInventorySnapshotProvider, NullSnapshotProvider>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddSingleton<IAuditLogger, AuditLogger>();
// 业务
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ErpApi.Features.Styles.StyleService>();
builder.Services.AddScoped<ErpApi.Features.Orders.OrderService>();
builder.Services.AddScoped<ErpApi.Features.Production.ProductionService>();
builder.Services.AddScoped<ErpApi.Features.Materials.PurchaseReceipt.PurchaseReceiptService>();
builder.Services.AddScoped<ErpApi.Features.Materials.MaterialIssue.MaterialIssueService>();
builder.Services.AddScoped<ErpApi.Features.Materials.MaterialReturn.MaterialReturnService>();
builder.Services.AddScoped<ErpApi.Features.Production.Cutting.CuttingService>();
builder.Services.AddScoped<ErpApi.Features.Production.Piecework.PieceworkService>();
builder.Services.AddScoped<ErpApi.Features.Production.Outsourcing.OutsourceService>();
builder.Services.AddScoped<ErpApi.Features.Production.Outsourcing.OutsourceReturnService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedReceiptService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedIssueService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedStocktakeService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedTransferService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedSalesReturnService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Finished.FinishedVendorReturnService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Semi.SemiReceiptService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Semi.SemiIssueService>();
builder.Services.AddScoped<ErpApi.Features.Warehouse.Semi.SemiStocktakeService>();
builder.Services.AddScoped<ErpApi.Features.MonthEnd.MonthEndService>();
builder.Services.AddScoped<ErpApi.Features.MonthEnd.PeriodLockService>();
builder.Services.AddScoped<ErpApi.Features.Sales.SalesShipmentService>();
builder.Services.AddScoped<ErpApi.Features.Sales.SalesReturnService>();
builder.Services.AddScoped<ErpApi.Features.Sales.SalesReceiptService>();
builder.Services.AddScoped<ErpApi.Features.Sales.ReceivablesService>();
builder.Services.AddScoped<ErpApi.Features.Payables.PurchasePaymentService>();
builder.Services.AddScoped<ErpApi.Features.Payables.OutsourcePaymentService>();
builder.Services.AddScoped<ErpApi.Features.Payables.PayablesService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.PieceworkPayrollService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.AbsenceService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.AttendanceService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.WageTemplateService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.PayrollService>();
builder.Services.AddScoped<ErpApi.Features.Payroll.PayrollQueryService>();
builder.Services.AddSingleton<ErpApi.Infrastructure.Security.IConfigProtector, ErpApi.Infrastructure.Security.ConfigProtector>();
builder.Services.AddScoped<ErpApi.Features.SystemConfig.SysConfigService>();

// JWT 认证（密钥来自环境变量，无硬编码）
var jwtKey = Environment.GetEnvironmentVariable(JwtTokenService.KeyEnvVar)
    ?? throw new InvalidOperationException($"请设置环境变量 {JwtTokenService.KeyEnvVar}");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Erp:Jwt:Issuer"],
            ValidAudience = builder.Configuration["Erp:Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

public partial class Program { } // 供集成测试引用
