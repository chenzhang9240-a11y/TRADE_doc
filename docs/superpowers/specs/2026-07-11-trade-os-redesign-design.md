# Trade OS 首页 + 表单重构 · 开发计划

> 设计文档版本: v1  
> 状态: ready for implementation  
> 分支: eature/trade-os

---

## 1. 概述

### 1.1 目标

将 FormBeacon 项目从当前 Keel 海航蓝风格全面重构为 **Trade OS（琥珀标牌）** 风格，包括：

- **首页全量重写**：SaaS 数据驾驶舱布局（统计 → AI 命令栏 → 最近文档 → 快速操作 → 工具网格）
- **19 个单证页面样式升级**：三栏布局（仅模板页面）+ 全局 UI 组件风格替换
- **AI 生成功能**：关键词路由（v1）+ LLM 智能填表架构（v2）
- **打印方案**：@media print 只打预览区纯单证内容
- **品牌升级**：TRADE_OS v1.0 等宽字体 Logo 系统

### 1.2 不做什么

- 不重写各页面的 
enderForm() / 
enderPreview() 内部渲染逻辑
- 不修改 data 对象结构、onchange 函数名、localStorage key 格式
- 不动 PDF 导出（html2pdf.js）逻辑
- 不动模板系统的核心函数

### 1.3 设计参考

| 页面 | Mockup |
|------|--------|
| 首页 | rainstorm/session-1/trade-os-amber-full.html |
| 表单页 | rainstorm/session-1/trade-os-form-page.html |
| 打印方案 | rainstorm/session-1/trade-os-print.html |
| AI 生成 | rainstorm/session-1/trade-os-ai-gen.html |

---

## 2. 设计系统

### 2.1 色彩体系

| Token | 值 | 用途 |
|-------|-----|------|
| --bg | #FAFAF8 | 页面底色 |
| --card-bg | #FFFFFF | 卡片/表单区背景 |
| --card-border | #EDE8E0 | 卡片边框 |
| --accent | #F59E0B | 主标识色（琥珀） |
| --accent-light | #FFFBEB | 淡琥珀背景（卡片hover、汇总栏） |
| --accent-border | #FEF3C7 | 淡琥珀边框 |
| --accent-dark | #D97706 | 深琥珀（hover/active/汇总数字） |
| --accent-text | #92400E | 琥珀色文字（按钮） |
| --text-primary | #1A1814 | 主文字 |
| --text-secondary | #6B5E4E | 次文字 |
| --text-muted | #8A7A60 | 辅助文字 |
| --text-mono | #B8A88A | 等宽标签色 |
| --border-color | #EDE8E0 | 通用边框 |
| --input-bg | #FDFCF9 | 输入框背景 |
| --focus-ring | 
gba(245,158,11,0.12) | 聚焦环 |

替换 common.css 顶部 :root 中现有 Keel 变量。

### 2.2 字体体系

| 用途 | 字体 | 说明 |
|------|------|------|
| 正文 | Inter, 系统无衬线 | 已有 @import |
| 编号/ID/数值/标签 | JetBrains Mono, Consolas, monospace | 已有 @import |
| Logo | JetBrains Mono, 小写大写, letter-spacing: 0.06em, 琥珀色 | TRADE_OS v1.0 |

通用辅助类: .mono { font-family: 'JetBrains Mono', 'Consolas', monospace; }

### 2.3 // 标签 Convention

所有 section 标题统一使用等宽大写 + // 前缀：

- 首页: // STATS、// RECENT、// ALL TOOLS · 19 DOCUMENTS
- 表单页: // SHIPPER · 发货人、// INVOICE INFO · 发票信息、// ITEMS · 商品明细

CSS:
`css
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-muted);
}
`

---

## 3. 实施步骤

### Step 1: CSS 变量体系替换

**文件:** common.css

**改动:**
1. 替换 :root 中所有 CSS 自定义属性为上文 2.1 色彩体系
2. 删除旧 Keel 变量 (--keel-navy, --brass, --pearl, --steel, --keel-dark)
3. 全局重置: ody { background: var(--bg); font-family: 'Inter', ... }
4. 在文件末尾追加 .mono 辅助类

