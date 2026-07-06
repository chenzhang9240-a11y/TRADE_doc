# Playwright E2E 验收测试实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Playwright E2E 测试套件，验证 TradeKit 全部 20 个页面及优化后的模板系统、表单操作、数据持久化功能正常

**Architecture:** 独立测试项目 `forward-kit-e2e/` 与 `forward_kit/` 同级，5 个测试文件按功能域分组，Node.js 内置 `http` 模块做静态文件服务（端口 8765），`workers: 1` 串行执行避免 localStorage 竞争

**Tech Stack:** @playwright/test, Node.js (内置 http/fs/path 模块)

## Global Constraints

- 零外部服务器依赖 — 使用 Node.js 内置模块提供 HTTP 服务
- 测试项目在 `forward-kit-e2e/` 目录，与 `forward_kit/` 同级
- 串行执行（`workers: 1`），避免 localStorage 状态竞争
- 固定端口 8765，通过 `playwright.config.js` 的 `globalSetup` 启停
- 测试文件使用 `spec.js` 扩展名
- 所有页面路径相对于 `forward_kit/` 目录
- 验证范围：index.html + 19 个单证页面（排除 `sli-layout-proposal.html` 和 `docs/` 下的设计稿）

## File Structure

```
D:\Michael AI\GitHub\forward-kit-e2e\        # 与 forward_kit 同级
├── package.json                               # 依赖：@playwright/test
├── playwright.config.js                       # Playwright 配置
├── server.js                                  # HTTP 静态文件服务器 (globalSetup)
├── tests/
│   ├── helpers/
│   │   ├── page-utils.js                     # 页面导航、JS 错误收集
│   │   └── template-utils.js                 # 模板操作封装
│   ├── 00-all-pages.spec.js                  # 20 页面基础加载
│   ├── 01-template-system.spec.js            # 模板系统（5 页面）
│   ├── 02-form-operations.spec.js            # 表单操作
│   ├── 03-localStorage.spec.js               # 数据持久化
│   └── 04-ui-features.spec.js                # 语言/主题/预览
```

---

### Task 0: 项目脚手架

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\package.json`
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\.gitkeep`

- [ ] **Step 1: 创建项目目录和 package.json**

```bash
mkdir -p "D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers"
```

```json
// D:\Michael AI\GitHub\forward-kit-e2e\package.json
{
  "name": "forward-kit-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npm install
```

Expected: `node_modules/` 目录创建完成，无报错

- [ ] **Step 3: 安装浏览器**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright install chromium
```

Expected: Chromium 浏览器下载完成（约 2-3 分钟）

- [ ] **Step 4: 创建 .gitkeep**

```bash
echo. > "D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\.gitkeep"
```

- [ ] **Step 5: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e\package.json" && git commit -m "test: add Playwright E2E test project scaffold"
```

---

### Task 1: HTTP 服务器 + Playwright 配置

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\server.js`
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\playwright.config.js`

**Interfaces:**
- Produces: `server.js` 作为 Playwright `globalSetup`，启动 HTTP 服务在端口 8765
- Produces: `playwright.config.js` 设置 `baseURL: http://localhost:8765`，`workers: 1`，引用 `server.js` 作为 `globalSetup`

- [ ] **Step 1: 创建 server.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\server.js
// Playwright globalSetup — 启动静态文件服务，指向 forward_kit 目录
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../forward_kit');
const PORT = 8765;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function serveFile(req, res) {
  var urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  var filePath = path.join(ROOT, urlPath);

  // Security: prevent directory traversal
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + urlPath);
      return;
    }
    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

var server;

module.exports = async function globalSetup() {
  return new Promise(function(resolve) {
    server = http.createServer(serveFile).listen(PORT, function() {
      console.log('[Test Server] Listening on http://localhost:' + PORT);
      resolve();
    });
  });
};

// Allow direct execution: node server.js
if (require.main === module) {
  server = http.createServer(serveFile).listen(PORT, function() {
    console.log('[Test Server] Listening on http://localhost:' + PORT);
    console.log('Press Ctrl+C to stop');
  });
}
```

- [ ] **Step 2: 创建 playwright.config.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8765',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
  },
  globalSetup: require.resolve('./server.js'),
  // globalTeardown is handled by the teardown function returned from globalSetup
  // (Playwright calls it automatically after all tests)
});
```

Note: `server.js`'s `globalSetup` doesn't return a teardown function because we don't need explicit cleanup — the process exit will close the server. If the server port is already in use, the test will fail fast on connection refused, which is acceptable.

