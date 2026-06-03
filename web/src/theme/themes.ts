import { theme as antdTheme, type ThemeConfig } from "antd";

const FONT = "'Plus Jakarta Sans','PingFang SC','Microsoft YaHei',system-ui,sans-serif";

export interface ErpTheme {
  key: string;
  name: string;
  attr: string;
  antd: ThemeConfig;
  siderBg: string;
  siderTheme: "light" | "dark";
  brandText: string;
  brandSub: string;
  headerBg: string;
  headerColor: string;
  headerBorder: string;
  loginBg: string;
  loginCardBg: string;
}

const PRIMARY = "#6366f1"; // indigo

export const THEMES: Record<string, ErpTheme> = {
  // ───────── 现代浅 ─────────
  light: {
    key: "light",
    name: "现代浅",
    attr: "light",
    antd: {
      token: {
        colorPrimary: PRIMARY,
        colorInfo: PRIMARY,
        colorLink: PRIMARY,
        borderRadius: 10,
        fontFamily: FONT,
        colorBgLayout: "#f5f6f8",
        colorBgContainer: "#ffffff",
        colorTextBase: "#0f172a",
        colorBorderSecondary: "#eef0f4",
        controlHeight: 36,
      },
      components: {
        Layout: { bodyBg: "#f5f6f8", headerBg: "#ffffff" },
        Menu: {
          itemHeight: 42, itemBorderRadius: 10, iconSize: 16,
          itemColor: "#475569", itemHoverBg: "#f1f3f9", itemHoverColor: "#0f172a",
          itemSelectedBg: "#eef0ff", itemSelectedColor: "#4f46e5",
          itemActiveBg: "#eef0ff",
        },
        Table: { headerBg: "transparent", rowHoverBg: "#f8fafc", headerSplitColor: "transparent", cellPaddingBlock: 14 },
        Button: { borderRadius: 8, primaryShadow: "0 1px 2px rgba(79,70,229,0.25)" },
        Input: { borderRadius: 8 },
        Segmented: { borderRadius: 8, trackBg: "#eef0f4" },
        Card: { borderRadiusLG: 16 },
        Tag: { borderRadiusSM: 6 },
      },
    },
    siderBg: "#ffffff",
    siderTheme: "light",
    brandText: "#0f172a",
    brandSub: "#94a3b8",
    headerBg: "#ffffff",
    headerColor: "#0f172a",
    headerBorder: "1px solid #eef0f4",
    loginBg:
      "radial-gradient(620px 420px at 14% 8%, rgba(99,102,241,0.16), transparent), radial-gradient(680px 480px at 88% 92%, rgba(56,189,248,0.14), transparent), #f5f6f8",
    loginCardBg: "#ffffff",
  },

  // ───────── 现代深 ─────────
  dark: {
    key: "dark",
    name: "现代深",
    attr: "dark",
    antd: {
      algorithm: antdTheme.darkAlgorithm,
      token: {
        colorPrimary: "#818cf8",
        colorInfo: "#818cf8",
        colorLink: "#a5b4fc",
        borderRadius: 10,
        fontFamily: FONT,
        colorBgLayout: "#0b0e16",
        colorBgContainer: "#121624",
        colorBorderSecondary: "#1c2233",
        controlHeight: 36,
      },
      components: {
        Layout: { bodyBg: "#0b0e16", headerBg: "#0f1320" },
        Menu: {
          itemHeight: 42, itemBorderRadius: 10, iconSize: 16,
          darkItemBg: "transparent", darkSubMenuItemBg: "transparent",
          darkItemColor: "rgba(226,232,240,0.68)", darkItemHoverBg: "rgba(255,255,255,0.05)", darkItemHoverColor: "#fff",
          darkItemSelectedBg: "rgba(129,140,248,0.18)", darkItemSelectedColor: "#a5b4fc",
        },
        Table: { headerBg: "transparent", rowHoverBg: "#171c2b", headerSplitColor: "transparent", cellPaddingBlock: 14 },
        Button: { borderRadius: 8 },
        Input: { borderRadius: 8 },
        Segmented: { borderRadius: 8 },
        Card: { borderRadiusLG: 16 },
        Tag: { borderRadiusSM: 6 },
      },
    },
    siderBg: "#0c1018",
    siderTheme: "dark",
    brandText: "#f1f5f9",
    brandSub: "#64748b",
    headerBg: "#0f1320",
    headerColor: "rgba(255,255,255,0.88)",
    headerBorder: "1px solid #1a2030",
    loginBg:
      "radial-gradient(700px 460px at 78% -12%, rgba(129,140,248,0.22), transparent), radial-gradient(600px 420px at 10% 100%, rgba(56,189,248,0.14), transparent), linear-gradient(140deg,#0a0d14,#101626)",
    loginCardBg: "#121624",
  },
};

export const DEFAULT_THEME = "light";
