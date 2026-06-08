export type Kind = "成品" | "半成品";

// 维度列按口径切换；公共列(期初/本期入/本期出/结存)由页面拼接
export function dimColumns(kind: Kind): { title: string; dataIndex: string }[] {
  return kind === "成品"
    ? [
        { title: "仓库", dataIndex: "仓库" },
        { title: "款号", dataIndex: "款号" },
        { title: "色号", dataIndex: "色号" },
        { title: "颜色", dataIndex: "颜色" },
        { title: "尺码", dataIndex: "尺码" },
      ]
    : [
        { title: "仓库", dataIndex: "仓库" },
        { title: "物料编号", dataIndex: "物料编号" },
        { title: "规格", dataIndex: "规格" },
        { title: "颜色", dataIndex: "颜色" },
      ];
}

// dayjs(month()为0基) → yyyyMM
export function toYearMonth(d: { year: () => number; month: () => number } | null): string {
  if (!d) return "";
  const y = d.year();
  const m = d.month() + 1;
  return `${y}${String(m).padStart(2, "0")}`;
}
