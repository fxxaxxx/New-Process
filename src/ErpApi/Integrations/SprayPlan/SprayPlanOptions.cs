namespace ErpApi.Integrations.SprayPlan;

// 喷油部排期系统(sprayplan-test)接入配置。
// 应用层登录账号走环境变量 SprayPlan__User / SprayPlan__Password;
// nginx Basic 凭据复用排产的 Paiji__User / Paiji__Password(同一台 nginx),均不入库不入仓。
public sealed class SprayPlanOptions
{
    public string BaseUrl { get; set; } = "";
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
}
