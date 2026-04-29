import http from "node:http";
import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import https from "node:https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  let text;
  try { text = readFileSync(filePath, "utf8"); }
  catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, ".env"));
loadEnvFile(path.join(__dirname, ".env.local"));

const publicDir = path.join(__dirname, "public");
const outputRoot = path.join(__dirname, "output");
const outputDir = path.join(outputRoot, "images");
const manifestPath = path.join(outputRoot, "manifest.json");
const historyPath = path.join(outputRoot, "history.json");
const trashDir = path.join(outputRoot, ".trash");
const port = Number(process.env.PORT || 5174);
const appVersion = "image-studio-pwa-v27";
const defaultImageApiBase = process.env.IMAGE_API_BASE || process.env.IMG_API_BASE || "https://imgv1.aiapis.help";
let requestSeq = 0;

const maxJsonBodyBytes = 2 * 1024 * 1024;
const maxEditBodyBytes = 80 * 1024 * 1024;
const maxUploadImageBytes = 50 * 1024 * 1024;
const allowedQualities = new Set(["low", "medium", "high", "auto"]);
const allowedOutputFormats = new Set(["png", "webp", "jpeg"]);
const allowedResponseFormats = new Set(["b64_json", "url"]);
const imgv1SupportedSizes = new Set(["960x1280", "1024x1024", "1536x1024", "1024x1536"]);
const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const insecureTlsHosts = new Set(["imgv1.aiapis.help"]);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

function log(scope, message, details = {}) {
  const timestamp = new Date().toLocaleString("zh-CN", { hour12: false });
  const safe = sanitize(details);
  const detailText = Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
  console.log(`[${timestamp}] [${scope}] ${message}${detailText}`);
}

function sanitize(value, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (/^data:image\//i.test(value) || value.length > 4096) return `[已隐藏长文本，约 ${value.length} 字符]`;
    return value
      .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,"'}]+/gi, "$1********")
      .replace(/((?:api[-_ ]?key|token|secret|access_token)\s*[:=]\s*)[^\s,"'&}]+/gi, "$1********")
      .replace(/\b(sk-[a-z0-9_-]{12,})\b/gi, "********");
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[循环引用]";
  seen.add(value);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/api[-_ ]?key|token|secret|authorization/i.test(key)) out[key] = item ? "********" : "";
    else if (/^(base64|b64_json|dataUrl|data_url)$/i.test(key) && item) out[key] = "[已隐藏图片数据]";
    else out[key] = sanitize(item, seen);
  }
  return out;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(payload));
}

function extractRequestId(message = "") {
  const match = String(message).match(/request id:\s*([^)]+)/i);
  return match ? match[1].trim() : "";
}

function explainUpstreamError(message, request = {}) {
  const text = String(message || "");
  if (/no available channel/i.test(text)) {
    const requestId = extractRequestId(text);
    return [
      `上游分发器没有为模型 ${request.model || "当前模型"} 配置可用 channel。`,
      "请求已经到达服务商，但当前 API Key 所属分组没有可用图片通道；这通常需要在服务商后台给该分组绑定 gpt-image-2 渠道，或换一个有图片生成权限的 Key。",
      requestId ? `request id: ${requestId}` : ""
    ].filter(Boolean).join(" ");
  }
  if (/model_not_found|model not found/i.test(text)) {
    return `上游不支持模型 ${request.model || "当前模型"}，请使用 gpt-image-2。${extractRequestId(text) ? ` request id: ${extractRequestId(text)}` : ""}`;
  }
  if (/does not allow image generation|openai_image|image generation/i.test(text)) {
    return "当前 API Key 所属分组没有图片生成权限。上游要求在 supported_model_scopes 中启用 openai_image，或更换有图片生成权限的 Key。";
  }
  if (/invalid token|invalid api.?key|unauthorized|authentication|auth/i.test(text)) {
    const requestId = extractRequestId(text);
    return [
      "API Key 无效或没有在当前设备正确填写。手机 PWA 不会自动同步电脑浏览器里保存的 Key，请在手机页面点「服务商」，重新粘贴完整原始 API Key。",
      "不要使用带省略号的显示版 Key，也不要多复制空格或换行。",
      requestId ? `request id: ${requestId}` : ""
    ].filter(Boolean).join(" ");
  }
  if (/stream disconnected before completion|socket hang up|ECONNRESET|terminated|aborted/i.test(text)) {
    return "上游图片生成中途断流了，请重试一次；如果连续失败，可以先改成 1:1 / medium，或稍后再试。";
  }
  if (/timeout|请求超时|timed out/i.test(text)) {
    return "上游生成超时了，请重试；如果提示词或尺寸较重，建议先用 1:1 / medium 出草稿。";
  }
  return text;
}

