using Microsoft.Data.SqlClient;
namespace ErpApi.Engines.Inventory;
public interface IMaterialInventoryService
{
    // 单物料全仓库存（缺料计算用）；可传入已打开的连接+事务以参与上层事务，传 null 则自开连接。
    Task<decimal> StockOfAsync(string 物料编号, (SqlConnection conn, SqlTransaction tx)? scope);
    // 库存查询列表（按仓库/物料关键字过滤），物料编号×仓库 汇总，仅非零。
    Task<IReadOnlyList<MaterialStockRow>> ListAsync(string? 仓库, string? keyword, string? 物料类别 = null);
}
