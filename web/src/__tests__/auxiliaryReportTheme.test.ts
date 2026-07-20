import { describe, expect, it } from "vitest";

import inventoryPageSource from "../pages/auxiliary/AuxiliaryInventoryPage.tsx?raw";
import monthlyPageSource from "../pages/auxiliary/AuxiliaryMonthlyPage.tsx?raw";
import orderReceiptStatsPageSource from "../pages/auxiliary/AuxiliaryOrderReceiptStatsPage.tsx?raw";
import progressDetailPageSource from "../pages/auxiliary/AuxiliaryProgressDetailPage.tsx?raw";
import issueDetailPageSource from "../pages/auxiliary/AuxiliaryIssueDetailPage.tsx?raw";
import purchaseOrderQueryPageSource from "../pages/auxiliary/AuxiliaryPurchaseOrderQueryPage.tsx?raw";
import receiptQueryPageSource from "../pages/auxiliary/AuxiliaryReceiptQueryPage.tsx?raw";
import stockIssueQueryPageSource from "../pages/auxiliary/AuxiliaryStockIssueQueryPage.tsx?raw";
import stockReturnQueryPageSource from "../pages/auxiliary/AuxiliaryStockReturnQueryPage.tsx?raw";
import stocktakeQueryPageSource from "../pages/auxiliary/AuxiliaryStocktakeQueryPage.tsx?raw";

const implementedReportPages = [
  ["AuxiliaryInventoryPage.tsx", inventoryPageSource],
  ["AuxiliaryMonthlyPage.tsx", monthlyPageSource],
  ["AuxiliaryOrderReceiptStatsPage.tsx", orderReceiptStatsPageSource],
  ["AuxiliaryProgressDetailPage.tsx", progressDetailPageSource],
  ["AuxiliaryIssueDetailPage.tsx", issueDetailPageSource],
  ["AuxiliaryPurchaseOrderQueryPage.tsx", purchaseOrderQueryPageSource],
  ["AuxiliaryReceiptQueryPage.tsx", receiptQueryPageSource],
  ["AuxiliaryStockIssueQueryPage.tsx", stockIssueQueryPageSource],
  ["AuxiliaryStockReturnQueryPage.tsx", stockReturnQueryPageSource],
  ["AuxiliaryStocktakeQueryPage.tsx", stocktakeQueryPageSource],
] as const;

describe("auxiliary report layout", () => {
  it("uses the modern card layout for every implemented auxiliary report page", () => {
    for (const [file, source] of implementedReportPages) {
      expect(source, file).toContain("AuxiliaryReportLayout");
      expect(source, file).not.toContain("auxiliaryReportTheme");
      expect(source, file).not.toContain("TableOutlined");
      expect(source, file).not.toContain("border: `2px solid");
    }
  });
});
