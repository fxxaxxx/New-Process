import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_THEME, THEMES, type ErpTheme } from "./themes";

interface ThemeCtx {
  themeKey: string;
  setThemeKey: (k: string) => void;
  theme: ErpTheme;
}

const Ctx = createContext<ThemeCtx>(null!);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setKey] = useState(() => localStorage.getItem("erp_theme") || DEFAULT_THEME);
  const setThemeKey = (k: string) => {
    localStorage.setItem("erp_theme", k);
    setKey(k);
  };
  const theme = THEMES[themeKey] ?? THEMES[DEFAULT_THEME];

  return (
    <Ctx.Provider value={{ themeKey, setThemeKey, theme }}>
      <ConfigProvider locale={zhCN} theme={theme.antd}>
        {children}
      </ConfigProvider>
    </Ctx.Provider>
  );
}
