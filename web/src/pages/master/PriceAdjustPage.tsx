import { useCallback, useEffect, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { masterApi } from "../../api/master";
import {
  applyPriceAdjust,
  priceAdjustLinesApi,
  priceAdjustsApi,
  type PriceAdjust,
  type PriceAdjustLine,
} from "../../api/priceAdjusts";
import { fmtDate, linesOfDoc, validatePriceAdjustLine } from "../../utils/priceAdjust";

const MENU = "调价";
const currentUser = () => localStorage.getItem("erp_user") || "";

interface HeaderFormValues {
  单号: string;
  日期?: Dayjs | null;
  操作员?: string;
  审核?: string;
  备注?: string;
}

export default function PriceAdjustPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const priceHidden = hidePrice(perms, MENU);

  const [docs, setDocs] = useState<PriceAdjust[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<PriceAdjust | null>(null);
  const [lines, setLines] = useState<PriceAdjustLine[]>([]);
  const [editingDoc, setEditingDoc] = useState<PriceAdjust | null>(null);
  const [editingLine, setEditingLine] = useState<PriceAdjustLine | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [quoteCategories, setQuoteCategories] = useState<string[]>([]);
  const [docForm] = Form.useForm<HeaderFormValues>();
  const [lineForm] = Form.useForm();
  const [applyForm] = Form.useForm<{ 报价类别: string }>();

  const loadDocs = useCallback(async () => {
    const r = await priceAdjustsApi.list(page, 10, keyword);
    setDocs(r.items);
    setTotal(r.total);
  }, [page, keyword]);

  const loadLines = useCallback(async (单号: string) => {
    const r = await priceAdjustLinesApi.list(1, 1000, 单号);
    setLines(linesOfDoc(r.items, 单号));
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);
  useEffect(() => {
    const 单号 = selected?.单号;
    if (单号) void loadLines(单号);
  }, [selected, loadLines]);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setLines([]);
  }, []);

  const openQuoteCategories = async () => {
    if (quoteCategories.length) return;
    try {
      const r = await masterApi("quote-categories").list(1, 1000);
      const names = r.items
        .map(c => String(c.名称 ?? c.编号 ?? "").trim())
        .filter(Boolean);
      setQuoteCategories([...new Set(names)]);
    } catch { /* 类别加载失败时仍允许手输 */ }
  };

  const onSaveDoc = async () => {
    const v = await docForm.validateFields();
    const body: Partial<PriceAdjust> = {
      单号: v.单号.trim(),
      日期: v.日期 ? v.日期.format("YYYY-MM-DD") : null,
      操作员: v.操作员 ?? "",
      审核: v.审核 ?? "",
      备注: v.备注 ?? "",
    };
    if (editingDoc && editingDoc.id) await priceAdjustsApi.update(editingDoc.id, body);
    else await priceAdjustsApi.create(body);
    message.success("已保存");
    setEditingDoc(null);
    docForm.resetFields();
    loadDocs();
  };

  const onSaveLine = async () => {
    if (!selected?.单号) return;
    const v = await lineForm.validateFields();
    const err = validatePriceAdjustLine(v);
    if (err) { message.error(err); return; }
    const body: Partial<PriceAdjustLine> = {
      单号: selected.单号,
      日期: selected.日期 ?? null,
      物料类别: v.物料类别 ?? "",
      物料编号: v.物料编号.trim(),
      物料名称: v.物料名称 ?? "",
      规格: v.规格 ?? "",
      颜色: v.颜色 ?? "",
      单位: v.单位 ?? "",
      原单价: v.原单价 ?? null,
      修改单价: v.修改单价 ?? null,
      修改原因: v.修改原因 ?? "",
    };
    if (editingLine && editingLine.id) await priceAdjustLinesApi.update(editingLine.id, body);
    else await priceAdjustLinesApi.create(body);
    message.success("已保存");
    setEditingLine(null);
    lineForm.resetFields();
    loadLines(selected.单号);
  };

  const onApply = async () => {
    if (!selected?.单号) return;
    const v = await applyForm.validateFields();
    setApplying(true);
    try {
      const r = await applyPriceAdjust(selected.单号, v.报价类别.trim());
      message.success(`已应用调价：生成报价条数 ${r.生成报价条数}`);
      setApplyOpen(false);
      applyForm.resetFields();
    } catch {
      message.error("应用调价失败");
    } finally {
      setApplying(false);
    }
  };

  const docColumns = [
    { title: "单号", dataIndex: "单号", render: (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span> },
    { title: "日期", dataIndex: "日期", render: (v: unknown) => fmtDate(v) },
    { title: "操作员", dataIndex: "操作员" },
    { title: "审核", dataIndex: "审核", width: 60 },
    { title: "备注", dataIndex: "备注", ellipsis: true },
    {
      title: "操作", key: "_op", width: 110,
      render: (_: unknown, row: PriceAdjust) => (
        <Space>
          <a onClick={(e) => {
            e.stopPropagation();
            setEditingDoc(row);
            docForm.setFieldsValue({
              单号: row.单号 ?? "",
              日期: row.日期 ? dayjs(row.日期) : null,
              操作员: row.操作员 ?? "",
              审核: row.审核 ?? "",
              备注: row.备注 ?? "",
            });
          }}>编辑</a>
          {canDelete && (
          <Popconfirm title="确认删除该调价单?" onConfirm={async () => {
            await priceAdjustsApi.remove(row.id);
            message.success("已删除");
            if (selected?.id === row.id) clearSelection();
            loadDocs();
          }}>
            <a onClick={(e) => e.stopPropagation()}>删除</a>
          </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const priceCols = priceHidden ? [] : [
    { title: "原单价", dataIndex: "原单价", align: "right" as const, width: 100, render: (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span> },
    { title: "修改单价", dataIndex: "修改单价", align: "right" as const, width: 100, render: (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span> },
  ];

  const lineColumns = [
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "物料编号", dataIndex: "物料编号", width: 110, render: (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 70 },
    ...priceCols,
    { title: "修改原因", dataIndex: "修改原因", ellipsis: true },
    {
      title: "操作", key: "_op", width: 110,
      render: (_: unknown, row: PriceAdjustLine) => (
        <Space>
          <a onClick={() => { setEditingLine(row); lineForm.setFieldsValue(row); }}>编辑</a>
          <Popconfirm title="确认删除该明细?" onConfirm={async () => {
            await priceAdjustLinesApi.remove(row.id);
            message.success("已删除");
            if (selected?.单号) loadLines(selected.单号);
          }}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  }

  return (
    <Row gutter={12}>
      <Col xs={24} lg={9}>
        <Card
          title="调价单"
          variant="borderless"
          extra={
            <Space>
              <Input.Search placeholder="搜索调价单" allowClear
                onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 160 }} />
              <Button type="primary" disabled={!canSave} onClick={() => {
                setEditingDoc({ id: 0 } as PriceAdjust);
                docForm.resetFields();
                docForm.setFieldsValue({ 日期: dayjs(), 操作员: currentUser() } as HeaderFormValues);
              }}>新增</Button>
            </Space>
          }
        >
          <Table<PriceAdjust>
            rowKey="id"
            size="middle"
            dataSource={docs}
            columns={docColumns}
            pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }}
            scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
            rowClassName={row => (selected?.id === row.id ? "ant-table-row-selected" : "")}
            onRow={row => ({ onClick: () => setSelected(row) })}
          />
        </Card>
      </Col>
      <Col xs={24} lg={15}>
        <Card
          title={selected?.单号 ? `调价明细（${selected.单号}）` : "调价明细（请先选择左侧调价单）"}
          variant="borderless"
          extra={
            <Space>
              <Button disabled={!selected?.单号 || !canSave} onClick={() => {
                setEditingLine({ id: 0 } as PriceAdjustLine);
                lineForm.resetFields();
              }}>新增明细</Button>
              <Button type="primary" disabled={!selected?.单号 || !canSave || !lines.length}
                onClick={() => { setApplyOpen(true); void openQuoteCategories(); }}>
                应用调价
              </Button>
            </Space>
          }
        >
          <Table<PriceAdjustLine>
            rowKey="id"
            size="middle"
            dataSource={lines}
            columns={lineColumns}
            pagination={false}
            scroll={{ x: 1000 }}
          />
        </Card>
      </Col>

      <Modal
        open={!!editingDoc}
        title={(editingDoc && editingDoc.id ? "编辑" : "新增") + "调价单"}
        onOk={onSaveDoc}
        onCancel={() => { setEditingDoc(null); docForm.resetFields(); }}
        destroyOnHidden
      >
        <Form form={docForm} layout="vertical">
          <Form.Item name="单号" label="单号" rules={[{ required: true, message: "请输入单号" }]}>
            <Input disabled={!!editingDoc?.id} />
          </Form.Item>
          <Form.Item name="日期" label="日期"><DatePicker style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="操作员" label="操作员"><Input /></Form.Item>
          <Form.Item name="审核" label="审核"><Input /></Form.Item>
          <Form.Item name="备注" label="备注"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!editingLine}
        title={(editingLine && editingLine.id ? "编辑" : "新增") + "调价明细"}
        onOk={onSaveLine}
        onCancel={() => { setEditingLine(null); lineForm.resetFields(); }}
        destroyOnHidden
      >
        <Form form={lineForm} layout="vertical">
          <Form.Item name="物料类别" label="物料类别"><Input /></Form.Item>
          <Form.Item name="物料编号" label="物料编号" rules={[{ required: true, message: "请输入物料编号" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="物料名称" label="物料名称"><Input /></Form.Item>
          <Form.Item name="规格" label="规格"><Input /></Form.Item>
          <Form.Item name="颜色" label="颜色"><Input /></Form.Item>
          <Form.Item name="单位" label="单位"><Input /></Form.Item>
          {!priceHidden && (
            <>
              <Form.Item name="原单价" label="原单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="修改单价" label="修改单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            </>
          )}
          <Form.Item name="修改原因" label="修改原因"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={applyOpen}
        title={`应用调价（${selected?.单号 ?? ""}）`}
        onOk={onApply}
        confirmLoading={applying}
        onCancel={() => { setApplyOpen(false); applyForm.resetFields(); }}
        destroyOnHidden
      >
        <p style={{ color: "#8c8c8c" }}>
          将把该调价单明细的"修改单价"按所选报价类别写入报价资料（生效日期=明细日期，缺省为当前时间）。
        </p>
        <Form form={applyForm} layout="vertical">
          <Form.Item name="报价类别" label="报价类别" rules={[{ required: true, message: "请输入报价类别" }]}>
            <AutoComplete
              options={quoteCategories.map(c => ({ value: c }))}
              placeholder="选择或输入报价类别"
              filterOption={(input, option) => String(option?.value ?? "").includes(input)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  );
}
