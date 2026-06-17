import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getRecordsByGroupUuid: vi.fn(),
  getAllRecords: vi.fn(),
  getAllGroups: vi.fn(),
  getGroupsWithRecordCount: vi.fn(),
  getGroupById: vi.fn(),
  getGroupByUuid: vi.fn(),
  getRecordsByGroupId: vi.fn(),
  createGroup: vi.fn(),
  addRecordsToGroup: vi.fn(),
  updateGroupStatus: vi.fn(),
  deleteGroup: vi.fn(),
  getAllApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
  toggleApiKey: vi.fn(),
  getStats: vi.fn(),
  getApiKeyByHash: vi.fn(),
  insertRecord: vi.fn(),
  insertRecordsBatch: vi.fn(),
  updateApiKeyUsage: vi.fn(),
}));

import {
  getRecordsByGroupUuid,
  getAllRecords,
  getGroupsWithRecordCount,
  getGroupById,
  getGroupByUuid,
  createGroup,
  addRecordsToGroup,
  getStats,
} from "./db";

// ─── Context factories ────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin",
      email: "admin@example.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-open-id",
      name: "User",
      email: "user@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("share.getByUuid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when UUID does not exist", async () => {
    vi.mocked(getRecordsByGroupUuid).mockResolvedValue({
      group: undefined,
      records: [],
    });

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.share.getByUuid({ uuid: "nonexistent-uuid" });

    expect(result.status).toBe("not_found");
    expect(result.group).toBeNull();
    expect(result.records).toHaveLength(0);
  });

  it("returns disabled when group status is disabled", async () => {
    vi.mocked(getRecordsByGroupUuid).mockResolvedValue({
      group: {
        id: 1,
        customerName: "Test Customer",
        uuidToken: "test-uuid",
        status: "disabled",
        description: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      records: [],
    });

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.share.getByUuid({ uuid: "test-uuid" });

    expect(result.status).toBe("disabled");
    expect(result.group).toBeNull();
  });

  it("returns ok with safe record fields when group is active", async () => {
    vi.mocked(getRecordsByGroupUuid).mockResolvedValue({
      group: {
        id: 1,
        customerName: "Test Customer",
        uuidToken: "active-uuid",
        status: "active",
        description: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      records: [
        {
          id: 10,
          panelId: "192.168.1.1:54321",
          inboundId: 1,
          remark: "节点1",
          accelerateIp: "1.2.3.4",
          acceleratePort: 443,
          vmessLink: "vmess://abc123",
          clashLink: "http://1.2.3.4:443/clash/1",
          qrCodeUrl: null,
          protocol: "vmess",
          batchId: "batch-001",
          status: "success",
          note: null,
          createdAt: new Date(),
        },
      ],
    });

    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.share.getByUuid({ uuid: "active-uuid" });

    expect(result.status).toBe("ok");
    expect(result.group?.customerName).toBe("Test Customer");
    expect(result.records).toHaveLength(1);

    // 验证只返回安全字段，不暴露 panelId 等内部字段
    const record = result.records[0] as Record<string, unknown>;
    expect(record.vmessLink).toBe("vmess://abc123");
    expect(record.accelerateIp).toBe("1.2.3.4");
    expect(record.panelId).toBeUndefined();
    expect(record.batchId).toBeUndefined();
  });
});

describe("admin procedures - access control", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN when non-admin calls getStats", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.admin.getStats()).rejects.toThrow("仅管理员可操作");
  });

  it("throws UNAUTHORIZED when unauthenticated user calls getStats", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.admin.getStats()).rejects.toThrow();
  });

  it("allows admin to call getStats", async () => {
    vi.mocked(getStats).mockResolvedValue({
      totalRecords: 10,
      totalGroups: 3,
      activeGroups: 2,
      unassignedRecords: 5,
    });

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.getStats();

    expect(result.totalRecords).toBe(10);
    expect(result.totalGroups).toBe(3);
  });
});

describe("admin.createGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates group and returns uuidToken", async () => {
    vi.mocked(createGroup).mockResolvedValue(undefined as never);
    vi.mocked(getGroupByUuid).mockResolvedValue({
      id: 99,
      customerName: "New Customer",
      uuidToken: "generated-uuid",
      status: "active",
      description: null,
      createdBy: "admin-open-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(addRecordsToGroup).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.createGroup({
      customerName: "New Customer",
      recordIds: [1, 2, 3],
    });

    expect(result.groupId).toBe(99);
    expect(typeof result.uuidToken).toBe("string");
    expect(result.uuidToken.length).toBeGreaterThan(0);
  });

  it("throws when recordIds is empty", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.admin.createGroup({
        customerName: "Test",
        recordIds: [],
      })
    ).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeAdminCtx();
    const clearedCookies: string[] = [];
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});
