import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import * as db from "./db";

export function registerPasswordAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      res.status(500).json({ error: "Server not configured with ADMIN_PASSWORD" });
      return;
    }

    if (password !== adminPassword) {
      res.status(401).json({ error: "密码错误" });
      return;
    }

    // 简单密码模式下，我们使用一个固定的 openId：'admin'
    const adminOpenId = "admin_user";
    
    // 确保数据库中有这个用户，且角色为 admin
    await db.upsertUser({
      openId: adminOpenId,
      name: "管理员",
      role: "admin",
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(adminOpenId, {
      name: "管理员",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    res.json({ success: true });
  });
}
