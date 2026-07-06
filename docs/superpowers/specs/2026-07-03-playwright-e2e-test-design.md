# Playwright E2E 验收测试设计方案

## 背景

TradeKit（纯前端 HTML/CSS/JavaScript，19 个外贸单证 + index 页面）近期完成了大规模代码优化：

- 7 个共享函数从 19 个 HTML 移至 common.js
- 4 个模板系统函数参数化后移至 common.js（5 个页面使用）
- `esc()` 从 3 种不同实现统一为一种
- localStorage 错误处理增强（空 catch → console.warn + 配额检测）
- `fB` 从 16 个文件移至 common.js

总计 23 个文件变更，净删 ~1400 行代码。**本次重构无自动化测试覆盖**，需建立 Playwright E2E 验收套件验证所有功能正常。

## 目标

- 验证 20 个页面（index + 19 单证）加载无 JS 错误
- 验证模板系统全部功能（字段开关、切换、新建/删除、数据留存）
- 验证表单填写、autoCalc、数据持久化
- 验证语言/主题切换等 UI 功能
- 可在 Windows 下零配置运行（`npm test`）

## 架构

### 项目结构

```
forward-kit-e2e/                  # 独立项目，与 forward_kit/ 同级
├── package.json                  # 依赖：@playwright/test
├── playwright.config.js          # 配置：baseURL、1 worker（串行）
├── server.js                     # Node 内置模块的静态文件服务器
├── tests/
│   ├── helpers/
│   │   ├── page-utils.js         # 页面导航、JS 错误收集、DOM 等待
│   │   └── template-utils.js     # 模板相关操作封装
│   ├── 00-all-pages.spec.js      # 20 页面基础加载
│   ├── 01-template-system.spec.js # 模板系统（5 个页面）
│   ├── 02-form-operations.spec.js # 表单操作（抽样 3 个页面）
│   ├── 03-localStorage.spec.js   # 数据持久化
│   └── 04-ui-features.spec.js    # 语言/主题/预览
```

### 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 项目位置 | 独立目录 | 不污染原项目文件 |
| HTTP 服务 | Node 内置 http 模块 | 零额外依赖，约 15 行代码 |
| 并行策略 | workers: 1（串行） | localStorage 是浏览器全局共享状态 |
| 测试组织 | 按功能域分组 | 最大化复用，精确定位失败 |
| 测试页面范围 | CI/CQ/CPL/PL/TC 模板系统全覆盖 + CI/PL/BL 表单抽样 | 模板系统仅这 5 个页面有，其余页面结构一致无需全覆盖 |

## 详细设计

### server.js — HTTP 静态文件服务器

使用 Node.js 内置 `http` 和 `fs` 模块，零外部依赖。

```javascript
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../forward_kit');
const MIME = { '.html':'text/html','.js':'application/javascript','.css':'text/css' };
const PORT = 8765;
const server = http.createServer((req, res) => {
  var filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});
module.exports = async () => { server.listen(PORT); return () => server.close(); };
```

**固定端口 8765**，避免随机端口带来的文件通信复杂度。`playwright.config.js` 将 `baseURL` 设为 `http://localhost:8765`。

**作为 Playwright globalSetup**: `server.js` 导出异步函数，在全部测试前启动服务，返回的 teardown 函数在全部测试后关闭服务。通过 `playwright.config.js` 的 `globalSetup` 字段引用。

### 测试文件设计

#### 00-all-pages.spec.js — 所有页面基础加载

**覆盖**: index.html + 19 个单证页面

```
每个页面的测试模版：
  beforeEach → 导航到页面
  └─ 验证主题应用（body 有 data-theme 属性）
  └─ 验证语言设置（lang 标签或 UI 文本）
  └─ 验证无 JS 运行时错误
  └─ 验证主容器 .container 存在
  └─ 验证 form-container 存在
  5 个模板页面额外验证：
  └─ 验证 tmpl-bar 存在
  └─ 验证模板选择器有选项
```

**防脆弱设计**: 使用 `page.waitForSelector` 等待关键元素出现，而非固定 timeout。JS 错误通过 `page.on('pageerror')` 收集失败和成功。

#### 01-template-system.spec.js — 模板系统

