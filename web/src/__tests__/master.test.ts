import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => {
  const calls: { method: string; url: string; cfg?: unknown }[] = [];
  const rec = (method: string) => (url: string, cfg?: unknown) => {
    calls.push({ method, url, cfg });
    return Promise.resolve({ data: { items: [], total: 0 } });
  };
  return { api: { get: rec("get"), post: rec("post"), put: rec("put"), delete: rec("delete"), __calls: calls } };
});

import { masterApi } from "../api/master";
import { api } from "../api/client";

describe("masterApi", () => {
  beforeEach(() => { (api as unknown as { __calls: unknown[] }).__calls.length = 0; });

  it("builds resource paths", async () => {
    const a = masterApi("customers");
    await a.list(2, 10, "甲");
    await a.get(5);
    await a.update(5, { 客户名称: "x" });
    await a.remove(5);
    const calls = (api as unknown as { __calls: { method: string; url: string }[] }).__calls;
    expect(calls[0]).toMatchObject({ method: "get", url: "/master/customers" });
    expect(calls[1]).toMatchObject({ method: "get", url: "/master/customers/5" });
    expect(calls[2]).toMatchObject({ method: "put", url: "/master/customers/5" });
    expect(calls[3]).toMatchObject({ method: "delete", url: "/master/customers/5" });
  });
});