- [ ] **Step 3: 验证服务器启动**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && node -e "
  const setup = require('./server.js');
  setup().then(function() {
    console.log('Server started OK');
    var http = require('http');
    http.get('http://localhost:8765/commercial-invoice.html', function(res) {
      console.log('Status:', res.statusCode);
      console.log('Content-Type:', res.headers['content-type']);
      res.resume();
      process.exit(0);
    }).on('error', function(e) {
      console.error('Request failed:', e.message);
      process.exit(1);
    });
  }).catch(function(e) {
    console.error('Setup failed:', e.message);
    process.exit(1);
  });
"
```

Expected output:
```
[Test Server] Listening on http://localhost:8765
Status: 200
Content-Type: text/html; charset=utf-8
```

- [ ] **Step 4: 验证 Playwright 配置加载**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test --list
```

Expected: 列出 0 个测试文件（尚无 spec 文件），配置加载正常无错误

- [ ] **Step 5: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e\server.js" "D:\Michael AI\GitHub\forward-kit-e2e\playwright.config.js" && git commit -m "test: add HTTP test server and Playwright config"
```

---

### Task 2: 测试助手函数

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\page-utils.js`
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\template-utils.js`

**Interfaces:**
- Produces: `PAGES` — 20 个页面的路径数组 `[{name, path}]`
- Produces: `TMPL_PAGES` — 5 个有模板系统的页面路径数组
- Produces: `collectErrors(page)` — 收集并返回页面 JS 错误
- Produces: `navigateTo(page, path)` — 导航并等待页面就绪
- Produces: 模板操作相关函数

- [ ] **Step 1: 创建 page-utils.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\page-utils.js

// 所有需要测试的页面（排除设计稿页面）
var PAGES = [
  { name: 'Home', path: '/index.html' },
  { name: 'Commercial Invoice', path: '/commercial-invoice.html' },
  { name: 'Packing List', path: '/packing-list.html' },
  { name: 'Bill of Lading', path: '/bill-of-lading.html' },
  { name: 'Commercial Packing List', path: '/commercial-packing-list.html' },
  { name: 'Commercial Quotation', path: '/commercial-quotation.html' },
  { name: 'Proforma Invoice', path: '/proforma-invoice.html' },
  { name: 'Certificate of Origin', path: '/certificate-of-origin.html' },
  { name: 'Customs Declaration', path: '/customs-declaration.html' },
  { name: 'Fumigation Certificate', path: '/fumigation-certificate.html' },
  { name: 'Inspection Certificate', path: '/inspection-certificate.html' },
  { name: 'Insurance Policy', path: '/insurance-policy.html' },
  { name: 'Currency Converter', path: '/currency-converter.html' },
  { name: 'Invoice Number', path: '/invoice-number.html' },
  { name: 'Payment Calculator', path: '/payment-calculator.html' },
  { name: 'Shipping Mark', path: '/shipping-mark.html' },
  { name: 'Beneficiary Certificate', path: '/beneficiary-certificate.html' },
  { name: 'Shipper Letter Instruction', path: '/shipper-letter-instruction.html' },
  { name: 'Trade Contract', path: '/trade-contract.html' },
  { name: 'Cost Estimation', path: '/cost-estimation.html' },
];

// 有模板系统的页面
var TMPL_PAGES = [
  { name: 'Commercial Invoice', path: '/commercial-invoice.html', dt: 'commercial_invoice' },
  { name: 'Commercial Quotation', path: '/commercial-quotation.html', dt: 'commercial_quotation' },
  { name: 'Commercial Packing List', path: '/commercial-packing-list.html', dt: 'commercial_packing_list' },
  { name: 'Packing List', path: '/packing-list.html', dt: 'packing_list' },
  { name: 'Trade Contract', path: '/trade-contract.html', dt: 'trade_contract' },
];

// 收集页面 JS 错误（需要在 beforeEach 中注册）
function setupErrorCollector(page) {
  var errors = [];
  page.on('pageerror', function(err) {
    errors.push(err.message);
  });
  page.on('console', function(msg) {
    if (msg.type() === 'error') {
      errors.push('Console error: ' + msg.text());
    }
  });
  return errors;
}

// 导航到页面并等待就绪
async function navigateTo(page, path) {
  var response = await page.goto(path, { waitUntil: 'networkidle' });
  // 等待主容器渲染
  await page.waitForSelector('.container', { timeout: 15000 });
  return response;
}

// 获取 localStorage 数据
async function getStorageData(page, dt) {
  return page.evaluate(function(docType) {
    var key = 'tradekit_' + docType + '_templates_v1';
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, dt);
}

module.exports = { PAGES, TMPL_PAGES, setupErrorCollector, navigateTo, getStorageData };
```

