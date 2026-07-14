import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm,
  Result, Row, Select, Space, Table, Tabs, Tag, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined, FileAddOutlined,
  FolderOpenOutlined, PlusOutlined, PrinterOutlined, SaveOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { stylesApi, type BomSave, type StyleListItem } from "../../api/styles";
import { api } from "../../api/client";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "款号资料";
const materialsApi = masterApi("materials");
const customersApi = masterApi("customers");
const suppliersApi = masterApi("suppliers");
const factoriesApi = masterApi("factories");

interface CustomerPick {
  客户编号?: string;
  客户名称?: string;
}

interface MaterialPick {
  款号?: string;
  塑胶货号?: string;
  物料编号?: string;
  物料名称?: string;
  工模编号?: string;
  规格?: string;
  物料类别?: string;
  材料?: string;
  颜色?: string;
  色粉号?: string;
  单位?: string;
  使用数量?: number | null;
  用量?: number | null;
  备注?: string;
}

interface FactoryPick {
  加工厂编号?: string;
  加工厂名称?: string;
}

interface SupplierPick {
  供应商编号?: string;
  供应商名称?: string;
  货币?: string;
}

interface MatRow {
  key: number;
  物料编号: string;
  物料名称: string;
  工模编号: string;
  规格: string;
  材料: string;
  颜色: string;
  单位: string;
  用量?: number;
  备注: string;
}

interface QuoteRow {
  key: number;
  ID?: number;
  物料编号?: string;
  物料名称?: string;
  类型: "加工厂" | "供应商";
  编号: string;
  名称: string;
  报价日期: string;
  货币: string;
  单价?: number;
  港币?: number;
  对比相差?: number;
  相差比例?: number;
  默认?: boolean;
  备注?: string;
}

interface HeaderForm {
  客户编号?: string;
  客户名称?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  共用物料编号?: string;
  日期?: Dayjs;
  装配方式?: string;
  产品装配名称?: string;
  类别?: string;
  库存单价HK?: number;
  半成品计算库存?: boolean;
  操作员?: string;
  其他成本HK?: number;
  备注?: string;
  需求用量?: number;
  单位?: string;
}

let rowSeq = 1;
let quoteSeq = 1;
const uid = () => rowSeq++;
const qid = () => quoteSeq++;

const newRow = (): MatRow => ({
  key: uid(),
  物料编号: "",
  物料名称: "",
  工模编号: "",
  规格: "",
  材料: "",
  颜色: "",
  单位: "",
  用量: undefined,
  备注: "",
});
const blankRows = (count = 8) => Array.from({ length: count }, () => newRow());
const newQuoteRow = (patch: Partial<QuoteRow> = {}): QuoteRow => ({
  key: qid(),
  类型: "供应商",
  编号: "",
  名称: "",
  报价日期: dayjs().format("YYYY-MM-DD"),
  货币: "HK$",
  ...patch,
});

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export function buildCloseTarget(returnTo: string): string;
export function buildCloseTarget(returnTo: null): number;
export function buildCloseTarget(returnTo: string | null): string | number {
  return returnTo || -1;
}

