import { theme as antdTheme, type ThemeConfig } from "antd";

export interface ErpTheme {
  key: string;
  name: string;
  antd: ThemeConfig;
  siderTheme: "light" | "dark";
  siderBg: string;
  brandColor: string;
  brandBg: string;
  headerBg: string;
  headerColor: string;
  loginBg: string;
}

export const THEMES: Record<string, ErpTheme> = {
  indigo: {
    key: "indigo",
    name: "靛蓝商务",
    antd: {
      token: { colorPrimary: "#4f46e5", colorInfo: "#4f46e5", borderRadius: 8, colorBgLayout: "#f3f4fb" },
    },
    siderTheme: "light",
    siderBg: "#ffffff",
    brandColor: "#4f46e5",
    brandBg: "#f5f5ff",
    headerBg: "#ffffff",
    headerColor: "rgba(0,0,0,0.85)",
    loginBg: "linear-gradient(135deg,#4338ca 0%,#6366f1 55%,#818cf8 100%)",
  },
  dark: {
    key: "dark",
    name: "深色科技",
    antd: {
      algorithm: antdTheme.darkAlgorithm,
      token: { colorPrimary: "#22d3ee", borderRadius: 8, colorBgLayout: "#0b0f17" },
    },
    siderTheme: "dark",
    siderBg: "#0b0f17",
    brandColor: "#22d3ee",
    brandBg: "rgba(34,211,238,0.08)",
    headerBg: "#111722",
    headerColor: "rgba(255,255,255,0.88)",
    loginBg:
      "radial-gradient(1200px 600px at 70% -10%, rgba(34,211,238,0.28), transparent), linear-gradient(135deg,#0b0f17 0%,#11203a 100%)",
  },
  amber: {
    key: "amber",
    name: "暖陶纺织",
    antd: {
      token: { colorPrimary: "#c2410c", colorInfo: "#c2410c", borderRadius: 10, colorBgLayout: "#f6f1e9", colorBgContainer: "#fffdf8" },
    },
    siderTheme: "dark",
    siderBg: "#2b2723",
    brandColor: "#f59e0b",
    brandBg: "rgba(245,158,11,0.10)",
    headerBg: "#fffdf8",
    headerColor: "#3a2c1d",
    loginBg: "linear-gradient(135deg,#7c2d12 0%,#b45309 55%,#d97706 100%)",
  },
  emerald: {
    key: "emerald",
    name: "翡翠清新",
    antd: {
      token: { colorPrimary: "#059669", colorInfo: "#059669", borderRadius: 8, colorBgLayout: "#edf4f0" },
    },
    siderTheme: "dark",
    siderBg: "#06342c",
    brandColor: "#34d399",
    brandBg: "rgba(52,211,153,0.10)",
    headerBg: "#ffffff",
    headerColor: "rgba(0,0,0,0.85)",
    loginBg: "linear-gradient(135deg,#064e3b 0%,#047857 55%,#10b981 100%)",
  },
};

export const DEFAULT_THEME = "indigo";
