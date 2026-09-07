import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Modal, Space, Table, Tabs, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { plasticProcessOrderMakeApi, type PlasticProcessOrderMakeRow, type SprayOrderReceivedRow } from "../../api/plasticProcessOrderMake";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";
import { useAutoReload } from "../../hooks/useAutoReload";

const MENU = "塑胶加工订单制作";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticProcessOrderMakePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticProcessOrderMakeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticProcessOrderMakeApi.list({
        起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD"),
        keyword: keyword || undefined,
      }));
    } catch { if (!silent) message.error("加载塑胶加工订单制作失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns: ColumnsType<PlasticProcessOrderMakeRow> = [
    { title: "单据日期", dataIndex: "单据日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 110 },
    { title: "工模编号", dataIndex: "工模编号", width: 100 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "色粉号", dataIndex: "色粉号", width: 100 },
    { title: "加工内容", dataIndex: "加工内容", width: 120 },
    { title: "二次加工类别", dataIndex: "二次加工类别", width: 100, render: (v?: string) => v ?? "" },
    {
      title: "加工次序", dataIndex: "加工次序", width: 90, render: (v?: string) => v ?? "",
      filters: [{ text: "第一次", value: "第一次" }, { text: "第二次", value: "第二次" }],
      onFilter: (v, r) => (r.加工次序 ?? "") === v,
    },
    { title: "加工字母", dataIndex: "加工字母", width: 80, render: (v?: string) => v ?? "" },
    { title: "用料名称", dataIndex: "用料名称", width: 120 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "用量", dataIndex: "用量", width: 90, align: "right" as const },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
    { title: "订购数量", dataIndex: "订购数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "加工单价", dataIndex: "加工单价", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: (v?: number | null) => (v == null ? "" : Number(v).toFixed(2)) },
    ]),
  ];

  const exportCols: ExportCol[] = [
    { title: "单据日期", key: "单据日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" }, { title: "塑胶货号", key: "塑胶货号" },
    { title: "工模编号", key: "工模编号" }, { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" },
    { title: "颜色", key: "颜色" }, { title: "色粉号", key: "色粉号" }, { title: "加工内容", key: "加工内容" },
    { title: "二次加工类别", key: "二次加工类别" }, { title: "加工次序", key: "加工次序" }, { title: "加工字母", key: "加工字母" },
    { title: "用料名称", key: "用料名称" }, { title: "单位", key: "单位" },
    { title: "用量", key: "用量" }, { title: "计划数量", key: "计划数量" }, { title: "订购数量", key: "订购数量" },
    ...(priceHidden ? [] : [{ title: "加工单价", key: "加工单价" }, { title: "金额", key: "金额" }]),
  ];
  const asRecords = () => demandRows as unknown as Record<string, unknown>[];

  // 「已下喷油订单」页签：已审核塑胶采购订单中供应商含「喷油」的单(塑胶仓下给喷油部的单这里收)
  const [recvRows, setRecvRows] = useState<SprayOrderReceivedRow[]>([]);
  const [recvLoading, setRecvLoading] = useState(false);
  const loadRecv = useCallback(async (silent = false) => {
    if (!canOpen) return;
    setRecvLoading(true);
    try {
      setRecvRows(await plasticProcessOrderMakeApi.received({
        起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD"),
        keyword: keyword || undefined,
      }));
    } catch { if (!silent) message.error("加载已下喷油订单失败"); }
    finally { setRecvLoading(false); }
  }, [canOpen, range, keyword]);
  useEffect(() => { loadRecv(); }, [loadRecv]);
  // 自动刷新:切回本页/回到浏览器标签/每30秒,静默重拉两个列表(新下/新审核的喷油单自动出现)
  useAutoReload(() => { void load(true); void loadRecv(true); });

  // 按采购单号分组(接收状态/操作列跨行合并到每组首行)
  const recvGroups = useMemo(() => {
    const m = new Map<string, { count: number; first: number }>();
    recvRows.forEach((r, i) => {
      const k = r.采购单号 ?? "";
      const g = m.get(k);
      if (g) g.count++; else m.set(k, { count: 1, first: i });
    });
    return m;
  }, [recvRows]);
  const groupCell = (r: SprayOrderReceivedRow, i?: number) => {
    const g = recvGroups.get(r.采购单号 ?? "");
    return { rowSpan: g && g.first === i ? g.count : 0 };
  };

  // 「接收订单」弹窗:塑胶仓已审核的喷油采购单按单聚合;未接收的可「接收并带入」
  const [recvOpen, setRecvOpen] = useState(false);
  const spoGroups = useMemo(() => {
    const m = new Map<string, {
      单号: string; 供应商名称?: string; 单据日期?: string; 交货日期?: string;
      行数: number; 数量合计: number; 接收?: string; 接收人?: string; 接收时间?: string;
    }>();
    for (const r of recvRows) {
      const k = r.采购单号 ?? "";
      const g = m.get(k) ?? {
        单号: k, 供应商名称: r.供应商名称, 单据日期: r.单据日期, 交货日期: r.交货日期,
        行数: 0, 数量合计: 0, 接收: r.喷油接收, 接收人: r.喷油接收人, 接收时间: r.喷油接收时间,
      };
      g.行数++; g.数量合计 += Number(r.数量 ?? 0);
      m.set(k, g);
    }
    return [...m.values()];
  }, [recvRows]);

  // 接收(未接收时)并把该单带入上方制作表
  const receiveAndBring = async (g: { 单号: string; 接收?: string }) => {
    if (g.接收 !== "1") {
      try { await plasticProcessOrderMakeApi.receive(g.单号); message.success(`已接收 ${g.单号}`); }
      catch (e) {
        message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "接收失败");
        return;
      }
    }
    setSpo(g.单号); setRecvOpen(false); loadRecv();
  };

  const recvColumns: ColumnsType<SprayOrderReceivedRow> = [
    { title: "采购单号", dataIndex: "采购单号", width: 150, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "单据日期", dataIndex: "单据日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "交货日期", dataIndex: "交货日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "供应商", dataIndex: "供应商名称", width: 130 },
    { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 130 },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "模具编号", dataIndex: "模具编号", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 100 },
    { title: "色粉号", dataIndex: "色粉号", width: 90 },
    { title: "用料名称", dataIndex: "用料名称", width: 120 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    { title: "加工内容", dataIndex: "加工内容", width: 90 },
    { title: "备注", dataIndex: "备注", width: 140 },
    {
      title: "接收状态", key: "_recv", width: 170, onCell: groupCell,
      render: (_: unknown, r: SprayOrderReceivedRow, i: number) => {
        const g = recvGroups.get(r.采购单号 ?? "");
        if (!g || g.first !== i) return null;
        return r.喷油接收 === "1"
          ? <Tag color="green">已接收 {r.喷油接收人 ?? ""} {r.喷油接收时间?.slice(0, 16).replace("T", " ") ?? ""}</Tag>
          : <Tag color="orange">待接收</Tag>;
      },
    },
  ];

  // 上方制作表支持带入已接收的喷油采购单：带入后展示该单明细(订购数量=订单数量)，清除回到 BOM 需求视图
  const [spo, setSpo] = useState<string | null>(null);
  const demandRows = useMemo<PlasticProcessOrderMakeRow[]>(() => {
    if (!spo) return rows;
    return recvRows.filter(r => r.采购单号 === spo).map(r => ({
      单据日期: r.单据日期, 生产单号: r.生产单号, 款号: r.款号, 塑胶货号: r.塑胶货号,
      工模编号: r.模具编号, 物料编号: r.物料编号, 物料名称: r.物料名称,
      颜色: r.颜色, 色粉号: r.色粉号, 加工内容: r.加工内容, 用料名称: r.用料名称, 单位: "PCS",
      订购数量: r.数量 ?? null,
    }));
  }, [spo, recvRows, rows]);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶加工订单制作·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶加工订单制作" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="生产单号/款号/物料" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={() => load()} style={{ width: 240 }} />
        <Button type="primary" onClick={() => setRecvOpen(true)}>接收订单</Button>
        {spo && <Tag closable color="blue" onClose={e => { e.preventDefault(); setSpo(null); }}>已带入 {spo}</Tag>}
        <Button onClick={() => downloadCsv("塑胶加工订单制作.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶加工订单制作", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {demandRows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={demandRows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />

      <Tabs style={{ marginTop: 16 }} items={[
        { key: "received", label: `已下喷油订单(${recvRows.length})`, children: (
          <Table rowKey={(_, i) => String(i)} size="small" loading={recvLoading} dataSource={recvRows} columns={recvColumns}
            scroll={{ x: "max-content", y: 320 }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
        ) },
      ]} />

      <Modal title="接收订单（塑胶仓已审核的喷油采购单）" open={recvOpen} onCancel={() => setRecvOpen(false)} footer={null} width={860}>
        <Table rowKey="单号" size="small" loading={recvLoading} dataSource={spoGroups} pagination={false}
          scroll={{ y: 420 }}
          columns={[
            { title: "采购单号", dataIndex: "单号", width: 160, render: (v: string) => <span className="erp-num">{v}</span> },
            { title: "供应商", dataIndex: "供应商名称", width: 140 },
            { title: "单据日期", dataIndex: "单据日期", width: 105, render: (v?: string) => v?.slice(0, 10) },
            { title: "交货日期", dataIndex: "交货日期", width: 105, render: (v?: string) => v?.slice(0, 10) },
            { title: "行数", dataIndex: "行数", width: 70, align: "right" as const },
            { title: "数量合计", dataIndex: "数量合计", width: 100, align: "right" as const },
            {
              title: "状态", key: "_st", width: 170,
              render: (_: unknown, g) => g.接收 === "1"
                ? <Tag color="green">已接收 {g.接收人 ?? ""}</Tag>
                : <Tag color="orange">待接收</Tag>,
            },
            {
              title: "操作", key: "_op", width: 110,
              render: (_: unknown, g) => (
                <a onClick={() => receiveAndBring(g)}>{g.接收 === "1" ? "带入" : "接收并带入"}</a>
              ),
            },
          ]} />
        <div style={{ marginTop: 8, color: "#888" }}>接收=喷油部确认收到该订单；带入=把该单明细显示到上方制作表</div>
      </Modal>
    </Card>
  );
}
