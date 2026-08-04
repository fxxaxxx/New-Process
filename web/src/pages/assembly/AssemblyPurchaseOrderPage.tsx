import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { assemblyPurchaseQueryApi } from "../../api/assemblyPurchaseQuery";
import {
  assemblyPurchaseOrderApi,
  type AssemblyPurchaseOrderHeaderRow,
  type AssemblyPurchaseOrderSave,
} from "../../api/assemblyPurchaseOrder";
import type { ProductionTrackingRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { adjacentDocNo } from "../../utils/docNav";
import { codeName } from "../../utils/codeName";
import ProductionPicker from "../materials/ProductionPicker";

const MENU = "款号资料";
const DOC_MENU = "装配加工采购单";
const currentUser = () => localStorage.getItem("erp_user") || "用户";
const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const money = (v?: number | null) => Number(v ?? 0).toFixed(2);
const errMsg = (e: unknown, fallback: string) => {
  const m = (e as { response?: { data?: { 消息?: string } } })?.response?.data?.消息;
  return m || fallback;
};

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
  const [openDocs, setOpenDocs] = useState<AssemblyPurchaseOrderHeaderRow[]>([]);
  const [openLoading, setOpenLoading] = useState(false);
  const [docNo, setDocNo] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  // 打开已保存的单后,辅料表读快照,不要被 BOM×数量 的自动重算覆盖
  const suppressRebuild = useRef(false);
  const canSaveDoc = can(perms, DOC_MENU, "保存");
  const canDeleteDoc = can(perms, DOC_MENU, "删除");
  const canApproveDoc = can(perms, DOC_MENU, "审核");
  const canUnapproveDoc = can(perms, DOC_MENU, "反审核");
  const canPrintDoc = can(perms, DOC_MENU, "打印");

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
    setDocNo(null);
    setApproved(false);
    suppressRebuild.current = false;
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
      .map(c => ({ value: c.客户编号!, label: codeName(c.客户编号, c.客户名称) })),
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
    if (suppressRebuild.current) return;
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
      suppressRebuild.current = false;
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
      const result = await assemblyPurchaseOrderApi.list(1, 200, "");
      setOpenDocs(result.items);
    } catch {
      message.error("加载装配加工单列表失败");
    } finally {
      setOpenLoading(false);
    }
  };

  const openGeneratedDoc = useCallback(async (单号?: string) => {
    if (!单号) return;
    try {
      // 优先读已落库的装配加工采购单(辅料表=BOM快照);取不到再按旧的实时展开逻辑打开
      let doc;
      let persisted = true;
      try {
        doc = await assemblyPurchaseOrderApi.get(单号);
      } catch {
        doc = await assemblyPurchaseQueryApi.get(单号);
        persisted = false;
      }
      const h = doc.单头;
      suppressRebuild.current = true;
      form.setFieldsValue({
        供应商编号: h?.供应商编号,
        供应商名称: h?.供应商名称,
        出单日期: h?.出单日期 ? dayjs(h.出单日期) : dayjs(),
        单价: h?.单价,
        金额: h?.金额,
        收货仓库: h?.收货仓库 ?? "半成品仓",
        电脑单号: h?.电脑单号 ?? h?.单号,
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
        ...doc.生产明细.map(r => ({ key: nextKey(), ...r, 接单日期: fmtDate(r.接单日期) })),
        ...blankProduction().slice(0, Math.max(0, 8 - doc.生产明细.length)),
      ]);
      setAccessoryLines(doc.辅料表.map(r => ({ key: nextKey(), 序号: r.序号 ?? 0, ...r })));
      setDocNo(persisted ? (h?.单号 ?? 单号) : null);
      setApproved(h?.审核 === "1");
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
      const result = await assemblyPurchaseOrderApi.list(1, 1, "");
      form.setFieldValue("电脑单号", result.items[0]?.单号 ?? "");
    } catch {
      message.error("读取最后号码失败");
    }
  };

  // 前单/后单：用列表端点拉已落库的装配加工采购单，按单号升序定位相邻单（口径见 utils/docNav）
  const move = async (next: boolean) => {
    if (!docNo) return;
    setSaving(true);
    try {
      const result = await assemblyPurchaseOrderApi.list(1, 1000, "");
      const target = adjacentDocNo(result.items.map(row => row.单号), docNo, next);
      if (!target) message.info(next ? "已经是最后一张单据" : "已经是第一张单据");
      else await openGeneratedDoc(target);
    } catch {
      message.error("切换单据失败");
    } finally {
      setSaving(false);
    }
  };

  const collectPayload = (): AssemblyPurchaseOrderSave => {
    const v = form.getFieldsValue();
    const 生产明细 = productionLines
      .filter(r => r.生产单号 || r.产品货号)
      .map(r => ({
        接单日期: r.接单日期 || undefined,
        生产单号: r.生产单号,
        款号: r.产品货号,
        产品名称: r.产品名称,
        配件编号: r.配件编号,
        产品装配名称: r.产品装配名称,
        加工数量: Number(r.加工数量 ?? 0),
        单价: r.单价 ?? undefined,
      }));
    const 物料明细 = accessoryLines
      .filter(r => r.辅料编号)
      .map(r => ({
        物料编号: r.辅料编号,
        物料名称: r.辅料名称,
        单位: r.需求数克 != null ? "克" : "个",
        用量: r.单个产品需求量 ?? undefined,
        需求数量: Number(r.需求数克 ?? r.需求数个 ?? 0),
      }));
    return {
      供应商编号: v.供应商编号,
      供应商名称: v.供应商名称,
      客户编号: v.客户编号,
      客户名称: v.客户名称,
      出单日期: v.出单日期?.format("YYYY-MM-DD"),
      收货仓库: v.收货仓库,
      电脑单号: v.电脑单号,
      装配方式: productLines.find(r => r.产品货号)?.装配方式,
      开始交货日期: v.开始交货日期?.format("YYYY-MM-DD"),
      每天交货: v.每天交货 ?? undefined,
      完成日期: v.完成日期?.format("YYYY-MM-DD"),
      收货人: v.收货人,
      单价: v.单价 ?? undefined,
      备注: v.备注,
      生产明细,
      物料明细,
    };
  };

  const save = async () => {
    const payload = collectPayload();
    if (payload.生产明细.length === 0 && payload.物料明细.length === 0) {
      message.warning("请先调入生产单/产品货号，再保存");
      return;
    }
    setSaving(true);
    try {
      if (docNo) {
        await assemblyPurchaseOrderApi.update(docNo, payload);
        message.success(`装配加工采购单 ${docNo} 已保存`);
      } else {
        const { 单号 } = await assemblyPurchaseOrderApi.create(payload);
        setDocNo(单号);
        setApproved(false);
        form.setFieldValue("电脑单号", 单号);
        message.success(`已保存，单号 ${单号}`);
      }
    } catch (e) {
      message.error(errMsg(e, "保存装配加工采购单失败"));
    } finally {
      setSaving(false);
    }
  };

  const removeDoc = () => {
    if (!docNo) return;
    Modal.confirm({
      title: "删除装配加工采购单",
      content: `确定删除单号 ${docNo}？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await assemblyPurchaseOrderApi.remove(docNo);
          message.success("已删除");
          reset();
        } catch (e) {
          message.error(errMsg(e, "删除失败"));
        }
      },
    });
  };

  const approveDoc = async (un: boolean) => {
    if (!docNo) return;
    try {
      if (un) {
        await assemblyPurchaseOrderApi.unapprove(docNo);
        setApproved(false);
        message.success("已反审核");
      } else {
        await assemblyPurchaseOrderApi.approve(docNo);
        setApproved(true);
        message.success("已审核");
      }
    } catch (e) {
      message.error(errMsg(e, un ? "反审核失败" : "审核失败"));
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

  const patchAccessory = (key: number, patch: Partial<AccessoryLine>) =>
    setAccessoryLines(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const accessoryColumns: ColumnsType<AccessoryLine> = [
    { title: "序号", dataIndex: "序号", width: 55 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 110 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 170 },
    { title: "加工总数量", dataIndex: "加工总数量", width: 105, align: "right" },
    { title: "单个产品需求量", dataIndex: "单个产品需求量", width: 130, align: "right" },
    { title: "需求数(g)", dataIndex: "需求数克", width: 95, align: "right", render: (_v, r) => (
      <InputNumber min={0} style={{ width: 82 }} value={r.需求数克} disabled={approved} onChange={n => patchAccessory(r.key, { 需求数克: n ?? undefined })} />
    ) },
    { title: "需求数(个)", dataIndex: "需求数个", width: 95, align: "right", render: (_v, r) => (
      <InputNumber min={0} style={{ width: 82 }} value={r.需求数个} disabled={approved} onChange={n => patchAccessory(r.key, { 需求数个: n ?? undefined })} />
    ) },
  ];

  return (
    <Card
      title="装配加工单"
      variant="borderless"
      extra={
        <Space wrap>
          <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
          <Button icon={<FolderOpenOutlined />} onClick={openDocList}>打开</Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!canSaveDoc || approved} onClick={save}>保存</Button>
          <Button disabled={!docNo || approved || !canDeleteDoc} onClick={removeDoc}>删除</Button>
          <Button disabled={!docNo || saving} onClick={() => void move(false)}>前单</Button>
          <Button disabled={!docNo || saving} onClick={() => void move(true)}>后单</Button>
          <Button disabled={!docNo || approved || !canApproveDoc} onClick={() => approveDoc(false)}>审核</Button>
          <Button disabled={!docNo || !approved || !canUnapproveDoc} onClick={() => approveDoc(true)}>反审核</Button>
          <Button disabled>刷新清单单价</Button>
          <Button icon={<TableOutlined />} disabled>表格设置</Button>
          <Button icon={<TableOutlined />} onClick={() => rebuildAccessories(bomMaterials, totalQty)}>辅料表</Button>
          <Button icon={<PrinterOutlined />} disabled={!canPrintDoc} onClick={() => window.print()}>打印</Button>
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
            { title: "开单日期", dataIndex: "日期", width: 105, render: fmtDate },
            { title: "单号", dataIndex: "单号", width: 150, render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
            { title: "客户名称", dataIndex: "客户名称", width: 140 },
            { title: "收货仓库", dataIndex: "收货仓库", width: 100 },
            { title: "数量", dataIndex: "数量", width: 90, align: "right" },
            { title: "金额", dataIndex: "金额", width: 100, align: "right", render: money },
            { title: "审核", dataIndex: "审核", width: 70, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
            { title: "操作员", dataIndex: "操作员", width: 90 },
          ]}
        />
      </Modal>
    </Card>
  );
}
