import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button, Col, DatePicker, Descriptions, Drawer, Input, InputNumber, Modal, Popconfirm,
  Row, Space, Table, Tag, Tooltip, message,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, PrinterOutlined, SaveOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  purchaseOrderApi,
  type PurchaseOrderBasisRow, type PurchaseOrderDetail, type PurchaseOrderLine,
} from "../../api/purchaseOrders";
import type { MaterialRow } from "../../api/materialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import SupplierPicker from "../plastics/SupplierPicker";
import { codeName } from "../../utils/codeName";
import MaterialPicker from "../materials/MaterialPicker";

const MENU = "采购订单";
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
const d10 = (v?: string) => v?.slice(0, 10);

let rowSeq = 1;
const uid = () => rowSeq++;

// 从物料资料.备注 里解析材料：格式 "材料:X" 或 "备注内容;材料:X"（X 取到空格或串尾）
const parse材料 = (备注?: string): string => {
  if (!备注) return "";
  const m = /材料[:：]([^\s]*)/.exec(备注);
  return m?.[1] ?? "";
};

// 编辑态明细行
interface EditRow {
  key: number;
  生产单号?: string;
  款号?: string;
  物料编号: string;
  物料名称: string;
  物料类别?: string;
  规格?: string;
  材料?: string;
  颜色?: string;
  单位?: string;
  数量?: number;
  单价?: number;
  需订数量?: number;   // basis 带出的需订数量，保存时作 预算数量 提交
  供应商编号?: string; // BOM 默认供应商(选择供应商时自动勾选匹配行)
  供应商名称?: string;
  已订数量?: number;  // 该生产单下已下单数量（>0=已下单，默认不勾选，重复下单需确认）
  备注?: string;
}

interface HeaderForm {
  供应商编号: string;
  供应商名称: string;
  日期?: Dayjs;
  交货日期?: Dayjs;
  PO号: string;
  收件人: string;
  仓库: string;
  备注: string;
}

const emptyHeader = (): HeaderForm => ({
  供应商编号: "", 供应商名称: "", 日期: dayjs(), 交货日期: undefined, PO号: "", 收件人: "", 仓库: "", 备注: "",
});

export interface PurchaseOrderDrawerProps {
  open: boolean;
  生产单号?: string;     // 新建模式（按生产单 basis 预填）
  单号?: string;          // 打开已有单（未审核=编辑，已审核=查看）
  onClose: () => void;
  onSaved?: () => void;   // 创建/更新成功或审核/删除后回调（列表刷新）
}

