# Image Studio 开发进度

更新时间：2026-04-27 23:57（Asia/Shanghai）

## 当前状态

新版 Image Studio 第一版已经落地到：

```text
/home/zhangwuji/.openclaw/workspace/image-studio
```

桌面交付包：

```text
C:\Users\张无忌\Desktop\image-studio-20260427.zip
C:\Users\张无忌\Desktop\Image-Studio-README.md
```

## 已完成

### 1. 项目落地

- 未修改用户提供的原始 zip。
- 已将参考项目复制为 workspace 内新项目：`image-studio/`。
- 保留原有本地 Node 服务架构，避免引入复杂框架。

### 2. 新版 UI

已按讨论方案实现：

- 浅色极简风格。
- 左侧导航：
  - 创作首页
  - 生成图库
  - 本地历史
  - 收藏
  - 服务商
  - 设置
- 顶部轻工具栏：
  - 服务商状态
  - 模型
  - 参数摘要
  - 参数设置
  - 服务商设置
- 首页作为创作台：
  - 空状态
  - 生成中状态
  - 生成失败状态
  - 本次生成结果展示
- 图库页：
  - 图片卡片
  - 搜索
  - 收藏筛选
- 本地历史页：
  - 任务记录
- 收藏页。
- 底部常驻悬浮输入框。
- 右侧参数抽屉。
- 右侧服务商抽屉。
- Lightbox 图片预览，支持左右切换。

### 3. 后端接口

保留：

```text
GET  /api/health
POST /api/generate
POST /api/edit-image
GET  /outputs/<filename>
```

新增：

```text
GET  /api/gallery
GET  /api/history
POST /api/favorite
```

### 4. 本地图库和历史

生成成功后自动：

- 保存图片到：`output/images/`
- 写入图库索引：`output/manifest.json`
- 写入任务历史：`output/history.json`

### 5. 服务商兼容

用户提供的服务商：

```text
https://imgv1.aiapis.help
```

实际生成接口：

```text
https://imgv1.aiapis.help/v1/images/generations
```

该域名使用自签 HTTPS 证书，Node.js 默认请求会报：

```text
fetch failed
```

已在后端对 `imgv1.aiapis.help` 做特殊兼容：

- 对该 host 使用 Node `https.request`
- `rejectUnauthorized: false`
- 自动补 `Content-Length`

### 6. 真实生图验证

已通过本地代理真实生成成功。

测试参数：

```text
apiUrl: https://imgv1.aiapis.help/v1/images/generations
model: gpt-image-2
size: 1024x1024
quality: high
outputFormat: png
responseFormat: b64_json
n: 1
```

测试耗时：约 68 秒。

生成图片已复制到桌面：

```text
C:\Users\张无忌\Desktop\image-studio-test-generated.png
```

## 已修复的问题

### 弹窗遮挡页面

问题：`hidden` 属性被 `.lightbox { display: grid }` 覆盖，导致页面一打开就显示图片预览弹窗，所有组件像是点不了。

修复：

```css
[hidden] {
  display: none !important;
}
```

### 底部输入框不居中

问题：旧定位写法：

```css
left: calc(248px + 50%);
```

会在视口中心基础上再加左栏宽度，导致输入框偏右。

修复为按主内容区居中：

```css
left: calc(248px + (100vw - 248px) / 2);
```

### 页面默认尺寸过大

问题：页面默认 `2048x2048`，上游生成慢且不稳定，用户浏览器侧容易看到 `Failed to fetch`。

已将默认尺寸改为更稳定的：

```text
1024x1024
```

## 当前已知情况

- 可以生成图片，但速度较慢。
- `gpt-image-2 + high + b64_json + 1024x1024` 实测约 68 秒。
- 慢主要来自上游模型和服务商代理，不是 UI 本身。
- 如果要更快，建议尝试：
  - `quality: medium`
  - `responseFormat: url`（前提是服务商支持）
  - 保持 `size: 1024x1024`
  - `n: 1`

## 建议下一步

1. 将默认参数进一步调成更快版本：

```text
size: 1024x1024
quality: medium
responseFormat: url
n: 1
```

2. 如果 `url` 返回格式不兼容，再回退到：

```text
responseFormat: b64_json
```

3. 页面上建议增加更明确的慢速提示：

```text
高质量图片可能需要 40-90 秒，请保持页面打开。
```

4. 增加服务商测试连接按钮。

5. 增加“清除本地配置/重置参数”按钮，避免浏览器 localStorage 旧参数影响测试。

## 文件改动范围

主要文件：

```text
server.js
public/index.html
public/styles.css
public/app.js
README.md
CHANGELOG.md
PROGRESS.md
```

## 注意

- 未把 API Key 写入项目文件。
- 勾选「记住 Key」时，Key 只保存到浏览器 localStorage。
- 打包时未包含 `node_modules`。

## 2026-04-28 15:08 更新

当前运行版本：`image-studio-pwa-v22`。

本轮详细改动已记录到：

```text
CURRENT_CHANGES.md
```

当前确认的关键逻辑：

