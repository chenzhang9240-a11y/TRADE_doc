# Excel 导出功能设计

## 概述

为 TRADE_doc 所有 19 个文档页面添加 Excel（.xlsx）导出功能。使用 ExcelJS 库（已通过 CDN 加载），在现有 `excel-export.js` 基础上扩展，新增各文档类型的渲染函数。

**目标效果：** 与各文档预览布局一致——左右分栏信息区、深色表头表格、双语列名、金额格式化、横版 A4 打印设置。

---

## 架构

### 文件结构

```
excel-export.js  ← 现有文件，增量修改
  现有代码：
    - ensureExcelJs()          — CDN 加载
    - 辅助函数 (_excLabel, _excVal, _excCell, _excBox)
    - _renderCommercialInvoice — 已有 CI 实现（但需要重构以匹配预览布局）
    - doExportExcel()          — 主入口 dispatch
  新增代码：
    - 统一渲染框架（标题、分栏信息区、表格渲染器、汇总行、签名区）
    - 19 个文档的列定义配置
    - 19 个文档的渲染函数
```

### 渲染框架（共享）

每个文档的 Excel 渲染由 4 个部分组成：

```
┌──────────────────────────────────────────────┐
│  TITLE  — 中英双语标题                        │
├──────────────────┬───────────────────────────┤
│  信息区 LEFT      │  信息区 RIGHT              │
│  (发货人/卖方等)   │  (单据编号/日期/条款等)    │
├──────────────────┴───────────────────────────┤
│  TABLE  — 商品明细表（深色表头 + 边框）        │
│          — 汇总行（小计/总计/税费）            │
├──────────────────────────────────────────────┤
│  底部  — 声明、签名、备注等                    │
└──────────────────────────────────────────────┘
```

#### 共享辅助函数（在 _excCell/_excBox 基础上扩展）

```javascript
// 在 `excel-export.js` 中已有的辅助函数基础上增加：

// 1. 分栏标签渲染
function _excSectionLabel(ws, row, colStart, colEnd, text, fillColor)
// 渲染区块标题（如 SHIPPER / 发货人），浅色背景

// 2. 分栏信息行
function _excInfoRow(ws, row, leftText, leftCols, rightText, rightCols)
// 左右分栏的一行信息

// 3. 深色表头行（已通过 _excCell 实现，标准化调用）

// 4. 数据行 + autoCalc 对齐
function _excDataRow(ws, row, colDefs, dataItem)
// colDefs 数组定义每列的字段路径、类型(文本/数字/金额)、对齐方式

// 5. 汇总行
function _excTotalRow(ws, row, label, value, colSpan, labelCol, valueCol)

// 6. 签名区（右对齐）
function _excSignatureBlock(ws, row, colStart, colEnd, fields)
```

### 列定义模式

```javascript
var CI_COL_DEFS = [
  { key: '#',              w: 4,  align: 'center' },
  { key: 'MARKS',          w: 16, align: 'center' },
  { key: 'PKGS',           w: 7,  align: 'center' },
  { key: 'PACKING',        w: 9,  align: 'center' },
  { key: 'ORIGIN',         w: 9,  align: 'center' },
  { key: 'DESCRIPTION',    w: 30, align: 'left',   wrap: true },
  { key: 'HS CODE',        w: 10, align: 'center' },
  { key: 'QTY',            w: 7,  align: 'center' },
  { key: 'UNIT',           w: 6,  align: 'center' },
  { key: 'WEIGHT',         w: 8,  align: 'right',  numFmt: '#,##0.00' },
  { key: 'UNIT PRICE',     w: 10, align: 'right',  numFmt: '#,##0.00' },
  { key: 'AMOUNT',         w: 12, align: 'right',  numFmt: '#,##0.00' },
];
```

### 文档分类渲染

按页面分类决定渲染复杂度：

