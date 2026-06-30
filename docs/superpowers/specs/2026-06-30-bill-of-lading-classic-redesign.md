# Bill of Lading 经典提单样式重建设计

## 概述

将 Bill of Lading Generator 的预览/导出模板从当前通用风格改为经典海运提单样式，同时升级表单编辑器，新增提单标准字段。

## 改动范围

- `bill-of-lading.html` — 表单编辑器重构 + 预览模板重写 + 模板系统集成
- `common.js` — `getDefaultDoc` / `getEmptyItem` 新增字段 + `autoCalcItem` 支持

---

## 布局设计（已确认）

### 总览

```
┌──────────────────────────────────────────────────────────────┐
│                     BILL OF LADING                           │
│                     ═══════════════════                      │
├────────────────────────────────┬─────────────────────────────┤
│  ┌──────────────────────────┐  │  B/L No.: [blNo]            │
│  │ SHIPPER (发货人)          │  │  Booking No.: [bookingNo]   │
│  │  [shipperName]           │  │                             │
│  │  [shipperAddress]        │  │  [承运人名称]                │
│  ├──────────────────────────┤  │  ORIGINAL                   │
│  │ CONSIGNEE (收货人)       │  │                             │
│  │  [consigneeName]         │  │  Shipper Ref,               │
│  │  [consigneeAddress]      │  │  Freight Terms, Currency    │
│  ├──────────────────────────┤  │                             │
│  │ NOTIFY PARTY (通知方)    │  │                             │
│  │  [notifyPartyName]       │  │                             │
│  │  [notifyPartyAddress]    │  │                             │
│  └──────────────────────────┘  └─────────────────────────────┘
├──────────────────────────────────────────────────────────────┤
│  Vessel        │ Voyage No.  │ Pre-carriage │ Place of       │
│  [vessel]      │ [voyageNo]  │ [preCar]     │ Receipt [POR]  │
│  Port of       │ Port of     │ Place of     │                │
│  Loading [POL] │ Discharge   │ Delivery     │                │
│                │ [POD]       │ [PODel]      │                │
├──────────────────────────────────────────────────────────────┤
│  Marks & Nos │ Nos. & Kinds  │ Description of Goods │ G.W. │ Meas │
│  唛头        │ of Pkgs 件数  │ 货品描述             │ 毛重  │ 体积  │
├──────────────┼───────────────┼──────────────────────┼───────┼───────┤
│              │               │                      │       │       │
├──────────────┴───────────────┴──────────────────────┴───────┴───────┤
│  Container No. [containerNo] │ Seal No. [sealNo] │ 柜量 │ 装船日    │
├────────────────────────────────────────────────────────────────────┤
│  Total Number of Packages (in words):                               │
│  SAY [totalPkgsWords] ONLY                                          │
├────────────────────────────────────────────────────────────────────┤
│  Freight & Charges: [freightTerms] [freightPayableAt]               │
│  Declaration: [declaration]                                         │
├──────────────┬──────────────────────┬──────────────────────────────┤
│  Place of    │ No. of Original      │ Signed for the Carrier:      │
│  Issue       │ B(s)/L               │ [carrierName]                │
│  [placeOfIssue]│ [noOfOriginals]    │ [signatureDate]              │
│  Date of     │                      │                              │
│  Issue       │                      │                              │
│  [dateOfIssue]│                     │                              │
└──────────────┴──────────────────────┴──────────────────────────────┘
```

### 各区域详细说明

#### ① 标题区
- 字体: Georgia/Times New Roman, 30px, bold, letter-spacing 6px
- 双线分隔（3px double border）

#### ② 左列: Shipper / Consignee / Notify Party
- 三个框竖排，等宽，1.5px 实线边框
- Shipper 略高（min-height: 100px），Consignee 和 Notify 各 80px
- 每个框有标签行（SHIPPER (发货人)）和内容区

#### ③ 右列: B/L No. / 承运人信息
- B/L No. 和 Booking No. 右上角对齐
- 承运人名称（固定文字，非用户字段）
- "ORIGINAL" 标记（Georgia 14px, red）
- 辅助信息（Shipper Ref, Freight Terms, Currency）

#### ④ 运输信息（三栏下方全宽）
- 两行四列，带 1.5px 边框
- 第一行: Vessel / Voyage No. / Pre-carriage by / Place of Receipt
- 第二行: Port of Loading / Port of Discharge / Place of Delivery / (空)

#### ⑤ 货物表格
- 5 列：Marks & Nos | Nos. & Kinds of Pkgs | Description of Goods | Gross Weight | Measurement
- 列宽：16% / 12% / 40% / 16% / 16%
- 合计行：TOTAL 居右，显示总件数/总毛重/总体积

#### ⑥ Container / Seal（表格与总件数之间）
- 4 项水平排列：Container No. / Seal No. / No. of Containers / Shipped on Board Date
- 无上边框（与表格视觉连接）

