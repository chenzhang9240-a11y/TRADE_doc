# TradeKit (forward_kit) — CLAUDE.md

**任何代码更改前必须检查本文件**，了解项目架构和约定，避免改动破坏整体。

---

## 项目概述

TradeKit 是免费开源的外贸单证生成工具，支持 19 种国际贸易单证，中英双语，A4 横版 PDF 一键导出。

- **线上地址：** http://tradekit.treedeep.cn/
- **技术栈：** 原生 HTML/CSS/JavaScript — **纯前端、无构建工具、无框架、无后端**
- **PDF 导出：** html2pdf.js（CDN 加载）→ `html2pdf.bundle.min.js`
- **数据存储：** 浏览器 `localStorage`，不上传服务器。Key 使用 `getUserId()` 前缀（如 `'user_xxx_'`）
- **许可证：** MIT
- **当前目录：** `c:\Users\chenz\Documents\GitHub\forward_kit`
- **测试项目（同级）：** `forward-kit-e2e/` — Playwright E2E 测试，83 个测试覆盖全量功能

---

## 文件结构

```
forward_kit/
├── index.html                         # 首页（卡片导航，20 个入口）
│
├── commercial-invoice.html      54KB  # ★ 商业发票 — 模板系统参考实现（最完整）
├── trade-contract.html          49KB  # ★ 外贸合同 — 模板系统（自定义实现，与 common.js 不同）
├── commercial-quotation.html    42KB  # ★ 商业报价单 — 模板系统
├── commercial-packing-list.html 37KB  # ★ 详细装箱单 — 模板系统
├── packing-list.html            35KB  # ★ 装箱单 — 模板系统
│
├── bill-of-lading.html          53KB  # ◆ 提单 — 完全独立架构（无模板系统）
├── shipper-letter-instruction.html 53KB # ◆ 发货人委托书
│
├── cost-estimation.html         41KB  #   ◇ 成本估算单
├── certificate-of-origin.html   23KB  #   ◇ 原产地证明
├── proforma-invoice.html        24KB  #   ◇ 形式发票
├── insurance-policy.html        21KB  #   ◇ 保险单
├── customs-declaration.html     21KB  #   ◇ 报关单
├── inspection-certificate.html  21KB  #   ◇ 检验证书
├── fumigation-certificate.html  19KB  #   ◇ 熏蒸证书
├── beneficiary-certificate.html 18KB  #   ◇ 受益人证明
├── currency-converter.html      18KB  #   ◇ 汇率换算
├── invoice-number.html          17KB  #   ◇ 发票编号生成器
├── payment-calculator.html      17KB  #   ◇ 付款条款计算器
├── shipping-mark.html           17KB  #   ◇ 唛头生成器
│
├── common.js                    97KB  # ★ 共享逻辑（核心）
├── common.css                   43KB  # ★ 共享样式
├── excel-export.js              12KB  #   Excel 导出功能
├── html2pdf.bundle.min.js      906KB  #   CDN PDF 生成库
│
├── sli-layout-proposal.html     13KB  #   设计稿（非产品页面）
├── CLAUDE.md                          #   本文件
├── README.md                          #   项目文档
│
├── docs/superpowers/                   #   设计文档和实施计划
└── memory/                             #   项目记忆文件
```

**页面文件大小参考：** 模板系统页面 35-54KB，简单页面 17-24KB

---

## 页面分类

### ★ 模板系统页面（5 个）
| 页面 | DT 值 | 特点 |
|------|-------|------|
| commercial-invoice | `commercial_invoice` | 参考实现，字段最全，**使用 common.js 共享函数** |
| commercial-quotation | `commercial_quotation` | 有 logo section 条件过滤 |
| commercial-packing-list | `commercial_packing_list` | 标准实现 |
| packing-list | `packing_list` | 标准实现 |
| trade-contract | `trade_contract` | **自定义实现** — 与 common.js 行为不同 |

**TC 与标准实现的关键差异：**
- `doSaveTmplFromModal()` **不检查** `builtIn`，可以保存内置模板的字段
- `btn-tmpl-new` 处理函数**不会自动打开**配置弹窗（CI/CQ/CPL/PL 通过 common.js 自动打开）
- 预览语言的 radio 使用内联样式而非 `.tmpl-preview-lang` 类
- `autoCalc` 有独立的 TC 版本（`autoCalcTC()`）