| 类别 | 包含页面 | 渲染策略 |
|------|---------|---------|
| ★ 模板系统 | CI, CQ, CPL, PL, TC | 完整渲染：分栏信息 + 商品表 + 汇总 + 签名 |
| ◆ 独立架构 | BL, SLI | BL: 三栏 party + 运输行 + 商品表 + 底部签发栏<br>SLI: 海运/空运 Tab + 费用明细表 |
| ◇ 简单页面 | CE, COO, PI, IP, CD, IC, FC, BC, CC, IV, PC, SM | 根据数据量选：有商品表用完整渲染，无则简约渲染 |

### ExcelJS 列宽与表头映射

每个文档定义三个关键配置：
1. `XXX_COL_WIDTHS` — 列宽数组
2. `XXX_HEADERS` — 双语表头（`'MARKS\n唛头'` 格式）
3. `XXX_COL_ALIGNS` — 每列对齐方式
4. `XXX_FIELD_MAP` — 数据字段路径到列的映射

---

## 各文档设计

### 1. Commercial Invoice (CI) — 已测试验证

- 12 列表格（#/Marks/Pkgs/Packing/Origin/Description/HS Code/Qty/Unit/Weight/Unit Price/Amount）
- 信息区：Shipper（左）/ Invoice Info（右），Consignee（左）/ Payment（右）
- 底部：签名 + 声明 + Footer

### 2. Commercial Quotation (CQ) — 已测试验证

- 9 列表格（#/Item No/Description/Spec/Qty/Unit/Unit Price/Discount/Line Total）
- 信息区：Seller（左）/ Quotation Info（右），Buyer（左）/ Terms（右）
- 底部：小计/税金/总计 + 条款文字 + 银行信息

### 3. Packing List (PL) — 已测试验证

- 8 列表格（#/Item No/Description/Qty/Unit/Gross Wt/Net Wt/CBM）
- 信息区：Shipper（左）/ Shipment（右），Consignee（左）/ 右侧留空
- 底部：无特殊区域

### 4. Commercial Packing List (CPL)

- CI 风格的分栏 + PL 风格的商品表（PL 的字段更多：包装类型、件数、毛重/净重/体积）
- 与 PL 共享大部分逻辑

### 5. Trade Contract (TC)

- 7 列表格（#/Item No/Description/Qty/Unit/Unit Price/Amount）
- 章节结构：商品描述 + 条款列表（Currency/Payment/Delivery/Ports/Packaging/Insurance/Inspection/Arbitration）
- 信息区：Seller（左）/ Buyer（右），Contract ref 居中

### 6. Bill of Lading (BL) — 已测试验证

- 5 列表格（Marks/Pkgs/Description/Gross Wt/Measurement）
- 三栏 party 区（Shipper/Consignee/Notify Party 上下排列，在左；BL No/Booking No/Carrier 在右）
- 运输信息行（Vessel/Voyage/Ports）
- 集装箱 + 大写件数 + 运费 + 底部签发栏

### 7. Shipper Letter Instruction (SLI)

- 结构最复杂：海运 Tab 和空运 Tab
- 信息区：Shipper/Consignee/Notify Party + 运输细节
- 费用明细表
- **注意：** 数据对象深层嵌套，需单独处理

### 8. Cost Estimation (CE) — 已测试验证

- 10 列成本表（Cost Item/Supplier/Base Price/Qty/Our Cost/Total Cost/Sell Price/Total Sell/Profit/Note）
- 多 Tab（sea/lcl/air/courier/parcel），每个 Tab 内有 section 分组
- 全局汇率行 + 跨模式汇总行
- **注意：** 嵌套最深的数据结构，测试版仅渲染 sea 模式

### 9. 简单页面（COO, PI, IP, CD, IC, FC, BC, CC, IV, PC, SM）

这些页面数据量小、无商品表或只有简单表格：

