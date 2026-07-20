import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal,
  Row, Select, Space, Table, Typography, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined, FileAddOutlined, FolderOpenOutlined, PrinterOutlined,
  SaveOutlined, SearchOutlined, TableOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useSearchParams } from "react-router-dom";
import { masterApi } from "../../api/master";
import { stylesApi, type StyleBomLine, type StyleListItem } from "../../api/styles";
import { assemblyPurchaseQueryApi, type AssemblyPurchaseDetailRow } from "../../api/assemblyPurchaseQuery";
import type { ProductionTrackingRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import ProductionPicker from "../materials/ProductionPicker";

const MENU = "款号资料";
const currentUser = () => localStorage.getItem("erp_user") || "用户";
const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const money = (v?: number | null) => Number(v ?? 0).toFixed(2);

interface CustomerPick {
  客户编号?: string;
  客户名称?: string;
}

interface PartnerPick {
  供应商编号?: string;
  供应商名称?: string;
  加工厂编号?: string;
  加工厂名称?: string;
}

interface HeaderForm {
  供应商编号?: string;
  供应商名称?: string;
  客户编号?: string;
  客户名称?: string;
  出单日期?: Dayjs;
  单价?: number | null;
  金额?: number | null;
  收货仓库?: string;
  电脑单号?: string;
  备注?: string;
  开始交货日期?: Dayjs;
  每天交货?: number | null;
  完成日期?: Dayjs;
  收货人?: string;
  操作员?: string;
}

interface ProductLine {
  key: number;
  客户?: string;
  产品货号?: string;
  产品装配名称?: string;
  配件编号?: string;
  装配方式?: string;
  加工数量?: number | null;
  备注?: string;
}

interface ProductionLine {
  key: number;
  接单日期?: string;
  生产单号?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  加工数量?: number | null;
  单价?: number | null;
  金额?: number | null;
}

interface AccessoryLine {
  key: number;
  序号: number;
  辅料编号?: string;
  辅料名称?: string;
  加工总数量?: number | null;
  单个产品需求量?: number | null;
  需求数克?: number | null;
  需求数个?: number | null;
}

let seq = 1;
const nextKey = () => seq++;
const blankProducts = () => Array.from({ length: 5 }, () => ({ key: nextKey() } as ProductLine));
const blankProduction = () => Array.from({ length: 12 }, () => ({ key: nextKey() } as ProductionLine));
const blankAccessories = () => Array.from({ length: 10 }, (_, i) => ({ key: nextKey(), 序号: i + 1 } as AccessoryLine));

const customersApi = masterApi("customers");
const suppliersApi = masterApi("suppliers");
const factoriesApi = masterApi("factories");

export default function AssemblyPurchaseOrderPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<HeaderForm>();
  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [styles, setStyles] = useState<StyleListItem[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>(blankProducts);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>(blankProduction);
  const [accessoryLines, setAccessoryLines] = useState<AccessoryLine[]>(blankAccessories);
  const [bomMaterials, setBomMaterials] = useState<StyleBomLine[]>([]);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerTab, setPartnerTab] = useState<"supplier" | "factory">("supplier");
  const [partnerKw, setPartnerKw] = useState("");
  const [partners, setPartners] = useState<PartnerPick[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [prodPickFor, setProdPickFor] = useState<number | null>(null);
  const [openDocModal, setOpenDocModal] = useState(false);
  const [openDocs, setOpenDocs] = useState<AssemblyPurchaseDetailRow[]>([]);
  const [openLoading, setOpenLoading] = useState(false);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      出单日期: dayjs(),
      开始交货日期: dayjs(),
      完成日期: dayjs(),
      收货仓库: "半成品仓",
      单价: undefined,
      金额: 0,
      操作员: currentUser(),
    });
    setProductLines(blankProducts());
    setProductionLines(blankProduction());
    setAccessoryLines(blankAccessories());
    setBomMaterials([]);
  }, [form]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!canOpen) return;
    Promise.all([customersApi.list(1, 500, ""), stylesApi.list("", 1, 800)])
      .then(([customerResult, styleResult]) => {
        setCustomers(customerResult.items as CustomerPick[]);
        setStyles(styleResult.items);
      })
      .catch(() => message.error("加载客户/产品货号资料失败"));
  }, [canOpen]);

  const customerOptions = useMemo(() =>
    customers
      .filter(c => c.客户编号)
      .map(c => ({ value: c.客户编号!, label: `${c.客户编号} ${c.客户名称 ?? ""}` })),
  [customers]);

  const productOptions = useMemo(() =>
    styles
      .filter(s => s.款号)
      .map(s => ({ value: s.款号!, label: `${s.款号} ${s.款式 ?? ""}` })),
  [styles]);

  const totalQty = useMemo(() => {
    const productionQty = productionLines.reduce((sum, r) => sum + Number(r.加工数量 ?? 0), 0);
    if (productionQty > 0) return productionQty;
    return productLines.reduce((sum, r) => sum + Number(r.加工数量 ?? 0), 0);
  }, [productionLines, productLines]);

  const rebuildAccessories = useCallback((materials: StyleBomLine[], qty: number) => {
    const rows = materials.map((m, i) => {
      const usage = Number(m.使用数量 ?? 0);
      const unit = String(m.单位 ?? "");
      const total = qty * usage;
      const isGram = unit.toLowerCase().includes("g") || unit.includes("克");
      return {
        key: nextKey(),
        序号: i + 1,
        辅料编号: m.物料编号 ?? undefined,
        辅料名称: m.物料名称 ?? undefined,
        加工总数量: qty,
        单个产品需求量: usage || undefined,
        需求数克: isGram ? total : undefined,
        需求数个: isGram ? undefined : total,
      } as AccessoryLine;
    });
    setAccessoryLines(rows.length ? rows : blankAccessories());
  }, []);

  useEffect(() => {
    rebuildAccessories(bomMaterials, totalQty);
  }, [bomMaterials, rebuildAccessories, totalQty]);

  const patchProduct = (key: number, patch: Partial<ProductLine>) =>
    setProductLines(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const patchProduction = (key: number, patch: Partial<ProductionLine>) =>
    setProductionLines(rows => rows.map(r => {
      if (r.key !== key) return r;
      const next = { ...r, ...patch };
      next.金额 = Number(next.加工数量 ?? 0) * Number(next.单价 ?? form.getFieldValue("单价") ?? 0);
      return next;
    }));

  const onCustomerChange = (customerNo?: string) => {
    const picked = customers.find(c => c.客户编号 === customerNo);
    form.setFieldsValue({ 客户编号: customerNo, 客户名称: picked?.客户名称 });
    setProductLines(rows => rows.map((r, i) => (i === 0 ? { ...r, 客户: `${customerNo ?? ""}${picked?.客户名称 ? `，${picked.客户名称}` : ""}` } : r)));
  };

  const loadProduct = async (productNo?: string) => {
    if (!productNo) return;
    if (!form.getFieldValue("客户编号")) {
      message.warning("请先选择客户，再选择产品货号");
      return;
    }
    try {
      const full = await stylesApi.materials(productNo);
      const styleName = full.款式 ?? "";
      const customerText = [form.getFieldValue("客户编号"), form.getFieldValue("客户名称")].filter(Boolean).join("，");
      setBomMaterials(full.物料 ?? []);
      setProductLines(rows => rows.map((r, i) => (i === 0 ? {
        ...r,
        客户: customerText,
        产品货号: productNo,
        产品装配名称: styleName,
        配件编号: r.配件编号 || "",
        装配方式: r.装配方式 || "包装(已装箱)",
        加工数量: r.加工数量 ?? 0,
      } : r)));
      setProductionLines(rows => rows.map((r, i) => (i === 0 && !r.产品货号 ? {
        ...r,
        产品货号: productNo,
        产品名称: styleName,
        产品装配名称: styleName,
        配件编号: productLines[0]?.配件编号,
        单价: form.getFieldValue("单价") ?? undefined,
      } : r)));
    } catch {
      message.error("产品货号不存在或加载失败");
    }
  };

  const onPartnerPick = (row: PartnerPick) => {
    const isFactory = partnerTab === "factory";
    form.setFieldsValue({
      供应商编号: isFactory ? row.加工厂编号 : row.供应商编号,
      供应商名称: isFactory ? row.加工厂名称 : row.供应商名称,
    });
    setPartnerOpen(false);
  };

  const loadPartners = useCallback(async () => {
    setPartnerLoading(true);
    try {
      const api = partnerTab === "factory" ? factoriesApi : suppliersApi;
      const result = await api.list(1, 300, partnerKw.trim());
      setPartners(result.items as PartnerPick[]);
    } catch {
      message.error(partnerTab === "factory" ? "加载加工厂资料失败" : "加载供应商资料失败");
    } finally {
      setPartnerLoading(false);
    }
  }, [partnerKw, partnerTab]);

  useEffect(() => {
    if (partnerOpen) loadPartners();
  }, [partnerOpen, partnerTab, loadPartners]);

  const onProductionPick = (row: ProductionTrackingRow) => {
    if (prodPickFor == null) return;
    const firstProduct = productLines.find(r => r.产品货号);
    const qty = Number(row.未完成数 ?? row.计划数量 ?? 0);
    const unitPrice = Number(form.getFieldValue("单价") ?? 0);
    patchProduction(prodPickFor, {
      接单日期: fmtDate(row.日期 ?? row.下单日期),
      生产单号: row.生产单号,
      产品货号: row.款号 ?? firstProduct?.产品货号,
      产品名称: row.款式 ?? firstProduct?.产品装配名称,
      配件编号: firstProduct?.配件编号,
      产品装配名称: firstProduct?.产品装配名称 ?? row.款式,
      加工数量: qty,
      单价: unitPrice || undefined,
      金额: qty * unitPrice,
    });
    setProdPickFor(null);
    setProductLines(rows => rows.map((r, i) => (i === 0 ? { ...r, 加工数量: rows[0]?.加工数量 ?? qty } : r)));
  };

  const updatePrice = (price?: number | null) => {
    const p = Number(price ?? 0);
    form.setFieldsValue({ 单价: price ?? undefined, 金额: totalQty * p });
    setProductionLines(rows => rows.map(r => ({
      ...r,
      单价: r.生产单号 || r.产品货号 ? p : r.单价,
      金额: Number(r.加工数量 ?? 0) * (r.生产单号 || r.产品货号 ? p : Number(r.单价 ?? 0)),
    })));
  };

  useEffect(() => {
    const price = Number(form.getFieldValue("单价") ?? 0);
    form.setFieldValue("金额", totalQty * price);
  }, [form, totalQty]);

  const openDocList = async () => {
    setOpenDocModal(true);
    setOpenLoading(true);
    try {
      const rows = await assemblyPurchaseQueryApi.detail({
        起: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
        止: dayjs().format("YYYY-MM-DD"),
      });
      setOpenDocs(rows);
    } catch {
      message.error("加载装配加工单列表失败");
    } finally {
      setOpenLoading(false);
    }
  };

  const openGeneratedDoc = useCallback(async (单号?: string) => {
    if (!单号) return;
    try {
      const doc = await assemblyPurchaseQueryApi.get(单号);
      const h = doc.单头;
      form.setFieldsValue({
        供应商编号: h?.供应商编号,
        供应商名称: h?.供应商名称,
        出单日期: h?.出单日期 ? dayjs(h.出单日期) : dayjs(),
        单价: h?.单价,
        金额: h?.金额,
        收货仓库: h?.收货仓库 ?? "半成品仓",
        电脑单号: h?.电脑单号,
        客户名称: h?.客户,
        备注: h?.备注,
        开始交货日期: h?.开始交货日期 ? dayjs(h.开始交货日期) : dayjs(),
        每天交货: h?.每天交货,
        完成日期: h?.完成日期 ? dayjs(h.完成日期) : dayjs(),
        收货人: h?.收货人,
        操作员: currentUser(),
      });
      setProductLines(doc.产品明细.map(r => ({ key: nextKey(), ...r })));
      setProductionLines([
        ...doc.生产明细.map(r => ({ key: nextKey(), ...r })),
        ...blankProduction().slice(0, Math.max(0, 8 - doc.生产明细.length)),
      ]);
      setAccessoryLines(doc.辅料表.map(r => ({ key: nextKey(), 序号: r.序号 ?? 0, ...r })));
      setOpenDocModal(false);
    } catch {
      message.error("打开装配加工单失败");
    }
  }, [form]);

  useEffect(() => {
    const 单号 = searchParams.get("单号");
    if (单号) openGeneratedDoc(单号);
  }, [openGeneratedDoc, searchParams]);

  const fillLastNo = async () => {
    try {
      const rows = await assemblyPurchaseQueryApi.detail({
        起: dayjs().subtract(1, "year").format("YYYY-MM-DD"),
        止: dayjs().format("YYYY-MM-DD"),
      });
      form.setFieldValue("电脑单号", rows[0]?.单号 ?? "");
    } catch {
      message.error("读取最后号码失败");
    }
  };

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面</div></Card>;
  }

  const partnerColumns: ColumnsType<PartnerPick> = partnerTab === "factory"
    ? [
        { title: "加工厂编号", dataIndex: "加工厂编号", width: 130 },
        { title: "加工厂名称", dataIndex: "加工厂名称", width: 260 },
      ]
    : [
        { title: "供应商编号", dataIndex: "供应商编号", width: 130 },
        { title: "供应商名称", dataIndex: "供应商名称", width: 260 },
      ];

  const productColumns: ColumnsType<ProductLine> = [
    { title: "客户", dataIndex: "客户", width: 125, render: (_v, r) => <Input value={r.客户} onChange={e => patchProduct(r.key, { 客户: e.target.value })} /> },
    { title: "产品货号", dataIndex: "产品货号", width: 158, render: (_v, r) => (
      <Select
        showSearch
        allowClear
        optionFilterProp="label"
        value={r.产品货号}
        options={productOptions}
        style={{ width: 145 }}
        onChange={v => { patchProduct(r.key, { 产品货号: v }); loadProduct(v); }}
      />
    ) },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 210, render: (_v, r) => <Input value={r.产品装配名称} onChange={e => patchProduct(r.key, { 产品装配名称: e.target.value })} /> },
    { title: "配件编号", dataIndex: "配件编号", width: 105, render: (_v, r) => <Input value={r.配件编号} onChange={e => patchProduct(r.key, { 配件编号: e.target.value })} /> },
    { title: "装配方式", dataIndex: "装配方式", width: 150, render: (_v, r) => <Input value={r.装配方式} onChange={e => patchProduct(r.key, { 装配方式: e.target.value })} /> },
    { title: "加工数量", dataIndex: "加工数量", width: 110, render: (_v, r) => <InputNumber min={0} style={{ width: 96 }} value={r.加工数量} onChange={n => patchProduct(r.key, { 加工数量: n ?? undefined })} /> },
    { title: "备注", dataIndex: "备注", width: 170, render: (_v, r) => <Input value={r.备注} onChange={e => patchProduct(r.key, { 备注: e.target.value })} /> },
  ];

  const productionColumns: ColumnsType<ProductionLine> = [
    { title: "", width: 40, align: "center", render: (_v, r) => <a style={{ color: "#cf1322" }} onClick={() => setProductionLines(rows => rows.filter(x => x.key !== r.key))}>×</a> },
    { title: "接单日期", dataIndex: "接单日期", width: 105 },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (_v, r) => (
      <Input
        value={r.生产单号}
        suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setProdPickFor(r.key)} />}
        onChange={e => patchProduction(r.key, { 生产单号: e.target.value })}
      />
    ) },
    { title: "产品货号", dataIndex: "产品货号", width: 135 },
    { title: "产品名称", dataIndex: "产品名称", width: 160 },
    { title: "配件编号", dataIndex: "配件编号", width: 105 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "加工数量", dataIndex: "加工数量", width: 95, render: (_v, r) => <InputNumber min={0} style={{ width: 82 }} value={r.加工数量} onChange={n => patchProduction(r.key, { 加工数量: n ?? undefined })} /> },
    { title: "单价", dataIndex: "单价", width: 88, render: (_v, r) => <InputNumber min={0} style={{ width: 76 }} value={r.单价} onChange={n => patchProduction(r.key, { 单价: n ?? undefined })} /> },
    { title: "金额", dataIndex: "金额", width: 105, align: "right", render: (_v, r) => money(r.金额) },
  ];

  const accessoryColumns: ColumnsType<AccessoryLine> = [
    { title: "序号", dataIndex: "序号", width: 55 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 110 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 170 },
    { title: "加工总数量", dataIndex: "加工总数量", width: 105, align: "right" },
    { title: "单个产品需求量", dataIndex: "单个产品需求量", width: 130, align: "right" },
    { title: "需求数(g)", dataIndex: "需求数克", width: 95, align: "right" },
    { title: "需求数(个)", dataIndex: "需求数个", width: 95, align: "right" },
  ];

  return (
    <Card
      title="装配加工单"
      variant="borderless"
      extra={
        <Space wrap>
          <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
          <Button icon={<FolderOpenOutlined />} onClick={openDocList}>打开</Button>
          <Button icon={<SaveOutlined />} disabled onClick={() => message.warning("当前数据库没有装配加工采购单落库表，暂不能保存")}>保存</Button>
          <Button disabled>删除</Button>
          <Button disabled>前单</Button>
          <Button disabled>后单</Button>
          <Button disabled>审核</Button>
          <Button disabled>反审核</Button>
          <Button disabled>刷新清单单价</Button>
          <Button icon={<TableOutlined />} disabled>表格设置</Button>
          <Button icon={<TableOutlined />} onClick={() => rebuildAccessories(bomMaterials, totalQty)}>辅料表</Button>
          <Button icon={<PrinterOutlined />} disabled>打印</Button>
          <Button disabled>文本导出</Button>
          <Button danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={4}>
            <Form.Item label="供应商" name="供应商名称">
              <Input
                placeholder="选择供应商/加工厂"
                suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setPartnerOpen(true)} />}
              />
            </Form.Item>
            <Form.Item name="供应商编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={3}><Form.Item label="出单日期" name="出单日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item label="单价(HK$)" name="单价"><InputNumber min={0} style={{ width: "100%" }} onChange={updatePrice} /></Form.Item></Col>
          <Col span={3}><Form.Item label="金额(HK$)" name="金额"><InputNumber disabled style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}>
            <Form.Item label="收货仓库" name="收货仓库">
              <Select options={["半成品仓", "成品仓"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
          <Col span={5}><Form.Item label="电脑单号" name="电脑单号"><Input style={{ background: "#f7dede" }} /></Form.Item></Col>
          <Col span={3}><Form.Item label=" "><Button onClick={fillLastNo}>最后号码</Button></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={4}>
            <Form.Item label="客户" name="客户编号">
              <Select showSearch allowClear optionFilterProp="label" options={customerOptions} onChange={onCustomerChange} />
            </Form.Item>
          </Col>
          <Col span={5}><Form.Item label="备注" name="备注"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item label="开始交货日期" name="开始交货日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item label="每天交货" name="每天交货"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item label="完成日期" name="完成日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={4}><Form.Item label="收货人" name="收货人"><Input /></Form.Item></Col>
        </Row>
      </Form>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 0.95fr", gap: 12, alignItems: "start" }}>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={productLines}
            columns={productColumns}
            scroll={{ x: "max-content", y: 190 }}
          />
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={productionLines}
            columns={productionColumns}
            scroll={{ x: "max-content", y: 420 }}
          />
        </Space>
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={accessoryLines}
          columns={accessoryColumns}
          scroll={{ x: "max-content", y: 620 }}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 48 }}>
        <Typography.Text strong style={{ fontSize: 18, color: "#0b6b2f" }}>数 量：</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#000099" }}>{totalQty.toLocaleString()}</Typography.Text>
        <Button style={{ marginLeft: "auto" }} onClick={() => rebuildAccessories(bomMaterials, totalQty)}>装配物料表</Button>
        <Typography.Text style={{ color: "#1d39c4" }}>操作员：</Typography.Text>
        <Input value={form.getFieldValue("操作员") ?? currentUser()} disabled style={{ width: 150 }} />
      </div>

      <Modal title="选择供应商/加工厂" open={partnerOpen} footer={null} width={720} onCancel={() => setPartnerOpen(false)}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Select value={partnerTab} style={{ width: 120 }} onChange={v => setPartnerTab(v)}
            options={[{ value: "supplier", label: "供应商" }, { value: "factory", label: "加工厂" }]} />
          <Input.Search value={partnerKw} onChange={e => setPartnerKw(e.target.value)} onSearch={loadPartners}
            allowClear placeholder="编号/名称" style={{ width: 260 }} />
        </Space>
        <Table
          size="small"
          rowKey={(_, i) => `partner-${i}`}
          loading={partnerLoading}
          dataSource={partners}
          columns={partnerColumns}
          pagination={false}
          scroll={{ y: 390 }}
          onRow={r => ({ onClick: () => onPartnerPick(r), style: { cursor: "pointer" } })}
        />
      </Modal>

      <ProductionPicker open={prodPickFor != null} onPick={onProductionPick} onClose={() => setProdPickFor(null)} />

      <Modal title="打开装配加工单" open={openDocModal} footer={null} width={980} onCancel={() => setOpenDocModal(false)}>
        <Table
          size="small"
          rowKey={(_, i) => `doc-${i}`}
          loading={openLoading}
          dataSource={openDocs}
          pagination={false}
          scroll={{ x: "max-content", y: 440 }}
          onRow={r => ({ onClick: () => openGeneratedDoc(r.单号), style: { cursor: "pointer" } })}
          columns={[
            { title: "开单日期", dataIndex: "开单日期", width: 105, render: fmtDate },
            { title: "单号", dataIndex: "单号", width: 120, render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
            { title: "产品货号", dataIndex: "产品货号", width: 130 },
            { title: "配件编号", dataIndex: "配件编号", width: 110 },
            { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
            { title: "生产单号", dataIndex: "生产单号", width: 130 },
            { title: "数量", dataIndex: "数量", width: 90, align: "right" },
          ]}
        />
      </Modal>
    </Card>
  );
}
