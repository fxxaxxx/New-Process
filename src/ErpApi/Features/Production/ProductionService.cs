using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
namespace ErpApi.Features.Production;

public sealed class ProductionService(
    ISqlConnectionFactory factory,
    IDocumentNumberGenerator docNo,
    IMaterialInventoryService inventory)
{
    public const string DocType = "生产制单";
    public const string Prefix = "SC";   // 生产单号 = SC + yyyyMMdd + 3位流水

    // 创建：生成单号 → 算工序汇总 → 插单头 → 插数量明细 → 算法3工序展开 → 算法4BOM展开(Task7) → 订单回写(Task7)
    public async Task<string> CreateAsync(ProductionCreateDto dto, string user)
    {
        if (dto.数量明细.Count == 0) throw new ArgumentException("生产制单至少要有一行颜色尺码数量");
        if (string.IsNullOrWhiteSpace(dto.款号)) throw new ArgumentException("款号必填");

        var 计划数量 = dto.数量明细.Sum(q => q.数量);
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        var 生产单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        // 先从款式工序工价取汇总（单头要用）；FK 要求单头先插、工序行后插
        var 工序汇总 = await c.QueryFirstAsync<(int 工序数, decimal 工序单价)>(@"
SELECT COUNT(*) AS 工序数, ISNULL(SUM([单价]),0) AS 工序单价
FROM [款号明细表] WHERE [款号]=@款号", new { dto.款号 }, tx);

        // 1. 单头
        await c.ExecuteAsync(@"
INSERT INTO [生产制单]([生产单号],[款号],[款式],[合同号],[客户款号],[客户编号],[客户名称],
    [加工厂编号],[加工厂名称],[日期],[交货日期],[制单人],[跟单员],[操作员],
    [计划数量],[工序数],[工序单价],[物料金额],[出货单价],
    [审核],[完成],[工序审核],[BOM审核],[下单日期],[备注])
VALUES(@生产单号,@款号,@款式,@合同号,@客户款号,@客户编号,@客户名称,
    @加工厂编号,@加工厂名称,@日期,@交货日期,@制单人,@跟单员,@制单人,
    @计划数量,@工序数,@工序单价,0,@出货单价,
    '0',N'否','0','0',@日期,@备注)",
            new
            {
                生产单号, dto.款号, dto.款式, dto.合同号, dto.客户款号, dto.客户编号, dto.客户名称,
                dto.加工厂编号, dto.加工厂名称, 日期 = now, dto.交货日期, 制单人 = user, dto.跟单员,
                计划数量, 工序汇总.工序数, 工序汇总.工序单价, dto.出货单价, dto.备注
            }, tx);

        // 2. 数量明细（规范化色×码行）
        foreach (var q in dto.数量明细)
            await c.ExecuteAsync(@"
INSERT INTO [生产制单数量]([生产单号],[款号],[款式],[客户款号],[合同号],[日期],
    [客户编号],[客户名称],[加工厂编号],[加工厂名称],[颜色],[尺码],[数量])
VALUES(@生产单号,@款号,@款式,@客户款号,@合同号,@日期,
    @客户编号,@客户名称,@加工厂编号,@加工厂名称,@颜色,@尺码,@数量)",
                new
                {
                    生产单号, dto.款号, dto.款式, dto.客户款号, dto.合同号, 日期 = now,
                    dto.客户编号, dto.客户名称, dto.加工厂编号, dto.加工厂名称, q.颜色, q.尺码, q.数量
                }, tx);

        // 3. === 算法3 工费展开 ===
        // 把款式工序工价复制为本单工序表（复制而非引用：下单后改款式工价不影响已下单据）。
        // 计划工费 = 计划数量 × Σ(工序单价)；实做工费按工票实际完成数量算（P4 落地）。
        await c.ExecuteAsync(@"
INSERT INTO [生产制单工序表]([生产单号],[款号],[款式],[客户款号],[合同号],
    [工序号],[工序名称],[单价],[工序类型],[备注],[审核])
SELECT @生产单号,[款号],[款式],@客户款号,@合同号,
    [工序号],[工序名称],[单价],[工序类型],[备注],'0'
FROM [款号明细表] WHERE [款号]=@款号",
            new { 生产单号, dto.款号, dto.客户款号, dto.合同号 }, tx);

        // 4. 算法4 BOM展开 + 订单回写（Task 7 实现）
        await ExpandBomAsync(c, tx, 生产单号, dto, 计划数量, now);
        await LinkOrderAsync(c, tx, 生产单号, dto.订单单号);

        tx.Commit();
        return 生产单号;
    }

    // 分页列表（单头；关键字模糊匹配 生产单号/款号/款式/客户名称/合同号）
    public async Task<PagedResult<ProductionHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";

        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [生产制单]
WHERE @kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [款式] LIKE @kw
   OR [客户名称] LIKE @kw OR [合同号] LIKE @kw;
SELECT [ID],[生产单号],[款号],[款式],[合同号],[客户编号],[客户名称],[加工厂编号],[加工厂名称],
       [日期],[交货日期],[制单人],[跟单员],[计划数量],[工序数],[工序单价],[物料金额],[出货单价],
       [审核],[审核人],[完成],[备注]
FROM [生产制单]
WHERE @kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [款式] LIKE @kw
   OR [客户名称] LIKE @kw OR [合同号] LIKE @kw
ORDER BY [ID] DESC
OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<ProductionHeaderDto>()).AsList();
        return new PagedResult<ProductionHeaderDto>(items, total);
    }

    // 详情：单头 + 数量 + 工序 + BOM
    public async Task<ProductionDetailDto?> GetAsync(string 生产单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[生产单号],[款号],[款式],[合同号],[客户编号],[客户名称],[加工厂编号],[加工厂名称],
       [日期],[交货日期],[制单人],[跟单员],[计划数量],[工序数],[工序单价],[物料金额],[出货单价],
       [审核],[审核人],[完成],[备注]
FROM [生产制单] WHERE [生产单号]=@生产单号;
SELECT [ID],[颜色],[尺码],[数量] FROM [生产制单数量] WHERE [生产单号]=@生产单号 ORDER BY [ID];
SELECT [ID],[工序号],[工序名称],[单价],[工序类型] FROM [生产制单工序表] WHERE [生产单号]=@生产单号 ORDER BY [工序号];
SELECT [ID],[物料编号],[物料名称],[规格],[颜色],[单位],[总数量],[库存数量],[可用库存],[需订数量],
       [预算单价],[金额],[供应商编号],[供应商名称]
FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 ORDER BY [ID];",
            new { 生产单号 });
        var header = await multi.ReadFirstOrDefaultAsync<ProductionHeaderDto>();
        if (header is null) return null;
        return new ProductionDetailDto
        {
            单头 = header,
            数量 = (await multi.ReadAsync<ProductionQtyRowDto>()).AsList(),
            工序 = (await multi.ReadAsync<ProductionProcessDto>()).AsList(),
            物料 = (await multi.ReadAsync<ProductionBomDto>()).AsList(),
        };
    }

    // 删除：仅未审核可删；先清订单回写引用 → 删子表 → 删单头
    public async Task<bool> DeleteAsync(string 生产单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的生产制单不能删除，请先反审核。");

        // 清除订单上的关联引用（FK 不允许删被引用的单头）
        await c.ExecuteAsync("UPDATE [成品客户订单总表] SET [生产单号]=NULL WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("UPDATE [成品客户订单明细表] SET [生产单号]=NULL WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        // 删子表（FK→单头）
        await c.ExecuteAsync("DELETE FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [生产制单工序表] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [生产制单数量] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        // 删单头
        await c.ExecuteAsync("DELETE FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        tx.Commit();
        return true;
    }

    // === 算法4 BOM 物料需求展开/缺料 ===
    // 需求(总数量) = 款号物料明细表.使用数量 × 计划数量
    // 库存数量 = 采购入仓(+) + 退料(+) − 领料(−)，只认已审核单（P3 物料侧落地前自然为 0）
    // 需订数量(缺料) = max(0, 总数量 − 库存数量)
    // 预算单价 = 物料资料.单价；金额 = 总数量 × 预算单价；单头.物料金额 = Σ(金额)
    private async Task ExpandBomAsync(SqlConnection c, SqlTransaction tx,
        string 生产单号, ProductionCreateDto dto, decimal 计划数量, DateTime now)
    {
        // 供应商 LEFT JOIN 供应商资料 校验：FK 要求 生产BOM物料清单.供应商编号 必须存在于供应商资料
        var rows = (await c.QueryAsync<BomSourceRow>(@"
SELECT b.[物料编号], b.[物料名称], b.[物料类别], b.[规格], b.[颜色], b.[单位], b.[使用数量],
       m.[单价] AS 预算单价, s.[供应商编号], s.[供应商名称]
FROM [款号物料明细表] b
LEFT JOIN [物料资料] m ON m.[物料编号] = b.[物料编号]
LEFT JOIN [供应商资料] s ON s.[供应商编号] = m.[供应商编号]
WHERE b.[款号]=@款号", new { dto.款号 }, tx)).AsList();

        decimal 物料金额合计 = 0;
        foreach (var b in rows)
        {
            var 总数量 = (b.使用数量 ?? 0) * 计划数量;
            // 可用库存暂=当前库存(预留/在途扣减逻辑 P3 落地)；
            // N+1 查询此处可接受：制单是一次性写操作,款式物料通常<50行;批量场景再改 IN 批查。
            var 库存数量 = await inventory.StockOfAsync(b.物料编号 ?? "", (c, tx));
            var 需订数量 = Math.Max(0, 总数量 - 库存数量);
            var 金额 = 总数量 * (b.预算单价 ?? 0);
            物料金额合计 += 金额;

            await c.ExecuteAsync(@"
INSERT INTO [生产BOM物料清单]([日期],[制单日期],[生产单号],[款号],[款式],[客户款号],[合同号],
    [物料编号],[物料名称],[规格],[颜色],[单位],
    [总数量],[库存数量],[可用库存],[需订数量],[订货数量],[预算单价],[金额],
    [供应商编号],[供应商名称],[审核])
VALUES(@日期,@日期,@生产单号,@款号,@款式,@客户款号,@合同号,
    @物料编号,@物料名称,@规格,@颜色,@单位,
    @总数量,@库存数量,@库存数量,@需订数量,0,@预算单价,@金额,
    @供应商编号,@供应商名称,'0')",
                new
                {
                    日期 = now, 生产单号, dto.款号, dto.款式, dto.客户款号, dto.合同号,
                    b.物料编号, b.物料名称, b.规格, b.颜色, b.单位,
                    总数量, 库存数量, 需订数量, b.预算单价, 金额, b.供应商编号, b.供应商名称
                }, tx);
        }

        await c.ExecuteAsync(
            "UPDATE [生产制单] SET [物料金额]=@物料金额 WHERE [生产单号]=@生产单号",
            new { 物料金额 = 物料金额合计, 生产单号 }, tx);
    }

    // 从订单生成：把 生产单号 回写到订单总表/明细表（FK: 订单表.生产单号 → 生产制单.生产单号，单头已插所以安全）
    private static async Task LinkOrderAsync(
        SqlConnection c, SqlTransaction tx, string 生产单号, string? 订单单号)
    {
        if (string.IsNullOrWhiteSpace(订单单号)) return;
        var n = await c.ExecuteAsync(
            "UPDATE [成品客户订单总表] SET [生产单号]=@生产单号 WHERE [单号]=@订单单号",
            new { 生产单号, 订单单号 }, tx);
        if (n == 0) throw new ArgumentException($"订单 [{订单单号}] 不存在，无法关联生产制单。");
        await c.ExecuteAsync(
            "UPDATE [成品客户订单明细表] SET [生产单号]=@生产单号 WHERE [单号]=@订单单号",
            new { 生产单号, 订单单号 }, tx);
    }
}
