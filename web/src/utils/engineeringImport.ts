// 工程部实际文件导入解析:排模表(两段式)/外购件清单(多sheet) → 导入行（纯函数，可单测）
// 与 materialImport.ts 的标准模板不同：这里按文件版式(固定列位+表头特征)解析，
// 输出与 MaterialImportParsedRow 相同的结构，直接复用后端 importRows 接口。
import type * as XLSXT from "xlsx";
import type { MaterialImportParsedRow } from "./materialImport";

type Grid = unknown[][];

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
};

const normHeader = (s: string) =>
  s.replace(/[\s　]/g, "").replace(/（/g, "(").replace(/）/g, ")");

// 从 '100（热流道）' '0.27215' '/' '' 里取数字
const num = (v: unknown): number | undefined => {
  const t = cellText(v);
  if (!t || t === "/") return undefined;
  const m = /^-?\d+(\.\d+)?/.exec(t.replace(/,/g, ""));
  return m ? Number(m[0]) : undefined;
};

// 水口比率:0.272→27.2;已是百分数(≥1.5)则原样
const pct = (v: unknown): number | undefined => {
  const n = num(v);
  if (n === undefined) return undefined;
  return n < 1.5 ? Math.round(n * 10000) / 100 : n;
};

const isEmptyRow = (cells: unknown[]) => cells.every(c => cellText(c) === "");

const rowHas = (cells: unknown[], ...names: string[]) =>
  names.every(n => cells.some(c => normHeader(cellText(c)) === n));

// 从头几行抓 "客户名称：ZURU" / "产品编号：92129" 这类信息
function grabSheetInfo(grid: Grid): { 客户: string; 产品编号: string } {
  let 客户 = "", 产品编号 = "";
  for (let i = 0; i < Math.min(6, grid.length); i++) {
    const line = grid[i].map(cellText).join(" ");
    const mk = /客户名称[::]\s*([^\s]+)/.exec(line);
    if (mk) 客户 = mk[1];
    const mp = /产品编号[::]\s*([^\s]+)/.exec(line);
    if (mp) 产品编号 = mp[1];
  }
  return { 客户, 产品编号 };
}

