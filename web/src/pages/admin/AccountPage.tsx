import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Checkbox, Collapse, Drawer, Form, Input, Modal, Popconfirm, Space, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  accountApi, userPermApi, type AccountRow, type MenuPermRow,
} from "../../api/admin";
import { PERM_BITS, groupByCategory } from "../../utils/adminPerms";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "账号管理";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function AccountPage() {
  const perms = usePerms();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [regOpen, setRegOpen] = useState(false);
  const [regUser, setRegUser] = useState("");
  const [regPwd, setRegPwd] = useState("");

  const [pwdUser, setPwdUser] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const [permUser, setPermUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await accountApi.list(keyword)); }
    catch (e) { message.error(errMsg(e, "加载账号失败")); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const register = async () => {
    if (!regUser.trim()) { message.error("请输入用户名"); return; }
    if (!regPwd.trim()) { message.error("请输入初始密码"); return; }
    try {
      await accountApi.register({ 用户名: regUser.trim(), 初始密码: regPwd });
      message.success("已注册"); setRegOpen(false); setRegUser(""); setRegPwd(""); load();
    } catch (e) { message.error(errMsg(e, "注册失败")); }
  };

  const resetPassword = async () => {
    if (!pwdUser) return;
    if (!newPwd.trim()) { message.error("请输入新密码"); return; }
    try {
      await accountApi.resetPassword(pwdUser, { 新密码: newPwd });
      message.success("已重置密码"); setPwdUser(null); setNewPwd("");
    } catch (e) { message.error(errMsg(e, "重置失败")); }
  };

  const toggleLock = async (row: AccountRow) => {
    try {
      if (row.已锁定) { await accountApi.unlock(row.用户!); message.success("已启用"); }
      else { await accountApi.lock(row.用户!); message.success("已停用"); }
      load();
    } catch (e) { message.error(errMsg(e, "操作失败")); }
  };

  const remove = async (用户: string) => {
    try { await accountApi.remove(用户); message.success("已删除"); load(); }
    catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const columns = [
    { title: "用户", dataIndex: "用户", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "登录状态", dataIndex: "登录状态", width: 120 },
    { title: "上次登录", dataIndex: "上次登录", width: 180 },
    {
      title: "已锁定", dataIndex: "已锁定", width: 100,
      render: (v: boolean) => v ? <Tag color="red">已锁定</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: "操作", key: "_op", width: 280,
      render: (_: unknown, row: AccountRow) => (
        <Space wrap>
          {can(perms, MENU, "保存") && (
            <a onClick={() => { setPwdUser(row.用户!); setNewPwd(""); }}>重置密码</a>
          )}
          {can(perms, MENU, "功能") && (
            <Popconfirm title={row.已锁定 ? "确认启用该账号?" : "确认停用该账号?"} onConfirm={() => toggleLock(row)}>
              <a>{row.已锁定 ? "启用" : "停用"}</a>
            </Popconfirm>
          )}
          {can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该账号?" onConfirm={() => remove(row.用户!)}>
              <a>删除</a>
            </Popconfirm>
          )}
          <a onClick={() => setPermUser(row.用户!)}>权限</a>
        </Space>
      ),
    },
  ];

  return (
    <Card title="账号管理" variant="borderless"
      extra={
        <Space wrap>
          <Input.Search placeholder="用户名(空=全部)" allowClear value={keyword}
            onChange={(e) => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setRegOpen(true)}>注册</Button>
          )}
        </Space>
      }>
      <Table rowKey={(r) => r.用户 ?? ""} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />

      <Modal title="注册账号" open={regOpen} onOk={register} onCancel={() => setRegOpen(false)} destroyOnClose>
        <Form layout="vertical">
          <Form.Item label="用户名" required>
            <Input value={regUser} placeholder="用户名" onChange={(e) => setRegUser(e.target.value)} />
          </Form.Item>
          <Form.Item label="初始密码" required>
            <Input.Password value={regPwd} placeholder="初始密码" onChange={(e) => setRegPwd(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`重置密码 - ${pwdUser ?? ""}`} open={!!pwdUser} onOk={resetPassword}
        onCancel={() => setPwdUser(null)} destroyOnClose>
        <Form layout="vertical">
          <Form.Item label="新密码" required>
            <Input.Password value={newPwd} placeholder="新密码" onChange={(e) => setNewPwd(e.target.value)} />
          </Form.Item>
        </Form>
      </Modal>

      <PermDrawer 用户={permUser} onClose={() => setPermUser(null)} canSave={can(perms, MENU, "保存")} />
    </Card>
  );
}

function PermDrawer({ 用户, onClose, canSave }: {
  用户: string | null; onClose: () => void; canSave: boolean;
}) {
  const [rows, setRows] = useState<MenuPermRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!用户) { setRows([]); return; }
    setLoading(true);
    userPermApi.get(用户)
      .then(setRows)
      .catch((e) => message.error(errMsg(e, "加载权限失败")))
      .finally(() => setLoading(false));
  }, [用户]);

  const setBit = (菜单: string, bit: typeof PERM_BITS[number], v: boolean) =>
    setRows((prev) => prev.map((r) => (r.菜单 === 菜单 ? { ...r, [bit]: v } : r)));

  const setRowAll = (菜单: string, v: boolean) =>
    setRows((prev) => prev.map((r) => {
      if (r.菜单 !== 菜单) return r;
      const next = { ...r };
      for (const b of PERM_BITS) next[b] = v;
      return next;
    }));

  const save = async () => {
    if (!用户) return;
    setSaving(true);
    try {
      await userPermApi.save(用户, { 用户名: 用户, 明细: rows });
      message.success("已保存"); onClose();
    } catch (e) { message.error(errMsg(e, "保存失败")); }
    finally { setSaving(false); }
  };

  const groups = groupByCategory(rows);
  const collapseItems = groups.map((g) => ({
    key: g.组 || "(未分组)",
    label: `${g.组 || "(未分组)"} · ${g.菜单行.length} 项`,
    children: (
      <Table size="small" rowKey={(r) => r.菜单} pagination={false} dataSource={g.菜单行}
        columns={[
          { title: "菜单", dataIndex: "菜单", width: 160, fixed: "left" as const },
          ...PERM_BITS.map((b) => ({
            title: b, dataIndex: b, width: 64, align: "center" as const,
            render: (_: unknown, r: MenuPermRow) => (
              <Checkbox checked={!!r[b]} onChange={(e) => setBit(r.菜单, b, e.target.checked)} />
            ),
          })),
          {
            title: "全选行", key: "_all", width: 80, align: "center" as const,
            render: (_: unknown, r: MenuPermRow) => {
              const allOn = PERM_BITS.every((b) => r[b]);
              return <Checkbox checked={allOn} onChange={(e) => setRowAll(r.菜单, e.target.checked)} />;
            },
          },
        ]}
        scroll={{ x: "max-content", y: 380 }} />
    ),
  }));

  return (
    <Drawer title={`权限设置 - ${用户 ?? ""}`} width={720} open={!!用户} onClose={onClose}
      extra={canSave && <Button type="primary" loading={saving} onClick={save}>保存</Button>}>
      {loading ? null : (
        <Collapse items={collapseItems} defaultActiveKey={groups.map((g) => g.组 || "(未分组)")} />
      )}
    </Drawer>
  );
}
