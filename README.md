# 兴信B ERP 重建（P0 地基）

## 环境变量（禁止硬编码，必须设置）
- `ERP_DB`：SQL Server 连接串（应用运行库）
- `ERP_JWT_KEY`：JWT 签名密钥（≥32 字符）
- `ERP_TEST_DB`：（可选）集成测试数据库连接串；不设则 DB 测试跳过

> 本机开发用 SQL Server LocalDB：连接串形如 `Server=(localdb)\MSSQLLocalDB;Database=erp;Integrated Security=true;TrustServerCertificate=true`。

## 启动
1. 建库（应用库 + 测试库各一次）：
   ```powershell
   ./db/run-db.ps1 -ConnectionString $env:ERP_DB
   ./db/run-db.ps1 -ConnectionString $env:ERP_TEST_DB
   ```
2. 后端：`dotnet run --project src/ErpApi`
3. 前端：`cd web; npm install; npm run dev`（开发服务器 http://localhost:5173）

## 测试
- 后端：`dotnet test`（设置 ERP_TEST_DB 后 DB 集成测试才会真正运行）
- 前端：`npm --prefix web run test`

## P0 已交付
- 建库三步（146 表 + 233 关系中应用 190 条 + 3 张新增优化表），DbDeploy 工具，Chinese_PRC_CI_AS 排序规则
- 4 横切引擎：① 单号生成（行锁并发安全）② 审核过账（白名单+事务+审计）③ 库存汇总（UNION 符号法，仅审核单）④ 权限矩阵（9 位）+ 操作审计
- 登录：bcrypt + JWT + 连错 5 次锁定，**无后门**，错误只存计数
- 前端：登录页 + 主框架 + 9 位权限控菜单/价格列

## P1 已交付（基础资料）
- EF Core `ErpDbContext`（映射已存在中文表，不做迁移）
- 泛型 `MasterCrudService<T>` + `MasterCrudController<T>`（分页/模糊/CRUD + 9位权限 + 审计）
- 实体：客户/供应商/加工厂/物料（各含类别）、部门、人事、报价（类别+资料）、调价（表+明细）
- 取价（算法8）：`报价资料` 加 `生效日期`，按 物料编号+报价类别 取生效价；调价单可"应用"写回新生效价
- 前端：可复用主数据页（搜索/分页/增删改），基础资料子菜单，价格列按"单价"权限隐藏
- 开发用权限种子：`db/seed_p1_perms.sql`（授权某用户访问全部主数据菜单）

## 安全基线
- 连接串/JWT 密钥仅取自环境变量，无任何硬编码凭据
- 已彻底移除原软件万能密码后门 `zsbqr.com!#(`；密码 bcrypt 加盐；不存明文错误密码
