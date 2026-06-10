import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, InputNumber, Modal, Space, Table, message } from "antd";
import { productionReportApi, type OrderWorksheetRow } from "../../api/productionReports";
import { purchaseOrderApi } from "../../api/purchaseOrders";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const PO_MENU = "采购订单";
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

// 每行用 (生产单号|物料编号|顺位) 唯一键（同生产单同物料可能多行，附加索引）
const rowKey = (r: OrderWorksheetRow, i?: number) =>
  `${r.生产单号 ?? ""}|${r.物料编号 ?? ""}|${i ?? 0}`;

export default function MaterialOrderMakePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSavePO = can(perms, PO_MENU, "保存");
  const maskPrice = hidePrice(perms, PO_MENU);

  const [rows, setRows] = useState<OrderWorksheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  // 可编辑订货数量：key -> 数量（默认=需订数量）
  const [qtyMap, setQtyMap] = useState<Record<string, number | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const data = await productionReportApi.orderWorksheet(kw);
      setRows(data);
      setSelectedKeys([]);
      const m: Record<string, number | null> = {};
      data.forEach((r, i) => { m[rowKey(r, i)] = r.需订数量 ?? null; });
      setQtyMap(m);
    } catch { message.error("加载 物料订单制作 工作表失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const setQty = (key: string, v: number | null) =>
    setQtyMap(prev => ({ ...prev, [key]: v }));

  const columns = useMemo(() => [
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 130, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "总数量", dataIndex: "总数量", width: 90, align: "right" as const, render: num },
    { title: "库存数量", dataIndex: "库存数量", width: 90, align: "right" as const, render: num },
    { title: "可用库存", dataIndex: "可用库存", width: 90, align: "right" as const, render: num },
    { title: "需订数量", dataIndex: "需订数量", width: 90, align: "right" as const, render: num },
    {
      title: "订货数量", dataIndex: "__qty", width: 120, align: "right" as const,
      render: (_: unknown, r: OrderWorksheetRow, i: number) => {
        const k = rowKey(r, i);
        return (
          <InputNumber
            size="small" min={0} style={{ width: 100 }}
            value={qtyMap[k]}
            onChange={(v) => setQty(k, v as number | null)}
          />
        );
      },
    },
    ...(maskPrice ? [] : [
      { title: "预算单价", dataIndex: "预算单价", width: 90, align: "right" as const, render: num },
    ]),
    { title: "供应商名称", dataIndex: "供应商名称", width: 150 },
  ], [qtyMap, maskPrice]);

  const generate = async () => {
    const selected = rows
      .map((r, i) => ({ r, key: rowKey(r, i) }))
      .filter(x => selectedKeys.includes(x.key));
    if (selected.length === 0) { message.warning("请先勾选要生成的物料行"); return; }

    // 缺供应商编号的行无法挂采购订单（PO 外键必填），跳过并提示
    const withSupplier = selected.filter(x => (x.r.供应商编号 ?? "").trim() !== "");
    const skipped = selected.length - withSupplier.length;
    if (withSupplier.length === 0) {
      message.warning("勾选的物料行均缺少供应商编号，无法生成采购订单");
      return;
    }

    // 按 (生产单号, 供应商编号) 分组
    const groups = new Map<string, { 生产单号?: string; 供应商编号: string; 供应商名称?: string; rows: typeof withSupplier }>();
    for (const x of withSupplier) {
      const gk = `${x.r.生产单号 ?? ""}|${x.r.供应商编号}`;
      let g = groups.get(gk);
      if (!g) {
        g = { 生产单号: x.r.生产单号, 供应商编号: x.r.供应商编号!.trim(), 供应商名称: x.r.供应商名称, rows: [] };
        groups.set(gk, g);
      }
      g.rows.push(x);
    }

    Modal.confirm({
      title: "生成采购订单",
      content: `将按生产单×供应商分组生成 ${groups.size} 张采购订单（共 ${withSupplier.length} 行物料${skipped > 0 ? `，另有 ${skipped} 行缺供应商编号将跳过` : ""}）。确认生成？`,
      okText: "生成", cancelText: "取消",
      onOk: async () => {
        setSubmitting(true);
        try {
          const created: string[] = [];
          for (const g of groups.values()) {
            const res = await purchaseOrderApi.create({
              生产单号: g.生产单号,
              供应商编号: g.供应商编号,
              供应商名称: g.供应商名称,
              明细: g.rows.map(x => ({
                物料编号: x.r.物料编号 ?? "",
                物料名称: x.r.物料名称,
                规格: x.r.规格,
                颜色: x.r.颜色,
                单位: x.r.单位,
                数量: qtyMap[x.key] ?? x.r.需订数量 ?? 0,
                单价: x.r.预算单价 ?? undefined,
                预算数量: x.r.需订数量 ?? undefined,
              })),
            });
            created.push(res.单号);
          }
          message.success(`已生成 ${created.length} 张采购订单：${created.join("、")}`);
          await load("");
        } catch { message.error("生成采购订单失败"); }
        finally { setSubmitting(false); }
      },
    });
  };

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="物料订单制作" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 物料编号 / 物料名称" allowClear style={{ width: 320 }}
          onSearch={(v) => load(v)}
        />
        <Button
          type="primary"
          disabled={!canSavePO || selectedKeys.length === 0}
          loading={submitting}
          onClick={generate}
        >
          生成采购订单
        </Button>
        <span style={{ color: "#999" }}>已选 {selectedKeys.length} 行</span>
      </Space>
      <Table
        size="small" rowKey={rowKey} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1600 }}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
