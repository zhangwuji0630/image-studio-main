console.log("Image Studio app loaded", new Date().toISOString());
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const storageKey = "image-studio-config-v2-blank-url";
const defaultApiBase = "https://imgv1.aiapis.help";
const aspectSizeMap = {
  "3:4": "960x1280",
  "1:1": "1024x1024",
  "3:2": "1536x1024",
  "2:3": "1024x1536",
};
const imgv1SupportedSizes = new Set(Object.values(aspectSizeMap));

const fields = {
  apiUrl: $("#apiUrl"), editApiUrl: $("#editApiUrl"), apiKey: $("#apiKey"), rememberKey: $("#rememberKey"),
  model: $("#model"), mode: $("#mode"), aspectPreset: $("#aspectPreset"), size: $("#size"), quality: $("#quality"),
  outputFormat: $("#outputFormat"), responseFormat: $("#responseFormat"), count: $("#count"), prompt: $("#prompt"), avoid: $("#avoid")
};

const els = {
  serverStatus: $("#serverStatus"), serverSubStatus: $("#serverSubStatus"), serviceDot: $("#serviceDot"),
  bottomParamSummary: $("#bottomParamSummary"), drawerBackdrop: $("#drawerBackdrop"), addStyleBtn: $("#addStyleBtn"),
  generateBtn: $("#generateBtn"), saveConfigBtn: $("#saveConfigBtn"), clearPrompt: $("#clearPrompt"), addImageBtn: $("#addImageBtn"), imageInput: $("#imageInput"), uploadMeta: $("#uploadMeta"),
  emptyState: $("#emptyState"), generatingState: $("#generatingState"), currentResult: $("#currentResult"), currentGrid: $("#currentGrid"), resultMeta: $("#resultMeta"), errorPanel: $("#errorPanel"), errorMessage: $("#errorMessage"), retryBtn: $("#retryBtn"),
  progressLabel: $("#progressLabel"), progressStep: $("#progressStep"), progressElapsed: $("#progressElapsed"), progressBar: $("#progressBar"),
  galleryGrid: $("#galleryGrid"), galleryBlank: $("#galleryBlank"), gallerySearch: $("#gallerySearch"), galleryFilter: $("#galleryFilter"),
  favoriteGrid: $("#favoriteGrid"), favoriteBlank: $("#favoriteBlank"), historyList: $("#historyList"), historyBlank: $("#historyBlank"), refreshHistoryBtn: $("#refreshHistoryBtn"), clearHistoryBtn: $("#clearHistoryBtn"),
  downloadAllBtn: $("#downloadAllBtn"), reusePromptBtn: $("#reusePromptBtn"), keyStatus: $("#keyStatus"), configStatus: $("#configStatus"), sizeHint: $("#sizeHint"),
  lightbox: $("#lightbox"), lightboxBackdrop: $("#lightboxBackdrop"), lightboxClose: $("#lightboxClose"), lightboxImage: $("#lightboxImage"), lightboxTitle: $("#lightboxTitle"), lightboxMeta: $("#lightboxMeta"), lightboxPrompt: $("#lightboxPrompt"), lightboxOpen: $("#lightboxOpen"), lightboxDownload: $("#lightboxDownload"), lightboxReuse: $("#lightboxReuse"), lightboxPrev: $("#lightboxPrev"), lightboxNext: $("#lightboxNext")
};

