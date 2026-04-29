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
const promptFlowTypes = ["人像写真", "产品摄影", "攻略图", "信息图", "小红书封面", "海报设计", "PPT配图", "教程步骤图", "电商详情图", "公众号首图", "清单卡片", "路线地图", "插画图标"];
const promptFlowBaseOptions = {
  subjectMode: ["明确主体", "多元素组合", "背景为主", "图文并重", "抽象概念", "场景故事"],
  lens: ["24mm 广角", "35mm 纪实", "50mm 标准", "85mm 人像", "100mm 微距"],
  aperture: ["f/1.8 浅景深", "f/2.8 商业摄影", "f/5.6 清晰主体", "f/8 全画面清晰"],
  lighting: ["自然窗光", "柔和散射光", "影棚布光", "逆光", "边缘光", "黄昏暖光", "夜景霓虹", "高级暗调光影"],
  material: ["玻璃通透", "金属反光", "陶瓷温润", "木质纹理", "皮革质感", "布料纹理", "液体光泽", "水珠细节", "磨砂质感", "高级哑光"],
  negative: ["不要水印", "不要低清晰度", "不要乱码文字", "不要错别字", "不要畸形手指", "不要多余肢体", "不要脏乱背景"]
};
const promptFlowPresets = {
  "人像写真": {
    template: "portrait",
    structure: ["半身人像", "全身人像", "侧脸特写", "回眸", "坐姿", "行走中", "自然抓拍", "杂志大片"],
    layout: ["居中构图", "三分法构图", "特写", "中景", "全身", "低机位", "浅景深", "背景虚化"],
    style: ["清新自然", "高级冷淡", "电影感", "复古胶片", "甜酷写真", "韩系写真", "日系生活感", "时尚杂志"],
    textMode: ["不要文字", "预留标题区域", "带短标题", "带标签贴纸文字"],
    detail: ["皮肤纹理自然", "发丝细节", "服装质感", "自然表情", "真实光影", "高级修图质感", "干净背景"]
  },
  "产品摄影": {
    template: "product",
    structure: ["主体居中", "产品组合", "使用场景", "细节特写", "卖点展示", "包装打开", "悬浮展示", "水珠附着"],
    layout: ["电商主图", "详情页配图", "居中构图", "顶部留白", "左右留白", "大面积干净背景", "近景特写", "俯拍摆拍"],
    style: ["商业摄影", "极简高级", "清新小红书", "科技质感", "奢华精致", "自然生活方式", "柔和色调", "高端品牌感"],
    textMode: ["不要文字", "预留标题区域", "带短标题", "带卖点标签", "只生成文字占位"],
    detail: ["真实材质", "产品边缘清晰", "真实阴影", "干净背景", "商业布光", "高清细节", "反光自然"]
  },
  "攻略图": {
    template: "guide",
    structure: ["旅行攻略", "美食攻略", "购物攻略", "装修攻略", "穿搭攻略", "工具攻略", "避坑指南", "打卡清单", "路线规划", "时间线攻略"],
    layout: ["小红书竖版", "卡片式排版", "分栏信息图", "手账拼贴", "地图路线风", "顶部大标题", "多模块内容区", "封面留白"],
    style: ["清新小红书", "可爱手账", "极简高级", "旅行杂志", "彩色信息图", "扁平插画", "拼贴 scrapbook", "明亮活泼"],
    textMode: ["带中文大标题", "带编号步骤文字", "带清单文字", "带标签贴纸文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["信息层级清晰", "图标丰富", "路线感明显", "模块分区清楚", "留白充足", "适合收藏", "封面感强"]
  },
  "信息图": {
    template: "info",
    structure: ["三步说明", "五点清单", "对比图", "流程图", "时间线", "数据看板", "FAQ问答", "知识卡片"],
    layout: ["竖版信息图", "左右分栏", "上下分区", "卡片式布局", "图标加说明", "中心辐射结构", "表格对比", "模块化网格"],
    style: ["极简信息图", "商务科技", "彩色扁平", "蓝白专业", "柔和渐变", "可爱图标", "现代 UI", "干净留白"],
    textMode: ["带中文大标题", "带编号步骤文字", "带清单文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["信息层级清晰", "图标统一", "对齐整齐", "阅读路径明确", "干净背景", "高可读性", "模块边界清楚"]
  },
  "小红书封面": {
    template: "cover",
    structure: ["攻略封面", "探店封面", "好物分享", "穿搭封面", "教程封面", "种草封面", "合集封面", "避坑封面"],
    layout: ["竖版封面", "顶部大标题", "人物/物品居中", "大面积留白", "拼贴布局", "贴纸标签", "标题区明显", "封面强视觉"],
    style: ["清新小红书", "奶油色系", "可爱手账", "高级极简", "明亮活泼", "甜酷风", "韩系生活感", "彩色贴纸"],
    textMode: ["带中文大标题", "带短标题", "带标签贴纸文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["封面感强", "标题区域醒目", "适合手机浏览", "主体突出", "色彩干净", "收藏感", "点击欲强"]
  },
  "海报设计": {
    template: "poster",
    structure: ["品牌海报", "活动海报", "电影海报", "促销海报", "新品发布", "节日海报", "概念海报", "展览海报"],
    layout: ["竖版海报", "横版 banner", "中心主体", "大标题区域", "上下分区", "强视觉焦点", "高级留白", "版式层级"],
    style: ["高级品牌感", "电影感", "极简现代", "复古杂志", "未来科技", "奢华精致", "潮流视觉", "强对比色"],
    textMode: ["带中文大标题", "带短标题", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["视觉冲击", "信息层级清晰", "商业质感", "主体突出", "高级留白", "适合发布", "设计感强"]
  },
  "PPT配图": {
    template: "ppt",
    structure: ["封面背景", "章节页", "数据分析", "团队协作", "流程架构", "时间线", "战略规划", "科技概念"],
    layout: ["横版 16:9", "左文右图", "右侧留白", "中心标题区", "渐变背景", "图标装饰", "模块分区", "商务封面"],
    style: ["商务科技", "蓝白专业", "极简高级", "渐变玻璃", "未来感", "企业宣传", "数据可视化", "低饱和专业"],
    textMode: ["预留标题区域", "只生成文字占位", "带短标题", "不要文字"],
    detail: ["适合放 PPT 标题", "背景干净", "层次清晰", "不抢文字", "专业可信", "空间感", "高端商务"]
  },
  "教程步骤图": {
    template: "tutorial",
    structure: ["三步教程", "五步教程", "操作流程", "前后对比", "工具使用", "安装步骤", "学习笔记", "FAQ说明"],
    layout: ["编号步骤", "流程箭头", "卡片分区", "截图占位", "图标加说明", "上下流程", "左右对比", "清单式布局"],
    style: ["清晰教程风", "极简信息图", "可爱图标", "商务专业", "彩色卡片", "现代 UI", "白底干净", "学习笔记"],
    textMode: ["带编号步骤文字", "带清单文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["步骤清楚", "阅读路径明确", "图标辅助", "层级清晰", "适合教学", "干净背景", "重点突出"]
  },
  "电商详情图": {
    template: "product",
    structure: ["卖点展示", "产品细节", "使用场景", "前后对比", "成分说明", "包装展示", "材质特写", "购买理由"],
    layout: ["详情页长图", "左右分栏", "上下分区", "卡片式卖点", "大图加说明", "细节放大", "干净白底", "模块化排版"],
    style: ["电商高级感", "极简干净", "清新小红书", "科技质感", "自然生活方式", "高端品牌感", "柔和商业风", "明亮可信"],
    textMode: ["带卖点标签", "带短标题", "带清单文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["卖点清晰", "材质真实", "产品边缘清楚", "信息层级清晰", "商业质感", "干净背景", "适合转化"]
  },
  "公众号首图": {
    template: "poster",
    structure: ["文章首图", "观点表达", "知识科普", "活动预告", "人物访谈", "行业分析", "情绪封面", "专题封面"],
    layout: ["横版封面", "大标题区域", "左文右图", "中心标题", "上下分区", "视觉焦点", "公众号头图比例", "留白充足"],
    style: ["高级简洁", "商务专业", "知识感", "杂志风", "温暖叙事", "科技蓝", "低饱和", "品牌感"],
    textMode: ["带中文大标题", "带短标题", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["适合文章封面", "标题醒目", "层级清楚", "不抢文字", "干净背景", "专业可信", "传播感"]
  },
  "清单卡片": {
    template: "info",
    structure: ["五点清单", "购物清单", "待办清单", "避坑清单", "推荐清单", "材料清单", "步骤清单", "收藏清单"],
    layout: ["竖版卡片", "清单式布局", "勾选框样式", "卡片分区", "图标加文字", "顶部标题", "多模块内容区", "留白充足"],
    style: ["清新小红书", "极简白底", "可爱手账", "彩色卡片", "柔和渐变", "学习笔记", "现代 UI", "明亮活泼"],
    textMode: ["带清单文字", "带中文大标题", "带标签贴纸文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["清单感强", "信息层级清晰", "适合收藏", "阅读路径明确", "图标统一", "干净背景", "重点突出"]
  },
  "路线地图": {
    template: "guide",
    structure: ["旅行路线", "城市路线", "打卡路线", "一日路线", "三日路线", "交通路线", "地图节点", "时间线规划"],
    layout: ["地图路线风", "路线节点", "时间线", "小红书竖版", "卡片式排版", "图标标注", "顶部大标题", "多模块内容区"],
    style: ["旅行杂志", "清新小红书", "可爱地图", "扁平插画", "彩色信息图", "手账拼贴", "明亮活泼", "极简路线图"],
    textMode: ["带中文大标题", "带编号步骤文字", "带标签贴纸文字", "只生成文字占位", "预留标题区域", "不要文字"],
    detail: ["路线感明显", "节点清楚", "图标丰富", "信息层级清晰", "适合收藏", "地图感", "封面感强"]
  },
  "插画图标": {
    template: "illustration",
    structure: ["单个图标", "图标套图", "3D插画", "扁平插画", "可爱角色", "功能图标", "场景插画", "贴纸元素"],
    layout: ["居中展示", "成套排列", "网格布局", "透明感背景", "圆形构图", "留白充足", "适合头像", "适合 App 图标"],
    style: ["3D可爱", "扁平简洁", "圆润软萌", "玻璃拟态", "彩色渐变", "极简线性", "高级图标", "潮流贴纸"],
    textMode: ["不要文字", "带短标题", "只生成文字占位"],
    detail: ["边缘清晰", "形状统一", "色彩协调", "可识别度高", "干净背景", "细节精致", "适合复用"]
  }
};
const promptFlowFallback = promptFlowPresets["攻略图"];
const promptFlowOptions = { type: promptFlowTypes, ...promptFlowBaseOptions };
const dynamicPromptGroups = ["structure", "layout", "style", "textMode", "detail"];
const promptFlowState = {
  type: "",
  subject: "",
  subjectMode: [],
  structure: [],
  layout: [],
  lens: "",
  aperture: "",
  lighting: [],
  style: [],
  material: [],
  textMode: [],
  detail: [],
  negative: []
};

const fields = {
  apiUrl: $("#apiUrl"), editApiUrl: $("#editApiUrl"), apiKey: $("#apiKey"), rememberKey: $("#rememberKey"),
  model: $("#model"), mode: $("#mode"), aspectPreset: $("#aspectPreset"), size: $("#size"), quality: $("#quality"),
  outputFormat: $("#outputFormat"), responseFormat: $("#responseFormat"), count: $("#count"), prompt: $("#prompt"), avoid: $("#avoid")
};

const els = {
  serverStatus: $("#serverStatus"), serverSubStatus: $("#serverSubStatus"), serviceDot: $("#serviceDot"),
  bottomParamSummary: $("#bottomParamSummary"), drawerBackdrop: $("#drawerBackdrop"), addStyleBtn: $("#addStyleBtn"),
  generateBtn: $("#generateBtn"), saveConfigBtn: $("#saveConfigBtn"), clearPrompt: $("#clearPrompt"), addImageBtn: $("#addImageBtn"), mobileAddImageBtn: $("#mobileAddImageBtn"), imageInput: $("#imageInput"), uploadMeta: $("#uploadMeta"), mobileUploadMeta: $("#mobileUploadMeta"),
  emptyState: $("#emptyState"), generatingState: $("#generatingState"), currentResult: $("#currentResult"), currentGrid: $("#currentGrid"), resultMeta: $("#resultMeta"), errorPanel: $("#errorPanel"), errorMessage: $("#errorMessage"), retryBtn: $("#retryBtn"),
  progressLabel: $("#progressLabel"), progressStep: $("#progressStep"), progressElapsed: $("#progressElapsed"), progressBar: $("#progressBar"),
  galleryGrid: $("#galleryGrid"), galleryBlank: $("#galleryBlank"), gallerySearch: $("#gallerySearch"), galleryFilter: $("#galleryFilter"),
  favoriteGrid: $("#favoriteGrid"), favoriteBlank: $("#favoriteBlank"), historyList: $("#historyList"), historyBlank: $("#historyBlank"), refreshHistoryBtn: $("#refreshHistoryBtn"), clearHistoryBtn: $("#clearHistoryBtn"),
  downloadAllBtn: $("#downloadAllBtn"), reusePromptBtn: $("#reusePromptBtn"), keyStatus: $("#keyStatus"), configStatus: $("#configStatus"), sizeHint: $("#sizeHint"),
  lightbox: $("#lightbox"), lightboxBackdrop: $("#lightboxBackdrop"), lightboxClose: $("#lightboxClose"), lightboxImage: $("#lightboxImage"), lightboxTitle: $("#lightboxTitle"), lightboxMeta: $("#lightboxMeta"), lightboxPrompt: $("#lightboxPrompt"), lightboxOpen: $("#lightboxOpen"), lightboxDownload: $("#lightboxDownload"), lightboxReuse: $("#lightboxReuse"), lightboxPrev: $("#lightboxPrev"), lightboxNext: $("#lightboxNext"),
  mobileMenuBtn: $("#mobileMenuBtn"), composerPlusBtn: $("#composerPlusBtn"), composerExtraPanel: $("#composerExtraPanel"), sidebar: $("#appSidebar"), randomPromptHintBtn: $("#randomPromptHintBtn"), inspirationGrid: $("#inspirationGrid"), refreshInspirationBtn: $("#refreshInspirationBtn"),
  promptAssistant: $("#promptAssistant"), promptFlowReset: $("#promptFlowResetTop"), promptFlowSubject: $("#promptFlowSubject"), promptFlowPreview: $("#promptFlowPreview"), promptFlowApply: $("#promptFlowApply"), promptFlowAppend: $("#promptFlowAppend"), promptFlowPrev: $("#promptFlowPrev"), promptFlowNext: $("#promptFlowNext")
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
let isMobileExtrasOpen = false;
let createState = "empty";
const assistantSections = ["foundation", "scene", "camera", "output"];
let activeAssistantSection = "foundation";
const promptHintPool = [
  "东京三天两夜旅行攻略封面，小红书竖版，顶部大标题区域，地图路线风，清新明亮。",
  "新品护肤品电商主图，极简高级背景，产品居中，柔和棚拍光，真实阴影。",
  "五步教程信息图，卡片式排版，编号步骤文字，图标辅助，信息层级清晰。",
  "咖啡店探店小红书封面，手账拼贴，标签贴纸文字，温暖治愈氛围。",
  "商务科技 PPT 封面背景，16:9 横版，右侧留白，蓝白渐变，专业可信。",
  "城市美食攻略图，分栏信息图，打卡清单，彩色图标，适合收藏。",
  "复古杂志风海报，中心主体，大面积留白，短标题区域，高级胶片色调。",
  "路线地图风旅行攻略，时间线规划，多模块内容区，清新小红书风格。"
];
const inspirationPool = [
  { title: "旅行攻略", sub: "路线地图", prompt: "东京三天两夜旅行攻略图，小红书竖版，地图路线风，打卡清单，多模块内容区，清新明亮。" },
  { title: "探店封面", sub: "小红书", prompt: "咖啡店探店小红书封面，顶部大标题区域，贴纸标签，手账拼贴，温暖治愈氛围。" },
  { title: "教程步骤", sub: "信息图", prompt: "五步教程信息图，卡片式排版，编号步骤文字，图标辅助，信息层级清晰，白底干净。" },
  { title: "产品主图", sub: "电商", prompt: "新品护肤品电商主图，产品居中，极简高级背景，柔和棚拍光，真实材质，干净阴影。" },
  { title: "PPT 封面", sub: "商务科技", prompt: "商务科技 PPT 封面背景，16:9 横版，右侧留白，蓝白渐变，空间感，专业可信。" },
  { title: "美食攻略", sub: "清单卡片", prompt: "城市美食攻略图，清单卡片布局，彩色图标，店铺打卡感，适合收藏，清新小红书风。" },
  { title: "复古海报", sub: "杂志风", prompt: "复古杂志风海报，中心主体，大面积留白，短标题区域，高级胶片色调，设计感强。" },
  { title: "路线地图", sub: "时间线", prompt: "旅行路线地图风信息图，时间线规划，路线节点，图标丰富，层级清楚，封面感强。" },
  { title: "知识卡片", sub: "极简", prompt: "知识卡片信息图，极简排版，中心标题区，三点说明，留白充足，高可读性。" },
  { title: "电商详情", sub: "卖点展示", prompt: "产品详情页配图，卖点展示，左右分栏，材质特写，商业摄影质感，信息层级清晰。" },
  { title: "头像插画", sub: "3D 可爱", prompt: "可爱 3D 头像插画，柔和色彩，干净背景，圆润造型，精致细节。" },
  { title: "活动海报", sub: "强视觉", prompt: "活动宣传海报，强视觉焦点，顶部大标题区域，潮流配色，版式层级清楚。" }
];

function randomizePromptHint() {
  if (!fields.prompt) return;
  const current = fields.prompt.placeholder;
  const candidates = promptHintPool.filter((item) => item !== current);
  const next = candidates[Math.floor(Math.random() * candidates.length)] || promptHintPool[0];
  fields.prompt.placeholder = next;
}
function shuffleList(list) {
  return [...list].sort(() => Math.random() - 0.5);
}
function renderInspirations() {
  if (!els.inspirationGrid) return;
  els.inspirationGrid.innerHTML = "";
  for (const item of shuffleList(inspirationPool).slice(0, 4)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.snippet = item.prompt;
    button.innerHTML = `<strong>${item.title}</strong><span>${item.sub}</span>`;
    button.addEventListener("click", () => appendPromptSnippet(item.prompt));
    els.inspirationGrid.append(button);
  }
}
function isMobileViewport() {
  return window.matchMedia("(max-width: 768px)").matches;
}
function setMobileMenuOpen(open) {
  if (!els.sidebar || !els.mobileMenuBtn) return;
  if (open && !isMobileViewport()) return;
  document.body.classList.toggle("mobile-sidebar-open", open);
  els.sidebar.classList.toggle("mobile-open", open);
  els.mobileMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");
}
function setComposerExtrasOpen(open) {
  if (!els.composerExtraPanel || !els.composerPlusBtn) return;
  if (open && !isMobileViewport()) return;
  isMobileExtrasOpen = open;
  els.composerExtraPanel.classList.toggle("open", open);
  els.composerPlusBtn.classList.toggle("active", open);
  els.composerPlusBtn.setAttribute("aria-expanded", open ? "true" : "false");
}
function toggleComposerExtras(force) {
  const next = typeof force === "boolean" ? force : !isMobileExtrasOpen;
  setComposerExtrasOpen(next);
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function normalizeSelections(list) {
  return [...new Set((list || []).filter(Boolean))];
}
function resolveTextModes() {
  const modes = normalizeSelections(promptFlowState.textMode);
  const noTextIndex = modes.indexOf("不要文字");
  if (noTextIndex >= 0 && modes.length > 1) return [modes[noTextIndex]];
  return modes;
}
function joinPhrase(list, fallback = "") {
  const clean = normalizeSelections(list);
  return clean.length ? clean.join("、") : fallback;
}
function textModeSentence(modes) {
  if (!modes.length) return "";
  if (modes.includes("不要文字")) return "画面中不要生成文字。";
  if (modes.includes("预留标题区域")) return `预留清晰的标题和文字区域${modes.length > 1 ? `，并呈现${modes.filter((m) => m !== "预留标题区域").join("、")}的视觉暗示` : ""}。`;
  if (modes.includes("只生成文字占位")) return "使用文字占位块表现信息层级，不要求真实文字准确。";
  return `画面可包含${modes.join("、")}，文字作为版式元素出现。`;
}
function resolveTextModeSelection(clicked, list) {
  if (!list.includes(clicked)) return list;
  if (clicked === "不要文字") return ["不要文字"];
  return list.filter((item) => item !== "不要文字");
}
function buildNaturalPrompt() {
  const type = promptFlowState.type || "创意图片";
  const preset = promptFlowPresets[promptFlowState.type] || promptFlowFallback;
  const template = preset.template || "general";
  const subject = promptFlowState.subject || "合适的主体内容";
  const subjectMode = joinPhrase(promptFlowState.subjectMode);
  const structure = joinPhrase(promptFlowState.structure);
  const layout = joinPhrase(promptFlowState.layout);
  const style = joinPhrase(promptFlowState.style);
  const detail = joinPhrase(promptFlowState.detail);
  const textModes = resolveTextModes();
  const photo = isPhotographyType();
  const photoParts = [promptFlowState.lens, promptFlowState.aperture, joinPhrase(promptFlowState.lighting), joinPhrase(promptFlowState.material)].filter(Boolean).join("，");
  let sentences = [];
  if (template === "portrait") {
    sentences.push(`一张${type}，以${subject}为核心${structure ? `，呈现${structure}` : ""}${layout ? `，采用${layout}` : ""}。`);
    if (photoParts) sentences.push(`摄影表现使用${photoParts}，画面真实自然。`);
    if (style) sentences.push(`整体风格为${style}。`);
  } else if (template === "product") {
    sentences.push(`一张${type}，围绕${subject}进行展示${structure ? `，重点表现${structure}` : ""}。`);
    if (layout) sentences.push(`画面采用${layout}，主体清晰，适合商业展示。`);
    if (photoParts) sentences.push(`使用${photoParts}，突出真实材质和产品质感。`);
    if (style) sentences.push(`整体视觉为${style}。`);
  } else if (["guide", "info", "tutorial"].includes(template)) {
    sentences.push(`一张${type}，以${subject}为主题${structure ? `，内容围绕${structure}展开` : ""}。`);
    if (layout) sentences.push(`采用${layout}组织画面，让信息结构清楚、阅读路径明确。`);
    if (style) sentences.push(`整体视觉风格为${style}。`);
  } else if (["cover", "poster"].includes(template)) {
    sentences.push(`一张${type}，以${subject}为核心视觉${structure ? `，方向是${structure}` : ""}。`);
    if (layout) sentences.push(`采用${layout}，形成清晰的封面层级和视觉焦点。`);
    if (style) sentences.push(`整体风格为${style}。`);
  } else if (template === "ppt") {
    sentences.push(`一张${type}，围绕${subject}建立专业视觉背景${structure ? `，适合${structure}` : ""}。`);
    if (layout) sentences.push(`采用${layout}，保留足够空间承载后续标题和内容。`);
    if (style) sentences.push(`整体风格为${style}。`);
  } else if (template === "illustration") {
    sentences.push(`一张${type}，以${subject}为核心${structure ? `，表现为${structure}` : ""}。`);
    if (layout) sentences.push(`采用${layout}，造型清楚，适合视觉复用。`);
    if (style) sentences.push(`整体风格为${style}。`);
  } else {
    sentences.push(`一张${type}，以${subject}为主题${subjectMode ? `，主体方式为${subjectMode}` : ""}。`);
    if (structure) sentences.push(`内容结构为${structure}。`);
    if (layout) sentences.push(`画面版式采用${layout}。`);
    if (style) sentences.push(`整体视觉风格为${style}。`);
  }
  const textSentence = textModeSentence(textModes);
  if (textSentence) sentences.push(textSentence);
  if (detail) sentences.push(`细节要求：${detail}。`);
  if (!photo && subjectMode) sentences.splice(1, 0, `主体组织方式为${subjectMode}。`);
  const negative = normalizeSelections(promptFlowState.negative).filter((item) => !(textModes.includes("不要文字") && ["不要乱码文字", "不要错别字"].includes(item)));
  const promptText = sentences.join(" ").replace(/\s+/g, " ").trim();
  return negative.length ? `${promptText}\n约束：${negative.join("，")}` : promptText;
}
function buildPromptFlowText() {
  return buildNaturalPrompt();
}
function optionsForGroup(group) {
  if (group === "type") return promptFlowTypes;
  const preset = promptFlowPresets[promptFlowState.type] || promptFlowFallback;
  if (dynamicPromptGroups.includes(group)) return preset[group] || [];
  return promptFlowBaseOptions[group] || [];
}
function isPhotographyType() {
  return ["人像写真", "产品摄影"].includes(promptFlowState.type);
}
function syncDynamicPromptState() {
  for (const group of dynamicPromptGroups) {
    const allowed = new Set(optionsForGroup(group));
    promptFlowState[group] = (promptFlowState[group] || []).filter((item) => allowed.has(item));
  }
  if (!isPhotographyType()) {
    promptFlowState.lens = "";
    promptFlowState.aperture = "";
    promptFlowState.lighting = [];
    promptFlowState.material = [];
  }
}
function updatePromptFlowVisibility() {
  const photo = isPhotographyType();
  document.querySelectorAll("[data-photo-only]").forEach((el) => { el.hidden = !photo; });
}
function updatePromptFlowPreview() {
  if (!els.promptFlowPreview) return;
  els.promptFlowPreview.value = buildPromptFlowText();
}
function renderPromptFlowGroup(group) {
  const wraps = document.querySelectorAll(`[data-flow-group="${group}"]`);
  if (!wraps.length) return;
  for (const wrap of wraps) {
    const mode = wrap.dataset.flowMode || "multi";
    wrap.innerHTML = "";
    for (const item of optionsForGroup(group)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item;
      const active = Array.isArray(promptFlowState[group]) ? promptFlowState[group].includes(item) : promptFlowState[group] === item;
      btn.classList.toggle("active", active);
      btn.addEventListener("click", () => {
        if (mode === "single") {
          promptFlowState[group] = promptFlowState[group] === item ? "" : item;
        } else {
          const list = Array.isArray(promptFlowState[group]) ? [...promptFlowState[group]] : [];
          const nextList = list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
          promptFlowState[group] = group === "textMode" ? resolveTextModeSelection(item, nextList) : nextList;
        }
        if (group === "type") syncDynamicPromptState();
        renderPromptFlow();
      });
      wrap.append(btn);
    }
  }
}
function renderPromptFlow() {
  document.querySelectorAll("[data-flow-group]").forEach((wrap) => renderPromptFlowGroup(wrap.dataset.flowGroup));
  if (els.promptFlowSubject) els.promptFlowSubject.value = promptFlowState.subject || "";
  updatePromptFlowVisibility();
  updatePromptFlowPreview();
}
function resetPromptFlow() {
  promptFlowState.type = "";
  promptFlowState.subject = "";
  promptFlowState.subjectMode = [];
  promptFlowState.structure = [];
  promptFlowState.layout = [];
  promptFlowState.lens = "";
  promptFlowState.aperture = "";
  promptFlowState.lighting = [];
  promptFlowState.style = [];
  promptFlowState.material = [];
  promptFlowState.textMode = [];
  promptFlowState.detail = [];
  promptFlowState.negative = [];
  renderPromptFlow();
}
function setAssistantSection(section) {
  const target = assistantSections.includes(section) ? section : "foundation";
  activeAssistantSection = target;
  $$(".assistant-section-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.assistantSection === target));
  $$(".assistant-section-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.assistantPanel === target));
  const index = assistantSections.indexOf(target);
  if (els.promptFlowPrev) els.promptFlowPrev.disabled = index <= 0;
  if (els.promptFlowNext) {
    els.promptFlowNext.disabled = index >= assistantSections.length - 1;
    els.promptFlowNext.textContent = index >= assistantSections.length - 1 ? "已到最后" : "下一步";
  }
}
function stepAssistantSection(delta) {
  const index = assistantSections.indexOf(activeAssistantSection);
  const next = Math.max(0, Math.min(assistantSections.length - 1, index + delta));
  setAssistantSection(assistantSections[next]);
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
function normalizePromptText(value) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
function stripAvoidFromPrompt(prompt, avoid) {
  let text = normalizePromptText(prompt);
  const avoidText = normalizePromptText(avoid);
  if (!avoidText) return text;
  const escaped = avoidText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  text = text.replace(new RegExp(`(?:\\n|\\s)*约束[:：]\\s*${escaped}\\s*$`, "u"), "");
  return normalizePromptText(text);
}
function buildPrompt() {
  const avoid = normalizePromptText(fields.avoid.value);
  const prompt = stripAvoidFromPrompt(fields.prompt.value, avoid);
  return avoid ? `${prompt}\n约束：${avoid}`.trim() : prompt;
}
function friendlyErrorMessage(error) {
  const text = String(error?.message || error || "");
  if (/stream disconnected before completion|socket hang up|ECONNRESET|terminated|aborted/i.test(text)) {
    return "上游图片生成中途断流了，请重试一次；如果连续失败，可以先改成 1:1 / medium，或稍后再试。";
  }
  if (/timeout|请求超时|timed out/i.test(text)) {
    return "上游生成超时了，请重试；如果提示词或尺寸较重，建议先用 1:1 / medium 出草稿。";
  }
  return text || "生成失败，请稍后重试。";
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
  setMobileMenuOpen(false);
  document.body.classList.toggle("view-create-active", name === "create");
  document.body.classList.toggle("view-prompt-flow-active", name === "prompt-flow");
  $$(".view").forEach((v) => v.classList.remove("active"));
  $(`#view-${name}`)?.classList.add("active");
  $$(".nav-item[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  if (name === "create") setCreateState(isGenerating ? "generating" : createState);
  if (name === "gallery") renderGallery();
  if (name === "favorites") renderFavorites();
  if (name === "history") renderHistory();
}
function openDrawer(name) {
  setMobileMenuOpen(false);
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
  if (isMobileViewport()) setComposerExtrasOpen(false);
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
  createState = state;
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
  if (els.mobileAddImageBtn) els.mobileAddImageBtn.disabled = loading;
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
  const uploadText = `${selectedImage.name} · ${formatBytes(selectedImage.size)}`;
  if (els.uploadMeta) els.uploadMeta.textContent = uploadText;
  if (els.mobileUploadMeta) els.mobileUploadMeta.textContent = uploadText;
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
    finishProgress(false); els.errorMessage.textContent = friendlyErrorMessage(err); setCreateState("error");
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
els.drawerBackdrop?.addEventListener("click", () => { closeDrawers(); setMobileMenuOpen(false); setComposerExtrasOpen(false); });
$$("[data-snippet]").forEach((b) => b.addEventListener("click", () => appendPromptSnippet(b.dataset.snippet)));
els.addStyleBtn?.addEventListener("click", addCustomStyle);
els.promptFlowReset?.addEventListener("click", resetPromptFlow);
$$(".assistant-section-tab").forEach((btn) => btn.addEventListener("click", () => setAssistantSection(btn.dataset.assistantSection)));
els.promptFlowPrev?.addEventListener("click", () => stepAssistantSection(-1));
els.promptFlowNext?.addEventListener("click", () => stepAssistantSection(1));
els.randomPromptHintBtn?.addEventListener("click", randomizePromptHint);
els.refreshInspirationBtn?.addEventListener("click", renderInspirations);
els.promptFlowSubject?.addEventListener("input", () => { promptFlowState.subject = els.promptFlowSubject.value.trim(); updatePromptFlowPreview(); });
els.promptFlowApply?.addEventListener("click", () => { const text = buildPromptFlowText(); if (!text) return; fields.prompt.value = text; fields.prompt.focus(); });
els.promptFlowAppend?.addEventListener("click", () => { const text = buildPromptFlowText(); if (!text) return; fields.prompt.value = [fields.prompt.value.trim(), text].filter(Boolean).join("\n"); fields.prompt.focus(); });
els.mobileMenuBtn?.addEventListener("click", () => setMobileMenuOpen(!document.body.classList.contains("mobile-sidebar-open")));
els.composerPlusBtn?.addEventListener("click", () => toggleComposerExtras());
Object.values(fields).forEach((el) => el?.addEventListener("input", updateSummaries));
fields.aspectPreset.addEventListener("change", applyAspectPreset);
fields.rememberKey.addEventListener("change", updateSummaries);
els.saveConfigBtn.addEventListener("click", () => saveConfig(false));
els.clearPrompt.addEventListener("click", () => { fields.prompt.value = ""; fields.prompt.focus(); });
els.addImageBtn.addEventListener("click", () => els.imageInput.click());
els.mobileAddImageBtn?.addEventListener("click", () => els.imageInput.click());
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
document.addEventListener("keydown", (e) => {
  if (!els.lightbox.hidden) {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") generateImage();
  if (e.key === "Escape") {
    closeDrawers();
    setMobileMenuOpen(false);
    setComposerExtrasOpen(false);
  }
});
window.addEventListener("resize", () => {
  if (!isMobileViewport()) {
    setMobileMenuOpen(false);
    setComposerExtrasOpen(false);
  }
});

loadConfig(); document.body.classList.add("view-create-active"); document.body.classList.remove("view-prompt-flow-active"); renderPromptFlow(); setAssistantSection("foundation"); randomizePromptHint(); renderInspirations(); renderGallery(); checkServer(); loadGallery(); loadHistory(); setCreateState("empty");
document.documentElement.dataset.appReady = "true";
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker register failed", error));
  });
}
