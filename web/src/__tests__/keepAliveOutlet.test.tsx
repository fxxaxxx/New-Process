// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KeepAliveOutlet, KeepAliveProvider, useKeepAlive } from "../components/KeepAliveOutlet";

// 路由级页面缓存(keep-alive)行为验证:
// 1) 切走再回来,页面 state 保留(已选/已填不丢);
// 2) drop(关闭)后再进入,页面重新挂载回到初始状态;
// 3) <Navigate> 重定向路由不进缓存、正常跳转。

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function CounterPage({ label }: { label: string }) {
  const [n, setN] = useState(0);
  return <button className={`cnt-${label}`} onClick={() => setN(v => v + 1)}>{label}:{n}</button>;
}

function NavBtn({ to, label }: { to: string; label: string }) {
  const nav = useNavigate();
  return <button className={`nav-${label}`} onClick={() => nav(to)}>go {label}</button>;
}

// 模拟 MainLayout 顶栏「关闭」:drop 当前页缓存并跳走
function CloseBtn() {
  const { drop } = useKeepAlive();
  const nav = useNavigate();
  const loc = useLocation();
  return <button className="close" onClick={() => { drop(loc.pathname); nav("/b"); }}>close</button>;
}

function Harness() {
  return (
    <MemoryRouter initialEntries={["/a"]}>
      <Routes>
        <Route element={
          <KeepAliveProvider>
            <KeepAliveOutlet />
            <NavBtn to="/a" label="a" /><NavBtn to="/b" label="b" /><NavBtn to="/r" label="r" />
            <CloseBtn />
          </KeepAliveProvider>
        }>
          <Route path="/a" element={<CounterPage label="a" />} />
          <Route path="/b" element={<CounterPage label="b" />} />
          <Route path="/r" element={<Navigate to="/a" replace />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

let container: HTMLDivElement;
let root: Root;

const click = (selector: string) => {
  const el = container.querySelector(selector);
  if (!el) throw new Error(`元素不存在: ${selector}`);
  act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
};
const text = (selector: string) => container.querySelector(selector)?.textContent;
const wrapperStyle = (selector: string) =>
  (container.querySelector(selector)?.parentElement as HTMLElement | null)?.style.display;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => { root = createRoot(container); root.render(<Harness />); });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("KeepAliveOutlet 页面缓存", () => {
  it("切到其他页再回来,页面 state 保留", () => {
    click(".cnt-a");
    expect(text(".cnt-a")).toBe("a:1");

    click(".nav-b");
    // 离开 /a 后:a 页仍在文档中但被隐藏(display:none),b 页正常显示
    expect(text(".cnt-a")).toBe("a:1");
    expect(wrapperStyle(".cnt-a")).toBe("none");
    expect(text(".cnt-b")).toBe("b:0");
    expect(wrapperStyle(".cnt-b")).toBe("contents");

    click(".nav-a");
    // 回到 /a:计数没有丢
    expect(text(".cnt-a")).toBe("a:1");
    expect(wrapperStyle(".cnt-a")).toBe("contents");
  });

  it("关闭(drop)后再次进入,页面重新挂载、数据清空", () => {
    click(".cnt-a");
    expect(text(".cnt-a")).toBe("a:1");

    click(".close");           // drop(/a) 并跳到 /b
    expect(text(".cnt-b")).toBe("b:0");

    click(".nav-a");           // 再次进入 /a:重新挂载,回到初始值
    expect(text(".cnt-a")).toBe("a:0");
  });

  it("重定向路由不进缓存,正常跳转", () => {
    click(".nav-r");           // /r -> <Navigate to="/a" replace>
    expect(text(".cnt-a")).toBe("a:0");
    expect(wrapperStyle(".cnt-a")).toBe("contents");
  });
});
