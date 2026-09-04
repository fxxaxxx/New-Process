import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// 轮询间隔:仅当本页是活动页且文档可见时才触发
const POLL_INTERVAL_MS = 30_000;

/**
 * 通用自动刷新 hook:配合 KeepAliveOutlet 的路由级页面缓存使用。
 * 缓存页只是 display:none 隐藏,useEffect 不会重跑,数据会陈旧;
 * 这里对「当前活动页」在三种时机调用 reload:
 *   1. 从其他页面切回本页(keep-alive 重新激活,active 由 false→true);
 *   2. 浏览器标签页重新获得焦点/可见(window focus + visibilitychange);
 *   3. 每 30 秒轮询一次(仅当本页活动且文档可见)。
 *
 * 约定:传入的 reload 应为「静默版」加载函数——失败时不弹 message.error,
 * 避免后端异常时轮询每 30 秒刷一次 toast;页面手动加载(带 toast)保持不变。
 *
 * 实现要点:
 * - 隐藏但存活的页面 useLocation() 仍会跟随路由变化;挂载时即活动页,
 *   用 ref 记下本页路径,active = loc.pathname === myPath;
 * - reload 用 ref 持有最新版本,effect 空依赖挂监听,不随 reload 变化反复触发。
 */
export function useAutoReload(reload: () => void) {
  const loc = useLocation();
  // 组件挂载时即为活动页,记下本页路径作为「我是不是活动页」的判据
  const myPath = useRef(loc.pathname).current;
  const active = loc.pathname === myPath;

  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const activeRef = useRef(active);
  activeRef.current = active;

  // 切回本页:active 由 false→true 时刷新一次
  const prevActiveRef = useRef(active);
  useEffect(() => {
    const was = prevActiveRef.current;
    prevActiveRef.current = active;
    if (active && !was) reloadRef.current();
  }, [active]);

  // 标签页重新获得焦点/可见 + 30 秒轮询;监听只挂一次
  useEffect(() => {
    const canReload = () => activeRef.current && document.visibilityState === "visible";
    const onFocus = () => { if (canReload()) reloadRef.current(); };
    const onVisible = () => { if (canReload()) reloadRef.current(); };
    const timer = window.setInterval(() => { if (canReload()) reloadRef.current(); }, POLL_INTERVAL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
