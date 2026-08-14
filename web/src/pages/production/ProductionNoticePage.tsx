import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutoComplete, Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Table, Tabs, Tag, message,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined, FileAddOutlined,
  FolderOpenOutlined, PrinterOutlined, SaveOutlined, SendOutlined, RocketOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  productionApi, type MoLine, type ProductionDetail, type ProductionHeader, type ProductionNoticeCreate,
} from "../../api/production";
import { stylesApi } from "../../api/styles";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import ImageNotesPanel from "../../components/ImageNotesPanel";
import ProductionStartupModal from "./ProductionStartupModal";

const MENU = "生产制单";
const money = (v?: number | null) => (v == null ? "***" : v);
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;

let rowSeq = 1;
const uid = () => rowSeq++;

// 货号明细行（前端编辑态，含色码数量明细）
interface GoodsRow {
  key: number;
  货号: string;
  BOM款号: string;
  款号名称: string;
  比例?: number;
  分析: boolean;
  数量明细: { key: number; 颜色: string; 尺码: string; 数量?: number }[];
}

const newGoodsRow = (): GoodsRow => ({
  key: uid(), 货号: "", BOM款号: "", 款号名称: "", 比例: undefined, 分析: false, 数量明细: [],
});

// MO单跟踪行（前端编辑态）
interface MoRow {
  key: number;
  接单日期?: Dayjs;
  正单合同号?: string;
  产品货号?: string;
  产品名称?: string;
  接单数量?: number;
  装箱方式?: string;
  订单总箱数?: number;
  验货日期?: Dayjs;
  备注?: string;
}

const newMoRow = (): MoRow => ({ key: uid() });

interface HeaderForm {
  订单类型?: string; 客户款号?: string; 客户编号?: string; 客户名称?: string;
  交货日期?: Dayjs; 标识?: string; 装箱方式?: string; 订单总箱数?: number;
  下单日期?: Dayjs; 跟单员?: string; 默认单价?: string; 备注?: string; 合同号?: string;
}

