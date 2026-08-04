import { useCallback, useEffect, useState } from "react";
import { Card, DatePicker, Input, InputNumber, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { attendanceApi, type AttendanceMonthlyRow } from "../../api/payroll";
import { toYearMonth } from "../../utils/payroll";

export default function AttendancePage() {
  const [month, setMonth] = useState<Dayjs | null>(dayjs());
  const [应出勤天数, set应出勤天数] = useState<number>(26);
  const [部门编号, set部门编号] = useState("");
  const [rows, setRows] = useState<AttendanceMonthlyRow[]>([]);

  const 月份 = toYearMonth(month);

  const load = useCallback(async () => {
    if (!月份 || !应出勤天数) { setRows([]); return; }
    try { setRows(await attendanceApi.monthly(月份, 应出勤天数, 部门编号 || undefined)); }
    catch { message.error("加载出勤汇总失败"); }
  }, [月份, 应出勤天数, 部门编号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "工号", dataIndex: "工号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "部门", dataIndex: "部门" },
    { title: "应出勤天数", dataIndex: "应出勤天数" },
    { title: "缺勤天数", dataIndex: "缺勤天数" },
    {
      title: "实出勤天数", dataIndex: "实出勤天数",
      render: (v: number, r: AttendanceMonthlyRow) =>
        v < r.应出勤天数 ? <span style={{ color: "#fa8c16", fontWeight: 700 }}>{v}</span> : v,
    },
    { title: "出勤工时", dataIndex: "出勤工时" },
    { title: "加班工时", dataIndex: "加班工时" },
    { title: "迟到次数", dataIndex: "迟到次数" },
    { title: "早退次数", dataIndex: "早退次数" },
  ];

  return (
    <Card title="出勤汇总" variant="borderless"
      extra={
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
          <InputNumber min={1} value={应出勤天数} onChange={(n) => set应出勤天数(Number(n ?? 0))}
            addonBefore="应出勤天数" style={{ width: 200 }} />
          <Input placeholder="部门编号(空=全部)" allowClear value={部门编号}
            onChange={(e) => set部门编号(e.target.value)} style={{ width: 160 }} />
        </Space>
      }>
      <Table rowKey={(r, i) => `${r.工号 ?? ""}|${r.部门编号 ?? ""}|${i}`} size="middle"
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
    </Card>
  );
}