### ◆ 独立架构页面（2 个）
| 页面 | 特点 |
|------|------|
| bill-of-lading | **无模板工具栏**，完全独立的渲染架构 |
| shipper-letter-instruction | 复杂多 Tab 结构（海运/空运），数据对象深层嵌套 |

### ◇ 简单页面（12 个）
这些页面 **没有模板系统**，结构简单：
- 共用的 `init()` 模式：`applyTheme(); var s = loadDocData(DT); data = s ? s : getDefaultDoc(DT); renderAll();`
- 部分页面有数据迁移：`cost-estimation.html`（`migrateData`）、`shipper-letter-instruction.html`（`_sliMigrateData`）
- 表单直接显示所有字段，无 `isFld()` 条件判断
- `UTILITY_TOOLS` = `['invoice_number', 'shipping_mark', 'currency_converter', 'payment_calculator']`

---

## 架构模式：每个页面如何工作

### 常量定义
```javascript
// 每个 HTML 文件在 `<script>` 标签开始处定义
var DT = 'commercial_invoice';        // 文档类型（用于 localStorage key）
var DT_META = DOC_META[DT];          // 文档元数据（标题、颜色、文件名）
```

### 模板系统常量（仅模板页面）
```javascript
var XXX_DEFAULT_FIELDS = {            // 所有字段的默认显示状态
  'shipper.company': 'required',      // 'required' = 必填（不可取消）
  'shipper.address': 'required',
  'shipper.name': true,               // true = 默认显示
  'items.marks': 'required',
  'items.description': 'required',
  'items.qty': true,                 // false = 默认隐藏（较少使用）
};
var XXX_FIELD_META = {                // 字段元数据：标签、所属 section
  'shipper.company': { label: 'Company', labelCn: '公司', section: 'shipper' },
  'invoice.invoiceNo': { label: 'Invoice No.', labelCn: '发票号码', section: 'invoice' },
};
var XXX_TMPL_SECTIONS = ['shipper', 'consignee', 'invoice', 'items', 'totals', 'declaration'];
var XXX_TMPL_SECTION_LABELS = {
  shipper: { en: 'Shipper / Consignee', zh: '发货人 / 收货人' },
  items: { en: 'Goods Description', zh: '商品明细' },
};
```

### init() 函数模式

**标准 init（简单页面）：**
```javascript
function init() {
  applyTheme();
  var saved = loadDocData(DT);
  data = saved ? saved : getDefaultDoc(DT);
  renderAll();
}
```

**模板页面 init（CI）：**
```javascript
function init() {
  applyTheme();
  ensureTmplData(DT, CI_DEFAULT_FIELDS);        // 1. 确保模板数据存在
  migrateTmplData(DT, CI_DEFAULT_FIELDS);        // 2. 数据迁移（新字段补充）
  injectSpaButton();                              // 3. SPA 推广按钮
  injectBottomCta();                              // 4. 底部 CTA
  injectPageFaq();                                // 5. FAQ
  var saved = loadDocData(DT);
  data = saved ? saved : getDefaultDoc(DT);
  renderAll();
  setupTmplEvents();                              // 6. 模板事件绑定
}
```

**带错误捕获的 init（PL/CPL）：**
```javascript
function init() {
  try {
    applyTheme();
    ensureTmplData(DT, XXX_DEFAULT_FIELDS);
    var saved = loadDocData(DT);
    data = saved ? saved : getDefaultDoc(DT);
    migrateTmplData(DT, XXX_DEFAULT_FIELDS);
    renderAll();
  } catch(e) {
    console.error('init error:', e);
    document.getElementById('form-container').innerHTML =
      '<div style="color:red;padding:20px;">Error: ' + esc(e.message) + '</div>';
  }
}
```

### 模板系统辅助函数（每个模板页面都定义）
```javascript
// 状态变量
var lang = getLang();           // 当前语言（'zh'/'en'）
var dark = isDark();            // 当前主题（true/false）
var previewLang = getTmplPreviewLang(DT, XXX_DEFAULT_FIELDS);  // 预览语言
var data = null;                // 表单数据

// 字段可见性辅助
function isFld(key)  { return isFieldVisible(DT, key, XXX_DEFAULT_FIELDS); }
function isFldR(key) { return isFieldRequired(DT, key, XXX_DEFAULT_FIELDS); }
function show(enabled, html) { return enabled ? html : ''; }
```

