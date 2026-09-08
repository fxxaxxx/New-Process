using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
using ErpApi.Integrations.Paiji;
using ErpApi.Integrations.SprayPlan;
namespace ErpApi.Features.Plastics.PlasticPurchaseOrder;

// 塑胶采购订单。头 + 明细。审核 = 纯锁定(走通用过账引擎只翻 审核='1',不动库存)。
// 明细按生产单号从塑胶共用物料表 BOM 调入(同 PlasticMaterialDocService.BasisAsync 口径)。
public sealed class PlasticPurchaseOrderService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo,
    PaijiPushService paiji, SprayPlanPushService spray)
{
    public const string DocType = "塑胶采购订单";
    public const string Prefix = "SP";   // 塑胶采购订单号 = SP + yyyyMMdd + 3位流水

    // 从塑胶共用物料表 BOM 按生产单号带出基准行；顺带返回 计划数量(默认订购数量=计划数量×用量)、
    // 生产制单.合同号(客户合同号即PO号,前端自动填入表头 编号) 与 已订数量(塑胶采购订单明细 按 物料+颜色 累计,防重复下单)。
    // 套数 BOM 未填时回落 塑胶物料资料.套数。
    public async Task<IReadOnlyList<PlasticPurchaseOrderBasisRow>> BasisAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticPurchaseOrderBasisRow>(@"
SELECT g.[生产单号], pm.[款号], p.[物料编号], p.[物料名称], p.[工模编号] AS 模具编号,
       p.[用量], COALESCE(p.[套数], mm.[套数]) AS 套数, p.[颜色],
       -- 色粉号 BOM 未填时回落 塑胶物料资料(资料由表格导入,值带 .0 后缀,剥掉)
       COALESCE(NULLIF(p.[色粉号], N''),
                CASE WHEN mm.[色粉号] LIKE N'%.0' THEN LEFT(mm.[色粉号], LEN(mm.[色粉号])-2) ELSE mm.[色粉号] END) AS 色粉号,
       p.[用料名称],
       -- 加工内容 优先 塑胶物料资料，BOM 未填时回落 BOM(喷油下单按它过滤)
       COALESCE(NULLIF(mm.[加工内容], N''), NULLIF(p.[加工内容], N'')) AS 加工内容,
       pm.[计划数量], pm.[合同号],
       ISNULL(od.[已订数量],0) AS 已订数量
FROM [塑胶共用物料表] p
JOIN [生产制单货号] g ON g.[货号] = p.[塑胶货号]
LEFT JOIN [生产制单] pm ON pm.[生产单号] = g.[生产单号]
LEFT JOIN [塑胶物料资料] mm ON mm.[物料编号] = p.[物料编号]
LEFT JOIN (
    SELECT d.[物料编号], ISNULL(d.[颜色],N'') AS 颜色键, SUM(d.[数量]) AS 已订数量
    FROM [塑胶采购订单明细] d
    JOIN [塑胶采购订单] o ON o.[单号]=d.[单号]
    WHERE d.[生产单号]=@生产单号
    GROUP BY d.[物料编号], ISNULL(d.[颜色],N'')
) od ON od.[物料编号]=p.[物料编号] AND od.[颜色键]=ISNULL(p.[颜色],N'')
WHERE g.[生产单号] = @生产单号
ORDER BY p.[ID]", new { 生产单号 });
        return rows.AsList();
    }

    public async Task<string> CreateAsync(PlasticPurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶采购订单至少要有一行物料明细");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [塑胶采购订单]([单号],[日期],[交货日期],[供应商编号],[供应商名称],[客户名称],[交货地点],[编号],[数量],[操作员],[审核],[备注])
VALUES(@单号,@日期,@交货日期,@供应商编号,@供应商名称,@客户名称,@交货地点,@编号,@数量,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.交货日期, dto.供应商编号, dto.供应商名称, dto.客户名称,
                  dto.交货地点, dto.编号, 数量 = 数量合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶采购订单明细]([单号],[生产单号],[款号],[物料编号],[物料名称],[模具编号],[用量],[套数],[数量],[颜色],[色粉号],[用料名称],[加工内容],[备注])
VALUES(@单号,@生产单号,@款号,@物料编号,@物料名称,@模具编号,@用量,@套数,@数量,@颜色,@色粉号,@用料名称,@加工内容,@备注)",
                new { 单号, l.生产单号, l.款号, l.物料编号, l.物料名称, l.模具编号, l.用量, l.套数,
                      l.数量, l.颜色, l.色粉号, l.用料名称, l.加工内容, l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    // 未审核可改：单头字段(日期/操作员不动) + 明细整组替换；已审核拒绝(先反审核)。
    public async Task<bool> UpdateAsync(string 单号, PlasticPurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶采购订单至少要有一行物料明细");
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶采购订单] WITH (UPDLOCK,HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶采购订单不能修改，请先反审核。");

        await c.ExecuteAsync(@"
UPDATE [塑胶采购订单] SET [交货日期]=@交货日期,[供应商编号]=@供应商编号,[供应商名称]=@供应商名称,
    [客户名称]=@客户名称,[交货地点]=@交货地点,[编号]=@编号,[数量]=@数量,[备注]=@备注
WHERE [单号]=@单号",
            new { 单号, dto.交货日期, dto.供应商编号, dto.供应商名称, dto.客户名称,
                  dto.交货地点, dto.编号, 数量 = dto.明细.Sum(l => l.数量), dto.备注 }, tx);

        await c.ExecuteAsync("DELETE FROM [塑胶采购订单明细] WHERE [单号]=@单号", new { 单号 }, tx);
        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶采购订单明细]([单号],[生产单号],[款号],[物料编号],[物料名称],[模具编号],[用量],[套数],[数量],[颜色],[色粉号],[用料名称],[加工内容],[备注])
VALUES(@单号,@生产单号,@款号,@物料编号,@物料名称,@模具编号,@用量,@套数,@数量,@颜色,@色粉号,@用料名称,@加工内容,@备注)",
                new { 单号, l.生产单号, l.款号, l.物料编号, l.物料名称, l.模具编号, l.用量, l.套数,
                      l.数量, l.颜色, l.色粉号, l.用料名称, l.加工内容, l.备注 }, tx);

        tx.Commit();
        return true;
    }

    public async Task<PagedResult<PlasticPurchaseOrderHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 1000) size = 1000;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [塑胶采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [客户名称] LIKE @kw;
SELECT [ID],[单号],[日期],[交货日期],[供应商名称],[客户名称],[数量],[操作员],[审核],[审核人],[备注]
FROM [塑胶采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [客户名称] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticPurchaseOrderHeaderDto>()).AsList();
        return new PagedResult<PlasticPurchaseOrderHeaderDto>(items, total);
    }

    public async Task<PlasticPurchaseOrderDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[交货日期],[供应商编号],[供应商名称],[客户名称],[交货地点],[编号],[数量],[操作员],[审核],[审核人],[备注]
