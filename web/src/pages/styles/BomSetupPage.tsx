import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  AutoComplete, Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm,
  Radio, Result, Row, Select, Space, Table, Tabs, Tag, Upload, message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined,
  FolderOpenOutlined, ImportOutlined, PlusOutlined, PrinterOutlined, SaveOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { stylesApi, type BomHeaderOption, type BomSave, type SemiOption, type StyleListItem } from "../../api/styles";
import { api } from "../../api/client";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { toDocCurrency, useFeatureSettings } from "../../auth/featureSettings";
import ImageNotesPanel from "../../components/ImageNotesPanel";
import {
  decodeCsvBuffer, parseBomImport, validateBomImportRows,
  type BomImportCheckedRow,
} from "../../utils/bomImport";

const MENU = "款号资料";
const materialsApi = masterApi("materials");
const customersApi = masterApi("customers");
const suppliersApi = masterApi("suppliers");
const factoriesApi = masterApi("factories");
// 报价类别主数据：表头 默认单价 下拉数据源
const quoteCategoriesApi = masterApi("quote-categories");

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
  类型: "本厂" | "加工厂" | "供应商";
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
  默认单价?: string;
  类型?: string;
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
const newQuoteRow = (patch: Partial<QuoteRow> = {}, defaultCurrency = "HK$"): QuoteRow => ({
  key: qid(),
  类型: "供应商",
  编号: "",
  名称: "",
  报价日期: dayjs().format("YYYY-MM-DD"),
  货币: defaultCurrency,
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
  const canEditPrices = can(perms, MENU, "单价");
  const canAudit = can(perms, MENU, "审核");
  const canReverseAudit = can(perms, MENU, "反审核");
  const [form] = Form.useForm<HeaderForm>();
  const [sp] = useSearchParams();
  const loc = useLocation();
  const navigate = useNavigate();
  // 功能设置消费: 新报价行货币默认取 系统.默认货币(HKD→HK$ 写法对齐页面选项)
  const defaultCurrency = toDocCurrency(useFeatureSettings().默认货币);
  const 款号Param = sp.get("款号");
  const returnTo = sp.get("return");
  // 排期"去建 BOM"跳转带入:品名→产品名称,客户名称→按名称匹配客户资料回填客户编号
  const 品名Param = sp.get("品名");
  const 客户Param = sp.get("客户名称");
  const isAssembly = loc.pathname.includes("assembly");
  const pageTitle = isAssembly ? "装配物料设置" : "BOM物料设置";

  const currentUser = localStorage.getItem("erp_user") || "用户";
  const [loaded款号, setLoaded款号] = useState("");
  const [rows, setRows] = useState<MatRow[]>([]);
  const [quoteRows, setQuoteRows] = useState<QuoteRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const [audited, setAudited] = useState(false);
  // BOM 台头审核状态（款号物料总表.审核='1'）及按钮提交态，仅 BOM 入口使用
  const [bomAudited, setBomAudited] = useState(false);
  const [bomAuditSaving, setBomAuditSaving] = useState(false);
  const [hasExtensionData, setHasExtensionData] = useState(false);
  const [hasQuoteData, setHasQuoteData] = useState(false);
  const readOnly = audited;

  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [styles, setStyles] = useState<StyleListItem[]>([]);
  const [bomHeaders, setBomHeaders] = useState<BomHeaderOption[]>([]);
  const watchedCustomer = Form.useWatch("客户编号", form);
  const watchedProductNo = Form.useWatch("产品货号", form);
  const [quoteCategories, setQuoteCategories] = useState<string[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [openRows, setOpenRows] = useState<StyleListItem[]>([]);
  const [openKw, setOpenKw] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<string>();
  const [copying, setCopying] = useState(false);

  const [pickRowKey, setPickRowKey] = useState<number | null>(null);
  const [pickRows, setPickRows] = useState<MaterialPick[]>([]);
  const [pickKw, setPickKw] = useState("");
  const [pickLoading, setPickLoading] = useState(false);
  const [pickTab, setPickTab] = useState<"material" | "semi">("material");
  // 物料 picker 多选勾选的行 key（格式 `m-${下标}`，与表格 rowKey 一致）
  const [pickSelectedKeys, setPickSelectedKeys] = useState<string[]>([]);
  const [semiOptions, setSemiOptions] = useState<SemiOption[]>([]);

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerTab, setPartnerTab] = useState<"factory" | "supplier">("supplier");
  const [partnerRows, setPartnerRows] = useState<(FactoryPick | SupplierPick)[]>([]);
  const [partnerKw, setPartnerKw] = useState("");
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerForRow, setPartnerForRow] = useState<number | null>(null);
  const [partnerForQuote, setPartnerForQuote] = useState<number | null>(null);
  const loadVersion = useRef(0);

  // 表格导入：粘贴 TSV / 上传 CSV → 解析校验 → 预览 → 填入明细网格
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<"paste" | "file">("paste");
  const [importText, setImportText] = useState("");
  const [importRows, setImportRows] = useState<BomImportCheckedRow[]>([]);
  const [importHasHeader, setImportHasHeader] = useState(false);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importMaster, setImportMaster] = useState<Map<string, MaterialPick> | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const patch = (key: number, p: Partial<MatRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  const patchQuote = (key: number, p: Partial<QuoteRow>) => {
    if (isAssembly) setHasQuoteData(true);
    setQuoteRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  };

  const reset = useCallback(() => {
    loadVersion.current += 1;
    setLoaded款号("");
    setAudited(false);
    setBomAudited(false);
    setHasExtensionData(false);
    setHasQuoteData(false);
    form.resetFields();
    form.setFieldsValue({
      日期: dayjs(),
      类别: "未包装半成品",
      库存单价HK: 0,
      需求用量: 1,
      单位: "PCS",
      类型: "明细",
      操作员: currentUser,
    });
    setRows(blankRows());
    setQuoteRows([]);
    setPartnerForRow(null);
    setPartnerForQuote(null);
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
        // 款号→客户的归属(BOM 单头),用于产品货号下拉按客户过滤;失败降级为不过滤
        stylesApi.bomHeaders().then(setBomHeaders).catch(() => {});
      } catch {
        message.error("加载客户/产品货号资料失败");
      }
      // 报价类别（默认单价下拉）：失败时静默降级为无选项，仍可保存空值
      try {
        const r = await quoteCategoriesApi.list(1, 1000, "");
        const names = r.items
          .map(c => String(c.类别 ?? c.名称 ?? "").trim())
          .filter(Boolean);
        setQuoteCategories([...new Set(names)]);
      } catch { /* 类别加载失败时保持空选项 */ }
    })();
    // 已设置的半成品款号：BOM 明细可调入下级半成品（接口缺失/失败时静默降级为不可选）
    stylesApi.semiOptions?.().then(list => setSemiOptions(list ?? [])).catch(() => {});
  }, [canOpen]);

  // 半成品判定集（与后端一致）：编号在 半成品共用物料设置.产品货号 中即为半成品行
  const semiSet = useMemo(() => new Set(semiOptions.map(s => s.款号)), [semiOptions]);

  const filteredSemiOptions = useMemo(() => {
    const kw = pickKw.trim().toLowerCase();
    if (!kw) return semiOptions;
    return semiOptions.filter(s =>
      `${s.款号} ${s.款式 ?? ""} ${s.类别 ?? ""}`.toLowerCase().includes(kw));
  }, [semiOptions, pickKw]);

  const productOptions = useMemo(() => {
    // 选中客户后,下拉只列该客户的款号(按 BOM 单头客户编号判断);未建过 BOM 的款号不限客户,仍可选用
    const list = watchedCustomer
      ? styles.filter(s => {
          const h = bomHeaders.find(b => b.款号 === s.款号);
          return !h || !h.客户编号 || h.客户编号 === watchedCustomer;
        })
      : styles;
    return list
      .filter(s => s.款号)
      .map(s => ({ value: s.款号!, label: `${s.款号} ${s.款式 ?? ""}` }));
  }, [styles, bomHeaders, watchedCustomer]);

  const customerOptions = useMemo(() =>
    customers
      .filter(c => c.客户编号)
      .map(c => ({ value: c.客户编号!, label: c.客户名称 ?? c.客户编号! })),
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
    const requestVersion = ++loadVersion.current;
    try {
      const full = await stylesApi.materials(key);
      if (requestVersion !== loadVersion.current) return;
      const first = full.物料?.[0];
      const hasExtension = isAssembly
        && Object.prototype.hasOwnProperty.call(full, "扩展")
        && full.扩展 != null;
      const hasQuotes = isAssembly
        && Object.prototype.hasOwnProperty.call(full, "报价")
        && Array.isArray(full.报价);
      const extension = full.扩展;
      // 单头=款号物料总表台头行；老数据为 null 时回落"第一行物料"水合（默认单价/类型给默认）
      const head = full.单头 ?? null;
      const doc日期 = head?.日期 ?? first?.日期;
      const current = form.getFieldsValue();
      setLoaded款号(key);
      setHasExtensionData(hasExtension);
      setHasQuoteData(hasQuotes);
      setAudited(hasExtension && Boolean(extension?.调整审核));
      // BOM 台头审核状态：单头.审核='1' 为已审核（无台头视为未审核）
      setBomAudited(head?.审核 === "1");
      form.setFieldsValue({
        客户编号: preserveCustomer ? current.客户编号 : head?.客户编号 ?? first?.客户编号 ?? current.客户编号,
        客户名称: preserveCustomer ? current.客户名称 : head?.客户名称 ?? first?.客户名称 ?? current.客户名称,
        产品货号: key,
        产品名称: String(full.款式 ?? ""),
        日期: doc日期 ? dayjs(doc日期) : current.日期 ?? dayjs(),
        配件编号: hasExtension ? extension?.配件编号 ?? undefined : undefined,
        共用物料编号: hasExtension ? extension?.共用物料编号 ?? undefined : undefined,
        装配方式: hasExtension ? extension?.装配方式 ?? undefined : undefined,
        产品装配名称: hasExtension ? extension?.产品装配名称 ?? String(full.款式 ?? "") : undefined,
        类别: hasExtension ? extension?.类别 ?? "未包装半成品" : undefined,
        库存单价HK: hasExtension ? extension?.库存单价HK ?? undefined : undefined,
        半成品计算库存: hasExtension ? extension?.半成品计算库存 ?? false : undefined,
        其他成本HK: hasExtension ? extension?.其他成本HK ?? undefined : undefined,
        需求用量: hasExtension ? extension?.需求用量 ?? 1 : undefined,
        备注: hasExtension ? extension?.备注内容 ?? undefined : undefined,
        单位: hasExtension ? extension?.单位 ?? head?.单位 ?? first?.单位 ?? "PCS" : head?.单位 ?? first?.单位 ?? "PCS",
        默认单价: head?.默认单价 ?? undefined,
        类型: head?.类型 ?? "明细",
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
              类型: q.合作方类型 === "加工厂" ? "加工厂" : q.合作方类型 === "本厂" ? "本厂" : "供应商",
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
          : []);
      } else {
        setQuoteRows([]);
      }
      setPartnerForRow(null);
      setPartnerForQuote(null);
      setOpenModal(false);
    } catch (e) {
      if (requestVersion === loadVersion.current) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          // 货号尚未建 BOM(排期页"去建 BOM"跳转/手输新款号):预填已知信息,录入物料后直接保存即建档
          form.setFieldsValue({ 产品货号: key, 产品名称: 品名Param || undefined });
          message.info(`货号 ${key} 尚未建 BOM,录入物料后直接保存即可建档`);
        } else {
          message.error(errMsg(e, "产品货号不存在或加载失败"));
        }
      }
    }
  }, [currentUser, form, isAssembly]);

  useEffect(() => {
    if (款号Param) loadDoc(款号Param);
    else reset();
  }, [款号Param, loadDoc, reset]);

  // 排期"去建 BOM"带入的客户名称:客户资料加载后按名称/编号匹配,回填客户编号(选中后客户名称自动带出)
  useEffect(() => {
    const name = 客户Param?.trim();
    if (!name || form.getFieldValue("客户编号")) return;
    const hit = customers.find(c => c.客户名称 === name || c.客户编号 === name);
    if (hit) form.setFieldsValue({ 客户编号: hit.客户编号, 客户名称: hit.客户名称 });
  }, [customers, 客户Param, form]);

  // 客户与产品货号已解除级联：客户独立赋值，不再清空货号/明细
  const onCustomerChange = (customerNo?: string) => {
    const picked = customers.find(c => c.客户编号 === customerNo);
    form.setFieldsValue({
      客户编号: customerNo,
      客户名称: picked?.客户名称,
    });
  };

  // 清空产品货号 → 回到新建态
  const clearProduct = () => {
    loadVersion.current += 1;
    form.setFieldsValue({ 产品货号: undefined, 产品名称: undefined });
    setLoaded款号("");
    setRows(blankRows());
    setQuoteRows([]);
    setHasExtensionData(false);
    setHasQuoteData(false);
    setBomAudited(false);
  };

  // 选中款号（下拉选择/手输确认）：款式从款号总表带出到产品名称，再按现有逻辑载入该货号 BOM
  const pickProduct = async (productNo: string) => {
    const key = productNo.trim();
    if (!key) { clearProduct(); return; }
    const matched = styles.find(s => s.款号 === key);
    if (matched) form.setFieldsValue({ 产品名称: matched.款式 ?? "" });
    await loadDoc(key);
  };

  // 手输货号失焦时确认载入（与当前已载货号相同则不重复请求）
  const onProductBlur = () => {
    const v = String(form.getFieldValue("产品货号") ?? "").trim();
    if (!v) { clearProduct(); return; }
    if (v !== loaded款号) void pickProduct(v);
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
      message.warning("请先选择产品货号");
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
      // 数据刷新后行下标可能变化，清空多选勾选避免错位
      setPickSelectedKeys([]);
    } catch {
      message.error("加载该货号物料失败");
    } finally {
      setPickLoading(false);
    }
  }, [form]);

  const openPicker = (rowKey: number) => {
    const productNo = form.getFieldValue("产品货号");
    if (!productNo) {
      message.warning("请先选择产品货号");
      return;
    }
    setPickRowKey(rowKey);
    setPickKw("");
    setPickTab("material");
    setPickSelectedKeys([]);
    loadPickList("");
  };

  const openPartnerPicker = (
    rowKey: number | null = null,
    type: "factory" | "supplier" = "supplier",
    quoteKey: number | null = null,
  ) => {
    setPartnerForRow(rowKey);
    setPartnerForQuote(quoteKey);
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
    setPickSelectedKeys([]);
    openPartnerPicker(pickRowKey, "supplier");
  };

  // 多选加入：按勾选顺序一次性把多个物料加入明细；字段映射与单行加入一致，但用量留空待填
  const choosePickMulti = () => {
    if (pickRowKey == null || !pickSelectedKeys.length) return;
    const picked = pickRows.filter((_, i) => pickSelectedKeys.includes(`m-${i}`));
    if (!picked.length) { message.warning("请先勾选要加入的物料"); return; }
    const added: MatRow[] = picked.map(m => ({
      key: uid(),
      物料编号: m.物料编号 ?? "",
      物料名称: m.物料名称 ?? "",
      工模编号: m.工模编号 ?? "",
      规格: m.规格 ?? "",
      材料: m.材料 ?? m.物料类别 ?? "",
      颜色: m.颜色 ?? "",
      单位: m.单位 ?? "",
      用量: undefined, // 多选加入时用量留空待填
      备注: m.备注 ?? "",
    }));
    setRows(prev => {
      const next = [...prev];
      const idx = next.findIndex(r => r.key === pickRowKey);
      // 触发行（点放大镜的行）为空时用它承载第一条勾选物料，其余插到其后；否则整体追加到末尾
      if (idx >= 0 && !next[idx].物料编号 && !next[idx].物料名称) {
        next.splice(idx, 1, ...added);
      } else {
        next.push(...added);
      }
      return next.some(r => !r.物料编号 && !r.物料名称) ? next : [...next, newRow()];
    });
    message.success(`已加入 ${added.length} 行物料`);
    setPickRowKey(null);
    setPickSelectedKeys([]);
  };

  // 调入下级半成品：行内存款号，用量默认取半成品的需求用量（可手工改）；半成品无需选供应商
  const chooseSemi = (s: SemiOption) => {
    if (pickRowKey == null) return;
    patch(pickRowKey, {
      物料编号: s.款号,
      物料名称: s.款式 ?? "",
      工模编号: "",
      规格: "",
      材料: s.类别 ?? "半成品",
      颜色: "",
      单位: s.单位 ?? "",
      用量: s.需求用量 ?? 1,
      备注: "",
    });
    setRows(prev => (prev.some(r => !r.物料编号 && !r.物料名称) ? prev : [...prev, newRow()]));
    setPickRowKey(null);
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
    const isFactory = partnerTab === "factory";
    const 编号 = isFactory ? (row as FactoryPick).加工厂编号 ?? "" : (row as SupplierPick).供应商编号 ?? "";
    const 名称 = isFactory ? (row as FactoryPick).加工厂名称 ?? "" : (row as SupplierPick).供应商名称 ?? "";
    const 货币 = isFactory ? defaultCurrency : (row as SupplierPick).货币 ?? defaultCurrency;
    if (partnerForQuote != null) {
      if (isAssembly) setHasQuoteData(true);
      setQuoteRows(prev => prev.map(q => q.key === partnerForQuote
        ? { ...q, 类型: isFactory ? "加工厂" : "供应商", 编号, 名称, 货币 }
        : q));
      setPartnerOpen(false);
      setPartnerForQuote(null);
      setPartnerForRow(null);
      return;
    }
    const mat = rows.find(r => r.key === partnerForRow);
    const quote = newQuoteRow({
      类型: isFactory ? "加工厂" : "供应商",
      编号,
      名称,
      货币,
      物料编号: mat?.物料编号,
      物料名称: mat?.物料名称,
    }, defaultCurrency);
    if (isAssembly) setHasQuoteData(true);
    setQuoteRows(prev => [...prev.filter(q => q.物料编号 || q.物料名称 || q.编号 || q.名称), quote]);
    setPartnerOpen(false);
    setPartnerForRow(null);
  };

  const addRow = () => setRows(rs => [...rs, newRow()]);
  const removeRow = (key: number) => setRows(rs => rs.filter(r => r.key !== key));
  // 在当前行下方（index+1 处）插入一行空行，结构与"添加行"一致
  const insertRow = (index: number) =>
    setRows(rs => {
      const next = [...rs];
      next.splice(index + 1, 0, newRow());
      return next;
    });

  // 打开导入弹窗：一次性全量拉取物料档案建 Map 供逐行校验
  const openImport = async () => {
    if (!loaded款号) { message.warning("请先打开产品货号"); return; }
    setImportTab("paste");
    setImportText("");
    setImportRows([]);
    setImportHasHeader(false);
    setImportMode("append");
    setImportOpen(true);
    if (importMaster) return;
    setImportLoading(true);
    try {
      const r = await materialsApi.list(1, 1000, "");
      const map = new Map<string, MaterialPick>();
      for (const m of r.items as MaterialPick[]) {
        const code = (m.物料编号 ?? "").replace(/\s/g, "");
        if (code && !map.has(code)) map.set(code, m);
      }
      setImportMaster(map);
    } catch {
      message.error("加载物料档案失败，无法校验导入数据");
    } finally {
      setImportLoading(false);
    }
  };

  const applyImportText = (text: string) => {
    if (!text.trim()) { setImportRows([]); setImportHasHeader(false); return; }
    const { rows: parsed, hasHeader } = parseBomImport(text);
    setImportHasHeader(hasHeader);
    setImportRows(validateBomImportRows(parsed, importMaster ?? new Map()));
  };

  const readImportFile = async (file: File) => {
    try {
      const text = decodeCsvBuffer(await file.arrayBuffer());
      setImportText(text);
      applyImportText(text);
    } catch {
      message.error("读取文件失败");
    }
  };

  const importValidCount = importRows.filter(r => !r.错误).length;

  const doImport = () => {
    const valid = importRows.filter(r => !r.错误);
    const skipped = importRows.length - valid.length;
    if (!valid.length) { message.warning("没有可导入的有效行"); return; }
    const imported: MatRow[] = valid.map(r => ({
      key: uid(),
      物料编号: r.物料编号,
      物料名称: r.material?.物料名称 ?? r.物料名称 ?? "",
      工模编号: r.material?.工模编号 ?? "",
      规格: r.material?.规格 ?? r.规格 ?? "",
      材料: r.material?.材料 ?? r.material?.物料类别 ?? "",
      颜色: r.material?.颜色 ?? r.颜色 ?? "",
      单位: r.material?.单位 ?? r.单位 ?? "",
      用量: r.使用数量,
      备注: "",
    }));
    setRows(prev => {
      const base = importMode === "replace"
        ? []
        : prev.filter(r => r.物料编号.trim() || r.物料名称.trim());
      const merged = [...base, ...imported];
      return merged.some(r => !r.物料编号 && !r.物料名称) ? merged : [...merged, newRow()];
    });
    message.success(`已导入 ${valid.length} 行${skipped ? `，跳过 ${skipped} 行无效数据` : ""}，请检查后保存`);
    setImportOpen(false);
  };

  const buildBody = (v: HeaderForm): BomSave => {
    const body: BomSave = {
      客户编号: v.客户编号 || undefined,
      客户名称: v.客户名称 || undefined,
      日期: v.日期 ? v.日期.format("YYYY-MM-DD") : undefined,
      单位: v.单位 || undefined,
      默认单价: v.默认单价 || undefined,
      类型: v.类型 || "明细",
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
        库存单价HK: canEditPrices ? v.库存单价HK ?? null : null,
        其他成本HK: canEditPrices ? v.其他成本HK ?? null : null,
        需求用量: v.需求用量 ?? null,
        单位: v.单位 || undefined,
        半成品计算库存: !!v.半成品计算库存,
        备注内容: v.备注 || undefined,
      };
    }
    if (hasQuoteData) {
      body.报价 = quoteRows
        .filter(q => q.物料编号 || q.物料名称 || q.编号.trim() || q.名称.trim() || q.类型 === "本厂")
        .map((q, i) => ({
          ID: q.ID ?? null,
          物料编号: q.物料编号 || null,
          物料名称: q.物料名称 || null,
          合作方类型: q.类型,
          合作方编号: q.类型 === "本厂" ? null : q.编号.trim() || null,
          合作方名称: q.类型 === "本厂" ? null : q.名称.trim() || null,
          报价日期: q.报价日期 || null,
          货币: q.货币 || null,
          单价: canEditPrices ? q.单价 ?? null : null,
          港币价: canEditPrices ? q.港币 ?? null : null,
          对比相差: canEditPrices ? q.对比相差 ?? null : null,
          相差比例: canEditPrices ? q.相差比例 ?? null : null,
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
    if (!key) { message.error("请先选择产品货号"); return; }
    const body = buildBody(v);
    if (body.明细.length === 0) { message.error("请至少选择一行物料"); return; }
    setSaving(true);
    try {
      const res = await stylesApi.saveMaterials(key, body);
      message.success("装配物料设置已保存");
      // 后端警告（既调半成品又直接列其组成物料 → 重复扣料风险）：提示但不阻止
      const warns = (res as { data?: { 警告?: string[] } } | undefined)?.data?.警告;
      if (Array.isArray(warns) && warns.length > 0) {
        Modal.warning?.({
          title: "已保存，但存在重复扣料风险",
          content: (
            <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
              {warns.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          ),
        });
      }
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

  const openCopy = () => {
    if (!loaded款号) { message.warning("请先打开要复制的产品货号"); return; }
    setCopyTarget(undefined);
    setCopyOpen(true);
  };

  const doCopy = async (覆盖 = false) => {
    const source = loaded款号.trim();
    const target = (copyTarget ?? "").trim();
    if (!source) { message.warning("请先打开要复制的产品货号"); return; }
    if (!target) { message.warning("请选择目标产品货号"); return; }
    if (target === source) { message.warning("目标产品货号不能与源货号相同"); return; }
    setCopying(true);
    try {
      await stylesApi.copyBom(source, { 目标款号: target, 覆盖 });
      message.success(`已复制到 ${target}`);
      setCopyOpen(false);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      const msg = errMsg(e, "复制失败，请重试");
      if (status === 409 && msg.includes("已有 BOM")) {
        Modal.confirm({
          title: "目标货号已有 BOM",
          content: `${target} 已有 BOM 物料明细，确认覆盖？`,
          okText: "覆盖",
          cancelText: "取消",
          onOk: () => doCopy(true),
        });
      } else {
        message.error(msg);
      }
    } finally {
      setCopying(false);
    }
  };

  const changeAudit = async () => {
    if (!isAssembly) return;
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

  // BOM 入口审核/反审核：翻转 款号物料总表.审核（与装配入口的 调整审核 互不影响）
  const changeBomAudit = async () => {
    if (isAssembly) return;
    const key = loaded款号 || form.getFieldValue("产品货号");
    if (!key || (bomAudited ? !canReverseAudit : !canAudit)) return;
    setBomAuditSaving(true);
    try {
      if (bomAudited) await stylesApi.bomReverseAudit(key);
      else await stylesApi.bomAudit(key);
      message.success(bomAudited ? "已反审核" : "已审核");
      await loadDoc(key, true);
    } catch (e) {
      message.error(errMsg(e, bomAudited ? "BOM反审核失败" : "BOM审核失败"));
    } finally {
      setBomAuditSaving(false);
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
      {canSave && <Button icon={<CopyOutlined />} disabled={!loaded款号} onClick={openCopy}>复制单</Button>}
      {canSave && <Button icon={<ImportOutlined />} disabled={readOnly || !loaded款号} onClick={openImport}>导入</Button>}
      {isAssembly && canAudit && !audited && <Button icon={<CheckOutlined />} loading={auditSaving} onClick={changeAudit}>审核</Button>}
      {isAssembly && canReverseAudit && audited && <Button icon={<CloseOutlined />} loading={auditSaving} onClick={changeAudit}>反审核</Button>}
      {/* BOM 入口审核 BOM 台头（款号物料总表.审核），文案加 BOM 前缀与装配审核区分 */}
      {!isAssembly && canAudit && !bomAudited && (
        <Button icon={<CheckOutlined />} loading={bomAuditSaving} onClick={changeBomAudit} title="审核 BOM 台头（款号物料总表）">BOM审核</Button>
      )}
      {!isAssembly && canReverseAudit && bomAudited && (
        <Button icon={<CloseOutlined />} loading={bomAuditSaving} onClick={changeBomAudit} title="反审核 BOM 台头（款号物料总表）">BOM反审核</Button>
      )}
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>
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
      title: "", width: 84, align: "center",
      render: (_v, r, i) => (
        <Space size={8}>
          {/* 在该行下方插入一行空行 */}
          <a onClick={() => { if (!readOnly) insertRow(i); }}>插入</a>
          <a style={{ color: "#cf1322" }} onClick={() => { if (!readOnly) removeRow(r.key); }}>删</a>
        </Space>
      ),
    },
    { title: "序号", width: 58, render: (_v, _r, i) => i + 1 },
    {
      title: "物料编号", width: 180,
      render: (_v, r) => <Input disabled={readOnly} value={r.物料编号} onChange={e => patch(r.key, { 物料编号: e.target.value })} />,
    },
    {
      title: "物料名称", width: 300,
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
    textCol("工模编号", "工模编号", 140),
    textCol("规格", "规格", 150),
    textCol("材料", "材料", 140),
    textCol("颜色", "颜色", 120),
    textCol("单位", "单位", 90),
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
    textCol("备注", "备注", 220),
    {
      title: "", width: 76, align: "center",
      render: (_v, r) => (r.物料编号.trim() && semiSet.has(r.物料编号.trim())
        ? <Tag color="purple">半成品</Tag>
        : null),
    },
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
           disabled={readOnly || r.类型 === "本厂"}
          placeholder={r.类型 === "本厂" ? "本厂无需选择" : "选择"}
          data-role="quote-partner"
          onSearch={() => { if (r.类型 !== "本厂") openPartnerPicker(null, r.类型 === "加工厂" ? "factory" : "supplier", r.key); }}
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
          options={[{ value: "本厂", label: "本厂" }, { value: "供应商", label: "供应商" }, { value: "加工厂", label: "加工厂" }]}
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
      render: (v, r) => canEditPrices
        ? <InputNumber data-price-field="quote-unit-price" disabled={readOnly} style={{ width: 96 }} min={0} value={v} onChange={n => patchQuote(r.key, { 单价: n ?? undefined })} />
        : <Input data-price-field="quote-unit-price" disabled value="***" style={{ width: 96 }} />,
    },
    {
      title: "港币", dataIndex: "港币", width: 110,
      render: (v, r) => canEditPrices
        ? <InputNumber data-price-field="quote-hkd-price" disabled={readOnly} style={{ width: 96 }} min={0} value={v} onChange={n => patchQuote(r.key, { 港币: n ?? undefined })} />
        : <Input data-price-field="quote-hkd-price" disabled value="***" style={{ width: 96 }} />,
    },
    {
      title: "备注", dataIndex: "备注", width: 150,
      render: (v, r) => <Input disabled={readOnly} value={v} onChange={e => patchQuote(r.key, { 备注: e.target.value })} />,
    },
    {
      title: "默认", dataIndex: "默认", width: 80, align: "center",
      render: (v, r) => (
        <a onClick={() => {
          if (!readOnly) {
            if (isAssembly) setHasQuoteData(true);
            setQuoteRows(qs => qs.map(q => ({ ...q, 默认: q.key === r.key })));
          }
        }}>
          {v ? <Tag color="blue">默认</Tag> : "设为默认"}
        </a>
      ),
    },
    {
      title: "", width: 60,
      render: (_v, r) => <a onClick={() => {
        if (!readOnly) {
          if (isAssembly) setHasQuoteData(true);
          setQuoteRows(qs => qs.filter(q => q.key !== r.key));
        }
      }}>删除</a>,
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
      <Form
        form={form}
        layout="vertical"
        size="small"
        onValuesChange={(changed: Partial<HeaderForm>) => {
          if (isAssembly && Object.keys(changed).some(field => [
            "配件编号", "共用物料编号", "装配方式", "产品装配名称", "类别",
            "库存单价HK", "其他成本HK", "需求用量", "单位", "半成品计算库存", "备注",
          ].includes(field))) setHasExtensionData(true);
        }}
      >
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="客户编号" label="客户">
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="选择客户（可选）"
                options={customerOptions}
                disabled={readOnly}
                onChange={onCustomerChange}
              />
            </Form.Item>
          </Col>
          {/* 客户名称不单独占格：下拉已显示“编号+名称”，此处仅保持表单字段注册供保存取值 */}
          <Form.Item name="客户名称" hidden><Input /></Form.Item>
          {/* 产品货号宽度随内容长短自适应（ch 计字符宽，预留清除按钮与内边距），不再截断 */}
          <Col style={{ width: `min(max(${(String(watchedProductNo ?? "").length || 14) + 4}ch, 180px), 45%)` }}>
            <Form.Item name="产品货号" label="产品货号" rules={[{ required: true, message: "请选择产品货号" }]}>
              <AutoComplete
                allowClear
                placeholder="直接录入或选择产品货号"
                style={{ width: "100%" }}
                options={productOptions}
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                disabled={readOnly}
                onChange={v => { if (!v) clearProduct(); }}
                onSelect={v => void pickProduct(String(v))}
                onBlur={onProductBlur}
              />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="产品名称" label="产品名称"><Input disabled={readOnly} placeholder="由产品货号带出" /></Form.Item></Col>
          {isAssembly && <Col span={3}><Form.Item name="配件编号" label="配件编号"><Input disabled={readOnly} /></Form.Item></Col>}
          {isAssembly && <Col span={3}><Form.Item name="共用物料编号" label="共用物料编号"><Input disabled={readOnly} /></Form.Item></Col>}
          <Col span={4}><Form.Item name="日期" label="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          {isAssembly && <Col span={4}><Form.Item name="装配方式" label="装配方式"><Input disabled={readOnly} /></Form.Item></Col>}
          {isAssembly && <Col span={5}><Form.Item name="产品装配名称" label="产品装配名称"><Input disabled={readOnly} /></Form.Item></Col>}
          {isAssembly && (
            <Col span={4}>
              <Form.Item name="类别" label="类别">
                <Select disabled={readOnly} options={["未包装半成品", "半成品", "成品"].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
          )}
          {isAssembly && (
            <Col span={3}>
              {canEditPrices
                ? <Form.Item name="库存单价HK" label="库存单价(HK$)"><InputNumber data-price-field="extension-inventory-price" disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item>
                : <Form.Item label="库存单价(HK$)"><Input data-price-field="extension-inventory-price" disabled value="***" /></Form.Item>}
            </Col>
          )}
          {isAssembly && <Col span={3}><Form.Item name="需求用量" label="需求用量"><InputNumber disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item></Col>}
          <Col span={2}><Form.Item name="单位" label="单位"><Input disabled={readOnly} placeholder="PCS" /></Form.Item></Col>
          <Col span={3}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          {isAssembly && (
            <Col span={4}>
              {canEditPrices
                ? <Form.Item name="其他成本HK" label="其他成本(HK$)"><InputNumber data-price-field="extension-other-cost" disabled={readOnly} min={0} style={{ width: "100%" }} /></Form.Item>
                : <Form.Item label="其他成本(HK$)"><Input data-price-field="extension-other-cost" disabled value="***" /></Form.Item>}
            </Col>
          )}
          {isAssembly && (
            <Col span={4}>
              <Form.Item name="半成品计算库存" label="半成品计算库存" valuePropName="checked">
                <Checkbox disabled={readOnly}>计算库存</Checkbox>
              </Form.Item>
            </Col>
          )}
          <Col span={3}>
            <Form.Item name="默认单价" label="默认单价">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="默认单价(HK)"
                disabled={readOnly}
                options={quoteCategories.map(c => ({ value: c, label: c }))}
              />
            </Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="类型" label="类型">
              <Select disabled={readOnly} options={["明细", "汇总"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
          {/* BOM 台头审核状态（仅 BOM 入口展示；新建无台头也按未审核显示） */}
          {!isAssembly && (
            <Col span={2}>
              <Form.Item label="审核状态">
                {bomAudited ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}
              </Form.Item>
            </Col>
          )}
          <Col span={isAssembly ? 10 : 8}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <Tabs
        items={[
          {
            key: "mat",
            label: "物料与加工厂供应商",
            children: (
              // 上下排列：物料表全宽，报价/供应商面板放下方
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {matGrid}
                {quoteGrid}
              </Space>
            ),
          },
          { key: "img", label: "尺寸图片备注", children: <ImageNotesPanel 模块="BOM" 单号={loaded款号} canEdit={canSave} emptyHint="请先打开一个产品货号" /> },
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

      <Modal
        title={`复制单 · ${loaded款号}`}
        open={copyOpen}
        okText="复制"
        cancelText="取消"
        confirmLoading={copying}
        onOk={() => doCopy(false)}
        onCancel={() => setCopyOpen(false)}
      >
        <Form layout="vertical" size="small" style={{ marginTop: 12 }}>
          <Form.Item label="目标产品货号" required>
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="选择目标产品货号"
              options={productOptions.filter(o => o.value !== loaded款号)}
              value={copyTarget}
              onChange={v => setCopyTarget(v)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="选择该货号的物料/下级半成品" open={pickRowKey != null} footer={null} width={980} onCancel={() => { setPickRowKey(null); setPickSelectedKeys([]); }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            placeholder="搜索物料编号/物料名称/规格" allowClear style={{ width: 320 }}
            value={pickKw} onChange={e => setPickKw(e.target.value)}
            onSearch={v => { if (pickTab === "semi") setPickKw(v); else loadPickList(v); }}
          />
          {/* 多选加入：仅"物料"页签可用，把勾选的物料一次性追加进 BOM 明细（单击行仍是单行加入） */}
          {pickTab === "material" && (
            <Button type="primary" disabled={!pickSelectedKeys.length} onClick={choosePickMulti}>
              多选加入{pickSelectedKeys.length ? `（${pickSelectedKeys.length}）` : ""}
            </Button>
          )}
        </Space>
        <Tabs
          activeKey={pickTab}
          onChange={k => setPickTab(k as "material" | "semi")}
          items={[
            {
              key: "material",
              label: "物料",
              children: (
                <Table<MaterialPick>
                  size="small"
                  rowKey={(_, i) => `m-${i}`}
                  loading={pickLoading}
                  dataSource={pickRows}
                  scroll={{ y: 420, x: "max-content" }}
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys: pickSelectedKeys,
                    onChange: keys => setPickSelectedKeys(keys.map(String)),
                  }}
                  onRow={r => ({
                    onClick: e => {
                      // 点击多选 checkbox 单元格时不触发单行加入，只改变勾选状态
                      if ((e.target as HTMLElement).closest(".ant-table-selection-column")) return;
                      choosePick(r);
                    },
                    style: { cursor: "pointer" },
                  })}
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
              ),
            },
            {
              key: "semi",
              label: "半成品",
              children: (
                <Table<SemiOption>
                  size="small"
                  rowKey="款号"
                  dataSource={filteredSemiOptions}
                  scroll={{ y: 420, x: "max-content" }}
                  pagination={false}
                  locale={{ emptyText: "尚无已设置的半成品款号" }}
                  onRow={r => ({ onClick: () => chooseSemi(r), style: { cursor: "pointer" } })}
                  columns={[
                    { title: "半成品款号", dataIndex: "款号", width: 140, render: (v: string) => <a className="erp-num">{v}</a> },
                    { title: "产品名称", dataIndex: "款式", width: 240 },
                    { title: "类别", dataIndex: "类别", width: 140, render: (v: string) => (v ? <Tag color="purple">{v}</Tag> : null) },
                    { title: "需求用量", dataIndex: "需求用量", width: 100 },
                    { title: "单位", dataIndex: "单位", width: 90 },
                  ]}
                />
              ),
            },
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

      <Modal
        title={`导入物料明细 · ${loaded款号}`}
        open={importOpen}
        width={900}
        okText="确定导入"
        cancelText="取消"
        okButtonProps={{ disabled: !importValidCount }}
        onOk={doImport}
        onCancel={() => setImportOpen(false)}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Tabs
            activeKey={importTab}
            onChange={k => setImportTab(k as "paste" | "file")}
            items={[
              {
                key: "paste",
                label: "粘贴 Excel 内容",
                children: (
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    <Input.TextArea
                      rows={6}
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={"从 Excel 复制后直接粘贴（支持带表头）。\n表头列：物料编号(必填)、物料名称、规格、颜色、单位、使用数量；无表头时第1列=物料编号、第2列=使用数量。"}
                    />
                    <Button loading={importLoading} onClick={() => applyImportText(importText)}>解析</Button>
                  </Space>
                ),
              },
              {
                key: "file",
                label: "上传 CSV 文件",
                children: (
                  <Space direction="vertical" size={8}>
                    <Upload
                      accept=".csv,.txt"
                      showUploadList={false}
                      beforeUpload={file => { void readImportFile(file); return false; }}
                    >
                      <Button icon={<UploadOutlined />} loading={importLoading}>选择 CSV / TXT 文件</Button>
                    </Upload>
                    <span style={{ color: "#888" }}>支持 UTF-8 / GBK 编码；xlsx 请先在 Excel 中另存为 CSV。</span>
                  </Space>
                ),
              },
            ]}
          />
          <div>
            共 {importRows.length} 行，有效 {importValidCount} 行，跳过 {importRows.length - importValidCount} 行
            {importRows.length > 0 && (importHasHeader ? "（已按表头列名映射）" : "（无表头，按第1列=物料编号、第2列=使用数量）")}
          </div>
          <Table<BomImportCheckedRow>
            size="small"
            rowKey="行号"
            pagination={false}
            scroll={{ y: 300, x: "max-content" }}
            dataSource={importRows}
            locale={{ emptyText: "请先粘贴数据或选择文件后解析" }}
            columns={[
              { title: "行号", dataIndex: "行号", width: 60 },
              {
                title: "物料编号", dataIndex: "物料编号", width: 130,
                render: (v: string, r) => <span style={r.错误 ? { color: "#cf1322" } : undefined}>{v}</span>,
              },
              { title: "使用数量", dataIndex: "使用数量", width: 90 },
              { title: "物料名称", width: 180, render: (_v, r) => r.material?.物料名称 ?? r.物料名称 ?? "" },
              { title: "规格", width: 120, render: (_v, r) => r.material?.规格 ?? r.规格 ?? "" },
              { title: "颜色", width: 90, render: (_v, r) => r.material?.颜色 ?? r.颜色 ?? "" },
              { title: "单位", width: 70, render: (_v, r) => r.material?.单位 ?? r.单位 ?? "" },
              {
                title: "校验", width: 130,
                render: (_v, r) => r.错误
                  ? <span style={{ color: "#cf1322" }}>{r.错误}</span>
                  : <Tag color="green">有效</Tag>,
              },
            ]}
          />
          <Radio.Group
            value={importMode}
            onChange={e => setImportMode(e.target.value as "append" | "replace")}
            options={[
              { value: "append", label: "追加到现有明细" },
              { value: "replace", label: "替换全部明细" },
            ]}
          />
        </Space>
      </Modal>
    </Card>
  );
}