| 页面 | 渲染方式 |
|------|---------|
| Certificate of Origin | 简约表格：标题 + 产地声明信息 |
| Proforma Invoice | 类似 CI 但精简，有商品表 |
| Insurance Policy | 标题 + 投保信息 + 保险条款 |
| Customs Declaration | 标题 + 报关字段 |
| Inspection Certificate | 标题 + 检验结果 |
| Fumigation Certificate | 标题 + 熏蒸信息 |
| Beneficiary Certificate | 标题 + 受益人声明文字 |
| Currency Converter | 标题 + 汇率表（有数据行） |
| Invoice Number | 标题 + 单行信息 |
| Payment Calculator | 标题 + 付款计算表 |
| Shipping Mark | 标题 + 唛头文字 |

---

## 实施计划

### 阶段 1：重构共享框架（1 次提交）

**目标：** 建立统一的渲染辅助函数集，清洗现有 CI 实现

**涉及文件：** `excel-export.js`

**具体任务：**
1. 添加 `_excSectionLabel()`、`_excInfoRow()`、`_excDataRow()`、`_excTotalRow()`、`_excSignatureBlock()` 辅助函数
2. 标准化列定义对象 `{key, w, align, numFmt, wrap, label, labelCn}`
3. 重构 `_renderCommercialInvoice()` 使用新框架（保持功能不变）
4. 添加 `_renderPlaceholder()` 用于未实现页面的降级提示（替代当前简单 fallback）

**工作量估算：** ~120 行共享代码

### 阶段 2：核心文档（4 次提交，每个文档独立）

**目标：** 批量实现最重要的 5 个文档（优先顺序按使用频率）

| 顺序 | 文档 | 复杂度 | 基准（已有测试代码） |
|------|------|--------|---------------------|
| 1 | Commercial Invoice | ★★☆ | 已有 CI 实现，需重构 |
| 2 | Commercial Quotation | ★★☆ | 测试验证通过 |
| 3 | Packing List | ★☆☆ | 测试验证通过 |
| 4 | Commercial Packing List | ★★☆ | 类似 PL |
| 5 | Trade Contract | ★★★ | 章节结构需特殊处理 |

**每个文档的提交内容：**
- 列定义常量（`COL_WIDTHS`, `HEADERS`, `FIELD_MAP`）
- 渲染函数（`_renderXXX(wb, data)`）
- 在 `doExportExcel()` switch 中添加 case
- 在 `common.js` 中为对应页面添加 `btn-excel` 按钮（如果尚未有）
- 在页面 HTML 中绑定按钮事件

**工作量估算：** 每个文档 40-80 行，总计 ~350 行

### 阶段 3：独立架构文档（2 次提交）

| 顺序 | 文档 | 复杂度 | 特殊处理 |
|------|------|--------|---------|
| 6 | Bill of Lading | ★★★ | 三栏布局 + 容器/大写件数/底部签发 |
| 7 | Shipper Letter Instruction | ★★★★ | 双 Tab + 深层嵌套数据 |

**工作量估算：** BL ~120 行，SLI ~150 行

### 阶段 4：成本估算单（1 次提交）

| 8 | Cost Estimation | ★★★★ | 多 Tab + section 分组 + 跨模式汇总 |

**注意：** CE 数据结构最复杂，预览已有 Tab 切换机制。Excel 导出只渲染 active tab 或所有 Tab。
**建议：** 默认渲染所有模式（sea/lcl/air/courier/parcel）的数据到一个工作表，用 section 分组区分。

**工作量估算：** ~150 行

### 阶段 5：简单页面（1-2 次提交，批量）

| 9-19 | 11 个简单页面 | ★☆☆ | 每个约 20-40 行 |

**工作量估算：** ~300 行

### 阶段 6：按钮接入（1 次提交）

**目标：** 在所有 19 个页面加上 Excel 导出按钮

**涉及文件：** 所有 19 个 HTML 文件 + `common.css`（按钮样式）+ `common.js`（通用按钮处理）

**按钮位置：**
- Preview tab 的 action-bar 中，在「导出 PDF」旁边
- Edit tab 的 action-bar 中（如需要）

**事件绑定模式：**
```javascript
// 每个 HTML 文件
document.getElementById('btn-excel').onclick = function() {
  doExportExcel(DT, data);
};
```

**工作量估算：** 19 个 HTML 文件各加 ~3 行，共 ~60 行