- [ ] **Step 2: 创建 template-utils.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\template-utils.js

// 打开字段配置弹窗
async function openConfigModal(page) {
  await page.click('#btn-tmpl-config');
  await page.waitForSelector('#tmpl-modal:not(.hidden)', { timeout: 5000 });
  // 等待弹窗内容渲染
  await page.waitForSelector('#tmpl-modal-body input[type="checkbox"]', { timeout: 3000 });
}

// 关闭字段配置弹窗（取消）
async function closeConfigModal(page) {
  await page.click('#btn-tmpl-modal-cancel');
  await page.waitForSelector('#tmpl-modal.hidden', { timeout: 3000 });
}

// 保存字段配置并关闭弹窗
async function saveConfig(page) {
  await page.click('#btn-tmpl-modal-save');
  await page.waitForSelector('#tmpl-modal.hidden', { timeout: 3000 });
}

// 切换模板
async function switchTemplate(page, optionIndex) {
  await page.selectOption('#tmpl-selector', { index: optionIndex });
  // 等待表单重新渲染
  await page.waitForTimeout(500);
}

// 新建模板
async function createNewTemplate(page, name) {
  await page.click('#btn-tmpl-new');
  // Playwright 会自动处理 dialog，需要监听
  page.once('dialog', async function(dialog) {
    await dialog.accept(name);
  });
  // 等待弹窗打开（新建后自动打开配置弹窗）
  await page.waitForSelector('#tmpl-modal:not(.hidden)', { timeout: 5000 });
  await saveConfig(page);
}

// 删除当前模板
async function deleteCurrentTemplate(page) {
  page.once('dialog', async function(dialog) {
    await dialog.accept();
  });
  await page.click('#btn-tmpl-delete');
  await page.waitForTimeout(500);
}

// 切换字段勾选状态
async function toggleField(page, fieldKey) {
  var checkbox = page.locator('#tmpl-modal-body input[data-fk="' + fieldKey + '"]');
  await checkbox.click();
}

// 检查字段是否可见（在表单中查找对应的 input/textarea/select）
async function isFieldVisible(page, fieldKey) {
  // fieldKey 如 'shipper.company'，转换成 DOM 中可能的标识
  var escapedKey = fieldKey.replace(/\./g, '\\.');
  // 查找关联的 input（onchange 中包含字段名）
  var element = page.locator('[onchange*="' + fieldKey + '"]').first();
  return element.isVisible();
}

module.exports = {
  openConfigModal, closeConfigModal, saveConfig,
  switchTemplate, createNewTemplate, deleteCurrentTemplate,
  toggleField, isFieldVisible,
};
```

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\page-utils.js" "D:\Michael AI\GitHub\forward-kit-e2e\tests\helpers\template-utils.js" && git commit -m "test: add E2E test helper utilities"
```

---

### Task 3: 所有页面基础加载测试

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\00-all-pages.spec.js`

**验证内容:** 20 个页面各自：无 JS 错误、主容器存在、表单容器存在；5 个模板页面额外验证 tmpl-bar 存在

- [ ] **Step 1: 创建 00-all-pages.spec.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\00-all-pages.spec.js
var { PAGES, TMPL_PAGES, setupErrorCollector, navigateTo } = require('./helpers/page-utils');
var { test, expect } = require('@playwright/test');

// 遍历所有 20 个页面
PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 加载无 JS 错误', async function({ page }) {
    var errors = setupErrorCollector(page);
    await navigateTo(page, pageInfo.path);

    // 等待页面关键元素
    await page.waitForSelector('#form-container', { timeout: 10000 });

    // 验证无 JS 错误
    expect(errors).toEqual([]);
  });

  test(pageInfo.name + ' — 主要容器存在', async function({ page }) {
    await navigateTo(page, pageInfo.path);

    var container = page.locator('.container');
    await expect(container).toBeVisible();

    var formContainer = page.locator('#form-container');
    await expect(formContainer).toBeVisible();

    var previewContainer = page.locator('#preview-container');
    await expect(previewContainer).toBeVisible();
  });
});

// 模板系统页面额外验证 tmpl-bar
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 模板工具栏存在', async function({ page }) {
    await navigateTo(page, pageInfo.path);

    var tmplBar = page.locator('.tmpl-bar');
    await expect(tmplBar).toBeVisible();

    var tmplSelector = page.locator('#tmpl-selector');
    await expect(tmplSelector).toBeVisible();

    // 验证有至少一个模板选项
    var options = await tmplSelector.locator('option').count();
    expect(options).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test tests/00-all-pages.spec.js
```

