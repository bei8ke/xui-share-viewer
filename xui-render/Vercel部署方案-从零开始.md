# xui-share-viewer —— Vercel 全新部署方案（保姆级图文步骤）

> 本方案是**全新部署**，不是在旧项目上修改。请严格按照下面的顺序操作，每一步都已为你写清楚。
>
> 整个流程分为五大步：
> 1. 准备工作（确认数据库 + 安装工具）
> 2. 把新代码包推送到一个全新的 GitHub 仓库
> 3. 在 Vercel 导入仓库并配置环境变量
> 4. 点击部署，等待上线
> 5. 上线后验证 + 更新本地推送工具

---

## 这次为什么能成功？（简单了解即可）

你之前部署 Vercel 一直报 **404**，根本原因是：你的项目是一个**常驻型 Express 服务器**（`server.listen` 一直监听端口），而 Vercel 用的是 **Serverless（无服务器）** 架构，它不接受"常驻服务器"这种写法，所以一直找不到页面。

我已经在沙箱里帮你做好了适配改造，并且**真实连接你的 TiDB 数据库做了端到端测试**，确认：
- 首页、`/admin` 后台页、`/s/分享页` 都能正常打开（HTTP 200）
- 后端 API 能正常响应鉴权（返回 401 而不是 404）
- 用你数据库里真实的客户 token 查询，成功返回了客户 "Ruin、" 的数据

所以这份代码包是**已验证可用**的。

### 我具体改了哪些文件（你不用自己改，已经打包好了）

| 文件 | 说明 |
|---|---|
| `api/index.ts` | **新增**。Vercel 专用的后端入口，把整个 Express 应用导出给 Vercel 调用 |
| `vercel.json` | **新增**。告诉 Vercel：`/api/*` 走后端，其它路径返回前端页面（解决 404 的关键） |
| `package.json` | **新增** `vercel-build` 脚本，让 Vercel 只构建前端 |
| `tsconfig.json` | 把 `api/` 目录纳入编译范围 |
| `.env.example` | **新增**。环境变量填写模板 |

---

## 第一步：准备工作

### 1.1 确认数据库已就绪

你之前已经成功在 TiDB 里建好表并导入了历史数据，这一步**无需重做**。我们这次继续用同一个数据库。

你的数据库连接串（后面会用到，请先复制好）：

```
mysql://2RDpnK4VYsUSxDb.root:ugJzEQn1QwefGlOt@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}
```

### 1.2 确认电脑上已安装 Git

打开命令行（黑框框），输入：

```bash
git --version
```