- 生成图片统一保存到 `output/images/`。
- 页面删除只删除图库记录，不删除、不移动本地图片文件。
- 不再使用 `.trash` 作为页面删除目标。
- 图库按横向 grid 排列：从左到右，满行换行。
- 服务商 / 设置从左侧弹出，可关闭。
- 缺 API Key 时，点生成会自动打开服务商设置并提示填写。
- “＋ 添加风格”可新增自定义风格并追加到提示词。
- 打开 `http://localhost:5174` 默认进入创作首页，左侧导航包含“创作首页”。
- 多图生成已拆成多次单张请求，避免服务商单次 `n=4` 只返回 1 张。
- 多图生成支持部分成功兜底，某几张失败不会作废已成功图片。
- 当前慢速主要来自 `imgv1.aiapis.help + gpt-image-2` 上游通道，单张 medium 竖图也可能超过 300 秒。
- 设置 / 服务商改为偏左玻璃卡片弹窗，小屏为底部 sheet。
- 图库卡片标题已简化，完整提示词在大图预览里显示。
- 首页新增“你想创作什么？”创作引导、提示词公式和 6 个灵感卡片。
- 已升级为手机版 PWA 版：manifest 补强，Service Worker 缓存应用壳，iPhone 安全区域适配，手机端顶部横向导航，底部输入框适配移动端安装使用。
- 手机 PWA 端 `Invalid token` 已优化为中文提示：手机不会同步电脑浏览器 Key，需要在手机「服务商」里重新粘贴完整原始 API Key。
- 首页已简洁化：去掉提示词公式和多余说明，灵感卡片从 6 个减到 4 个；底部文本框只在“创作首页”显示，生成图库 / 历史 / 收藏页不再显示文本框。
- 服务商兼容提示已写入 README：支持 OpenAI Images API 的服务商通常可直接换 URL / Key 使用；只支持聊天接口或字段/返回格式特殊的服务商需要适配。

## 2026-04-27 23:59 更新

### 移除顶部重复信息栏

用户反馈顶部栏功能重复，要求去掉以下内容：

```text
本地代理
模型 / gpt-image-2
参数 / 1:1 · high · png · 1张
```

已处理：

- 从 `public/index.html` 移除 `<header class="topbar">...</header>`。
- 前端 `app.js` 中对顶部摘要 DOM 的引用改为可空处理，避免元素删除后 JS 报错。
- 已运行 `npm run check`，语法检查通过。

保留：

- 左侧导航里的服务商/设置入口。
- 底部输入框里的参数摘要按钮。
- 右侧参数抽屉和服务商抽屉。

## 2026-04-28 00:02 更新

### 缩小首页生成结果预览

用户反馈生成图片在首页显示太大，占据过多屏幕。

已调整 `public/styles.css`：

- 单图结果宽度从最高约 `780px` 缩到约 `520px`。
- 单图图片最大高度从 `680px` 缩到 `460px`。
- 双图结果改为居中显示，每张最大约 `420px`。
- 多图结果最大宽度从 `900px` 缩到 `760px`。

原则：

- 首页只做舒适预览。
- 大图查看交给 Lightbox 预览。

## 2026-04-28 00:04 更新

### 增加 PWA 支持（面向 iPhone）

用户希望做成苹果手机可添加到主屏幕的 PWA 应用。

已新增：

```text
public/manifest.webmanifest
public/sw.js
public/icons/icon-192.png
public/icons/icon-512.png
```

已修改：

- `public/index.html`
  - 增加 `manifest`。
  - 增加 `theme-color`。
  - 增加 iOS Safari 相关 meta：
    - `apple-mobile-web-app-capable`
    - `apple-mobile-web-app-title`
    - `apple-mobile-web-app-status-bar-style`
  - 增加 `apple-touch-icon`。
- `public/app.js`
  - 注册 service worker。
- `server.js`
  - 增加 `.webmanifest` MIME 类型。

使用方式：

1. iPhone Safari 打开 Image Studio 地址。
2. 点击 Safari 分享按钮。
3. 选择「添加到主屏幕」。
4. 从主屏幕打开后，会以独立应用样式运行。

注意：

- iOS PWA 仍需要能访问运行中的本地服务。
- 如果手机和电脑不在同一网络，或 WSL 地址手机不可访问，需要后续配置局域网/隧道访问。

## 2026-04-28 00:09 更新

### 调整 Lightbox 预览尺寸

用户截图反馈：点击预览后弹窗过大，图片几乎占满屏幕，底部操作区被挤压，标题文件名过长影响观感。

已调整 `public/styles.css`：

- Lightbox 宽度从 `min(1120px, 96vw)` 缩到 `min(980px, 92vw)`。
- Lightbox 高度从 `min(850px, 92vh)` 缩到 `min(760px, 86vh)`。
- Grid 中间区域改为 `minmax(0, 1fr)`，避免图片撑爆弹窗。
- 图片改为 `width:100%; height:100%; object-fit:contain`。
- 图片左右增加 64px padding，给左右切换按钮留空间。
- 文件名标题增加单行省略，避免超长文件名撑开布局。
- 左右切换按钮略缩小。

原则：