function shouldAllowSelfSigned(url) {
  try { return insecureTlsHosts.has(new URL(url).hostname); }
  catch { return false; }
}

function normalizeHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) out[key] = String(value);
  }
  return out;
}

async function bodyToBuffer(body) {
  if (!body) return { buffer: null, contentType: "" };
  if (Buffer.isBuffer(body)) return { buffer: body, contentType: "" };
  if (typeof body === "string") return { buffer: Buffer.from(body), contentType: "" };
  if (body instanceof ArrayBuffer) return { buffer: Buffer.from(body), contentType: "" };
  if (ArrayBuffer.isView(body)) return { buffer: Buffer.from(body.buffer, body.byteOffset, body.byteLength), contentType: "" };
  if (body instanceof FormData) {
    const response = new Response(body);
    return { buffer: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "" };
  }
  return { buffer: Buffer.from(String(body)), contentType: "" };
}

async function nodeHttpsFetch(url, options = {}) {
  const { buffer: requestBody, contentType } = await bodyToBuffer(options.body);
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const headers = normalizeHeaders(options.headers);
    if (contentType && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      headers["content-type"] = contentType;
    }
    if (requestBody && !Object.keys(headers).some((key) => key.toLowerCase() === "content-length")) {
      headers["content-length"] = String(requestBody.length);
    }
    const req = https.request({
      method: options.method || "GET",
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers,
      rejectUnauthorized: false,
      timeout: 10 * 60 * 1000
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const headerMap = new Map(Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v.join(", ") : String(v || "")]));
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage || "",
          headers: { get: (name) => headerMap.get(String(name).toLowerCase()) || null },
          text: async () => buffer.toString("utf8"),
          arrayBuffer: async () => buffer
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("请求超时")));
    if (options.signal) options.signal.addEventListener("abort", () => req.destroy(Object.assign(new Error("请求超时"), { name: "AbortError" })), { once: true });
    if (requestBody) req.write(requestBody);
    req.end();
  });
}

async function upstreamFetch(url, options) {
  if (shouldAllowSelfSigned(url)) return nodeHttpsFetch(url, options);
  return fetch(url, options);
}

function readBody(req, maxBytes = maxJsonBodyBytes) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJsonBody(req, maxBytes = maxJsonBodyBytes) {
  const raw = await readBody(req, maxBytes);
  try { return { raw, input: JSON.parse(raw || "{}") }; }
  catch { throw new Error("请求体不是有效 JSON"); }
}

async function readJsonFile(filePath, fallback) {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); }
  catch { return fallback; }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function appendHistory(entry) {
  const history = await readJsonFile(historyPath, []);
  history.unshift(entry);
  await writeJsonFile(historyPath, history.slice(0, 300));
}

async function addManifestImages(records) {
  const manifest = await readJsonFile(manifestPath, []);
  manifest.unshift(...records);
  await writeJsonFile(manifestPath, manifest.slice(0, 1000));
}

async function updateManifestImage(id, patch) {
  const manifest = await readJsonFile(manifestPath, []);
  const next = manifest.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  await writeJsonFile(manifestPath, next);
  return next.find((item) => item.id === id);
}

async function deleteManifestImage(id) {
  const manifest = await readJsonFile(manifestPath, []);
  const image = manifest.find((item) => item.id === id);
  if (!image) throw new Error("图片不存在");
  const next = manifest.filter((item) => item.id !== id);
  await writeJsonFile(manifestPath, next);
  return image;
}

async function deleteHistoryEntry(id) {
  const history = await readJsonFile(historyPath, []);
  const next = history.filter((item) => item.id !== id);
  if (next.length === history.length) throw new Error("历史记录不存在");
  await writeJsonFile(historyPath, next);
}

async function clearHistoryEntries() {
  await writeJsonFile(historyPath, []);
}

function assertHttpUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("接口 URL 格式不正确"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("接口 URL 只允许 http 或 https");
  return url.toString();
}

function assertOneOf(value, allowed, fieldName) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!allowed.has(normalized)) throw new Error(`${fieldName} 参数不支持：${value}`);
  return normalized;
}