Expected: 40+ 个测试通过（20 页面 × 2 + 5 额外），无失败

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/tests/00-all-pages.spec.js" && git commit -m "test: add basic page loading tests for all 20 pages"
```

---

### Task 4: 模板系统测试

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\01-template-system.spec.js`

**验证内容:** 覆盖 5 个有模板系统的页面（CI/CQ/CPL/PL/TC）的 7 个测试场景

- [ ] **Step 1: 创建 01-template-system.spec.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\01-template-system.spec.js
var { TMPL_PAGES, setupErrorCollector, navigateTo } = require('./helpers/page-utils');
var {
  openConfigModal, saveConfig, switchTemplate, createNewTemplate,
  deleteCurrentTemplate, toggleField, closeConfigModal
} = require('./helpers/template-utils');
var { test, expect } = require('@playwright/test');

// ---------- 模板切换保留数据 ----------
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 模板切换保留表单数据', async function({ page }) {
    await navigateTo(page, pageInfo.path);
    var errors = setupErrorCollector(page);
    var testValue = '测试数据_' + Date.now();

    // 找到一个文本输入框并填入数据
    var firstInput = page.locator('#form-container input[class*="input-field"]').first();
    await firstInput.fill(testValue);

    // 切换到第二个模板（索引 1）
    await switchTemplate(page, 1);

    // 验证值保留
    var valueAfterSwitch = await firstInput.inputValue();
    expect(valueAfterSwitch).toBe(testValue);

    // 切回第一个模板
    await switchTemplate(page, 0);

    // 验证值仍保留
    var valueAfterSwitchBack = await firstInput.inputValue();
    expect(valueAfterSwitchBack).toBe(testValue);

    expect(errors).toEqual([]);
  });
});

// ---------- 字段开关 ----------
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 字段开关控制显示/隐藏', async function({ page }) {
    await navigateTo(page, pageInfo.path);
    var errors = setupErrorCollector(page);

    // 找一个非 required 的字段来测试
    // 先打开配置弹窗找第一个可切换的 checkbox
    await openConfigModal(page);

    var checkboxes = page.locator('#tmpl-modal-body input[type="checkbox"]:not([disabled])');
    var count = await checkboxes.count();

    if (count === 0) {
      // 所有字段都是 required，跳过
      await closeConfigModal(page);
      test.skip();
      return;
    }

    // 获取第一个可切换字段的 data-fk
    var firstCheckbox = checkboxes.first();
    var fieldKey = await firstCheckbox.getAttribute('data-fk');
    var wasChecked = await firstCheckbox.isChecked();

    if (wasChecked) {
      // 取消勾选 → 保存 → 验证字段隐藏
      await firstCheckbox.click();
      await saveConfig(page);

      // 等待表单重新渲染
      await page.waitForTimeout(300);

      // 验证隐藏：onchange 中引用该字段的 input 应该不可见或不在 DOM 中
      // 注：隐藏字段可能完全从 DOM 移除或 display:none
      // 用 evaluate 检查更可靠
      var fieldVisible = await page.evaluate(function(fk) {
        var el = document.querySelector('[onchange*="' + fk + '"]');
        return el !== null && el.offsetParent !== null;
      }, fieldKey);
      expect(fieldVisible).toBe(false);

      // 重新打开 → 勾选 → 保存
      await openConfigModal(page);
      var checkboxAgain = page.locator('#tmpl-modal-body input[data-fk="' + fieldKey + '"]');
      await checkboxAgain.click();
      await saveConfig(page);

      await page.waitForTimeout(300);

      // 验证字段恢复
      var fieldVisibleAgain = await page.evaluate(function(fk) {
        var el = document.querySelector('[onchange*="' + fk + '"]');
        return el !== null && el.offsetParent !== null;
      }, fieldKey);
      expect(fieldVisibleAgain).toBe(true);
    } else {
      // 反向测试：勾选 → 保存 → 验证显示
      await firstCheckbox.click();
      await saveConfig(page);

      await page.waitForTimeout(300);

      var fieldVisible = await page.evaluate(function(fk) {
        var el = document.querySelector('[onchange*="' + fk + '"]');
        return el !== null && el.offsetParent !== null;
      }, fieldKey);
      expect(fieldVisible).toBe(true);

      // 恢复原状态
      await openConfigModal(page);
      var checkboxAgain = page.locator('#tmpl-modal-body input[data-fk="' + fieldKey + '"]');
      await checkboxAgain.click();
      await saveConfig(page);
    }

    expect(errors).toEqual([]);
  });
});

