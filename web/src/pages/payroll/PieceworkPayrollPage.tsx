import { useCallback, useEffect, useState } from "react";
import { Card, DatePicker, Input, Table, Space, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { pieceworkPayrollApi, type PieceworkPayrollRow } from "../../api/payroll";
import { toYearMonth } from "../../utils/payroll";

export default function PieceworkPayrollPage() {
  const [month, setMonth] = useState<Dayjs | null>(dayjs());
  const [部门编号, set部门编号] = useState("");
  const [rows, setRows] = useState<PieceworkPayrollRow[]>([]);

  const 月份 = toYearMonth(month);

  const load = useCallback(async () => {
    if (!月份) { setRows([]); return; }
    try { setRows(await pieceworkPayrollApi.monthly(月份, 部门编号 || undefined)); }
    catch { message.error("加载计件归集失败"); }
  }, [月份, 部门编号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "编号", dataIndex: "编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "部门编号", dataIndex: "部门编号" },
    { title: "部门", dataIndex: "部门" },
    { title: "数量", dataIndex: "数量" },
    { title: "计件工资", dataIndex: "计件工资", render: (v: number | null) => (v == null ? "—" : v) },
  ];

  return (
    <Card title="计件归集" variant="borderless"
      extra={
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
          <Input placeholder="部门编号(空=全部)" allowClear value={部门编号}
            onChange={(e) => set部门编号(e.target.value)} style={{ width: 160 }} />
        </Space>
      }>
      <Table rowKey={(r, i) => `${r.编号 ?? ""}|${r.部门编号 ?? ""}|${i}`} size="middle"
        dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
    </Card>
  );
}
