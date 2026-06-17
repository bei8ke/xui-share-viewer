# xui-share-viewer —— Render 全新部署方案（密码登录版）

> **重大更新**：为了避免外部登录服务不稳定的问题，我们已切换到**“简单密码登录”**模式。你只需设置一个管理员密码即可登录后台。

---

## 第一步：准备工作

### 1.1 确认数据库已就绪
继续使用你的 TiDB 数据库连接串：
`mysql://2RDpnK4VYsUSxDb.root:ugJzEQn1QwefGlOt@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}`

---

## 第二步：推送新代码

1.  下载我刚刚交付的最新版代码包 `xui-share-viewer-render-password.zip`。
2.  解压后进入 `xui-render` 文件夹。
3.  执行 `git add .`、`git commit` 和 `git push` 把新代码推送到你的 GitHub 仓库。

---

## 第三步：在 Render 配置环境变量（最关键）

请在 Render 的 **Environment** 标签页中，**删除**之前填写的 OAuth 相关变量（`OAUTH_SERVER_URL` 等），然后确保只有以下变量：

| Key (变量名) | Value (建议值) | 说明 |
|---|---|---|
| **`DATABASE_URL`** | `mysql://...` (你的 TiDB 连接串) | 必填，带上末尾 SSL 参数 |
| **`JWT_SECRET`** | `xui_render_secret_2026` | 必填，随机长字符串 |
| **`PORT`** | `10000` | 必填 |
| **`ADMIN_PASSWORD`** | **`你自定义的登录密码`** | **必填，这是你以后登录后台的唯一凭证** |

---

## 第四步：部署与验证

1.  保存环境变量后，Render 会自动重新部署。
2.  打开网址，你会看到一个简单的密码输入框。
3.  输入你在 `ADMIN_PASSWORD` 里设置的密码，点击登录即可进入后台。

---

这种模式不需要依赖任何外部服务，是最稳妥的部署方案。