### renderAll() 渲染链
```javascript
function renderAll() {
  renderTopBar();        // common.js - 顶部导航栏
  renderHeader();        // common.js - 页面标题
  renderTabs();          // common.js - 标签页（Edit/Preview/History）
  if (typeof renderTmplBar === 'function') renderTmplBar();  // 模板工具栏（如存在）
  renderForm();          // 页面内定义 - 表单内容
  renderPreview();       // 页面内定义 - 预览内容
  renderHistory();       // 页面内定义 - 历史记录
  renderClearModal();    // common.js - 清空确认弹窗
}
```

### 模板系统包装函数（4 个 wrapper 调用 common.js 共享函数）
```javascript
function renderTmplBar()     { tmplRenderBar(DT, XXX_DEFAULT_FIELDS); }
function renderTmplModal()   { tmplRenderModal(DT, XXX_FIELD_META, XXX_TMPL_SECTIONS, XXX_TMPL_SECTION_LABELS, XXX_DEFAULT_FIELDS); }
function doSaveTmplFromModal() { tmplSaveFromModal(DT, XXX_DEFAULT_FIELDS); }
function setupTmplEvents()   { tmplSetupEvents(DT, XXX_DEFAULT_FIELDS, { fieldMeta: XXX_FIELD_META, sections: XXX_TMPL_SECTIONS, sectionLabels: XXX_TMPL_SECTION_LABELS }); }
```

**参数化设计：** 每个页面只定义自己的常量（`XXX_DEFAULT_FIELDS`、`XXX_FIELD_META` 等），通过 wrapper 函数传入 common.js 共享函数。新增模板页面只需定义常量和 wrapper，无需复制 common.js 中的模板渲染逻辑。

---

## HTML 结构约定

### 文档页面骨架
```html
<body>
  <!-- Top Bar -->
  <header class="top-bar">
    <div class="top-bar-left">
      <a href="index.html" class="toggle-btn" id="back-btn">
        <span id="back-icon"></span>
        <span id="back-text"></span>
      </a>
    </div>
    <div class="top-bar-right">
      <button class="toggle-btn" id="lang-btn">...</button>
      <button class="toggle-btn" id="theme-btn">...</button>
    </div>
  </header>

  <main class="doc-page">
    <div class="doc-page-content">
      <!-- Header -->
      <div class="doc-header">
        <h1 id="page-title"></h1>
        <p id="page-subtitle"></p>
      </div>
      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn active" id="tab-edit"></button>
        <button class="tab-btn" id="tab-preview"></button>
        <button class="tab-btn" id="tab-history"></button>
      </div>
      <!-- Edit Tab -->
      <div class="tab-panel active" id="panel-edit">
        <div class="action-bar">...</div>
        <!-- 模板工具栏（仅模板页面） -->
        <div class="tmpl-bar">...</div>
        <div id="form-container"></div>
      </div>
      <!-- Preview Tab -->
      <div class="tab-panel" id="panel-preview">
        <div class="action-bar">...</div>
        <div id="preview-container"></div>
      </div>
      <!-- History Tab -->
      <div class="tab-panel" id="panel-history">...</div>
    </div>
  </main>

  <!-- 弹窗 -->
  <div class="clear-modal hidden" id="clear-modal">...</div>
  <div class="clear-modal hidden" id="tmpl-modal">...</div>

  <script src="common.js"></script>
  <script src="excel-export.js"></script>
  <script>
    // 页面专用逻辑
  </script>
  <!-- GoatCounter -->
  <script data-goatcounter="..." async src="//gc.zgo.at/count.js"></script>
</body>
```