**不要改动的:**
- 已有 @import 字体声明
- 暗色主题 [data-theme="dark"] 块（后续迭代单独处理）

**验收:**
- 打开任意页面，底色变为 #FAFAF8，无 JS 错误
- 卡片/输入框/按钮颜色符合琥珀体系

---

### Step 2: 全局导航栏重写

**文件:** common.js — 
enderTopBar() 函数

**当前结构:**
`html
<header class="top-bar">
  <div class="top-bar-left">...</div>
  <div class="top-bar-right">...</div>
</header>
`

**新结构 (首页):**
`html
<nav class="global-nav">
  <div class="nav-left">
    <a href="index.html" class="logo">TRADE_OS v1.0</a>
  </div>
  <div class="nav-right">
    <a href="#" class="nav-item">工作台</a>
    <a href="#" class="nav-item">单据</a>
    <a href="#" class="nav-item">工具</a>
    <span class="nav-status">SYS OK</span>
  </div>
</nav>
`

**新结构 (表单页):**
`html
<nav class="global-nav">
  <div class="nav-left">
    <a href="index.html" class="logo">TRADE_OS v1.0</a>
    <div class="breadcrumb">/ <span id="breadcrumb-title"></span></div>
  </div>
  <div class="nav-right">
    <button class="nav-btn" id="lang-btn">语言</button>
    <button class="nav-btn" id="theme-btn">主题</button>
    <button class="nav-btn primary" id="export-pdf-btn" onclick="...">导出 PDF</button>
  </div>
</nav>
`

**关键逻辑:**
- isHomePage: 判断是否为首页（window.location.pathname 包含 index.html 或路径为 /）
- 首页: 显示导航链接 + SYS OK 标签，不显示面包屑
- 表单页: 显示面包屑，面包屑标题从 DOC_META[DT].titleZh 获取，附加英文名
- 语言和主题按钮复用现有 	oggleLang() / 主题切换逻辑
- 
enderHeader() 中现有的 doc-header（h1 + subtitle）保留在表单主内容上方，不移到导航栏

**CSS 新增 (common.css):**
`css
.global-nav {
  background: var(--card-bg);
  border-bottom: 1px solid var(--card-border);
  padding: 0 32px;
  display: flex; align-items: center; justify-content: space-between;
  height: 52px;
  position: sticky; top: 0; z-index: 100;
}
.global-nav .logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem; font-weight: 700; color: var(--accent-dark);
  letter-spacing: 0.06em; text-decoration: none;
}
/* ... 详见 mockup CSS */
`

**注意:** 旧的 .top-bar 相关 CSS 保留（被其他功能引用），新增 .global-nav 不与旧类冲突。

---

### Step 3: 表单全局样式升级

**文件:** common.css

以下样式全局生效，覆盖所有 19 个表单页面的组件外观。

#### 3.1 Tab 栏

`css
.tab-bar {
  display: flex; gap: 4px;
  background: var(--card-bg); border: 1px solid var(--card-border);
  border-radius: 8px; padding: 4px;
}
.tab-btn {
  flex: 1; padding: 9px 16px; border-radius: 6px;
  font-weight: 600; color: var(--text-muted);
  transition: all 0.12s;
}
.tab-btn.active { background: var(--accent-light); color: var(--accent-dark); }
`

#### 3.2 Section 卡片

`css
.form-section, .section-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  padding: 24px 28px;
  margin-bottom: 16px;
}
`

#### 3.3 输入框

`css
input, select, textarea, .input-field {
  padding: 9px 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  background: var(--input-bg);
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus, textarea:focus, .input-field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--focus-ring);
  background: #fff;
  outline: none;
}
`

#### 3.4 商品表

`css
.item-table th {
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase; letter-spacing: 0.05em;
  font-size: 0.62rem; color: var(--text-muted);
}
.item-table input { /* 继承基础输入框样式 */ }
`

