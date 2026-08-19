import { describe, expect, it } from "vitest";
import { MENU_TREE, type MenuLeaf } from "../nav/menuTree";
import appSource from "../App.tsx?raw";

const leaves = MENU_TREE.flatMap((group) => group.children);
const byLabel = (label: string): MenuLeaf | undefined => leaves.find((item) => item.label === label);

describe("辅料报表菜单", () => {
  it("辅料菜单项已从菜单移除(辅料仓分组已删除),页面仍保留路由", () => {
    expect(byLabel("辅料退仓查询")).toBeUndefined();
    expect(byLabel("辅料盘点查询")).toBeUndefined();
  });

  it("auxiliary stocktake query route is still registered", () => {
    expect(appSource).toContain('path="auxiliary-stocktake-query"');
    expect(appSource).toContain("AuxiliaryStocktakeQueryPage");
  });
});
