import { describe, expect, it } from "vitest";
import { MENU_TREE, type MenuLeaf } from "../nav/menuTree";

// RR-Portal 外部系统入口:path 为 http 完整 URL,新标签打开(MainLayout 判断),不挂权限全员可见
const leaves = MENU_TREE.flatMap((group) => group.children);
const external = leaves.filter((l) => l.path?.startsWith("http"));
const byLabel = (label: string): MenuLeaf | undefined => leaves.find((item) => item.label === label);

describe("外部系统菜单入口(RR-Portal)", () => {
  it("共 18 个外链入口,全部指向门户地址且带 ↗ 标记", () => {
    expect(external.length).toBe(18);
    for (const l of external) {
      expect(l.path).toMatch(/^http:\/\/8\.148\.146\.194\//);
      expect(l.label).toContain("↗");
      expect(l.perm).toBeUndefined(); // 不挂权限=全员可见
    }
  });

  it("各部门关键入口在对应分组", () => {
    expect(byLabel("ZURU接单表入单系统↗")?.path).toBe("http://8.148.146.194/zuru-order-system/");
    expect(byLabel("报价系统↗")?.path).toBe("http://8.148.146.194/baojia/");
    expect(byLabel("内部报价系统↗")?.path).toBe("http://8.148.146.194/internal-quote/");
    expect(byLabel("TOMY排期核对系统↗")?.path).toBe("http://8.148.146.194/tomy-paiqi/");
    expect(byLabel("加工厂月度评审↗")?.path).toBe("http://8.148.146.194/factory-review/");
    expect(byLabel("船务管理系统↗")?.path).toBe("http://8.148.146.194/shipping/");
    expect(byLabel("印尼走货明细(印尼专用)↗")?.path).toBe("http://8.148.146.194/indo-shipping/");
  });

  it("总排期入单/河源排期入单 不放(ERP 排期模块已覆盖)", () => {
    expect(byLabel("ZURU总排期入单↗")).toBeUndefined();
    expect(byLabel("河源排期入单↗")).toBeUndefined();
  });
});
