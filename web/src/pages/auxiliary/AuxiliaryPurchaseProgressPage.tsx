import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
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
  FolderOpenOutlined,
  PrinterOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { purchaseOrderApi } from "../../api/purchaseOrders";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PurchaseOrderDrawer from "../production/PurchaseOrderDrawer";
import {
  buildAuxiliaryPurchaseProgressQuery,
  getAuxiliaryProgressTextColor,
  normalizeAuxiliaryPurchaseProgressRow,
  type AuxiliaryArrivalStatus,
  type AuxiliaryProgressDateMode,
  type AuxiliaryPurchaseProgressRow,
} from "../../utils/auxiliaryPurchaseProgress";

const MENU = "采购订单";
const d = (value: Dayjs) => value.format("YYYY-MM-DD");

export default function AuxiliaryPurchaseProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState<AuxiliaryArrivalStatus>("未到");
  const [dateMode, setDateMode] = useState<AuxiliaryProgressDateMode>("不选择日期");
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, "month"));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs());
  const [searchField, setSearchField] = useState("辅料名称");
  const [keyword, setKeyword] = useState("");
  const [onlyThreeDays, setOnlyThreeDays] = useState(false);
  const [rows, setRows] = useState<AuxiliaryPurchaseProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | undefined>();
  const [viewingOrderNo, setViewingOrderNo] = useState<string | undefined>();

  const displayRows = useMemo(() => {
    if (arrivalStatus !== "已到") return rows;
    return rows.filter(row => Number(row.相差数量 ?? 0) <= 0);
  }, [arrivalStatus, rows]);

  const load = async () => {
    if (!canOpen) {
      message.error("缺少采购订单打开权限");
      return;
    }
    setLoading(true);
    try {
      const query = buildAuxiliaryPurchaseProgressQuery({
        arrivalStatus,
        dateMode,
        startDate: d(startDate),
        endDate: d(endDate),
        keyword,
        onlyThreeDays,
      });
      const result = await purchaseOrderApi.progress(query);
      setRows(result.map(normalizeAuxiliaryPurchaseProgressRow));
    } catch {
      message.error("加载辅料采购进度表失败");
    } finally {
      setLoading(false);
    }
  };

  const openSelectedOrder = () => {
    if (!selectedOrderNo) {
      message.warning("请先选择一行订单");
      return;
    }
    setViewingOrderNo(selectedOrderNo);
  };

  const text = (value: unknown, row: AuxiliaryPurchaseProgressRow) => (
    <span style={{ color: getAuxiliaryProgressTextColor(row) }}>{value == null ? "" : String(value)}</span>
  );

  const numberText = (value: unknown, row: AuxiliaryPurchaseProgressRow) => (
    <span style={{ color: getAuxiliaryProgressTextColor(row) }}>{Number(value ?? 0).toLocaleString()}</span>
  );

  const columns: ColumnsType<AuxiliaryPurchaseProgressRow> = [
    { title: "订购日期", dataIndex: "订购日期", width: 110, render: text },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: text },
    { title: "订单单号", dataIndex: "订单单号", width: 130, render: text },
    { title: "供应商编号", dataIndex: "供应商编号", width: 110, render: text },
    { title: "供应商名称", dataIndex: "供应商名称", width: 190, render: text },
    { title: "辅料编号", dataIndex: "辅料编号", width: 120, render: text },
    { title: "辅料名称", dataIndex: "辅料名称", width: 210, render: text },
    { title: "规格", dataIndex: "规格", width: 110, render: text },
    { title: "单位", dataIndex: "单位", width: 75, render: text },
    { title: "单价类型", dataIndex: "单价类型", width: 95, render: text },
    { title: "订货数量", dataIndex: "订货数量", width: 105, align: "right", render: numberText },
    { title: "入仓数量", dataIndex: "入仓数量", width: 105, align: "right", render: numberText },
    { title: "相差数量", dataIndex: "相差数量", width: 105, align: "right", render: numberText },
    { title: "操作员", dataIndex: "操作员", width: 100, render: text },
    { title: "备注", dataIndex: "备注", width: 210, render: text },
  ];

  return (
    <Card
      title="辅料采购进度表"
      variant="borderless"
      extra={
        <Space wrap>
          <Typography.Text type="secondary">
            提示：查询结果中紫色显示的是未全部入仓的订单，黑色显示的是已经完成的订单。
          </Typography.Text>
          <Checkbox checked={onlyThreeDays} onChange={e => setOnlyThreeDays(e.target.checked)}>
            只显示3天内交货期的订单
          </Checkbox>
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
          options={["不选择日期", "订购日期", "交货日期"].map(value => ({ value, label: value }))}
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
          style={{ width: 116 }}
          options={["辅料名称", "辅料编号", "订单单号", "供应商名称"].map(value => ({ value, label: value }))}
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
        <Button size="small" icon={<FolderOpenOutlined />} onClick={openSelectedOrder}>打开订单</Button>
        <Button size="small" icon={<FileDoneOutlined />} disabled>建立收货单</Button>
      </Space>

      <Table
        rowKey={(_, index) => String(index)}
        size="small"
        pagination={false}
        loading={loading}
        dataSource={displayRows}
        columns={columns}
        scroll={{ x: "max-content", y: 620 }}
        style={{ background: "#eee5d8" }}
        onRow={row => ({
          onClick: () => setSelectedOrderNo(row.订单单号),
          onDoubleClick: () => row.订单单号 && setViewingOrderNo(row.订单单号),
          style: {
            cursor: row.订单单号 ? "pointer" : "default",
            color: getAuxiliaryProgressTextColor(row),
          },
        })}
      />

      <PurchaseOrderDrawer
        open={!!viewingOrderNo}
        单号={viewingOrderNo}
        onClose={() => setViewingOrderNo(undefined)}
      />
    </Card>
  );
}
