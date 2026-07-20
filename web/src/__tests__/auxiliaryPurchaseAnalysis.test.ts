import { describe, expect, it } from "vitest";
import {
  AUXILIARY_PURCHASE_DEFAULT_CATEGORY,
  buildAuxiliaryPurchaseAnalysisQuery,
  normalizeAuxiliaryPurchaseRow,
} from "../utils/auxiliaryPurchaseAnalysis";

describe("辅料采购分析表查询与数量计算", () => {
  it("默认按辅料资料分类查询，并支持只显示要订货", () => {
    expect(buildAuxiliaryPurchaseAnalysisQuery({
      category: AUXILIARY_PURCHASE_DEFAULT_CATEGORY,
      keyword: "  棉线 ",
      onlyBuy: true,
    })).toEqual({
      物料类别: "辅料资料",
      keyword: "棉线",
      onlyBuy: true,
    });

    expect(buildAuxiliaryPurchaseAnalysisQuery({
      category: "",
      keyword: "   ",
      onlyBuy: false,
    })).toEqual({
      物料类别: undefined,
      keyword: undefined,
      onlyBuy: false,
    });
  });

  it("按库存、在途和需领数量计算可用库存与订货数量", () => {
    expect(normalizeAuxiliaryPurchaseRow({
      辅料编号: "F001",
      辅料名称: "白色棉线",
      库存数量: 10,
      在途数量: 2,
      需领数量: 20,
    })).toMatchObject({
      辅料编号: "F001",
      辅料名称: "白色棉线",
      库存数量: 10,
      在途数量: 2,
      需领数量: 20,
      可用库存: -8,
      订货数量: 8,
    });

    expect(normalizeAuxiliaryPurchaseRow({
      库存数量: 30,
      在途数量: 5,
      需领数量: 20,
      可用库存: 99,
      订货数量: 77,
    })).toMatchObject({
      可用库存: 99,
      订货数量: 77,
    });
  });
});
