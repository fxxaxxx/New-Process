import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => {
  const calls: { method: string; url: string; cfg?: unknown }[] = [];
  const rec = (method: string) => (url: string, cfg?: unknown) => {
    calls.push({ method, url, cfg });
    return Promise.resolve({ data: { items: [], total: 0, count: 3 } });
  };
  return { api: { get: rec("get"), post: rec("post"), put: rec("put"), delete: rec("delete"), __calls: calls } };
});

import { messagesApi } from "../api/messages";
import { api } from "../api/client";

describe("messagesApi", () => {
  beforeEach(() => { (api as unknown as { __calls: unknown[] }).__calls.length = 0; });

  it("builds message endpoints", async () => {
    await messagesApi.list(2, 10, true);
    await messagesApi.list();
    const count = await messagesApi.unreadCount();
    await messagesApi.markRead(7);
    const calls = (api as unknown as { __calls: { method: string; url: string; cfg?: { params?: unknown } }[] }).__calls;
    expect(calls[0]).toMatchObject({ method: "get", url: "/messages" });
    expect(calls[0].cfg?.params).toEqual({ onlyUnread: true, page: 2, size: 10 });
    expect(calls[1].cfg?.params).toEqual({ onlyUnread: false, page: 1, size: 20 });
    expect(calls[2]).toMatchObject({ method: "get", url: "/messages/unread-count" });
    expect(count).toBe(3);
    expect(calls[3]).toMatchObject({ method: "post", url: "/messages/7/read" });
  });
});
