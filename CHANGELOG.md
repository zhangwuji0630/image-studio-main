# Image Studio 更新记录

## 2026-04-27

### 产品结构

- 将旧版「图片提示词工作台」改为新版 `Image Studio`。
- 新增左侧导航：
  - 创作首页
  - 生成图库
  - 本地历史
  - 收藏
  - 服务商
  - 设置
- 首页定位为「创作台」，只显示本次生成结果，不堆历史图。
- 图库页使用瀑布流/卡片式历史图片管理。
- 底部新增常驻悬浮提示词输入框。
- 参数和服务商配置改为右侧抽屉。

### 前端能力

- 创作首页空状态。
- 生成中 loading 状态。
- 生成失败状态，保留提示词并支持重试。
- 本次结果展示：
  - 单图大图展示
  - 多图网格展示
- 图片卡片操作：
  - 预览
  - 下载
  - 复制路径
  - 复用提示词
  - 收藏
- Lightbox 大图预览。
- 预览支持左右切换。
- 图库搜索。
- 收藏筛选。

### 后端能力

- 保留：
  - `GET /api/health`
  - `POST /api/generate`
  - `POST /api/edit-image`
  - `GET /outputs/<filename>`
- 新增：
  - `GET /api/gallery`
  - `GET /api/history`
  - `POST /api/favorite`
- 新增图库索引：
  - `output/manifest.json`
- 新增任务历史：
  - `output/history.json`
- 生成成功后自动：
  - 保存图片到 `output/images/`
  - 写入图库索引
  - 写入任务历史
- 支持 `b64_json` 和 `url` 两种图片返回。
- 对日志做敏感信息隐藏。
- 对 `imgv1.aiapis.help` 的自签 HTTPS 证书做兼容。

### 验证

- `npm run check` 通过。
- `/api/health` 可用。
- `/api/gallery` 可用。
- `/api/history` 可用。
- 使用 `https://imgv1.aiapis.help/v1/images/generations` 完成真实生图测试。

## 2026-04-28 15:08 更新：当前布局与交互修复记录

当前运行版本：

```text
image-studio-layout-v19
```

详细记录已整理到：

```text
CURRENT_CHANGES.md
```

本轮关键结论：

- 顶部栏已去掉。
- 服务商 / 设置从左侧弹出，并支持 `×`、遮罩、`Esc` 关闭。
- 默认文本框为空。
- 默认参数为 `3:4 · high · png · 1张`，尺寸 `960x1280`。
- 图库布局已从竖向瀑布流改为横向 grid：从左到右排，满一行再换下一行。
- 图库缩略图使用 `3:4` 预览框，`object-fit: contain`，不裁切，最大高度限制为 `320px`。
- 页面删除只删除图库记录，不删除、不移动本地图片文件。
- 所有生成图片统一保留在 `output/images/`。
- 之前移动到 `.trash` 的图片已搬回 `output/images/`。
- “＋ 添加风格”现在会弹输入框，新增风格按钮，并自动追加到提示词。
- 缺 API Key 时点生成，会自动打开服务商设置并提示填写 Key。
- `npm run check` 已通过。

## 2026-04-28 15:26 更新：恢复默认创作首页

当前运行版本：

```text
image-studio-layout-v15
```

修复内容：

- 左侧导航重新增加“创作首页”。
- “创作首页”恢复为导航第一项。
- 打开 `http://localhost:5174` 默认进入创作首页。
- “生成图库”不再作为默认页，改为第二项入口。
- 首页空状态可见：`描述你想看到的画面`。
- `/api/health` 返回 `image-studio-layout-v15`。
- `npm run check` 通过。## 2026-04-28 16:55 更新：首页简洁化，输入框只在创作首页显示

当前运行版本：

```text
image-studio-pwa-v22
```

调整：

