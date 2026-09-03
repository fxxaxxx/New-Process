import {
  createContext, isValidElement, useCallback, useContext, useMemo,
  useRef, useState, type ReactNode,
} from "react";
import { Navigate, useLocation, useOutlet } from "react-router-dom";

// 路由级页面缓存(keep-alive):切到其他部门/页面再回来,该页已选择的行和已填入的数据不丢。
// 原理:把 useOutlet() 的节点按 pathname 缓存,非活动页用 display:none 隐藏而不是卸载,
// 组件 state 因此保留;「关闭」= drop(pathname) 清掉缓存,下次进入重新挂载回到初始状态。
// 纯重定向路由(<Navigate>)不缓存,避免隐藏实例反复触发跳转。

const MAX_CACHED = 20; // 最多同时缓存的页面数,超出淘汰最久未访问的

interface KeepAliveEntry { key: string; node: ReactNode }

interface KeepAliveCtxValue {
  entries: KeepAliveEntry[];
  activeKey: string;
  isRedirect: boolean;
  outlet: ReactNode;
  /** 清除某页缓存(不传 key = 当前页)。清除后下次进入该页重新挂载、数据清空。 */
  drop: (key?: string) => void;
}

const Ctx = createContext<KeepAliveCtxValue>({
  entries: [], activeKey: "", isRedirect: false, outlet: null, drop: () => {},
});

export const useKeepAlive = () => useContext(Ctx);

export function KeepAliveProvider({ children }: { children: ReactNode }) {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const cacheRef = useRef(new Map<string, ReactNode>());
  // 刚被 drop 但仍停留在该页时,本次停留期间不再入缓存(否则同位置同类型元素会保留旧 state)
  const skipRef = useRef(new Set<string>());
  const [, bump] = useState(0);

  const isRedirect = isValidElement(outlet) && outlet.type === Navigate;

  // 清掉非当前页的 skip 标记(skip 只在「drop 后仍停留在该页」期间有意义)
  for (const k of skipRef.current) if (k !== pathname) skipRef.current.delete(k);

  if (outlet && !isRedirect && !skipRef.current.has(pathname)) {
    const c = cacheRef.current;
    c.delete(pathname);            // 刷新 LRU 位置
    c.set(pathname, outlet);
    while (c.size > MAX_CACHED) c.delete(c.keys().next().value!);
  }

  const drop = useCallback((key?: string) => {
    const k = key ?? pathname;
    cacheRef.current.delete(k);
    skipRef.current.add(k);
    bump(n => n + 1);
  }, [pathname]);

  const value = useMemo<KeepAliveCtxValue>(() => ({
    entries: [...cacheRef.current].map(([key, node]) => ({ key, node })),
    activeKey: pathname, isRedirect, outlet, drop,
    // entries 依赖 ref 内容,每次渲染重新展开即可;bump 触发重渲染保证 drop 后视图更新
  }), [pathname, isRedirect, outlet, drop]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// 放在原 <Outlet /> 的位置:活动页正常渲染,缓存页 display:none 隐藏保活
export function KeepAliveOutlet() {
  const { entries, activeKey, isRedirect, outlet } = useContext(Ctx);
  if (isRedirect) return <>{outlet}</>;
  const activeCached = entries.some(e => e.key === activeKey);
  return (
    <>
      {entries.map(({ key, node }) => (
        <div key={key} style={key === activeKey ? { display: "contents" } : { display: "none" }}>
          {node}
        </div>
      ))}
      {/* 当前页不在缓存(如刚被 drop 尚未跳转)时直接渲染 outlet */}
      {!activeCached && outlet}
    </>
  );
}
