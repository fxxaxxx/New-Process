import type { ReactNode } from "react";
import { Tabs } from "antd";
import { useSearchParams } from "react-router-dom";

// 「单据+查询」合并页:制单页 + 查询页 合在一个路由的两个页签,功能与两个独立页面完全一致。
// 页签经 ?tab=query 同步;原查询路由在 App.tsx 里重定向到 单据路由?tab=query。
export default function DocQueryTabs({ docLabel, queryLabel, doc, query }: {
  docLabel: string; queryLabel: string; doc: ReactNode; query: ReactNode;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "query" ? "query" : "doc";
  const switchTab = (k: string) =>
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      if (k === "query") n.set("tab", "query"); else n.delete("tab");
      return n;
    }, { replace: true });
  return (
    <Tabs activeKey={tab} onChange={switchTab} items={[
      { key: "doc", label: docLabel, children: doc },
      { key: "query", label: queryLabel, children: query },
    ]} />
  );
}
