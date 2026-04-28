# Image Studio 交付说明

这是一个本地运行的 AI 图片生成 / 图片编辑工作台。

本版本按「浅色极简 + 创作首页 + 图库瀑布流 + 本地历史 + 底部悬浮输入框」方案实现。

## 运行环境

- Node.js 20 或更新版本
- 能访问你的图片生成服务商接口

## 启动方式

在项目目录运行：

```bash
npm start
```

然后打开：

```text
http://localhost:5174
```

如果 Windows 浏览器打不开 localhost，可在 WSL 中查看 IP：

```bash
hostname -I
```

然后打开：

```text
http://<WSL-IP>:5174
```

例如：

```text
http://172.20.167.74:5174
```

## 检查方式

```bash
npm run check
```

也可以检查本地服务：

```bash
curl http://127.0.0.1:5174/api/health
```

## 页面结构

### 创作首页

- 只显示本次生成结果
- 空状态提供示例提示词和风格入口
- 生成中显示 loading
- 生成失败保留提示词，可重试
- 单图大图展示，多图网格展示

### 生成图库

- 展示所有历史生成图片
- 支持搜索
- 支持收藏筛选
- 图片卡片支持：
  - 预览
  - 下载
  - 复制路径
  - 复用提示词
  - 收藏

### 本地历史

- 展示生成 / 编辑任务记录
- 包含任务状态、耗时、模型、提示词摘要

### 收藏

- 展示已收藏图片

### 参数抽屉

- 工作模式
- 模型
- 画幅比例
- 输出尺寸
- 质量
- 格式
- 数量
- 返回格式
- 常用排除项

### 服务商抽屉

- 生成 URL
- 编辑 URL
- API Key
- 是否记住 Key

> API Key 不会写入项目文件。勾选「记住 Key」时，只保存在当前浏览器 localStorage。

## 已实现接口

```text
GET  /api/health
POST /api/generate
POST /api/edit-image
GET  /api/gallery
GET  /api/history
POST /api/favorite
GET  /outputs/<filename>
```

## 图片生成配置示例

生成 URL：

```text
https://imgv1.aiapis.help/v1/images/generations
```

编辑 URL：

```text
https://imgv1.aiapis.help/v1/images/edits
```

模型：

```text
gpt-image-2
```

常用参数：

```text
quality: high
outputFormat: png
responseFormat: b64_json
n: 1 到 4
```

## 服务商 URL / Key 更换说明

这个项目可以随时在页面「服务商」里更换：

- 生成 URL
- 编辑 URL
- API Key
- 模型名

但不是所有服务商都一定能直接用。

### 最容易兼容的服务商

如果服务商支持 OpenAI 图片接口格式，一般就能用。

生成接口类似：

```text
https://你的服务商域名/v1/images/generations
```

编辑接口类似：

```text
https://你的服务商域名/v1/images/edits
```

鉴权方式类似：

```text
Authorization: Bearer 你的APIKey
```

### 可以只填基础域名吗？

如果服务商本身兼容 OpenAI Images API，可以先试基础域名，例如：

```text
https://example.com
```

项目会自动补成：

```text
https://example.com/v1/images/generations
```

或图片编辑接口：

```text
https://example.com/v1/images/edits
```

如果服务商要求特殊路径，就直接填写完整 URL。

### 哪些情况可能不能直接用？

下面几类服务商可能需要额外适配：

1. 只支持聊天接口，不支持图片接口  
   例如只支持 `/v1/chat/completions`，但不支持 `/v1/images/generations`。

2. 参数字段不一样  
   有些服务商不用 `size`、`quality`、`n`、`response_format` 这些字段，或者字段名字不同。

3. 返回格式很特殊  
   项目已经兼容常见的 `data`、`images`、`url`、`b64_json`、`base64`、图片二进制等格式；如果服务商返回结构特别特殊，可能需要补适配。

4. HTTPS 证书异常  
   当前项目已对 `imgv1.aiapis.help` 做了自签证书兼容。如果别的服务商也有证书问题，可能需要单独加入兼容。

### 换服务商后的排查建议

如果换了 URL / Key 后生成失败，优先检查：

- URL 是基础域名还是完整 `/v1/images/generations` 路径。
- API Key 是否是完整原始 Key，不是带省略号的显示版。
- 模型名是否是该服务商支持的图片模型。
- 服务商是否真的支持图片生成接口。
- 页面错误提示和本地历史里的错误信息。

简单结论：

> 支持 OpenAI Images API 的服务商，大概率能直接换 URL 和 Key 使用；不支持这套格式的服务商，需要单独适配。

## 本地文件位置

生成图片保存到：

```text
output/images/
```

图库索引：

```text
output/manifest.json
```

任务历史：

```text
output/history.json
```

## 本次验证结果

已完成语法检查：

```text
npm run check
```

已完成本地接口检查：

```text
GET /api/health
GET /api/gallery
GET /api/history
```

已使用 `https://imgv1.aiapis.help/v1/images/generations` 完成本地代理生图测试。

测试结果：

- 生成成功
- 图片已保存到 `output/images/`
- 图片已写入 `output/manifest.json`
- 任务已写入 `output/history.json`

## 注意事项

### 关于 imgv1.aiapis.help

该服务商域名当前使用自签 HTTPS 证书。项目后端已对 `imgv1.aiapis.help` 做兼容处理，否则 Node.js 默认会因为证书不受信任而报：

```text
fetch failed
```

这不是前端问题，也不是 Key 错误。

### 关于缓存

如果页面样式或脚本看起来还是旧的，请强制刷新：

```text
Ctrl + F5
```

### 关于端口

默认端口：

```text
5174
```

如需换端口：

```bash
PORT=5175 npm start
```

Windows PowerShell：

```powershell
$env:PORT=5174; npm start
```

## 主要文件

```text
server.js               后端代理、图片保存、图库/历史接口
public/index.html       新版页面结构
public/styles.css       新版浅色极简 UI
public/app.js           前端交互逻辑
output/images/          生成图片
output/manifest.json    图库数据
output/history.json     任务历史
```