- 首页小预览。
- Lightbox 适中预览。
- 真正原图可用「新窗口打开」或下载查看。

## 2026-04-28 12:34 更新

### 修复页面点击生成无法稳定出图

用户反馈：直接用 curl 测试 `imgv1.aiapis.help` 可以生成图片，但在页面点击「生成」时出现端点请求失败、`No available channel` 或无法出图。

已从头复查项目文件：

- `server.js`
- `public/app.js`
- `public/index.html`
- `public/sw.js`
- `.env.example`
- `README.md`
- `TRANSFER.md`
- `START.bat`
- `CHECK.bat`

排查结论：

- 上游端点和模型应使用：
  - Base URL: `https://imgv1.aiapis.help`
  - 生成端点: `/v1/images/generations`
  - 编辑端点: `/v1/images/edits`
  - 模型: `gpt-image-2`
  - 尺寸: `1024x1024`、`1536x1024`、`1024x1536`
  - 返回: `data[0].b64_json`
- `gpt-image-1` 不可用，应自动纠正为 `gpt-image-2`。
- 页面保存过旧 Key 或旧参数时，会导致页面生成和 curl 测试结果不一致。
- 旧后端不会自动读取 `.env`，页面传入的旧 Key 会优先于服务端 Key。
- 自签 TLS 下自定义 `https.request` 转发 `FormData` 时需要保留 multipart boundary，否则编辑接口可能失败。
- Service Worker 需要避免缓存旧前端代码和 API 响应。

已修改 `server.js`：

- 增加 `.env` / `.env.local` 自动加载。
- API Key 优先级调整为：
  1. `IMG_API_KEY`
  2. `IMAGE_API_KEY`
  3. `OPENAI_API_KEY`
  4. 浏览器页面输入
- 增加 Key 清理逻辑，去掉空格、换行、零宽字符和包裹引号。
- 日志和响应中只记录 Key 来源与 SHA-256 指纹前 12 位，不记录真实 Key。
- `imgv1.aiapis.help` 自动兼容自签 HTTPS。
- 修复自签 TLS fallback 下 `FormData` 的 `multipart/form-data; boundary=...` 头丢失问题。
- 针对 `imgv1.aiapis.help` 收敛上游请求字段，只发送实测稳定字段：
  - `model`
  - `prompt`
  - `size`
  - `n`
- 针对 `imgv1.aiapis.help` 强制：
  - `model: gpt-image-2`
  - `output_format: png`
  - `response_format: b64_json`
- 增加 `POST /api/models` 诊断接口，用于确认模型列表和实际 Key 来源。
- 增加上游错误解释：
  - `model_not_found`
  - `No available channel`
  - `This group does not allow image generation`
  - `openai_image` 权限缺失

已修改 `public/app.js`：

- 默认服务地址为 `https://imgv1.aiapis.help`。
- 默认模型为 `gpt-image-2`。
- 默认尺寸改为 `1024x1024`。
- 仅保留当前上游实测可用画幅：
  - `1:1 -> 1024x1024`
  - `3:2 -> 1536x1024`
  - `2:3 -> 1024x1536`
- 浏览器旧配置如果包含：
  - `gpt-image-1`
  - 不支持尺寸
  - 无参考图但处于编辑模式
  会自动纠正。
- 页面提交前清理 API Key。

已修改 `public/index.html`：

- 默认生成 URL / 编辑 URL 改为 `https://imgv1.aiapis.help`。
- 默认模型改为 `gpt-image-2`。
- 默认尺寸改为 `1024x1024`。
- 默认端口显示同步为 `5174`。

已修改 `public/sw.js`：

- 安装阶段立即 `skipWaiting()`。
- 激活阶段清理旧 cache 并 `clients.claim()`。
- `/api/` 和 `/outputs/` 不走缓存。
- 静态资源使用 `cache: no-store`，避免旧页面继续提交旧配置。

已修改文档：

- `.env.example`
  - 默认端口同步为 `5174`。
  - 增加 `IMG_API_KEY`。
- `README.md` / `TRANSFER.md`
  - 默认端口统一为 `5174`。

本机配置：

- 已创建本地 `.env`。
- `.env` 被 `.gitignore` 忽略，不应提交。
- 真实 API Key 只保存在 `.env`，不写入进度文档和更新记录。

验证结果：

- `npm run check` 通过。
- `GET /api/health` 正常。
- `POST /api/models` 正常，能看到 `gpt-image-2`。
- `POST /api/generate` 已通过本地代理真实生成成功。
- 生成结果已保存到：

```text
output/images/2026-04-28T04-17-26-924Z-a-small-clean-product-photo-of-a-whi-1.png
```

文件验证：

- PNG 图片
- 尺寸 `1024 x 1024`
- 大小约 `1.3MB`

当前服务状态：

- 服务已运行在：

```text
http://localhost:5174
```

页面使用方式：

- 页面 API Key 输入框可以留空。
- 直接输入提示词，点击「生成」即可走服务端 `.env` 中的 `IMG_API_KEY`。
- 如果浏览器仍显示旧页面，执行强制刷新：

```text
Cmd + Shift + R
```
