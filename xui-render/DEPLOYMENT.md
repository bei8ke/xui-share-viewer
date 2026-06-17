# x-ui 结果分享查看器 — 完整部署文档

> **重要说明**：本项目的管理员登录功能依赖 **Manus OAuth** 服务，因此推荐直接在 Manus 平台一键发布（免费、零配置）。若需要部署到自己的服务器，本文档也提供了完整的独立部署方案（使用简单密码登录替代 OAuth）。

---

## 目录

1. [系统架构](#1-%E7%B3%BB%E7%BB%9F%E6%9E%B6%E6%9E%84)

1. [方案一：Manus 平台一键发布（](#2-%E6%96%B9%E6%A1%88%E4%B8%80manus-%E5%B9%B3%E5%8F%B0%E4%B8%80%E9%94%AE%E5%8F%91%E5%B8%83%E6%8E%A8%E8%8D%90)

1. [）](#2-%E6%96%B9%E6%A1%88%E4%B8%80manus-%E5%B9%B3%E5%8F%B0%E4%B8%80%E9%94%AE%E5%8F%91%E5%B8%83%E6%8E%A8%E8%8D%90)

1. [方案二：Railway 免费云平台部署](#3-%E6%96%B9%E6%A1%88%E4%BA%8Crailway-%E5%85%8D%E8%B4%B9%E4%BA%91%E5%B9%B3%E5%8F%B0%E9%83%A8%E7%BD%B2)

1. [方案三：本地电脑运行](#4-%E6%96%B9%E6%A1%88%E4%B8%89%E6%9C%AC%E5%9C%B0%E7%94%B5%E8%84%91%E8%BF%90%E8%A1%8C)

1. [数据库初始化 SQL](#5-%E6%95%B0%E6%8D%AE%E5%BA%93%E5%88%9D%E5%A7%8B%E5%8C%96-sql)

1. [管理员账号设置](#6-%E7%AE%A1%E7%90%86%E5%91%98%E8%B4%A6%E5%8F%B7%E8%AE%BE%E7%BD%AE)

1. [本地端工具对接](#7-%E6%9C%AC%E5%9C%B0%E7%AB%AF%E5%B7%A5%E5%85%B7%E5%AF%B9%E6%8E%A5)

1. [日常使用流程](#8-%E6%97%A5%E5%B8%B8%E4%BD%BF%E7%94%A8%E6%B5%81%E7%A8%8B)

1. [API 接口参考](#9-api-%E6%8E%A5%E5%8F%A3%E5%8F%82%E8%80%83)

1. [常见问题](#10-%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)

---

## 1. 系统架构

```
┌─────────────────────────┐    HTTPS POST /api/import    ┌──────────────────────────────┐
│    本地端（你的电脑）     │  ──────────────────────►   │     云端展示端（服务器）        │
│                         │       API Key 鉴权           │                              │
│  x-ui 批量工具           │                             │  管理员后台  /admin            │
│  处理结果 → 推送到云端    │◄──────────────────────      │  客户展示页  /s/{uuid}         │
└─────────────────────────┘                             └──────────────────────────────┘
```

| 部分 | 运行位置 | 访问者 |
| --- | --- | --- |
| 本地端工具 | 你的 Windows 电脑 | 仅你本人 |
| 管理员后台 `/admin` | 云端服务器 | 仅你本人（登录保护） |
| 客户展示页 `/s/{uuid}` | 云端服务器 | 你的客户（UUID 链接） |

---

## 2. 方案一：Manus 平台一键发布（推荐）

**优点**：零配置、免费、数据库已内置、无需任何服务器知识。

### 步骤

1. 在 Manus 项目管理界面找到 **xui-share-viewer** 项目

1. 点击右上角 **Publish（发布）** 按钮，等待约 1-2 分钟

1. 部署完成后获得公开域名：`https://xxx.manus.space`

1. 可在 **Settings → Domains** 绑定自定义域名

### 设置管理员

发布后 ，访问 `/admin` 登录，然后在 Manus 项目的 **Database** 面板执行：

```sql
-- 查询你的 openId
SELECT id, openId, name, role FROM users;

-- 将你的账号提升为管理员（替换为实际 openId）
UPDATE users SET role = 'admin' WHERE openId = '你的openId';
```

---

## 3. 方案二：Railway 免费云平台部署

Railway 提供每月 $5 免费额度，足够本项目使用，且支持 MySQL 数据库。

### 3.1 前置准备

- 注册 [Railway](https://railway.app) 账号（使用 GitHub 登录）

- 安装 [Node.js 18+](https://nodejs.org) 和 [pnpm](https://pnpm.io)

- 安装 [Railway CLI](https://docs.railway.app/develop/cli)：`npm install -g @railway/cli`

### 3.2 创建数据库

1. 在 Railway 控制台点击 **New Project → Database → MySQL**

1. 等待数据库启动，点击数据库服务，在 **Variables** 标签页找到 `DATABASE_URL`，格式为：

   ```
   mysql://root:password@host:port/railway
   ```

1. 记录此 URL，后续配置使用

### 3.3 部署应用

```bash
# 1. 解压源代码
unzip xui-share-viewer.zip
cd xui-share-viewer

# 2. 安装依赖
pnpm install

# 3. 登录 Railway
railway login

# 4. 初始化项目（在已有 Railway 项目中运行）
railway init

# 5. 配置环境变量（在 Railway 控制台 Variables 页面添加以下变量）
```

在 Railway 项目的 **Variables** 页面添加以下环境变量：

| 变量名 | 说明 | 示例值 |
| --- | --- | --- |
| `DATABASE_URL` | MySQL 连接字符串（从数据库服务复制） | `mysql://root:xxx@host:port/railway` |
| `JWT_SECRET` | 会话加密密钥（随机字符串，至少32位） | `your-random-secret-key-here-32chars` |
| `ADMIN_PASSWORD` | 管理员登录密码 | `your-admin-password` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口（Railway 自动注入，无需手动设置） | — |

```bash
# 6. 部署
railway up

# 7. 获取公开 URL
railway open
```

### 3.4 初始化数据库

部署完成后，在 Railway 控制台的 **MySQL 服务 → Query** 面板，或使用本地 MySQL 客户端连接，执行 [第5节的初始化 SQL](#5-%E6%95%B0%E6%8D%AE%E5%BA%93%E5%88%9D%E5%A7%8B%E5%8C%96-sql)。

### 3.5 替代免费平台

若 Railway 免费额度不够，可选择以下替代方案：

| 平台 | 免费额度 | 数据库 | 说明 |
| --- | --- | --- | --- |
| [Render](https://render.com) | 750小时/月 | PostgreSQL（需修改 schema） | 冷启动较慢 |
| [Fly.io](https://fly.io) | 3个共享CPU | MySQL/PostgreSQL | 需要 flyctl 工具 |
| [Zeabur](https://zeabur.com) | 免费套餐 | MySQL | 中文界面，国内访问快 |

---

## 4. 方案三：本地电脑运行

适合在局域网内使用，或通过 [ngrok](https://ngrok.com) 等工具暴露到公网。

### 4.1 安装依赖

```bash
# 安装 Node.js 18+ (https://nodejs.org )
# 安装 pnpm
npm install -g pnpm

# 解压并进入项目目录
unzip xui-share-viewer.zip
cd xui-share-viewer

# 安装项目依赖
pnpm install
```

### 4.2 安装 MySQL

**Windows 推荐使用 XAMPP（最简单）：**

1. 下载 [XAMPP](https://www.apachefriends.org)，安装后启动 MySQL 服务

1. 默认连接：`mysql://root@localhost:3306/xui_share`

1. 在 phpMyAdmin 中创建数据库：`CREATE DATABASE xui_share CHARACTER SET utf8mb4;`

**或使用 Docker（需安装 Docker Desktop）：**

```bash
docker run -d \
  --name xui-mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=xui_share \
  -p 3306:3306 \
  mysql:8.0
```

### 4.3 配置环境变量

在项目根目录创建 `.env` 文件：

```
# 数据库连接（根据实际情况修改）
DATABASE_URL=mysql://root:yourpassword@localhost:3306/xui_share

# 会话加密密钥（随机字符串，至少32位）
JWT_SECRET=your-random-secret-key-at-least-32-characters

# 管理员密码（用于后台登录）
ADMIN_PASSWORD=your-admin-password

# 运行环境
NODE_ENV=development

# 服务端口（可选，默认3000）
PORT=3000
```

### 4.4 初始化数据库

执行 [第5节的初始化 SQL](#5-%E6%95%B0%E6%8D%AE%E5%BA%93%E5%88%9D%E5%A7%8B%E5%8C%96-sql)，可通过 MySQL 命令行或 phpMyAdmin 执行。

### 4.5 启动服务

```bash
# 开发模式（支持热更新）
pnpm dev

# 生产模式
pnpm build
pnpm start
```

访问 `http://localhost:3000` ，管理员后台在 `http://localhost:3000/admin` 。

### 4.6 通过 ngrok 暴露到公网（可选）

```bash
# 安装 ngrok (https://ngrok.com )
# 启动隧道
ngrok http 3000
```

ngrok 会提供一个临时公网 URL ，如 `https://abc123.ngrok.io` ，客户可通过此 URL 访问。

> **注意**：免费版 ngrok 每次重启 URL 会变化，付费版可固定域名。

---

## 5. 数据库初始化 SQL

在 MySQL 数据库中执行以下 SQL 创建所需表结构：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `openId` VARCHAR(64) NOT NULL UNIQUE,
  `name` TEXT,
  `email` VARCHAR(320),
  `loginMethod` VARCHAR(64),
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- x-ui 批量操作结果记录表
CREATE TABLE IF NOT EXISTS `records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `panelId` VARCHAR(256) NOT NULL,
  `inboundId` INT NOT NULL,
  `remark` VARCHAR(256) DEFAULT '',
  `accelerateIp` VARCHAR(64) NOT NULL,
  `acceleratePort` INT NOT NULL,
  `vmessLink` TEXT,
  `clashLink` TEXT,
  `qrCodeUrl` TEXT,
  `protocol` VARCHAR(32) DEFAULT 'vmess',
  `batchId` VARCHAR(64),
  `status` ENUM('success', 'failed', 'skipped') NOT NULL DEFAULT 'success',
  `note` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_records_panelId` (`panelId`),
  INDEX `idx_records_batchId` (`batchId`),
  INDEX `idx_records_createdAt` (`createdAt`)
);

-- 客户分组表
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customerName` VARCHAR(128) NOT NULL,
  `uuidToken` VARCHAR(64) NOT NULL UNIQUE,
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `description` TEXT,
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_groups_uuidToken` (`uuidToken`),
  INDEX `idx_groups_status` (`status`)
);

-- 分组-记录关联表
CREATE TABLE IF NOT EXISTS `group_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `recordId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gr_groupId` (`groupId`),
  INDEX `idx_gr_recordId` (`recordId`)
);

-- API 密钥表
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(128) NOT NULL,
  `keyHash` VARCHAR(128) NOT NULL UNIQUE,
  `keyPrefix` VARCHAR(16) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `lastUsedAt` TIMESTAMP NULL,
  `usageCount` BIGINT NOT NULL DEFAULT 0,
  `createdBy` VARCHAR(64),
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_apikeys_keyHash` (`keyHash`)
);
```

---

## 6. 管理员账号设置

### 在 Manus 平台

参见 [第2节](#2-%E6%96%B9%E6%A1%88%E4%B8%80manus-%E5%B9%B3%E5%8F%B0%E4%B8%80%E9%94%AE%E5%8F%91%E5%B8%83%E6%8E%A8%E8%8D%90) 的说明，通过 Database 面板执行 SQL 提升权限。

### 在 Railway / 本地部署

由于独立部署版本使用简单密码登录（通过 `ADMIN_PASSWORD` 环境变量），直接访问 `/admin` 并输入配置的密码即可登录，无需额外设置。

---

## 7. 本地端工具对接

### 7.1 创建 API 密钥

1. 登录管理员后台，进入 **API 密钥** 页面

1. 点击「创建密钥」，输入名称（如：`本地工具-主机A`）

1. 密钥创建后**立即复制**，格式为 `xui_xxxxxxxxxxxxxxxxxxxxxxxx`

1. 密钥只显示一次，请妥善保存

### 7.2 Python 对接示例

将以下代码集成到你的 x-ui 批量工具中：

```python
import requests
import json
from datetime import datetime

# ── 配置 ──────────────────────────────────────────────
# 替换为你的实际域名和 API 密钥
API_URL = "https://你的域名/api/import"
API_KEY = "xui_xxxxxxxxxxxxxxxxxxxxxxxx"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# ── 推送单条记录 ───────────────────────────────────────
def push_single_record(record: dict ) -> dict:
    """
    record 字段说明：
    - panel_id (必填): 面板地址，如 "192.168.1.1:54321"
    - inbound_id (必填): 入站 ID，如 1
    - accelerate_ip (必填): 加速节点 IP，如 "1.2.3.4"
    - accelerate_port (必填): 加速节点端口，如 443
    - remark (可选): 备注名称
    - vmess_link (可选): VMess 链接
    - clash_link (可选): Clash 订阅链接
    - qr_code_url (可选): 二维码图片 URL 或 Base64
    - protocol (可选): 协议类型，默认 "vmess"
    - batch_id (可选): 批次 ID
    - status (可选): "success" | "failed" | "skipped"，默认 "success"
    """
    resp = requests.post(API_URL, json=record, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


# ── 批量推送记录 ───────────────────────────────────────
def push_batch_records(records: list[dict], batch_id: str = None) -> dict:
    """批量推送，推荐用于一次性推送多条记录"""
    if batch_id is None:
        batch_id = f"batch-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    payload = {
        "records": records,
        "batch_id": batch_id
    }
    resp = requests.post(API_URL, json=payload, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    result = resp.json()
    print(f"[推送成功] 批次 {batch_id}：{result.get('inserted', 0)} 条记录")
    return result


# ── 验证 API 密钥 ──────────────────────────────────────
def verify_connection() -> bool:
    """启动时验证 API 密钥是否有效"""
    try:
        resp = requests.get(
            API_URL.replace("/import", "/import/health"),
            headers=HEADERS,
            timeout=10
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"[连接失败] {e}")
        return False


# ── 使用示例 ───────────────────────────────────────────
if __name__ == "__main__":
    # 验证连接
    if not verify_connection():
        print("API 密钥无效，请检查配置")
        exit(1)
    
    # 批量推送示例
    results = [
        {
            "panel_id": "192.168.1.1:54321",
            "inbound_id": 1,
            "remark": "节点1-香港",
            "accelerate_ip": "1.2.3.4",
            "accelerate_port": 443,
            "vmess_link": "vmess://eyJhZGQiOiIxLjIuMy40IiwuLi59",
            "clash_link": "http://1.2.3.4:443/clash/1",
            "protocol": "vmess",
            "status": "success"
        },
        {
            "panel_id": "192.168.1.2:54321",
            "inbound_id": 2,
            "remark": "节点2-新加坡",
            "accelerate_ip": "5.6.7.8",
            "accelerate_port": 8443,
            "vmess_link": "vmess://eyJhZGQiOiI1LjYuNy44IiwuLi59",
            "protocol": "vmess",
            "status": "success"
        }
    ]
    
    push_batch_records(results )
```

---

## 8. 日常使用流程

```
第一步：本地端批量操作
  └─ 运行 x-ui 批量工具，完成加速配置
  └─ 工具调用 /api/import 将结果推送到云端

第二步：管理员后台分组
  └─ 访问 /admin → 所有记录
  └─ 筛选「未分配」记录，勾选需要分配给某客户的记录
  └─ 点击「创建分组」，输入客户名称
  └─ 系统自动生成 UUID 专属链接

第三步：发送链接给客户
  └─ 在「分组管理」或「链接管理」页面复制客户链接
  └─ 格式：https://你的域名/s/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  └─ 将链接发送给对应客户

第四步：客户访问
  └─ 客户打开链接 ，看到专属配置页面
  └─ 可查看 VMess 链接、Clash 订阅、加速节点信息
  └─ 支持一键复制，无任何后台入口
```

---

## 9. API 接口参考

### POST /api/import — 推送记录

```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**批量模式请求体：**

```json
{
  "records": [
    {
      "panel_id": "192.168.1.1:54321",
      "inbound_id": 1,
      "accelerate_ip": "1.2.3.4",
      "accelerate_port": 443,
      "remark": "节点备注",
      "vmess_link": "vmess://...",
      "clash_link": "http://...",
      "qr_code_url": "data:image/png;base64,...",
      "protocol": "vmess",
      "status": "success",
      "batch_id": "batch-001"
    }
  ],
  "batch_id": "batch-001"
}
```

**成功响应：**

```json
{ "success": true, "inserted": 2, "batch_id": "batch-001" }
```

| HTTP 状态码 | 含义 |
| --- | --- |
| 200 | 推送成功 |
| 400 | 缺少必填字段（panel_id / accelerate_ip / accelerate_port ） |
| 401 | API Key 无效或缺失 |
| 500 | 服务器内部错误 |

### GET /api/import/health — 健康检查

```
Authorization: Bearer {API_KEY}
```

响应：`{ "success": true, "message": "API key is valid" }`

---

## 10. 常见问题

**Q：客户访问链接显示「链接无效」？**

检查：① 分组状态是否为「活跃」；② 链接格式是否正确（`/s/` 后接完整 UUID）；③ 分组是否被删除（删除后永久失效）。

---

**Q：推送数据时返回 401？**

检查：① 请求头格式 `Authorization: Bearer xui_xxx`；② API Key 是否在管理后台被禁用；③ 重新创建新密钥并更新本地配置。

---

**Q：本地部署时管理员后台无法登录？**

独立部署版本需要在 `.env` 中设置 `ADMIN_PASSWORD`，然后在 `/admin` 页面输入该密码登录。

---

**Q：如何将同一批次记录分配给多个客户？**

在「所有记录」页面筛选该批次，分多次勾选不同记录子集，分别创建不同客户分组，每个分组生成独立 UUID 链接。

---

**Q：数据库容量是否够用？**

每条记录约占 1-2 KB，200 条记录约 400 KB。Railway/Render 免费版数据库容量均在 1 GB 以上，完全够用。

---

*文档版本：v1.1 | 最后更新：2026-06*