#### 3.5 汇总栏

`css
.totals-row {
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
  border-radius: 6px;
  padding: 12px 16px;
  margin-top: 12px;
}
.totals-row .total-value {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent-dark);
  font-weight: 700;
}
`

#### 3.6 按钮

`css
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover { background: var(--accent-dark); }
.btn-outline { border-color: var(--card-border); color: var(--text-secondary); }
`

---

### Step 4: 三栏布局（模板页面专属）

**策略:** 5 个模板页面（CI/CQ/CPL/PL/TC）启用三栏布局。其余 14 个页面保持单栏。

**实现方式:** 在 
enderAll() 或 
enderForm() 调用前注入 wrapper DOM。放在 common.js 的 
enderTabs() 之后。

**三栏结构:**
`
.page-layout
  ├── .sidebar (220px)          ← 左侧 section 导航 + 其他文档链接
  ├── .main-content (flex:1)    ← 现有 #form-container / #preview-container 等
  └── .tmpl-panel (200px)       ← 模板工具栏迁移至此
`

**左侧导航注入逻辑 (common.js 新增函数):**

`javascript
function renderSidebar(dt, fieldMeta, sections, sectionLabels) {
  // 从 fieldMeta 和 sections 构建锚点列表
  // sections 来自各页面的 XXX_TMPL_SECTIONS
  // 点击跳转到对应 section 的 DOM 元素
  var html = '<aside class="sidebar">';
  html += '<div class="sb-section">';
  html += '<div class="sb-title">// SECTIONS</div>';
  sections.forEach(function(s) {
    var label = (sectionLabels[s] && sectionLabels[s].zh) || s;
    html += '<div class="sb-item" onclick="scrollToSection(\'' + s + '\')">';
    html += '<span class="sb-dot"></span>' + label + '</div>';
  });
  html += '</div>';
  html += '<div class="sb-section">';
  html += '<div class="sb-title">// TOOLS</div>';
  // 添加 2-3 个常用文档链接
  html += '</div></aside>';
  return html;
}
`

**模板面板迁移:**
- 将现有的 .tmpl-bar 内容从表单上方移除 → 渲染到 .tmpl-panel 内
- 
enderTmplBar() 的输出改为注入到右侧面板

**CSS (common.css):**
`css
.page-layout { display: flex; gap: 28px; max-width: 1320px; margin: 0 auto; padding: 28px 32px 60px; }
.sidebar { width: 220px; flex-shrink: 0; }
.main-content { flex: 1; min-width: 0; }
.tmpl-panel { width: 200px; flex-shrink: 0; }
`

**响应式 (≤1100px):**
`css
@media (max-width: 1100px) {
  .page-layout { flex-direction: column; }
  .sidebar { width: 100%; display: flex; overflow-x: auto; }
  .tmpl-panel { width: 100%; }
}
`

**非模板页面的判断:**
- 检查 	ypeof renderTmplBar === 'function' 来决定是否注入侧边栏
- 简单页面继续使用现有单栏布局，不受影响

---

### Step 5: 首页全量重写

**文件:** index.html

**当前结构:** 卡片导航 + hero + features → 约 170 行 HTML + 少量 JS

**新结构:** 以下区块，从上到下：

#### 5.1 区块清单

| # | 区块 | DOM ID/Class | 内容来源 |
|---|------|-------------|---------|
| 1 | 全局导航 | .global-nav | common.js 
enderTopBar() |
| 2 | Hero | .hero | i18n 文字 + 实时统计 |
| 3 | AI 命令栏 | #ai-bar | 用户输入 + handleAiCommand() |
| 4 | 统计卡片 | #stats-row | getDashboardStats() |
| 5 | 最近文档 | #recent-panel | getRecentDocuments(6) |
| 6 | 快速操作 | #quick-actions | 固定 4 个链接 |
| 7 | 工具网格 I | #tools-primary | 9 个单据工具 |
| 8 | 工具网格 II | #tools-secondary | 10 个实用工具+认证 |
| 9 | Footer | .page-footer | 固定文案 |

