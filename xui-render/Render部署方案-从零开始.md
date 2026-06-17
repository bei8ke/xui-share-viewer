# xui-share-viewer —— Render 全新部署方案（保姆级图文步骤）

> 本方案是**全新部署**，不是在旧项目上修改。请严格按照下面的顺序操作，每一步都已为你写清楚。
>
> 整个流程分为五大步：
> 1. 准备工作（确认数据库 + 安装工具）
> 2. 把新代码包推送到一个全新的 GitHub 仓库
> 3. 在 Render 导入仓库并配置服务
> 4. 点击部署，等待上线
> 5. 上线后验证 + 更新本地推送工具

---

## 这次为什么能成功？（简单了解即可）

Vercel 部署失败是因为它采用 Serverless 架构，不适合你项目这种 Express 常驻服务器的模式。而 **Render** 是一个更传统的 PaaS (Platform as a Service) 平台，它完美支持运行 Express 这种常驻型后端服务，部署起来会更稳定、更符合你的项目架构。

我已经帮你把代码包调整回了适合 Render 部署的模式，并且：
- 移除了 Vercel 相关的配置文件 (`vercel.json`, `api/index.ts`)
- 调整了 `package.json` 的构建和启动脚本，使其符合 Render 的要求

### 我具体改了哪些文件（你不用自己改，已经打包好了）

| 文件 | 说明 |
|---|---|
| `api/index.ts` | **已删除**。Render 不需要这个 Vercel 专用的入口文件 |
| `vercel.json` | **已删除**。Render 不需要这个 Vercel 路由配置 |
| `package.json` | 移除了 `vercel-build` 脚本，确保 `build` 和 `start` 脚本符合 Render 运行 Express 的要求 |

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

> 为了干净，建议**新建一个全新的 GitHub 仓库**，避免和之前 Render 用的仓库混在一起。如果你想继续用 `xui-share-viewer-vercel` 这个仓库，请确保你已经把里面的 Vercel 相关文件删除，并把新的 Render 代码包推上去。

### 2.1 在 GitHub 新建一个空仓库

