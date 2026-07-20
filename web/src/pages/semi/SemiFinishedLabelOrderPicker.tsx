import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input, Modal, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { semiFinishedLabelOrdersApi } from "../../api/semiFinishedLabelOrders";

const PAGE_SIZE = 30;

interface SemiFinishedLabelOrderRow {
  电脑单号: string;
  日期?: string | null;
  操作员?: string | null;
  审核?: string | null;
  审核状态?: string | null;
}

interface OrderListResult {
  items: SemiFinishedLabelOrderRow[];
  total: number;
}

export default function SemiFinishedLabelOrderPicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (orderNo: string) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SemiFinishedLabelOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedNo, setSelectedNo] = useState<string>();
  const requestVersion = useRef(0);
  const keywordDraft = useRef("");
  const activeKeyword = useRef("");

  const load = useCallback(async (nextPage: number, nextKeyword: string) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await semiFinishedLabelOrdersApi.list(nextPage, PAGE_SIZE, nextKeyword) as unknown as OrderListResult;
      if (version !== requestVersion.current) return;
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch {
      if (version === requestVersion.current) message.error("加载半成品标签单失败");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  const closePicker = () => {
    requestVersion.current += 1;
    setLoading(false);
    setPage(1);
    setSelectedNo(undefined);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      requestVersion.current += 1;
      return;
    }
    let cancelled = false;
    const nextKeyword = keywordDraft.current.trim();
    activeKeyword.current = nextKeyword;
    void Promise.resolve().then(() => {
      if (!cancelled) void load(1, nextKeyword);
    });
    return () => { cancelled = true; };
  }, [open, load]);

  const runQuery = () => {
    const nextKeyword = keywordDraft.current.trim();
    activeKeyword.current = nextKeyword;
    setPage(1);
    void load(1, nextKeyword);
  };

  const openSelected = () => {
    if (!selectedNo) return;
    onPick(selectedNo);
    closePicker();
  };

  const columns: ColumnsType<SemiFinishedLabelOrderRow> = [
    { title: "电脑单号", dataIndex: "电脑单号", width: 155 },
    { title: "日期", dataIndex: "日期", width: 120, render: value => value ? String(value).slice(0, 10) : "" },
    { title: "操作员", dataIndex: "操作员", width: 120 },
    {
      title: "审核状态",
      key: "审核状态",
      width: 105,
      render: (_value, row) => {
        const audited = (row.审核状态 ?? row.审核) === "1" || row.审核状态 === "已审核";
        return <Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag>;
      },
    },
  ];

  return (
    <Modal title="打开半成品标签单" open={open} onCancel={closePicker} width={820}
      footer={[
        <Button key="open" type="primary" icon={<CheckOutlined />} disabled={!selectedNo} onClick={openSelected}>打开</Button>,
        <Button key="close" icon={<CloseOutlined />} onClick={closePicker}>关闭</Button>,
      ]}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search allowClear value={keyword} onChange={event => { keywordDraft.current = event.target.value; setKeyword(event.target.value); }} onSearch={runQuery} style={{ width: 280 }} />
        <Button icon={<SearchOutlined />} onClick={runQuery} loading={loading}>查询</Button>
      </Space>
      <Table<SemiFinishedLabelOrderRow>
        rowKey="电脑单号"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 520, y: 400 }}
        rowClassName={row => row.电脑单号 === selectedNo ? "erp-row-selected" : ""}
        onRow={row => ({
          onClick: () => setSelectedNo(row.电脑单号),
          onDoubleClick: () => { onPick(row.电脑单号); closePicker(); },
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: value => `共 ${value} 条`,
          onChange: nextPage => { setPage(nextPage); void load(nextPage, activeKeyword.current); },
        }}
      />
    </Modal>
  );
}
