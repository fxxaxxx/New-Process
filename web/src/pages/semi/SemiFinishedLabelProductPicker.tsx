import { useCallback, useEffect, useRef, useState, type Key } from "react";
import { Button, Input, Modal, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { semiFinishedLabelOrdersApi } from "../../api/semiFinishedLabelOrders";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "半成品标签单";
const PAGE_SIZE = 50;
const fields = ["产品货号", "产品名称", "配件编号", "客户", "产品装配名称"];

export interface SemiFinishedLabelProduct {
  ID?: number | string;
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  数量?: number | null;
  每箱数量?: number | null;
  加工单价?: number | null;
  库存单价?: number | null;
}

interface ProductListResult {
  items: SemiFinishedLabelProduct[];
  total: number;
}

interface ProductQuery {
  field?: string;
  keyword?: string;
  exact?: boolean;
  page?: number;
  size?: number;
}

const defaultProductLoader = (query: ProductQuery) =>
  semiFinishedLabelOrdersApi.products(query) as unknown as Promise<ProductListResult>;

const productKey = (row: SemiFinishedLabelProduct): Key => row.ID ?? `${row.配件编号}-${row.产品货号}`;

export default function SemiFinishedLabelProductPicker({ open, onPick, onClose, loadProducts = defaultProductLoader, permissionMenu = MENU, goodsTitle = "产品货号", nameTitle = "产品名称" }: {
  open: boolean;
  onPick: (rows: SemiFinishedLabelProduct[]) => void;
  onClose: () => void;
  loadProducts?: (query: ProductQuery) => Promise<ProductListResult>;
  permissionMenu?: string;
  goodsTitle?: string;
  nameTitle?: string;
}) {
  const perms = usePerms();
  const canSeePrice = can(perms, permissionMenu, "单价");
  const [field, setField] = useState("产品货号");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SemiFinishedLabelProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<SemiFinishedLabelProduct[]>([]);
  const requestVersion = useRef(0);
  const fieldDraft = useRef("产品货号");
  const keywordDraft = useRef("");
  const activeQuery = useRef({ field: "产品货号", keyword: "", exact: false });

  const load = useCallback(async (
    nextPage: number,
    query: { field: string; keyword: string; exact: boolean },
  ) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const result = await loadProducts({
        ...query,
        page: nextPage,
        size: PAGE_SIZE,
      });
      if (version !== requestVersion.current) return;
      setRows(result.items ?? []);
      setTotal(result.total ?? 0);
    } catch {
      if (version === requestVersion.current) message.error("加载半成品标签产品失败");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [loadProducts]);

  const closePicker = () => {
    requestVersion.current += 1;
    setLoading(false);
    setPage(1);
    setSelectedKeys([]);
    setSelectedRows([]);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      requestVersion.current += 1;
      return;
    }
    let cancelled = false;
    const query = { field: fieldDraft.current, keyword: keywordDraft.current.trim(), exact: false };
    activeQuery.current = query;
    void Promise.resolve().then(() => {
      if (!cancelled) void load(1, query);
    });
    return () => { cancelled = true; };
  }, [open, load]);

  const search = (nextExact: boolean) => {
    const query = { field: fieldDraft.current, keyword: keywordDraft.current.trim(), exact: nextExact };
    activeQuery.current = query;
    setPage(1);
    void load(1, query);
  };

  const toggleAll = () => {
    const selected = new Set(selectedKeys);
    const selectable = rows.filter(row => !selected.has(productKey(row)));
    if (selectable.length === 0) {
      setSelectedKeys([]);
      setSelectedRows([]);
      return;
    }
    const selectedRows = rows;
    setSelectedRows(selectedRows);
    setSelectedKeys(selectedRows.map(productKey));
  };

  const invert = () => {
    const selected = new Set(selectedKeys);
    const selectedRows = rows.filter(row => !selected.has(productKey(row)));
    setSelectedRows(selectedRows);
    setSelectedKeys(selectedRows.map(productKey));
  };

  const columns: ColumnsType<SemiFinishedLabelProduct> = [
    { title: "配件编号", dataIndex: "配件编号", width: 135 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 },
    { title: "客户", dataIndex: "客户", width: 135 },
    { title: goodsTitle, dataIndex: "产品货号", width: 145 },
    { title: nameTitle, dataIndex: "产品名称", width: 180 },
    { title: "加工单价", dataIndex: "加工单价", width: 110, align: "right", render: value => canSeePrice ? value ?? "" : "***" },
    { title: "库存单价", dataIndex: "库存单价", width: 110, align: "right", render: value => canSeePrice ? value ?? "" : "***" },
  ];

  return (
    <Modal title="选择半成品标签产品" open={open} onCancel={closePicker} width={1120}
      footer={[
        <Button key="pick" type="primary" icon={<CheckOutlined />} disabled={selectedRows.length === 0} onClick={() => { onPick(selectedRows); closePicker(); }}>选择</Button>,
        <Button key="close" icon={<CloseOutlined />} onClick={closePicker}>关闭</Button>,
      ]}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Select value={field} onChange={value => { fieldDraft.current = value; setField(value); }} options={fields.map(value => ({ value, label: value }))} style={{ width: 145 }} />
        <Input.Search allowClear value={keyword} onChange={event => { keywordDraft.current = event.target.value; setKeyword(event.target.value); }} onSearch={() => search(false)} style={{ width: 260 }} />
        <Button icon={<SearchOutlined />} onClick={() => search(false)} loading={loading}>查询</Button>
        <Button onClick={() => search(true)} disabled={loading}>精确查询</Button>
        <Button onClick={toggleAll} disabled={loading || rows.length === 0}>全选</Button>
        <Button onClick={invert} disabled={loading || rows.length === 0}>反选</Button>
      </Space>
      <Table<SemiFinishedLabelProduct>
        rowKey={productKey}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1050, y: 440 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          preserveSelectedRowKeys: true,
          onChange: (keys, picked) => {
            setSelectedKeys(keys);
            setSelectedRows(current => {
              const byKey = new Map(current.map(row => [productKey(row), row]));
              picked.forEach(row => byKey.set(productKey(row), row));
              return keys.map(key => byKey.get(key)).filter((row): row is SemiFinishedLabelProduct => row !== undefined);
            });
          },
        }}
        onRow={row => ({
          onDoubleClick: () => { onPick([row]); closePicker(); },
          style: { cursor: "pointer" },
        })}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: value => `共 ${value} 条`,
          onChange: nextPage => { setPage(nextPage); void load(nextPage, activeQuery.current); },
        }}
      />
    </Modal>
  );
}