---

## 风险评估

### 风险 1: ExcelJS CDN 加载失败
- **概率：** 低（CDN 稳定，4.4.0 版本已使用多年）
- **影响：** 按钮无响应
- **应对：** `ensureExcelJs()` 已有 catch 处理，弹出错误提示。可添加 retry 逻辑或 fallback CDN 源。

### 风险 2: 大数据量性能问题
- **概率：** 中（某些用户可能有 100+ 行商品数据）
- **影响：** ExcelJS 生成缓慢，浏览器卡顿
- **应对：** 限制行数警告（>100 条提示分批导出）。ExcelJS 本身处理 1000 行以内无压力。

### 风险 3: 特殊字符导致 Excel 文件损坏
- **概率：** 低（ExcelJS 已处理 XML 转义）
- **影响：** 打不开文件
- **应对：** 所有用户数据经 `esc()` 后赋值，字段值不做额外处理。ExcelJS 内部自动转义 XML 特殊字符。

### 风险 4: 合并单元格冲突
- **概率：** 中（手动管理 mergeCells + 行号递增容易出错）
- **影响：** 运行时抛异常，文件生成中断
- **应对：**
  - 所有 mergeCells 使用行号变量（`R`）统一跟踪
  - 每步 `R++` 后立即写入，不跨行操作
  - 渲染函数完成后做一次 `console.log('R='+R)` 状态检查
  - 测试阶段每个文档都生成文件验证

### 风险 5: 已有 CI 实现与新框架不兼容
- **概率：** 低（现有 CI 实现比较独立）
- **影响：** 重构时可能破坏已有功能
- **应对：** 
  - `_renderCommercialInvoice()` 完全重写替换，不修改旧代码（整函数替换）
  - 重构前后对比生成的 Excel 文件验证效果一致

### 风险 6: 各页面数据字段差异大
- **概率：** 确定（SLI 深层嵌套、CE 多 Tab、TC 章节结构）
- **影响：** 共享框架覆盖不全，需要特殊处理
- **应对：**
  - 共享框架覆盖 80% 场景（CI/CQ/PL/CPL/COO/PI 等标准单据）
  - BL/CE/SLI/TC 单独编写渲染函数
  - 列定义 + 字段映射配置化，减少 if/else

### 风险 7: HTML 修改破坏现有功能
- **概率：** 低（仅添加按钮和事件）
- **影响：** 页面加载失败
- **应对：**
  - 只添加新元素和事件，不修改已有逻辑
  - 按钮使用独立 ID（`btn-excel`），不与现有按钮冲突
  - 事件通过 `document.getElementById` 绑定，不存在则静默失败

---

## 回退策略

1. **单个文档问题：** 在 `doExportExcel()` switch 中去掉该文档的 case，降级为未实现提示
2. **框架问题：** 回退到阶段 1 的提交，保留已有 CI 实现
3. **全量回退：** `git revert` 功能分支的合并提交

---

## 测试策略

1. **每个文档单独测试：** 生成 Excel 文件，用 WPS/Excel 打开验证布局
2. **空数据测试：** items 为空数组时，表格显示「No data」行
3. **大文本测试：** 长描述文字自动换行，不截断
4. **多币种测试：** 金额列格式化正确（#,##0.00）
5. **边界测试：** 特殊字符（&, <, >, ", '）、超长字符串

---

## 文件变更清单

| 文件 | 变更类型 | 预估行数 |
|------|---------|---------|
| `excel-export.js` | 扩展 | ~800 行（新增）+ ~100 行（重构） |
| `common.js` | 修改 | ~20 行（通用按钮处理逻辑） |
| `common.css` | 修改 | ~10 行（Excel 导出按钮样式） |
| 19 个 HTML 文件 | 修改 | 每个 ~3 行（按钮 HTML + 事件绑定） |
| `commercial-invoice.html` | 修改 | ~3 行（按钮事件） |
| 其他 18 个 HTML 文件 | 修改 | 每个 ~3 行 |
