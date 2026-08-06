# 2026-08-05 全修计划第一批:后端口径类 6 项

## 逐项状态与实测证据

### 1. BOM 台头审核后禁止改保存 ✅
- StyleService.ReplaceMaterialsAsync:UPDLOCK 查 款号物料总表.审核='1' → InvalidOperationException("该 BOM 已审核，请先反审核再修改")(与装配 调整审核 两套并存)。
- curl:77772 已审核 PUT → 409"款号 [77772] 的 BOM 已审核，请先反审核再修改。";反审核 204 → PUT 200(35 行完好)→ 再审核 204。前端保存失败透传 {消息} 链路已有(save catch errMsg)。

### 2. 装配类报表快照化 ✅(核查结论:07-28/08-04 已实现,本轮只验证未改码)
- AssemblyPurchaseQueryService 已是"落库单快照 ∪ 实时展开"混合口径(NOT EXISTS 整组排重,删单自动回实时),覆盖 summary/detail/tracking/required-materials/factory-inventory/auxiliary-issue-progress/factory-category-monthly 七个端点。
- AssemblyMaterialSummaryService(装配物料汇总表)是 BOM 设置清单报表,列的就是"当前设置",实时读为正确语义,未动。
- curl 两场景:造落库单 ZP20260806001 → summary/detail 出现快照行(加工数量 1000);删单 204 → summary 回到仅实时虚拟行(ZP4)。8 个端点全 200。

### 3. 采购订单日期可改 ✅
- PurchaseOrderCreateDto 加 日期(可空);CreateAsync 用 dto.日期 ?? 当天;UpdateAsync `COALESCE(@日期,[日期])` 更新单头+明细日期。前端 Drawer 日期 DatePicker 本就可编辑,save body 补 日期 字段;api 类型同步。
- curl:建单 日期=2026-08-01 → GET 确认 → PUT 改 2026-08-02 → GET 确认 → 删单清理。

### 4. 报表门槛 + 超数红字 ✅
- ProductionReportService:采购超数查询/领料超数查询 加 `JOIN 生产制单 审核='1'` 门槛(说明书 1-3:仅已审核生产通知单出数;"已做采购分析"本就是前提——需求取自 生产BOM物料清单快照,无分析自然无行)。制单用料查询是单点查询未加(见遗留)。
- 红字:前端两页已有(超数Cell/差异Cell 负数橙/正数红),无需改。

### 5. 盘点数量禁负数 ✅
- 三个盘点服务(MaterialStocktake/PlasticStocktake/PlasticRawMaterialStocktake)CreateAsync 加 `盘点数量<0 → ArgumentException("盘点数量不能为负")`。
- curl:来料/塑胶盘点 负数 → 均 400"盘点数量不能为负"。

### 6. 删除 5 个死接口 ✅
- 删 PlasticLabelQueryController.cs 整个文件;PurchaseReceiptController 的 label-query/detail|summary 两动作;PricingController 的 GET material;FinishedSalesReturn/FinishedVendorReturnController 的 GET {单号}(连带 CreatedAtAction(nameof(Get)) 改 StatusCode(201))。服务层方法保留(DB 测试在用)。
- 验证:死接口请求落到 SPA fallback(HTML)即路由已删;活接口(plastic-label-orders/label-query 等)正常 200 JSON;dotnet build 0 错。

## 总验证
- dotnet test 212 过 0 败;npm test 310 过;npm run build 过;eslint 改动文件 1=基线 1。
- 部署:后端 Development 重启;web/dist 已同步 src/ErpApi/wwwroot(index-CKjJ0zgU.js)。
- 未 git commit(等全修计划完成后统一提交)。

## 遗留
- 制单用料查询(按生产单点查)未加审核门槛——单点查询语义,需要时一行 JOIN 即可。
- 装配快照/实时配对边界:生产单未录 MO 行时,实时虚拟单归属键为 (null,款号),与快照 (生产单号,款号) 配不上,两行并存(服务注释已载明该边界)。
- SPA fallback 使"接口不存在"返回 200 HTML 而非 404,验证死接口须看响应体类型。

---

# 2026-08-06 追加:全修计划第二批(前端体验类 3 项)

## 7. BOM 明细多选批量加料 + 中间插行 ✅
- BomSetupPage.tsx:选料弹窗(页面内联 Modal,物料页签)加 rowSelection 多选 + "多选加入(N)" 按钮,勾选行一次性追加(字段映射同单行加入,用量留空);点 checkbox 列不再误触单行加入;数据刷新清空勾选防错位。
- 明细操作列扩为"插入|删":插入 = 该行下方 splice 空行(同添加行结构)。
- Playwright:77772 反审核后开 picker(35 行)→ 勾 2 行("多选加入(2)"高亮)→ 明细 57xxx 输入框 35→37;插入 8→9 行。未保存,现场已恢复(再审核 204、TESTV-PICK 款号已删)。截图 b2_picker_checked.png/b2_multi_added.png。

## 8. 供应商资料页加左树 ✅
- 新建 web/src/pages/master/SupplierMasterPage.tsx(左类别树带计数+新增同级/子类别(供应商类别·保存门控)+右表双击选中/工具栏增删改/新增默认带当前类别),MasterRouter 将 供应商资料 指向新页(其余主数据菜单仍走通用 MasterDataPage,机制未动)。
- **与任务假设的差异**:供应商类别 主数据无父级列(实体只有 类别/名称),树做成一级;"新增子类别"实际也建一级(两级需后端先给类别表加父级列)。职务/传真/邮政编码/电子邮箱 4 个表单字段后端实体未映射,保存会被静默丢弃(需后端加列才真正持久化)。存量供应商的 供应商类别 是旧编号("6"/"9"),与类别主数据对不上的行只在"全部供应商"下出现。
- Playwright:左树"全部供应商"+类别按钮齐、右表 50 行(截图 b2_supplier.png)。

## 9. 权限接线:发外对数/计件汇总 ✅
- 后端 OutsourceController.reconcile(菜单"发外对数")/PieceworkController.summary(菜单"计件汇总")本就按这两个权限名门控;缺的是前端页面门控。
- OutsourceReconcilePage/PieceworkSummaryPage 补 can(perms,"发外对数"/"计件汇总","打开") + 无权访问提示(项目惯例)。两页不在 menuTree(URL 直达),无需菜单项对齐。

## 总验证
- npm run build 过;npm test 310 过;eslint:BomSetupPage 3 个=基线 3,新页面为基线同款 set-state-in-effect 类(全仓既有模式),无新类别错误。
- dist 已同步 src/ErpApi/wwwroot;未 git commit。
