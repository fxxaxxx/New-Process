using System.Text;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Engines.Posting;
using ErpApi.Features.Auth;
using ErpApi.Infrastructure.Db;
using ErpApi.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 基础设施
builder.Services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
// 4 横切引擎
builder.Services.AddScoped<IDocumentNumberGenerator, DocumentNumberGenerator>();
builder.Services.AddScoped<IPostingEngine, PostingEngine>();
builder.Services.AddScoped<IInventorySummaryService, InventorySummaryService>();
builder.Services.AddSingleton<IInventorySnapshotProvider, NullSnapshotProvider>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddSingleton<IAuditLogger, AuditLogger>();
// 业务
builder.Services.AddScoped<AuthService>();

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