#### 5.2 Hero 区

`html
<div class="hero">
  <div class="hero-left">
    <h1><span class="mono">TRADE_OS</span> · 贸易单证工作台</h1>
    <div class="subtitle" id="hero-subtitle"></div>
  </div>
  <div class="hero-right">
    <div class="quick-stat" id="stat-monthly"></div>
    <div class="quick-stat" id="stat-templates"></div>
  </div>
</div>
`

#### 5.3 AI 命令栏

`html
<div class="ai-bar" id="ai-bar">
  <span class="ai-cursor">&gt;_</span>
  <input class="ai-input" id="ai-input" type="text"
    placeholder="描述你的单证需求... 例如: 生成一份从上海到洛杉矶的海运提单">
  <span class="ai-hint" id="ai-hint">⌅ 生成</span>
</div>
`

JS:
`javascript
var aiInput = document.getElementById('ai-input');
aiInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    handleAiCommand(aiInput.value.trim());
  }
});
`

#### 5.4 统计卡片数据源

common.js 新增函数（也供首页调用）：

`javascript
function getDashboardStats() {
  var uid = getUserId();
  var now = Date.now();
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  var docCount = 0, monthDocCount = 0, templateCount = 0, monthExportCount = 0;

  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf(uid + '_doc_data_') === 0) {
      docCount++;
      try {
        var d = JSON.parse(localStorage.getItem(key));
        if (d._updatedAt > monthStart) monthDocCount++;
      } catch(e) {}
    }
    if (key.indexOf(uid + '_doc_snapshots_') === 0) {
      try {
        var snaps = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(snaps)) {
          snaps.forEach(function(s) {
            if (s._createdAt > monthStart) monthExportCount++;
          });
        }
      } catch(e) {}
    }
    if (key.indexOf('_templates_v1') !== -1) templateCount++;
  }
  return { docCount: docCount, monthDocCount: monthDocCount, templateCount: templateCount, monthExportCount: monthExportCount };
}
`

**注意:** 需要在 saveDocData() 中自动添加 data._updatedAt = Date.now()，向后兼容（旧数据无此字段时返回 0）。

#### 5.5 最近文档

`javascript
function getRecentDocuments(limit) {
  var uid = getUserId();
  var docs = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf(uid + '_doc_data_') === 0) {
      try {
        var d = JSON.parse(localStorage.getItem(key));
        var dt = key.replace(uid + '_doc_data_', '');
        var meta = DOC_META[dt];
        if (meta) {
          docs.push({
            dt: dt,
            page: meta.page,
            title: meta.titleZh,
            titleEn: meta.title,
            updatedAt: d._updatedAt || 0,
            ref: getDocRef(dt, d),
            summary: getDocSummary(dt, d)
          });
        }
      } catch(e) {}
    }
  }
  docs.sort(function(a, b) { return b.updatedAt - a.updatedAt; });
  return docs.slice(0, limit || 6);
}

function getDocSummary(dt, data) {
  // 根据不同文档类型返回简短摘要
  switch(dt) {
    case 'commercial_invoice': return (data.consigneeCompany || '') + ' · ' + (data.currency || 'USD') + ' ' + (data.totalInvoiceValue || '');
    case 'packing_list': return (data.containerNo || '') + ' · ' + (data.totalPkgs || '') + ' CTNS';
    case 'bill_of_lading': return 'Vessel: ' + (data.vessel || '') + ' · POL: ' + (data.portOfLoading || '');
    default: return '';
  }
}
`

#### 5.6 工具网格

工具分组逻辑：

- **组1 (单据生成, 9个):** commercial_invoice, packing_list, bill_of_lading, trade_contract, commercial_quotation, commercial_packing_list, cost_estimation, proforma_invoice, certificate_of_origin
- **组2 (实用工具+认证, 10个):** 其余

每张卡片从 DOC_META 获取标题/颜色/页面链接。等宽 ID 标签映射（如 commercial_invoice → INVOICE）。