- 首页去掉提示词公式和多余说明，保留更简洁的标题、短说明和 4 个灵感卡片。
- 灵感卡片从 6 个减到 4 个，减少拥挤感。
- 底部提示词输入框只在“创作首页”显示。
- 生成图库 / 本地历史 / 收藏页不再显示底部文本框，页面底部留白也同步减少。
- 手机端输入框高度缩小，首页更清爽。

验证：

- `npm run check` 通过。
- `/api/health` 返回 `image-studio-pwa-v22`。
- 浏览器验证：创作首页能看到输入框；切到生成图库后输入框隐藏。

## 2026-04-28 16:50 更新：手机 PWA Key 错误提示优化

当前运行版本：

```text
image-studio-pwa-v21
```

问题：

- 手机 PWA 生成时出现 `Invalid token`。
- 这通常不是 PWA 本身故障，而是手机端没有同步电脑浏览器里保存的 API Key，或手机端粘贴的 Key 不完整 / 无效。

处理：

- 针对 `Invalid token`、`invalid api key`、`unauthorized`、`authentication` 等上游错误，改成更易懂的中文提示。
- 提醒用户在手机页面点「服务商」，重新粘贴完整原始 API Key。
- 提醒不要使用带省略号的显示版 Key，也不要复制多余空格或换行。
- 版本升级到 `image-studio-pwa-v21`，同步刷新前端资源和 Service Worker 缓存名。

验证：

- `npm run check` 通过。
- `/api/health` 返回 `image-studio-pwa-v21`。
- 使用测试无效 Key 调 `/api/generate`，返回新的中文 Key 提示。

## 2026-04-28 16:35 更新：手机版 PWA 版

当前运行版本：

```text
image-studio-pwa-v20
```

PWA 更新：

- 补强 `manifest.webmanifest`：应用名称、短名称、描述、id、start_url、scope、standalone、display_override、portrait 方向、主题色、图标、快捷入口。
- 首页增加 `viewport-fit=cover`，适配 iPhone 安全区域。
- 增加 `mobile-web-app-capable` 和 Apple touch icon 配置。
- Service Worker 改为缓存应用壳：`/`、`index.html`、CSS、JS、manifest、图标。
- API 和图片输出仍保持实时请求，不缓存 `/api/` 和 `/outputs/`。
- 移动端导航改为顶部横向滚动胶囊按钮。
- 手机端隐藏左侧服务状态卡，减少占屏。
- 手机端底部输入框适配安全区域，textarea 字号提高到 16px，避免 iOS 自动放大。
- 设置 / 服务商弹窗在手机端仍为底部 sheet。
- `/api/health` 返回 `image-studio-pwa-v20`。
- manifest JSON 校验通过。
- `npm run check` 通过。

安装方式：

- iPhone Safari：打开地址 → 分享 → 添加到主屏幕。
- Android Chrome：打开地址 → 菜单 → 添加到主屏幕 / 安装应用。

## 2026-04-28 16:17 更新：多图生成、弹窗视觉、图库标题和首页引导

当前运行版本：

```text
image-studio-layout-v19
```

主要更新：

- `v16`：多图生成拆分请求。由于服务商单次 `n=4` 只返回 1 张，后端改为多次单张请求再合并。
- `v17`：多图部分成功兜底。某几张超时不会作废已成功图片，历史可标记 `partial_success`。
- 已确认慢速主要来自 `imgv1.aiapis.help + gpt-image-2` 上游通道；单张 `medium + 1024x1536 + b64_json` 也可能超过 300 秒。
- `v18`：设置 / 服务商改为偏左玻璃卡片弹窗，弱遮罩、blur、圆角、轻微上浮淡入动画；小屏为底部 sheet。
- `v18`：图库卡片标题简化，完整提示词移到大图预览 lightbox 内显示。
- `v19`：首页增加创作引导、提示词公式和 6 个灵感卡片。
- 灵感卡片点击后会把提示词追加到底部输入框。
- `/api/health` 返回 `image-studio-layout-v19`。
- `npm run check` 通过。



