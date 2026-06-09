export function displayValue(row: { 是否加密: boolean; 值?: string | null }): string {
  return row.是否加密 ? "(已加密)" : (row.值 ?? "");
}
