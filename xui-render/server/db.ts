import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, apiKeys, groupRecords, groups, records, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Records helpers ─────────────────────────────────────────────────────────

export async function getAllRecords(filter?: "assigned" | "unassigned") {
  const db = await getDb();
  if (!db) return [];

  if (filter === "assigned") {
    const assignedIds = db.selectDistinct({ recordId: groupRecords.recordId }).from(groupRecords);
    return db.select().from(records).where(inArray(records.id, assignedIds)).orderBy(desc(records.createdAt));
  } else if (filter === "unassigned") {
    const assignedIds = db.selectDistinct({ recordId: groupRecords.recordId }).from(groupRecords);
    return db.select().from(records).where(notInArray(records.id, assignedIds)).orderBy(desc(records.createdAt));
  }

  return db.select().from(records).orderBy(desc(records.createdAt));
}

/**
 * 插入单条记录，按 accelerateIp+acceleratePort 去重（upsert）
 * 重复时更新 vmessLink、clashLink、protocol、batchId
 */
export async function insertRecord(data: {
  panelId: string;
  inboundId: number;
  remark?: string;
  accelerateIp: string;
  acceleratePort: number;
  vmessLink?: string;
  clashLink?: string;
  protocol?: string;
  batchId?: string;
  status?: "success" | "failed" | "skipped";
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(records).values(data).onDuplicateKeyUpdate({
    set: {
      panelId: data.panelId,
      inboundId: data.inboundId,
      remark: data.remark ?? "",
      vmessLink: data.vmessLink ?? null,
      clashLink: data.clashLink ?? null,
      protocol: data.protocol ?? "vmess",
      batchId: data.batchId ?? null,
      status: data.status ?? "success",
      note: data.note ?? null,
    },
  });
  return result;
}

/**
 * 批量插入记录，按 accelerateIp+acceleratePort 去重（upsert）
 * 返回实际插入/更新的记录数
 */
export async function insertRecordsBatch(
  dataList: Array<{
    panelId: string;
    inboundId: number;
    remark?: string;
    accelerateIp: string;
    acceleratePort: number;
    vmessLink?: string;
    clashLink?: string;
    protocol?: string;
    batchId?: string;
    status?: "success" | "failed" | "skipped";
    note?: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (dataList.length === 0) return [];

  // MySQL 不支持批量 onDuplicateKeyUpdate 返回所有 ID，逐条 upsert
  const insertedIds: number[] = [];
  for (const data of dataList) {
    const result = await db.insert(records).values(data).onDuplicateKeyUpdate({
      set: {
        panelId: data.panelId,
        inboundId: data.inboundId,
        remark: data.remark ?? "",
        vmessLink: data.vmessLink ?? null,
        clashLink: data.clashLink ?? null,
        protocol: data.protocol ?? "vmess",
        batchId: data.batchId ?? null,
        status: data.status ?? "success",
        note: data.note ?? null,
      },
    });
    // insertId 为 0 表示是更新（重复），> 0 表示新插入
    const insertId = (result as unknown as { insertId: number }[])[0]?.insertId ?? 0;
    if (insertId > 0) {
      insertedIds.push(insertId);
    } else {
      // 重复时查找现有记录 ID
      const existing = await db
        .select({ id: records.id })
        .from(records)
        .where(and(eq(records.accelerateIp, data.accelerateIp), eq(records.acceleratePort, data.acceleratePort)))
        .limit(1);
      if (existing.length > 0) insertedIds.push(existing[0].id);
    }
  }
  return insertedIds;
}

/**
 * 删除单条记录（同时清理关联）
 */
export async function deleteRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(groupRecords).where(eq(groupRecords.recordId, id));
  await db.delete(records).where(eq(records.id, id));
}

/**
 * 批量删除记录
 */
export async function deleteRecordsBatch(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(groupRecords).where(inArray(groupRecords.recordId, ids));
  await db.delete(records).where(inArray(records.id, ids));
}

// ─── Groups helpers ───────────────────────────────────────────────────────────

export async function getAllGroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groups).orderBy(desc(groups.createdAt));
}