export default function BomSetupPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canAudit = can(perms, MENU, "审核");
  const canReverseAudit = can(perms, MENU, "反审核");
  const [form] = Form.useForm<HeaderForm>();
  const [sp] = useSearchParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const 款号Param = sp.get("款号");
  const returnTo = sp.get("return");
  const isAssembly = loc.pathname.includes("assembly");
  const pageTitle = isAssembly ? "装配物料设置" : "BOM物料设置";

  const currentUser = localStorage.getItem("erp_user") || "用户";
  const [loaded款号, setLoaded款号] = useState("");
  const [rows, setRows] = useState<MatRow[]>([]);
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const [audited, setAudited] = useState(false);
  const [hasExtensionData, setHasExtensionData] = useState(true);
  const [hasQuoteData, setHasQuoteData] = useState(true);
  const readOnly = audited;

  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [styles, setStyles] = useState<StyleListItem[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [openRows, setOpenRows] = useState<StyleListItem[]>([]);
  const [openKw, setOpenKw] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  const [pickRowKey, setPickRowKey] = useState<number | null>(null);
  const [pickRows, setPickRows] = useState<MaterialPick[]>([]);
  const [pickKw, setPickKw] = useState("");
  const [pickLoading, setPickLoading] = useState(false);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerTab, setPartnerTab] = useState<"factory" | "supplier">("supplier");
  const [partnerRows, setPartnerRows] = useState<(FactoryPick | SupplierPick)[]>([]);
  const [partnerKw, setPartnerKw] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerForRow, setPartnerForRow] = useState<number | null>(null);

  const patch = (key: number, p: Partial<MatRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  const patchQuote = (key: number, p: Partial<QuoteRow>) =>
    setQuoteRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));

  const reset = useCallback(() => {
    setLoaded款号("");
    setAudited(false);
    setHasExtensionData(true);
    setHasQuoteData(true);
    form.resetFields();
    form.setFieldsValue({
      日期: dayjs(),
      类别: "未包装半成品",
      库存单价HK: 0,
      需求用量: 1,
      单位: "PCS",
      操作员: currentUser,
    });
    setRows(blankRows());
    setQuoteRows([newQuoteRow()]);
  }, [currentUser, form]);

  useEffect(() => {
    if (!canOpen) return;
    (async () => {
      try {
        const [customerResult, styleResult] = await Promise.all([
          customersApi.list(1, 500, ""),
          stylesApi.list("", 1, 500),
        ]);
        setCustomers(customerResult.items as CustomerPick[]);
        setStyles(styleResult.items);
      } catch {
        message.error("加载客户/产品货号资料失败");
      }
    })();
  }, [canOpen]);

  const productOptions = useMemo(() =>
    styles
      .filter(s => s.款号)
      .map(s => ({ value: s.款号!, label: `${s.款号} ${s.款式 ?? ""}` })),
  [styles]);

  const customerOptions = useMemo(() =>
    customers
      .filter(c => c.客户编号)
      .map(c => ({ value: c.客户编号!, label: `${c.客户编号} ${c.客户名称 ?? ""}` })),
  [customers]);

  const rowsFromMaterials = (materials: MaterialPick[]) => {
    const list = materials.map(m => ({
      key: uid(),
      物料编号: m.物料编号 ?? "",
      物料名称: m.物料名称 ?? "",
      工模编号: m.工模编号 ?? "",
      规格: m.规格 ?? "",
      材料: m.材料 ?? m.物料类别 ?? "",
      颜色: m.颜色 ?? "",
      单位: m.单位 ?? "",
      用量: m.使用数量 ?? m.用量 ?? undefined,
      备注: m.备注 ?? "",
    }));
    return list.length ? [...list, newRow()] : blankRows();
  };

  const loadDoc = useCallback(async (productNo: string, preserveCustomer = false) => {
    const key = productNo.trim();
    if (!key) return;
    try {
      const full = await stylesApi.materials(key);
      const first = full.物料?.[0];
      const hasExtension = Object.prototype.hasOwnProperty.call(full, "扩展");
      const hasQuotes = Object.prototype.hasOwnProperty.call(full, "报价");
      const extension = full.扩展;
      const current = form.getFieldsValue();
      setLoaded款号(key);
      setHasExtensionData(hasExtension);
      setHasQuoteData(hasQuotes);
      setAudited(Boolean(extension?.调整审核));
      form.setFieldsValue({
        客户编号: preserveCustomer ? current.客户编号 : first?.客户编号 ?? current.客户编号,
        客户名称: preserveCustomer ? current.客户名称 : first?.客户名称 ?? current.客户名称,
        产品货号: key,
        产品名称: String(full.款式 ?? ""),
        日期: first?.日期 ? dayjs(first.日期) : current.日期 ?? dayjs(),
        ...(hasExtension ? {
          配件编号: extension?.配件编号 ?? current.配件编号,
          共用物料编号: extension?.共用物料编号 ?? current.共用物料编号,
          装配方式: extension?.装配方式 ?? current.装配方式,
          产品装配名称: extension?.产品装配名称 ?? current.产品装配名称 ?? String(full.款式 ?? ""),
          类别: extension?.类别 ?? current.类别 ?? "未包装半成品",
          库存单价HK: extension?.库存单价HK ?? current.库存单价HK ?? 0,
          半成品计算库存: extension?.半成品计算库存 ?? current.半成品计算库存 ?? false,
          其他成本HK: extension?.其他成本HK ?? current.其他成本HK,
          需求用量: extension?.需求用量 ?? current.需求用量 ?? 1,
          备注: extension?.备注内容 ?? current.备注,
        } : {}),
        单位: extension?.单位 ?? first?.单位 ?? current.单位 ?? "PCS",
        操作员: current.操作员 ?? currentUser,
      });
      setRows(rowsFromMaterials((full.物料 ?? []) as MaterialPick[]));
      if (hasQuotes) {
        const persistedQuotes = full.报价 ?? [];
        setQuoteRows(persistedQuotes.length
          ? persistedQuotes.map(q => newQuoteRow({
              ID: q.ID ?? undefined,
              物料编号: q.物料编号 ?? undefined,
              物料名称: q.物料名称 ?? undefined,
              类型: q.合作方类型 === "加工厂" ? "加工厂" : "供应商",
              编号: q.合作方编号 ?? "",
              名称: q.合作方名称 ?? "",
              报价日期: q.报价日期 ? String(q.报价日期).slice(0, 10) : "",
              货币: q.货币 ?? "HK$",
              单价: q.单价 ?? undefined,
              港币: q.港币价 ?? undefined,
              对比相差: q.对比相差 ?? undefined,
              相差比例: q.相差比例 ?? undefined,
              默认: q.是否默认 ?? false,
              备注: q.备注 ?? "",
            }))
          : [newQuoteRow()]);
      }
      setOpenModal(false);
    } catch (e) {
      message.error(errMsg(e, "产品货号不存在或加载失败"));
    }
  }, [currentUser, form]);

  useEffect(() => {
    if (款号Param) loadDoc(款号Param);
    else reset();
  }, [款号Param, loadDoc, reset]);

  const onCustomerChange = (customerNo?: string) => {
    const picked = customers.find(c => c.客户编号 === customerNo);
    form.setFieldsValue({
      客户编号: customerNo,
      客户名称: picked?.客户名称,
      产品货号: undefined,
      产品名称: undefined,
    });
    setLoaded款号("");
    setRows(blankRows());
    setQuoteRows([newQuoteRow()]);
  };

  const onProductChange = async (productNo?: string) => {
    if (!productNo) {
      form.setFieldsValue({ 产品货号: undefined, 产品名称: undefined });
      setLoaded款号("");
      setRows(blankRows());
      return;
    }
    const customerNo = form.getFieldValue("客户编号");
    if (!customerNo) {
      message.warning("请先选择客户，再选择产品货号");
      form.setFieldsValue({ 产品货号: undefined, 产品名称: undefined });
      return;
    }
    await loadDoc(productNo, true);
  };

  const loadOpenList = useCallback(async (kw: string) => {
    setOpenLoading(true);
    try {
      const r = await stylesApi.list(kw, 1, 200);
      setOpenRows(r.items);
    } catch { message.error("加载产品货号列表失败"); }
    finally { setOpenLoading(false); }
  }, []);

  const onOpen = () => { setOpenModal(true); setOpenKw(""); loadOpenList(""); };

  const loadPickList = useCallback(async (kw: string) => {
    const productNo = form.getFieldValue("产品货号")?.trim();
    if (!productNo) {
      message.warning("请先选择客户和产品货号");
      return;
    }
    setPickLoading(true);
    try {
      const [masterRows, bom] = await Promise.all([
        materialsApi.list(1, 1000, productNo),
        stylesApi.materials(productNo).catch(() => null),
      ]);
      const keyword = kw.trim().toLowerCase();
      const matchKeyword = (m: MaterialPick) => {
        const hit = `${m.物料编号 ?? ""} ${m.物料名称 ?? ""} ${m.规格 ?? ""} ${m.颜色 ?? ""} ${m.工模编号 ?? ""}`;
        return !keyword || hit.toLowerCase().includes(keyword);
      };
      const fromMaster = (masterRows.items as MaterialPick[])
        .filter(m => [m.款号, m.塑胶货号].some(v => String(v ?? "").trim() === productNo))
        .filter(matchKeyword);
      const fromBom = ((bom?.物料 ?? []) as MaterialPick[]).filter(m => {
        return matchKeyword(m);
      });
      const source = fromMaster.length ? fromMaster : fromBom;
      const dedup = new Map<string, MaterialPick>();
      for (const m of source) dedup.set(`${m.物料编号 ?? ""}|${m.物料名称 ?? ""}|${m.规格 ?? ""}`, m);
      setPickRows([...dedup.values()]);
    } catch {
      message.error("加载该货号物料失败");
    } finally {
      setPickLoading(false);
    }
  }, [form]);

  const openPicker = (rowKey: number) => {
    const customerNo = form.getFieldValue("客户编号");
    const productNo = form.getFieldValue("产品货号");
    if (!customerNo || !productNo) {
      message.warning("请先选择客户和产品货号");
      return;
    }
    setPickRowKey(rowKey);
    setPickKw("");
    loadPickList("");
  };

  const openPartnerPicker = (rowKey: number | null = null, type: "factory" | "supplier" = "supplier") => {
    setPartnerForRow(rowKey);
    setPartnerTab(type);
    setPartnerKw("");
    setPartnerOpen(true);
  };

  const choosePick = (m: MaterialPick) => {
    if (pickRowKey == null) return;
    patch(pickRowKey, {
      物料编号: m.物料编号 ?? "",
      物料名称: m.物料名称 ?? "",
      工模编号: m.工模编号 ?? "",
      规格: m.规格 ?? "",
      材料: m.材料 ?? m.物料类别 ?? "",
      颜色: m.颜色 ?? "",
      单位: m.单位 ?? "",
      用量: m.使用数量 ?? m.用量 ?? undefined,
      备注: m.备注 ?? "",
    });
    setRows(prev => (prev.some(r => !r.物料编号 && !r.物料名称) ? prev : [...prev, newRow()]));
    setPickRowKey(null);
    openPartnerPicker(pickRowKey, "supplier");
  };

  const loadPartnerList = useCallback(async () => {
    setPartnerLoading(true);
    try {
      const api = partnerTab === "factory" ? factoriesApi : suppliersApi;
      const result = await api.list(1, 300, partnerKw.trim());
      setPartnerRows(result.items as (FactoryPick | SupplierPick)[]);
    } catch {
      message.error(partnerTab === "factory" ? "加载加工厂资料失败" : "加载供应商资料失败");
    } finally {
      setPartnerLoading(false);
    }
  }, [partnerKw, partnerTab]);

  useEffect(() => {
    if (partnerOpen) loadPartnerList();
  }, [partnerOpen, partnerTab, loadPartnerList]);

  const choosePartner = (row: FactoryPick | SupplierPick) => {
    const mat = rows.find(r => r.key === partnerForRow);
    const isFactory = partnerTab === "factory";
    const quote = newQuoteRow({
      类型: isFactory ? "加工厂" : "供应商",
      编号: isFactory ? (row as FactoryPick).加工厂编号 ?? "" : (row as SupplierPick).供应商编号 ?? "",
      名称: isFactory ? (row as FactoryPick).加工厂名称 ?? "" : (row as SupplierPick).供应商名称 ?? "",
      货币: isFactory ? "HK$" : (row as SupplierPick).货币 ?? "HK$",
      物料编号: mat?.物料编号,
      物料名称: mat?.物料名称,
    });
    setQuoteRows(prev => [...prev.filter(q => q.编号 || q.名称), quote]);
    setPartnerOpen(false);
  };

  const addRow = () => setRows(rs => [...rs, newRow()]);
  const removeRow = (key: number) => setRows(rs => rs.filter(r => r.key !== key));

  const buildBody = (v: HeaderForm): BomSave => {
    const body: BomSave = {
      客户编号: v.客户编号 || undefined,
      客户名称: v.客户名称 || undefined,
      日期: v.日期 ? v.日期.format("YYYY-MM-DD") : undefined,
      单位: v.单位 || undefined,
      明细: rows
        .filter(r => r.物料编号.trim() || r.物料名称.trim())
        .map(r => ({
          物料编号: r.物料编号.trim() || null,
          物料名称: r.物料名称.trim() || null,
          物料类别: r.材料.trim() || null,
          规格: r.规格.trim() || null,
          颜色: r.颜色.trim() || null,
          单位: r.单位.trim() || null,
          使用数量: r.用量 ?? null,
          工模编号: r.工模编号.trim() || null,
          备注: r.备注.trim() || null,
        })),
    };
    if (hasExtensionData) {
      body.扩展 = {
        产品装配名称: v.产品装配名称 || undefined,
        配件编号: v.配件编号 || undefined,
        共用物料编号: v.共用物料编号 || undefined,
        装配方式: v.装配方式 || undefined,
        类别: v.类别 || undefined,
        库存单价HK: v.库存单价HK ?? null,
        其他成本HK: v.其他成本HK ?? null,
        需求用量: v.需求用量 ?? null,
        单位: v.单位 || undefined,
        半成品计算库存: !!v.半成品计算库存,
        备注内容: v.备注 || undefined,
      };
    }
    if (hasQuoteData) {
      body.报价 = quoteRows
        .filter(q => q.物料编号 || q.物料名称 || q.编号.trim() || q.名称.trim())
        .map((q, i) => ({
          ID: q.ID ?? null,
          物料编号: q.物料编号 || null,
          物料名称: q.物料名称 || null,
          合作方类型: q.类型,
          合作方编号: q.编号.trim() || null,
          合作方名称: q.名称.trim() || null,
          报价日期: q.报价日期 || null,
          货币: q.货币 || null,
          单价: q.单价 ?? null,
          港币价: q.港币 ?? null,
          对比相差: q.对比相差 ?? null,
          相差比例: q.相差比例 ?? null,
          是否默认: !!q.默认,
          顺序: i + 1,
          备注: q.备注 || null,
        }));
    }
    return body;
  };

  const save = async () => {
    if (readOnly) return;
    let v: HeaderForm;
    try { v = await form.validateFields(); }
    catch { return; }
    const key = (v.产品货号 ?? "").trim();
    if (!v.客户编号) { message.error("请先选择客户"); return; }
    if (!key) { message.error("请先选择产品货号"); return; }
    const body = buildBody(v);
    if (body.明细.length === 0) { message.error("请至少选择一行物料"); return; }
    setSaving(true);
    try {
      await stylesApi.saveMaterials(key, body);
      message.success("装配物料设置已保存");
      await loadDoc(key, true);
    } catch (e) {
      message.error(errMsg(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (readOnly) return;
    const key = loaded款号 || form.getFieldValue("产品货号");
    if (!key) return;
    try {
      await stylesApi.saveMaterials(key, { 明细: [] });
      message.success("物料设置已删除");
      reset();
    } catch (e) {
      message.error(errMsg(e, "删除失败"));
    }
  };

  const changeAudit = async () => {
    const key = loaded款号 || form.getFieldValue("产品货号");
    if (!key || (audited ? !canReverseAudit : !canAudit)) return;
    setAuditSaving(true);
    try {
      const endpoint = `/styles/${encodeURIComponent(key)}/${audited ? "reverse-audit" : "audit"}`;
      await api.post(endpoint);
      message.success(audited ? "已反审核" : "已审核");
      await loadDoc(key, true);
    } catch (e) {
      message.error(errMsg(e, audited ? "反审核失败" : "审核失败"));
    } finally {
      setAuditSaving(false);
    }
  };

  const close = () => {
    if (returnTo) navigate(buildCloseTarget(returnTo));
    else navigate(-1);
  };

  if (!canOpen) {
    return <Result status="403" title="无权限" subTitle="您没有打开「款号资料」的权限。" />;
  }

  const toolbar = (
    <Space wrap>
      {canSave && <Button disabled={readOnly} icon={<FileAddOutlined />} onClick={reset}>新建</Button>}
      <Button icon={<FolderOpenOutlined />} onClick={onOpen}>打开</Button>
      {canSave && <Button type="primary" disabled={readOnly} icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>}
      {(loaded款号 || form.getFieldValue("产品货号")) && can(perms, MENU, "删除") && (
        <Popconfirm title={`确认删除产品货号 ${loaded款号 || form.getFieldValue("产品货号")} 的全部物料设置?`} onConfirm={del}>
          <Button danger disabled={readOnly} icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
      {canAudit && !audited && <Button icon={<CheckOutlined />} loading={auditSaving} onClick={changeAudit}>审核</Button>}
      {canReverseAudit && audited && <Button icon={<CloseOutlined />} loading={auditSaving} onClick={changeAudit}>反审核</Button>}
      <Button icon={<PrinterOutlined />} onClick={() => message.info("打印功能开发中")}>打印</Button>
      <Button icon={<CloseOutlined />} onClick={close}>关闭</Button>
    </Space>
  );

  const textCol = (field: keyof MatRow, title: string, width?: number) => ({
    title, width,
    render: (_v: unknown, r: MatRow) => (
      <Input
        value={r[field] as string}
        disabled={readOnly}
        onChange={e => patch(r.key, { [field]: e.target.value } as Partial<MatRow>)}
      />
    ),
  });

  const matColumns: ColumnsType<MatRow> = [
    {
      title: "", width: 40, align: "center",
      render: (_v, r) => <a style={{ color: "#cf1322" }} onClick={() => { if (!readOnly) removeRow(r.key); }}>删</a>,
    },
    { title: "序号", width: 58, render: (_v, _r, i) => i + 1 },
    {
      title: "物料编号", width: 130,
      render: (_v, r) => <Input disabled={readOnly} value={r.物料编号} onChange={e => patch(r.key, { 物料编号: e.target.value })} />,
    },
    {
      title: "物料名称", width: 230,
      render: (_v, r) => (
         <Input.Search
           value={r.物料名称}
           disabled={readOnly}
          placeholder="点击选择该货号物料"
          onClick={() => { if (!r.物料名称) openPicker(r.key); }}
          onSearch={() => openPicker(r.key)}
          onChange={e => patch(r.key, { 物料名称: e.target.value })}
        />
      ),
    },
    textCol("工模编号", "工模编号", 120),
    textCol("规格", "规格", 130),
    textCol("材料", "材料", 120),
    textCol("颜色", "颜色", 100),
    textCol("单位", "单位", 80),
    {
      title: "用量", width: 110,
      render: (_v, r) => (
         <InputNumber
           style={{ width: "100%" }} min={0}
           disabled={readOnly}
           value={r.用量}
          onChange={n => patch(r.key, { 用量: n ?? undefined })}
        />
      ),
    },
    textCol("备注", "备注", 160),
  ];

  const quoteColumns: ColumnsType<QuoteRow> = [
    { title: "序号", width: 56, render: (_v, _r, i) => i + 1 },
    {
      title: "报价日期", dataIndex: "报价日期", width: 130,
      render: (v, r) => (
         <DatePicker
           value={v ? dayjs(String(v)) : undefined}
           style={{ width: 118 }}
           disabled={readOnly}
          onChange={d => patchQuote(r.key, { 报价日期: d ? d.format("YYYY-MM-DD") : "" })}
        />
      ),
    },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    {
      title: "加工厂/供应商", dataIndex: "名称", width: 210,
      render: (v, r) => (
         <Input.Search
           value={String(v ?? "")}
           disabled={readOnly}
          placeholder="选择"
          onSearch={() => openPartnerPicker(null, r.类型 === "加工厂" ? "factory" : "supplier")}
          onChange={e => patchQuote(r.key, { 名称: e.target.value })}
        />
      ),
    },
    {
      title: "类型", dataIndex: "类型", width: 90,
      render: (v, r) => (
         <Select
           value={v}
           disabled={readOnly}
          style={{ width: 82 }}
          options={[{ value: "供应商", label: "供应商" }, { value: "加工厂", label: "加工厂" }]}
          onChange={val => patchQuote(r.key, { 类型: val, 编号: "", 名称: "" })}
        />
      ),
    },
    {
      title: "货币", dataIndex: "货币", width: 96,
      render: (v, r) => (
         <Select
           value={v || "HK$"}
           disabled={readOnly}
          style={{ width: 86 }}
          options={["HK$", "RMB", "USD"].map(x => ({ value: x, label: x }))}
          onChange={val => patchQuote(r.key, { 货币: val })}
        />
      ),
    },
    {
      title: "单价", dataIndex: "单价", width: 110,
      render: (v, r) => <InputNumber disabled={readOnly} style={{ width: 96 }} min={0} value={v} onChange={n => patchQuote(r.key, { 单价: n ?? undefined })} />,
    },
    {
      title: "港币", dataIndex: "港币", width: 110,
      render: (v, r) => <InputNumber disabled={readOnly} style={{ width: 96 }} min={0} value={v} onChange={n => patchQuote(r.key, { 港币: n ?? undefined })} />,
    },
    {
      title: "备注", dataIndex: "备注", width: 150,
      render: (v, r) => <Input disabled={readOnly} value={v} onChange={e => patchQuote(r.key, { 备注: e.target.value })} />,
    },
    {
      title: "默认", dataIndex: "默认", width: 80, align: "center",
      render: (v, r) => (
        <a onClick={() => { if (!readOnly) setQuoteRows(qs => qs.map(q => ({ ...q, 默认: q.key === r.key }))); }}>
          {v ? <Tag color="blue">默认</Tag> : "设为默认"}
        </a>
      ),
    },
    {
      title: "", width: 60,
      render: (_v, r) => <a onClick={() => { if (!readOnly) setQuoteRows(qs => qs.filter(q => q.key !== r.key)); }}>删除</a>,
    },
  ];

  const matGrid = (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={rows}
        columns={matColumns}
        scroll={{ x: "max-content", y: 430 }}
      />
       <Button disabled={readOnly} icon={<PlusOutlined />} onClick={addRow}>添加行</Button>
    </Space>
  );

  const quoteGrid = (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Space wrap>
         <Button disabled={readOnly} onClick={() => openPartnerPicker(null, "supplier")}>选择供应商</Button>
         <Button disabled={readOnly} onClick={() => openPartnerPicker(null, "factory")}>选择加工厂</Button>
      </Space>
      <Table
        size="small"
        rowKey="key"
        pagination={false}
        dataSource={quoteRows}
        columns={quoteColumns}
        scroll={{ x: "max-content", y: 430 }}
      />
    </Space>
  );

  const partnerColumns: ColumnsType<FactoryPick | SupplierPick> = partnerTab === "factory"
    ? [
        { title: "加工厂编号", dataIndex: "加工厂编号", width: 140 },
        { title: "加工厂名称", dataIndex: "加工厂名称", width: 260 },
      ]
    : [
        { title: "供应商编号", dataIndex: "供应商编号", width: 140 },
        { title: "供应商名称", dataIndex: "供应商名称", width: 260 },
        { title: "货币", dataIndex: "货币", width: 90 },
      ];

  return (
    <Card
      title={`${pageTitle}${loaded款号 ? ` · ${loaded款号}` : "（新建）"}`}
      variant="borderless"
      extra={toolbar}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={3}>
            <Form.Item name="客户编号" label="客户" rules={[{ required: true, message: "请先选择客户" }]}>
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="选择客户"
                options={customerOptions}
                disabled={readOnly}
                onChange={onCustomerChange}
              />
            </Form.Item>
          </Col>
          <Col span={3}><Form.Item name="客户名称" label="客户名称"><Input disabled /></Form.Item></Col>
          <Col span={4}>
            <Form.Item name="产品货号" label="产品货号" rules={[{ required: true, message: "请选择产品货号" }]}>
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="先选客户，再选货号"
                options={productOptions}
                disabled={readOnly || !form.getFieldValue("客户编号")}
                onChange={onProductChange}
              />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="产品名称" label="产品名称"><Input disabled placeholder="由产品货号带出" /></Form.Item></Col>
          <Col span={3}><Form.Item name="配件编号" label="配件编号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={3}><Form.Item name="共用物料编号" label="共用物料编号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="日期" label="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={4}><Form.Item name="装配方式" label="装配方式"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={5}><Form.Item name="产品装配名称" label="产品装配名称"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}>
            <Form.Item name="类别" label="类别">
              <Select disabled={readOnly} options={["未包装半成品", "半成品", "成品"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
          <Col span={3}><Form.Item name="库存单价HK" label="库存单价(HK$)"><InputNumber disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="需求用量" label="需求用量"><InputNumber disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={2}><Form.Item name="单位" label="单位"><Input disabled={readOnly} placeholder="PCS" /></Form.Item></Col>
          <Col span={3}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={4}><Form.Item name="其他成本HK" label="其他成本(HK$)"><InputNumber disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={4}>
            <Form.Item name="半成品计算库存" label="半成品计算库存" valuePropName="checked">
              <Checkbox disabled={readOnly}>计算库存</Checkbox>
            </Form.Item>
          </Col>
          <Col span={10}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <Tabs
        items={[
          {
            key: "mat",
            label: "物料与加工厂供应商",
            children: (
              <Row gutter={12}>
                <Col span={15}>{matGrid}</Col>
                <Col span={9}>{quoteGrid}</Col>
              </Row>
            ),
          },
          { key: "img", label: "尺寸图片备注", children: <div style={{ padding: 24, color: "#999" }}>功能开发中</div> },
        ]}
      />

      <Modal title="打开产品货号" open={openModal} footer={null} width={680} onCancel={() => setOpenModal(false)}>
        <Input.Search
          placeholder="搜索产品货号/产品名称" allowClear style={{ marginBottom: 12 }}
          value={openKw} onChange={e => setOpenKw(e.target.value)}
          onSearch={v => loadOpenList(v)}
        />
        <Table
          size="small" rowKey="id" loading={openLoading} dataSource={openRows}
          pagination={false} scroll={{ y: 360 }}
          onRow={r => ({ onClick: () => r.款号 && loadDoc(r.款号), style: { cursor: "pointer" } })}
          columns={[
            { title: "产品货号", dataIndex: "款号", render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "产品名称", dataIndex: "款式" },
          ]}
        />
      </Modal>

      <Modal title="选择该货号的物料" open={pickRowKey != null} footer={null} width={980} onCancel={() => setPickRowKey(null)}>
        <Input.Search
          placeholder="搜索物料编号/物料名称/规格" allowClear style={{ marginBottom: 12, width: 320 }}
          value={pickKw} onChange={e => setPickKw(e.target.value)}
          onSearch={loadPickList}
        />
        <Table<MaterialPick>
          size="small"
          rowKey={(_, i) => `m-${i}`}
          loading={pickLoading}
          dataSource={pickRows}
          scroll={{ y: 420, x: "max-content" }}
          pagination={false}
          onRow={r => ({ onClick: () => choosePick(r), style: { cursor: "pointer" } })}
          columns={[
            { title: "款号", dataIndex: "款号", width: 120 },
            { title: "物料编号", dataIndex: "物料编号", width: 130, render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "工模编号", dataIndex: "工模编号", width: 130 },
            { title: "物料名称", dataIndex: "物料名称", width: 220 },
            { title: "规格", dataIndex: "规格", width: 140 },
            { title: "材料", dataIndex: "物料类别", width: 120 },
            { title: "颜色", dataIndex: "颜色", width: 100 },
            { title: "单位", dataIndex: "单位", width: 80 },
            { title: "用量", dataIndex: "使用数量", width: 90 },
            { title: "备注", dataIndex: "备注", width: 180 },
          ]}
        />
      </Modal>

      <Modal title="选择加工厂/供应商" open={partnerOpen} footer={null} width={720} onCancel={() => setPartnerOpen(false)}>
        <Tabs
          activeKey={partnerTab}
          onChange={k => setPartnerTab(k as "factory" | "supplier")}
          items={[
            { key: "supplier", label: "供应商" },
            { key: "factory", label: "加工厂" },
          ]}
        />
        <Input.Search
          placeholder="编号/名称" allowClear style={{ marginBottom: 12, width: 260 }}
          value={partnerKw} onChange={e => setPartnerKw(e.target.value)}
          onSearch={loadPartnerList}
        />
        <Table
          size="small"
          rowKey={(_, i) => `p-${i}`}
          loading={partnerLoading}
          dataSource={partnerRows}
          columns={partnerColumns}
          scroll={{ y: 380 }}
          pagination={false}
          onRow={r => ({ onClick: () => choosePartner(r), style: { cursor: "pointer" } })}
        />
      </Modal>
    </Card>
  );
}
