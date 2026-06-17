import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
  boolean,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * x-ui 批量操作结果记录表
 * 由本地端工具通过 REST API 推送
 * 按 accelerateIp + acceleratePort 唯一约束去重
 */
export const records = mysqlTable(
  "records",
  {
    id: int("id").autoincrement().primaryKey(),
    /** 面板标识，如 IP:端口 */
    panelId: varchar("panelId", { length: 256 }).notNull(),
    /** 入站 ID */
    inboundId: int("inboundId").notNull(),
    /** 入站备注 */
    remark: varchar("remark", { length: 256 }).default(""),
    /** 加速 IP */
    accelerateIp: varchar("accelerateIp", { length: 64 }).notNull(),
    /** 加速端口 */
    acceleratePort: int("acceleratePort").notNull(),
    /** VMess 链接 */
    vmessLink: text("vmessLink"),
    /** Clash 订阅链接 */
    clashLink: text("clashLink"),
    /** 协议类型 */
    protocol: varchar("protocol", { length: 32 }).default("vmess"),
    /** 批次标识，同一次批量操作共享同一 batchId */
    batchId: varchar("batchId", { length: 64 }),
    /** 操作状态 */
    status: mysqlEnum("status", ["success", "failed", "skipped"]).default("success").notNull(),
    /** 备注信息（操作日志） */
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_records_panelId").on(table.panelId),
    index("idx_records_batchId").on(table.batchId),
    index("idx_records_createdAt").on(table.createdAt),
    /** 按加速节点（IP+端口）去重 */
    unique("uq_records_node").on(table.accelerateIp, table.acceleratePort),
  ]
);

export type Record = typeof records.$inferSelect;
export type InsertRecord = typeof records.$inferInsert;

/**
 * 客户分组表
 * 每个分组对应一个客户，通过 groupToken 访问
 * groupToken 可以更换（更换后旧链接失效）
 */
export const groups = mysqlTable(
  "groups",
  {
    id: int("id").autoincrement().primaryKey(),
    /** 客户名称 */
    customerName: varchar("customerName", { length: 128 }).notNull(),
    /** 专属访问 Token，用于生成客户链接，可更换 */
    groupToken: varchar("groupToken", { length: 64 }).notNull().unique(),
    /** 分组状态：active=正常，disabled=已禁用 */
    status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
    /** 分组描述 */
    description: text("description"),
    /** 创建者 openId */
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_groups_groupToken").on(table.groupToken),
    index("idx_groups_status").on(table.status),
  ]
);

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * 分组-记录关联表
 */
export const groupRecords = mysqlTable(
  "group_records",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId").notNull(),
    recordId: int("recordId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_gr_groupId").on(table.groupId),
    index("idx_gr_recordId").on(table.recordId),
    unique("uq_gr_group_record").on(table.groupId, table.recordId),
  ]
);

export type GroupRecord = typeof groupRecords.$inferSelect;
export type InsertGroupRecord = typeof groupRecords.$inferInsert;

/**
 * REST API 鉴权密钥表
 */
export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    keyHash: varchar("keyHash", { length: 128 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    usageCount: bigint("usageCount", { mode: "number" }).default(0).notNull(),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_apikeys_keyHash").on(table.keyHash)]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
