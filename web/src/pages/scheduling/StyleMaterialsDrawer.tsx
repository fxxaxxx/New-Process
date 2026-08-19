// 排期行货号 → BOM 物料弹窗:展开该货号的物料清单,勾选后按供应商分组生成物料采购单
// 复用现有能力:BOM 数据 stylesApi.materials(同 BOM物料设置页),下单 purchaseOrderApi.create(同采购订单)
import { useEffect, useMemo, useState } from "react";
import { Button, Drawer, Empty, InputNumber, Modal, Select, Space, Table, Tag, message } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { stylesApi, type StyleBomLine } from "../../api/styles";
import { masterApi } from "../../api/master";
import { purchaseOrderApi } from "../../api/purchaseOrders";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const PO_MENU = "采购订单";

interface Supplier { 编号: string; 名称: string }

interface Row {
  key: string;
  物料编号: string;
  物料名称?: string;
  物料类别?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string;
  使用数量?: number | null;
  需求数量: number;
  单价?: number;
  供应商编号?: string;
  供应商名称?: string;
}

export default function StyleMaterialsDrawer({ ctx, onClose }: {
  ctx: { 货号: string; 数量?: number; 排期客户?: string; PO号?: string } | null;
  onClose: () => void;
}) {
  const perms = usePerms();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const open = ctx !== null;
  const 排期数量 = ctx?.数量 ?? 0;

  // 供应商主数据(下拉选项;masterApi 资源名为英文,同 SupplierMasterPage)
  useEffect(() => {
    if (!open) return;
    masterApi("suppliers").list(1, 1000)
      .then(r => setSuppliers(r.items
        .map(x => ({ 编号: String(x.供应商编号 ?? ""), 名称: String(x.供应商名称 ?? "") }))
        .filter(s => s.编号)))
      .catch(() => setSuppliers([]));
  }, [open]);

  // 载入 BOM 物料 + 报价默认供应商/单价
  useEffect(() => {
    if (!ctx) return;
    setLoading(true); setNotFound(false); setRows([]); setSelectedKeys([]);
    stylesApi.materials(ctx.货号)
      .then(v => {
        const quoteOf = new Map<string, { 编号?: string; 名称?: string; 价?: number }>();
        for (const q of v.报价 ?? []) {
          if (!q.物料编号) continue;
          // 默认报价优先;无默认则取第一行
          if (q.是否默认 || !quoteOf.has(q.物料编号))
            quoteOf.set(q.物料编号, {
              编号: q.合作方编号 ?? undefined, 名称: q.合作方名称 ?? undefined,
              价: q.港币价 ?? q.单价 ?? undefined,
            });
          if (q.是否默认) break;
        }
        const rs = (v.物料 ?? [])
          .filter((l: StyleBomLine) => (l.物料编号 ?? "").trim() !== "")
          .map((l: StyleBomLine, i: number): Row => {
            const q = quoteOf.get(l.物料编号!);
            return {
              key: `${l.物料编号}-${i}`,
              物料编号: l.物料编号!,
              物料名称: l.物料名称, 物料类别: l.物料类别, 规格: l.规格, 颜色: l.颜色, 单位: l.单位,
              使用数量: l.使用数量,
              需求数量: Math.round((排期数量 * (l.使用数量 ?? 0)) * 100) / 100,
              单价: q?.价,
              供应商编号: q?.编号, 供应商名称: q?.名称,
            };
          });
        setRows(rs);
        setSelectedKeys(rs.map(r => r.key));
        if (rs.length === 0) setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ctx, 排期数量]);

  const patch = (key: string, p: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));

  const maskPrice = hidePrice(perms, PO_MENU);
  const canCreate = can(perms, PO_MENU, "保存");

  const columns = useMemo(() => [
    { title: "物料编号", dataIndex: "物料编号", width: 120, ellipsis: true },
    { title: "物料名称", dataIndex: "物料名称", width: 130, ellipsis: true },
    { title: "规格", dataIndex: "规格", width: 100, ellipsis: true },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "用量", dataIndex: "使用数量", width: 80, align: "right" as const },
    {
      title: `需求数量(排期${排期数量}×用量)`, dataIndex: "需求数量", width: 170, align: "right" as const,
      render: (v: number, r: Row) => (
        <InputNumber size="small" min={0} value={v} style={{ width: 130 }}
          onChange={n => patch(r.key, { 需求数量: n ?? 0 })} />
      ),
    },
    ...(maskPrice ? [] : [{
      title: "单价", dataIndex: "单价", width: 100, align: "right" as const,
      render: (v: number | undefined, r: Row) => (
        <InputNumber size="small" min={0} value={v} style={{ width: 90 }}
          onChange={n => patch(r.key, { 单价: n ?? undefined })} />
      ),
    }]),
    {
      title: "供应商", dataIndex: "供应商编号", width: 200,
      render: (_: unknown, r: Row) => (
        <Select
          size="small" style={{ width: 190 }} allowClear showSearch optionFilterProp="label"
          placeholder="选供应商(必选才能下单)"
          value={r.供应商编号 ? `${r.供应商编号}|${r.供应商名称 ?? ""}` : undefined}
          onChange={v => {
            if (!v) { patch(r.key, { 供应商编号: undefined, 供应商名称: undefined }); return; }
            const [编号, 名称] = (v as string).split("|");
            patch(r.key, { 供应商编号: 编号, 供应商名称: 名称 });
          }}
          options={suppliers.map(s => ({ value: `${s.编号}|${s.名称}`, label: `${s.编号} ${s.名称}` }))}
        />
      ),
    },
  ], [排期数量, maskPrice, suppliers]);

  const generate = () => {
    const selected = rows.filter(r => selectedKeys.includes(r.key));
    if (selected.length === 0) { message.warning("请先勾选要下单的物料行"); return; }
    const withSupplier = selected.filter(r => (r.供应商编号 ?? "").trim() !== "");
    const skipped = selected.length - withSupplier.length;
    if (withSupplier.length === 0) { message.warning("勾选的物料行均未选供应商,无法生成采购订单"); return; }

    // 按供应商分组,一供应商一张采购订单(采购订单单头只有单供应商)
    const groups = new Map<string, { 编号: string; 名称?: string; rows: Row[] }>();
    for (const r of withSupplier) {
      const key = r.供应商编号!.trim();
      let g = groups.get(key);
      if (!g) { g = { 编号: key, 名称: r.供应商名称, rows: [] }; groups.set(key, g); }
      g.rows.push(r);
    }

    Modal.confirm({
      title: "生成物料采购单",
      content: `将按供应商生成 ${groups.size} 张采购订单（共 ${withSupplier.length} 行物料${skipped > 0 ? `,另 ${skipped} 行未选供应商将跳过` : ""}）。确认生成？`,
      okText: "生成", cancelText: "取消",
      onOk: async () => {
        setSubmitting(true);
        try {
          const created: string[] = [];
          for (const g of groups.values()) {
            const res = await purchaseOrderApi.create({
              供应商编号: g.编号,
              供应商名称: g.名称,
              款号: ctx?.货号,
              备注: `排期下单:${ctx?.排期客户 ?? ""}${ctx?.PO号 ? ` PO=${ctx.PO号}` : ""} 货号=${ctx?.货号 ?? ""}`.trim(),
              明细: g.rows.map(r => ({
                物料编号: r.物料编号,
                物料名称: r.物料名称,
                物料类别: r.物料类别 ?? undefined,
                规格: r.规格 ?? undefined,
                颜色: r.颜色 ?? undefined,
                单位: r.单位,
                数量: r.需求数量,
                单价: r.单价,
                款号: ctx?.货号,
                备注: `排期用量=${r.使用数量 ?? 0}`,
              })),
            });
            created.push(res.单号);
          }
          message.success(`已生成 ${created.length} 张采购订单:${created.join("、")}（采购订单页可审核）`);
          onClose();
        } catch (e) {
          const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
          message.error(msg ?? "生成采购订单失败");
        } finally { setSubmitting(false); }
      },
    });
  };

  return (
    <Drawer
      open={open} onClose={onClose} width={980}
      title={ctx ? `货号 ${ctx.货号} 的物料清单（BOM）` : "物料清单"}
      extra={ctx && (
        <Space>
          <Tag style={{ borderRadius: 6 }}>{ctx.排期客户}</Tag>
          {ctx.PO号 && <Tag style={{ borderRadius: 6 }}>PO {ctx.PO号}</Tag>}
          <Tag color="blue" style={{ borderRadius: 6 }}>排期数量 {排期数量}</Tag>
        </Space>
      )}
    >
      {notFound ? (
        <Empty description={
          <span>该货号还没有建 BOM 物料清单<br />
            <span style={{ color: "#888", fontSize: 12 }}>请先到「工程部 → BOM物料设置」为款号 {ctx?.货号} 建 BOM,再回来下单</span>
          </span>} />
      ) : (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Table
            rowKey="key" size="small" loading={loading} dataSource={rows} columns={columns}
            pagination={false} scroll={{ x: "max-content", y: "calc(100vh - 260px)" }}
            rowSelection={{ selectedRowKeys: selectedKeys, onChange: k => setSelectedKeys(k as string[]) }}
          />
          <Space style={{ justifyContent: "flex-end", width: "100%" }}>
            <span style={{ color: "#888", fontSize: 12 }}>
              已勾 {selectedKeys.length}/{rows.length} 行;需求数量 = 排期数量 × BOM 用量,可改
            </span>
            {canCreate && (
              <Button type="primary" icon={<ShoppingCartOutlined />}
                loading={submitting} disabled={selectedKeys.length === 0}
                onClick={generate}>
                生成物料采购单
              </Button>
            )}
          </Space>
        </Space>
      )}
    </Drawer>
  );
}
