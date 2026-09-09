import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTelegram, isTelegramConfigured, adminChatIds } from "./telegram";

const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_ADMIN_CHAT_ID; });

describe("adminChatIds", () => {
  it("accepts bare ids and Name:id pairs (the UO shape), drops names and junk", () => {
    process.env.TELEGRAM_ADMIN_CHAT_ID = "Alex:6112545054, Della:7000000001,  42 ,-100123, bogus, Eve:x";
    expect(adminChatIds()).toEqual(["6112545054", "7000000001", "42", "-100123"]);
  });
  it("is empty when unset", () => {
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    expect(adminChatIds()).toEqual([]);
  });
});

describe("sendTelegram", () => {
  it("dry-runs without creds and never calls fetch", async () => {
    expect(isTelegramConfigured()).toBe(false);
    const r = await sendTelegram({ text: "hi" });
    expect(r).toMatchObject({ sent: false, channel: "telegram", reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("posts to every comma-separated chat id and never leaks the token in the result", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc"; process.env.TELEGRAM_ADMIN_CHAT_ID = "1, 2";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const r = await sendTelegram({ text: "hello" });
    expect(r.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ chat_id: "2", text: "hello" });
    expect(JSON.stringify(r)).not.toContain("123:abc");
  });
  it("reports failure without throwing", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t"; process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ ok: false, description: "bad" }) });
    const r = await sendTelegram({ text: "x" });
    expect(r).toMatchObject({ sent: false, reason: "bad" });
  });
});