**覆盖**: CI, CQ, CPL, PL, TC（5 个有模板系统的页面）

**测试场景 1: 模板切换保留数据**

```
1. 导航到页面
2. 在"发货人名称"字段填入"测试公司 ABC"
3. 切换模板选择器到另一个模板
4. 验证字段值仍为"测试公司 ABC"
5. 切回原模板
6. 验证字段值仍为"测试公司 ABC"
```

**测试场景 2: 字段开关**

```
1. 打开字段配置弹窗
2. 记录当前一个可选字段的勾选状态（如 CPL 的 `shipping.shippingMark`）
3. 取消勾选 → 点保存 → 弹窗关闭
4. 验证表单中该字段隐藏
5. 再次打开弹窗 → 重新勾选 → 保存
6. 验证表单中该字段恢复显示
```

**测试场景 3: 必填字段不可取消**

```
1. 打开字段配置弹窗
2. 找到任意 required 字段（checkbox 有 disabled 属性）
3. 验证 checkbox 被 disabled
4. 验证 checkbox 始终 checked
```

**测试场景 4: 新建模板**

```
1. 点 [+新建] 按钮
2. 对话框输入"测试模板 E2E"
3. 验证新模板添加到选择器
4. 验证所有可选字段默认未勾选
5. 验证字段配置弹窗自动打开
```

**测试场景 5: 删除自定义模板**

```
1. 新建一个模板（同上）
2. 切换到该模板
3. 点 [🗑删除] → 确认对话框确认
4. 验证模板从选择器中移除
5. 验证自动切回默认模板
```

**测试场景 6: 内置模板不可删除**

```
1. 切换到"完整版 (默认)"模板
2. 验证删除按钮隐藏或 disabled
3. 验证不存在删除该模板的途径
```

**测试场景 7: 预览语言**

```
1. 打开字段配置弹窗
2. 选择"English"作为预览语言 → 保存
3. 切换到预览 Tab
4. 验证预览文本为英文（如 "INVOICE" 而非 "发票"）
5. 切回中文 → 预览显示中文
```

#### 02-form-operations.spec.js — 表单操作

**覆盖**: 抽样 CI（复杂表单）、PL（中等表单）、BL（自定义模板架构）

**测试场景 1: 字段填写**

```
- 文本字段输入 → 验证值被保存
- 日期字段选择 → 验证值被保存
- 下拉选择 → 验证选项切换
- 多行文本区域 → 验证值被保存
```

**测试场景 2: 商品明细操作**

```
- 添加商品行（点 [+添加] 按钮）
- 填写行数据
- 删除商品行
- 验证至少保留一行
```

**测试场景 3: autoCalc 联动**

仅对支持 autoCalc 的页面（如 CI 的数量×单价=行总价，PL 的自动汇总）

```
1. 添加商品行
2. 填写数量 "10" 和单价 "25.50"
3. 验证行总价自动计算为 "255.00"
```

**测试场景 4: 清空表单**

```
1. 填写一些数据
2. 点清空按钮 → 确认弹窗 → 确认
3. 验证所有字段恢复为空/默认值
```

#### 03-localStorage.spec.js — 数据持久化

**测试场景 1: 表单数据持久化**

```
1. 填写几个字段（如发货人、发票号）
2. 记录填写的值
3. 通过 page.reload() 刷新页面
4. 验证字段值仍为之前填写的内容
```

**测试场景 2: 模板选择持久化**

```
1. 创建一个新模板
2. 切换到该模板
3. 刷新页面
4. 验证模板选择器仍选中该模板
```

**测试场景 3: localStorage 读写**

```
1. 通过 page.evaluate() 直接检查 localStorage
2. 验证 key 格式为 tradekit_<doc_type>_templates_v1
3. 验证数据结构含 currentTemplateId、templates 数组
```

#### 04-ui-features.spec.js — UI 功能

**覆盖**: 任意 1-2 个代表性页面

**测试场景 1: 语言切换**

```
1. 点语言切换按钮（中→英）
2. 验证导航栏文本从"首页"变为"Home"
3. 验证表单标签变为英文
4. 切回中文 → 验证文本恢复
```

**测试场景 2: 主题切换**

```
1. 点主题切换按钮
2. 验证 body 的 data-theme 属性切换
3. 验证 CSS 变量生效（背景色变化）
```

