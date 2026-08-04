import { useCallback, useEffect, useState } from "react";
import { Button, Descriptions, Drawer, InputNumber, Popconfirm, Space, Table, Tag, message } from "antd";
import { CheckOutlined, CloseOutlined, DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import {
  plasticMaterialDocApi,
  type PlasticMaterialBasisRow, type PlasticMaterialDocDetail,
} from "../../api/plasticMaterialDoc";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "塑胶物料单";
const d10 = (v?: string) => v?.slice(0, 10);
const errMsg = (e: unknown) => (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;

let seq = 1;
const uid = () => seq++;
interface EditRow extends PlasticMaterialBasisRow { key: number; 订购数量?: number }

export default function PlasticMaterialDocDrawer({ open, 生产单号, 单号, onClose, onSaved }: {
  open: boolean; 生产单号?: string; 单号?: string; onClose: () => void; onSaved?: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  const [currentNo, setCurrentNo] = useState<string | undefined>(单号);
  const isView = !!currentNo;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [detail, setDetail] = useState<PlasticMaterialDocDetail | null>(null);

  const loadView = useCallback(async (no: string) => {
    setLoading(true);
    try { setDetail(await plasticMaterialDocApi.get(no)); }
    catch { message.error("加载塑胶物料单失败"); }
    finally { setLoading(false); }
  }, []);

  const loadBasis = useCallback(async (mo: string) => {
    setLoading(true);
    try {
      const basis = await plasticMaterialDocApi.basis(mo);
      setRows(basis.map(b => ({ ...b, key: uid(), 订购数量: Number(b.用量 ?? 0) })));
    } catch { message.error("加载塑胶物料分析失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDetail(null); setRows([]);
    if (单号) { setCurrentNo(单号); loadView(单号); }
    else if (生产单号) { setCurrentNo(undefined); loadBasis(生产单号); }
  }, [open, 单号, 生产单号, loadView, loadBasis]);

  const setQty = (key: number, v: number) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, 订购数量: v } : r)));

  const save = async () => {
    const lines = rows.filter(r => Number(r.订购数量) > 0).map(r => ({
      工模编号: r.工模编号, 物料编号: r.物料编号, 物料名称: r.物料名称, 颜色: r.颜色, 仓位号: r.仓位号,
      用料名称: r.用料名称, 加工内容: r.加工内容, 加工单价: r.加工单价 ?? undefined, 用量: r.用量 ?? undefined,
      订购数量: Number(r.订购数量),
    }));
    if (lines.length === 0) { message.error("请至少录入一行订购数量>0的明细"); return; }
    setSaving(true);
    try {
      const first = rows[0];
      const r = await plasticMaterialDocApi.create({ 生产单号, 货号: first?.货号, 明细: lines });
      message.success(`塑胶物料单已创建：${r.单号}`);
      setCurrentNo(r.单号); loadView(r.单号); onSaved?.();
    } catch (e) { message.error(errMsg(e) ?? "保存失败"); }
    finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string, after: "reload" | "close") => {
    try {
      await fn(); message.success(ok); onSaved?.();
      if (after === "close") onClose();
      else if (currentNo) await loadView(currentNo);
    } catch (e) { message.error(errMsg(e) ?? "操作失败"); }
  };

  const 审核 = detail?.单头?.审核;
  const 审核Tag = (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  const editColumns = [
    { title: "序号", width: 56, render: (_: unknown, __: EditRow, i: number) => i + 1 },
    { title: "工模编号", dataIndex: "工模编号", width: 90 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "颜色", dataIndex: "颜色", width: 70 },
    { title: "仓位号", dataIndex: "仓位号", width: 80 },
    { title: "用料名称", dataIndex: "用料名称", width: 100 },
    { title: "加工内容", dataIndex: "加工内容", width: 100 },
    ...(priceHidden ? [] : [{ title: "加工单价", dataIndex: "加工单价", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" }]),
    { title: "用量", dataIndex: "用量", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    {
      title: "订购数量", dataIndex: "订购数量", width: 120, align: "right" as const,
      render: (v: number | undefined, r: EditRow) =>
        <InputNumber min={0} value={v} style={{ width: "100%" }} onChange={n => setQty(r.key, Number(n ?? 0))} />,
    },
    ...(priceHidden ? [] : [{
      title: "金额", width: 100, align: "right" as const,
      render: (_: unknown, r: EditRow) => (Number(r.订购数量) || 0) * (Number(r.加工单价) || 0),
    }]),
  ];

  const viewColumns = [
    { title: "工模编号", dataIndex: "工模编号", width: 90 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "颜色", dataIndex: "颜色", width: 70 },
    { title: "仓位号", dataIndex: "仓位号", width: 80 },
    { title: "用料名称", dataIndex: "用料名称", width: 100 },
    { title: "加工内容", dataIndex: "加工内容", width: 100 },
    ...(priceHidden ? [] : [{ title: "加工单价", dataIndex: "加工单价", width: 90, align: "right" as const, render: money }]),
    { title: "用量", dataIndex: "用量", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "订购数量", dataIndex: "订购数量", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    ...(priceHidden ? [] : [{ title: "金额", dataIndex: "金额", width: 100, align: "right" as const, render: money }]),
  ];

  const editTotal = rows.reduce((s, r) => s + (Number(r.订购数量) || 0) * (Number(r.加工单价) || 0), 0);
  const h = detail?.单头;

  const toolbar = (
    <Space wrap>
      {!isView && can(perms, MENU, "保存") && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "审核") && (
        <Button icon={<CheckOutlined />} onClick={() => act(() => plasticMaterialDocApi.approve(currentNo!), "已审核", "reload")}>审核</Button>
      )}
      {isView && 审核 === "1" && can(perms, MENU, "反审核") && (
        <Button icon={<CloseOutlined />} onClick={() => act(() => plasticMaterialDocApi.unapprove(currentNo!), "已反审核", "reload")}>反审核</Button>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "删除") && (
        <Popconfirm title="确认删除该塑胶物料单?" onConfirm={() => act(() => plasticMaterialDocApi.remove(currentNo!), "已删除", "close")}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
    </Space>
  );

  return (
    <Drawer title={`塑胶物料单${currentNo ? ` · ${currentNo}` : "（新建）"}`} width={1080} open={open} onClose={onClose} loading={loading} extra={toolbar}>
      {isView ? (
        h && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions size="small" column={3} bordered>
              <Descriptions.Item label="单号">{h.单号}</Descriptions.Item>
              <Descriptions.Item label="日期">{d10(h.日期)}</Descriptions.Item>
              <Descriptions.Item label="审核">{审核Tag(h.审核)}</Descriptions.Item>
              <Descriptions.Item label="生产单号">{h.生产单号}</Descriptions.Item>
              <Descriptions.Item label="货号">{h.货号}</Descriptions.Item>
              <Descriptions.Item label="客户">{h.客户}</Descriptions.Item>
              <Descriptions.Item label="数量">{h.数量}</Descriptions.Item>
              <Descriptions.Item label="金额">{money(h.金额)}</Descriptions.Item>
              <Descriptions.Item label="操作员">{h.操作员}</Descriptions.Item>
            </Descriptions>
            <Table size="small" rowKey="ID" pagination={false} scroll={{ x: "max-content", y: 380 }} dataSource={detail?.明细 ?? []} columns={viewColumns} />
          </Space>
        )
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="生产单号">{生产单号}</Descriptions.Item>
            <Descriptions.Item label="货号">{rows[0]?.货号 ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="明细行数">{rows.length}</Descriptions.Item>
          </Descriptions>
          <Table size="small" rowKey="key" pagination={false} scroll={{ x: true }} dataSource={rows} columns={editColumns} />
          {!priceHidden && <div style={{ textAlign: "right", fontWeight: 600 }}>金额合计：{editTotal}</div>}
        </Space>
      )}
    </Drawer>
  );
}
