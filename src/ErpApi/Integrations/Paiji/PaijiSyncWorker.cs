using Dapper;
using ErpApi.Features.Plastics.PlasticReceipt;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Options;
namespace ErpApi.Integrations.Paiji;

// 排产系统入库单 → ERP塑胶入仓单 反向同步器(定时轮询)。
// 每趟:各车间拉 warehouse-orders → 只留 status=checked-in 且 notes 不含 "ERP:"(我们自己推过去的) 且未同步过的行
//   → 按送货单号分组建未审核塑胶入仓单(操作员=排产同步) → 成功后写 [排产同步记录]。
// 未配置凭证不启动循环;单车间/单组失败记警告继续,所有异常 swallow 保证 worker 不死。
public sealed class PaijiSyncWorker(
    IServiceScopeFactory scopeFactory, IOptions<PaijiOptions> options, ILogger<PaijiSyncWorker> logger)
    : BackgroundService
{
    private readonly PaijiOptions _opt = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_opt.User) || string.IsNullOrWhiteSpace(_opt.Password))
        {
            logger.LogInformation("排产同步未配置凭证,反向同步器不启动");
            return;
        }
        var interval = TimeSpan.FromSeconds(Math.Max(30, _opt.SyncIntervalSeconds));
        logger.LogInformation("排产反向同步器已启动:车间={Workshops} 间隔={Interval}s", _opt.SyncWorkshops, interval.TotalSeconds);
        while (!stoppingToken.IsCancellationRequested)
        {
            await RunOnceAsync(stoppingToken);
            try { await Task.Delay(interval, stoppingToken); }
            catch (OperationCanceledException) { }
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        foreach (var ws in _opt.SyncWorkshops.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            try { await SyncWorkshopAsync(ws, ct); }
            catch (Exception ex) { logger.LogWarning(ex, "排产同步车间 {Workshop} 失败", ws); }
        }
    }

    private async Task SyncWorkshopAsync(string workshop, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var paiji = scope.ServiceProvider.GetRequiredService<PaijiPushService>();
        var receipts = scope.ServiceProvider.GetRequiredService<PlasticReceiptService>();
        var factory = scope.ServiceProvider.GetRequiredService<ISqlConnectionFactory>();

        var rows = (await paiji.PullWarehouseAsync(workshop))
            .Where(r => r.Status == "checked-in" && !(r.Notes?.Contains("ERP:") ?? false))
            .ToList();
        if (rows.Count == 0) return;

        using var c = factory.Create();
        var 已同步 = (await c.QueryAsync<long>(
            "SELECT [排产入库ID] FROM [排产同步记录] WHERE [排产入库ID] IN @ids",
            new { ids = rows.Select(r => r.Id).ToArray() })).ToHashSet();
        var 新行 = rows.Where(r => !已同步.Contains(r.Id)).ToList();
        if (新行.Count == 0) return;

        // 物料编号:mold_no 精确匹配物料资料与否结果都用 mold_no 本身(匹配不到保留原值),直接透传;
        // 匹配规则在 PaijiMapper.ToReceiptLine 以委托注入,纯函数可测
        string? 物料编号匹配(string? moldNo) => moldNo;

        var (供应商编号, 供应商名称) = PaijiMapper.车间供应商(workshop);
        foreach (var g in PaijiMapper.入库分组(新行))
        {
            try
            {
                var group = g.ToList();
                var dto = new PlasticReceiptCreateDto
                {
                    供应商编号 = 供应商编号,
                    供应商名称 = 供应商名称,
                    仓库 = "塑胶仓",
                    入仓单号 = string.IsNullOrWhiteSpace(g.Key) || g.Key.StartsWith('#') ? null : g.Key,
                    订单单号 = group[0].OrderNo,
                    备注 = $"排产系统同步({workshop})",
                    明细 = group.Select(r => PaijiMapper.ToReceiptLine(r, 物料编号匹配)).ToList(),
                };
                var 单号 = await receipts.CreateAsync(dto, "排产同步");

                // 单头日期取排产送货日期(CreateAsync 固定用当天,这里改写)
                if (DateTime.TryParse(group[0].DeliveryDate, out var d))
                    await c.ExecuteAsync("UPDATE [塑胶入仓单] SET [日期]=@d WHERE [单号]=@单号",
                        new { d = d.Date, 单号 });
                foreach (var r in group)
                    await c.ExecuteAsync(
                        "INSERT INTO [排产同步记录]([排产入库ID],[ERP单号],[车间]) VALUES(@id,@单号,@车间)",
                        new { id = r.Id, 单号, 车间 = workshop });
                logger.LogInformation("排产同步建单 {单号}:车间={车间} 送货单号={Code} 行数={N}", 单号, workshop, g.Key, group.Count);
            }
            catch (Exception ex) { logger.LogWarning(ex, "排产同步分组 {Key} 建单失败", g.Key); }
        }
    }
}