#### 5.7 Footer

`html
<footer class="page-footer">
  <div class="footer-left" id="footer-text"></div>
  <div class="footer-right">MIT License · v1.0</div>
</footer>
`

#### 5.8 语言切换

首页的语言切换 (	oggleLang) 只更新 Hero 文字和工具卡片标签，**不需要重新渲染整个页面**（与现有 index.html 行为类似）。

---

### Step 6: 打印方案

**文件:** common.css + common.js

#### 6.1 CSS @media print (追加到 common.css 末尾)

`css
@media print {
  .global-nav, .sidebar, .tmpl-panel, .tab-bar,
  .doc-header, .action-bar, .tmpl-bar,
  #panel-edit, #panel-history,
  .bottom-cta, .page-footer, .faq-section,
  .breadcrumb {
    display: none !important;
  }

  #panel-preview { display: block !important; }
  .doc-page-content { display: block !important; }
  .main-content { max-width: 100% !important; padding: 0 !important; }

  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  #preview-container {
    background: #ffffff !important;
    box-shadow: none !important;
  }

  @page { size: A4 landscape; margin: 10mm; }
}
`

#### 6.2 JS 打印函数 (common.js 新增)

`javascript
function printDoc(dt) {
  if (typeof renderPreview === 'function') renderPreview();
  var tabPreview = document.getElementById('tab-preview');
  if (tabPreview) tabPreview.click();
  setTimeout(function() {
    var oldTitle = document.title;
    document.title = DOC_META[dt].titleZh || 'Document';
    window.print();
    document.title = oldTitle;
  }, 200);
}

function printDocClean(previewHTML, title) {
  var iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
  document.body.appendChild(iframe);
  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (title||'Document') + '</title>' +
    '<style>body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:10mm}' +
    '@page{size:A4 landscape;margin:10mm}' +
    'table{border-collapse:collapse;width:100%}' +
    'th,td{border:1px solid #000;padding:4px 6px;font-size:11px}' +
    '</style></head><body>' + previewHTML + '</body></html>');
  doc.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(function() { document.body.removeChild(iframe); }, 1000);
}
`

#### 6.3 打印按钮入口

在 Preview Tab 的 action bar 中添加打印按钮（各页面已有的打印按钮修改 onclick）：

`html
<button class="btn btn-outline" onclick="printDoc(DT)">打印</button>
`

---

### Step 7: AI 生成功能

#### 7.1 v1 · 关键词路由

**文件:** common.js + index.html

**关键词路由表:**

`javascript
var AI_ROUTES = {
  // 中文
  '发票': 'commercial-invoice.html', '商业发票': 'commercial-invoice.html',
  '装箱单': 'packing-list.html', '详细装箱单': 'commercial-packing-list.html',
  '提单': 'bill-of-lading.html', '海运提单': 'bill-of-lading.html',
  '合同': 'trade-contract.html', '外贸合同': 'trade-contract.html',
  '报价': 'commercial-quotation.html', '报价单': 'commercial-quotation.html',
  '原产地': 'certificate-of-origin.html', '产地证': 'certificate-of-origin.html',
  '保险': 'insurance-policy.html', '报关': 'customs-declaration.html',
  '熏蒸': 'fumigation-certificate.html', '成本': 'cost-estimation.html',
  '检验': 'inspection-certificate.html', '受益人': 'beneficiary-certificate.html',
  '发货人委托': 'shipper-letter-instruction.html',
  '形式发票': 'proforma-invoice.html', '付款': 'payment-calculator.html',
  '汇率': 'currency-converter.html', '唛头': 'shipping-mark.html',
  '编号': 'invoice-number.html',
  // 英文
  'invoice': 'commercial-invoice.html', 'packing list': 'packing-list.html',
  'bill of lading': 'bill-of-lading.html', 'contract': 'trade-contract.html',
  'quotation': 'commercial-quotation.html', 'origin': 'certificate-of-origin.html',
  'insurance': 'insurance-policy.html', 'customs': 'customs-declaration.html',
  'fumigation': 'fumigation-certificate.html', 'beneficiary': 'beneficiary-certificate.html',
  'proforma': 'proforma-invoice.html'
};

function matchKeywordRoute(input) {
  var q = input.toLowerCase();
  for (var key in AI_ROUTES) {
    if (q.indexOf(key) !== -1) return AI_ROUTES[key];
  }
  return null;
}
`

