import type {
  SemiFinishedCommonMaterialField,
  SemiFinishedCommonMaterialListQuery,
} from "../api/semiFinishedCommonMaterials";

export const SEMI_FINISHED_COMMON_MATERIAL_FILTER_STORAGE_KEY =
  "semi-finished-common-materials.filters";

export interface SemiFinishedCommonMaterialFilterInput {
  field?: SemiFinishedCommonMaterialField | "全部" | string;
  查询字段?: SemiFinishedCommonMaterialField | "全部" | string;
  keyword?: string;
  exact?: boolean;
  精确?: boolean;
  duplicate?: string;
  重复内容?: string;
  pending?: string;
  待操作物料?: string;
  audit?: string;
  审核情况?: string;
  page?: number;
  size?: number;
}

export type SemiFinishedCommonMaterialFilterState = SemiFinishedCommonMaterialFilterInput;

const clean = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== "全部" ? trimmed : undefined;
};

const pageValue = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Math.max(1, Math.trunc(value as number)) : fallback;

export function buildSemiFinishedCommonMaterialParams(
  input: SemiFinishedCommonMaterialFilterInput = {},
): SemiFinishedCommonMaterialListQuery {
  const params: SemiFinishedCommonMaterialListQuery = {
    page: pageValue(input.page, 1),
    size: Math.min(pageValue(input.size, 50), 200),
    精确: input.exact ?? input.精确 ?? false,
  };
  const duplicate = clean(input.duplicate ?? input.重复内容);
  const pending = clean(input.pending ?? input.待操作物料);
  const audit = clean(input.audit ?? input.审核情况);
  const field = clean(input.field ?? input.查询字段);
  const keyword = clean(input.keyword);

  if (duplicate) params.重复内容 = duplicate;
  if (pending) params.待操作物料 = pending;
  if (audit) params.审核情况 = audit as SemiFinishedCommonMaterialListQuery["审核情况"];
  if (field) params.查询字段 = field;
  if (keyword) params.keyword = keyword;

  return params;
}

export function buildAssemblyMaterialDetailUrl(
  产品货号: string,
  returnTo = "/semi-finished-common-materials",
) {
  return `/assembly-material-setup?款号=${encodeURIComponent(产品货号)}&return=${encodeURIComponent(returnTo)}`;
}

export function maskSemiFinishedCommonMaterialPrice(
  price: number | null | undefined,
  canSeePrice: boolean,
): number | "***" {
  return !canSeePrice || price == null ? "***" : price;
}

export interface RequestVersionGuard {
  next: () => number;
  isCurrent: (version: number) => boolean;
  isStale: (version: number) => boolean;
}

export function createRequestVersionGuard(): RequestVersionGuard {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (version: number) => version === current,
    isStale: (version: number) => version !== current,
  };
}

type FilterStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultFilterStorage(): FilterStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function saveSemiFinishedCommonMaterialFilters(
  filters: SemiFinishedCommonMaterialFilterState,
  storage: FilterStorage = defaultFilterStorage() as FilterStorage,
): void {
  if (!storage) return;
  try {
    storage.setItem(SEMI_FINISHED_COMMON_MATERIAL_FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Storage can be unavailable or full; list navigation should still work.
  }
}

export function loadSemiFinishedCommonMaterialFilters(
  storage: FilterStorage = defaultFilterStorage() as FilterStorage,
): SemiFinishedCommonMaterialFilterState {
  if (!storage) return {};
  try {
    const value = storage.getItem(SEMI_FINISHED_COMMON_MATERIAL_FILTER_STORAGE_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as SemiFinishedCommonMaterialFilterState
      : {};
  } catch {
    return {};
  }
}