FROM [塑胶采购订单] WHERE [单号]=@单号;
SELECT [ID],[生产单号],[款号],[物料编号],[物料名称],[模具编号],[用量],[套数],[数量],[颜色],[色粉号],[用料名称],[加工内容],[备注]
FROM [塑胶采购订单明细] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticPurchaseOrderHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticPurchaseOrderLineDto>()).AsList();

        // 每行补 已入仓/欠数(同进度表核销口径):打开已入仓的单据就能看到收货进度
        using var c2 = factory.Create();
        var prog = await c2.QueryAsync<PlasticPurchaseOrderLineDto>(@"
SELECT d.[ID],
       ISNULL(rk.[入仓数量], 0) AS 入仓数量,
       d.[数量] - ISNULL(rk.[入仓数量], 0) AS 欠数
FROM [塑胶采购订单明细] d
LEFT JOIN (" + ReceiptAggSql + ReceiptJoinSql + @"
WHERE d.[单号] = @单号", new { 单号 });
        var byId = prog.ToDictionary(r => r.ID);
        foreach (var l in lines)
            if (byId.TryGetValue(l.ID, out var p)) { l.入仓数量 = p.入仓数量; l.欠数 = p.欠数; }
        return new PlasticPurchaseOrderDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶采购订单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶采购订单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [塑胶采购订单明细] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [塑胶采购订单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }

    // ==================== 外部系统推送挂钩(排产 paiji + 喷油部 sprayplan) ====================
    // 审核成功后调用:排产推送(所有供应商,车间按映射)与喷油排期推送(供应商含「喷油部」)并存,互不干扰。
    // 未配置凭证的分支整体跳过;推送失败/部分失败只返回警告,不阻断审核。
    public async Task<string?> ApprovePushAsync(string 单号)
    {
        var 警告 = new List<string>();
        警告.AddRange(await ApprovePaijiPushAsync(单号));
        警告.AddRange(await ApproveSprayPlanPushAsync(单号));
        return 警告.Count > 0 ? string.Join("；", 警告) : null;
    }

    // 排产推送(排产端=orders):把订单明细逐行推送到排产系统订单导入,车间按单头供应商映射。
    private async Task<List<string>> ApprovePaijiPushAsync(string 单号)
    {
        var 警告 = new List<string>();
        if (!paiji.已配置) return 警告;

        using var c = factory.Create();
        // 幂等重推:已有推送记录先删远端再清记录(只清排产端,喷油排期记录由 sprayplan 分支处理)
        var 旧记录 = (await c.QueryAsync<(string 排产端, long Id)>(@"
SELECT [排产端],[排产订单ID] AS Id FROM [排产推送记录]
WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]<>N'sprayplan-test'", new { 单号 })).AsList();
        if (旧记录.Count > 0)
        {
            警告.AddRange(await paiji.DeleteAsync(旧记录));
            await c.ExecuteAsync(
                "DELETE FROM [排产推送记录] WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]<>N'sprayplan-test'", new { 单号 });
        }

        var d = await GetAsync(单号);
        if (d?.单头 is null) { 警告.Add("已审核，但推送排产系统失败：单据读取失败。"); return 警告; }
        // 喷油部的单只推喷油排期系统,不推排产(由 ApproveSprayPlanPushAsync 负责)
        if (SprayPlanMapper.要推送(d.单头.供应商名称)) return 警告;
        var 有效行 = d.明细.Where(l => l.数量 > 0).ToList();
        if (有效行.Count == 0) return 警告;

        // 啤重G换算所需的物料资料(整啤净重,回落原胶件单净重)
        var 物料表 = (await c.QueryAsync<PaijiMaterialInfo>(@"
SELECT [物料编号],[整啤净重],[原胶件单净重] FROM [塑胶物料资料] WHERE [物料编号] IN @codes",
            new { codes = 有效行.Select(l => l.物料编号).Distinct().ToArray() }))
            .ToDictionary(m => m.物料编号, m => m);

        var workshop = PaijiMapper.车间(d.单头.供应商名称);
        var rows = 有效行.Select(l => PaijiMapper.BuildRow(workshop, d.单头, l,
            l.物料编号 is not null && 物料表.TryGetValue(l.物料编号, out var m) ? m : null)).ToList();

        var (ids, 失败) = await paiji.PushAsync(rows);
        foreach (var id in ids)
            await c.ExecuteAsync(@"
INSERT INTO [排产推送记录]([单据类型],[单据号],[排产订单ID],[排产端],[车间]) VALUES(N'采购订单',@单号,@id,N'orders',@车间)",
                new { 单号, id, 车间 = workshop });

        if (失败.Count > 0)
            警告.Add(ids.Count == 0
                ? $"已审核，但推送排产系统失败：{string.Join("、", 失败)}"
                : $"部分行推送失败：{string.Join("、", 失败)}");
        return 警告;
    }

    // 喷油部排期推送(排产端=sprayplan-test,车间='喷油部'):供应商名称含「喷油部」时按款号分组,一款号一张订单。
    private async Task<List<string>> ApproveSprayPlanPushAsync(string 单号)
    {
        var 警告 = new List<string>();
        using var c = factory.Create();
        // 幂等重推:已有喷油排期记录先删远端再清记录
        var 旧记录 = (await c.QueryAsync<long>(@"
SELECT [排产订单ID] FROM [排产推送记录]
WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]=N'sprayplan-test'", new { 单号 })).AsList();
        var 供应商 = await c.ExecuteScalarAsync<string?>(
            "SELECT [供应商名称] FROM [塑胶采购订单] WHERE [单号]=@单号", new { 单号 });
        if (!SprayPlanMapper.要推送(供应商))
            return 警告;   // 非喷油部供应商:不推;旧记录理论上也只可能是喷油部单留下,这里一并忽略
        if (旧记录.Count > 0)
        {
            if (spray.已配置) 警告.AddRange(await spray.DeleteOrdersAsync(旧记录));
            await c.ExecuteAsync(
                "DELETE FROM [排产推送记录] WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]=N'sprayplan-test'", new { 单号 });
        }
        if (!spray.已配置) return 警告;

        var d = await GetAsync(单号);
        if (d?.单头 is null) { 警告.Add("已审核，但推送喷油排期系统失败：单据读取失败。"); return 警告; }
        var 有效行 = d.明细.Where(l => l.数量 > 0).ToList();
        if (有效行.Count == 0) return 警告;

        var drafts = SprayPlanMapper.BuildDrafts(d.单头, 有效行);
        var (ids, 失败) = await spray.PushOrdersAsync(drafts);
        foreach (var id in ids)
            await c.ExecuteAsync(@"
INSERT INTO [排产推送记录]([单据类型],[单据号],[排产订单ID],[排产端],[车间]) VALUES(N'采购订单',@单号,@id,N'sprayplan-test',N'喷油部')",
                new { 单号, id });

        if (失败.Count > 0)
            警告.Add(ids.Count == 0
                ? $"已审核，但推送喷油排期系统失败：{string.Join("、", 失败)}"
                : $"喷油排期部分款号推送失败：{string.Join("、", 失败)}");
        return 警告;
    }

    // 反审核成功后调用:按推送记录删远端(排产端=orders 走排产,sprayplan-test 走喷油排期;容忍远端已删),再清记录;失败只返回警告。
    public async Task<string?> UnapprovePushAsync(string 单号)
    {
        using var c = factory.Create();
        var 记录 = (await c.QueryAsync<(string 排产端, long Id)>(@"
SELECT [排产端],[排产订单ID] AS Id FROM [排产推送记录] WHERE [单据类型]=N'采购订单' AND [单据号]=@单号", new { 单号 })).AsList();
        if (记录.Count == 0) return null;

        var 警告 = new List<string>();
        var 排产记录 = 记录.Where(r => r.排产端 != "sprayplan-test").ToList();
        var 喷油记录 = 记录.Where(r => r.排产端 == "sprayplan-test").Select(r => r.Id).ToList();
        if (排产记录.Count > 0)
        {
            if (!paiji.已配置) 警告.Add("排产系统未配置凭证，远端排产订单未删除（推送记录已保留）。");
            else
            {
                警告.AddRange(await paiji.DeleteAsync(排产记录));
                await c.ExecuteAsync(
                    "DELETE FROM [排产推送记录] WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]<>N'sprayplan-test'", new { 单号 });
            }
        }
        if (喷油记录.Count > 0)
        {
            if (!spray.已配置) 警告.Add("喷油排期系统未配置凭证，远端订单未删除（推送记录已保留）。");
            else
            {
                警告.AddRange(await spray.DeleteOrdersAsync(喷油记录));
                await c.ExecuteAsync(
                    "DELETE FROM [排产推送记录] WHERE [单据类型]=N'采购订单' AND [单据号]=@单号 AND [排产端]=N'sprayplan-test'", new { 单号 });
            }
        }
        return 警告.Count > 0 ? string.Join("；", 警告) : null;
    }


    // 塑胶进度表(采购进度):一行一采购订单明细 + 已审核入仓数量 + 欠数=订购−入仓。
    // 入仓核销口径见 ReceiptAggSql/ReceiptJoinSql:带 订单单号 按采购订单核销(排期下单主口径),否则回退按生产单核销。
// 塑胶采购订单明细行已审核入仓数量聚合子查询(两进度接口 + GetAsync 详情共用)。
// 核销口径两条路:
//  ① 入仓行带 订单单号(下推/选采购单入仓)→ 按 采购订单单号+物料+颜色 精确核销(排期下单主口径,与物料侧一致);
//  ② 入仓行无 订单单号(旧口径,生产单 BOM 调入开单)→ 回退按 生产单号+物料+颜色 核销。
private const string ReceiptAggSql = @"
    SELECT r.[生产单号], r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'') AS 颜色键, SUM(r.[数量]) AS 入仓数量
    FROM [塑胶入仓明细单] r
    JOIN [塑胶入仓单] h ON h.[单号] = r.[单号]
    WHERE ISNULL(h.[审核],'0') = '1'
    GROUP BY r.[生产单号], r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'')";

private const string ReceiptJoinSql = @"
) rk ON rk.[物料编号] = d.[物料编号] AND rk.[颜色键] = ISNULL(d.[颜色],'')
   AND ( rk.[订单单号] = d.[单号]
      OR (rk.[订单单号] IS NULL AND rk.[生产单号] IS NOT NULL AND rk.[生产单号] = d.[生产单号]) )";

    public async Task<IReadOnlyList<PlasticPurchaseProgressRow>> ProgressAsync(
        string? 供应商, DateTime? 起, DateTime? 止, string? keyword, bool onlyOwed)
    {
        var sup = string.IsNullOrWhiteSpace(供应商) ? null : $"%{供应商.Trim()}%";
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticPurchaseProgressRow>(@"
SELECT o.[日期] AS 订购日期, o.[交货日期], o.[单号] AS 采购单号, d.[生产单号], d.[款号],
       d.[物料编号], d.[物料名称], d.[模具编号], d.[颜色], m.[单位],
       d.[数量] AS 订购数量,
       ISNULL(rk.[入仓数量], 0) AS 入仓数量,
       d.[数量] - ISNULL(rk.[入仓数量], 0) AS 欠数,
       o.[供应商名称], o.[审核]
FROM [塑胶采购订单明细] d
JOIN [塑胶采购订单] o ON o.[单号] = d.[单号]
LEFT JOIN (SELECT [物料编号], MAX([单位]) AS 单位 FROM [塑胶物料资料] GROUP BY [物料编号]) m ON m.[物料编号] = d.[物料编号]
LEFT JOIN (" + ReceiptAggSql + ReceiptJoinSql + @"
WHERE (@sup IS NULL OR o.[供应商编号] LIKE @sup OR o.[供应商名称] LIKE @sup)
  AND (@起 IS NULL OR o.[日期] >= @起)
  AND (@止 IS NULL OR o.[日期] < @止)
  AND (@kw IS NULL OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@onlyOwed = 0 OR (d.[数量] - ISNULL(rk.[入仓数量], 0)) > 0)
ORDER BY o.[单号] DESC, d.[ID]", new { sup, 起, 止 = 止Excl, kw, onlyOwed = onlyOwed ? 1 : 0 });
        return rows.AsList();
    }

    // 塑胶进度明细表:进度表明细行 + 最近入仓单号/日期 + 完成情况(镜像 PlasticProcessPurchaseOrderService.PurchaseDetailAsync)。
    // 入仓核销口径同 ProgressAsync(见 ReceiptJoinSql,仅审核='1')。
    public async Task<IReadOnlyList<PlasticPurchaseProgressDetailRow>> ProgressDetailAsync(
        string? 供应商, DateTime? 起, DateTime? 止, string? keyword, string? 完成情况)
    {
        var sup = string.IsNullOrWhiteSpace(供应商) ? null : $"%{供应商.Trim()}%";
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var 止Excl = 止?.Date.AddDays(1);
        var done = 完成情况 switch { "已完成" => 1, "未完成" => 0, _ => -1 };
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticPurchaseProgressDetailRow>(@"
SELECT o.[日期] AS 订购日期, o.[交货日期], o.[单号] AS 采购单号, d.[生产单号], d.[款号],
       d.[物料编号], d.[物料名称], d.[模具编号], d.[颜色], m.[单位],
       d.[数量] AS 订购数量,
       ISNULL(rk.[入仓数量], 0) AS 入仓数量,
       d.[数量] - ISNULL(rk.[入仓数量], 0) AS 欠数,
       rk.[入仓日期], rk.[入仓单号],
       CASE WHEN d.[数量] - ISNULL(rk.[入仓数量], 0) <= 0 THEN N'已完成' ELSE N'未完成' END AS 完成情况,
       o.[供应商名称], o.[审核]
FROM [塑胶采购订单明细] d
JOIN [塑胶采购订单] o ON o.[单号] = d.[单号]
LEFT JOIN (SELECT [物料编号], MAX([单位]) AS 单位 FROM [塑胶物料资料] GROUP BY [物料编号]) m ON m.[物料编号] = d.[物料编号]
LEFT JOIN (
    SELECT r.[生产单号], r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'') AS 颜色键,
           SUM(r.[数量]) AS 入仓数量, MAX(r.[单号]) AS 入仓单号, MAX(h.[日期]) AS 入仓日期
    FROM [塑胶入仓明细单] r
    JOIN [塑胶入仓单] h ON h.[单号] = r.[单号]
    WHERE ISNULL(h.[审核],'0') = '1'
    GROUP BY r.[生产单号], r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'')
" + ReceiptJoinSql + @"
WHERE (@sup IS NULL OR o.[供应商编号] LIKE @sup OR o.[供应商名称] LIKE @sup)
  AND (@起 IS NULL OR o.[日期] >= @起)
  AND (@止 IS NULL OR o.[日期] < @止)
  AND (@kw IS NULL OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@done = -1 OR (@done = 1 AND (d.[数量] - ISNULL(rk.[入仓数量],0)) <= 0) OR (@done = 0 AND (d.[数量] - ISNULL(rk.[入仓数量],0)) > 0))
ORDER BY o.[单号] DESC, d.[ID]", new { sup, 起, 止 = 止Excl, kw, done });
        return rows.AsList();
    }
}
