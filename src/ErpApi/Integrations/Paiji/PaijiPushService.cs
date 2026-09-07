using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
namespace ErpApi.Integrations.Paiji;

// AI注塑啤机排产系统 HTTP 客户端(Basic 认证头在 Program.cs AddHttpClient 配置)。
// 未配置 User/Password 时 已配置=false,调用方应整体跳过,保证未配置环境不受影响。
public sealed class PaijiPushService(HttpClient http, IOptions<PaijiOptions> options, ILogger<PaijiPushService> logger)
{
    private readonly PaijiOptions _opt = options.Value;

    public bool 已配置 => !string.IsNullOrWhiteSpace(_opt.User) && !string.IsNullOrWhiteSpace(_opt.Password);

    // 推送排产订单导入(POST /orders),逐行收集远端 id;单行失败记 失败 不中断。
    public Task<(List<long> Ids, List<string> 失败)> PushAsync(IReadOnlyList<PaijiOrderRow> rows)
        => PushCore("orders", rows, r => r.ProductCode ?? "?");

    // 推送排产入库单(POST /warehouse-orders),逐行收集远端 id;单行失败记 失败 不中断。
    public Task<(List<long> Ids, List<string> 失败)> PushWarehouseAsync(IReadOnlyList<PaijiWarehouseRow> rows)
        => PushCore("warehouse-orders", rows, r => r.PartName ?? r.MoldNo ?? "?");

    private async Task<(List<long> Ids, List<string> 失败)> PushCore<T>(
        string endpoint, IReadOnlyList<T> rows, Func<T, string> label)
    {
        var ids = new List<long>();
        var 失败 = new List<string>();
        foreach (var row in rows)
        {
            try
            {
                using var resp = await http.PostAsJsonAsync(endpoint, row);
                var body = await resp.Content.ReadAsStringAsync();
                if (!resp.IsSuccessStatusCode)
                {
                    logger.LogWarning("排产推送失败 {Endpoint} {Status}: {Body}", endpoint, resp.StatusCode, body);
                    失败.Add($"{label(row)}({(int)resp.StatusCode})");
                    continue;
                }
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("id", out var idEl) && idEl.TryGetInt64(out var id))
                    ids.Add(id);
                else
                    失败.Add($"{label(row)}(响应无id)");
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "排产推送异常 {Endpoint} {Label}", endpoint, label(row));
                失败.Add($"{label(row)}({ex.Message})");
            }
        }
        return (ids, 失败);
    }

    // 拉取某车间排产入库单全量(GET /warehouse-orders?workshop=)。
    // 排产端数字字段偶发字符串形态(如 cavity:"6.0"),反序列化允许从字符串读数字。
    private static readonly JsonSerializerOptions ReadJson =
        new() { NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString };

    public async Task<List<PaijiWarehouseInRow>> PullWarehouseAsync(string workshop)
    {
        using var resp = await http.GetAsync($"warehouse-orders?workshop={workshop}");
        var body = await resp.Content.ReadAsStringAsync();
        resp.EnsureSuccessStatusCode();
        return JsonSerializer.Deserialize<List<PaijiWarehouseInRow>>(body, ReadJson) ?? [];
    }

    // 逐个 DELETE {排产端}/{id}(orders / warehouse-orders);单个失败(含远端已删)记警告不中断。
    public async Task<List<string>> DeleteAsync(IEnumerable<(string 排产端, long Id)> records)
    {
        var 警告 = new List<string>();
        foreach (var (端, id) in records)
        {
            try
            {
                using var resp = await http.DeleteAsync($"{端}/{id}");
                if (!resp.IsSuccessStatusCode)
                {
                    logger.LogWarning("排产删除失败 {Endpoint} id={Id} {Status}", 端, id, resp.StatusCode);
                    警告.Add($"排产{端}记录{id}删除失败({(int)resp.StatusCode})");
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "排产删除异常 {Endpoint} id={Id}", 端, id);
                警告.Add($"排产{端}记录{id}删除异常({ex.Message})");
            }
        }
        return 警告;
    }
}
