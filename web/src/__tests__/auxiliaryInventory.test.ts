import { describe, expect, it } from "vitest";
import {
  AUXILIARY_INVENTORY_CATEGORY,
  AUXILIARY_INVENTORY_WAREHOUSE,
  buildAuxiliaryInventoryQuery,
  toAuxiliaryInventoryRow,
} from "../utils/auxiliaryInventory";

describe("辅料库存统计表查询与字段映射", () => {
  it("固定按辅料仓库和辅料资料查询库存", () => {
    expect(buildAuxiliaryInventoryQuery("  圆形贴纸  ")).toEqual({
      仓库: AUXILIARY_INVENTORY_WAREHOUSE,
      物料类别: AUXILIARY_INVENTORY_CATEGORY,
      keyword: "圆形贴纸",
    });

    expect(buildAuxiliaryInventoryQuery("   ")).toEqual({
      仓库: "辅料仓库",
      物料类别: "辅料资料",
      keyword: undefined,
    });
  });

  it("把物料库存行转换成辅料库存统计表列", () => {
    expect(toAuxiliaryInventoryRow({
      物料编号: "FL-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      仓库: "辅料仓库",
      库存数量: 12,
      物料类别: "辅料资料",
      每单位数值: "366",
      仓库位置: "A-01",
    })).toEqual({
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      每单位数值: "366",
      单位: "卷",
      库存数量: 12,
      仓库位置: "A-01",
    });
  });
});
