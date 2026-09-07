namespace ErpApi.Integrations.Paiji;

// AI注塑啤机排产系统 接入配置。真实凭证走环境变量 Paiji__User / Paiji__Password,不入库不入仓。
public sealed class PaijiOptions
{
    public string BaseUrl { get; set; } = "";
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    // 反向同步(排产入库单→ERP塑胶入仓单):逗号分隔的车间列表与轮询间隔(秒)
    public string SyncWorkshops { get; set; } = "AT";
    public int SyncIntervalSeconds { get; set; } = 300;
}
