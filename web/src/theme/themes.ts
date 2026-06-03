import { theme as antdTheme, type ThemeConfig } from "antd";

const SANS = "'Manrope','PingFang SC','Microsoft YaHei',system-ui,sans-serif";

export interface ErpTheme {
  key: string;
  name: string;
  attr: string; // body[data-erp-theme]
  antd: ThemeConfig;
  siderBg: string;
  siderText: string;
  brand: string; // 牌名颜色
  brandFont: string;
  tagline: string;
  taglineColor: string;
  menuTheme: "light" | "dark";
  headerBg: string;
  headerColor: string;
  headerBorder: string;
  loginBg: string;
  loginCardBg: string;
  loginInk: string;
}

export const THEMES: Record<string, ErpTheme> = {
  // ───────── 素笺 · 浅色编辑风 ─────────
  paper: {
    key: "paper",
    name: "素笺",
    attr: "paper",
    antd: {
      token: {
        colorPrimary: "#b23a2e",
        colorInfo: "#b23a2e",
        colorLink: "#b23a2e",
        borderRadius: 4,
        fontFamily: SANS,
        colorBgLayout: "transparent",
        colorBgContainer: "#faf6ec",
        colorText: "#211d17",
        colorTextSecondary: "#5b5345",
        colorBorderSecondary: "#e7ddc8",
      },
      components: {
        Layout: { bodyBg: "transparent", headerBg: "#faf6ec" },
        Card: { colorBgContainer: "#faf6ec" },
        Table: { headerBg: "transparent", rowHoverBg: "#f4eee0" },
        Menu: {
          darkItemBg: "transparent",
          darkSubMenuItemBg: "transparent",
          darkItemColor: "rgba(243,236,222,0.72)",
          darkItemHoverColor: "#fff",
          darkItemSelectedBg: "rgba(224,122,95,0.20)",
          darkItemSelectedColor: "#f0b9aa",
        },
      },
    },
    siderBg: "#231f1a",
    siderText: "#f3ecde",
    brand: "#f0e9da",
    brandFont: "'Fraunces',Georgia,serif",
    tagline: "服装 · 塑胶 工坊台账",
    taglineColor: "#c9a25f",
    menuTheme: "dark",
    headerBg: "#faf6ec",
    headerColor: "#3a3328",
    headerBorder: "1px solid #e7ddc8",
    loginBg:
      "radial-gradient(1000px 500px at 20% -10%, rgba(178,58,46,0.18), transparent), #efe9dd",
    loginCardBg: "#faf6ec",
    loginInk: "#211d17",
  },

  // ───────── 玄铁 · 深色工业风 ─────────
  iron: {
    key: "iron",
    name: "玄铁",
    attr: "iron",
    antd: {
      algorithm: antdTheme.darkAlgorithm,
      token: {
        colorPrimary: "#f6a609",
        colorInfo: "#f6a609",
        colorLink: "#f6a609",
        borderRadius: 2,
        fontFamily: SANS,
        colorBgLayout: "transparent",
        colorBgContainer: "#16181d",
        colorBorderSecondary: "#262a31",
      },
      components: {
        Layout: { bodyBg: "transparent", headerBg: "#101216" },
        Card: { colorBgContainer: "#16181d" },
        Table: { headerBg: "#101216", rowHoverBg: "#1b1e24" },
        Menu: {
          darkItemBg: "transparent",
          darkSubMenuItemBg: "transparent",
          darkItemSelectedBg: "rgba(246,166,9,0.16)",
          darkItemSelectedColor: "#f6a609",
        },
      },
    },
    siderBg: "#0a0b0e",
    siderText: "#c7ccd6",
    brand: "#f6a609",
    brandFont: "'JetBrains Mono',ui-monospace,monospace",
    tagline: "GARMENT · POLYMER ERP",
    taglineColor: "#6b7280",
    menuTheme: "dark",
    headerBg: "#101216",
    headerColor: "rgba(255,255,255,0.85)",
    headerBorder: "1px solid #1f232a",
    loginBg:
      "radial-gradient(900px 500px at 75% -15%, rgba(246,166,9,0.20), transparent), linear-gradient(140deg,#0c0d10,#141821)",
    loginCardBg: "#16181d",
    loginInk: "#e6e7ea",
  },
};

export const DEFAULT_THEME = "paper";
