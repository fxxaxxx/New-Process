import { type ThemeConfig } from "antd";

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
          itemActiveBg: "#eef0ff", itemMarginInline: 0, itemMarginBlock: 2,
        },
        // 表格:淡底表头 + 淡蓝 hover + 分隔线加粗(圆角外框在 index.css)
        Table: {
          headerBg: "#fafbfc", rowHoverBg: "#f5f8ff", headerSplitColor: "transparent",
          cellPaddingBlock: 13, headerColor: "#475569",
        },
        Card: { borderRadiusLG: 14 },
        Button: { borderRadius: 8, primaryShadow: "0 4px 10px -2px rgba(79,70,229,0.35)" },
        Modal: { borderRadiusLG: 14, titleFontSize: 16 },
        Drawer: { borderRadiusLG: 14 },
        Tag: { borderRadiusSM: 999 },
        Form: { labelColor: "#475569", labelFontSize: 13 },
        Input: { borderRadius: 8, activeShadow: "0 0 0 3px rgba(99,102,241,0.12)" },
        InputNumber: { borderRadius: 8, activeShadow: "0 0 0 3px rgba(99,102,241,0.12)" },
        Select: { borderRadius: 8 },
        Segmented: { borderRadius: 8, trackBg: "#eef0f4" },
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
};

export const DEFAULT_THEME = "light";
