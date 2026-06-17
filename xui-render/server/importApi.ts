import { createHash } from "crypto";
import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import {
  addRecordsToGroup,
  createGroup,
  getApiKeyByHash,
  getDb,
  getGroupByToken,
  getGroupsWithRecordCount,
  insertRecordsBatch,
  updateApiKeyUsage,
} from "./db";
import { records, groups } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

/**
 * 验证 API Key
 * 请求头格式: Authorization: Bearer xui_xxxxxxxx...
 */
async function verifyApiKey(req: Request): Promise<{ valid: boolean; keyId?: number }> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return { valid: false };
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await getApiKeyByHash(keyHash);
  if (!apiKey) return { valid: false };
  return { valid: true, keyId: apiKey.id };
}

/**
 * 为 Import API 路由设置 CORS 响应头
 */
function setCorsHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * 注册 REST API 路由
 */
export function registerImportApi(app: Express) {
  // OPTIONS 预检请求
  app.options("/api/import", (_req: Request, res: Response) => {
    setCorsHeaders(res);
    return res.sendStatus(204);
  });
  app.options("/api/import/health", (_req: Request, res: Response) => {
    setCorsHeaders(res);
    return res.sendStatus(204);
  });
  app.options("/api/import/groups", (_req: Request, res: Response) => {
    setCorsHeaders(res);
    return res.sendStatus(204);
  });

  /**
   * GET /api/import/groups
   * 获取所有分组列表（供本地端拉取，用于同步时选择分组）
   * 返回: { groups: [{ id, customerName, groupToken, status, recordCount }] }
   */
  app.get("/api/import/groups", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const auth = await verifyApiKey(req);
    if (!auth.valid) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    try {
      const groupList = await getGroupsWithRecordCount();
      return res.json({
        success: true,
        groups: groupList.map((g) => ({
          id: g.id,
          customerName: g.customerName,
          groupToken: g.groupToken,
          status: g.status,
          recordCount: g.recordCount,
        })),
      });
    } catch (err) {
      console.error("[Import API] Failed to get groups:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * POST /api/import
   * 推送批量操作结果，并关联到指定分组
   *
   * Body:
   * {
   *   records: Array<{
   *     panel_id, inbound_id, remark?,
   *     accelerate_ip, accelerate_port,
   *     vmess_link?, clash_link?, protocol?, batch_id?, status?, note?
   *   }>,
   *   group_token?: string,   // 已有分组的 token（优先使用）
   *   group_name?: string,    // 新建分组时的客户名称（group_token 不匹配时使用）
   *   origin?: string,        // 前端 origin，用于构建分享链接
   * }
   */
  app.post("/api/import", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    try {
      const auth = await verifyApiKey(req);
      if (!auth.valid) {
        return res.status(401).json({ success: false, error: "Unauthorized: invalid or missing API key" });
      }

      const body = req.body;

      // 必须是批量模式
      if (!body.records || !Array.isArray(body.records)) {
        return res.status(400).json({
          success: false,
          error: "Request body must contain a 'records' array",
        });
      }

      const batchId = body.batch_id || nanoid(16);
      const dataList = body.records.map((item: Record<string, unknown>) => ({
        panelId: String(item.panel_id || ""),
        inboundId: Number(item.inbound_id || 0),
        remark: item.remark ? String(item.remark) : "",
        accelerateIp: String(item.accelerate_ip || ""),
        acceleratePort: Number(item.accelerate_port || 0),
        vmessLink: item.vmess_link ? String(item.vmess_link) : undefined,
        clashLink: item.clash_link ? String(item.clash_link) : undefined,
        protocol: item.protocol ? String(item.protocol) : "vmess",
        batchId: item.batch_id ? String(item.batch_id) : batchId,
        status: (["success", "failed", "skipped"].includes(String(item.status))
          ? item.status
          : "success") as "success" | "failed" | "skipped",
        note: item.note ? String(item.note) : undefined,
      }));

      // 验证必填字段
      for (const d of dataList) {
        if (!d.panelId || !d.accelerateIp || !d.acceleratePort) {
          return res.status(400).json({
            success: false,
            error: "Each record must have panel_id, accelerate_ip, accelerate_port",
          });
        }
      }

      // 插入记录（去重 upsert），返回实际记录 ID 列表
      const recordIds = await insertRecordsBatch(dataList);

      if (auth.keyId) await updateApiKeyUsage(auth.keyId);

      // ─── 分组关联逻辑 ─────────────────────────────────────────────────────
      let shareUrl: string | undefined;
      let groupToken: string | undefined;
      let groupId: number | undefined;
      let isNewGroup = false;

      const providedToken = body.group_token && typeof body.group_token === "string"
        ? body.group_token.trim()
        : null;
      const groupName = body.group_name && typeof body.group_name === "string"
        ? body.group_name.trim()
        : null;

      if (providedToken) {
        // 尝试匹配已有分组
        const existingGroup = await getGroupByToken(providedToken);
        if (existingGroup) {
          groupId = existingGroup.id;
          groupToken = existingGroup.groupToken;
        } else {
          // token 不匹配，视为新建分组
          isNewGroup = true;
        }
      }

      if (!groupId && (groupName || isNewGroup)) {
        // 新建分组
        const newToken = nanoid(32);
        await createGroup({
          customerName: groupName || "未命名分组",
          groupToken: newToken,
          description: `通过 API 自动创建，batch_id: ${batchId}`,
          createdBy: "api",
        });
        const created = await getGroupByToken(newToken);
        if (created) {
          groupId = created.id;
          groupToken = created.groupToken;
        }
      }

      // 关联记录到分组
      if (groupId && recordIds.length > 0) {
        await addRecordsToGroup(groupId, recordIds);
        const origin = body.origin || `${req.protocol}://${req.get("host")}`;
        shareUrl = `${origin}/s/${groupToken}`;
      }

      return res.json({
        success: true,
        inserted: dataList.length,
        batch_id: batchId,
        group_token: groupToken,
        is_new_group: isNewGroup,
        ...(shareUrl ? { share_url: shareUrl } : {}),
      });
    } catch (err) {
      console.error("[Import API] Error:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * GET /api/import/health
   * 健康检查，验证 API Key 是否有效
   */
  app.get("/api/import/health", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const auth = await verifyApiKey(req);
    if (!auth.valid) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    return res.json({ success: true, message: "API key is valid" });
  });
}