### 关键 DOM 节点
| ID/类 | 用途 | 存在 |
|-------|------|------|
| `.top-bar` | 顶部导航栏 | 所有页面 |
| `.doc-page` | 页面主容器（**不是 `.container`**） | 所有文档页面 |
| `.hero` | 首页主区域 | 仅 `index.html` |
| `#features` | 首页功能卡片 | 仅 `index.html` |
| `#form-container` | 表单容器 | 所有文档页面（Edit tab 可见） |
| `#preview-container` | 预览容器 | 所有文档页面（Preview tab 可见） |
| `#tmpl-bar` / `.tmpl-bar` | 模板工具栏 | 仅模板页面 |
| `#tmpl-selector` | 模板下拉选择器 | 仅模板页面 |
| `#clear-modal` | 清空确认弹窗（自定义 HTML modal） | 所有文档页面 |
| `#tmpl-modal` | 字段配置弹窗 | 仅模板页面 |
| `#panel-edit` | Edit tab 面板 | 所有文档页面 |
| `#panel-preview` | Preview tab 面板 | 所有文档页面 |
| `#panel-history` | History tab 面板 | 所有文档页面 |

---

## 数据流

### 表单 → 保存 → 渲染
```
用户输入
  → onchange 事件触发 window._xxxSet('fieldName', this.value)
    → data.fieldName = value
    → saveDocData(DT, data)   → localStorage
    → （可选）renderForm() / renderPreview()  → DOM 更新
```

### 加载 → 恢复
```
页面加载
  → init()
    → loadDocData(DT)         ← localStorage
    → data = saved || getDefaultDoc(DT)
    → renderAll()             → DOM 填充
```

### localStorage Key 模式
```javascript
// 所有 key 都通过 getUserId() 加前缀
function getUserId() {
  let id = localStorage.getItem('invoice_gen_user_id');
  if (!id) {
    id = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('invoice_gen_user_id', id);
  }
  return id;  // 返回类似 'user_xxx_' 的字符串
}
function userKey(key) { return getUserId() + '_' + key; }

// localStorage 中的 key
userKey('doc_data_' + DT)         // 当前表单数据
userKey('doc_snapshots_' + DT)    // 导出历史快照（最多 50 条）
userKey(DT + '_templates_v1')     // 模板配置数据
'app_lang'                        // 语言设置（不带前缀）
'app_theme'                       // 主题设置（不带前缀）
```

---

## 表单渲染模式

### 普通字段
```javascript
// 通过 labelInput/labelInputDate/labelSelect 辅助函数（模板页面专用）
function labelInput(label, value, field, placeholder) {
  return '<div><div class="form-label">' + label + '</div>'
    + '<input class="input-field" value="' + esc(value) + '"'
    + ' onchange="window._ciSet(\'' + field + '\',this.value)"'
    + ' placeholder="' + (placeholder || '') + '"></div>';
}

// 使用 isFld() 控制显示
if (isFld('shipper.company')) {
  html += labelInput('Company', d.shipperCompany, 'shipperCompany', 'Company name');
}
```

### 商品表
```javascript
// 列定义 + 按模板过滤
var visCols = itemCols.filter(function(c) { return isFld(c.key); });
// 渲染表格
visCols.forEach(function(c) {
  if (c.type === 'textarea') {
    html += '<textarea onchange="window._ciItem(' + idx + ',\'' + c.field + '\',this.value)">...</textarea>';
  } else {
    html += '<input onchange="window._ciItem(' + idx + ',\'' + c.field + '\',this.value)">';
  }
});
```

---

## Window 级函数命名惯例

| 函数名 | 文档类型 | 用途 |
|-------|---------|------|
| `_ciSet` / `_ciItem` / `_ciAddItem` / `_ciRemoveItem` | commercial_invoice | 商业发票 |
| `_cqSet` / `_cqItem` / `_cqAddItem` / `_cqRemoveItem` | commercial_quotation | 报价单 |
| `_cplSet` / `_cplItem` / `_cplAddItem` / `_cplRemoveItem` | commercial_packing_list | 详细装箱单 |
| `_plSet` / `_plItem` / `_plAddItem` / `_plRemoveItem` | packing_list | 装箱单 |
| `_tcSet` / `_tcItem` / `_tcAddItem` / `_tcRemoveItem` | trade_contract | 外贸合同 |
| `_blSet` / `_blItem` / `_blAddItem` / `_blRemoveItem` | bill_of_lading | 提单 |
| `_sliMigrateData` / `_sliCalcTotals` | shipper_letter_instruction | 发货人委托书 |