export default function ProductionNoticePage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<HeaderForm>();

  const currentUser = localStorage.getItem("erp_user") || "用户";

  // 已载入的现有生产单（查看态）。新建态为 null。
  const [loaded, setLoaded] = useState<ProductionDetail | null>(null);
  const isView = loaded != null; // 查看态：编辑禁用，工序/物料来自后端
  const 生产单号 = loaded?.单头?.生产单号 ?? "";
  const 审核 = loaded?.单头?.审核;

  const [goods, setGoods] = useState<GoodsRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [startupOpen, setStartupOpen] = useState(false);   // 一键启动面板

  // MO单录入（独立于主单据保存；仅在已载入生产单号时可编辑/保存）
  const [moRows, setMoRows] = useState<MoRow[]>([]);
  const [savingMo, setSavingMo] = useState(false);

  // 打开弹窗
  const [openModal, setOpenModal] = useState(false);
  const [openRows, setOpenRows] = useState<ProductionHeader[]>([]);
  const [openKw, setOpenKw] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  // 货号选择:已做 BOM 物料设置的款号(选中带出 款号名称/BOM款号/客户/默认单价)
  const [styleOpts, setStyleOpts] = useState<{ value: string; label: string; 款号: string; 款式?: string; 客户编号?: string; 客户名称?: string; 默认单价?: string }[]>([]);
  useEffect(() => {
    stylesApi.bomHeaders()
      .then(r => setStyleOpts(r
        .filter(s => !!s.款号)
        .map(s => ({
          value: s.款号!,
          label: `${s.款号}${s.款式 ? ` ${s.款式}` : ""}${s.客户名称 ? ` (${s.客户名称})` : ""}`,
          款号: s.款号!, 款式: s.款式, 客户编号: s.客户编号, 客户名称: s.客户名称, 默认单价: s.默认单价,
        }))))
      .catch(() => setStyleOpts([]));
  }, []);

  // 跟单员选择:部门人事(人事档案),显示 姓名(部门/职称)
  const [empOpts, setEmpOpts] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    masterApi("employees").list(1, 500, "")
      .then(r => setEmpOpts(r.items
        .filter(e => typeof e.姓名 === "string" && e.姓名)
        .map(e => ({
          value: e.姓名 as string,
          label: `${e.姓名}${e.部门编号 ? `(${e.部门编号}${e.职称 ? `/${e.职称}` : ""})` : ""}`,
        }))))
      .catch(() => setEmpOpts([]));
  }, []);

  const selected = useMemo(
    () => goods.find(g => g.key === selectedKey) ?? null,
    [goods, selectedKey],
  );

  const goodsQty = (g: GoodsRow) => g.数量明细.reduce((a, l) => a + (Number(l.数量) || 0), 0);
  const 接单数量 = goods.reduce((a, g) => a + goodsQty(g), 0);

  // —— 新建：清空表单 ——
  const reset = useCallback(() => {
    setLoaded(null);
    form.resetFields();
    form.setFieldsValue({ 标识: "正单", 下单日期: dayjs() });
    const first = newGoodsRow();
    setGoods([first]);
    setSelectedKey(first.key);
    setMoRows([]);
  }, [form]);

  useEffect(() => { reset(); }, [reset]);

  // —— 打开：列表 + 载入 ——
  const loadOpenList = useCallback(async (kw: string) => {
    setOpenLoading(true);
    try {
      const r = await productionApi.list(1, 50, kw);
      setOpenRows(r.items);
    } catch { message.error("加载生产单列表失败"); }
    finally { setOpenLoading(false); }
  }, []);

  const onOpen = () => { setOpenModal(true); setOpenKw(""); loadOpenList(""); };

  const loadDoc = async (单号: string) => {
    try {
      const d = await productionApi.get(单号);
      setLoaded(d);
      const h = d.单头;
      form.setFieldsValue({
        订单类型: h?.订单类型, 客户款号: h?.客户款号, 客户编号: h?.客户编号, 客户名称: h?.客户名称,
        交货日期: h?.交货日期 ? dayjs(h.交货日期) : undefined,
        标识: h?.标识, 装箱方式: h?.装箱方式, 订单总箱数: h?.订单总箱数 ?? undefined,
        下单日期: h?.下单日期 ? dayjs(h.下单日期) : (h?.日期 ? dayjs(h.日期) : undefined),
        跟单员: h?.跟单员, 默认单价: h?.默认单价, 备注: h?.备注, 合同号: h?.合同号,
      });
      // 货号明细行 + 该货号色码数量
      const rows: GoodsRow[] = (d.货号明细 ?? []).map(gd => ({
        key: uid(),
        货号: gd.货号 ?? "",
        BOM款号: gd.BOM款号 ?? "",
        款号名称: gd.款号名称 ?? "",
        比例: gd.比例 ?? undefined,
        分析: !!gd.分析,
        数量明细: d.数量
          .filter(q => q.货号 === gd.货号)
          .map(q => ({ key: uid(), 颜色: q.颜色 ?? "", 尺码: q.尺码 ?? "", 数量: q.数量 ?? 0 })),
      }));
      setGoods(rows);
      setSelectedKey(rows[0]?.key ?? null);
      // MO单跟踪行
      try {
        const mo = await productionApi.getMo(单号);
        setMoRows(mo.map(m => ({
          key: uid(),
          接单日期: m.接单日期 ? dayjs(m.接单日期) : undefined,
          正单合同号: m.正单合同号 ?? undefined,
          产品货号: m.产品货号 ?? undefined,
          产品名称: m.产品名称 ?? undefined,
          接单数量: m.接单数量 ?? undefined,
          装箱方式: m.装箱方式 ?? undefined,
          订单总箱数: m.订单总箱数 ?? undefined,
          验货日期: m.验货日期 ? dayjs(m.验货日期) : undefined,
          备注: m.备注 ?? undefined,
        })));
      } catch { setMoRows([]); }
      setOpenModal(false);
    } catch { message.error("加载生产单失败"); }
  };

  // —— 货号网格操作（仅新建态可编辑） ——
  const patchGoods = (key: number, patch: Partial<GoodsRow>) =>
    setGoods(gs => gs.map(g => (g.key === key ? { ...g, ...patch } : g)));

  const addGoods = () => {
    const r = newGoodsRow();
    setGoods(gs => [...gs, r]);
    setSelectedKey(r.key);
  };
  const removeGoods = (key: number) =>
    setGoods(gs => {
      const removed = gs.find(g => g.key === key);
      const next = gs.filter(g => g.key !== key);
      if (selectedKey === key) setSelectedKey(next[0]?.key ?? null);
      // 删除货号行时,其带入的表头信息一并清掉(仅清与该货号选项一致的值,手改过的不动)
      if (removed?.货号) {
        const st = styleOpts.find(o => o.value === removed.货号);
        const cur = form.getFieldsValue(["客户编号", "客户名称", "默认单价", "客户款号"]);
        const patch: Record<string, undefined> = {};
        if (st && cur.客户编号 === (st.客户编号 ?? undefined)) patch.客户编号 = undefined;
        if (st && cur.客户名称 === (st.客户名称 ?? undefined)) patch.客户名称 = undefined;
        if (st && cur.默认单价 === (st.默认单价 ?? undefined)) patch.默认单价 = undefined;
        if (cur.客户款号 === removed.货号) patch.客户款号 = undefined;
        if (Object.keys(patch).length) form.setFieldsValue(patch);
      }
      return next;
    });

  // —— 选中货号的色码数量行操作 ——
  const patchQtyLine = (gkey: number, lkey: number, patch: Partial<GoodsRow["数量明细"][number]>) =>
    setGoods(gs => gs.map(g => g.key === gkey
      ? { ...g, 数量明细: g.数量明细.map(l => (l.key === lkey ? { ...l, ...patch } : l)) }
      : g));
  const addQtyLine = (gkey: number) =>
    setGoods(gs => gs.map(g => g.key === gkey
      ? { ...g, 数量明细: [...g.数量明细, { key: uid(), 颜色: "", 尺码: "", 数量: undefined }] }
      : g));
  const removeQtyLine = (gkey: number, lkey: number) =>
    setGoods(gs => gs.map(g => g.key === gkey
      ? { ...g, 数量明细: g.数量明细.filter(l => l.key !== lkey) }
      : g));

  // —— 保存（仅新建态） ——
  const save = async () => {
    let v: HeaderForm;
    try { v = await form.validateFields(); }
    catch { return; }
    const lines = goods
      .map(g => ({
        货号: g.货号.trim() || g.BOM款号.trim(),
        BOM款号: g.BOM款号.trim(),
        款号名称: g.款号名称.trim() || undefined,
        比例: g.比例,
        分析: g.分析,
        数量明细: g.数量明细
          .filter(l => (Number(l.数量) || 0) > 0)
          .map(l => ({ 颜色: l.颜色.trim() || undefined, 尺码: l.尺码.trim() || undefined, 数量: Number(l.数量) })),
      }));
    if (lines.length === 0) { message.error("请至少添加一行货号"); return; }
    if (lines.some(l => !l.BOM款号)) { message.error("每行货号必须填写 BOM款号"); return; }
    if (lines.some(l => l.数量明细.length === 0)) { message.error("每个货号必须录入至少一格色码数量"); return; }

    const body: ProductionNoticeCreate = {
      订单类型: v.订单类型 || undefined,
      标识: v.标识 || undefined,
      装箱方式: v.装箱方式 || undefined,
      订单总箱数: v.订单总箱数,
      默认单价: v.默认单价 || undefined,
      客户编号: v.客户编号 || undefined,
      客户名称: v.客户名称 || undefined,
      客户款号: v.客户款号 || undefined,
      合同号: v.合同号 || undefined,
      跟单员: v.跟单员 || undefined,
      备注: v.备注 || undefined,
      交货日期: v.交货日期 ? v.交货日期.format("YYYY-MM-DD") : undefined,
      下单日期: v.下单日期 ? v.下单日期.format("YYYY-MM-DD") : undefined,
      货号明细: lines,
    };
    setSaving(true);
    try {
      const r = await productionApi.create(body);
      message.success(`生产通知单已创建：${r.生产单号}（工序/物料已自动展开）`);
      await loadDoc(r.生产单号);
    } catch (e) { message.error(errMsg(e) ?? "保存失败"); }
    finally { setSaving(false); }
  };

  // —— MO单录入（仅已载入生产单号时可编辑/保存；独立保存） ——
  const patchMo = (key: number, patch: Partial<MoRow>) =>
    setMoRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const addMo = () => setMoRows(rs => [...rs, newMoRow()]);
  const removeMo = (key: number) => setMoRows(rs => rs.filter(r => r.key !== key));

  const moQty = moRows.reduce((a, r) => a + (Number(r.接单数量) || 0), 0);
  const mo剩余数量 = (Number(loaded?.单头?.计划数量) || 0) - moQty;

  const saveMo = async () => {
    if (!生产单号) return;
    const lines: MoLine[] = moRows.map(r => ({
      接单日期: r.接单日期 ? r.接单日期.format("YYYY-MM-DD") : undefined,
      正单合同号: r.正单合同号?.trim() || undefined,
      产品货号: r.产品货号?.trim() || undefined,
      产品名称: r.产品名称?.trim() || undefined,
      接单数量: r.接单数量,
      装箱方式: r.装箱方式?.trim() || undefined,
      订单总箱数: r.订单总箱数,
      验货日期: r.验货日期 ? r.验货日期.format("YYYY-MM-DD") : undefined,
      备注: r.备注?.trim() || undefined,
    }));
    setSavingMo(true);
    try {
      await productionApi.saveMo(生产单号, lines);
      message.success("MO单已保存");
    } catch (e) { message.error(errMsg(e) ?? "MO单保存失败"); }
    finally { setSavingMo(false); }
  };

  // —— 审核 / 反审核 / 删除（查看态） ——
  const act = async (fn: () => Promise<unknown>, ok: string, after: "reload" | "reset") => {
    try {
      await fn();
      message.success(ok);
      if (after === "reset") reset();
      else if (生产单号) await loadDoc(生产单号);
    } catch (e) { message.error(errMsg(e) ?? "操作失败"); }
  };

  // —— 工具条 ——
  const editable = !isView;
  const toolbar = (
    <Space wrap>
      {can(perms, MENU, "保存") && (
        <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
      )}
      <Button icon={<FolderOpenOutlined />} onClick={onOpen}>打开</Button>
      {can(perms, MENU, "保存") && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={isView} onClick={save}>保存</Button>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "删除") && (
        <Popconfirm title="确认删除该生产单?" onConfirm={() => act(() => productionApi.remove(生产单号), "已删除", "reset")}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
      {isView && 审核 !== "1" && can(perms, MENU, "审核") && (
        <Button icon={<CheckOutlined />} onClick={() => act(() => productionApi.approve(生产单号), "已审核", "reload")}>审核</Button>
      )}
      {isView && 审核 === "1" && can(perms, MENU, "反审核") && (
        <Button icon={<CloseOutlined />} onClick={() => act(() => productionApi.unapprove(生产单号), "已反审核", "reload")}>反审核</Button>
      )}
      {isView && (
        <Button type="primary" icon={<RocketOutlined />} onClick={() => setStartupOpen(true)}>一键启动</Button>
      )}
      {isView && (
        <Button icon={<SendOutlined />} onClick={() => navigate(`/plastic-issues?basis=${encodeURIComponent(生产单号)}`)}>下推领料</Button>
      )}
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>
    </Space>
  );

  // —— 货号明细网格列 ——
  const goodsColumns = [
    { title: "序号", width: 56, render: (_: unknown, __: GoodsRow, i: number) => i + 1 },
    {
      title: "货号", dataIndex: "货号", width: 200,
      render: (v: string, r: GoodsRow) =>
        editable ? (
          <AutoComplete
            value={v} options={styleOpts} placeholder="选择或输入货号"
            filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            onChange={val => patchGoods(r.key, { 货号: val })}
            onSelect={val => {
              const st = styleOpts.find(o => o.value === val);
              patchGoods(r.key, {
                货号: val,
                款号名称: st?.款式 ?? r.款号名称,
                BOM款号: r.BOM款号 || val,
                分析: true, // 旧系统:选货号后分析默认打勾
              });
              // 选中已设 BOM 的款号:单头信息回填到生产通知单表头(客户款号=货号,与旧系统一致)
              if (st) form.setFieldsValue({
                客户编号: st.客户编号 ?? undefined,
                客户名称: st.客户名称 ?? undefined,
                默认单价: st.默认单价 ?? undefined,
                客户款号: val,
              });
            }}
          />
        ) : v,
    },
    {
      title: "BOM款号", dataIndex: "BOM款号", width: 200,
      render: (v: string, r: GoodsRow) =>
        editable ? (
          <AutoComplete
            value={v} options={styleOpts} placeholder="选择或输入BOM款号"
            filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            onChange={val => patchGoods(r.key, { BOM款号: val })}
          />
        ) : v,
    },
    {
      title: "款号名称", dataIndex: "款号名称",
      render: (v: string, r: GoodsRow) =>
        editable ? <Input value={v} onChange={e => patchGoods(r.key, { 款号名称: e.target.value })} /> : v,
    },
    {
      title: "数量", width: 110,
      render: (_: unknown, r: GoodsRow) =>
        editable ? (
          <InputNumber
            min={0} style={{ width: "100%" }} value={goodsQty(r)}
            onChange={n => patchGoods(r.key, {
              // 手输数量 = 生成一条无色码的数量行(在下方色码表里加行后,数量自动变回色码合计)
              数量明细: [{ key: uid(), 颜色: "", 尺码: "", 数量: n ?? undefined }],
            })}
          />
        ) : goodsQty(r),
    },
    {
      title: "比例", dataIndex: "比例", width: 100,
      render: (v: number | undefined, r: GoodsRow) =>
        editable
          ? <InputNumber value={v} min={0} style={{ width: "100%" }} onChange={n => patchGoods(r.key, { 比例: n ?? undefined })} />
          : (v ?? ""),
    },
    {
      title: "分析", dataIndex: "分析", width: 64, align: "center" as const,
      render: (v: boolean, r: GoodsRow) =>
        <Checkbox checked={v} disabled={!editable} onChange={e => patchGoods(r.key, { 分析: e.target.checked })} />,
    },
    ...(editable ? [{
      title: "操作", width: 64,
      render: (_: unknown, r: GoodsRow) =>
        <a onClick={() => removeGoods(r.key)}>删除</a>,
    }] : []),
  ];

  // —— 制单内容页签：选中货号的色码数量（编辑态）+ 工序（查看态） ——
  const qtyEditor = selected && (
    <Table
      size="small" rowKey="key" pagination={false}
      dataSource={selected.数量明细}
      title={() => (
        <Space>
          <span>颜色×尺码数量（货号 {selected.货号 || selected.BOM款号 || "—"}）</span>
          {editable && <Button size="small" onClick={() => addQtyLine(selected.key)}>添加色码行</Button>}
        </Space>
      )}
      columns={[
        {
          title: "颜色", dataIndex: "颜色",
          render: (v: string, l: GoodsRow["数量明细"][number]) =>
            editable ? <Input value={v} onChange={e => patchQtyLine(selected.key, l.key, { 颜色: e.target.value })} /> : v,
        },
        {
          title: "尺码", dataIndex: "尺码",
          render: (v: string, l: GoodsRow["数量明细"][number]) =>
            editable ? <Input value={v} onChange={e => patchQtyLine(selected.key, l.key, { 尺码: e.target.value })} /> : v,
        },
        {
          title: "数量", dataIndex: "数量", width: 140,
          render: (v: number | undefined, l: GoodsRow["数量明细"][number]) =>
            editable
              ? <InputNumber value={v} min={0} style={{ width: "100%" }} onChange={n => patchQtyLine(selected.key, l.key, { 数量: n ?? undefined })} />
              : v,
        },
        ...(editable ? [{
          title: "操作", width: 64,
          render: (_: unknown, l: GoodsRow["数量明细"][number]) =>
            <a onClick={() => removeQtyLine(selected.key, l.key)}>删除</a>,
        }] : []),
      ]}
    />
  );

  const procRows = isView && selected
    ? (loaded?.工序 ?? []).filter(p => p.货号 === selected.货号)
    : [];
  const matRows = isView && selected
    ? (loaded?.物料 ?? []).filter(m => m.货号 === selected.货号)
    : [];

  // —— MO单录入页签 ——
  const moTab = !生产单号 ? (
    <div style={{ padding: 24, color: "#999" }}>保存生产通知单后录入MO单</div>
  ) : (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Space wrap>
        <Button size="small" icon={<FileAddOutlined />} onClick={addMo}>添加行</Button>
        {can(perms, MENU, "保存") && (
          <Button type="primary" size="small" icon={<SaveOutlined />} loading={savingMo} onClick={saveMo}>
            保存MO单
          </Button>
        )}
      </Space>
      <Table
        size="small" rowKey="key" pagination={false} scroll={{ x: true }}
        dataSource={moRows}
        columns={[
          { title: "序号", width: 56, render: (_: unknown, __: MoRow, i: number) => i + 1 },
          {
            title: "接单日期", width: 140, dataIndex: "接单日期",
            render: (v: Dayjs | undefined, r: MoRow) =>
              <DatePicker value={v} style={{ width: "100%" }} onChange={d => patchMo(r.key, { 接单日期: d ?? undefined })} />,
          },
          {
            title: "正单合同号", width: 150, dataIndex: "正单合同号",
            render: (v: string | undefined, r: MoRow) =>
              <Input value={v} onChange={e => patchMo(r.key, { 正单合同号: e.target.value })} />,
          },
          {
            title: "产品货号", width: 150, dataIndex: "产品货号",
            render: (v: string | undefined, r: MoRow) =>
              <Input value={v} onChange={e => patchMo(r.key, { 产品货号: e.target.value })} />,
          },
          {
            title: "产品名称", width: 160, dataIndex: "产品名称",
            render: (v: string | undefined, r: MoRow) =>
              <Input value={v} onChange={e => patchMo(r.key, { 产品名称: e.target.value })} />,
          },
          {
            title: "接单数量", width: 120, dataIndex: "接单数量",
            render: (v: number | undefined, r: MoRow) =>
              <InputNumber value={v} min={0} style={{ width: "100%" }} onChange={n => patchMo(r.key, { 接单数量: n ?? undefined })} />,
          },
          {
            title: "装箱方式", width: 110, dataIndex: "装箱方式",
            render: (v: string | undefined, r: MoRow) =>
              <Input value={v} placeholder="PCS/CTN" onChange={e => patchMo(r.key, { 装箱方式: e.target.value })} />,
          },
          {
            title: "订单总箱数", width: 120, dataIndex: "订单总箱数",
            render: (v: number | undefined, r: MoRow) =>
              <InputNumber value={v} min={0} style={{ width: "100%" }} onChange={n => patchMo(r.key, { 订单总箱数: n ?? undefined })} />,
          },
          {
            title: "验货日期", width: 140, dataIndex: "验货日期",
            render: (v: Dayjs | undefined, r: MoRow) =>
              <DatePicker value={v} style={{ width: "100%" }} onChange={d => patchMo(r.key, { 验货日期: d ?? undefined })} />,
          },
          {
            title: "备注", width: 160, dataIndex: "备注",
            render: (v: string | undefined, r: MoRow) =>
              <Input value={v} onChange={e => patchMo(r.key, { 备注: e.target.value })} />,
          },
          {
            title: "操作", width: 64, fixed: "right" as const,
            render: (_: unknown, r: MoRow) => <a onClick={() => removeMo(r.key)}>删除</a>,
          },
        ]}
      />
      <div style={{ textAlign: "right", fontWeight: 600 }}>
        MO单剩余数量：{mo剩余数量}
      </div>
    </Space>
  );

  const tabs = (
    <Tabs
      items={[
        {
          key: "content", label: "制单内容",
          children: (
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              {qtyEditor}
              {isView && (
                <Table
                  size="small" rowKey={(_, i) => `proc-${i}`} pagination={false}
                  title={() => `工序工费（${procRows.length}）`}
                  dataSource={procRows}
                  columns={[
                    { title: "工序号", dataIndex: "工序号" },
                    { title: "工序名称", dataIndex: "工序名称" },
                    { title: "单价", dataIndex: "单价", render: money },
                    {
                      title: "工序类型", dataIndex: "工序类型",
                      render: (v?: string) => v ? <Tag style={{ borderRadius: 6 }}>{v}</Tag> : null,
                    },
                  ]}
                />
              )}
            </Space>
          ),
        },
        {
          key: "material", label: "物料清单",
          children: (
            <Table
              size="small" rowKey={(_, i) => `mat-${i}`} pagination={false} scroll={{ x: true }}
              dataSource={matRows}
              columns={[
                { title: "物料编号", dataIndex: "物料编号" },
                { title: "物料名称", dataIndex: "物料名称" },
                { title: "规格", dataIndex: "规格" },
                { title: "颜色", dataIndex: "颜色" },
                { title: "单位", dataIndex: "单位" },
                { title: "总数量", dataIndex: "总数量" },
                { title: "库存数量", dataIndex: "库存数量" },
                {
                  title: "需订数量", dataIndex: "需订数量",
                  render: (v?: number) => (v && v > 0 ? <span style={{ color: "#cf1322", fontWeight: 600 }}>{v}</span> : v),
                },
                ...(priceHidden ? [] : [
                  { title: "预算单价", dataIndex: "预算单价", render: money },
                  { title: "金额", dataIndex: "金额", render: money },
                ]),
                { title: "供应商", dataIndex: "供应商名称" },
              ]}
            />
          ),
        },
        { key: "mo", label: "MO单录入", children: moTab },
        { key: "img", label: "图片备注", children: <ImageNotesPanel 模块="生产单" 单号={生产单号} canEdit={can(perms, MENU, "保存")} emptyHint="请先打开一个生产通知单" /> },
      ]}
    />
  );

  return (
    <Card
      title={`生产通知单${生产单号 ? ` · ${生产单号}` : "（新建）"}`}
      variant="borderless"
      extra={toolbar}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="生产单号">
              <Input value={生产单号} disabled placeholder={isView ? "" : "保存后生成"} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="订单类型" label="订单类型">
              <Select allowClear disabled={isView}
                options={["正式单", "样品单", "返单"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
          <Col span={6}><Form.Item name="客户款号" label="客户款号"><Input disabled={isView} /></Form.Item></Col>
          <Col span={6}>
            <Form.Item label="制单日期">
              <Input value={(loaded?.单头?.日期 ?? dayjs().format("YYYY-MM-DD")).slice(0, 10)} disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}><Form.Item name="客户编号" label="客户编号"><Input disabled={isView} /></Form.Item></Col>
          <Col span={6}><Form.Item name="客户名称" label="客户名称"><Input disabled={isView} /></Form.Item></Col>
          <Col span={6}><Form.Item name="交货日期" label="交货日期"><DatePicker style={{ width: "100%" }} disabled={isView} /></Form.Item></Col>
          <Col span={6}><Form.Item name="标识" label="标识"><Input disabled={isView} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="接单数量"><Input value={接单数量} disabled /></Form.Item>
          </Col>
          <Col span={6}><Form.Item name="装箱方式" label="装箱方式"><Input disabled={isView} placeholder="PCS/CTN" /></Form.Item></Col>
          <Col span={6}><Form.Item name="订单总箱数" label="订单总箱数"><InputNumber min={0} style={{ width: "100%" }} disabled={isView} /></Form.Item></Col>
          <Col span={6}><Form.Item name="下单日期" label="下单日期"><DatePicker style={{ width: "100%" }} disabled={isView} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="跟单员" label="跟单员">
              <AutoComplete
                disabled={isView} placeholder="选择或输入(部门人事)"
                options={empOpts}
                filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
          </Col>
          <Col span={6}><Form.Item name="默认单价" label="默认单价"><Input disabled={isView} placeholder="HK LCL" /></Form.Item></Col>
          <Col span={6}><Form.Item label="制单人"><Input value={loaded?.单头?.制单人 ?? currentUser} disabled /></Form.Item></Col>
          <Col span={6}><Form.Item name="合同号" label="合同号"><Input disabled={isView} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={24}><Form.Item name="备注" label="订单备注"><Input.TextArea rows={2} disabled={isView} /></Form.Item></Col>
        </Row>
      </Form>

      <Space style={{ marginBottom: 8 }}>
        <b>货号明细</b>
        {editable && <Button size="small" icon={<FileAddOutlined />} onClick={addGoods}>添加货号</Button>}
      </Space>
      <Table
        size="small" rowKey="key" pagination={false} dataSource={goods} columns={goodsColumns}
        rowClassName={r => (r.key === selectedKey ? "ant-table-row-selected" : "")}
        onRow={r => ({ onClick: () => setSelectedKey(r.key), style: { cursor: "pointer" } })}
        style={{ marginBottom: 16 }}
      />

      {tabs}

      <Modal
        title="打开生产单" open={openModal} footer={null} width={1200}
        onCancel={() => setOpenModal(false)}
      >
        <Input.Search
          placeholder="搜索单号/款号/客户" allowClear style={{ marginBottom: 12 }}
          value={openKw} onChange={e => setOpenKw(e.target.value)}
          onSearch={v => loadOpenList(v)}
        />
        <Table
          size="small" rowKey="id" loading={openLoading} dataSource={openRows}
          pagination={false} scroll={{ x: "max-content", y: 380 }}
          onRow={r => ({ onClick: () => r.生产单号 && loadDoc(r.生产单号), style: { cursor: "pointer" } })}
          columns={[
            { title: "订单类型", dataIndex: "订单类型", width: 90 },
            { title: "标识", dataIndex: "标识", width: 64 },
            { title: "生产单号", dataIndex: "生产单号", width: 150, render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "款号", dataIndex: "款号", width: 110 },
            { title: "款式", dataIndex: "款式", width: 150 },
            { title: "客户款号", dataIndex: "客户款号", width: 100 },
            { title: "日期", dataIndex: "日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
            { title: "交货日期", dataIndex: "交货日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
            { title: "客户编号", dataIndex: "客户编号", width: 90 },
            { title: "客户名称", dataIndex: "客户名称", width: 110 },
            { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
            { title: "制单人", dataIndex: "制单人", width: 80 },
            { title: "跟单员", dataIndex: "跟单员", width: 80 },
            { title: "备注", dataIndex: "备注", width: 140 },
            {
              title: "审核", dataIndex: "审核", width: 90, align: "center" as const,
              render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>,
            },
          ]}
        />
      </Modal>
      <ProductionStartupModal open={startupOpen} 生产单号={生产单号} onClose={() => setStartupOpen(false)} />
    </Card>
  );
}
