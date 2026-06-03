namespace ErpApi.Engines.Posting;

// 可审核的单头表白名单：表名只能来自此集合，杜绝拼接注入。
public static class PostableDocuments
{
    public static readonly IReadOnlySet<string> Tables = new HashSet<string>(StringComparer.Ordinal)
    {
        "成品入仓单","成品出仓单","成品调拨单","成品盘点单","成品退仓单","成品退货单",
        "采购入仓单","采购付款单","采购退仓单",
        "销售出货单","销售收款单","销售退货单",
        "领料单","退料单","调拨单","盘点单",
        "发外加工单","发外回收单","发外加工付款单",
        "半成品入仓单","半成品领料单","半成品盘点单",
        "成品客户订货单","生产制单"
        // 注：后续阶段可按需追加，但必须列入白名单才允许过账
    };

    public static bool IsAllowed(string table) => Tables.Contains(table);
}