**命名规则：** `_<DT缩写>Set`（普通字段）、`_<DT缩写>Item`（商品行）、`_<DT缩写>AddItem`（添加行）、`_<DT缩写>RemoveItem`（删除行）、`_<DT缩写>Restore`（恢复历史）、`_<DT缩写>DeleteSnap`（删除快照）、`_<DT缩写>ClearAllHistory`（清空历史）、`_<DT缩写>LogoUpload`（Logo 上传）、`_<DT缩写>RemoveLogo`（删除 Logo）。

**重要：** `onchange` 中的函数名和 `data` 中的字段名不一定相同！
- `onchange` 使用 `_ciSet('shipperName', this.value)` — JS 风格 camelCase
- `data.shipperName` — 数据字段名
- 模板 field key 使用 `'shipper.name'` — dot 分隔路径风格
- 映射关系：`'shipper.name'` → `_ciSet('shipperName',...)` → `data.shipperName`

---

## autoCalc 模式

```javascript
// common.js 中的通用 autoCalc 函数
function autoCalcItem(dt, item) {
  switch(dt) {
    case 'commercial_invoice':
      if (item.qty && item.unitValue)
        item.totalValue = (parseFloat(item.qty) * parseFloat(item.unitValue) || 0).toFixed(2);
      break;
    case 'commercial_quotation':
      item.lineTotal = ((parseFloat(item.quantity)||0) * (parseFloat(item.unitPrice)||0) - (parseFloat(item.discount)||0)).toFixed(2);
      break;
    case 'trade_contract':
    case 'proforma_invoice':
      if (item.qty && item.unitPrice)
        item.totalAmount = (parseFloat(item.qty) * parseFloat(item.unitPrice) || 0).toFixed(2);
      break;
    case 'commercial_packing_list':
      item.totalQty = ((parseFloat(item.qtyPerPkg)||0) * (parseFloat(item.numberOfPkgs)||0)).toFixed(0);
      // ...还计算 netWeight/grossWeight/CBM
      break;
  }
}
```

autoCalc 由 `window._xxxItem()` 在设置字段值后自动触发（`autoCalcItem(DT, data.items[idx])`），然后调用 `saveDocData()` 和 `renderForm()` 刷新显示。

---

## 预览渲染模式

预览容器通过 `renderPreview()` 生成最终的打印/PDF 用 HTML：

```javascript
function renderPreview() {
  var d = data;
  var isZhPreview = previewLang === 'zh';  // 使用模板的 previewLang，不是全局 lang
  // 计算汇总值
  var invoiceTotal = d.items.reduce(function(s, it) { return s + (parseFloat(it.totalValue) || 0); }, 0);
  // 生成预览 HTML（使用 show() 控制字段显示）
  var h = '<div class="preview-content">';
  if (show('logo')) { ... }
  // 发货人信息
  if (show('shipper.company') || show('shipper.address')) {
    h += '<div class="info-block">';
    if (show('shipper.company')) h += '<strong>' + esc(d.shipperCompany) + '</strong>';
    // ...
  }
  // 商品表
  if (show('items.description') || show('items.qty')) {
    h += '<table>...</table>';
  }
  document.getElementById('preview-container').innerHTML = h;
}
```

`show()` 辅助函数：`function show(enabled, html) { return enabled ? html : ''; }`
在 preview 中，字段不被 `<div>` 包裹，而是通过条件判断（`show()`）控制整个 HTML 片段的输出。

---

## 模板数据模型

```javascript
// localStorage key: userKey(DT + '_templates_v1')，如 'user_xxx_commercial_invoice_templates_v1'
{
  currentTemplateId: 'tmpl_default',
  previewLang: 'zh',
  templates: [
    {
      id: 'tmpl_default',
      name: '完整版 (默认)',
      builtIn: true,                // 内置模板不可删除、不可改名
      previewLang: 'zh',
      fields: {
        'shipper.company': 'required',  // 必填，不可取消
        'shipper.address': 'required',
        'shipper.name': true,          // 显示
        'items.marks': 'required',
        'items.description': 'required',
        'totals.weight': false,        // 隐藏
      }
    }
  ]
}
```