// ---------- 排模表(工模行 + 零件行 两段式) ----------
// 表头特征:同一行同时含 工模编号 与 零件编号;表尾以 col0=料型/合计/分发 结束。
// 模具行:col0 工模编号非空(带颜色/用料/机型/日产能/重量等模具级字段);
// 零件行:col2 零件编号非空(带单净重/出模数/套数/用量等零件级字段)。
export function parsePaimobiaoWorkbook(wb: XLSXT.WorkBook, XLSX: typeof XLSXT): MaterialImportParsedRow[] {
  const rows: MaterialImportParsedRow[] = [];
  let rowNo = 0;
  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const h = grid.findIndex(cells => rowHas(cells, "工模编号", "零件编号"));
    if (h < 0) continue; // 非排模表 sheet(如用量计算方案)跳过
    const { 客户, 产品编号 } = grabSheetInfo(grid);
    const H = (name: string) => grid[h].findIndex(c => normHeader(cellText(c)) === name);
    const Hs = (...names: string[]) => { // 多候选表头名,取第一个命中的
      for (const n of names) { const i = H(n); if (i >= 0) return i; }
      return -1;
    };
    const HAS = (kw: string) => grid[h].findIndex(c => normHeader(cellText(c)).includes(kw));
    const c工模 = H("工模编号"), c零件 = H("零件编号"), c物料名 = H("物料名称"),
      c用料 = H("用料名称"), c海关 = H("海关备案料件名称"), c颜色 = H("顔色") >= 0 ? H("顔色") : H("颜色"),
      c色粉 = Hs("色粉编号", "色粉号"), c加工 = H("加工内容"), c水口 = grid[h].findIndex(c => normHeader(cellText(c)).startsWith("水口比率")),
      c毛重 = grid[h].findIndex(c => normHeader(cellText(c)).startsWith("整啤毛重")),
      c净重 = grid[h].findIndex(c => normHeader(cellText(c)).startsWith("整啤净重")),
      c单净重 = grid[h].findIndex(c => normHeader(cellText(c)).startsWith("单净重")),
      c套数总件 = grid[h].findIndex(c => { const t = normHeader(cellText(c)); return t.startsWith("套数/总件") || t === "整啤模腔数"; }),
      c出模数 = H("出模数"), c套数 = H("套数"), c用量 = H("用量"),
      c机型 = HAS("机型"),       // 兼容 机型(A) 与 啤机机型(A)
      c日产能 = HAS("日产能"),    // 兼容 日产能(啤) 与 模具日产能(啤)
      c模架 = HAS("尺寸"),        // 兼容 模架尺寸 与 工模尺寸宽X高X厚(MM)
      c备注 = grid[h].findIndex(c => normHeader(cellText(c)).startsWith("备注"));
    const get = (cells: unknown[], idx: number) => (idx >= 0 ? cells[idx] : "");

    let mold: Record<string, unknown> = {};
    let partSeq = 0; // 当前模具下零件流水号(零件编号为空时自动编号用)
    for (let i = h + 1; i < grid.length; i++) {
      const cells = grid[i];
      if (isEmptyRow(cells)) continue;
      const rowText = normHeader(cells.map(cellText).join(""));
      const first = normHeader(cellText(cells[0]));
      if (first === "料型" || first === "合计" || rowText.startsWith("分发") || rowText.startsWith("所有物料")) break; // 表尾
      rowNo += 1;
      const moldRaw = cellText(get(cells, c工模));
      if (moldRaw) {
        // 模具行:刷新模具级上下文;编号里的空格/括号注记(如"(热流道)")剥离到备注
        const moldNote = /[(（][^)）]*[)）]/.exec(moldRaw)?.[0] || "";
        const moldCode = moldRaw.replace(/[(（][^)）]*[)）]/g, "").replace(/\s+/g, "");
        partSeq = 0;
        mold = {
          工模编号: moldCode,
          用料名称: cellText(get(cells, c用料)) || undefined,
          原料名称: cellText(get(cells, c海关)) || undefined,
          颜色: cellText(get(cells, c颜色)) || undefined,
          色粉号: cellText(get(cells, c色粉)) || undefined,
          加工内容: cellText(get(cells, c加工)) || undefined,
          水口比例: pct(get(cells, c水口)),
          整啤毛重: num(get(cells, c毛重)),
          整啤净重: num(get(cells, c净重)),
          整啤模腔数: num(get(cells, c套数总件)),
          啤机机型: cellText(get(cells, c机型)) || undefined,
          模具日产量: num(get(cells, c日产能)),
          模架: cellText(get(cells, c模架)),
          备注: [moldNote, cellText(get(cells, c备注))].filter(Boolean).join(";"),
        };
        continue;
      }
      let code = cellText(get(cells, c零件));
      let autoCode = false;
      if (!code) {
        // 零件编号空白(如 71172 排模表):按 工模编号-流水号 自动编号
        if (!mold.工模编号 || !cellText(get(cells, c物料名))) continue; // 连名称都没有的废行跳过
        partSeq += 1;
        code = `${mold.工模编号}-${partSeq}`;
        autoCode = true;
      }
      const remarkParts = [
        cellText(get(cells, c备注)),
        autoCode && "编号自动生成",
        (mold.模架 as string) && `模架:${mold.模架}`,
        (mold.备注 as string) && `模具备注:${mold.备注}`,
      ].filter(Boolean);
      const 数据: Record<string, string | number | undefined> = {
        物料编号: code,
        物料名称: cellText(get(cells, c物料名)) || undefined,
        单位: "PCS",
        货币: "HKD",
        客户: 客户 || undefined,
        款号: 产品编号 || undefined,
        ...mold,
        加工内容: cellText(get(cells, c加工)) || (mold.加工内容 as string | undefined),
        原胶件单净重: num(get(cells, c单净重)),
        出模数: num(get(cells, c出模数)),
        套数: num(get(cells, c套数)),
        用量: num(get(cells, c用量)),
        备注: remarkParts.join(";") || undefined,
      };
      delete 数据.模架;
      rows.push({ 行号: rowNo, 数据 });
    }
  }
  return rows;
}

