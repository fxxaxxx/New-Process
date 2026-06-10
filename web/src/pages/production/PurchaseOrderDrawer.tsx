import { useCallback, useEffect, useState } from "react";
import {
  Button, Col, DatePicker, Descriptions, Drawer, Input, InputNumber, Popconfirm,
  Row, Space, Table, Tag, message,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined, SaveOutlined,
} from "@ant-design/icons";
import { type Dayjs } from "dayjs";
import {
  purchaseOrderApi,
  type PurchaseOrderBasisRow, type PurchaseOrderDetail,
} from "../../api/purchaseOrders";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "采购订单";
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
const d10 = (v?: string) => v?.slice(0, 10);

let rowSeq = 1;
const uid = () => rowSeq++;

// 编辑态明细行（新建模式）
interface EditRow {
  key: number;
  物料编号: string;
  物料名称: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  总数量?: number;
  库存数量?: number;
  可用库存?: number;
  需订数量?: number;
  采购单价?: number;
  已订数量?: number;
  备注?: string;
}

interface HeaderForm {
  供应商编号: string;
  供应商名称: string;
  交货日期?: Dayjs;
  仓库: string;
  合同号: string;
  备注: string;
}

const emptyHeader: HeaderForm = {
  供应商编号: "", 供应商名称: "", 交货日期: undefined, 仓库: "", 合同号: "", 备注: "",
};

export interface PurchaseOrderDrawerProps {
  open: boolean;
  生产单号?: string;     // 新建模式
  单号?: string;          // 查看模式
  onClose: () => void;
  onSaved?: () => void;   // 创建成功或审核/删除后回调（列表刷新）
}