function normalizeCount(value) {
  const count = Number(value || 1);
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error("生成数量必须是 1 到 4 的整数");
  return count;
}

function normalizeSize(value) {
  const size = String(value || "1024x1024").trim().toLowerCase().replace(/\s+/g, "");
  if (size === "auto") return size;
  const match = size.match(/^(\d+)x(\d+)$/);
  if (!match) throw new Error("输出尺寸格式应为 2048x1152 或 auto");
  const width = Number(match[1]);
  const height = Number(match[2]);
  const totalPixels = width * height;
  const ratio = Math.max(width, height) / Math.min(width, height);
  if (width % 16 !== 0 || height % 16 !== 0) throw new Error("输出尺寸的宽和高都必须是 16 的倍数");
  if (Math.max(width, height) > 3840) throw new Error("输出尺寸最大边不能超过 3840");
  if (ratio > 3) throw new Error("输出尺寸长边与短边比例不能超过 3:1");
  if (totalPixels < 655360 || totalPixels > 8294400) throw new Error("输出尺寸总像素数必须在 655,360 到 8,294,400 之间");
  return size;
}

function isImgv1ApiUrl(value) {
  try { return new URL(value).hostname === "imgv1.aiapis.help"; }
  catch { return false; }
}

function normalizeModelForApi(model, apiUrl) {
  const normalized = String(model || "gpt-image-2").trim();
  if (isImgv1ApiUrl(apiUrl) && (!normalized || normalized === "gpt-image-1")) return "gpt-image-2";
  return normalized || "gpt-image-2";
}

function buildImageRequestBody(input, prompt, apiUrl) {
  const body = {
    model: normalizeModelForApi(input.model, apiUrl),
    prompt,
    size: normalizeSize(input.size),
    quality: assertOneOf(input.quality || "high", allowedQualities, "quality"),
    output_format: assertOneOf(input.outputFormat || input.output_format || "png", allowedOutputFormats, "output_format"),
    response_format: assertOneOf(input.responseFormat || input.response_format || "b64_json", allowedResponseFormats, "response_format"),
    n: normalizeCount(input.n || input.count)
  };
  if (isImgv1ApiUrl(apiUrl) && !imgv1SupportedSizes.has(body.size)) {
    throw new Error("imgv1.aiapis.help 当前配置支持 960x1280、1024x1024、1536x1024、1024x1536");
  }
  if (isImgv1ApiUrl(apiUrl)) {
    body.output_format = "png";
    body.response_format = "b64_json";
  }
  return body;
}

function upstreamImageFields(body, apiUrl) {
  const fields = {
    model: body.model,
    prompt: body.prompt,
    size: body.size,
    n: body.n
  };
  if (!isImgv1ApiUrl(apiUrl)) {
    fields.quality = body.quality;
    fields.output_format = body.output_format;
    fields.response_format = body.response_format;
  }
  return fields;
}

function parseUploadedImage(image) {
  if (!image?.base64) throw new Error("请上传需要编辑的图片");
  const imageName = path.basename(String(image.name || "source.png"));
  const imageType = assertOneOf(image.type || "image/png", allowedImageTypes, "图片类型");
  const base64 = String(image.base64);
  if (!/^[a-zA-Z0-9+/]+={0,2}$/.test(base64)) throw new Error("上传图片编码无效");
  const imageBuffer = Buffer.from(base64, "base64");
  if (imageBuffer.length === 0) throw new Error("上传图片内容为空");
  if (imageBuffer.length > maxUploadImageBytes) throw new Error("上传图片不能超过 50MB");
  return { imageName, imageType, imageBuffer };
}

function normalizeImageExt(format, contentType = "") {
  const requested = String(format || "png").toLowerCase();
  if (["png", "jpg", "jpeg", "webp"].includes(requested)) return requested === "jpeg" ? "jpg" : requested;
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "png";
}

function safeSlug(text) {
  return String(text || "image").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "image";
}

