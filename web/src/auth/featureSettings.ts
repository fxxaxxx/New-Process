import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SettingItem } from "../api/systemSettings";

// 功能设置(系统.默认货币/单价小数位/数量小数位)的前端消费钩子。
// 登录后首次使用拉一次并模块级缓存; 拉取失败回落默认值(不缓存失败, 下次重试), 不阻塞页面。
export interface FeatureSettings {
  默认货币: string;    // HKD/RMB/USD/EUR(与后端 FeatureSettingsRules.支持货币 一致)
  单价小数位: number;  // 0-6
  数量小数位: number;  // 0-6
}

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = { 默认货币: "HKD", 单价小数位: 4, 数量小数位: 2 };

export const FEATURE_SETTING_KEYS = {
  默认货币: "系统.默认货币",
  单价小数位: "系统.单价小数位",
  数量小数位: "系统.数量小数位",
} as const;

const SUPPORTED_CURRENCIES = ["HKD", "RMB", "USD", "EUR"];

const clampDigits = (value: string | null | undefined, fallback: number): number => {
  if (value == null || String(value).trim() === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : fallback;
};

// 解析后端 SettingItem[] → FeatureSettings; 缺键/非法值逐项回落默认。
export function parseFeatureSettings(items: SettingItem[]): FeatureSettings {
  const get = (k: string) => items.find(i => i.键 === k)?.值 ?? null;
  const currency = (get(FEATURE_SETTING_KEYS.默认货币) ?? "").trim().toUpperCase();
  return {
    默认货币: SUPPORTED_CURRENCIES.includes(currency) ? currency : DEFAULT_FEATURE_SETTINGS.默认货币,
    单价小数位: clampDigits(get(FEATURE_SETTING_KEYS.单价小数位), DEFAULT_FEATURE_SETTINGS.单价小数位),
    数量小数位: clampDigits(get(FEATURE_SETTING_KEYS.数量小数位), DEFAULT_FEATURE_SETTINGS.数量小数位),
  };
}

// 功能设置的货币代码(HKD) → 单据/报价沿用写法(HK$); 其余代码原样返回。
export function toDocCurrency(code: string): string {
  const c = (code ?? "").trim().toUpperCase();
  return c === "HKD" ? "HK$" : c;
}

// 单价/数量显示格式化(小数位消费点②): 新页面/公共格式化请走这里, 存量页面本地 toFixed 暂不扫荡。
export const formatPrice = (v: number | null | undefined, s: FeatureSettings): string =>
  v == null ? "" : Number(v).toFixed(s.单价小数位);
export const formatQty = (v: number | null | undefined, s: FeatureSettings): string =>
  v == null ? "" : Number(v).toFixed(s.数量小数位);

let cache: FeatureSettings | null = null;
let inflight: Promise<FeatureSettings> | null = null;

export function loadFeatureSettings(): Promise<FeatureSettings> {
  if (cache) return Promise.resolve(cache);
  // Promise.resolve().then 包装: api 不可达(含同步抛错)时转为 rejection, 由 catch 回落默认值
  inflight ??= Promise.resolve()
    .then(() => api.get<SettingItem[]>("/feature-settings/public"))
    .then(r => (cache = parseFeatureSettings(r.data)))
    .catch(() => DEFAULT_FEATURE_SETTINGS)
    .finally(() => { inflight = null; });
  return inflight;
}

export function useFeatureSettings(): FeatureSettings {
  const [settings, setSettings] = useState<FeatureSettings>(cache ?? DEFAULT_FEATURE_SETTINGS);
  useEffect(() => {
    let alive = true;
    void loadFeatureSettings().then(v => { if (alive) setSettings(v); });
    return () => { alive = false; };
  }, []);
  return settings;
}

// 测试用: 清空模块缓存
export function __resetFeatureSettingsCache(): void {
  cache = null;
  inflight = null;
}
