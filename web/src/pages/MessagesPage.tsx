import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Space, Switch, Table, Tag, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { MSG_REFRESH_EVENT, messagesApi, type MessageRow } from "../api/messages";
import { materialDocApi, type MaterialDocDetail } from "../api/materialDocs";
import MaterialDocDetailDrawer from "./materials/MaterialDocDetailDrawer";
import { MATERIAL_DOC_CONFIGS } from "./materials/materialDocConfigs";

// 消息目前都是「领料审批」,单号即领料单号
const ISSUE_CFG = MATERIAL_DOC_CONFIGS["material-issues"];
const issueApi = materialDocApi("material-issues");

const refreshBell = () => window.dispatchEvent(new Event(MSG_REFRESH_EVENT));

export default function MessagesPage() {
  const [rows, setRows] = useState<MessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(false);

  const [view单号, setView单号] = useState<string | null>(null);
  const [docDetail, setDocDetail] = useState<MaterialDocDetail | null>(null);
  const [approving, setApproving] = useState(false);

  const load = useCallback(async (p = page, s = size, u = onlyUnread) => {
    setLoading(true);
    try {
      const d = await messagesApi.list(p, s, u);
      setRows(d.items); setTotal(d.total);
    } catch { message.error("加载消息失败"); }
    finally { setLoading(false); }
  }, [page, size, onlyUnread]);

  useEffect(() => { load(1, size, onlyUnread); setPage(1); }, [onlyUnread]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 查看：标记已读 -> 拉领料单详情 -> 弹抽屉;刷新列表与铃铛
  const view = async (r: MessageRow) => {
    try {
      if (r.已读 !== "1") await messagesApi.markRead(r.ID);
      if (r.单号) {
        const d = await issueApi.get(r.单号);
        setDocDetail(d);
        setView单号(r.单号);
      }
      load();
      refreshBell();
    } catch { message.error("打开消息失败"); }
  };

  const h = docDetail?.单头;
  const needSupervisor = !!h && h.主管审核 !== "1" && h.审核 !== "1";
  const needManager = !!h && h.主管审核 === "1" && h.经理审核 !== "1";

  const approve = async (kind: "supervisor" | "manager") => {
    if (!view单号) return;
    setApproving(true);
    try {
      if (kind === "supervisor") await issueApi.supervisorApprove(view单号);
      else await issueApi.managerApprove(view单号);
      message.success(kind === "supervisor" ? "主管审核成功" : "经理审核成功");
      setDocDetail(await issueApi.get(view单号));
      load();
      refreshBell();
    } catch { message.error("审核失败"); }
    finally { setApproving(false); }
  };

  const drawerFooter = docDetail && (needSupervisor || needManager) ? (
    <Space>
      {needSupervisor && (
        <Button type="primary" loading={approving} onClick={() => approve("supervisor")}>主管审核</Button>
      )}
      {needManager && (
        <Button type="primary" loading={approving} onClick={() => approve("manager")}>经理审核</Button>
      )}
    </Space>
  ) : undefined;

  return (
    <Card
      title="消息中心"
      extra={
        <Space>
          <span>只看未读</span>
          <Switch checked={onlyUnread} onChange={setOnlyUnread} />
          <Button icon={<ReloadOutlined />} onClick={() => { load(); refreshBell(); }}>刷新</Button>
        </Space>
      }
    >
      <Table<MessageRow>
        size="small"
        rowKey="ID"
        loading={loading}
        dataSource={rows}
        pagination={{
          current: page, pageSize: size, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setSize(s); load(p, s); },
        }}
        columns={[
          {
            title: "状态", dataIndex: "已读", width: 80,
            render: (v: string | undefined) =>
              v === "1" ? <Tag>已读</Tag> : <Badge status="error" text={<b>未读</b>} />,
          },
          {
            title: "标题", dataIndex: "标题",
            render: (v: string | undefined, r) =>
              r.已读 === "1" ? v : <b>{v}</b>,
          },
          { title: "内容", dataIndex: "内容", ellipsis: true },
          {
            title: "时间", dataIndex: "创建时间", width: 170,
            render: (v: string | undefined) => v?.slice(0, 19).replace("T", " ") ?? "-",
          },
          {
            title: "操作", key: "_op", width: 90,
            render: (_, r) => <Button size="small" type="link" onClick={() => view(r)}>查看</Button>,
          },
        ]}
      />
      <MaterialDocDetailDrawer
        cfg={ISSUE_CFG}
        单号={view单号}
        onClose={() => { setView单号(null); setDocDetail(null); }}
        footer={drawerFooter}
      />
    </Card>
  );
}
