import { describe, expect, it } from "vitest";
import { MENU_TREE, type MenuLeaf } from "../nav/menuTree";
import appSource from "../App.tsx?raw";

const leaves = MENU_TREE.flatMap((group) => group.children);
const byLabel = (label: string): MenuLeaf | undefined => leaves.find((item) => item.label === label);

describe("辅料报表菜单", () => {
  it("辅料退仓查询使用已实现的本地旧版页面入口", () => {
    expect(byLabel("辅料退仓查询")).toMatchObject({
      path: "/auxiliary-stock-return-query",
      perm: "辅料退仓查询",
    });
    expect(byLabel("辅料退库查询")).toBeUndefined();
  });

  it("registers the auxiliary stocktake query menu and route", () => {
    expect(byLabel("辅料盘点查询")).toMatchObject({
      path: "/auxiliary-stocktake-query",
      perm: "辅料盘点查询",
    });
    expect(appSource).toContain('path="auxiliary-stocktake-query"');
    expect(appSource).toContain("AuxiliaryStocktakeQueryPage");
  });
});
