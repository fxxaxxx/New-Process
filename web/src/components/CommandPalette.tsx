import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, Modal, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { masterApi } from "../api/master";
import { stylesApi } from "../api/styles";
import { productionApi } from "../api/production";
import { purchaseOrderApi } from "../api/purchaseOrders";
import { plasticMaterialMasterApi } from "../api/plasticMaterialMaster";

// Ctrl+K / Cmd+K 全局搜索：跨 物料/塑胶物料/款号/生产单/采购订单 模糊搜，回车直达。
// 全部走现有 list 接口的 keyword 搜索，前端聚合，零后端改动。

interface ResultItem {
  group: string;
  key: string;
  title: string;
  sub: string;
  path: string;
}

interface Source {
  group: string;
  search: (kw: string) => Promise<Record<string, unknown>[]>;
  toItem: (x: Record<string, unknown>) => ResultItem;
}

const str = (v: unknown) => (v == null ? "" : String(v));

const SOURCES: Source[] = [
  {
    group: "物料",
    search: kw => masterApi("materials").list(1, 4, kw).then(r => r.items),
    toItem: x => ({ group: "物料", key: `m-${str(x.id)}`, title: str(x.物料编号), sub: str(x.物料名称), path: "/material-master" }),
  },
  {
    group: "塑胶物料",
    search: kw => plasticMaterialMasterApi.list(undefined, kw, 1, 4).then(r => r.items as unknown as Record<string, unknown>[]),
    toItem: x => ({ group: "塑胶物料", key: `p-${str(x.ID)}`, title: str(x.物料编号), sub: str(x.物料名称), path: "/plastic-material-master" }),
  },
  {
    group: "款号",
    search: kw => stylesApi.list(kw, 1, 4).then(r => r.items as unknown as Record<string, unknown>[]),
    toItem: x => ({ group: "款号", key: `s-${str(x.id)}`, title: str(x.款号), sub: str(x.款式), path: `/styles/${encodeURIComponent(str(x.款号))}` }),
  },
  {
    group: "生产单",
    search: kw => productionApi.list(1, 4, kw).then(r => r.items as unknown as Record<string, unknown>[]),
    toItem: x => ({ group: "生产单", key: `pd-${str(x.ID)}`, title: str(x.生产单号), sub: `${str(x.款号)} · ${str(x.客户名称)}`, path: "/production" }),
  },
  {
    group: "采购订单",
    search: kw => purchaseOrderApi.list(1, 4, kw).then(r => r.items as unknown as Record<string, unknown>[]),
    toItem: x => ({ group: "采购订单", key: `po-${str(x.id)}`, title: str(x.单号), sub: str(x.供应商名称), path: "/purchase-orders" }),
  },
];

export default function CommandPalette() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);   // 防抖 + 丢弃过期响应

  // 全局快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 打开时重置
  useEffect(() => {
    if (open) { setKw(""); setResults([]); setActive(0); }
  }, [open]);

  // 搜索（防抖 250ms，丢弃过期响应）
  useEffect(() => {
    const q = kw.trim();
    if (!q) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      const groups = await Promise.all(SOURCES.map(async s => {
        try { return (await s.search(q)).map(s.toItem); }
        catch { return [] as ResultItem[]; }
      }));
      if (seq !== seqRef.current) return;   // 已有更新的搜索
      setResults(groups.flat());
      setActive(0);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [kw]);

  const go = useCallback((item: ResultItem) => {
    setOpen(false);
    nav(item.path);
  }, [nav]);

  // 键盘导航
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) go(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  // 选中项滚动到可视区
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // 按 group 分组渲染，但键盘索引用扁平顺序
  const grouped = useMemo(() => {
    const m = new Map<string, { item: ResultItem; idx: number }[]>();
    results.forEach((item, idx) => {
      if (!m.has(item.group)) m.set(item.group, []);
      m.get(item.group)!.push({ item, idx });
    });
    return [...m.entries()];
  }, [results]);

  return (
    <Modal open={open} onCancel={() => setOpen(false)} footer={null} closable={false}
      width={560} styles={{ body: { padding: 12 } }} destroyOnHidden>
      <Input size="large" autoFocus prefix={<SearchOutlined />}
        placeholder="搜索物料 / 款号 / 生产单 / 采购订单…（↑↓ 选择，回车进入）"
        value={kw} onChange={e => setKw(e.target.value)} onKeyDown={onKeyDown} />
      <div ref={listRef} style={{ maxHeight: 380, overflowY: "auto", marginTop: 8 }}>
        {kw.trim() === "" && <div style={{ color: "#999", padding: "24px 0", textAlign: "center" }}>输入关键字开始搜索</div>}
        {kw.trim() !== "" && !searching && results.length === 0 && (
          <div style={{ color: "#999", padding: "24px 0", textAlign: "center" }}>无匹配结果</div>
        )}
        {grouped.map(([group, items]) => (
          <div key={group}>
            <div style={{ fontSize: 12, color: "#999", padding: "8px 4px 4px", fontWeight: 600 }}>{group}</div>
            {items.map(({ item, idx }) => (
              <div key={item.key} data-idx={idx} onClick={() => go(item)}
                onMouseEnter={() => setActive(idx)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                  cursor: "pointer", background: idx === active ? "rgba(99,102,241,0.12)" : "transparent",
                }}>
                <Tag style={{ borderRadius: 6, marginRight: 0 }}>{item.group}</Tag>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{item.title}</span>
                <span style={{ color: "#888", fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