async function saveImageFromItem(item, index, outputFormat, prompt) {
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = safeSlug(prompt);
  let bytes;
  let source;
  let ext = normalizeImageExt(outputFormat, item.contentType || "");
  if (item.bytes) {
    bytes = Buffer.isBuffer(item.bytes) ? item.bytes : Buffer.from(item.bytes);
    source = item.source || "binary";
  } else if (item.b64_json) {
    bytes = Buffer.from(item.b64_json, "base64");
    source = "b64_json";
  } else if (item.url) {
    const imageResponse = await upstreamFetch(item.url);
    if (!imageResponse.ok) throw new Error(`图片 URL 下载失败：${imageResponse.status}`);
    ext = normalizeImageExt(outputFormat, imageResponse.headers.get("content-type") || "");
    bytes = Buffer.from(await imageResponse.arrayBuffer());
    source = "url";
  } else {
    throw new Error("接口响应中没有图片字段");
  }
  const filename = `${timestamp}-${slug}-${index + 1}.${ext}`;
  const absolutePath = path.join(outputDir, filename);
  await fs.writeFile(absolutePath, bytes);
  return { filename, url: `/outputs/${filename}`, source, absolutePath, bytes: bytes.length };
}

function extractImageItems(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.images)) return payload.images;
  if (Array.isArray(payload?.output)) return payload.output.map((item) => typeof item === "string" ? stringToImageItem(item) : item);
  if (Array.isArray(payload?.result)) return payload.result.map((item) => typeof item === "string" ? stringToImageItem(item) : item);
  if (payload?.image) return [stringToImageItem(payload.image)];
  if (payload?.url) return [{ url: payload.url }];
  if (payload?.b64_json) return [{ b64_json: payload.b64_json }];
  if (payload?.base64) return [{ b64_json: payload.base64 }];
  if (payload?.raw) return extractImageItemsFromRaw(payload.raw, payload.contentType || "");
  return [];
}