如果显示了版本号（如 `git version 2.xx`），说明已安装。如果提示找不到命令，请到 [https://git-scm.com/downloads](https://git-scm.com/downloads) 下载安装。

---

## 第二步：把新代码推送到全新的 GitHub 仓库

> 为了干净，建议**新建一个全新的 GitHub 仓库**，避免和之前 Render 用的仓库混在一起。

### 2.1 在 GitHub 新建一个空仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. **Repository name** 填：`xui-share-viewer-vercel`
3. 选择 **Private（私有）**（推荐，保护你的代码）
4. **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license"（保持完全空白）
5. 点击绿色按钮 **Create repository**
6. 创建后，复制页面上显示的仓库地址，形如：
   `https://github.com/你的用户名/xui-share-viewer-vercel.git`

### 2.2 解压我给你的新代码包

把我交付的 `xui-share-viewer-vercel.zip` 解压，你会得到一个 `xui-vercel` 文件夹（里面就是完整项目）。

### 2.3 在该文件夹里初始化 Git 并推送

打开命令行，**进入解压后的文件夹**（用 `cd` 命令，把路径换成你自己的）：

```bash
cd "C:\你解压的路径\xui-vercel"
```

然后依次执行下面的命令（一行一行复制，每行回车后等它跑完）：

```bash
git init
git add .
git commit -m "Vercel 全新部署版本"
git branch -M main
git remote add origin https://github.com/你的用户名/xui-share-viewer-vercel.git
git push -u origin main
```

> 如果推送时要求登录，按提示用浏览器授权登录 GitHub 即可。

推送成功后，刷新 GitHub 仓库页面，应该能看到所有代码文件。

---

## 第三步：在 Vercel 导入项目

### 3.1 登录 Vercel

打开 [https://vercel.com/](https://vercel.com/)，用你的 GitHub 账号登录。

### 3.2 导入仓库

1. 登录后，点击右上角 **Add New...** → 选择 **Project**
2. 在 "Import Git Repository" 列表里找到 `xui-share-viewer-vercel`，点它右边的 **Import**
   - 如果列表里没有，点 **Adjust GitHub App Permissions** 授权 Vercel 访问你的仓库

### 3.3 配置项目（关键，别点太快）

进入配置页面后：

- **Framework Preset（框架预设）**：Vercel 通常会自动识别为 `Vite`。如果没有，手动选 **Vite**。
- **Build Command / Output Directory**：**保持默认即可**，因为我已经在 `vercel.json` 里写好了，Vercel 会自动读取，你不用手动填。

### 3.4 配置环境变量（最重要的一步！）

在配置页面往下找到 **Environment Variables（环境变量）** 区域，添加以下变量：

| Key（变量名） | Value（值） |
|---|---|
| `DATABASE_URL` | `mysql://2RDpnK4VYsUSxDb.root:ugJzEQn1QwefGlOt@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | 随便填一串长随机字符，例如 `xui_vercel_secret_2026_abc123` |

> **填写方法**：在 Key 输入框填变量名，在 Value 输入框填值，每填一个点一次 **Add**。

> **特别注意**：`DATABASE_URL` 的值要**完整复制**，包括末尾的 `?ssl={"rejectUnauthorized":true}` 这一段，一个字符都不能少，否则会连不上数据库。

---

## 第四步：部署

1. 确认环境变量都填好后，点击页面底部的 **Deploy** 按钮。
2. Vercel 开始构建，等待约 **2~4 分钟**。
3. 看到 **"Congratulations!"** 和撒花动画，就说明部署成功了！
4. 点击页面上的项目预览图或 **Continue to Dashboard**，进入项目主页。
5. 在项目主页顶部能看到你的网址，形如：
   `https://xui-share-viewer-vercel.vercel.app`

---

## 第五步：上线后验证

### 5.1 打开网址测试

把上面的 `https://xxx.vercel.app` 网址复制到浏览器打开：

- 打开**根网址**：应该能看到后台管理界面（不再是 404 了！）
- 打开 `https://你的网址/admin`：应该正常显示后台
- 打开 `https://你的网址/s/iKBg-sf8X-pmp4vy6NW8QSnP0XEZq4q_`（这是你数据库里真实的一个客户分享页）：应该能看到客户 "Ruin、" 的展示页

### 5.2 测试 API 健康检查

在浏览器打开：

```
https://你的网址/api/import/health
```

如果返回 `{"success":false,"error":"Unauthorized"}` 这样的 JSON（注意：是 JSON 而不是 404 页面），就说明**后端 API 已经正常工作**了（401 是因为没带 API Key，属于正常现象）。

### 5.3 更新本地推送工具的配置

部署成功后，把你本地推送工具（采集脚本）里原来填 Render 网址的地方，**改成这个新的 Vercel 网址**，API Key 保持不变即可。

---

## 常见问题排查

| 现象 | 原因 | 解决办法 |
|---|---|---|
| 打开网址还是 404 | Vercel 没读到 `vercel.json` | 确认 `vercel.json` 在仓库**根目录**，重新 push 后在 Vercel 点 Redeploy |
| 页面能开但数据加载失败 | `DATABASE_URL` 填错或不完整 | 到 Vercel → Settings → Environment Variables 检查，确保末尾 SSL 参数完整，改完后 Redeploy |
| API 返回 500 | 缺少 `JWT_SECRET` | 在环境变量里补上 `JWT_SECRET`，Redeploy |
| 改了环境变量不生效 | Vercel 需要重新部署才会读新变量 | 项目 → Deployments → 最新一条 → 右侧 "..." → Redeploy |

### 如何重新部署（Redeploy）

如果改了环境变量或代码，需要让 Vercel 重新部署：

1. 进入 Vercel 项目主页
2. 点顶部 **Deployments** 标签
3. 找到最新一条部署记录，点最右边的 **"..."**
4. 选择 **Redeploy** → 确认

---

## 关于"秒开"

部署到 Vercel 后，前端页面由全球 CDN 托管，**打开几乎是秒开**，不会再有 Render 那种几十秒黑屏加载。

需要留意的一点：Vercel 的后端 Serverless 函数在长时间无人访问后，第一次请求可能有 1~2 秒的"冷启动"（远比 Render 的几十秒快得多），之后就都是秒级响应。这对你的使用场景几乎无感。

---

部署过程中遇到任何报错，把报错截图或文字发给我，我帮你解决。