export default function PurchaseOrderDrawer({
  open, 生产单号, 单号, onClose, onSaved,
}: PurchaseOrderDrawerProps) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  // 当前展示单号：查看/编辑已有单来自 props，新建保存后切换
  const [currentNo, setCurrentNo] = useState<string | undefined>(单号);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 编辑态
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [rows, setRows] = useState<EditRow[]>([]);
  // 勾选下单：只有勾选的行才进采购订单（多供应商分别下单）
  const [sel, setSel] = useState<number[]>([]);

  // 已载入单据（已审核=查看态；未审核=回填编辑态并保留单头信息）
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);

  // 选择器/录入清单弹窗
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [basisOpen, setBasisOpen] = useState(false);
  const [basisMo, setBasisMo] = useState("");

  const setHead = (patch: Partial<HeaderForm>) => setHeader(h => ({ ...h, ...patch }));
  const patchRow = (key: number, patch: Partial<EditRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  // basis 行 → 编辑行（预填/录入清单共用）
  const basisToRow = (b: PurchaseOrderBasisRow, mo?: string): EditRow => ({
    key: uid(),
    生产单号: mo,
    物料编号: b.物料编号,
    物料名称: b.物料名称 ?? "",
    物料类别: b.物料类别,
    规格: b.规格,
    颜色: b.颜色,
    单位: b.单位,
    数量: b.需订数量 ?? undefined,
    单价: b.预算单价 ?? undefined,
    需订数量: b.需订数量,
    供应商编号: b.供应商编号,
    供应商名称: b.供应商名称,
    已订数量: b.已订数量 != null ? Number(b.已订数量) : undefined,
  });
  // 已有单明细 → 编辑行
  const lineToRow = (l: PurchaseOrderLine): EditRow => ({
    key: uid(),
    生产单号: l.生产单号,
    款号: l.款号,
    物料编号: l.物料编号 ?? "",
    物料名称: l.物料名称 ?? "",
    物料类别: l.物料类别,
    规格: l.规格,
    材料: l.材料,
    颜色: l.颜色,
    单位: l.单位,
    数量: l.数量 ?? undefined,
    单价: l.单价 ?? undefined,
    需订数量: l.预算数量 ?? undefined,
    备注: l.备注,
  });

  // 载入单据：已审核只查看；未审核回填表头/明细进入编辑态
  const loadDetail = useCallback(async (no: string) => {
    setLoading(true);
    try {
      const d = await purchaseOrderApi.get(no);
      setDetail(d);
      const h = d.单头;
      if (h && h.审核 !== "1") {
        setHeader({
          供应商编号: h.供应商编号 ?? "",
          供应商名称: h.供应商名称 ?? "",
          日期: h.日期 ? dayjs(h.日期) : undefined,
          交货日期: h.交货日期 ? dayjs(h.交货日期) : undefined,
          PO号: h.PO号 ?? "",
          收件人: h.收件人 ?? "",
          仓库: h.仓库 ?? "",
          备注: h.备注 ?? "",
        });
        const rs = d.明细.map(lineToRow);
        setRows(rs);
        setSel(rs.map(r => r.key));
      }
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      message.error(status === 404 ? "单据不存在或已被删除" : (errMsg(e) ?? "加载采购订单失败"));
    }
    finally { setLoading(false); }
  }, []);

  // 新建模式按生产单 basis 预填；PO号=生产通知单.合同号(客户合同号即PO号)
  const loadBasis = useCallback(async (mo: string) => {
    setLoading(true);
    try {
      const basis = await purchaseOrderApi.basis(mo);
      const first = basis[0];
      setHeader(h => ({
        ...h,
        供应商编号: first?.供应商编号 ?? "",
        供应商名称: first?.供应商名称 ?? "",
        PO号: h.PO号 || first?.合同号 || "",
      }));
      const rs = basis.map(b => basisToRow(b, mo));
      setRows(prev => [...prev, ...rs]);
      // 已下单(已订数量>0)的行默认不勾选，防重复下单
      setSel(prev => [...prev, ...rs.filter(r => !(Number(r.已订数量) > 0)).map(r => r.key)]);
      if (basis.length === 0) message.info("该生产单号没有待采购物料");
    } catch { message.error("加载采购物料分析失败"); }
    finally { setLoading(false); }
  }, []);

  // 打开/切换时初始化
  useEffect(() => {
    if (!open) return;
    setDetail(null);
    setRows([]);
    setSel([]);
    setHeader(emptyHeader());
    if (单号) { setCurrentNo(单号); loadDetail(单号); }
    else { setCurrentNo(undefined); if (生产单号) loadBasis(生产单号); }
  }, [open, 单号, 生产单号, loadDetail, loadBasis]);

  // 实际提交：新建 POST，已有单 PUT。只有勾选的行才进采购订单（按供应商分别下单）
  const doSave = async () => {
    if (!header.供应商编号.trim()) { message.error("请选择供应商"); return; }
    const chosen = rows.filter(r => sel.includes(r.key));
    if (chosen.length === 0) { message.error("请勾选要下单的物料行"); return; }
    const lines = chosen
      .filter(r => r.物料编号 && Number(r.数量) > 0)
      .map(r => ({
        物料编号: r.物料编号,
        物料名称: r.物料名称 || undefined,
        物料类别: r.物料类别 || undefined,
        规格: r.规格 || undefined,
        颜色: r.颜色 || undefined,
        单位: r.单位 || undefined,
        数量: Number(r.数量),
        单价: r.单价 != null ? Number(r.单价) : undefined,
        预算数量: r.需订数量 != null ? Number(r.需订数量) : undefined,
        材料: r.材料?.trim() || undefined,
        生产单号: r.生产单号?.trim() || undefined,
        款号: r.款号?.trim() || undefined,
        备注: r.备注?.trim() || undefined,
      }));
    if (lines.length === 0) { message.error("请至少录入一行数量>0的明细"); return; }
    // 单头生产单号兜底：新建未指定时，若所有明细行同属一个生产单号则带出（从采购订单页新建+录入清单的场景）
    const lineMos = [...new Set(lines.map(l => l.生产单号).filter((x): x is string => !!x))];
    const body = {
      生产单号: 生产单号 ?? detail?.单头?.生产单号 ?? (lineMos.length === 1 ? lineMos[0] : undefined),
      供应商编号: header.供应商编号.trim(),
      供应商名称: header.供应商名称.trim() || undefined,
      日期: header.日期 ? header.日期.format("YYYY-MM-DD") : undefined,
      交货日期: header.交货日期 ? header.交货日期.format("YYYY-MM-DD") : undefined,
      PO号: header.PO号.trim() || undefined,
      收件人: header.收件人.trim() || undefined,
      仓库: header.仓库.trim() || undefined,
      备注: header.备注.trim() || undefined,
      明细: lines,
    };
    setSaving(true);
    try {
      if (currentNo) {
        await purchaseOrderApi.update(currentNo, body);
        message.success(`采购订单已保存：${currentNo}`);
        await loadDetail(currentNo);
      } else {
        const r = await purchaseOrderApi.create(body);
        message.success(`采购订单已创建：${r.单号}`);
        setCurrentNo(r.单号);
        await loadDetail(r.单号);
      }
      onSaved?.();
    } catch (e) { message.error(errMsg(e) ?? "保存失败"); }
    finally { setSaving(false); }
  };

  // 保存入口：勾选中包含「已下单」物料时先弹确认，防重复下单；否则直接提交
  const save = () => {
    const ordered = rows.filter(r => sel.includes(r.key) && Number(r.已订数量) > 0);
    if (ordered.length === 0) { void doSave(); return; }
    Modal.confirm({
      title: "勾选项中包含已下单物料",
      width: 460,
      content: (
        <div>
          <div>以下物料在此工作单已下过单（再下单会重复采购）：</div>
          <ul style={{ paddingLeft: 18, margin: "8px 0 0", maxHeight: 220, overflow: "auto" }}>
            {ordered.map(r => (
              <li key={r.key}>{r.物料编号} {r.物料名称}（已订 {r.已订数量}）</li>
            ))}
          </ul>
          <div style={{ marginTop: 8 }}>确认继续下单吗？</div>
        </div>
      ),
      okText: "仍要下单",
      cancelText: "取消",
      onOk: doSave,
    });
  };

  const act = async (fn: () => Promise<unknown>, ok: string, after: "reload" | "close") => {
    try {
      await fn();
      message.success(ok);
      onSaved?.();
      if (after === "close") onClose();
      else if (currentNo) await loadDetail(currentNo);
    } catch (e) { message.error(errMsg(e) ?? "操作失败"); }
  };

  // 录入清单：按生产单号把待采购物料追加进网格
  const appendBasis = async () => {
    const mo = basisMo.trim();
    if (!mo) { message.error("请输入生产单号"); return; }
    try {
      const basis = await purchaseOrderApi.basis(mo);
      if (basis.length === 0) { message.info("该生产单号没有待采购物料"); return; }
      const rs = basis.map(b => basisToRow(b, mo));
      setRows(prev => [...prev, ...rs]);
      setSel(prev => [...prev, ...rs.filter(r => !(Number(r.已订数量) > 0)).map(r => r.key)]);
      // 表头供应商/PO号为空时顺带带出
      const first = basis[0];
      if (first?.供应商编号 || first?.合同号) setHeader(h => ({
        ...h,
        供应商编号: h.供应商编号 || first?.供应商编号 || "",
        供应商名称: h.供应商名称 || first?.供应商名称 || "",
        PO号: h.PO号 || first?.合同号 || "",
      }));
      setBasisOpen(false);
      setBasisMo("");
    } catch (e) { message.error(errMsg(e) ?? "加载采购物料分析失败"); }
  };

  // 选料追加一行（材料从物料资料.备注解析；无价格权限不带单价）
  const onPickMaterial = (m: MaterialRow) => {
    const row: EditRow = {
      key: uid(),
      物料编号: m.物料编号 ?? "",
      物料名称: m.物料名称 ?? "",
      物料类别: m.物料类别,
      规格: m.规格,
      材料: parse材料(m.备注),
      颜色: m.颜色,
      单位: m.单位,
      单价: priceHidden ? undefined : (m.单价 ?? undefined),
    };
    setRows(rs => [...rs, row]);
    setSel(prev => [...prev, row.key]);
  };

  // 选择供应商后自动勾选：默认供应商=该供应商 或 未指定供应商的行；默认供应商是别人的行不勾（多供应商分别下单）；
  // 已下单(已订数量>0)的行也不勾，避免重复下单。
  const onPickSupplier = (s: { 供应商编号?: string; 供应商名称?: string }) => {
    const code = s.供应商编号 ?? "";
    setHead({ 供应商编号: code, 供应商名称: s.供应商名称 ?? "" });
    if (code) setSel(rows.map(r => r.key).filter(k => {
      const r = rows.find(x => x.key === k);
      if (!r || Number(r.已订数量) > 0) return false;
      return !r.供应商编号 || r.供应商编号 === code;
    }));
  };

  // 打印：先登记打印次数，再打打印友好视图
  const doPrint = async () => {
    if (!currentNo) return;
    try {
      const r = await purchaseOrderApi.print(currentNo);
      setDetail(d => d?.单头 ? { ...d, 单头: { ...d.单头, 打印次数: r.打印次数 } } : d);
      setTimeout(() => window.print(), 50);
    } catch (e) { message.error(errMsg(e) ?? "打印失败"); }
  };

  const 审核 = detail?.单头?.审核;
  // 已审核打开 = 只读查看态；其余（新建/未审核）= 编辑态
  const isView = !!currentNo && 审核 === "1";
  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  // —— 编辑态明细列 ——
  const editColumns = [
    { title: "序号", width: 52, render: (_: unknown, __: EditRow, i: number) => i + 1 },
    {
      title: "生产单号", dataIndex: "生产单号", width: 120,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 生产单号: e.target.value })} />,
    },
    {
      title: "款号", dataIndex: "款号", width: 100,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 款号: e.target.value })} />,
    },
    { title: "物料编号", dataIndex: "物料编号", width: 110, sorter: (a: EditRow, b: EditRow) => String(a.物料编号).localeCompare(String(b.物料编号), "zh-Hans-CN", { numeric: true }) },
    { title: "物料名称", dataIndex: "物料名称", width: 140, sorter: (a: EditRow, b: EditRow) => String(a.物料名称 ?? "").localeCompare(String(b.物料名称 ?? ""), "zh-Hans-CN") },
    { title: "规格", dataIndex: "规格", width: 100, sorter: (a: EditRow, b: EditRow) => String(a.规格 ?? "").localeCompare(String(b.规格 ?? "")) },
    {
      title: "材料", dataIndex: "材料", width: 90,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 材料: e.target.value })} />,
    },
    { title: "颜色", dataIndex: "颜色", width: 80, sorter: (a: EditRow, b: EditRow) => String(a.颜色 ?? "").localeCompare(String(b.颜色 ?? "")) },
    { title: "单位", dataIndex: "单位", width: 60 },
    {
      title: "默认供应商", dataIndex: "供应商名称", width: 140, ellipsis: true,
      sorter: (a: EditRow, b: EditRow) => String(a.供应商名称 ?? "").localeCompare(String(b.供应商名称 ?? ""), "zh-Hans-CN"),
      render: (v: string | undefined, r: EditRow) =>
        v ? <Tooltip title={`${r.供应商编号} ${v}`}>{v}</Tooltip> : <span style={{ color: "#bbb" }}>未指定</span>,
    },
    {
      title: "数量", dataIndex: "数量", width: 100, align: "right" as const,
      sorter: (a: EditRow, b: EditRow) => (Number(a.数量) || 0) - (Number(b.数量) || 0),
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} value={v} style={{ width: "100%" }}
          onChange={n => patchRow(r.key, { 数量: n ?? undefined })} />,
    },
    {
      title: "已订数量", dataIndex: "已订数量", width: 110, align: "right" as const,
      sorter: (a: EditRow, b: EditRow) => (Number(a.已订数量) || 0) - (Number(b.已订数量) || 0),
      render: (v: number | undefined) => Number(v) > 0
        ? <Tooltip title="该工作单已下过此物料，重复下单会重复采购"><Tag color="orange">已下单 {v}</Tag></Tooltip>
        : <span style={{ color: "#ccc" }}>—</span>,
    },
    ...(priceHidden ? [] : [{
      title: "单价", dataIndex: "单价", width: 110, align: "right" as const,
      sorter: (a: EditRow, b: EditRow) => (Number(a.单价) || 0) - (Number(b.单价) || 0),
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} value={v} style={{ width: "100%" }}
          onChange={n => patchRow(r.key, { 单价: n ?? undefined })} />,
    }, {
      title: "金额", width: 100, align: "right" as const,
      render: (_: unknown, r: EditRow) =>
        (Number(r.数量) || 0) * (Number(r.单价) || 0),
    }]),
    {
      title: "备注", dataIndex: "备注", width: 130,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 备注: e.target.value })} />,
    },
    {
      title: "操作", width: 60, align: "center" as const,
      render: (_: unknown, r: EditRow) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />}
          onClick={() => {
            setRows(rs => rs.filter(x => x.key !== r.key));
            setSel(prev => prev.filter(k => k !== r.key));
          }} />
      ),
    },
  ];

  // —— 查看态明细列 ——
  const viewColumns = [
    { title: "生产单号", dataIndex: "生产单号", width: 120 },
    { title: "款号", dataIndex: "款号", width: 100 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "材料", dataIndex: "材料", width: 90 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 100, align: "right" as const, render: money },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: money },
    ]),
    { title: "备注", dataIndex: "备注", width: 130 },
  ];

  // 合计只算勾选的行（勾选行才是要下单的）
  const chosenRows = rows.filter(r => sel.includes(r.key));
  const totalQty = chosenRows.reduce((s, r) => s + (Number(r.数量) || 0), 0);
  const totalAmt = chosenRows.reduce((s, r) => s + (Number(r.数量) || 0) * (Number(r.单价) || 0), 0);

  const toolbar = (
    <Space wrap>
      {!isView && can(perms, MENU, "保存") && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      )}
      {!isView && (
        <Button onClick={() => setBasisOpen(true)}>录入清单</Button>
      )}
      {!isView && currentNo && can(perms, MENU, "审核") && (
        <Button icon={<CheckOutlined />}
          onClick={() => act(() => purchaseOrderApi.approve(currentNo!), "已审核", "reload")}>审核</Button>
      )}
      {!isView && currentNo && can(perms, MENU, "删除") && (
        <Popconfirm title="确认删除该采购订单?"
          onConfirm={() => act(() => purchaseOrderApi.remove(currentNo!), "已删除", "close")}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
      {isView && can(perms, MENU, "反审核") && (
        <Button icon={<CloseOutlined />}
          onClick={() => act(() => purchaseOrderApi.unapprove(currentNo!), "已反审核", "reload")}>反审核</Button>
      )}
      {isView && can(perms, MENU, "打印") && (
        <Button icon={<PrinterOutlined />} onClick={doPrint}>打印</Button>
      )}
    </Space>
  );

  const h = detail?.单头;

  return (
    <Drawer
      title={`采购订单${currentNo ? ` · ${currentNo}` : "（新建）"}`}
      width={1080} open={open} onClose={onClose} loading={loading}
      extra={toolbar}
    >
      {isView ? (
        h && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item label="单号">{h.单号}</Descriptions.Item>
              <Descriptions.Item label="日期">{d10(h.日期)}</Descriptions.Item>
              <Descriptions.Item label="审核">{审核Tag(h.审核)}</Descriptions.Item>
              <Descriptions.Item label="供应商编号">{h.供应商编号}</Descriptions.Item>
              <Descriptions.Item label="供应商名称">{h.供应商名称}</Descriptions.Item>
              <Descriptions.Item label="交货日期">{d10(h.交货日期)}</Descriptions.Item>
              <Descriptions.Item label="收件人">{h.收件人}</Descriptions.Item>
              <Descriptions.Item label="仓库">{h.仓库}</Descriptions.Item>
              <Descriptions.Item label="生产单号">{h.生产单号}</Descriptions.Item>
              <Descriptions.Item label="PO号">{h.PO号}</Descriptions.Item>
              <Descriptions.Item label="操作员">{h.操作员}</Descriptions.Item>
              <Descriptions.Item label="打印次数">{h.打印次数 ?? 0}</Descriptions.Item>
              <Descriptions.Item label="数量">{h.数量}</Descriptions.Item>
              <Descriptions.Item label="金额">{money(h.金额)}</Descriptions.Item>
              <Descriptions.Item label="备注">{h.备注}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small" rowKey="ID" pagination={false} scroll={{ x: "max-content", y: 380 }}
              dataSource={detail?.明细 ?? []} columns={viewColumns}
            />
          </Space>
        )
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={12}>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>供应商</div>
              <Space.Compact style={{ width: "100%" }}>
                <Input readOnly placeholder="编号 / 名称"
                  value={codeName(header.供应商编号, header.供应商名称)} />
                <Button onClick={() => setSupplierOpen(true)}>选择</Button>
              </Space.Compact>
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>日期</div>
              <DatePicker style={{ width: "100%" }} value={header.日期}
                onChange={dt => setHead({ 日期: dt ?? undefined })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>交货日期</div>
              <DatePicker style={{ width: "100%" }} value={header.交货日期}
                onChange={dt => setHead({ 交货日期: dt ?? undefined })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>收件人</div>
              <Input value={header.收件人} onChange={e => setHead({ 收件人: e.target.value })} />
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>仓库</div>
              <Input value={header.仓库} onChange={e => setHead({ 仓库: e.target.value })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>PO号</div>
              <Input value={header.PO号} onChange={e => setHead({ PO号: e.target.value })} placeholder="客户 PO号" />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>电脑单号</div>
              <Input value={currentNo ?? ""} disabled placeholder="保存后生成" />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>操作员</div>
              <Input value={h?.操作员 ?? ""} disabled />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>备注</div>
              <Input value={header.备注} onChange={e => setHead({ 备注: e.target.value })} />
            </Col>
          </Row>
          <div>
            <Space style={{ marginBottom: 8 }}>
              <Button icon={<PlusOutlined />}
                onClick={() => setMaterialOpen(true)}>加行</Button>
              <span style={{ color: "#888" }}>
                已勾选 {sel.length} / {rows.length} 行，勾选的物料才会下单到当前供应商
              </span>
            </Space>
            <Table
              size="small" rowKey="key" pagination={false} scroll={{ x: "max-content", y: 380 }}
              dataSource={rows} columns={editColumns}
              rowSelection={{ selectedRowKeys: sel, onChange: keys => setSel(keys as number[]) }}
            />
          </div>
          <div style={{ textAlign: "right", fontWeight: 600 }}>
            数量合计：{totalQty}
            {!priceHidden && <span style={{ marginLeft: 24 }}>金额合计：{totalAmt}</span>}
          </div>
        </Space>
      )}

      <SupplierPicker open={supplierOpen} onPick={onPickSupplier}
        onClose={() => setSupplierOpen(false)} />
      <MaterialPicker open={materialOpen} hidePriceCols={priceHidden}
        onPick={onPickMaterial} onClose={() => setMaterialOpen(false)} />
      <Modal title="录入清单" open={basisOpen} onOk={appendBasis}
        onCancel={() => setBasisOpen(false)} okText="追加" cancelText="取消" width={400}>
        <div style={{ marginBottom: 4 }}>生产单号</div>
        <Input value={basisMo} onChange={e => setBasisMo(e.target.value)}
          onPressEnter={appendBasis} placeholder="输入生产单号，带出待采购物料" />
      </Modal>

      {/* 打印友好视图：屏幕隐藏，@media print 时显示并隐藏其他内容（portal 到 body，避免 Drawer 变换影响打印定位） */}
      {h && createPortal(
        <div className="po-print-only">
          <style>{`
            .po-print-only { display: none; }
            @media print {
              body * { visibility: hidden; }
              .po-print-only, .po-print-only * { visibility: visible; }
              .po-print-only {
                display: block; position: fixed; left: 0; top: 0; width: 100%;
                background: #fff; color: #000; padding: 16px; font-size: 12px;
              }
              .po-print-only h2 { text-align: center; margin: 0 0 12px; font-size: 18px; }
              .po-print-only table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              .po-print-only th, .po-print-only td {
                border: 1px solid #000; padding: 4px 6px; text-align: left; font-weight: normal;
              }
              .po-print-only .po-head td { border: none; padding: 2px 8px 2px 0; }
              .po-print-only .po-num { text-align: right; }
            `}</style>
          <h2>采购订单</h2>
          <table className="po-head"><tbody>
            <tr>
              <td>单号：{h.单号}</td>
              <td>日期：{d10(h.日期)}</td>
              <td>供应商：{h.供应商编号} {h.供应商名称}</td>
              <td>交货日期：{d10(h.交货日期)}</td>
            </tr>
            <tr>
              <td>收件人：{h.收件人}</td>
              <td>PO号：{h.PO号}</td>
              <td>操作员：{h.操作员}</td>
              <td>审核状态：{h.审核 === "1" ? "已审核" : "未审核"}</td>
              <td>打印次数：{h.打印次数 ?? 0}</td>
            </tr>
          </tbody></table>
          <table>
            <thead><tr>
              <th>生产单号</th><th>款号</th><th>物料编号</th><th>物料名称</th><th>规格</th>
              <th>材料</th><th>颜色</th><th>单位</th><th>数量</th>
              {!priceHidden && <th>单价</th>}{!priceHidden && <th>金额</th>}<th>备注</th>
            </tr></thead>
            <tbody>
              {(detail?.明细 ?? []).map(l => (
                <tr key={l.ID}>
                  <td>{l.生产单号}</td><td>{l.款号}</td><td>{l.物料编号}</td>
                  <td>{l.物料名称}</td><td>{l.规格}</td><td>{l.材料}</td>
                  <td>{l.颜色}</td><td>{l.单位}</td>
                  <td className="po-num">{l.数量}</td>
                  {!priceHidden && <td className="po-num">{l.单价}</td>}
                  {!priceHidden && <td className="po-num">{l.金额}</td>}
                  <td>{l.备注}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            数量合计：{h.数量 ?? (detail?.明细 ?? []).reduce((s, l) => s + (Number(l.数量) || 0), 0)}
            {!priceHidden && (
              <span style={{ marginLeft: 24 }}>
                金额合计：{h.金额 ?? (detail?.明细 ?? []).reduce((s, l) => s + (Number(l.金额) || 0), 0)}
              </span>
            )}
          </div>
        </div>,
        document.body,
      )}
    </Drawer>
  );
}
