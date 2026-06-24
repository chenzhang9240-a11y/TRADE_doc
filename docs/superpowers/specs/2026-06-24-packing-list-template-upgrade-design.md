# Packing List: 字段模板功能与预览样式升级

## 概述

为 Packing List 页面添加与 Commercial Invoice 相同的字段模板系统，并升级预览样式为统一专业风格。

## 数据模型

### 文档类型标识

```javascript
var DT = 'packing_list';
```

### PL_DEFAULT_FIELDS

```javascript
var PL_DEFAULT_FIELDS = {
  // Shipper
  'shipper.shipperName': 'required',
  'shipper.shipperAddress': 'required',
  'shipper.shipperPhone': true,

  // Consignee
  'consignee.consigneeName': 'required',
  'consignee.consigneeCompany': true,
  'consignee.consigneeAddress': 'required',
  'consignee.consigneePhone': true,

  // Shipping Details
  'shipping.invoiceNo': 'required',
  'shipping.poNo': 'required',
  'shipping.dateOfExport': 'required',
  'shipping.waybillNo': true,
  'shipping.vessel': true,
  'shipping.portOfLoading': true,
  'shipping.portOfDischarge': true,

  // Items
  'items.marks': 'required',
  'items.noOfPkgs': 'required',
  'items.typeOfPackaging': 'required',
  'items.description': 'required',
  'items.qty': true,
  'items.unitOfMeasure': true,
  'items.netWeight': 'required',
  'items.grossWeight': 'required',
  'items.measurement': 'required',

  // Totals
  'totals.totalPkgs': 'required',
  'totals.totalNetWeight': 'required',
  'totals.totalGrossWeight': 'required',
  'totals.totalMeasurement': 'required',

  // Remarks & Signature
  'remarks.text': true,
  'signature.name': true,
  'signature.title': true,
  'signature.date': true
};
```

### PL_FIELD_META

字段分组和标签定义，用于字段配置弹窗的渲染。

```javascript
var PL_FIELD_META = {
  'shipper.shipperName':     { label: 'Shipper Name', labelCn: '发货人名称', section: 'shipper' },
  'shipper.shipperAddress':  { label: 'Shipper Address', labelCn: '发货人地址', section: 'shipper' },
  'shipper.shipperPhone':    { label: 'Shipper Phone', labelCn: '发货人电话', section: 'shipper' },

  'consignee.consigneeName':    { label: 'Consignee Name', labelCn: '收货人名称', section: 'consignee' },
  'consignee.consigneeCompany': { label: 'Consignee Company', labelCn: '收货人公司', section: 'consignee' },
  'consignee.consigneeAddress': { label: 'Consignee Address', labelCn: '收货人地址', section: 'consignee' },
  'consignee.consigneePhone':   { label: 'Consignee Phone', labelCn: '收货人电话', section: 'consignee' },

  'shipping.invoiceNo':       { label: 'Invoice No.', labelCn: '发票号', section: 'shipping' },
  'shipping.poNo':            { label: 'PO / Reference No.', labelCn: '订单号', section: 'shipping' },
  'shipping.dateOfExport':    { label: 'Date of Export', labelCn: '出口日期', section: 'shipping' },
  'shipping.waybillNo':       { label: 'Waybill No.', labelCn: '运单号', section: 'shipping' },
  'shipping.vessel':          { label: 'Vessel', labelCn: '船名', section: 'shipping' },
  'shipping.portOfLoading':   { label: 'Port of Loading', labelCn: '装货港', section: 'shipping' },
  'shipping.portOfDischarge': { label: 'Port of Discharge', labelCn: '卸货港', section: 'shipping' },

  'items.marks':            { label: 'MARKS', labelCn: '唛头', section: 'items' },
  'items.noOfPkgs':         { label: 'NO. OF PKGS', labelCn: '件数', section: 'items' },
  'items.typeOfPackaging':  { label: 'PACKAGING', labelCn: '包装类型', section: 'items' },
  'items.description':      { label: 'DESCRIPTION', labelCn: '描述', section: 'items' },
  'items.qty':              { label: 'QTY', labelCn: '数量', section: 'items' },
  'items.unitOfMeasure':    { label: 'UNIT', labelCn: '单位', section: 'items' },
  'items.netWeight':        { label: 'N.W.(KG)', labelCn: '净重', section: 'items' },
  'items.grossWeight':      { label: 'G.W.(KG)', labelCn: '毛重', section: 'items' },
  'items.measurement':      { label: 'MEAS.(CBM)', labelCn: '体积', section: 'items' },

  'totals.totalPkgs':         { label: 'Total Packages', labelCn: '总件数', section: 'totals' },
  'totals.totalNetWeight':    { label: 'Total Net Weight', labelCn: '总净重', section: 'totals' },
  'totals.totalGrossWeight':  { label: 'Total Gross Weight', labelCn: '总毛重', section: 'totals' },
  'totals.totalMeasurement':  { label: 'Total Measurement', labelCn: '总体积', section: 'totals' },

  'remarks.text': { label: 'Remarks', labelCn: '备注', section: 'remarks' },

  'signature.name':  { label: 'Signature Name', labelCn: '签名', section: 'signature' },
  'signature.title': { label: 'Title', labelCn: '职务', section: 'signature' },
  'signature.date':  { label: 'Date', labelCn: '日期', section: 'signature' }
};
```