#### ⑦ 大写件数
- "Total Number of Packages (in words)" 标签
- 内容: "SAY [totalPkgsWords] ONLY" 斜体 Georgia

#### ⑧ 运费
- Freight Terms / Freight Payable at / Declaration

#### ⑨ 底部（三列）
- Place of Issue + Date of Issue | No. of Original B(s)/L | Signed for the Carrier (+ 签名线)

---

## 样式方案

在 `common.css` 新增 `bl-preview` 样式块（参考 `co-preview` 模式）：

```css
.invoice-preview .bl-preview {
  /* 独立样式空间，不影响其他页面 */
}
.bl-preview .bl-title { /* Georgia 30px bold 等 */ }
.bl-preview .bl-party-box { /* 边框、内边距 */ }
.bl-preview .bl-table { /* 全边框表格 */ }
/* ... 其他 BL 专属样式 */
```

预览 HTML 使用 `<div class="invoice-preview"><div class="bl-preview">...` 嵌套结构，复用 `invoice-preview` 的基础设置（字体基础、颜色、间距），但用 `bl-preview` 重写所有 BL 特有的边框布局。

## 新增字段

### getDefaultDoc (`common.js`)

```javascript
case 'bill_of_lading': return {
  // 已有字段保持不变
  shipperName:'', shipperAddress:'',
  consigneeName:'', consigneeAddress:'',
  notifyPartyName:'', notifyPartyAddress:'',
  vessel:'', voyageNo:'', portOfLoading:'', portOfDischarge:'',
  placeOfReceipt:'', placeOfDelivery:'',
  blNo:'', shipperRef:'', bookingNo:'',
  freightTerms:'Prepaid', currency:'USD',
  dateOfShipment:'', dateOfIssue:'',
  items:[empty], totalPkgs:'', totalGrossWeight:'', totalMeasurement:'',
  declaration:'...',
  carrierName:'', carrierSignatureDate:'',
  // 新增字段:
  containerNo:'',       // 柜号
  sealNo:'',            // 封条号
  noOfContainers:'',    // 柜量
  totalPkgsWords:'',    // 大写件数
  placeOfIssue:'',      // 签发地点
  noOfOriginals:'THREE', // 正本份数
  preCarriageBy:'',     // 前程运输
  shippedOnBoardDate:'', // 已装船日期
  freightPayableAt:'',  // 运费支付地
};
```

### getEmptyItem (`common.js`)

```javascript
case 'bill_of_lading': return {
  marks:'', numberOfPkgs:'', description:'', grossWeight:'', measurement:''
  // 移除 freight 字段（经典提单中运费在表头，不在行级）
};
```

### autoCalcItem (`common.js`)

```javascript
case 'bill_of_lading': {
  // 当前 item 无自动计算
  // 但 renderForm 中的 _blItem 需要重新计算 totals
}
```

## 表单编辑器改动

### 新增 section-cards

```
货物数据 / Cargo Data
├── Container No. (柜号) [text]
├── Seal No. (封条号) [text]
├── No. of Containers (柜量) [text]
├── Shipped on Board Date (已装船日期) [date]
├── Pre-carriage by (前程运输) [text]
├── Place of Issue (签发地点) [text]
├── No. of Original B(s)/L (正本份数) [text]
└── Freight Payable at (运费支付地) [text]
```

运输信息 section-card 中新增:
```
├── Place of Receipt 和 Place of Delivery 从 Transport Info 移入下方全宽区域
```

### 商品表移除 freight 列
当前 7 列: `# | Marks | No. of Pkgs | Description | G.W. | Meas. | Freight | Action`
改为 6 列: `# | Marks | No. of Pkgs | Description | G.W. | Meas. | Action`

### 汇总区域
- 保留总件数/总毛重/总体积 汇总
- 添加 Total Packages in Words 输入框（textarea 或 input）

## 模板系统

参照 `commercial-quotation.html` 的模式添加：
- `BL_DEFAULT_FIELDS` — 定义所有字段的默认可见性
- `BL_TMPL_SECTIONS` / `BL_TMPL_SECTION_LABELS` — 分区定义
- `renderTmplBar()` / `renderTmplModal()` — 模板工具栏和弹窗
- `ensureTmplData()` / `setupTmplEvents()` — 模板数据初始化

## 实施顺序

1. `common.js`: 更新 `getDefaultDoc` / `getEmptyItem` 添加新字段
2. `bill-of-lading.html`: 添加 `BL_DEFAULT_FIELDS` 等模板常量
3. `bill-of-lading.html`: 重构 `renderForm()` — 新增字段、调整布局、移除 freight 列
4. `bill-of-lading.html`: 重写 `renderPreview()` — 经典提单布局
5. `bill-of-lading.html`: 添加模板系统函数
6. `common.css`: 添加 `bl-preview` 样式块
7. `bill-of-lading.html`: `init()` 中集成模板初始化
8. `bill-of-lading.html`: 测试验证

---

*设计确认日期: 2026-06-30*
*设计文档版本: v1*
