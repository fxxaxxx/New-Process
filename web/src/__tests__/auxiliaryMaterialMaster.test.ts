import { describe, expect, it } from "vitest";
import {
  AUXILIARY_MATERIAL_DEFAULT_CATEGORY,
  buildAuxiliaryMaterialQuery,
  toAuxiliaryMaterialRow,
} from "../utils/auxiliaryMaterialMaster";

describe("辅料资料字段映射与查询参数", () => {
  it("默认按辅料资料分类查询，并清理空关键字", () => {
    expect(buildAuxiliaryMaterialQuery({
      category: AUXILIARY_MATERIAL_DEFAULT_CATEGORY,
      keyword: "  A-001 ",
      page: 2,
      size: 50,
    })).toEqual({
      类别: "辅料资料",
      keyword: "A-001",
      page: 2,
      size: 50,
    });

    expect(buildAuxiliaryMaterialQuery({
      category: "__ALL__",
      keyword: "   ",
      page: 1,
      size: 50,
    })).toEqual({
      类别: undefined,
      keyword: undefined,
      page: 1,
      size: 50,
    });
  });

  it("把物料资料行转换成辅料资料展示行", () => {
    expect(toAuxiliaryMaterialRow({
      ID: 8,
      物料类别: "辅料资料",
      物料编号: "F001",
      物料名称: "白色棉线",
      规格: "20S",
      码换算: "12",
      单位: "PCS",
      备注: "常用",
      仓库位置: "A-01",
    })).toEqual({
      ID: 8,
      物料类别: "辅料资料",
      辅料编号: "F001",
      辅料名称: "白色棉线",
      规格: "20S",
      每单位数值: "12",
      辅料计算使用单位: "PCS",
      单位: "PCS",
      备注: "常用",
      仓库位置: "A-01",
    });
  });
});