// ---------- 外购件清单(多 sheet,序号/类别/物料名称/物料编号 版式) ----------
// 每个 sheet 一张清单;sheet 名(去掉"-外购清单")作为编号后缀(多 sheet 时),与既有数据惯例一致(92129-01-长颈鹿)。
export function parseWaigouWorkbook(wb: XLSXT.WorkBook, XLSX: typeof XLSXT): MaterialImportParsedRow[] {
  const rows: MaterialImportParsedRow[] = [];
  let rowNo = 0;
  const layouts = wb.SheetNames
    .map(name => ({
      name,
      grid: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" }),
    }))
    .map(s => ({ ...s, h: s.grid.findIndex(cells => rowHas(cells, "序号", "物料编号")) }))
    .filter(s => s.h >= 0);
  const multi = layouts.length > 1;

  for (const { name, grid, h } of layouts) {
    const { 客户, 产品编号 } = grabSheetInfo(grid);
    // sheet 名(去掉"-外购清单")作为编号后缀(多 sheet 时);后缀与产品编号相同则省略
    const rawSuffix = name.replace(/-?外购清单/g, "").trim();
    const suffix = rawSuffix === 产品编号 ? "" : rawSuffix;
    const H = (name2: string) => grid[h].findIndex(c => normHeader(cellText(c)) === name2);
    const c类别 = H("类别"), c名称 = H("物料名称"), c编号 = H("物料编号"), c规格 = H("规格"),
      c序号 = H("序号"),
      c颜色 = H("顔色") >= 0 ? H("顔色") : H("颜色"), c供应商 = H("供应商"), c备注 = H("备注");
    // 打包进备注的信息列
    const packCols = ["材料", "海关备案料件名称", "用量", "订单需求数", "单重g", "表面处理", "用途"]
      .map(n => ({ n, i: grid[h].findIndex(c => normHeader(cellText(c)) === n) }))
      .filter(x => x.i >= 0);
    const get = (cells: unknown[], idx: number) => (idx >= 0 ? cells[idx] : "");

    for (let i = h + 1; i < grid.length; i++) {
      const cells = grid[i];
      if (isEmptyRow(cells)) continue;
      const rowText = normHeader(cells.map(cellText).join(""));
      if (rowText.startsWith("所有物料") || rowText.startsWith("分发") || rowText.startsWith("合计")) break; // 表尾说明
      let base = cellText(get(cells, c编号));
      let autoCode = false;
      if (!base) {
        // 物料编号空白(如五金/辅料行):按 产品编号-WG-序号 自动编号
        if (!cellText(get(cells, c名称))) continue; // 装箱尺寸等备注行静默跳过
        const seq = cellText(get(cells, c序号)) || String(rowNo + 1);
        base = `${产品编号 || "WG"}-WG-${seq}`;
        autoCode = true;
      }
      rowNo += 1;
      const pack = packCols
        .map(({ n, i: ci }) => {
          const t = cellText(get(cells, ci));
          return t ? `${n}:${t}` : "";
        })
        .filter(Boolean);
      const remark0 = cellText(get(cells, c备注));
      const 数据: Record<string, string | number | undefined> = {
        物料编号: multi && suffix ? `${base}-${suffix}` : base,
        物料名称: cellText(get(cells, c名称)) || undefined,
        物料类别: cellText(get(cells, c类别)) || undefined,
        规格: cellText(get(cells, c规格)) || undefined,
        颜色: cellText(get(cells, c颜色)) || undefined,
        供应商名称: cellText(get(cells, c供应商)) || undefined,
        单位: "PCS",
        货号: 产品编号 || undefined,
        客户: 客户 || undefined,
        备注: [remark0, autoCode && "编号自动生成", pack.join(" ")].filter(Boolean).join(";") || undefined,
      };
      rows.push({ 行号: rowNo, 数据 });
    }
  }
  return rows;
}