### common.js 模板系统函数
| 函数 | 用途 |
|------|------|
| `ensureTmplData(dt, defaultFields)` | 确保模板数据存在 |
| `migrateTmplData(dt, defaultFields, customizer)` | 迁移旧模板数据（添加新字段） |
| `getCurrentTmpl(dt, defaultFields)` | 获取当前模板 |
| `setCurrentTmpl(dt, id, defaultFields)` | 设置当前模板 |
| `getTmplPreviewLang(dt, defaultFields)` | 获取模板预览语言 |
| `isFieldVisible(dt, key, defaultFields)` | 判断字段是否可见 |
| `isFieldRequired(dt, key, defaultFields)` | 判断字段是否必填 |
| `saveNewTmpl(dt, name, fields, previewLang, defaultFields)` | 保存新模板 |
| `updateTmpl(dt, id, updates, defaultFields)` | 更新模板（跳过 `builtIn`） |
| `deleteTmpl(dt, id, defaultFields)` | 删除模板（跳过 `builtIn`） |
| `tmplRenderBar(dt, defaultFields)` | 渲染模板工具栏 |
| `tmplRenderModal(dt, fieldMeta, sections, sectionLabels, defaultFields, sectionFilter)` | 渲染配置弹窗 |
| `tmplSaveFromModal(dt, defaultFields)` | 从弹窗保存（跳过 `builtIn`） |
| `tmplSetupEvents(dt, defaultFields, tmplConfig)` | 绑定模板事件 |

---

## 语言 & 主题

### 语言检测优先级
1. `localStorage.getItem('app_lang')` — 用户手动选择
2. `localStorage.getItem('app_geo_lang')` — IP 地理探测结果（异步）
3. `navigator.language` — 浏览器语言

### 语言切换
```javascript
function toggleLang() {
  // 在 common.js 中定义，由 #lang-btn 调用
}
```

### 主题
```javascript
function isDark() { return localStorage.getItem('app_theme') === 'dark'; }
function applyTheme() {
  const dark = isDark();
  document.documentElement.classList.toggle('dark', dark);  // 使用 classList，不是 data-theme
  return dark;
}
```

---

## 编码规范

### 变量声明
- 使用 `var` 声明变量（**不是** `let`/`const`，除了 common.js 中混用了 `const` 给常量）
- 使用 `function` 关键字定义函数（**不是** 箭头函数，除了 common.js 中的回调）

### HTML 转义
```javascript
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```
`esc(str)` 是项目中最常用的辅助函数。**所有插入到 HTML 中的用户数据必须经过 `esc()` 转义。**

### 事件绑定
- 表单元素使用 `onchange` 属性（内联事件）
- 按钮使用 `onclick` 属性（内联事件）
- 全局函数通过 `window._xxxXxx` 暴露
- `init()` 中通过 `document.getElementById('xxx').onclick = function() {...}` 绑定

---

## 图片识别能力

**规则：任何涉及图片、截图、设计稿的场景，必须先调用 `Skill(image-recognition)`。**

### 触发条件（只要满足任一即执行）
- 用户提供了图片路径或 URL
- 用户使用 Read 工具读取了 PNG/JPG/GIF/WebP/BMP 文件
- 用户说"看这张图"、"分析图片"、"识别截图"、"提取文字"、"OCR"、"这是什么"、"帮我看看"、"读取图片"、"图片里写了什么"
- 用户粘贴了剪贴板截图
- 涉及 UI 设计稿分析、网页截图生成代码、PPT 截图、数据截图转表格

### 执行流程
1. 调用 `Skill(image-recognition)` 进行图片分析
2. 如果分析成功 → 基于分析结果生成用户需要的内容
3. 如果分析失败（脚本返回错误、超时、无结果）→ 降级方案见 skill 内嵌的备用 Python 代码
4. 如果降级也失败 → 告知用户具体错误信息

### 模型信息
- 主模型：GLM-4.1V-Thinking-Flash（智谱）
- API Key 在 `"/d/Michael AI/.claude/settings.local.json"`
- 脚本在 `"/d/Michael AI/scripts/"`

---

## 开发工作流