**测试场景 3: Tab 切换**

```
1. 验证 Form 标签页默认激活
2. 切换到 Preview → 验证预览区域可见
3. 切换到 History → 验证历史区域可见
4. 切回 Form → 验证表单可见
```

### playwright.config.js 配置

```javascript
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  workers: 1,           // 串行，避免 localStorage 竞争
  use: {
    baseURL: 'http://localhost:8765',
    headless: true,
  },
  globalSetup: require.resolve('./server.js'),
});
```

### 服务器启动/停止机制

```javascript
// server.js — 既是 globalSetup，也是模块
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../forward_kit');
const MIME = { '.html':'text/html','.js':'application/javascript','.css':'text/css' };
const PORT = 8765;
const server = http.createServer((req, res) => {
  var filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});
module.exports = async () => { server.listen(PORT); return () => server.close(); };
```

Playwright 在测试运行前调用 `globalSetup`（即此导出函数），启动静态文件服务。所有测试完成后调用返回的 teardown 函数关闭服务。测试文件通过 `baseURL` + 页面路径访问：`page.goto('/commercial-invoice.html')`。

## 实施步骤

### 第 1 步：脚手架搭建

1. 创建 `forward-kit-e2e/` 目录
2. 初始化 `package.json`：`npm init -y` + `npm install -D @playwright/test`
3. 实现 `server.js`（HTTP 静态服务器 + globalSetup）
4. 创建 `playwright.config.js`
5. 创建 `tests/helpers/` 目录
6. 验证：`npx playwright test` 无报错

### 第 2 步：Helper 函数

1. `page-utils.js`：
   - `navigateTo(page, docType)` — 导航到指定单证页面并等待加载
   - `collectErrors(page)` — 返回页面 JS 错误数组
   - `waitForPageReady(page)` — 等待表单和预览容器出现
2. `template-utils.js`：
   - `openConfigModal(page)` — 打开字段配置弹窗
   - `toggleField(page, fieldKey)` — 切换字段勾选状态
   - `saveConfig(page)` — 保存配置并关闭弹窗
   - `switchTemplate(page, tmplId)` — 切换模板
   - `createNewTemplate(page, name)` — 创建新模板
   - `deleteCurrentTemplate(page)` — 删除当前模板
   - `getFieldVisibility(page, fieldKey)` — 检查字段是否可见

### 第 3 步：00-all-pages.spec.js

- 实现 20 个页面的基础加载测试
- 注意：`sli-layout-proposal.html` 和 `bl-layout-design.html` 是设计稿，不测试

### 第 4 步：01-template-system.spec.js

- 实现模板系统的 7 个测试场景
- 覆盖 5 个有模板系统的页面

### 第 5 步：02-form-operations.spec.js

- 实现表单操作的 4 个测试场景
- 抽样 CI / PL / BL

### 第 6 步：03-localStorage.spec.js

- 实现数据持久化的 3 个测试场景

### 第 7 步：04-ui-features.spec.js

- 实现 UI 功能的 3 个测试场景

### 第 8 步：集成运行

- 完整运行所有测试：`npx playwright test`
- 验证全部通过
- 添加到项目的 README 或 CI 配置

## 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| 某些页面依赖特定初始数据 | 使用 `beforeEach` 设置已知初始状态 |
| 定时任务/动画导致测试不稳定 | 使用 `waitForSelector` 而非固定 timeout |
| autoCalc 的异步渲染 | await `page.waitForFunction` 检查计算结果 |
| 中文输入法/IME 干扰 | 使用 `page.fill()` 而非 `page.type()` |
| `npx playwright install` 需要下载浏览器 | 在安装脚本中显式执行，约 2-3 分钟 |
| Windows 路径兼容性 | 使用 `path.resolve()` 而非硬编码路径 |

## 验收标准

- [ ] `npm test`（或 `npx playwright test`）所有测试通过
- [ ] 20 个页面均无 JS 运行时错误
- [ ] 5 个模板页面的模板开关、切换、新建/删除均正常
- [ ] 表单填写、autoCalc、数据持久化正确
- [ ] 语言/主题切换功能正常
- [ ] 测试运行在 headless 模式下完成