function stringToImageItem(value) {
  const text = String(value || "").trim();
  if (/^https?:\/\//i.test(text)) return { url: text };
  if (/^data:image\//i.test(text)) {
    const match = text.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (match) return { b64_json: match[2], contentType: match[1] };
  }
  return { b64_json: text };
}

function extractImageItemsFromRaw(raw, contentType = "") {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (/^data:image\//i.test(text) || /^https?:\/\//i.test(text)) return [stringToImageItem(text)];
  const dataUrl = text.match(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/i);
  if (dataUrl) return [stringToImageItem(dataUrl[0])];
  const url = text.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp)(?:\?[^\s"'<>]*)?/i);
  if (url) return [{ url: url[0] }];
  const jsonLine = text.split(/\r?\n/).map((line) => line.replace(/^data:\s*/i, "").trim()).filter(Boolean).reverse();
  for (const line of jsonLine) {
    try {
      const parsed = JSON.parse(line);
      const items = extractImageItems(parsed);
      if (items.length) return items;
    } catch {}
  }
  const maybeBase64 = text.replace(/^data:\s*/i, "").replace(/\s+/g, "");
  if (/^[a-z0-9+/]+={0,2}$/i.test(maybeBase64) && maybeBase64.length > 80) return [{ b64_json: maybeBase64, contentType }];
  return [];
}

function publicRequestMeta(body, input, mode) {
  return {
    mode,
    model: body.model,
    aspectPreset: String(input.aspectPreset || "custom"),
    size: body.size,
    quality: body.quality,
    outputFormat: body.output_format,
    responseFormat: body.response_format,
    n: body.n,
    provider: String(input.provider || input.providerName || "custom")
  };
}

function cleanApiKey(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t ]+/g, "")
    .replace(/[“”"'`]/g, "")
    .trim();
}

function keyFingerprint(value) {
  const key = cleanApiKey(value);
  if (!key) return "";
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function resolveApiKey(input = {}, options = {}) {
  const browserKey = cleanApiKey(input.apiKey);
  if (browserKey) return { value: browserKey, source: "browser", fingerprint: keyFingerprint(browserKey) };
  if (options.browserOnly) return { value: "", source: "", fingerprint: "" };
  const candidates = [
    ["IMG_API_KEY", process.env.IMG_API_KEY],
    ["IMAGE_API_KEY", process.env.IMAGE_API_KEY],
    ["OPENAI_API_KEY", process.env.OPENAI_API_KEY]
  ];
  for (const [source, raw] of candidates) {
    const value = cleanApiKey(raw);
    if (value) return { value, source, fingerprint: keyFingerprint(value) };
  }
  return { value: "", source: "", fingerprint: "" };
}

function resolveImageApiUrl(inputUrl, mode) {
  const normalized = assertHttpUrl(inputUrl || "");
  const url = new URL(normalized);
  const endpoint = mode === "edit" ? "/v1/images/edits" : "/v1/images/generations";
  if (url.pathname === "/" || url.pathname === "" || url.pathname === "/v1") {
    url.pathname = endpoint;
    url.search = "";
  } else if (url.pathname.endsWith("/v1/")) {
    url.pathname = endpoint;
    url.search = "";
  }
  return url.toString();
}

function resolveModelsApiUrl(inputUrl) {
  const normalized = assertHttpUrl(inputUrl || "");
  const url = new URL(normalized);
  if (url.pathname === "/" || url.pathname === "" || url.pathname === "/v1" || url.pathname.endsWith("/v1/")) {
    url.pathname = "/v1/models";
    url.search = "";
  }
  return url.toString();
}

async function readUpstreamJson(response) {
  const contentType = response.headers.get("content-type") || "";
  const bytes = Buffer.from(await response.arrayBuffer());
  const text = bytes.toString("utf8");
  try { return JSON.parse(text); }
  catch { return contentType.startsWith("image/") ? { bytes, contentType } : { raw: text, contentType }; }
}

async function handleModelsProbe(req, res) {
  try {
    const { input } = await readJsonBody(req);
    const apiUrl = resolveModelsApiUrl(input.apiUrl || defaultImageApiBase);
    const apiKeyInfo = resolveApiKey(input);
    const apiKey = apiKeyInfo.value;
    if (!apiKey) throw new Error("请填写 API Key");
    const apiResponse = await upstreamFetch(apiUrl, { method: "GET", headers: { authorization: `Bearer ${apiKey}` } });
    const payload = await readUpstreamJson(apiResponse);
    if (!apiResponse.ok) {
      const rawMessage = payload?.error?.message || payload?.message || `模型列表请求失败：${apiResponse.status}`;
      return sendJson(res, apiResponse.status, { ok: false, error: explainUpstreamError(rawMessage), apiKey: { source: apiKeyInfo.source, fingerprint: apiKeyInfo.fingerprint }, details: sanitize(payload) });
    }
    const models = Array.isArray(payload?.data) ? payload.data.map((item) => typeof item === "string" ? item : item?.id).filter(Boolean) : [];
    return sendJson(res, 200, { ok: true, apiUrl, apiKey: { source: apiKeyInfo.source, fingerprint: apiKeyInfo.fingerprint }, models, details: sanitize(payload) });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message });
  }
}

async function callUpstreamImage(apiUrl, fetchOptions, timeoutMs = 240000, maxAttempts = 2) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const apiResponse = await upstreamFetch(apiUrl, { ...fetchOptions, signal: controller.signal }).finally(() => clearTimeout(timer));
      const payload = await readUpstreamJson(apiResponse);
      const rawMessage = payload?.error?.message || payload?.message || `接口请求失败：${apiResponse.status}`;
      last = { apiResponse, payload, rawMessage, attempt };
      if (apiResponse.ok) return last;
      if (!/no available channel|does not allow image generation|supported_model_scopes|distributor/i.test(rawMessage) || attempt >= maxAttempts) return last;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    } catch (error) {
      clearTimeout(timer);
      last = { apiResponse: null, payload: null, rawMessage: error.name === "AbortError" ? "请求超时" : error.message, attempt, error };
      if (!/请求超时|socket hang up|ECONNRESET|ETIMEDOUT/i.test(last.rawMessage) || attempt >= maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  return last;
}

async function handleImageFlow(req, res, mode) {
  const requestId = ++requestSeq;
  const taskId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const { raw, input } = await readJsonBody(req, mode === "edit" ? maxEditBodyBytes : maxJsonBodyBytes);
    const apiUrl = resolveImageApiUrl(input.apiUrl || defaultImageApiBase, mode);
    const apiKeyInfo = resolveApiKey(input, { browserOnly: true });
    const apiKey = apiKeyInfo.value;
    if (!apiKey) throw new Error("请在页面服务商设置里填写 API Key");
    if (/[…。]|\.\.\./.test(apiKey)) throw new Error("API Key 里包含省略号，请粘贴完整原始 Key，不要使用 sk-xxx…xxxx 这种显示版");
    if (apiKey.length < 20) throw new Error("API Key 看起来太短，请粘贴完整原始 Key");
    if (!/^[\x21-\x7e]+$/.test(apiKey)) throw new Error("API Key 包含不可见字符或非 ASCII 字符，请重新复制完整原始 Key");
    const prompt = String(input.prompt || "").trim();
    if (!prompt) throw new Error("请填写提示词");
    const body = buildImageRequestBody(input, prompt, apiUrl);
    const upstreamBody = upstreamImageFields(body, apiUrl);
    const request = publicRequestMeta(body, input, mode);
    request.apiKey = { source: apiKeyInfo.source, fingerprint: apiKeyInfo.fingerprint };
    log("API", mode === "edit" ? "收到图片编辑请求" : "收到生成请求", { requestId, taskId, bytes: Buffer.byteLength(raw), apiUrl, request, promptLength: prompt.length });

    let fetchOptions;
    if (mode === "edit") {
      const { imageName, imageType, imageBuffer } = parseUploadedImage(input.image);
      const form = new FormData();
      form.append("model", upstreamBody.model);
      form.append("prompt", upstreamBody.prompt);
      form.append("size", upstreamBody.size);
      form.append("n", String(upstreamBody.n));
      form.append("image", new Blob([imageBuffer], { type: imageType }), imageName);
      if (upstreamBody.quality) form.append("quality", upstreamBody.quality);
      if (upstreamBody.output_format) form.append("output_format", upstreamBody.output_format);
      if (upstreamBody.response_format) form.append("response_format", upstreamBody.response_format);
      request.inputImage = { name: imageName, type: imageType, bytes: imageBuffer.length };
      fetchOptions = { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form };
    } else {
      fetchOptions = { method: "POST", headers: { "content-type": "application/json", accept: "*/*", authorization: `Bearer ${apiKey}` }, body: JSON.stringify(upstreamBody) };
    }

    const upstreamResults = [];
    const requestedCount = Math.max(1, Number(body.n || 1));
    const shouldSplitBatch = mode !== "edit" && requestedCount > 1;
    const requestBodies = shouldSplitBatch
      ? Array.from({ length: requestedCount }, () => ({ ...upstreamBody, n: 1 }))
      : [upstreamBody];

    const upstreamErrors = [];
    for (let i = 0; i < requestBodies.length; i += 1) {
      const currentBody = requestBodies[i];
      const currentFetchOptions = mode === "edit"
        ? fetchOptions
        : { ...fetchOptions, body: JSON.stringify(currentBody) };
      let upstreamResult;
      try {
        upstreamResult = await callUpstreamImage(apiUrl, currentFetchOptions, 240000, 2);
      } catch (error) {
        upstreamErrors.push({ index: i + 1, message: error.name === "AbortError" ? "请求超时" : error.message });
        if (!shouldSplitBatch) throw error;
        continue;
      }
      upstreamResults.push(upstreamResult);
      const apiResponse = upstreamResult.apiResponse;
      let payload = upstreamResult.payload || {};
      request.upstreamAttempts = (request.upstreamAttempts || 0) + (upstreamResult.attempt || 1);
      if (payload.bytes) payload = { bytes: payload.bytes, contentType: payload.contentType, source: "binary" };
      if (!apiResponse?.ok) {
        const rawMessage = upstreamResult.rawMessage || payload?.error?.message || payload?.message || `接口请求失败：${apiResponse?.status || 502}`;
        const message = explainUpstreamError(rawMessage, request);
        upstreamErrors.push({ index: i + 1, message });
        if (shouldSplitBatch) continue;
        await appendHistory({ id: taskId, type: mode, status: "error", prompt, request, error: message, elapsedMs: Date.now() - startedAt, createdAt: new Date().toISOString() });
        return sendJson(res, apiResponse?.status || 502, { ok: false, error: message, details: sanitize(payload), request });
      }
    }

    request.splitBatch = shouldSplitBatch;
    request.upstreamRequests = requestBodies.length;
    request.upstreamFailures = upstreamErrors.length;
    if (upstreamErrors.length) request.upstreamErrors = sanitize(upstreamErrors).slice(0, 4);
    const data = [];
    let created;
    for (const upstreamResult of upstreamResults) {
      let payload = upstreamResult.payload || {};
      if (payload.bytes) payload = { bytes: payload.bytes, contentType: payload.contentType, source: "binary" };
      if (created === undefined && payload.created !== undefined) created = payload.created;
      data.push(...(payload?.bytes ? [{ bytes: payload.bytes, contentType: payload.contentType, source: payload.source }] : extractImageItems(payload)));
    }
    if (data.length === 0) {
      if (upstreamErrors.length) throw new Error(`全部图片生成失败：${upstreamErrors.map((item) => `第${item.index}张 ${item.message}`).join("；")}`);
      const lastPayload = upstreamResults.at(-1)?.payload;
      const keys = lastPayload && typeof lastPayload === "object" ? Object.keys(lastPayload).slice(0, 8).join("、") : "非 JSON 响应";
      const rawHint = lastPayload?.raw ? `；raw 前 120 字：${sanitize(lastPayload.raw).slice(0, 120)}` : "";
      throw new Error(`接口响应里没找到图片字段（支持 data/images/output/result/url/b64_json/base64/raw/data:image/SSE/图片二进制）。当前字段：${keys || "空"}${rawHint}`);
    }

    const images = [];
    for (let i = 0; i < data.length; i += 1) {
      const saved = await saveImageFromItem(data[i], i, body.output_format, mode === "edit" ? `edit-${prompt}` : prompt);
      images.push({
        id: crypto.randomUUID(),
        taskId,
        filename: saved.filename,
        url: saved.url,
        absolutePath: saved.absolutePath,
        source: mode === "edit" ? `edit-${saved.source}` : saved.source,
        bytes: saved.bytes,
        prompt,
        favorite: false,
        createdAt: new Date().toISOString(),
        ...request
      });
    }
    await addManifestImages(images);
    const historyEntry = { id: taskId, type: mode, status: upstreamErrors.length ? "partial_success" : "success", prompt, request, imageIds: images.map((img) => img.id), imageCount: images.length, requestedCount, failedCount: upstreamErrors.length, elapsedMs: Date.now() - startedAt, createdAt: new Date().toISOString() };
    await appendHistory(historyEntry);
    sendJson(res, 200, { ok: true, created, elapsedMs: Date.now() - startedAt, request, task: historyEntry, images });
  } catch (error) {
    const message = error.name === "AbortError" ? "请求超时" : error.message;
    await appendHistory({ id: taskId, type: mode, status: "error", error: message, elapsedMs: Date.now() - startedAt, createdAt: new Date().toISOString() });
    log("ERROR", mode === "edit" ? "图片编辑失败" : "生成失败", { requestId, taskId, message });
    sendJson(res, 400, { ok: false, error: message });
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";
  const originalPathname = pathname;
  let baseDir = publicDir;
  if (pathname.startsWith("/outputs/")) {
    baseDir = outputDir;
    pathname = pathname.replace("/outputs/", "/");
  }
  const filePath = path.normalize(path.join(baseDir, pathname));
  if (!filePath.startsWith(baseDir)) { res.writeHead(403); res.end("Forbidden"); return; }
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream", "cache-control": "no-store, no-cache, must-revalidate", "x-app-version": appVersion });
    res.end(content);
  } catch {
    res.writeHead(404); res.end(`Not found: ${originalPathname}`);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);
    if (req.method === "GET" && requestUrl.pathname === "/api/health") return sendJson(res, 200, { ok: true, version: appVersion, outputDir });
    if (req.method === "GET" && requestUrl.pathname === "/api/gallery") {
      const items = await readJsonFile(manifestPath, []);
      return sendJson(res, 200, { ok: true, images: items });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/history") {
      const tasks = await readJsonFile(historyPath, []);
      return sendJson(res, 200, { ok: true, tasks });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/models") return handleModelsProbe(req, res);
    if (req.method === "POST" && requestUrl.pathname === "/api/favorite") {
      const { input } = await readJsonBody(req);
      if (!input.id) throw new Error("缺少图片 ID");
      const image = await updateManifestImage(String(input.id), { favorite: Boolean(input.favorite) });
      return sendJson(res, 200, { ok: true, image });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/delete-image") {
      const { input } = await readJsonBody(req);
      if (!input.id) throw new Error("缺少图片 ID");
      const image = await deleteManifestImage(String(input.id));
      return sendJson(res, 200, { ok: true, image });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/delete-history") {
      const { input } = await readJsonBody(req);
      if (!input.id) throw new Error("缺少历史记录 ID");
      await deleteHistoryEntry(String(input.id));
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/clear-history") {
      await clearHistoryEntries();
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/generate") return handleImageFlow(req, res, "generate");
    if (req.method === "POST" && requestUrl.pathname === "/api/edit-image") return handleImageFlow(req, res, "edit");
    return serveStatic(req, res);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || "请求失败" });
  }
});

server.listen(port, () => {
  log("BOOT", "Image Studio 已启动", { url: `http://localhost:${port}`, version: appVersion, node: process.version, outputDir });
});
