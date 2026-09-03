import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Modal, Space, Table, message } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { lineAmount, productionLinePatch, type DocLine } from "../../utils/materialLines";
import OrderLinePicker from "./OrderLinePicker";
import MaterialPicker from "./MaterialPicker";
import ProductionPicker from "./ProductionPicker";
import { purchaseOrderApi, type PurchaseOrderProgressRow } from "../../api/purchaseOrders";
import { productionApi } from "../../api/production";
import type { MaterialRow } from "../../api/materialMaster";
import type { ProductionTrackingRow } from "../../api/productionReports";

// 受控物料明细行编辑表。
// usageCols(领料/退料)按原系统列序：装配采购|生产单号|款号|物料编号|物料名称|规格|材料|颜色|单位|数量|备注，
//   生产单号/款号/物料编号 为「输入框+🔍」点弹选择器；物料名称/规格/材料/单位 选物料后只读带出；无单价/金额。
// 非 usageCols(采购入仓/退仓)沿用原行为：物料合并链接、可选款号选订单、带单价/金额。
// 减动作：orderPicker 模式提供「整单带入」(按采购单号带入全部欠数行,数量=欠数)；
//   usageCols 模式提供「按生产单带入」(issue-basis 应领量)。两者均丢弃空白行后追加。
// onSupplier: 整单带入时表头供应商为空则顺带带出(由父抽屉回写)。
export default function MaterialLineTable({ value, onChange, hidePriceCols, enableOrderPicker, usageCols, 供应商, 仓库, onSupplier, initialBasis }: {
  value: DocLine[];
  onChange: Dispatch<SetStateAction<DocLine[]>>;
  hidePriceCols: boolean;
  enableOrderPicker?: boolean;
  usageCols?: boolean;
  供应商?: string;
  仓库?: string;   // 领料/退料:所选仓库决定「按生产单带入」口径(来料仓→来料档,塑胶仓→塑胶档)
  onSupplier?: (供应商编号: string, 供应商名称?: string) => void;
  initialBasis?: string;   // 下推入口：从生产通知单跳入时自动按该生产单带入应领明细
}) {
  const setLine = (i: number, patch: Partial<DocLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const [pickFor, setPickFor] = useState<number | null>(null);         // 款号选订单(采购)
  const [matPickFor, setMatPickFor] = useState<number | null>(null);   // 物料选择器
  const [prodPickFor, setProdPickFor] = useState<number | null>(null); // 款号/生产单号选生产制单
  const [wholeOpen, setWholeOpen] = useState(false);     // 整单带入弹窗(采购入仓/退仓)
  const [wholeNo, setWholeNo] = useState("");
  const [wholeLoading, setWholeLoading] = useState(false);
  const [basisOpen, setBasisOpen] = useState(false);     // 按生产单带入弹窗(领料/退料)
  const [basisNo, setBasisNo] = useState("");
  const [basisLoading, setBasisLoading] = useState(false);

  // 订单行 → 明细行的字段映射(单行带入与整单带入共用),数量默认=欠数(全收);
  // 顺带记下订单口径(订购/欠数),供行内「收后欠数」状态列实时计算
  const orderRowToLine = (row: PurchaseOrderProgressRow): DocLine => ({
    订单单号: row.采购单号 ?? undefined,
    生产单号: row.生产单号 ?? undefined,
    款号: row.款号 ?? undefined,
    物料编号: row.物料编号 ?? undefined,
    物料名称: row.物料名称 ?? undefined,
    物料类别: row.物料类别 ?? undefined,
    规格: row.规格 ?? undefined,
    颜色: row.颜色 ?? undefined,
    单位: row.单位 ?? undefined,
    数量: Number(row.欠数 ?? 0),
    订购数量: Number(row.订购数量 ?? 0),
    订单欠数: Number(row.欠数 ?? 0),
  });

  const fillFromOrder = (row: PurchaseOrderProgressRow) => {
    if (pickFor === null) return;
    setLine(pickFor, orderRowToLine(row));
  };

  // 整单带入：取该采购单全部欠数行,丢弃当前空白行后追加;表头供应商为空时顺带带出
  const bringWholeOrder = async (单号: string) => {
    const no = 单号.trim();
    if (!no) return;
    setWholeLoading(true);
    try {
      // keyword 不含采购单号(后端仅匹配 生产单号/款号/物料),故不带 keyword 拉全量欠数行,前端精确过滤该单
      const rows = (await purchaseOrderApi.progress({ onlyOwed: true, 供应商: 供应商 || undefined }))
        .filter(r => (r.采购单号 ?? "").trim() === no);
      if (rows.length === 0) { message.warning(`未找到采购单 ${no} 的欠数行`); return; }
      onChange(prev => [...prev.filter(l => l.物料编号), ...rows.map(orderRowToLine)]);
      if (!供应商 && rows[0].供应商编号) onSupplier?.(rows[0].供应商编号, rows[0].供应商名称 ?? undefined);
      message.success(`已带入 ${rows.length} 行(默认全收欠数)`);
      setWholeOpen(false); setWholeNo("");
    } catch { message.error("整单带入失败"); }
    finally { setWholeLoading(false); }
  };

  // 按生产单带入(领料/退料)：issue-basis 应领行,数量=应领(接单数×BOM用量);
  // 口径跟随表头所选仓库:来料仓→来料档(非塑胶),塑胶仓→塑胶档
  const bringIssueBasis = async (生产单号: string) => {
    const no = 生产单号.trim();
    if (!no) return;
    if (!仓库) { message.warning("请先选择仓库,再按生产单带入"); return; }
    const 档 = 仓库.includes("塑胶") ? "塑胶" : "来料";
    setBasisLoading(true);
    try {
      const rows = await productionApi.issueBasis(no, 档);
      if (rows.length === 0) { message.warning(`生产单 ${no} 无${仓库}应领明细`); return; }
      const mapped: DocLine[] = rows.map(r => ({
        生产单号: r.生产单号 ?? no,
        款号: r.款号 ?? undefined,
        物料编号: r.物料编号 ?? undefined,
        物料名称: r.物料名称 ?? undefined,
        规格: r.规格 ?? undefined,
        颜色: r.颜色 ?? undefined,
        单位: r.单位 ?? undefined,
        数量: Number(r.数量 ?? 0),
      }));
      onChange(prev => [...prev.filter(l => l.物料编号), ...mapped]);
      message.success(`已带入 ${rows.length} 行(应领量)`);
      setBasisOpen(false); setBasisNo("");
    } catch { message.error("按生产单带入失败"); }
    finally { setBasisLoading(false); }
  };

  // 下推入口：URL ?basis=生产单号 跳入时自动带入一次应领明细
  const basisFired = useRef(false);
  useEffect(() => {
    if (!usageCols || !initialBasis || basisFired.current) return;
    basisFired.current = true;
    bringIssueBasis(initialBasis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageCols, initialBasis]);

  const fillFromProduction = (row: ProductionTrackingRow) => {
    if (prodPickFor === null) return;
    setLine(prodPickFor, productionLinePatch(row));
  };

  const fillFromMaterial = (row: MaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      物料编号: row.物料编号 ?? undefined,
      物料名称: row.物料名称 ?? undefined,
      物料类别: row.物料类别 ?? undefined,
      规格: row.规格 ?? undefined,
      颜色: row.颜色 ?? undefined,
      单位: row.单位 ?? undefined,
      单价: hidePriceCols ? null : (row.单价 ?? null),
    });
  };

  // 「输入框+🔍按钮」单元格：可手输，点放大镜弹选择器
  const pickCell = (val: string | undefined, onType: (s: string) => void, onPick: () => void, width: number) => (
    <Input style={{ width }} value={val ?? ""} onChange={e => onType(e.target.value)}
      suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={onPick} />} />
  );
  const ro = (v?: string) => <span>{v ?? ""}</span>;

  const delOp = {
    title: "", key: "_op", width: 50,
    render: (_: unknown, __: DocLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a>,
  };
  const colColor = {
    title: "颜色", dataIndex: "颜色", width: 100,
    render: (_: unknown, r: DocLine, i: number) => (
      <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} />
    ),
  };
  const colQty = {
    title: "数量", dataIndex: "数量", width: 100,
    render: (_: unknown, r: DocLine, i: number) => (
      <InputNumber min={0} precision={2} style={{ width: 88 }} value={r.数量 ?? 0}
        onChange={n => setLine(i, { 数量: Number(n ?? 0) })} />
    ),
  };

  // 领料/退料：按原系统列序
  const usageColumns = [
    {
      title: "装配采购", dataIndex: "装配采购", width: 92,
      render: () => <Input style={{ width: 80 }} disabled placeholder="—" />,
    },
    {
      title: "生产单号", dataIndex: "生产单号", width: 156,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.生产单号, s => setLine(i, { 生产单号: s }), () => setProdPickFor(i), 134),
    },
    {
      key: "款号_usage", title: "款号", dataIndex: "款号", width: 130,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.款号, s => setLine(i, { 款号: s }), () => setProdPickFor(i), 108),
    },
    {
      title: "物料编号", dataIndex: "物料编号", width: 144,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.物料编号, s => setLine(i, { 物料编号: s }), () => setMatPickFor(i), 122),
    },
    { title: "物料名称", dataIndex: "物料名称", width: 150, render: (v: string) => ro(v) },
    { title: "规格", dataIndex: "规格", width: 100, render: (v: string) => ro(v) },
    { title: "材料", dataIndex: "物料类别", width: 84, render: (v: string) => ro(v) },
    colColor,
    { title: "单位", dataIndex: "单位", width: 64, render: (v: string) => ro(v) },
    colQty,
    {
      title: "备注", dataIndex: "备注", width: 140,
      render: (_: unknown, r: DocLine, i: number) => (
        <Input style={{ width: 128 }} value={r.备注 ?? ""} onChange={e => setLine(i, { 备注: e.target.value })} />
      ),
    },
    delOp,
  ];

  // 采购入仓/退仓：沿用原行为
  const purchaseColumns = [
    ...(enableOrderPicker ? [{
      key: "款号_order", title: "款号", dataIndex: "款号", width: 130,
      render: (_: unknown, r: DocLine, i: number) => (
        <a onClick={() => setPickFor(i)}>{r.款号 ? r.款号 : "选订单"}</a>
      ),
    }] : []),
    {
      title: "物料", dataIndex: "物料编号", width: 220,
      render: (_: unknown, r: DocLine, i: number) => (
        <a onClick={() => setMatPickFor(i)}>
          {r.物料编号 ? `${r.物料编号} ${r.物料名称 ?? ""}` : "选物料"}
        </a>
      ),
    },
    { title: "规格", dataIndex: "规格", width: 110, render: (v: string) => v ?? "" },
    colColor,
    { title: "单位", dataIndex: "单位", width: 70, render: (v: string) => v ?? "" },
    colQty,
    // 选了采购订单行的才显示:本次数量 vs 订单欠数 → 欠N(红)/已完成(绿)/超收N(橙),数量一改实时刷新
    ...(enableOrderPicker ? [{
      key: "_owed", title: "收后欠数", width: 96, align: "right" as const,
      render: (_: unknown, r: DocLine) => {
        if (!r.订单单号 || r.订单欠数 == null) return "";
        const 剩余 = Math.round((r.订单欠数 - Number(r.数量 ?? 0)) * 100) / 100;
        if (剩余 > 0) return <b style={{ color: "#cf1322" }}>欠 {剩余}</b>;
        if (剩余 < 0) return <b style={{ color: "#fa8c16" }}>超收 {Math.abs(剩余)}</b>;
        return <b style={{ color: "#52c41a" }}>已完成</b>;
      },
    }] : []),
    ...(hidePriceCols ? [] : [
      {
        title: "单价", dataIndex: "单价", width: 110,
        render: (_: unknown, r: DocLine, i: number) => (
          <InputNumber min={0} precision={4} style={{ width: 96 }} value={r.单价 ?? 0}
            onChange={n => setLine(i, { 单价: Number(n ?? 0) })} />
        ),
      },
      { title: "金额", dataIndex: "_amt", width: 100, render: (_: unknown, r: DocLine) => lineAmount(r).toFixed(2) },
    ]),
    delOp,
  ];

  const columns = usageCols ? usageColumns : purchaseColumns;

  return (
    <div>
      <Table size="small" rowKey={(_: DocLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      <Space style={{ marginTop: 12 }}>
        <Button icon={<PlusOutlined />} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>
        {enableOrderPicker && <Button onClick={() => setWholeOpen(true)}>整单带入</Button>}
        {usageCols && <Button onClick={() => setBasisOpen(true)}>按生产单带入</Button>}
      </Space>
      <Modal title="整单带入采购订单" open={wholeOpen} onCancel={() => setWholeOpen(false)} footer={null} width={420}>
        <Input.Search placeholder="输入采购订单号,回车带入" enterButton="带入" loading={wholeLoading}
          value={wholeNo} onChange={e => setWholeNo(e.target.value)} onSearch={bringWholeOrder} />
        <div style={{ marginTop: 8, color: "#888" }}>仅带入该单的欠数行,数量默认=欠数(全收);当前空白行会被替换</div>
      </Modal>
      <Modal title="按生产单带入应领明细" open={basisOpen} onCancel={() => setBasisOpen(false)} footer={null} width={420}>
        <Input.Search placeholder="输入生产单号,回车带入" enterButton="带入" loading={basisLoading}
          value={basisNo} onChange={e => setBasisNo(e.target.value)} onSearch={bringIssueBasis} />
        <div style={{ marginTop: 8, color: "#888" }}>
          按 BOM 展开应领量带入,口径跟随表头仓库（{仓库 ?? "未选"}：{仓库?.includes("塑胶") ? "塑胶件" : "非塑胶件"}）;可改完再保存;当前空白行会被替换
        </div>
      </Modal>
      <MaterialPicker
        open={matPickFor !== null} hidePriceCols={hidePriceCols}
        onPick={fillFromMaterial} onClose={() => setMatPickFor(null)}
      />
      {enableOrderPicker && (
        <OrderLinePicker
          open={pickFor !== null} 供应商={供应商}
          onPick={fillFromOrder} onClose={() => setPickFor(null)}
        />
      )}
      {usageCols && (
        <ProductionPicker
          open={prodPickFor !== null}
          onPick={fillFromProduction} onClose={() => setProdPickFor(null)}
        />
      )}
    </div>
  );
}
