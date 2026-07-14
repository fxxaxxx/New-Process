import { describe, expect, it } from "vitest";
import pageSource from "../pages/styles/BomSetupPage.tsx?raw";

describe("装配物料设置持久化回归", () => {
  it("hydrates and saves extension, ordered quotes, and BOM row metadata", () => {
    expect(pageSource).toContain("const hasExtension = Object.prototype.hasOwnProperty.call(full, \"扩展\")");
    expect(pageSource).toContain("const hasQuotes = Object.prototype.hasOwnProperty.call(full, \"报价\")");
    expect(pageSource).toContain("产品装配名称: extension?.产品装配名称");
    expect(pageSource).toContain("共用物料编号: extension?.共用物料编号");
    expect(pageSource).toContain("工模编号: r.工模编号.trim() || null");
    expect(pageSource).toContain("备注: r.备注.trim() || null");
    expect(pageSource).toContain("body.报价 = quoteRows");
    expect(pageSource).toContain("顺序: i + 1");
  });

  it("uses the supplied return route and real audit endpoints", () => {
    expect(pageSource).toContain("export function buildCloseTarget(returnTo: string): string;");
    expect(pageSource).toContain("if (returnTo) navigate(buildCloseTarget(returnTo))");
    expect(pageSource).toContain("/styles/${encodeURIComponent(key)}/${audited ? \"reverse-audit\" : \"audit\"}");
  });

  it("makes an audited detail read-only without sending audit metadata in save", () => {
    expect(pageSource).toContain("const readOnly = audited");
    expect(pageSource).toContain("disabled={readOnly}");
    expect(pageSource).toContain("setAudited(Boolean(extension?.调整审核))");
    expect(pageSource).not.toContain("调整审核: v.");
  });
});
