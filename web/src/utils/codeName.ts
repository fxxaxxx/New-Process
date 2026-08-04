// 编号+名称 组合显示:编号与名称相同(或名称为空)时只显示编号,避免 "ZURU ZURU" 这类重复
export const codeName = (编号?: string | null, 名称?: string | null): string => {
  const c = (编号 ?? "").trim();
  const n = (名称 ?? "").trim();
  if (!n || n === c) return c;
  return c ? `${c} ${n}` : n;
};
