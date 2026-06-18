import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addRecordsToGroup,
  createGroup,
  deleteApiKey,
  deleteGroup,
  deleteRecord,
  deleteRecordsBatch,
  getAllApiKeys,
  getAllGroups,
  getAllRecords,
  getAllRecordsWithGroups,
  getGroupById,
  getGroupByToken,
  getGroupsWithRecordCount,
  getRecordsByGroupId,
  getRecordsByGroupToken,
  getStats,
  toggleApiKey,
  updateGroup,
  updateGroupStatus,
  createApiKey,
} from "./db";
import { createHash } from "crypto";

// ─── Admin guard middleware ───────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可操作" });
  }
  return next({ ctx });
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Public: 客户展示页查询（groupToken校验） ─────────────────────────────
  share: router({
    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const { group, records } = await getRecordsByGroupToken(input.token);

        if (!group) {
          return { status: "not_found" as const, group: null, records: [] };
        }
        if (group.status === "disabled") {
          return { status: "disabled" as const, group: null, records: [] };
        }

        // 只返回客户需要看到的字段，不暴露内部信息
        const safeRecords = records.map((r) => ({
          id: r.id,
          remark: r.remark,
          accelerateIp: r.accelerateIp,
          acceleratePort: r.acceleratePort,
          vmessLink: r.vmessLink,
          clashLink: r.clashLink,
          protocol: r.protocol,
          status: r.status,
        }));

        return {
          status: "ok" as const,
          group: {
            customerName: group.customerName,
            createdAt: group.createdAt,
          },
          records: safeRecords,
        };
      }),
  }),

  // ─── Admin: 数据总览 ──────────────────────────────────────────────────────
  admin: router({
    getStats: adminProcedure.query(async () => {
      return getStats();
    }),

    // 获取所有记录，支持筛选
    getRecords: adminProcedure
      .input(
        z.object({
          filter: z.enum(["all", "assigned", "unassigned"]).default("all"),
        })
      )
      .query(async ({ input }) => {
        const filter =
          input.filter === "all" ? undefined : (input.filter as "assigned" | "unassigned");
        return getAllRecordsWithGroups(filter);
      }),

    // 删除单条记录
    deleteRecord: adminProcedure
      .input(z.object({ recordId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteRecord(input.recordId);
        return { success: true };
      }),

    // 批量删除记录
    deleteRecordsBatch: adminProcedure
      .input(z.object({ recordIds: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        await deleteRecordsBatch(input.recordIds);
        return { success: true, deleted: input.recordIds.length };
      }),

    // 获取所有分组（含记录数）
    getGroups: adminProcedure.query(async () => {
      return getGroupsWithRecordCount();
    }),

    // 获取分组详情（含记录列表）
    getGroupDetail: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const group = await getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "分组不存在" });
        const recs = await getRecordsByGroupId(input.groupId);
        return { group, records: recs };
      }),

    // 创建分组
    createGroup: adminProcedure
      .input(
        z.object({
          customerName: z.string().min(1).max(128),
          description: z.string().max(500).optional(),
          recordIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const groupToken = nanoid(32);
        await createGroup({
          customerName: input.customerName,
          groupToken,
          description: input.description,
          createdBy: ctx.user.openId,
        });

        const group = await getGroupByToken(groupToken);
        if (!group) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        if (input.recordIds && input.recordIds.length > 0) {
          await addRecordsToGroup(group.id, input.recordIds);
        }

        return { groupId: group.id, groupToken };
      }),

    // 向已有分组添加记录
    addRecordsToGroup: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          recordIds: z.array(z.number()).min(1),
        })
      )
      .mutation(async ({ input }) => {
        const group = await getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "分组不存在" });
        await addRecordsToGroup(input.groupId, input.recordIds);
        return { success: true };
      }),

    // 禁用/启用分组
    toggleGroupStatus: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          status: z.enum(["active", "disabled"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateGroupStatus(input.groupId, input.status);
        return { success: true };
      }),

    // 更新分组（客户名称 / 更换groupToken）
    updateGroup: adminProcedure
      .input(
        z.object({
          groupId: z.number(),
          customerName: z.string().min(1).max(128).optional(),
          regenerateToken: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const group = await getGroupById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "分组不存在" });

        const updateData: { customerName?: string; groupToken?: string } = {};
        if (input.customerName) updateData.customerName = input.customerName;
        if (input.regenerateToken) updateData.groupToken = nanoid(32);

        await updateGroup(input.groupId, updateData);

        const updated = await getGroupById(input.groupId);
        return { success: true, groupToken: updated?.groupToken };
      }),

    // 删除分组
    deleteGroup: adminProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteGroup(input.groupId);
        return { success: true };
      }),

    // ─── API Key 管理 ──────────────────────────────────────────────────────
    getApiKeys: adminProcedure.query(async () => {
      return getAllApiKeys();
    }),

    createApiKey: adminProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ input, ctx }) => {
        const rawKey = `xui_${nanoid(40)}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.substring(0, 12);

        await createApiKey({
          name: input.name,
          keyHash,
          keyPrefix,
          createdBy: ctx.user.openId,
        });

        return { rawKey, keyPrefix };
      }),

    deleteApiKey: adminProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteApiKey(input.keyId);
        return { success: true };
      }),

    toggleApiKey: adminProcedure
      .input(z.object({ keyId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleApiKey(input.keyId, input.isActive);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