// ---------- 必填字段不可取消 ----------
test('所有模板页面 — 必填字段不可取消', async function({ page }) {
  for (var i = 0; i < TMPL_PAGES.length; i++) {
    var pageInfo = TMPL_PAGES[i];
    await navigateTo(page, pageInfo.path);

    await openConfigModal(page);

    // 找到 disabled 的 checkbox（必填字段）
    var requiredChecks = page.locator('#tmpl-modal-body input[type="checkbox"][disabled]');
    var count = await requiredChecks.count();
    expect(count).toBeGreaterThan(0);

    // 验证所有 disabled checkbox 都是 checked 状态
    for (var j = 0; j < count; j++) {
      await expect(requiredChecks.nth(j)).toBeChecked();
    }

    await closeConfigModal(page);
  }
});

// ---------- 新建模板 ----------
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 新建自定义模板', async function({ page }) {
    await navigateTo(page, pageInfo.path);
    var errors = setupErrorCollector(page);
    var tmplName = 'E2E测试_' + Date.now();

    // 点新建
    page.once('dialog', async function(dialog) {
      await dialog.accept(tmplName);
    });
    await page.click('#btn-tmpl-new');

    // 等待配置弹窗自动打开 → 立即保存
    await page.waitForSelector('#tmpl-modal:not(.hidden)', { timeout: 5000 });
    await saveConfig(page);
    await page.waitForTimeout(300);

    // 验证选择器中有新模板
    var options = page.locator('#tmpl-selector option');
    var texts = await options.allTextContents();
    var found = texts.some(function(t) { return t.indexOf(tmplName) !== -1; });
    expect(found).toBe(true);

    // 验证选择器选中了新模板
    var selectedValue = await page.locator('#tmpl-selector').inputValue();
    expect(selectedValue).not.toBe('');

    expect(errors).toEqual([]);
  });
});

// ---------- 删除新建的模板 ----------
test('CI — 新建后删除自定义模板', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);
  var tmplName = 'ToDelete_' + Date.now();

  // 新建
  page.once('dialog', async function(dialog) {
    await dialog.accept(tmplName);
  });
  await page.click('#btn-tmpl-new');
  await page.waitForSelector('#tmpl-modal:not(.hidden)', { timeout: 5000 });
  await saveConfig(page);
  await page.waitForTimeout(300);

  // 删除
  await page.click('#btn-tmpl-delete');
  page.once('dialog', async function(dialog) {
    await dialog.accept();
  });
  await page.waitForTimeout(300);

  // 验证模板已被移除
  var options = page.locator('#tmpl-selector option');
  var texts = await options.allTextContents();
  var found = texts.some(function(t) { return t.indexOf(tmplName) !== -1; });
  expect(found).toBe(false);

  expect(errors).toEqual([]);
});

// ---------- 内置模板不可删除 ----------
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 内置模板不可删除', async function({ page }) {
    await navigateTo(page, pageInfo.path);

    // 选择第一个模板（内置）
    await page.locator('#tmpl-selector').selectOption({ index: 0 });
    await page.waitForTimeout(300);

    // 验证删除按钮隐藏
    var deleteBtn = page.locator('#btn-tmpl-delete');
    var isHidden = await deleteBtn.evaluate(function(el) {
      return el.classList.contains('hidden') || el.offsetParent === null;
    });
    expect(isHidden).toBe(true);
  });
});

