# 半成品报废单（自由选产品版）— 全套接入

日期：2026-07-21
分支：codex/semi-finished-label-order

## 背景
桌面版「半成品报废单」截图对照，Web 端菜单原为占位 `M("半成品报废单")`（无路由）。
本次按 `半成品退库单`(SemiStockReturn) 净新单据模板 1:1 落地报废单：库存方向 **−**（报废=扣库）。

## 结构与退库单差异
- 表头 `退料人` → `报废人`；标题 `半成品退库单` → `半成品报废单`。
- 明细列与截图一致：装配采购/配件编号/客户/产品货号/产品名称/产品装配名称/生产单号/数量/备注。
- 库存 union 分支用 `数量*-1`（退库用 `+数量`）。
- 单号前缀 `BBF`（BL/BTK/BF/SBF 已占用），DocType `半成品报废单`，权限菜单 `半成品报废`。
- 资料查询复用 `SemiFinishedLabelProductPicker`（截图2 原料资料查询）。

## 变更清单（全套：表/种子/DI/白名单/MenuCatalog/菜单/路由/union）
**新增**
- `db/migrate_semi_scraps.sql` — 半成品报废单 + 半成品报废明细单
- `db/seed_semi_scrap_perms.sql` — 菜单=半成品报废，含 单价/金额 位
- `src/ErpApi/Features/Warehouse/Semi/SemiScrapDtos.cs`
- `src/ErpApi/Features/Warehouse/Semi/SemiScrapService.cs`（Prefix=BBF, DocType=半成品报废单）
- `src/ErpApi/Features/Warehouse/Semi/SemiScrapController.cs`（Route `api/semi-scraps`, Menu=半成品报废）
- `web/src/pages/warehouse/SemiScrapPage.tsx`
- `web/src/utils/semiScrap.ts` + `web/src/__tests__/semiScrap.test.ts`

**修改**
- `web/src/api/semi.ts` — `semiScrapApi` + 类型
- `web/src/App.tsx` — import + `<Route path="semi-scraps">`
- `web/src/nav/menuTree.tsx` — 占位补全为 `M("半成品报废单","/semi-scraps","半成品报废")`
- `src/ErpApi/Program.cs` — DI `SemiScrapService`
- `src/ErpApi/Engines/Posting/PostableDocuments.cs` — 白名单 `半成品报废单`
- `src/ErpApi/Engines/Inventory/InventorySummaryService.cs` — SemiSql 追加 `数量*-1` 分支
- `src/ErpApi/Features/Admin/MenuCatalog.cs` — `("半成品仓库","半成品报废")`
- `db/run-db.ps1` — 注册两个新脚本

## 部署（重要）
生产/测试库都要跑迁移+种子：`db/migrate_semi_scraps.sql`、`db/seed_semi_scrap_perms.sql`。
> 教训沿用：迁移必须同时部署到 **erp 与 erp_test**，否则一库 create 515 / 另一库缺表。

## 待办
- 本机无 dotnet/node，未本地编译/跑测试；Windows 上 `dotnet build` + `npm run build` + `vitest` 验证。
- 工具栏「装配采购清单」按钮暂 disabled（与退库单一致，后续实现）。
- 半成品报表组的「半成品报废查询」仍为占位，后续补。