### 分支策略
- **main 分支永远保持稳定**，原始代码不受影响
- 所有新功能在**功能分支**上开发：`git checkout -b feature/<feature-name>`
- 验收通过后合并到 main，验收不通过则删除分支
- 分步提交，每一步可回滚：`git revert <commit-id>`

### 变更原则
- 尽量以"新增"为主，不修改原有稳定逻辑
- 在已有页面中新增功能时，通过条件判断来控制渲染
- 回退时只需删除新增代码，原有功能完全不受影响

### 修改检查清单
1. **了解该页面属于哪个类别**（模板系统 / 独立架构 / 简单页面）
2. **检查 `init()` 模式** — 确保修改与初始化流程一致
3. **检查变量名** — `data` 字段名、`onchange` 函数名、模板 field key 三者是一一映射的
4. **如果修改模板系统** — 确认 TC 是否需要同步更新（TC 有自己的实现）
5. **如果新增页面** — 同步更新 `forward-kit-e2e/tests/helpers/page-utils.js` 中的 `PAGES` 数组
6. **修改后运行测试：**
   ```bash
   cd "C:\Users\chenz\Documents\GitHub\forward-kit-e2e"
   npx playwright test
   ```

---

## 与测试项目的关系

`forward-kit-e2e/` 是同级目录的 Playwright E2E 测试项目，包含 **83 个测试**，覆盖：

| 测试文件 | 覆盖范围 |
|---------|---------|
| `00-all-pages.spec.js` | 20 个页面加载无 JS 错误 + 容器存在性 |
| `01-template-system.spec.js` | 5 个模板页面的模板系统全功能 |
| `02-form-operations.spec.js` | 字段填写/商品行/autoCalc/清空 |
| `03-localStorage.spec.js` | 表单/模板选择持久化 + 数据结构 |
| `04-ui-features.spec.js` | 语言/主题/Tab 切换 |

**每次代码变更后运行测试**，83 个测试约 2 分钟完成。

---

## 常见陷阱

### 1. `esc()` 处理非字符串值
`esc()` 必须处理 `null`/`undefined`/`0`：

### 2. 字段 key 命名不一致
- 模板 field key：`'shipper.company'`（dot 风格）
- `onchange` 函数参数：`'shipperCompany'`（camelCase）
- `data` 对象属性：`data.shipperCompany`（camelCase）
- **两者不同！** 模板 `isFld('shipper.company')` 控制显示，但表单输入用 `_ciSet('shipperCompany', value)`

### 3. 内置模板字段保存保护
`tmplSaveFromModal()` 在 common.js 中跳过 `builtIn: true` 模板的字段保存。这是设计行为，**不是 bug**。

### 4. BL 和 TC 是特例
- BL：完全无模板系统，独立架构
- TC：模板系统但行为与 common.js 不同（无 builtIn 保护、无自动弹窗）
- 对常见模板系统的修改，需要额外测试 TC 是否受影响

### 5. 不同页面的 init() 顺序不同
- 简单页面：`applyTheme()` → `loadDocData()` → `renderAll()`
- CI：`applyTheme()` → `ensureTmplData()` → `migrateTmplData()` → `inject*()` → `loadDocData()` → `renderAll()` → `setupTmplEvents()`
- PL/CPL：用 `try/catch` 包裹，有错误回退

---

## 项目记忆

- [project-patterns.md](memory/project-patterns.md) — 模板系统实现模式、autoCalc、样式标准
- [edit-tool-workarounds.md](memory/edit-tool-workarounds.md) — Edit 工具 UTF-8 处理注意事项
- [project-experience.md](memory/project-experience.md) — 开发经验教训
- [code-review-optimization-lessons.md](memory/code-review-optimization-lessons.md) — 代码审查与优化经验

---

## 决策记录

| 日期 | 决策 |
|------|------|
| 2026-06-23 | 字段配置采用方案 A+C 混合：模板下拉 + 字段配置弹窗 |
| 2026-06-23 | 字段粒度走细粒度，每个字段独立开关 |
| 2026-06-23 | 排版采用方案 A（智能自动布局），不引入布局模板选择 |
| 2026-06-23 | 功能在 `feature/field-template` 分支开发 |
| 2026-07-03 | 建立 `forward-kit-e2e/` E2E 测试项目，83 测试全量回归 |