1. 打开 [https://github.com/new](https://github.com/new)
2. **Repository name** 填：`xui-share-viewer-render` (或者你之前创建的 `xui-share-viewer-vercel`)
3. 选择 **Private（私有）**（推荐，保护你的代码）
4. **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license"（保持完全空白）
5. 点击绿色按钮 **Create repository**
6. 创建后，复制页面上显示的仓库地址，形如：
   `https://github.com/你的用户名/xui-share-viewer-render.git`

### 2.2 解压我给你的新代码包

把我交付的 `xui-share-viewer-render.zip` 解压，你会得到一个 `xui-render` 文件夹（里面就是完整项目）。

### 2.3 在该文件夹里初始化 Git 并推送

打开命令行，**进入解压后的文件夹**（用 `cd` 命令，把路径换成你自己的）：

```bash
cd "C:\你解压的路径\xui-render"
```

然后依次执行下面的命令（一行一行复制，每行回车后等它跑完）：

```bash
git init
git add .
git commit -m "Render 全新部署版本"
git branch -M main
git remote add origin https://github.com/你的用户名/xui-share-viewer-render.git
git push -u origin main
```

> 如果推送时要求登录，按提示用浏览器授权登录 GitHub 即可。

推送成功后，刷新 GitHub 仓库页面，应该能看到所有代码文件。

---

## 第三步：在 Render 导入项目

### 3.1 登录 Render

打开 [https://render.com/](https://render.com/)，用你的 GitHub 账号登录。

### 3.2 新建 Web Service

1. 登录后，点击 **New** → 选择 **Web Service**。
2. 选择 **Build and deploy from a Git repository**。
3. 连接你的 GitHub 账号，并选择你刚刚创建的仓库 `xui-share-viewer-render`。
   - 如果列表里没有，点击 **Configure the Render GitHub App** 授权 Render 访问你的仓库。

### 3.3 配置服务（关键，别点太快）

进入配置页面后：

- **Name**：给你的服务起个名字，例如 `xui-share-viewer`。
- **Region**：选择一个离你或你的用户最近的区域（例如 `Singapore` 或 `Oregon`）。
- **Branch**：`main` (默认)
- **Root Directory**：**留空** (如果你的代码直接在仓库根目录)。如果你的代码在 `xui-render` 文件夹里，这里填 `xui-render`。
- **Runtime**：`Node` (默认)
- **Build Command**：`pnpm install && pnpm build`
- **Start Command**：`pnpm start` (这个脚本会启动你的 Express 服务器)
- **Instance Type**：选择 **Free** (免费计划)。

### 3.4 配置环境变量（最重要的一步！）

在配置页面往下找到 **Environment Variables（环境变量）** 区域，添加以下变量：

| Key（变量名） | Value（值） |
|---|---|
| `DATABASE_URL` | `mysql://2RDpnK4VYsUSxDb.root:ugJzEQn1QwefGlOt@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | 随便填一串长随机字符，例如 `xui_render_secret_2026_abc123` |
| `PORT` | `10000` (Render 免费服务通常要求监听 10000 端口) |

> **填写方法**：在 Key 输入框填变量名，在 Value 输入框填值，每填一个点一次 **Add Environment Variable**。

> **特别注意**：`DATABASE_URL` 的值要**完整复制**，包括末尾的 `?ssl={"rejectUnauthorized":true}` 这一段，一个字符都不能少，否则会连不上数据库。

---

## 第四步：部署

1. 确认所有配置和环境变量都填好后，点击页面底部的 **Create Web Service** 按钮。
2. Render 开始构建和部署，这可能需要 **5-10 分钟**，请耐心等待。
3. 当部署状态显示为 **"Live"** 时，就说明部署成功了！
4. 在服务页面顶部能看到你的网址，形如：
   `https://你的服务名.onrender.com`

---

## 第五步：上线后验证

### 5.1 打开网址测试

把上面的 `https://xxx.onrender.com` 网址复制到浏览器打开：

- 打开**根网址**：应该能看到后台管理界面。
- 打开 `https://你的网址/admin`：应该正常显示后台。
- 打开 `https://你的网址/s/iKBg-sf8X-pmp4vy6NW8QSnP0XEZq4q_`（这是你数据库里真实的一个客户分享页）：应该能看到客户 "Ruin、" 的展示页。

### 5.2 测试 API 健康检查

在浏览器打开：

```
https://你的网址/api/import/health
```

如果返回 `{"success":false,"error":"Unauthorized"}` 这样的 JSON（注意：是 JSON 而不是 404 页面），就说明**后端 API 已经正常工作**了（401 是因为没带 API Key，属于正常现象）。

### 5.3 更新本地推送工具的配置

部署成功后，把你本地推送工具（采集脚本）里原来填的旧 Render 网址，**改成这个新的 Render 网址**，API Key 保持不变即可。

---

## 常见问题排查

| 现象 | 原因 | 解决办法 |
|---|---|---|
| 部署失败 | Build Command 或 Start Command 错误 | 检查 Render 服务配置中的 `Build Command` 和 `Start Command` 是否正确，确保是 `pnpm install && pnpm build` 和 `pnpm start` |
| 页面能开但数据加载失败 | `DATABASE_URL` 填错或不完整 | 到 Render 服务配置 → Environment 检查，确保末尾 SSL 参数完整，改完后 Redeploy |
| API 返回 500 | 缺少 `JWT_SECRET` 或 `PORT` 变量 | 在环境变量里补上 `JWT_SECRET` 和 `PORT=10000`，Redeploy |
| 部署成功但访问 404 | `Root Directory` 设置错误 | 检查 Render 服务配置中的 `Root Directory` 是否正确，如果代码在子文件夹，需要指定 |
| 冷启动时间长 | Render 免费服务特性 | 免费服务为了节省资源，在长时间无访问后会进入休眠，首次访问需要等待几秒到几十秒唤醒。这是正常现象，无法避免。 |

### 如何重新部署（Manual Deploy）

如果改了环境变量或代码，需要让 Render 重新部署：

1.  进入 Render 服务主页。
2.  点击 **Manual Deploy** 按钮。
3.  选择 **Deploy latest commit** → 确认。

---

部署过程中遇到任何报错，把报错截图或文字发给我，我帮你解决。
