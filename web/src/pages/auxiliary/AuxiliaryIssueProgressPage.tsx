import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined,
  ExportOutlined,
  FileDoneOutlined,
  PrinterOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { auxiliaryIssueProgressApi } from "../../api/auxiliaryIssueProgress";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryIssueProgressQuery,
  getAuxiliaryIssueProgressTextColor,
  normalizeAuxiliaryIssueProgressRow,
  type AuxiliaryIssueArrivalStatus,
  type AuxiliaryIssueProgressDateMode,
  type AuxiliaryIssueProgressRow,
} from "../../utils/auxiliaryIssueProgress";

const MENU = "领料单";
const d = (value: Dayjs) => value.format("YYYY-MM-DD");

export default function AuxiliaryIssueProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState<AuxiliaryIssueArrivalStatus>("未到");
  const [dateMode, setDateMode] = useState<AuxiliaryIssueProgressDateMode>("不选择日期");
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, "month"));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [issueRemark, setIssueRemark] = useState("全部");
  const [searchField, setSearchField] = useState("装配生产单号");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<AuxiliaryIssueProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const displayRows = useMemo(() => {
    if (arrivalStatus === "未到") return rows.filter(row => Number(row.未领数量 ?? 0) > 0);
    if (arrivalStatus === "已到") return rows.filter(row => Number(row.未领数量 ?? 0) <= 0);
    return rows;
  }, [arrivalStatus, rows]);

  const load = async () => {
    if (!canOpen) {
      message.error("缺少领料单打开权限");
      return;
    }
    setLoading(true);
    try {
      const query = buildAuxiliaryIssueProgressQuery({
        arrivalStatus,
        dateMode,
        startDate: d(startDate),
        endDate: d(endDate),
        keyword,
        issueRemark,
      });
      const result = await auxiliaryIssueProgressApi.list(query);
      setRows(result.map(normalizeAuxiliaryIssueProgressRow));
    } catch {
      message.error("加载辅料出库进度表失败");
    } finally {
      setLoading(false);
    }
  };

  const text = (value: unknown, row: AuxiliaryIssueProgressRow) => (
    <span style={{ color: getAuxiliaryIssueProgressTextColor(row) }}>
      {value == null ? "" : String(value)}
    </span>
  );

  const numberText = (value: unknown, row: AuxiliaryIssueProgressRow) => (
    <span style={{ color: getAuxiliaryIssueProgressTextColor(row) }}>
      {Number(value ?? 0).toLocaleString()}
    </span>
  );

  const columns: ColumnsType<AuxiliaryIssueProgressRow> = [
    { title: "开单日期", dataIndex: "开单日期", width: 115, render: text },
    { title: "装配生产单号", dataIndex: "装配生产单号", width: 155, render: text },
    { title: "领料备注", dataIndex: "领料备注", width: 120, render: text },
    { title: "辅料编号", dataIndex: "辅料编号", width: 130, render: text },
    { title: "辅料名称", dataIndex: "辅料名称", width: 260, render: text },
    { title: "规格", dataIndex: "规格", width: 120, render: text },
    { title: "单位", dataIndex: "单位", width: 95, render: text },
    { title: "需求数量", dataIndex: "需求数量", width: 120, align: "right", render: numberText },
    { title: "已领数量", dataIndex: "已领数量", width: 120, align: "right", render: numberText },
    { title: "未领数量", dataIndex: "未领数量", width: 120, align: "right", render: numberText },
    { title: "操作员", dataIndex: "操作员", width: 120, render: text },
  ];

  return (
    <Card
      title="辅料出库进度表"
      variant="borderless"
      extra={
        <Space wrap>
          <Typography.Text type="secondary">
            提示：查询结果中紫色显示的是未领出的生产单，黑色显示的是已经领出的生产单。
          </Typography.Text>
          <Typography.Text>领料备注：</Typography.Text>
          <Select
            size="small"
            value={issueRemark}
            onChange={setIssueRemark}
            style={{ width: 112 }}
            options={["全部", "生产领料", "样品领料", "维修领料"].map(value => ({ value, label: value }))}
          />
        </Space>
      }
    >
      <Space wrap style={{ marginBottom: 8 }}>
        <Typography.Text>到货情况</Typography.Text>
        <Select
          size="small"
          value={arrivalStatus}
          onChange={setArrivalStatus}
          style={{ width: 92 }}
          options={["未到", "已到", "全部"].map(value => ({ value, label: value }))}
        />
        <Typography.Text>日期</Typography.Text>
        <Select
          size="small"
          value={dateMode}
          onChange={setDateMode}
          style={{ width: 116 }}
          options={["不选择日期", "开单日期", "领料日期"].map(value => ({ value, label: value }))}
        />
        <DatePicker size="small" value={startDate} onChange={value => value && setStartDate(value)} />
        <Typography.Text>至</Typography.Text>
        <DatePicker size="small" value={endDate} onChange={value => value && setEndDate(value)} />
        <Button size="small" icon={<TableOutlined />} disabled>表格设置</Button>
        <Button size="small" icon={<ExportOutlined />} disabled>导出EXCEL</Button>
        <Button size="small" icon={<PrinterOutlined />} disabled>打印</Button>
        <Button size="small" danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
      </Space>

      <Space wrap style={{ marginBottom: 8 }}>
        <Typography.Text>请选择条件：</Typography.Text>
        <Select
          size="small"
          value={searchField}
          onChange={setSearchField}
          style={{ width: 130 }}
          options={["装配生产单号", "辅料编号", "辅料名称", "领料备注", "操作员"].map(value => ({ value, label: value }))}
        />
        <Typography.Text>查询</Typography.Text>
        <Input
          size="small"
          allowClear
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onPressEnter={load}
          style={{ width: 260 }}
        />
        <Button size="small" icon={<SearchOutlined />} onClick={load}>查询</Button>
        <Button size="small" icon={<SearchOutlined />} onClick={load}>精确查询</Button>
        <Button size="small" disabled>高级查询</Button>
        <Button size="small" icon={<FileDoneOutlined />} disabled>建立出库单</Button>
      </Space>

      <Table
        rowKey={(row, index) => `${row.装配生产单号 ?? "mo"}-${row.辅料编号 ?? "mat"}-${index}`}
        size="small"
        pagination={false}
        loading={loading}
        dataSource={displayRows}
        columns={columns}
        scroll={{ x: "max-content", y: 620 }}
        style={{ background: "#eee5d8" }}
        onRow={row => ({
          style: {
            color: getAuxiliaryIssueProgressTextColor(row),
          },
        })}
      />
    </Card>
  );
}