Section 显示顺序：`['shipper', 'consignee', 'shipping', 'items', 'totals', 'remarks', 'signature']`

### 模板数据存储

复用 `common.js` 中的共享基础设施：

- 存储键：`packing_list_templates_v1`（通过 `getTmplKey('packing_list')`）
- 初始化：`ensureTmplData(DT, PL_DEFAULT_FIELDS)`
- 存取函数：`loadTmplData()` / `saveTmplData()`
- 模板 CRUD：`getCurrentTmpl()` / `saveNewTmpl()` / `updateTmpl()` / `deleteTmpl()`
- 字段可见性：`isFieldVisible()` / `isFieldRequired()` / `isFieldChecked()`

### isFld 包装函数

在 packing-list.html 中添加：

```javascript
function isFld(key) { return isFieldVisible(DT, key, PL_DEFAULT_FIELDS); }
function isFldR(key) { return isFieldRequired(DT, key, PL_DEFAULT_FIELDS); }
```

## 功能架构

### 模板工具栏（Template Toolbar）

在表单上方新增常驻工具栏，HTML 结构（与 CI 完全一致）：

```
[⚙ 字段配置] │ 模板: [下拉选择器 ▼] [💾保存] [+新建] [🗑删除]
```

- `renderTmplBar()` — 填充工具栏文本、模板下拉列表、切换删除按钮显隐
- 删除按钮仅自定义模板（`builtIn: false`）时显示

### 字段配置弹窗（Field Config Modal）

点击 ⚙ 按钮弹出模态框：

- 按 section 分组展示所有字段
- 必填字段显示 `required`（checkbox 勾选 + disabled + 红色星标）
- 可选字段 checkbox 控制 true/false
- 底部预览语言选择（中/英）
- 保存按钮 → 调用 `updateTmpl()` 或 `saveNewTmpl()`

### 表单改造（renderForm）

- 工具栏渲染：表单顶部加入 `renderTmplBar()`
- 货品表格的列定义改为 `itemCols` 数组，每项包含 `key`（对应字段键）和 `field`（对应 data 属性）
- 表头和输入列通过 `visCols = itemCols.filter(function(c) { return isFld(c.key); })` 动态渲染
- 添加/删除行逻辑不变，仅渲染可见列

### 预览改造（renderPreview）

预览区域使用 `class="invoice-preview"`（与 CI 共享样式）。布局如下：

**1. Header** — `COMMERCIAL INVOICE` 风格的居中粗体标题，双线边框

```html
<div class="title">PACKING LIST</div>
```

**2. Shipper / Consignee** — flex two-col + address-block 样式

```html
<div class="two-col">
  <div class="address-block"><!-- shipper --></div>
  <div class="address-block"><!-- consignee --></div>
</div>
```

