using System.Text.Json.Serialization;

namespace ErpApi.Features.Production;

// 一行颜色×尺码数量
public sealed class ProductionQtyDto
{
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal 数量 { get; set; }
}

// 一个货号行（对应一个 BOM款号），承载该货号的色×码数量
public sealed class ProductionGoodsLineDto
{
    public string 货号 { get; set; } = "";
    public string BOM款号 { get; set; } = "";
    public string? 款号名称 { get; set; }
    public decimal? 比例 { get; set; }
    public bool 分析 { get; set; } = true;
    public List<ProductionQtyDto> 数量明细 { get; set; } = [];   // 颜色/尺码/数量
}

// 新建生产通知单（一单多货号；可从订单生成：传 订单单号 则回写关联）
public sealed class ProductionNoticeCreateDto
{
    public string? 订单类型 { get; set; }
    public string? 标识 { get; set; }
    public string? 装箱方式 { get; set; }
    public int? 订单总箱数 { get; set; }
    public string? 默认单价 { get; set; }
    public string? 客户编号 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 客户款号 { get; set; }
    public string? 合同号 { get; set; }
    public string? 加工厂编号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 跟单员 { get; set; }
    public DateTime? 下单日期 { get; set; }
    public string? 备注 { get; set; }
    public string? 订单单号 { get; set; }
    public List<ProductionGoodsLineDto> 货号明细 { get; set; } = [];
}

// 列表行（单头）
public sealed class ProductionHeaderDto
{
    public long ID { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 合同号 { get; set; }
    public string? 客户编号 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 加工厂编号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public DateTime? 日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public DateTime? 下单日期 { get; set; }
    public string? 客户款号 { get; set; }
    public string? 订单类型 { get; set; }
    public string? 标识 { get; set; }
    public string? 装箱方式 { get; set; }
    public int? 订单总箱数 { get; set; }
    public string? 默认单价 { get; set; }
    public string? 制单人 { get; set; }
    public string? 跟单员 { get; set; }
    public decimal? 计划数量 { get; set; }
    public decimal? 工序数 { get; set; }
    public decimal? 工序单价 { get; set; }
    public decimal? 物料金额 { get; set; }
    public decimal? 出货单价 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 完成 { get; set; }
    public string? 备注 { get; set; }
}

// 货号明细行（生产制单货号；GetAsync 返回）
public sealed class ProductionGoodsRowDto
{
    public long ID { get; set; }
    public int? 序号 { get; set; }
    public string? 货号 { get; set; }
    // STJ camelCase 会把 BOM款号 序列化成 boM款号，前端读 BOM款号，这里固定输出名
    [JsonPropertyName("BOM款号")]
    public string? BOM款号 { get; set; }
    public string? 款号名称 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 比例 { get; set; }
    public bool? 分析 { get; set; }
}

// 工序行（算法3 展开结果）
public sealed class ProductionProcessDto
{
    public long ID { get; set; }
    public string? 货号 { get; set; }
    public string? 工序号 { get; set; }
    public string? 工序名称 { get; set; }
    public decimal? 单价 { get; set; }
    public string? 工序类型 { get; set; }
}

// 数量行（规范化色×码）
public sealed class ProductionQtyRowDto
{
    public long ID { get; set; }
    public string? 货号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal? 数量 { get; set; }
}

// BOM 行（算法4 展开结果，Task 7 用）
public sealed class ProductionBomDto
{
    public long ID { get; set; }
    public string? 货号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 总数量 { get; set; }
    public decimal? 库存数量 { get; set; }
    public decimal? 可用库存 { get; set; }
    public decimal? 需订数量 { get; set; }
    public decimal? 预算单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
}

// 详情 = 单头 + 货号明细 + 数量 + 工序 + BOM
public sealed class ProductionDetailDto
{
    public ProductionHeaderDto? 单头 { get; set; }
    public List<ProductionGoodsRowDto> 货号明细 { get; set; } = [];
    public List<ProductionQtyRowDto> 数量 { get; set; } = [];
    public List<ProductionProcessDto> 工序 { get; set; } = [];
    public List<ProductionBomDto> 物料 { get; set; } = [];
}

// MO单跟踪行（生产通知单MO单；MO单录入页签）。ID 为 IDENTITY，保存时不传。
public sealed class MoLineDto
{
    public int? 序号 { get; set; }
    public DateTime? 接单日期 { get; set; }
    public string? 正单合同号 { get; set; }
    public string? 产品货号 { get; set; }
    public string? 产品名称 { get; set; }
    public decimal? 接单数量 { get; set; }
    public string? 装箱方式 { get; set; }
    public int? 订单总箱数 { get; set; }
    public DateTime? 验货日期 { get; set; }
    public string? 备注 { get; set; }
}

// BOM 展开的内部数据源行（款号物料明细表 LEFT JOIN 物料资料/供应商资料，Task 7 用）
public sealed class BomSourceRow
{
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 物料类别 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 使用数量 { get; set; }
    public decimal? 预算单价 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
}