- 后端新增 `.env` / `.env.local` 自动加载。
- API Key 改为服务端环境变量优先，避免浏览器旧 Key 覆盖有效 Key。
- 增加 Key 清理和安全指纹诊断，不记录真实 Key。
- 针对 `imgv1.aiapis.help` 收敛为实测可用请求：
  - `gpt-image-2`
  - `1024x1024` / `1536x1024` / `1024x1536`
  - `b64_json`
  - PNG 保存
- 修复自签 TLS fallback 下 multipart 编辑请求的 boundary 丢失问题。
- 新增 `POST /api/models` 用于诊断模型列表和 Key 来源。
- 前端默认 URL、模型、尺寸改为当前可用配置，并自动纠正旧本地配置。
- Service Worker 改为清理旧缓存，避免页面继续使用旧脚本。

### 验证

- `npm run check` 通过。
- `/api/models` 可获取 `gpt-image-2`。
- `/api/generate` 已通过本地页面同源代理真实生成图片并保存到 `output/images/`。

## 2026-04-29 11:10 更新：网页端界面修复与生成状态保持

当前运行版本：

```text
image-studio-pwa-v23
```

主要更新：

- 修复桌面端 composer 被手机端改版误伤的问题，恢复桌面端完整输入区布局。
- 手机端继续保留 `+` 底部弹层，并补回上传图片入口。
- 修复生成中切到其他页面再回创作首页时看不到生成中状态的问题。
- 统一升级 CSS / JS 查询参数、Service Worker 缓存名、后端 appVersion 到 `image-studio-pwa-v23`。
- 调整上游超时策略为更适合慢速图片通道的 `240s x 2 次`。

验证：

- `npm run check` 通过。
- 已用浏览器自动化验证桌面端、手机端、生成中切页恢复状态。

## 2026-04-29 12:08 更新：提示词助手动态类型骨架

当前运行版本：

```text
image-studio-pwa-v29
```

主要更新：

- 提示词助手从偏摄影流程改为多类型动态生图流程。
- 内容类型扩展为：人像写真、产品摄影、攻略图、信息图、小红书封面、海报设计、PPT配图、教程步骤图、电商详情图、公众号首图、清单卡片、路线地图、插画图标。
- 选择不同内容类型后，内容结构、画面版式、视觉风格、文字方式、细节控制会动态切换。
- 设计 / 攻略 / 信息图类型不再显示摄影专属的镜头、光线、材质模块；人像写真和产品摄影仍保留摄影项。
- 增加文字方式选项：带中文大标题、带编号步骤文字、带清单文字、带标签贴纸文字、只生成文字占位、预留标题区域、不要文字。
- 图库图片样式去除卡片边框和白底，图片按原始比例完整显示并保留圆角。

验证：

- `npm run check` 通过。
- 已用浏览器自动化验证选择「攻略图」后能出现攻略相关结构、版式、风格和文字方式选项。

## 2026-04-29 12:50 更新：提示词助手连贯性优化

当前运行版本：

```text
image-studio-pwa-v33
```

主要更新：

- 提示词助手生成结果从“词条拼接”升级为“自然中文提示词”。
- 根据内容类型使用不同提示词骨架，例如攻略图、信息图、教程图、PPT、产品摄影、人像写真、海报、插画等。
- 选择一路点下来后，预览会按主题 → 内容结构 → 画面版式 → 风格 → 文字方式 → 细节要求的逻辑整理。
- 增加文字方式冲突处理，避免同时出现「带中文大标题」和「不要文字」这类互相矛盾的表达。
- 补齐电商详情图、公众号首图、清单卡片、路线地图、插画图标的专属词库。

验证：

- `npm run check` 通过。
- 浏览器自动化验证：选择「攻略图 / 旅行攻略 / 路线规划 / 小红书竖版 / 地图路线风 / 清新小红书 / 不要文字 / 信息层级清晰」后，预览输出为自然连贯描述，并正确处理文字冲突。