export async function getGroupByToken(groupToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groups).where(eq(groups.groupToken, groupToken)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGroup(data: {
  customerName: string;
  groupToken: string;
  description?: string;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(groups).values(data);
  return result;
}

export async function updateGroupStatus(id: number, status: "active" | "disabled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(groups).set({ status, updatedAt: new Date() }).where(eq(groups.id, id));
}

/**
 * 更新分组信息（客户名称 / groupToken）
 */
export async function updateGroup(id: number, data: { customerName?: string; groupToken?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(groups).set({ ...data, updatedAt: new Date() }).where(eq(groups.id, id));
}

export async function deleteGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(groupRecords).where(eq(groupRecords.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
}

// ─── GroupRecords helpers ─────────────────────────────────────────────────────

export async function addRecordsToGroup(groupId: number, recordIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (recordIds.length === 0) return;
  // 使用 INSERT IGNORE 避免重复关联报错
  for (const recordId of recordIds) {
    await db.insert(groupRecords).values({ groupId, recordId }).onDuplicateKeyUpdate({
      set: { groupId, recordId },
    });
  }
}

export async function getRecordsByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ record: records })
    .from(groupRecords)
    .innerJoin(records, eq(groupRecords.recordId, records.id))
    .where(eq(groupRecords.groupId, groupId))
    .orderBy(desc(records.createdAt));
  return rows.map((r) => r.record);
}

export async function getRecordsByGroupToken(groupToken: string) {
  const db = await getDb();
  if (!db) return { group: undefined, records: [] };

  const group = await getGroupByToken(groupToken);
  if (!group) return { group: undefined, records: [] };

  const recs = await getRecordsByGroupId(group.id);
  return { group, records: recs };
}

export async function getGroupsWithRecordCount() {
  const db = await getDb();
  if (!db) return [];

  // 使用子查询方式避免 TiDB only_full_group_by 严格模式报错
  const groupList = await db
    .select()
    .from(groups)
    .orderBy(desc(groups.createdAt));

  if (groupList.length === 0) return [];

  // 批量查询每个分组的记录数
  const counts = await db
    .select({
      groupId: groupRecords.groupId,
      recordCount: sql<number>`COUNT(*)`,
    })
    .from(groupRecords)
    .groupBy(groupRecords.groupId);

  const countMap = new Map(counts.map((c) => [c.groupId, Number(c.recordCount)]));

  return groupList.map((g) => ({
    ...g,
    recordCount: countMap.get(g.id) ?? 0,
  }));
}

// ─── API Keys helpers ─────────────────────────────────────────────────────────

export async function getAllApiKeys() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      usageCount: apiKeys.usageCount,
      createdBy: apiKeys.createdBy,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createApiKey(data: {
  name: string;
  keyHash: string;
  keyPrefix: string;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(apiKeys).values(data);
}

export async function updateApiKeyUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date(), usageCount: sql`${apiKeys.usageCount} + 1` })
    .where(eq(apiKeys.id, id));
}

export async function deleteApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

export async function toggleApiKey(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(apiKeys).set({ isActive }).where(eq(apiKeys.id, id));
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats() {
  const db = await getDb();
  if (!db) return { totalRecords: 0, totalGroups: 0, activeGroups: 0, unassignedRecords: 0 };

  const [totalRecordsResult, totalGroupsResult, activeGroupsResult] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(records),
    db.select({ count: sql<number>`COUNT(*)` }).from(groups),
    db.select({ count: sql<number>`COUNT(*)` }).from(groups).where(eq(groups.status, "active")),
  ]);

  const assignedIds = db.selectDistinct({ recordId: groupRecords.recordId }).from(groupRecords);
  const unassignedResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(records)
    .where(notInArray(records.id, assignedIds));

  return {
    totalRecords: totalRecordsResult[0]?.count ?? 0,
    totalGroups: totalGroupsResult[0]?.count ?? 0,
    activeGroups: activeGroupsResult[0]?.count ?? 0,
    unassignedRecords: unassignedResult[0]?.count ?? 0,
  };
}