let galleryImages = [];
let historyTasks = [];
let currentImages = [];
let currentPrompt = "";
let selectedImage = null;
let isGenerating = false;
let progressTimer = null;
let progressStartedAt = 0;
let activeLightboxList = [];
let activeLightboxIndex = 0;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function timeText(value) {
  if (!value) return "刚刚";
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}小时前`;
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
function truncate(text, len = 56) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > len ? `${s.slice(0, len)}…` : s;
}
function cleanApiKey(value) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t ]+/g, "")
    .replace(/[“”"'`]/g, "")
    .trim();
}
function maskSecret(value) {
  const secret = cleanApiKey(value);
  if (!secret) return "未填写";
  if (secret.length <= 8) return "已填写（已隐藏）";
  return `${secret.slice(0, 3)}…${secret.slice(-4)}`;
}
function buildPrompt() {
  const prompt = fields.prompt.value.trim();
  const avoid = fields.avoid.value.trim();
  return avoid ? `${prompt}\n约束：${avoid}` : prompt;
}
function updateSummaries() {
  const count = Math.max(1, Math.min(4, Number(fields.count.value || 1)));
  const summary = `${fields.aspectPreset.value} · ${fields.quality.value} · ${fields.outputFormat.value} · ${count}张`;
  els.bottomParamSummary.textContent = summary;
  els.generateBtn.textContent = isGenerating ? `${fields.mode.value === "edit" ? "编辑" : "生成"}中…` : `${fields.mode.value === "edit" ? "编辑" : "生成"} ${count} 张`;
  els.sizeHint.textContent = fields.aspectPreset.value === "custom" ? "自定义尺寸需要满足宽高为 16 的倍数。" : `${fields.aspectPreset.value} 使用 ${fields.size.value}。`;
  els.keyStatus.textContent = `Key ${maskSecret(fields.apiKey.value)}，${fields.rememberKey.checked ? "会保存在本机浏览器" : "不会保存"}。`;
}
function normalizeSize(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, ""); }
function applyAspectPreset() { const size = aspectSizeMap[fields.aspectPreset.value]; if (size) fields.size.value = size; updateSummaries(); }
function showView(name) {
  closeDrawers();
  document.body.classList.toggle("view-create-active", name === "create");
  $$(".view").forEach((v) => v.classList.remove("active"));
  $(`#view-${name}`)?.classList.add("active");
  $$(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (name === "gallery") renderGallery();
  if (name === "favorites") renderFavorites();
  if (name === "history") renderHistory();
}
function openDrawer(name) {
  const drawer = name === "provider" ? $("#providerDrawer") : $("#paramsDrawer");
  if (!drawer) return;
  $$(".drawer").forEach((d) => {
    const isActive = d === drawer;
    d.classList.toggle("open", isActive);
    d.setAttribute("aria-hidden", isActive ? "false" : "true");
  });
  if (els.drawerBackdrop) els.drawerBackdrop.hidden = false;
  document.body.classList.add("drawer-open");
}
function closeDrawers() {
  $$(".drawer").forEach((d) => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); });
  if (els.drawerBackdrop) els.drawerBackdrop.hidden = true;
  document.body.classList.remove("drawer-open");
}
function appendPromptSnippet(snippet) {
  const text = String(snippet || "").trim();
  if (!text) return;
  fields.prompt.value = `${fields.prompt.value.trim()}\n${text}`.trim();
  fields.prompt.focus();
}
function addCustomStyle() {
  const text = prompt("输入要添加的风格词：", "");
  const snippet = String(text || "").trim();
  if (!snippet) return;
  const buttonEl = document.createElement("button");
  buttonEl.type = "button";
  buttonEl.dataset.snippet = snippet;
  buttonEl.textContent = snippet.length > 8 ? `${snippet.slice(0, 8)}…` : snippet;
  buttonEl.title = snippet;
  buttonEl.addEventListener("click", () => appendPromptSnippet(snippet));
  els.addStyleBtn?.before(buttonEl);
  appendPromptSnippet(snippet);
}
function setCreateState(state) {
  els.emptyState.hidden = state !== "empty";
  els.generatingState.hidden = state !== "generating";
  els.currentResult.hidden = state !== "done";
  els.errorPanel.hidden = state !== "error";
}
function setGenerateState(loading) {
  isGenerating = loading;
  els.generateBtn.disabled = loading;
  els.saveConfigBtn.disabled = loading;
  els.addImageBtn.disabled = loading;
  updateSummaries();
}
function startProgress() {
  progressStartedAt = Date.now();
  let pct = 8;
  els.progressBar.style.width = "8%";
  els.progressStep.textContent = "请求接口中";
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    const sec = Math.round((Date.now() - progressStartedAt) / 1000);
    els.progressElapsed.textContent = `${sec}s`;
    pct = Math.min(92, pct + (pct < 60 ? 7 : 2));
    els.progressBar.style.width = `${pct}%`;
    if (sec > 4) els.progressStep.textContent = "接口处理中，图片生成可能需要一点时间";
  }, 800);
}
function finishProgress(ok) { clearInterval(progressTimer); els.progressBar.style.width = ok ? "100%" : "12%"; }
function saveConfig(quiet = false) {
  const config = {};
  Object.entries(fields).forEach(([key, el]) => {
    if (key === "prompt" || key === "avoid") return;
    config[key] = el.type === "checkbox" ? el.checked : el.value;
  });
  if (!fields.rememberKey.checked) delete config.apiKey;
  localStorage.setItem(storageKey, JSON.stringify(config));
  if (!quiet) els.configStatus.textContent = `配置已保存，Key ${fields.rememberKey.checked ? maskSecret(fields.apiKey.value) : "未保存"}`;
}
function loadConfig() {
  try {
    const config = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.entries(config).forEach(([key, value]) => {
      if (!fields[key]) return;
      if (fields[key].type === "checkbox") fields[key].checked = Boolean(value);
      else fields[key].value = value;
    });
  } catch { localStorage.removeItem(storageKey); }
  if (!fields.apiUrl.value.trim()) fields.apiUrl.value = defaultApiBase;
  if (!fields.editApiUrl.value.trim()) fields.editApiUrl.value = defaultApiBase;
  if (fields.mode.value === "edit" && !selectedImage) fields.mode.value = "generate";
  if (!fields.model.value.trim() || fields.model.value.trim() === "gpt-image-1") fields.model.value = "gpt-image-2";
  if (!fields.aspectPreset.value || !aspectSizeMap[fields.aspectPreset.value]) fields.aspectPreset.value = "3:4";
  if (!fields.size.value.trim()) fields.size.value = aspectSizeMap[fields.aspectPreset.value] || aspectSizeMap["3:4"];
  updateSummaries();
}
function fileToSourceImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve({ name: file.name, type: file.type, size: file.size, dataUrl, base64: dataUrl.split(",")[1] || "" });
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}
async function selectSourceImage(file) {
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return alert("参考图片只支持 PNG、JPG、WEBP。");
  if (file.size > 50 * 1024 * 1024) return alert("参考图片不能超过 50MB。 ");
  selectedImage = await fileToSourceImage(file);
  fields.mode.value = "edit";
  els.uploadMeta.textContent = `${selectedImage.name} · ${formatBytes(selectedImage.size)}`;
  updateSummaries();
}
function validatePayload(payload) {
  if (!payload.apiUrl) return { message: "请填写接口 URL。", drawer: "provider" };
  try { const url = new URL(payload.apiUrl); if (!["http:", "https:"].includes(url.protocol)) return { message: "接口 URL 只支持 http 或 https。", drawer: "provider" }; } catch { return { message: "接口 URL 格式不正确。", drawer: "provider" }; }
  if (!payload.apiKey) return { message: "请先在服务商设置里填写 API Key。", drawer: "provider" };
  if (payload.apiKey && /[…。]|\.\.\./.test(payload.apiKey)) return { message: "API Key 里包含省略号，请粘贴完整原始 Key，不要使用 sk-xxx…xxxx 这种显示版。", drawer: "provider" };
  if (payload.apiKey && payload.apiKey.length < 20) return { message: "API Key 看起来太短，请粘贴完整原始 Key。", drawer: "provider" };
  if (payload.apiKey && !/^[\x21-\x7e]+$/.test(payload.apiKey)) return { message: "API Key 包含不可见字符，已尝试自动清理，请重新点生成。", drawer: "provider" };
  if (!payload.model) return { message: "请填写模型名称。", drawer: "params" };
  if (!payload.prompt) return { message: "请填写提示词。" };
  if (payload.mode === "edit" && !payload.image) return { message: "图片编辑需要先上传参考图。" };
  return null;
}
function normalizeImages(images) { return (images || []).filter((img) => img?.url).map((img, index) => ({ ...img, index: index + 1 })); }
function imageMeta(image) { return `${image.aspectPreset || "custom"} · ${image.quality || "high"} · ${image.outputFormat || "png"} · ${formatBytes(Number(image.bytes))}`; }
function makeImageTitle(image) {
  const text = String(image?.prompt || image?.filename || "图片").replace(/约束[:：][\s\S]*$/i, "").replace(/\s+/g, " ").trim();
  if (!text) return "生成图片";
  const cleaned = text
    .replace(/^(写实摄影风格|电影感|高清细节|柔和自然光)[:：\s]*/i, "")
    .replace(/[，。；、,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(cleaned || text, 18);
}
function createImageCard(image, list, options = {}) {
  const card = document.createElement("article"); card.className = "image-card";
  if (image.demo) card.classList.add("demo-card");
  const img = document.createElement("img"); img.className = "image-thumb"; img.src = image.url; img.alt = truncate(image.prompt || image.filename, 80); img.loading = "lazy";
  img.addEventListener("click", () => openLightbox(list, list.findIndex((item) => item.id === image.id || item.url === image.url)));
  const actions = document.createElement("div"); actions.className = "card-actions";
  const preview = button("◎  预览", () => openLightbox(list, list.findIndex((item) => item.id === image.id || item.url === image.url)));
  const download = button("⇩  下载", () => downloadImage(image));
  const copy = button("▭  复制路径", () => copyPath(image));
  actions.append(preview, download, copy);
  if (!image.demo) {
    const reuse = button("复用", () => reusePrompt(image));
    const fav = button(image.favorite ? "已收藏" : "收藏", () => toggleFavorite(image)); fav.classList.toggle("favorite-on", Boolean(image.favorite));
    const del = button("删除", () => deleteImage(image)); del.className = "danger-action";
    actions.append(reuse, fav, del);
  }
  const body = document.createElement("div"); body.className = "card-body";
  const prompt = document.createElement("p"); prompt.className = "card-prompt"; prompt.textContent = makeImageTitle(image); prompt.title = image.prompt || image.filename || "";
  const meta = document.createElement("div"); meta.className = "card-meta"; meta.textContent = `${image.aspectPreset || "9:16"} · ${image.quality || "high"} · ${image.outputFormat || "png"} · ${image.n || 1}张`;
  const footer = document.createElement("div"); footer.className = "card-footer";
  const time = document.createElement("span"); time.textContent = timeText(image.createdAt);
  const more = button("⋯", () => openLightbox(list, list.findIndex((item) => item.id === image.id || item.url === image.url))); more.className = "more-button"; more.setAttribute("aria-label", "更多操作");
  footer.append(time, more);
  body.append(prompt, meta, footer); card.append(img, actions, body); return card;
}
function button(text, fn) { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.addEventListener("click", fn); return b; }
function renderCurrent(images) {
  currentImages = normalizeImages(images);
  els.currentGrid.innerHTML = "";
  els.currentGrid.className = `current-grid ${currentImages.length === 1 ? "one" : currentImages.length === 2 ? "two" : "multi"}`;
  currentImages.forEach((image) => els.currentGrid.append(createImageCard(image, currentImages, { promptLength: 90 })));
  els.downloadAllBtn.disabled = currentImages.length === 0;
  setCreateState(currentImages.length ? "done" : "empty");
}
function renderGallery() {
  const q = els.gallerySearch.value.trim().toLowerCase();
  const filter = els.galleryFilter.value;
  const source = galleryImages;
  const list = source.filter((img) => {
    if (filter === "favorite" && !img.favorite) return false;
    if (!q) return true;
    return `${img.prompt || ""} ${img.filename || ""} ${img.model || ""}`.toLowerCase().includes(q);
  });
  els.galleryGrid.innerHTML = "";
  list.forEach((img) => els.galleryGrid.append(createImageCard(img, list)));
  els.galleryBlank.hidden = list.length > 0;
}
function renderFavorites() {
  const list = galleryImages.filter((img) => img.favorite);
  els.favoriteGrid.innerHTML = "";
  list.forEach((img) => els.favoriteGrid.append(createImageCard(img, list)));
  els.favoriteBlank.hidden = list.length > 0;
}
function renderHistory() {
  els.historyList.innerHTML = "";
  historyTasks.forEach((task) => {
    const item = document.createElement("article"); item.className = "history-item";
    const status = task.status === "success" ? "成功" : "失败";
    const header = document.createElement("header");
    const title = document.createElement("strong"); title.textContent = `${task.type === "edit" ? "图片编辑" : "图片生成"} · ${task.imageCount || 0} 张`;
    const right = document.createElement("div"); right.className = "history-row-actions";
    const badge = document.createElement("span"); badge.className = `history-status ${task.status}`; badge.textContent = status;
    const del = button("删除", () => deleteHistoryTask(task)); del.className = "danger-link";
    right.append(badge, del); header.append(title, right);
    const prompt = document.createElement("p"); prompt.textContent = truncate(task.prompt || task.error || "无提示词", 110);
    const meta = document.createElement("p"); meta.textContent = `${timeText(task.createdAt)} · ${Number.isFinite(task.elapsedMs) ? (task.elapsedMs / 1000).toFixed(1) + "s" : "-"} · ${task.request?.model || "-"}`;
    item.append(header, prompt, meta);
    els.historyList.append(item);
  });
  els.historyBlank.hidden = historyTasks.length > 0;
}
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function loadGallery() { try { const data = await fetchJson("/api/gallery"); galleryImages = data.images || []; renderGallery(); renderFavorites(); } catch (error) { console.warn(error); renderGallery(); } }
async function loadHistory() { try { const data = await fetchJson("/api/history"); historyTasks = data.tasks || []; renderHistory(); } catch (error) { console.warn(error); } }
async function checkServer() {
  try { await fetchJson("/api/health"); els.serverStatus.textContent = "本地服务正常"; els.serverSubStatus.textContent = location.origin; els.serviceDot.className = "service-dot ok"; }
  catch { els.serverStatus.textContent = "本地服务异常"; els.serviceDot.className = "service-dot fail"; }
}
async function generateImage() {
  if (isGenerating) return;
  const payload = {
    mode: fields.mode.value,
    apiUrl: fields.mode.value === "edit" ? fields.editApiUrl.value.trim() : fields.apiUrl.value.trim(),
    apiKey: cleanApiKey(fields.apiKey.value), model: fields.model.value.trim(), aspectPreset: fields.aspectPreset.value, size: normalizeSize(fields.size.value),
    quality: fields.quality.value, outputFormat: fields.outputFormat.value, responseFormat: fields.responseFormat.value, n: Number(fields.count.value || 1), prompt: buildPrompt(),
    image: fields.mode.value === "edit" && selectedImage ? { name: selectedImage.name, type: selectedImage.type, size: selectedImage.size, base64: selectedImage.base64 } : null
  };
  const error = validatePayload(payload);
  if (error) {
    els.errorMessage.textContent = error.message || String(error);
    setCreateState("error");
    showView("create");
    if (error.drawer) {
      els.configStatus.textContent = error.message || String(error);
      openDrawer(error.drawer);
      if (error.drawer === "provider") fields.apiKey.focus();
    }
    return;
  }
  currentPrompt = fields.prompt.value;
  showView("create");
  setCreateState("generating"); setGenerateState(true); startProgress();
  try {
    const data = await fetchJson(payload.mode === "edit" ? "/api/edit-image" : "/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    finishProgress(true); renderCurrent(data.images || []);
    const seconds = Number.isFinite(data.elapsedMs) ? (data.elapsedMs / 1000).toFixed(1) : "-";
    els.resultMeta.textContent = `${currentImages.length} 张 · ${seconds}s · 已自动入库`;
    await Promise.all([loadGallery(), loadHistory()]);
    saveConfig(true);
  } catch (err) {
    finishProgress(false); els.errorMessage.textContent = err.message || "生成失败，请稍后重试。"; setCreateState("error");
  } finally { setGenerateState(false); }
}
function downloadImage(image) { const a = document.createElement("a"); a.href = image.url; a.download = image.filename || "image.png"; document.body.append(a); a.click(); a.remove(); }
function downloadAll() { currentImages.forEach(downloadImage); }
async function copyPath(image) { await navigator.clipboard?.writeText(image.absolutePath || image.url); }
function reusePrompt(image) { fields.prompt.value = image.prompt || currentPrompt || fields.prompt.value; showView("create"); fields.prompt.focus(); }
async function toggleFavorite(image) {
  const favorite = !image.favorite;
  image.favorite = favorite;
  try { await fetchJson("/api/favorite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: image.id, favorite }) }); }
  catch (error) { image.favorite = !favorite; alert(error.message); }
  await loadGallery(); renderCurrent(currentImages.map((img) => img.id === image.id ? { ...img, favorite } : img));
}
async function deleteImage(image) {
  if (!image?.id) return;
  if (!confirm("从页面图库删除这张图片？本地 images 文件夹里的原图会保留。")) return;
  try {
    await fetchJson("/api/delete-image", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: image.id }) });
    currentImages = currentImages.filter((img) => img.id !== image.id);
    renderCurrent(currentImages);
    await Promise.all([loadGallery(), loadHistory()]);
  } catch (error) { alert(error.message); }
}
async function deleteHistoryTask(task) {
  if (!task?.id) return;
  if (!confirm("删除这条历史记录？不会删除图库图片。")) return;
  try { await fetchJson("/api/delete-history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: task.id }) }); await loadHistory(); }
  catch (error) { alert(error.message); }
}
async function clearHistory() {
  if (!confirm("清空全部本地历史？不会删除图库图片。")) return;
  try { await fetchJson("/api/clear-history", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); await loadHistory(); }
  catch (error) { alert(error.message); }
}
function openLightbox(list, index = 0) {
  activeLightboxList = list.length ? list : currentImages;
  activeLightboxIndex = Math.max(0, index);
  updateLightbox(); els.lightbox.hidden = false; document.body.classList.add("modal-open");
}
function updateLightbox() {
  const image = activeLightboxList[activeLightboxIndex]; if (!image) return;
  els.lightboxImage.src = image.url; els.lightboxTitle.textContent = makeImageTitle(image); els.lightboxMeta.textContent = `${imageMeta(image)} · ${activeLightboxIndex + 1}/${activeLightboxList.length}`; if (els.lightboxPrompt) els.lightboxPrompt.textContent = image.prompt || image.filename || ""; els.lightboxOpen.href = image.url; els.lightboxDownload.href = image.url; els.lightboxDownload.download = image.filename || "image.png";
}
function closeLightbox() { els.lightbox.hidden = true; document.body.classList.remove("modal-open"); }
function stepLightbox(delta) { if (!activeLightboxList.length) return; activeLightboxIndex = (activeLightboxIndex + delta + activeLightboxList.length) % activeLightboxList.length; updateLightbox(); }

$$(".nav-item[data-view]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
$$("[data-drawer]").forEach((b) => b.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openDrawer(b.dataset.drawer); }));
$$("[data-close-drawer]").forEach((b) => b.addEventListener("click", closeDrawers));
els.drawerBackdrop?.addEventListener("click", closeDrawers);
$$("[data-snippet]").forEach((b) => b.addEventListener("click", () => appendPromptSnippet(b.dataset.snippet)));
els.addStyleBtn?.addEventListener("click", addCustomStyle);
Object.values(fields).forEach((el) => el?.addEventListener("input", updateSummaries));
fields.aspectPreset.addEventListener("change", applyAspectPreset);
fields.rememberKey.addEventListener("change", updateSummaries);
els.saveConfigBtn.addEventListener("click", () => saveConfig(false));
els.clearPrompt.addEventListener("click", () => { fields.prompt.value = ""; fields.prompt.focus(); });
els.addImageBtn.addEventListener("click", () => els.imageInput.click());
els.imageInput.addEventListener("change", () => selectSourceImage(els.imageInput.files?.[0]));
els.generateBtn.addEventListener("click", generateImage);
els.retryBtn.addEventListener("click", generateImage);
els.downloadAllBtn.addEventListener("click", downloadAll);
els.reusePromptBtn.addEventListener("click", () => { fields.prompt.value = currentPrompt || fields.prompt.value; fields.prompt.focus(); });
els.gallerySearch.addEventListener("input", renderGallery);
els.galleryFilter.addEventListener("change", renderGallery);
els.refreshHistoryBtn.addEventListener("click", loadHistory);
els.clearHistoryBtn?.addEventListener("click", clearHistory);
els.lightboxBackdrop.addEventListener("click", closeLightbox); els.lightboxClose.addEventListener("click", closeLightbox); els.lightboxPrev.addEventListener("click", () => stepLightbox(-1)); els.lightboxNext.addEventListener("click", () => stepLightbox(1));
els.lightboxReuse.addEventListener("click", () => { const image = activeLightboxList[activeLightboxIndex]; if (image) reusePrompt(image); closeLightbox(); });
document.addEventListener("keydown", (e) => { if (!els.lightbox.hidden) { if (e.key === "Escape") closeLightbox(); if (e.key === "ArrowLeft") stepLightbox(-1); if (e.key === "ArrowRight") stepLightbox(1); return; } if ((e.ctrlKey || e.metaKey) && e.key === "Enter") generateImage(); if (e.key === "Escape") closeDrawers(); });

loadConfig(); document.body.classList.add("view-create-active"); renderGallery(); checkServer(); loadGallery(); loadHistory(); setCreateState("empty");
document.documentElement.dataset.appReady = "true";
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker register failed", error));
  });
}