export default function PurchaseOrderDrawer({
  open, 生产单号, 单号, onClose, onSaved,
}: PurchaseOrderDrawerProps) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  // 当前展示单号：查看模式来自 props，新建模式保存后切换
  const [currentNo, setCurrentNo] = useState<string | undefined>(单号);
  const isView = !!currentNo;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 新建态
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [rows, setRows] = useState<EditRow[]>([]);

  // 查看态
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);

  const setHead = (patch: Partial<HeaderForm>) => setHeader(h => ({ ...h, ...patch }));
  const patchRow = (key: number, patch: Partial<EditRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const loadView = useCallback(async (no: string) => {
    setLoading(true);
    try { setDetail(await purchaseOrderApi.get(no)); }
    catch { message.error("加载采购物料单失败"); }
    finally { setLoading(false); }
  }, []);

  const loadBasis = useCallback(async (mo: string) => {
    setLoading(true);
    try {
      const basis = await purchaseOrderApi.basis(mo);
      const first = basis[0];
      setHeader({
        ...emptyHeader,
        供应商编号: first?.供应商编号 ?? "",
        供应商名称: first?.供应商名称 ?? "",
      });
      setRows(basis.map((b: PurchaseOrderBasisRow) => ({
        key: uid(),
        物料编号: b.物料编号,
        物料名称: b.物料名称 ?? "",
        物料类别: b.物料类别,
        规格: b.规格,
        颜色: b.颜色,
        单位: b.单位,
        总数量: b.总数量,
        库存数量: b.库存数量,
        可用库存: b.可用库存,
        需订数量: b.需订数量,
        采购单价: b.预算单价 ?? undefined,
        已订数量: b.需订数量,
      })));
    } catch { message.error("加载采购物料分析失败"); }
    finally { setLoading(false); }
  }, []);

  // 打开/切换时初始化
  useEffect(() => {
    if (!open) return;
    setDetail(null);
    setRows([]);
    setHeader(emptyHeader);
    if (单号) { setCurrentNo(单号); loadView(单号); }
    else if (生产单号) { setCurrentNo(undefined); loadBasis(生产单号); }
  }, [open, 单号, 生产单号, loadView, loadBasis]);

  // 查看态切换后载入
  useEffect(() => {
    if (open && currentNo && !单号) loadView(currentNo);
  }, [open, currentNo, 单号, loadView]);

  const save = async () => {
    if (!header.供应商编号.trim()) { message.error("请填写供应商编号"); return; }
    const lines = rows
      .filter(r => Number(r.已订数量) > 0)
      .map(r => ({
        物料编号: r.物料编号,
        物料名称: r.物料名称 || undefined,
        物料类别: r.物料类别 || undefined,
        规格: r.规格 || undefined,
        颜色: r.颜色 || undefined,
        单位: r.单位 || undefined,
        数量: Number(r.已订数量),
        单价: r.采购单价 != null ? Number(r.采购单价) : undefined,
        预算数量: r.需订数量 != null ? Number(r.需订数量) : undefined,
      }));
    if (lines.length === 0) { message.error("请至少录入一行已订数量>0的明细"); return; }
    setSaving(true);
    try {
      const r = await purchaseOrderApi.create({
        生产单号,
        供应商编号: header.供应商编号.trim(),
        供应商名称: header.供应商名称.trim() || undefined,
        交货日期: header.交货日期 ? header.交货日期.format("YYYY-MM-DD") : undefined,
        仓库: header.仓库.trim() || undefined,
        合同号: header.合同号.trim() || undefined,
        备注: header.备注.trim() || undefined,
        明细: lines,
      });
      message.success(`采购订单已创建：${r.单号}`);
      setCurrentNo(r.单号);
      onSaved?.();
    } catch (e) { message.error(errMsg(e) ?? "保存失败"); }
    finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string, after: "reload" | "close") => {
    try {
      await fn();
      message.success(ok);
      onSaved?.();
      if (after === "close") onClose();
      else if (currentNo) await loadView(currentNo);
    } catch (e) { message.error(errMsg(e) ?? "操作失败"); }
  };

  const 审核 = detail?.单头?.审核;
  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  // —— 新建态明细列 ——
  const editColumns = [
    { title: "序号", width: 56, render: (_: unknown, __: EditRow, i: number) => i + 1 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "总数量", dataIndex: "总数量", width: 80, align: "right" as const },
    { title: "库存数量", dataIndex: "库存数量", width: 84, align: "right" as const },
    { title: "可用库存", dataIndex: "可用库存", width: 84, align: "right" as const },
    {
      title: "需订数量", dataIndex: "需订数量", width: 90, align: "right" as const,
      render: (v?: number) => (
        <span style={{ fontWeight: 700, color: (v ?? 0) > 0 ? "#cf1322" : undefined }}>{v ?? 0}</span>
      ),
    },
    ...(priceHidden ? [] : [{
      title: "采购单价", dataIndex: "采购单价", width: 120, align: "right" as const,
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} value={v} style={{ width: "100%" }}
          onChange={n => patchRow(r.key, { 采购单价: n ?? undefined })} />,
    }]),
    {
      title: "已订数量", dataIndex: "已订数量", width: 120, align: "right" as const,
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} value={v} style={{ width: "100%" }}
          onChange={n => patchRow(r.key, { 已订数量: n ?? undefined })} />,
    },
    ...(priceHidden ? [] : [{
      title: "采购金额", width: 100, align: "right" as const,
      render: (_: unknown, r: EditRow) =>
        (Number(r.已订数量) || 0) * (Number(r.采购单价) || 0),
    }]),
    {
      title: "备注", dataIndex: "备注", width: 140,
      render: (v: string | undefined, r: EditRow) =>
        <Input value={v} onChange={e => patchRow(r.key, { 备注: e.target.value })} />,
    },
  ];

  // —— 查看态明细列 ——
  const viewColumns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    { title: "预算数量", dataIndex: "预算数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 100, align: "right" as const, render: money },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: money },
    ]),
  ];

  const editTotal = rows.reduce(
    (s, r) => s + (Number(r.已订数量) || 0) * (Number(r.采购单价) || 0), 0);

  const toolbar = (
    <Space wrap>
      {!isView && can(perms, MENU, "保存") && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "审核") && (
        <Button icon={<CheckOutlined />}
          onClick={() => act(() => purchaseOrderApi.approve(currentNo!), "已审核", "reload")}>审核</Button>
      )}
      {isView && 审核 === "1" && can(perms, MENU, "反审核") && (
        <Button icon={<CloseOutlined />}
          onClick={() => act(() => purchaseOrderApi.unapprove(currentNo!), "已反审核", "reload")}>反审核</Button>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "删除") && (
        <Popconfirm title="确认删除该采购订单?"
          onConfirm={() => act(() => purchaseOrderApi.remove(currentNo!), "已删除", "close")}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
    </Space>
  );

  const h = detail?.单头;

  return (
    <Drawer
      title={`采购物料单${currentNo ? ` · ${currentNo}` : "（新建）"}`}
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
              <Descriptions.Item label="仓库">{h.仓库}</Descriptions.Item>
              <Descriptions.Item label="生产单号">{h.生产单号}</Descriptions.Item>
              <Descriptions.Item label="操作员">{h.操作员}</Descriptions.Item>
              <Descriptions.Item label="数量">{h.数量}</Descriptions.Item>
              <Descriptions.Item label="金额">{money(h.金额)}</Descriptions.Item>
              <Descriptions.Item label="备注">{h.备注}</Descriptions.Item>
            </Descriptions>
            <Table
              size="small" rowKey="ID" pagination={false} scroll={{ x: true }}
              dataSource={detail?.明细 ?? []} columns={viewColumns}
            />
          </Space>
        )
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={12}>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>供应商编号</div>
              <Input value={header.供应商编号} onChange={e => setHead({ 供应商编号: e.target.value })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>供应商名称</div>
              <Input value={header.供应商名称} onChange={e => setHead({ 供应商名称: e.target.value })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>交货日期</div>
              <DatePicker style={{ width: "100%" }} value={header.交货日期}
                onChange={dt => setHead({ 交货日期: dt ?? undefined })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>仓库</div>
              <Input value={header.仓库} onChange={e => setHead({ 仓库: e.target.value })} />
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>合同号</div>
              <Input value={header.合同号} onChange={e => setHead({ 合同号: e.target.value })} />
            </Col>
            <Col span={6}>
              <div style={{ marginBottom: 4 }}>生产单号</div>
              <Input value={生产单号 ?? ""} disabled />
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 4 }}>备注</div>
              <Input value={header.备注} onChange={e => setHead({ 备注: e.target.value })} />
            </Col>
          </Row>
          <Table
            size="small" rowKey="key" pagination={false} scroll={{ x: true }}
            dataSource={rows} columns={editColumns}
          />
          {!priceHidden && (
            <div style={{ textAlign: "right", fontWeight: 600 }}>
              采购金额合计：{editTotal}
            </div>
          )}
        </Space>
      )}
    </Drawer>
  );
}
