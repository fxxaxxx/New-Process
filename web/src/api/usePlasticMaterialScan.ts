import { useCallback } from "react";
import { message } from "antd";
import { plasticMaterialMasterApi, type PlasticMaterialRow } from "./plasticMaterialMaster";
import { scanNotFound } from "../components/scan/ScanEntry";

// 塑胶物料扫码处理 hook：扫入条码 → 查物料 → 明细中已有该物料则数量+step，否则新增一行。
// 入库行和领料行都含 物料编号/物料名称/规格/颜色/单位/数量，这里用交叉类型兼容两者。
export interface ScannableLine {
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  颜色?: string;
  仓位号?: string;
  单位?: string;
  数量?: number;
}

export function usePlasticMaterialScan<T extends ScannableLine>(
  setLines: (updater: (prev: T[]) => T[]) => void,
  opts?: {
    step?: number;                                   // 每扫一次数量增量，默认 1
    onMaterialPicked?: (row: PlasticMaterialRow) => void;  // 选中物料回调（父页预填默认仓库）
  },
) {
  const step = opts?.step ?? 1;
  const onMaterialPicked = opts?.onMaterialPicked;

  return useCallback(async (code: string) => {
    let mat: PlasticMaterialRow | undefined;
    try {
      const r = await plasticMaterialMasterApi.list(undefined, code, 1, 50);
      // 优先精确匹配物料编号，否则取第一条模糊匹配
      mat = r.items.find(m => (m.物料编号 ?? "").trim() === code.trim()) ?? r.items[0];
    } catch {
      message.error("查询物料失败");
      return;
    }
    if (!mat || !mat.物料编号) { scanNotFound(code); return; }

    const code2 = mat.物料编号;
    setLines(prev => {
      const idx = prev.findIndex(l => (l.物料编号 ?? "").trim() === code2.trim());
      if (idx >= 0) {
        // 已有该物料：数量累加
        return prev.map((l, i) => i === idx ? { ...l, 数量: Number(l.数量 ?? 0) + step } : l);
      }
      // 新增一行（丢弃尾部空白行后追加）
      const newLine = {
        物料编号: mat.物料编号,
        物料名称: mat.物料名称,
        规格: mat.规格,
        颜色: mat.颜色,
        仓位号: mat.仓位号,
        单位: mat.单位,
        数量: step,
      } as unknown as T;
      return [...prev.filter(l => l.物料编号), newLine];
    });
    message.success(`已加入：${mat.物料名称 ?? code2}（${mat.物料编号}）`, 1);
    onMaterialPicked?.(mat);
  }, [setLines, step, onMaterialPicked]);
}