**首页 AI 栏事件:**

`javascript
function handleAiCommand(input) {
  if (!input) return;
  var route = matchKeywordRoute(input);
  if (route) { window.location.href = route; return; }
  // v2 降级或提示
  var config = getAiConfig();
  if (config.apiKey) { handleAiGenerate(input); return; }
  showAiHint('试试: 发票 / 提单 / 装箱单 / 合同...');
}
`

#### 7.2 v2 · LLM 智能填表

**策略:** 用户自带 API Key → 存 localStorage → 浏览器直接 fetch OpenAI 兼容接口。

**API 配置存储 (common.js):**

`javascript
function getAiConfig() {
  try {
    return JSON.parse(localStorage.getItem('ai_config')) || {};
  } catch(e) { return {}; }
}

function saveAiConfig(config) {
  localStorage.setItem('ai_config', JSON.stringify(config));
}
`

**LLM 调用 (common.js):**

`javascript
var AI_SYSTEM_PROMPT = '你是 Trade OS 的 AI 助手。分析用户输入，返回 JSON: ' +
  '{"docType":"commercial_invoice|bill_of_lading|...","confidence":0.95,' +
  '"fields":{"shipperCompany":"...","consigneeCompany":"...","invoiceNo":"...","items":[...]},' +
  '"suggestion":"已为您生成商业发票"}。规则: docType 必须是已知文档类型之一; ' +
  '用户没提的字段留空; currency 默认 USD; 中文输入识别中文公司名。';

function callLLM(userInput) {
  var config = getAiConfig();
  if (!config.apiKey) return Promise.reject(new Error('No API key'));
  return fetch((config.endpoint || 'https://api.openai.com') + '/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.apiKey
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: userInput }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  }).then(function(r) { return r.json(); })
    .then(function(d) { return JSON.parse(d.choices[0].message.content); });
}
`

**首页 AI 栏 — v2 处理:**

`javascript
function handleAiGenerate(input) {
  var bar = document.getElementById('ai-bar');
  var hint = document.getElementById('ai-hint');
  hint.textContent = '分析中...';
  hint.classList.add('loading');

  callLLM(input).then(function(result) {
    hint.classList.remove('loading');
    hint.textContent = '⌅ 生成';
    if (!result.docType || !result.fields) {
      showAiHint('未能理解您的需求，请尝试更具体的描述');
      return;
    }
    var aiData = { fields: result.fields, suggestion: result.suggestion || '', timestamp: Date.now() };
    localStorage.setItem(userKey('ai_prefill_' + result.docType), JSON.stringify(aiData));
    var page = DOC_META[result.docType].page;
    window.location.href = page;
  }).catch(function(err) {
    hint.classList.remove('loading');
    hint.textContent = '⌅ 生成';
    showAiHint('AI 调用失败: ' + (err.message || '未知错误'));
  });
}
`

#### 7.3 目标页面接收 AI 预填

在各页面的 init() 中，loadDocData() 之前插入：

`javascript
var aiPrefill = loadAiPrefill(DT);
if (aiPrefill && !saved) {
  var defaults = getDefaultDoc(DT);
  data = mergeAiFields(defaults, aiPrefill.fields);
  saveDocData(DT, data);
  localStorage.removeItem(userKey('ai_prefill_' + DT));
  showAiSuggestion(aiPrefill.suggestion);
}
`

mergeAiFields(): 将 AI 返回的扁平 fields 对 data 对象的对应属性做浅合并，仅覆盖非空字段。

---

### Step 8: _updatedAt 时间戳

**文件:** common.js — saveDocData()

在 saveDocData() 中追加一行：

