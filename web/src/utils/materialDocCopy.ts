import type { DocLine } from "./materialLines";
import type { DocFieldCfg } from "../pages/materials/materialDocConfigs";
import type { MaterialDocDetail } from "../api/materialDocs";

// 复制单：从已有单据详情构造新建抽屉的预填值。
// 表头只复制「可输入」字段(text/employee)，跳过 日期/电脑单号/操作员(新单自动生成)。
// 明细整行带出(含生产单号/款号)，去掉 id/金额(由数量×单价重算)。
export function buildCopyInitial(headerFields: DocFieldCfg[], detail: MaterialDocDetail): {
  header: Record<string, string>; lines: DocLine[];
} {
  const h = (detail.单头 ?? {}) as Record<string, unknown>;
  const copyable = (f: DocFieldCfg) =>
    (f.type === undefined || f.type === "text" || f.type === "employee") && !f.noCopy;
  const header: Record<string, string> = {};
  for (const f of headerFields) {
    if (!copyable(f)) continue;
    const v = h[f.name];
    if (v != null && v !== "") header[f.name] = String(v);
  }
  const lines: DocLine[] = (detail.明细 ?? []).map(l => ({
    物料编号: l.物料编号, 物料名称: l.物料名称, 物料类别: l.物料类别,
    规格: l.规格, 颜色: l.颜色, 单位: l.单位, 数量: l.数量 ?? 0,
    单价: l.单价 ?? null, 备注: l.备注, 生产单号: l.生产单号, 款号: l.款号,
  }));
  return { header, lines };
}
