import { useCallback, useEffect, useState } from "react";
import {
  Button, Col, DatePicker, Drawer, Input, InputNumber, Modal, Row, Space, Table, Tag, Tooltip, message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { plasticPurchaseOrderApi, type PPOBasisRow } from "../../api/plasticPurchaseOrder";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import SupplierPicker from "./SupplierPicker";
import { codeName } from "../../utils/codeName";

const MENU = "塑胶采购订单";
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;

let rowSeq = 1;
const uid = () => rowSeq++;

// 编辑态明细行（塑胶共用物料表 BOM basis 预填）
interface EditRow extends PPOBasisRow {
  key: number;
  数量?: number;      // 订购数量（默认=计划数量×用量，可改）
  备注?: string;
}

interface HeaderForm {
  供应商编号: string;
  供应商名称: string;
  日期?: Dayjs;
  交货日期?: Dayjs;
  编号: string;   // PO号（客户合同号）
  备注: string;
}

const emptyHeader = (): HeaderForm => ({
  供应商编号: "", 供应商名称: "", 日期: dayjs(), 交货日期: undefined, 编号: "", 备注: "",
});

// 塑胶采购分析点行 → 新建塑胶采购订单抽屉（对齐来料仓采购订单流程）：
// 选供应商 → 勾选物料（已下单的默认不勾）→ 保存下单；重复下单需确认；编号=生产单合同号自动填入。
export default function PlasticPurchaseOrderDrawer({ open, 生产单号, onClose, onSaved }: {
  open: boolean; 生产单号?: string; onClose: () => void; onSaved?: () => void;
}) {
  const perms = usePerms();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [rows, setRows] = useState<EditRow[]>([]);
  // 勾选下单：只有勾选的行才进塑胶采购订单
  const [sel, setSel] = useState<number[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);

  const setHead = (patch: Partial<HeaderForm>) => setHeader(h => ({ ...h, ...patch }));
  const patchRow = (key: number, patch: Partial<EditRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  // 新建模式按生产单 basis 预填；编号=生产通知单.合同号(客户合同号即PO号)
  const loadBasis = useCallback(async (mo: string) => {
    setLoading(true);
    try {
      const basis = await plasticPurchaseOrderApi.basis(mo);
      const first = basis[0];
      setHeader(h => ({ ...h, 编号: h.编号 || first?.合同号 || "" }));
      const rs: EditRow[] = basis.map(b => ({
        ...b, key: uid(),
        数量: b.计划数量 != null && b.用量 != null
          ? Math.round(Number(b.计划数量) * Number(b.用量) * 100) / 100
          : 0,
        已订数量: b.已订数量 != null ? Number(b.已订数量) : undefined,
      }));
      setRows(rs);
      // 已下单(已订数量>0)的行默认不勾选，防重复下单
      setSel(rs.filter(r => !(Number(r.已订数量) > 0)).map(r => r.key));
      if (rs.length === 0) message.info("该生产单号没有塑胶采购物料");
    } catch { message.error("加载塑胶采购分析失败"); }
    finally { setLoading(false); }
  }, []);

  // 打开/切换时初始化
  useEffect(() => {
    if (!open) return;
    setRows([]); setSel([]); setHeader(emptyHeader());
    if (生产单号) loadBasis(生产单号);
  }, [open, 生产单号, loadBasis]);

  // 实际提交
  const doSave = async () => {
    if (!header.供应商编号.trim()) { message.error("请选择供应商"); return; }
    const chosen = rows.filter(r => sel.includes(r.key));
    if (chosen.length === 0) { message.error("请勾选要下单的物料行"); return; }
    const lines = chosen
      .filter(r => r.物料编号 && Number(r.数量) > 0)
      .map(r => ({
        生产单号: r.生产单号 ?? 生产单号,
        款号: r.款号 || undefined,
        物料编号: r.物料编号,
        物料名称: r.物料名称 || undefined,
        模具编号: r.模具编号 || undefined,
        用量: r.用量 ?? undefined,
        套数: r.套数 ?? undefined,
        数量: Number(r.数量),
        颜色: r.颜色 || undefined,
        色粉号: r.色粉号 || undefined,
        用料名称: r.用料名称 || undefined,
        备注: r.备注?.trim() || undefined,
      }));
    if (lines.length === 0) { message.error("请至少录入一行数量>0的明细"); return; }
    setSaving(true);
    try {
      const r = await plasticPurchaseOrderApi.create({
        供应商编号: header.供应商编号.trim(),
        供应商名称: header.供应商名称.trim() || undefined,
        交货日期: header.交货日期 ? header.交货日期.format("YYYY-MM-DD") : undefined,
        编号: header.编号.trim() || undefined,
        备注: header.备注.trim() || undefined,
        明细: lines,
      });
      message.success(`塑胶采购订单已创建：${r.单号}`);
      onSaved?.();
      onClose();
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

  const zhSort = (a?: string, b?: string) => String(a ?? "").localeCompare(String(b ?? ""), "zh-Hans-CN", { numeric: true });

  const columns = [
    { title: "序号", width: 52, render: (_: unknown, __: EditRow, i: number) => i + 1 },
    { title: "物料编号", dataIndex: "物料编号", width: 140, sorter: (a: EditRow, b: EditRow) => zhSort(a.物料编号, b.物料编号) },
    { title: "物料名称", dataIndex: "物料名称", width: 150, sorter: (a: EditRow, b: EditRow) => zhSort(a.物料名称, b.物料名称) },
    { title: "模具编号", dataIndex: "模具编号", width: 110, sorter: (a: EditRow, b: EditRow) => zhSort(a.模具编号, b.模具编号) },
    { title: "颜色", dataIndex: "颜色", width: 90, sorter: (a: EditRow, b: EditRow) => zhSort(a.颜色, b.颜色) },
    { title: "色粉号", dataIndex: "色粉号", width: 90 },
    { title: "用料名称", dataIndex: "用料名称", width: 110 },
    {
      title: "用量", dataIndex: "用量", width: 80, align: "right" as const,
      render: (v?: number | null) => v ?? "",
    },
    {
      title: "套数", dataIndex: "套数", width: 80, align: "right" as const,
      render: (v?: number | null) => v ?? "",
    },
    {
      title: "订购数量", dataIndex: "数量", width: 110, align: "right" as const,
      sorter: (a: EditRow, b: EditRow) => (Number(a.数量) || 0) - (Number(b.数量) || 0),
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} precision={2} value={v} style={{ width: "100%" }}
          onChange={n => patchRow(r.key, { 数量: Number(n ?? 0) })} />,
    },
    {
      title: "已订数量", dataIndex: "已订数量", width: 110, align: "right" as const,
      sorter: (a: EditRow, b: EditRow) => (Number(a.已订数量) || 0) - (Number(b.已订数量) || 0),
      render: (v: number | undefined) => Number(v) > 0
        ? <Tooltip title="该工作单已下过此物料，重复下单会重复采购"><Tag color="orange">已下单 {v}</Tag></Tooltip>
        : <span style={{ color: "#ccc" }}>—</span>,
    },
    {
      title: "备注", dataIndex: "备注", width: 130,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 备注: e.target.value })} />,
    },
  ];

  const chosenRows = rows.filter(r => sel.includes(r.key));
  const totalQty = chosenRows.reduce((s, r) => s + (Number(r.数量) || 0), 0);

  return (
    <Drawer title={`塑胶采购订单（新建）${生产单号 ? ` · ${生产单号}` : ""}`}
      width={1080} open={open} onClose={onClose} loading={loading}
      extra={can(perms, MENU, "保存") && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      )}>
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
              onChange={dt => setHead({ 日期: dt ?? undefined })} disabled />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}>交货日期</div>
            <DatePicker style={{ width: "100%" }} value={header.交货日期}
              onChange={dt => setHead({ 交货日期: dt ?? undefined })} />
          </Col>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}>PO号</div>
            <Input value={header.编号} onChange={e => setHead({ 编号: e.target.value })} placeholder="客户 PO号（默认=合同号）" />
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}>
            <div style={{ marginBottom: 4 }}>生产单号</div>
            <Input value={生产单号 ?? ""} disabled />
          </Col>
          <Col span={18}>
            <div style={{ marginBottom: 4 }}>备注</div>
            <Input value={header.备注} onChange={e => setHead({ 备注: e.target.value })} />
          </Col>
        </Row>
        <div>
          <div style={{ marginBottom: 8, color: "#888" }}>
            已勾选 {sel.length} / {rows.length} 行，勾选的物料才会下单到当前供应商；订购数量默认=计划数量×用量，可改
          </div>
          <Table
            size="small" rowKey="key" pagination={false} scroll={{ x: "max-content", y: 420 }}
            dataSource={rows} columns={columns}
            rowSelection={{ selectedRowKeys: sel, onChange: keys => setSel(keys as number[]) }}
          />
        </div>
        <div style={{ textAlign: "right", fontWeight: 600 }}>数量合计：{totalQty}</div>
      </Space>

      <SupplierPicker open={supplierOpen}
        onPick={s => setHead({ 供应商编号: s.供应商编号 ?? "", 供应商名称: s.供应商名称 ?? "" })}
        onClose={() => setSupplierOpen(false)} />
    </Drawer>
  );
}
