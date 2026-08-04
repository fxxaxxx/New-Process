// 塑胶物料设置消费(预填)的纯函数。

// 默认仓库预填: 单据头仓库为空且该物料设置有默认仓库时返回默认仓库; 否则 null(不覆盖已填仓库)。
export function prefillDefaultWarehouse(
  current: string | null | undefined,
  默认仓库?: string | null,
): string | null {
  if ((current ?? "").trim()) return null;
  const wh = (默认仓库 ?? "").trim();
  return wh || null;
}
