namespace ErpApi.Engines.Inventory;
public interface IInventorySummaryService
{
    Task<IReadOnlyList<InventoryRow>> FinishedGoodsAsync(string warehouse);
    Task<IReadOnlyList<SemiFinishedRow>> SemiFinishedAsync(string warehouse);
}