- 左侧：Shipper 信息（名称、地址、电话，由模板控制显隐）
- 右侧：Consignee 信息（名称、公司、地址、电话，由模板控制显隐）

**3. Shipping Details** — 双列 field-row 布局

左列：invoiceNo, poNo, dateOfExport, waybillNo
右列：vessel, portOfLoading, portOfDischarge

每行格式：`<span class="field-label">Label:</span> <span class="field-value">value</span>`

**4. Items Table** — 动态列表格

- 列定义 `itemCols` 包含 9 列，每列有 `key`（字段键）、`label`、`width`、`field`（data 属性名）
- `visCols` 过滤后只渲染可见列
- 列宽建议：MARKS 12%, NO.PKGS 8%, PACKAGING 10%, DESCRIPTION 22%, QTY 7%, UNIT 7%, N.W.(KG) 10%, G.W.(KG) 10%, MEAS 10%

**5. Totals Row** — per-column 映射合计行

- 仅在至少一个合计字段可见时渲染
- 遍历 `visCols`，在对应列位置显示合计值：
  - 件数列 → `totalPkgs` 或按行 `noOfPkgs` 求和
  - 净重列 → `totalNetWeight` 或按行 `netWeight` 求和
  - 毛重列 → `totalGrossWeight` 或按行 `grossWeight` 求和
  - 体积列 → `totalMeasurement` 或按行 `measurement` 求和
  - 第一列 → "TOTAL / 合计:" 靠左
  - 其他列 → 空

**6. Remarks（备注）** — 模板可选

```html
<div class="remarks-block">
  <div class="remarks-label">Remarks / 备注:</div>
  <div class="remarks-text">（文本内容）</div>
</div>
```

**7. Signature（签名区）** — 右下角右对齐

```html
<div class="signature-block">
  Signature: _______________
  Title: __________________
  Date: ___________________
</div>
```

与 CI 签名区相同样式，padding-right 对齐。

## 样式升级

复用 common.css 中 `.invoice-preview` 命名空间下的已有样式（Times New Roman / SimSun, 13px, 双线标题, e8e8e8 表头等）。

无需新增 CSS 规则——CI 的 `.invoice-preview` 样式完全覆盖打包单所需的所有样式类：
- `.invoice-preview .title`
- `.invoice-preview .two-col` / `.address-block` / `.addr-label`
- `.invoice-preview .field-row` / `.field-label` / `.field-value`
- `.invoice-preview table.items th` / `td`
- `.invoice-preview .total-row td`
- `.invoice-preview .signature-block`

只需在 packing-list.html 的预览 HTML 中使用这些相同的 class 名即可。

## 初始化逻辑

`init()` 函数中添加：

```javascript
// 确保模板数据存在
ensureTmplData(DT, PL_DEFAULT_FIELDS);
// 如果有缓存的旧模板，更新默认模板字段
var _td = loadTmplData(DT);
if (_td && _td.templates) {
  var _dt = _td.templates.find(function(t) { return t.id === 'tmpl_default'; });
  if (_dt) {
    for (var _k in PL_DEFAULT_FIELDS) { _dt.fields[_k] = PL_DEFAULT_FIELDS[_k]; }
    saveTmplData(DT, _td);
  }
}
```

## 实现顺序

1. 添加 `PL_DEFAULT_FIELDS` 和 `PL_FIELD_META` 常量
2. 添加 `isFld()` / `isFldR()` 包装函数
3. 改造 `renderForm()` — 添加 `itemCols` 数组和 `visCols` 过滤
4. 添加模板工具栏 HTML（表单顶部）
5. 添加 `renderTmplBar()` / `renderTmplModal()` / `doSaveTmplFromModal()` / `setupTmplEvents()`
6. 改造 `renderPreview()` — 全新专业布局
7. 修改 `init()` — 调用 `ensureTmplData()` 并刷新缓存

## 回退方案

所有新增代码集中在 packing-list.html 中：
- 移除模板相关代码后，回退到原始状态
- 不影响其他任何页面
- common.js 中的共享模板函数已存在，无破坏性变更