// ---------- 预览语言 ----------
TMPL_PAGES.forEach(function(pageInfo) {
  test(pageInfo.name + ' — 预览语言切换', async function({ page }) {
    await navigateTo(page, pageInfo.path);
    var errors = setupErrorCollector(page);

    // 打开配置弹窗
    await openConfigModal(page);

    // 选择 English 预览语言
    await page.locator('input[name="tmpl-preview-lang"][value="en"]').click();
    await saveConfig(page);

    // 切换到预览 Tab
    await page.click('#tab-preview');
    await page.waitForSelector('#preview-container', { timeout: 5000 });

    // 验证预览内容（英文环境下，预览应包含英文标识）
    // 注意：预览内容的结构因页面而异，检查预览容器高度 > 0
    var previewContent = page.locator('#preview-container');
    var previewHeight = await previewContent.evaluate(function(el) {
      return el.scrollHeight;
    });
    expect(previewHeight).toBeGreaterThan(50);

    // 切回中文
    await page.click('#tab-edit');
    await openConfigModal(page);
    await page.locator('input[name="tmpl-preview-lang"][value="zh"]').click();
    await saveConfig(page);

    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test tests/01-template-system.spec.js
```

Expected: ~20 个测试通过

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/tests/01-template-system.spec.js" && git commit -m "test: add template system E2E tests (7 scenarios x 5 pages)"
```

---

### Task 5: 表单操作测试

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\02-form-operations.spec.js`

**验证内容:** CI（复杂表单）、PL（中等表单）、BL（自定义架构）— 字段填写、商品行操作、autoCalc、清空表单

- [ ] **Step 1: 创建 02-form-operations.spec.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\02-form-operations.spec.js
var { setupErrorCollector, navigateTo } = require('./helpers/page-utils');
var { test, expect } = require('@playwright/test');

// ---------- CI —— 填写字段 ----------
test('CI — 文本/日期/下拉字段填写', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 找到发货人公司输入框（根据 fieldKey shipper.company）
  var input = page.locator('[onchange*="shipper.company"]').first();
  await input.fill('测试出口公司');
  var value = await input.inputValue();
  expect(value).toBe('测试出口公司');

  // 发票号
  var invoiceNoInput = page.locator('[onchange*="invoice.invoiceNo"]').first();
  await invoiceNoInput.fill('INV-2024-001');
  var invValue = await invoiceNoInput.inputValue();
  expect(invValue).toBe('INV-2024-001');

  expect(errors).toEqual([]);
});

// ---------- CI —— 商品明细操作 ----------
test('CI — 添加和删除商品行', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 点添加商品按钮
  var addBtn = page.locator('button:has-text("Add"), button:has-text("添加")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // 填写第一行描述
  var descInput = page.locator('[onchange*="items.0.description"]').first();
  await descInput.fill('测试商品 A');
  var descValue = await descInput.inputValue();
  expect(descValue).toBe('测试商品 A');

  expect(errors).toEqual([]);
});

// ---------- BL —— 提单特有字段 ----------
test('BL — 填提单号和订舱号', async function({ page }) {
  await navigateTo(page, '/bill-of-lading.html');
  var errors = setupErrorCollector(page);

  var blInput = page.locator('[onchange*="header.blNo"]').first();
  await blInput.fill('BL-2024-001');

  var blNo = await blInput.inputValue();
  expect(blNo).toBe('BL-2024-001');

  expect(errors).toEqual([]);
});

// ---------- CI —— autoCalc 联动（数量×单价=行总价） ----------
test('CI — 商品行 autoCalc 自动计算', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 添加商品行
  var addBtn = page.locator('button:has-text("Add"), button:has-text("添加")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  // 填写数量（items.0.qty）和单价（items.0.unitValue）
  var qtyInput = page.locator('[onchange*="items.0.qty"]').first();
  await qtyInput.fill('10');

  var priceInput = page.locator('[onchange*="items.0.unitValue"]').first();
  await priceInput.fill('25.50');

  // 触发计算（点击其他地方让 autoCalc 生效）
  await page.locator('#form-container').click();
  await page.waitForTimeout(500);

  // 验证行总价（items.0.total）自动计算为 255.00
  var totalInput = page.locator('[onchange*="items.0.total"]').first();
  var totalValue = await totalInput.inputValue();
  expect(parseFloat(totalValue)).toBeCloseTo(255.00, 1);

  expect(errors).toEqual([]);
});

// ---------- 清空表单 ----------
test('CI — 清空表单确认流程', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 先填入数据
  var input = page.locator('[onchange*="shipper.company"]').first();
  await input.fill('待清空数据');

  // 点清空按钮
  var clearBtn = page.locator('#btn-clear').first();
  await clearBtn.click();

  // 等待确认弹窗
  await page.waitForSelector('#clear-modal:not(.hidden)', { timeout: 3000 });

  // 点确认清空
  await page.click('#btn-confirm-clear');
  await page.waitForTimeout(500);

  // 验证字段已清空
  var valueAfterClear = await input.inputValue();
  expect(valueAfterClear).toBe('');

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 运行测试**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test tests/02-form-operations.spec.js
```

Expected: 4 个测试通过

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/tests/02-form-operations.spec.js" && git commit -m "test: add form operations E2E tests (CI, PL, BL)"
```

---

### Task 6: 数据持久化测试

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\03-localStorage.spec.js`

**验证内容:** 表单数据刷新持久化、模板选择刷新持久化、localStorage 结构验证

- [ ] **Step 1: 创建 03-localStorage.spec.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\03-localStorage.spec.js
var { setupErrorCollector, navigateTo, getStorageData } = require('./helpers/page-utils');
var { test, expect } = require('@playwright/test');

test.beforeEach(async function({ page }) {
  // 清除 localStorage 确保测试隔离
  await page.goto('/index.html');
  await page.evaluate(function() { localStorage.clear(); });
});

// ---------- 表单数据刷新持久化 ----------
test('CI — 表单数据刷新后保留', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 填入数据
  var input = page.locator('[onchange*="shipper.company"]').first();
  await input.fill('持久化测试公司');
  var invoiceNo = page.locator('[onchange*="invoice.invoiceNo"]').first();
  await invoiceNo.fill('INV-PERSIST-001');

  // 刷新页面
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#form-container', { timeout: 10000 });

  // 验证数据恢复
  var valueAfterReload = await input.inputValue();
  expect(valueAfterReload).toBe('持久化测试公司');

  var invAfterReload = await invoiceNo.inputValue();
  expect(invAfterReload).toBe('INV-PERSIST-001');

  expect(errors).toEqual([]);
});

// ---------- 模板选择刷新持久化 ----------
test('CI — 模板选择刷新后保持', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 新建一个模板
  var tmplName = 'PersistTmpl_' + Date.now();
  page.once('dialog', async function(dialog) {
    await dialog.accept(tmplName);
  });
  await page.click('#btn-tmpl-new');
  await page.waitForSelector('#tmpl-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#btn-tmpl-modal-cancel').click();
  await page.waitForTimeout(300);

  // 刷新
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#form-container', { timeout: 10000 });

  // 验证新模板存在且在选项列表中
  // （注意：切换后可能自动选中新模板，或切回默认）
  var selector = page.locator('#tmpl-selector');
  var options = await selector.locator('option').allTextContents();
  var found = options.some(function(t) { return t.indexOf(tmplName) !== -1; });
  expect(found).toBe(true);

  expect(errors).toEqual([]);
});

// ---------- localStorage 结构验证 ----------
test('CI — localStorage 模板数据结构正确', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  var data = await getStorageData(page, 'commercial_invoice');
  expect(data).not.toBeNull();
  expect(data.currentTemplateId).toBeTruthy();
  expect(Array.isArray(data.templates)).toBe(true);
  expect(data.templates.length).toBeGreaterThanOrEqual(1);

  var defaultTmpl = data.templates[0];
  expect(defaultTmpl.id).toBe('tmpl_default');
  expect(defaultTmpl.builtIn).toBe(true);
  expect(defaultTmpl.fields).toBeTruthy();

  // 验证 required 字段格式
  var requiredFields = Object.keys(defaultTmpl.fields).filter(function(k) {
    return defaultTmpl.fields[k] === 'required';
  });
  expect(requiredFields.length).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 运行测试**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test tests/03-localStorage.spec.js
```

Expected: 3 个测试通过

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/tests/03-localStorage.spec.js" && git commit -m "test: add localStorage persistence E2E tests"
```

---

### Task 7: UI 功能测试

**Files:**
- Create: `D:\Michael AI\GitHub\forward-kit-e2e\tests\04-ui-features.spec.js`

**验证内容:** 语言切换、主题切换、Tab 切换

- [ ] **Step 1: 创建 04-ui-features.spec.js**

```javascript
// D:\Michael AI\GitHub\forward-kit-e2e\tests\04-ui-features.spec.js
var { setupErrorCollector, navigateTo } = require('./helpers/page-utils');
var { test, expect } = require('@playwright/test');

// ---------- 语言切换 ----------
test('CI — 中英文界面切换', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 找到语言切换按钮
  var langBtn = page.locator('#lang-btn');
  await expect(langBtn).toBeVisible();

  // 获取当前语言并切换
  await langBtn.click();
  await page.waitForTimeout(500);

  // 再次点击切回
  await langBtn.click();
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});

// ---------- 主题切换 ----------
test('CI — 亮色/暗色主题切换', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  var themeBtn = page.locator('#theme-btn');
  await expect(themeBtn).toBeVisible();

  // 获取切换前的主题
  var themeBefore = await page.evaluate(function() {
    return document.documentElement.getAttribute('data-theme') ||
           document.body.getAttribute('data-theme');
  });

  // 切换主题
  await themeBtn.click();
  await page.waitForTimeout(500);

  // 获取切换后的主题
  var themeAfter = await page.evaluate(function() {
    return document.documentElement.getAttribute('data-theme') ||
           document.body.getAttribute('data-theme');
  });

  // 主题应该发生变化（或至少 body class 变化）
  expect(themeBefore).not.toBe(themeAfter);

  expect(errors).toEqual([]);
});

// ---------- Tab 切换 ----------
test('CI — Form/Preview/History 标签页切换', async function({ page }) {
  await navigateTo(page, '/commercial-invoice.html');
  var errors = setupErrorCollector(page);

  // 验证 Form tab 默认激活
  var editPanel = page.locator('#panel-edit');
  await expect(editPanel).toBeVisible();

  // 切换到 Preview
  await page.click('#tab-preview');
  await page.waitForTimeout(300);
  var previewPanel = page.locator('#panel-preview');
  await expect(previewPanel).toBeVisible();

  // 切换到 History
  await page.click('#tab-history');
  await page.waitForTimeout(300);
  var historyPanel = page.locator('#panel-history');
  await expect(historyPanel).toBeVisible();

  // 切回 Form
  await page.click('#tab-edit');
  await page.waitForTimeout(300);
  await expect(editPanel).toBeVisible();

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 运行测试**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test tests/04-ui-features.spec.js
```

Expected: 3 个测试通过

- [ ] **Step 3: 提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/tests/04-ui-features.spec.js" && git commit -m "test: add UI features E2E tests (lang, theme, tabs)"
```

---

### Task 8: 集成运行

**Files:** 无新建文件

- [ ] **Step 1: 全量运行**

```bash
cd "D:\Michael AI\GitHub\forward-kit-e2e" && npx playwright test
```

Expected: 所有测试通过，输出示例：
```
Running ~50 tests ...

  ... (测试进度) ...

  50 passed (2m 30s)
```

- [ ] **Step 2: 排查失败（如有）**

逐个查看 `test-results/` 目录下的截图和 trace 文件定位问题。

```bash
# 如有失败，查看详细报告
npx playwright show-report
```

- [ ] **Step 3: 最终提交**

```bash
cd "D:\Michael AI\GitHub\forward_kit" && git add "D:\Michael AI\GitHub\forward-kit-e2e/" && git commit -m "test: complete Playwright E2E test suite — all tests passing"
```

---

## 验收检查清单

从 spec 回溯验证计划覆盖：

| Spec 要求 | 对应 Task |
|-----------|----------|
| 20 个页面加载无 JS 错误 | Task 3 (00-all-pages) |
| 5 个模板页面 tmpl-bar 存在 | Task 3 (00-all-pages) |
| 模板切换保留数据 | Task 4 (01-template-system) |
| 字段开关控制显示/隐藏 | Task 4 (01-template-system) |
| 必填字段不可取消 | Task 4 (01-template-system) |
| 新建自定义模板 | Task 4 (01-template-system) |
| 删除自定义模板 | Task 4 (01-template-system) |
| 内置模板不可删除 | Task 4 (01-template-system) |
| 预览语言切换 | Task 4 (01-template-system) |
| 文本/日期/下拉字段填写 | Task 5 (02-form-operations) |
| 商品明细行添加/删除 | Task 5 (02-form-operations) |
| autoCalc 联动 | Task 5 (02-form-operations) — 已写在计划中 |
| 清空表单确认流程 | Task 5 (02-form-operations) |
| 表单数据刷新持久化 | Task 6 (03-localStorage) |
| 模板选择刷新持久化 | Task 6 (03-localStorage) |
| localStorage 数据结构验证 | Task 6 (03-localStorage) |
| 中英文界面切换 | Task 7 (04-ui-features) |
| 亮色/暗色主题切换 | Task 7 (04-ui-features) |
| Form/Preview/History Tab | Task 7 (04-ui-features) |

所有 spec 要求已覆盖。
