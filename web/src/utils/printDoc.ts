import type { MaterialDocDetail } from "../api/materialDocs";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
const money = (v: unknown) => (v == null ? "***" : String(v));

// 打印物料单据：开新窗口渲染单头+明细表格并触发浏览器打印。尊重价格保密(hidePrice 不出单价/金额)。
export function printMaterialDoc(
  title: string,
  detail: MaterialDocDetail,
  opts: { hidePrice: boolean; headerFields: { name: string; label: string }[] },
) {
  const h = (detail.单头 ?? {}) as Record<string, unknown>;
  const lines = detail.明细 ?? [];
  const showProd = lines.some(l => l.生产单号 || l.款号);

  const headItems: [string, unknown][] = [
    ["单号", h.单号], ["日期", String(h.日期 ?? "").slice(0, 10)],
    ...opts.headerFields.map(f => [f.label, h[f.name]] as [string, unknown]),
    ["操作员", h.操作员], ["备注", h.备注],
  ];
  const headHtml = headItems.map(([k, v]) => `<span class="hi"><b>${esc(k)}：</b>${esc(v)}</span>`).join("");

  const cols = [
    ...(showProd ? [["生产单号", "生产单号"], ["款号", "款号"]] : []),
    ["物料编号", "物料编号"], ["物料名称", "物料名称"], ["规格", "规格"],
    ["材料", "物料类别"], ["颜色", "颜色"], ["单位", "单位"], ["数量", "数量"],
    ...(opts.hidePrice ? [] : [["单价", "单价"], ["金额", "金额"]]),
  ] as [string, keyof typeof lines[number]][];

  const thead = `<tr>${cols.map(([t]) => `<th>${esc(t)}</th>`).join("")}</tr>`;
  const tbody = lines.map(l => `<tr>${cols.map(([t, k]) => {
    const v = (l as Record<string, unknown>)[k as string];
    return `<td>${(t === "单价" || t === "金额") ? esc(money(v)) : esc(v)}</td>`;
  }).join("")}</tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body{font-family:"Microsoft YaHei",sans-serif;margin:24px;color:#000}
  h2{text-align:center;margin:0 0 16px}
  .head{display:flex;flex-wrap:wrap;gap:6px 22px;margin-bottom:14px;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #333;padding:4px 6px;text-align:left}
  th{background:#f0f0f0}
  td:last-child,th:last-child{text-align:right}
  @media print{body{margin:8mm}}
</style></head>
<body>
  <h2>${esc(title)}</h2>
  <div class="head">${headHtml}</div>
  <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
</body></html>`;

  const w = window.open("", "_blank", "width=960,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