`javascript
function saveDocData(dt, data) {
  data._updatedAt = Date.now();  // 新增
  localStorage.setItem(userKey('doc_data_' + dt), JSON.stringify(data));
}
`

向后兼容：已有数据无此字段时，getDashboardStats() 中判断 undefined → 视为 0。

---

### Step 9: 测试适配

**文件:** orward-kit-e2e/tests/

CSS 类名变更可能影响 E2E 测试选择器。需要检查的选择器：

| 旧类名 | 新类名 | 测试文件 |
|--------|--------|---------|
| .top-bar | .global-nav |  0-all-pages.spec.js,  4-ui-features.spec.js |
| .top-bar-left / .top-bar-right | .nav-left / .nav-right | 同上 |
| #lang-btn / #theme-btn | 保持或改为 .nav-btn |  4-ui-features.spec.js |

**策略:** 尽量保留旧的元素 id（#lang-btn, #theme-btn），只在 CSS 中用新 class 改样式。这样测试选择器大部分不变。

---

## 4. 文件改动清单

| 文件 | 改动类型 | 改动量 |
|------|----------|--------|
| common.css | 变量替换 + 全局样式重写 + @media print 追加 | ~400行变更 |
| common.js | 
enderTopBar() 重写 + Dashboard 函数 + AI 路由 + 打印函数 + sidebar 注入 + _updatedAt | ~200行新增 |
| index.html | 全量重写 | ~350行新写 |
| 5 个模板页面 CI/CQ/CPL/PL/TC | 添加三栏 wrapper + 模板面板迁移逻辑 | 每页 ~30行新增 |
| orward-kit-e2e/tests/ | 选择器适配（如果必要） | ~10行变更 |

**不改动的文件:** 其余 14 个简单页面（CSS 全局生效，无需改 HTML）。

---

## 5. 实施顺序与阶段

| 阶段 | 步骤 | 内容 | 依赖 |
|------|------|------|------|
| **Phase 1** | Step 1 | CSS 变量体系替换 | 无 |
| **Phase 1** | Step 2 | 全局导航栏重写 | Step 1 |
| **Phase 1** | Step 3 | 表单全局样式升级 | Step 1 |
| **Phase 2** | Step 4 | 三栏布局（模板页面） | Step 2-3 |
| **Phase 2** | Step 5 | 首页全量重写 | Step 1-2 |
| **Phase 2** | Step 6 | 打印方案 | Step 3 |
| **Phase 2** | Step 8 | _updatedAt 时间戳 | Step 5 |
| **Phase 3** | Step 7 | AI 生成功能 (v1) | Step 5 |
| **Phase 3** | Step 7 | AI 生成功能 (v2) | Step 7 v1 |
| **Phase 4** | Step 9 | E2E 测试适配 + 全量回归 | Step 1-8 |

---

## 6. 风险与缓解

| 风险 | 缓解 |
|------|------|
| CSS 变量替换导致旧页面样式错乱 | 保留旧变量名作 alias: --text-primary: #1A1814; --keel-navy: var(--text-primary); |
| 三栏布局在 TC 页面兼容问题 | TC 已有自定义模板实现，三栏注入前检查 TC 的 layout 标记跳过 |
| E2E 测试大量失败 | 保留所有 id 不变，只改 class；Phase 4 单独一轮测试适配 |
| localStorage 数据统计性能 | 遍历 key 是 O(n)，n=50-200 时可接受；后续 IndexedDB 升级时优化 |

---

## 7. 验收标准

1. 首页展示 Dashboard 布局，包含统计卡片、AI 命令栏、最近文档、工具网格
2. 所有 19 个单证页面表单样式统一为琥珀标牌风格
3. 5 个模板页面显示三栏布局（左侧导航 + 表单 + 右侧面板）
4. 点击打印按钮只打印预览区内容，不含导航/侧边栏
5. 在 AI 栏输入"提单"→ 跳转 bill-of-lading.html
6. orward-kit-e2e/ 中 83 个测试全部通过
7. 所有页面无 JS 错误
