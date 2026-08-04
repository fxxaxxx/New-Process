import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Col, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm,
  Row, Select, Space, Table, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { absenceApi, type AbsenceCreate, type AbsenceRow } from "../../api/payroll";
import { toYearMonth } from "../../utils/payroll";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "缺勤登记";
const 类型选项 = ["事假", "病假", "年假", "旷工", "其他"];
const 前后段选项 = ["全天", "上午", "下午"];

export default function AbsencePage() {
  const perms = usePerms();
  const [month, setMonth] = useState<Dayjs | null>(dayjs());
  const [工号, set工号] = useState("");
  const [rows, setRows] = useState<AbsenceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const 月份 = toYearMonth(month);

  const load = useCallback(async () => {
    try {
      const r = await absenceApi.list(月份 || undefined, 工号 || undefined, undefined, page, 20);
      setRows(r.data.items); setTotal(r.data.total);
    } catch { message.error("加载缺勤登记失败"); }
  }, [月份, 工号, page]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "工号", dataIndex: "工号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "部门", dataIndex: "部门" },
    { title: "登记类型", dataIndex: "登记类型" },
    { title: "前后段", dataIndex: "前后段" },
    { title: "计算出勤", dataIndex: "计算出勤" },
    { title: "日期", dataIndex: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "事由", dataIndex: "事由" },
    ...(can(perms, MENU, "删除") ? [{
      title: "操作", key: "_op",
      render: (_: unknown, row: AbsenceRow) => (
        <Popconfirm title="确认删除该缺勤记录?" onConfirm={() => act(() => absenceApi.remove(row.id!), "已删除")}>
          <a>删除</a>
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <Card title="缺勤登记" variant="borderless"
      extra={
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={(d) => { setPage(1); setMonth(d); }} />
          <Input placeholder="工号(空=全部)" allowClear value={工号}
            onChange={(e) => { setPage(1); set工号(e.target.value); }} style={{ width: 160 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建</Button>
          )}
        </Space>
      }>
      <Table rowKey={(r, i) => `${r.id ?? ""}|${i}`} size="middle"
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: (t) => `共 ${t} 条` }} />
      <CreateDrawer open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </Card>
  );
}

function CreateDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form] = Form.useForm<{
    工号: string; 姓名?: string; 部门?: string; 登记类型?: string; 前后段?: string;
    计算出勤: number; 日期: Dayjs; 事由?: string;
  }>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ 前后段: "全天", 计算出勤: 1, 日期: dayjs(), 登记类型: "事假" });
  }, [open, form]);

  const submit = async () => {
    let v: { 工号: string; 姓名?: string; 部门?: string; 登记类型?: string; 前后段?: string; 计算出勤: number; 日期: Dayjs; 事由?: string };
    try { v = await form.validateFields(); } catch { return; }
    const body: AbsenceCreate = {
      工号: v.工号, 姓名: v.姓名, 部门: v.部门, 登记类型: v.登记类型, 前后段: v.前后段,
      计算出勤: v.计算出勤, 日期: v.日期.format("YYYY-MM-DD"), 事由: v.事由,
    };
    setSaving(true);
    try {
      await absenceApi.create(body);
      message.success("缺勤记录已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建缺勤记录失败");
    } finally { setSaving(false); }
  };

  return (
    <Drawer title="新建缺勤登记" width={560} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="工号" label="工号" rules={[{ required: true, message: "请输入工号" }]}>
              <Input placeholder="工号" />
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="姓名" label="姓名"><Input placeholder="可选" /></Form.Item></Col>
          <Col span={12}><Form.Item name="部门" label="部门"><Input placeholder="可选" /></Form.Item></Col>
          <Col span={12}>
            <Form.Item name="登记类型" label="登记类型">
              <Select options={类型选项.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="日期" label="日期" rules={[{ required: true, message: "请选择日期" }]}>
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="计算出勤" label="计算出勤(缺勤折算天数)" rules={[{ required: true }]}>
              <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="前后段" label="前后段">
              <Select options={前后段选项.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          <Col span={24}><Form.Item name="事由" label="事由"><Input placeholder="可选" /></Form.Item></Col>
        </Row>
      </Form>
    </Drawer>
  );
}
