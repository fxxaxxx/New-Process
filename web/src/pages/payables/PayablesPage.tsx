import { useCallback, useEffect, useState } from "react";
import { Card, Input, Select, Space, Table, message } from "antd";
import { payablesApi, type PayableFactoryRow, type PayableSupplierRow } from "../../api/payables";

type Kind = "供应商" | "加工厂";

export default function PayablesPage() {
  const [kind, setKind] = useState<Kind>("供应商");
  const [编号, set编号] = useState("");
  const [rows, setRows] = useState<(PayableSupplierRow | PayableFactoryRow)[]>([]);

  const load = useCallback(async () => {
    try {
      if (kind === "供应商") setRows(await payablesApi.supplier(编号 || undefined));
      else setRows(await payablesApi.factory(编号 || undefined));
    } catch { message.error("加载应付对账失败"); }
  }, [kind, 编号]);
  useEffect(() => { load(); }, [load]);

  const 余额 = {
    title: "应付余额", dataIndex: "应付余额",
    render: (v: number) => <span style={{ fontWeight: v > 0 ? 700 : 600, color: v > 0 ? "#cf1322" : undefined }}>{v}</span>,
  };
  const columns = kind === "供应商"
    ? [
        { title: "供应商编号", dataIndex: "供应商编号", render: (v: string) => <span className="erp-num">{v}</span> },
        { title: "供应商名称", dataIndex: "供应商名称" },
        { title: "入仓金额", dataIndex: "入仓金额" },
        { title: "付款金额", dataIndex: "付款金额" },
        余额,
      ]
    : [
        { title: "加工厂编号", dataIndex: "加工厂编号", render: (v: string) => <span className="erp-num">{v}</span> },
        { title: "加工厂名称", dataIndex: "加工厂名称" },
        { title: "回收金额", dataIndex: "回收金额" },
        { title: "付款金额", dataIndex: "付款金额" },
        余额,
      ];

  return (
    <Card title="应付对账" variant="borderless"
      extra={
        <Space>
          <Select value={kind} onChange={(v) => { set编号(""); setKind(v as Kind); }} style={{ width: 120 }}
            options={[{ value: "供应商", label: "供应商" }, { value: "加工厂", label: "加工厂" }]} />
          <Input.Search placeholder={`${kind}编号(留空查全部)`} allowClear onSearch={set编号} style={{ width: 220 }} />
        </Space>
      }>
      <Table rowKey={(r) => { const x = r as unknown as Record<string, unknown>; return String(x.供应商编号 ?? x.加工厂编号 ?? x.供应商名称 ?? x.加工厂名称); }}
        size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
