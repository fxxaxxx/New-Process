import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const EMP_MENU = "人事档案"; // 人员权限菜单名
const DEPT_MENU = "部门信息"; // 部门权限菜单名
const ALL = "__ALL__"; // 左侧"全部部门"选项 key
const departments = masterApi("departments");
const employees = masterApi("employees");

// 行数据：后端按 camelCase 序列化 id，这里统一归一化为 ID
type Row = Record<string, unknown> & { ID: number };
// 人员日期字段（DatePicker 编辑，保存时 format("YYYY-MM-DD")）
const DATE_FIELDS = ["出生日期", "入职日期", "离职日期"] as const;

export default function DepartmentPersonnelPage() {
  const perms = usePerms();
  const canOpen = can(perms, EMP_MENU, "打开");
  const canSave = can(perms, EMP_MENU, "保存");
  const canDelete = can(perms, EMP_MENU, "删除");
  const canDeptSave = can(perms, DEPT_MENU, "保存");
  const canDeptDelete = can(perms, DEPT_MENU, "删除");
  const priceHidden = hidePrice(perms, EMP_MENU);

  const [depts, setDepts] = useState<Row[]>([]);
  const [selDept, setSelDept] = useState<string>(ALL); // 左侧选中的部门编号（ALL=全部）
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  // 双击行选中，工具栏"编辑/删除"作用于选中行
  const [selRow, setSelRow] = useState<Row | null>(null);

  const [editing, setEditing] = useState<Row | null>(null); // null=不显示；ID=0 表示新增
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm] = Form.useForm();
  const [deptSaving, setDeptSaving] = useState(false);
  const [editingDept, setEditingDept] = useState<Row | null>(null); // null=新增；否则为编辑中的部门行

  const loadDepts = useCallback(async () => {
    try {
      const r = await departments.list(1, 500);
      setDepts((r.items as (Row & { id?: number })[]).map(x => ({ ...x, ID: x.ID ?? x.id ?? 0 })));
    } catch { /* 无部门权限等：左侧列表留空，人员区仍可用 */ }
  }, []);

  const loadRows = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      // 一次拉全量，部门过滤/关键字搜索均在前端做（部门名称也要前端 join）
      const r = await employees.list(1, 2000);
      setRows((r.items as (Row & { id?: number })[]).map(x => ({ ...x, ID: x.ID ?? x.id ?? 0 })));
      setSelRow(null);
    } catch { message.error("加载人员失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { if (canOpen) { void loadDepts(); void loadRows(); } }, [canOpen, loadDepts, loadRows]);

  // 部门编号 → 部门名称 映射（人员.部门编号 → 部门.部门）
  const deptNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of depts) {
      const code = String(d.编号 ?? "");
      if (code) m.set(code, String(d.部门 ?? ""));
    }
    return m;
  }, [depts]);

  // 每个部门的人数（左侧名称后括号展示、删除前引用检查均用本地数据）
  const countByDept = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const code = String(r.部门编号 ?? "");
      if (code) m.set(code, (m.get(code) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  // 右侧人员：按选中部门 + 关键字（编号/姓名/职称）前端过滤
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(r => {
      if (selDept !== ALL && String(r.部门编号 ?? "") !== selDept) return false;
      if (!kw) return true;
      return [r.编号, r.姓名, r.职称].some(v => String(v ?? "").toLowerCase().includes(kw));
    });
  }, [rows, selDept, keyword]);

  const openCreate = () => {
    setEditing({ ID: 0 });
    form.resetFields();
    // 新增默认：在职；部门默认带当前左侧选中部门
    form.setFieldsValue({ 在职: "在职", 部门编号: selDept === ALL ? undefined : selDept });
  };
  const openEdit = async (r: Row) => {
    try {
      const full = await employees.get(r.ID);
      // DatePicker 值需要 dayjs 对象
      for (const f of DATE_FIELDS) {
        const v = full[f];
        full[f] = v ? dayjs(String(v)) : null;
      }
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载人员详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    // dayjs → "YYYY-MM-DD"
    for (const f of DATE_FIELDS) {
      const d = v[f] as dayjs.Dayjs | null | undefined;
      v[f] = d ? d.format("YYYY-MM-DD") : null;
    }
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await employees.update(editing.ID, v);
      else await employees.create(v);
      message.success("已保存");
      setEditing(null);
      setSelRow(null);
      await loadDepts();
      await loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  const del = async (r: Row) => {
    try {
      await employees.remove(r.ID);
      message.success("已删除");
      setSelRow(null);
      await loadDepts();
      await loadRows();
    } catch { message.error("删除失败"); }
  };

  // 新增部门
  const openDeptCreate = () => { setEditingDept(null); deptForm.resetFields(); setDeptModalOpen(true); };
  // 双击部门行：打开编辑（编号不可改——人员按 部门编号 引用，改编号会让人员失联；要改编号请先转移人员）
  const openDeptEdit = async (d: Row) => {
    try {
      const full = await departments.get(d.ID);
      setEditingDept(d);
      deptForm.resetFields();
      deptForm.setFieldsValue(full);
      setDeptModalOpen(true);
    } catch { message.error("加载部门详情失败"); }
  };
  const submitDept = async () => {
    const v = await deptForm.validateFields();
    setDeptSaving(true);
    try {
      if (editingDept && editingDept.ID > 0) {
        await departments.update(editingDept.ID, { ...v, 编号: String(editingDept.编号 ?? "") });
        message.success("部门已保存");
      } else {
        await departments.create(v);
        message.success("部门已保存");
      }
      setDeptModalOpen(false);
      setEditingDept(null);
      await loadDepts();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "部门保存失败");
    }
    finally { setDeptSaving(false); }
  };

  // 删除部门：先在本地算引用人数，有人员时警告但仍允许删
  const delDept = async (d: Row) => {
    const code = String(d.编号 ?? "");
    const n = countByDept.get(code) ?? 0;
    if (n > 0) message.warning(`该部门下还有 ${n} 名人员`);
    try {
      await departments.remove(d.ID);
      message.success("部门已删除");
      if (selDept === code) setSelDept(ALL);
      await loadDepts();
      await loadRows();
    } catch { message.error("部门删除失败"); }
  };

  const dateCell = (v?: unknown) => (v ? String(v).slice(0, 10) : "");
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  // 旧系统固定列顺序：部门编号|部门名称|自动编号|编号|姓名|性别|职称|电话|手机|地址|身份证号|出生日期|入职日期|离职日期|基本工资|备注|在职
  const columns = [
    { title: "部门编号", dataIndex: "部门编号", width: 90 },
    { title: "部门名称", dataIndex: "部门编号", width: 100, render: (v?: unknown) => deptNameByCode.get(String(v ?? "")) ?? "" },
    { title: "自动编号", dataIndex: "自动编号", width: 90 },
    { title: "编号", dataIndex: "编号", width: 90 },
    { title: "姓名", dataIndex: "姓名", width: 90 },
    { title: "性别", dataIndex: "性别", width: 64 },
    { title: "职称", dataIndex: "职称", width: 100 },
    { title: "电话", dataIndex: "电话", width: 110 },
    { title: "手机", dataIndex: "手机", width: 110 },
    { title: "地址", dataIndex: "地址", width: 160 },
    { title: "身份证号", dataIndex: "身份证号", width: 160 },
    { title: "出生日期", dataIndex: "出生日期", width: 100, render: dateCell },
    { title: "入职日期", dataIndex: "入职日期", width: 100, render: dateCell },
    { title: "离职日期", dataIndex: "离职日期", width: 100, render: dateCell },
    { title: "基本工资", dataIndex: "基本工资", width: 90, align: "right" as const, render: money },
    { title: "备注", dataIndex: "备注", width: 140 },
    { title: "在职", dataIndex: "在职", width: 70 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"人事档案·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="部门人事" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      {/* 左：部门列表 */}
      <div style={{ width: 210, flex: "0 0 210px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        {canDeptSave && (
          <Button size="small" icon={<PlusOutlined />} style={{ marginBottom: 8 }} onClick={openDeptCreate}>
            新增部门
          </Button>
        )}
        {canDeptSave && (
          <div style={{ color: "#999", fontSize: 11, marginBottom: 6 }}>双击部门名称可编辑</div>
        )}
        <div
          onClick={() => setSelDept(ALL)}
          style={{
            padding: "5px 8px", cursor: "pointer", borderRadius: 4,
            background: selDept === ALL ? "#e6f4ff" : undefined,
          }}
        >
          全部部门（{rows.length}）
        </div>
        {depts.map(d => {
          const code = String(d.编号 ?? "");
          const name = String(d.部门 ?? "");
          return (
            <div
              key={d.ID}
              onClick={() => setSelDept(code)}
              onDoubleClick={() => { if (canDeptSave) void openDeptEdit(d); }}
              title={canDeptSave ? "双击编辑该部门" : undefined}
              style={{
                padding: "5px 8px", cursor: "pointer", borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: selDept === code ? "#e6f4ff" : undefined,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}（{countByDept.get(code) ?? 0}）
              </span>
              {canDeptDelete && (
                <Popconfirm title={`确认删除部门 ${name}?`} onConfirm={() => delDept(d)}>
                  <DeleteOutlined
                    style={{ color: "#ff4d4f", fontSize: 12, marginLeft: 8 }}
                    onClick={e => e.stopPropagation()}
                  />
                </Popconfirm>
              )}
            </div>
          );
        })}
      </div>

      {/* 右：人员网格 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            placeholder="编号/姓名/职称" allowClear style={{ width: 220 }}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onSearch={v => setKeyword(v)}
          />
          {canSave && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
          {canSave && (
            <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>
          )}
          {canDelete && (
            <Popconfirm
              title={`确认删除人员${selRow ? ` ${selRow.编号 ?? ""} ${selRow.姓名 ?? ""}` : ""}?`}
              onConfirm={() => selRow && del(selRow)}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中：${selRow.编号 ?? ""} ${selRow.姓名 ?? ""}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
        <Table
          size="small" rowKey="ID" loading={loading} dataSource={filtered} columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
          onRow={(r: Row) => ({
            onDoubleClick: () => setSelRow(r),
            style: { cursor: "pointer", ...(selRow?.ID === r.ID ? { background: "#e6f4ff" } : {}) },
          })}
          pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `共 ${t} 条` }}
        />
      </div>

      {/* 人员表单（新增/编辑） */}
      <Modal
        title={editing && editing.ID > 0 ? "编辑人员" : "新增人员"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose width={760}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="自动编号" label="自动编号"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="编号" label="编号" rules={[{ required: true, message: "请输入编号" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="姓名" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="性别" label="性别">
                <Select allowClear options={[{ value: "男" }, { value: "女" }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="部门编号" label="部门编号">
                <Select
                  allowClear showSearch optionFilterProp="label"
                  options={depts.map(d => ({
                    value: String(d.编号 ?? ""),
                    label: `${d.编号 ?? ""} ${d.部门 ?? ""}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="职称" label="职称"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="考勤卡号" label="考勤卡号"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="电话" label="电话"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="手机" label="手机"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="出生日期" label="出生日期"><DatePicker style={{ width: "100%" }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="入职日期" label="入职日期"><DatePicker style={{ width: "100%" }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="离职日期" label="离职日期"><DatePicker style={{ width: "100%" }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="工序类型" label="工序类型"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="默认班次" label="默认班次"><Input /></Form.Item>
            </Col>
            {!priceHidden && (
              <Col span={8}>
                <Form.Item name="基本工资" label="基本工资">
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="在职" label="在职">
                <Select options={[{ value: "在职" }, { value: "离职" }]} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="身份证号" label="身份证号"><Input /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="地址" label="地址"><Input /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 部门弹窗（新增/编辑；编辑时编号锁定） */}
      <Modal
        title={editingDept ? "编辑部门" : "新增部门"}
        open={deptModalOpen} onCancel={() => { setDeptModalOpen(false); setEditingDept(null); }} onOk={submitDept}
        confirmLoading={deptSaving} destroyOnClose width={420}
      >
        <Form form={deptForm} layout="vertical">
          <Form.Item name="编号" label="编号" rules={[{ required: true, message: "请输入编号" }]}>
            <Input disabled={!!editingDept} placeholder={editingDept ? "编号被人员引用,不可修改" : undefined} />
          </Form.Item>
          <Form.Item name="部门" label="部门" rules={[{ required: true, message: "请输入部门名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
