using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
namespace ErpApi.Features.Production;

public sealed class ProductionService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
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

    // 算法4 BOM展开（Task 7 实现；先留空壳保证编译/测试通过）
    private Task ExpandBomAsync(SqlConnection c, SqlTransaction tx,
        string 生产单号, ProductionCreateDto dto, decimal 计划数量, DateTime now)
        => Task.CompletedTask;

    // 订单回写（Task 7 实现）
    private static Task LinkOrderAsync(SqlConnection c, SqlTransaction tx, string 生产单号, string? 订单单号)
        => Task.CompletedTask;
}
