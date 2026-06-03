import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import ProductionCreateDrawer from "./ProductionCreateDrawer";
import ProductionDetailDrawer from "./ProductionDetailDrawer";

const MENU = "生产制单";

export default function ProductionPage() {
  const perms = usePerms();
  const [rows, setRows] = useState<ProductionHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await productionApi.list(page, 10, keyword);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载生产制单列表失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "操作失败");
    }
  };

  const columns = [
    { title: "生产单号", dataIndex: "生产单号", key: "生产单号",
      render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "款号", dataIndex: "款号", key: "款号",
      render: (v?: string) => v ? <span className="erp-num">{v}</span> : null },
    { title: "款式", dataIndex: "款式", key: "款式" },
    { title: "客户", dataIndex: "客户名称", key: "客户名称" },
    { title: "加工厂", dataIndex: "加工厂名称", key: "加工厂名称" },
    { title: "计划数量", dataIndex: "计划数量", key: "计划数量" },
    { title: "物料金额", dataIndex: "物料金额", key: "物料金额",
      render: (v?: number | null) => (v == null ? "***" : v) },
    { title: "交货日期", dataIndex: "交货日期", key: "交货日期", render: (v?: string) => v?.slice(0, 10) },
    {
      title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1"
        ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag>
        : <Tag style={{ borderRadius: 6 }}>未审核</Tag>,
    },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: ProductionHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && (
            <a onClick={() => act(() => productionApi.approve(row.生产单号!), "已审核")}>审核</a>
          )}
          {row.审核 === "1" && can(perms, MENU, "反审核") && (
            <a onClick={() => act(() => productionApi.unapprove(row.生产单号!), "已反审核")}>反审核</a>
          )}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该制单?" onConfirm={() => act(() => productionApi.remove(row.生产单号!), "已删除")}>
              <a>删除</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="生产制单" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/款号/客户" allowClear
            onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 240 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建制单</Button>
          )}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <ProductionCreateDrawer open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <ProductionDetailDrawer 生产单号={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
