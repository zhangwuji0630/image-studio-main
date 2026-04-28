# 迁移到另一台 Windows 电脑

## 目标电脑要求

- 安装 Node.js 20 或更新版本。
- 目标电脑能访问你配置的图片生成接口。
- API Key 不会随压缩包迁移；到新电脑后需要在页面重新填写。

## 启动方式

解压后进入项目目录，双击 `START.bat`，或在 PowerShell 中运行：

```powershell
npm start
```

浏览器打开：

```text
http://localhost:5174
```

## 验证方式

双击 `CHECK.bat`，或运行：

```powershell
npm run check
```

也可以检查本地服务：

```powershell
Invoke-RestMethod http://localhost:5174/api/health
```

## 注意事项

- 默认端口是 `5174`。如果端口被占用，可运行：

```powershell
$env:PORT=5175; npm start
```

- 生成结果会保存到 `output/images/`。
- 如果页面样式没更新，重启服务后在浏览器按 `Ctrl + F5` 强制刷新。
