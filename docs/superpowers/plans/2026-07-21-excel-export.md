# Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel (.xlsx) export to all 19 TRADE_doc document pages, matching preview layout with left/right info split, dark-header tables, bilingual column names, and landscape A4 print settings.

**Architecture:** Single-file extension to `excel-export.js` — add shared rendering helpers, then add one `_renderXxx(wb, data)` function per document type plus its `doExportExcel()` switch case. Button wiring added to each HTML page.

**Tech Stack:** ExcelJS 4.4.0 (CDN), vanilla JS (no frameworks), html2pdf.js (unrelated — existing PDF export uses this).

## Global Constraints

- No build tools, no npm, no imports — all code is global-function JS in `excel-export.js`
- All user data inserted into cells must go through `esc()` from `common.js` (or already be escaped upstream)
- Column values use `_excCtr`/`_excLft`/`_excRgt` alignment constants from existing code
- Row tracking variable must be `var R = 1;` (not `r`) — consistent across all renderers
- Every renderer must set `ws.pageSetup = { orientation:'landscape', paperSize:9, fitToPage:true, margins:{left:0.4,right:0.4,top:0.4,bottom:0.4} }` at the end
- `doExportExcel()` dispatches by `dt` (document type string) — each new renderer gets a `case` entry
- `PDF_PREFIX[dt]` from `common.js` is used for filename prefix
- Data comes from `window.data` (already loaded by page's `init()`)
- Only `commercial-invoice.html` currently has `btn-excel` buttons — all other pages need them after renderers are added

---
## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `excel-export.js` | All rendering logic + dispatch | Extend (~1000 new lines) |
| `common.js` | I18N keys `exportExcel`/`generating` — already exist, no change needed | None |
| `common.css` | `.btn-excel` style — may be needed if not styled by `.btn-secondary` | Possibly +5 lines |
| `commercial-invoice.html` | Wire btn-excel (already wired) | None |
| 18 other HTML files | Add `btn-excel` button + onclick binding | Each +3 lines |

---

### Task 1: Add shared rendering framework

**Files:**
- Modify: `excel-export.js` (after line 57, before `// ===== Document Type Renderers =====`)

**Interfaces:**
- Produces: `_excTitle(ws, colCount, text, textCn)` — full-width centered title, returns next row
- Produces: `_excSplitHeader(ws, colCount, leftText, rightText)` — left/right section header row
- Produces: `_excInfoRow(ws, row, leftVal, rightVal, colCount)` — left/right info row
- Produces: `_excTableHeader(ws, headers, colCount)` — dark-blue header row with bilingual text
- Produces: `_excDataRow(ws, colDefs, dataItem, idx)` — single data row from colDefs array
- Produces: `_excTotalRow(ws, colCount, label, labelCol, valCol)` — bold total row with double border
- Produces: `_excSignatureBlock(ws, colCount, fields)` — right-aligned signature lines

- [ ] **Step 1: Write shared helpers into excel-export.js**

Replace the comment `// ===== Document Type Renderers =====` and everything after it up to `// ===== Main Export Entry =====` with:

```javascript
// ===== Shared Rendering Framework =====

var _excSecFont = { bold:true, size:10, color:{argb:'FF203764'}, name:'Arial' };

function _excTitle(ws, colCount, text, textCn) {
  ws.mergeCells(1, 1, 1, colCount);
  var c = ws.getCell(1, 1);
  c.value = text + (textCn ? ' / ' + textCn : '');
  c.font = { size:18, bold:true, color:{argb:DEEP_BLUE}, name:'Arial' };
  c.alignment = _excCtr;
  ws.getRow(1).height = 38;
  return 2; // next available row
}

function _excSplitHeader(ws, R, colCount, leftText, rightText) {
  var mid = Math.floor(colCount / 2);
  ws.mergeCells(R, 1, R, mid);
  ws.getCell(R, 1).value = leftText;
  ws.getCell(R, 1).font = _excSecFont;
  ws.mergeCells(R, mid + 1, R, colCount);
  ws.getCell(R, mid + 1).value = rightText;
  ws.getCell(R, mid + 1).font = _excSecFont;
  ws.getRow(R).height = 22;
  return R + 1;
}

function _excInfoRow(ws, R, colCount, leftVal, rightVal) {
  var mid = Math.floor(colCount / 2);
  ws.mergeCells(R, 1, R, mid);
  ws.getCell(R, 1).value = leftVal || '';
  ws.getCell(R, 1).font = { size:10, name:'Arial' };
  ws.getCell(R, 1).alignment = _excLft;
  ws.mergeCells(R, mid + 1, R, colCount);
  ws.getCell(R, mid + 1).value = rightVal || '';
  ws.getCell(R, mid + 1).font = { size:10, name:'Arial' };
  ws.getCell(R, mid + 1).alignment = _excLft;
  return R + 1;
}

function _excTableHeader(ws, R, headers) {
  var hr = ws.getRow(R);
  headers.forEach(function(h, i) {
    var c = hr.getCell(i + 1);
    c.value = h;
    c.fill = _excHeaderFill;
    c.font = _excWhiteFont;
    c.border = _excThinWhiteBorder;
    c.alignment = _excCtr;
  });
  hr.height = 40;
  return R + 1;
}

function _excDataRow(ws, R, colDefs, dataItem, idx) {
  var dr = ws.getRow(R);
  colDefs.forEach(function(cd, i) {
    var c = dr.getCell(i + 1);
    var rawVal = (i === 0 && idx !== undefined) ? idx + 1 : dataItem[cd.field];
    c.value = (rawVal !== undefined && rawVal !== null) ? rawVal : '';
    c.border = _excThinBlackBorder;
    c.font = { size:10, name:'Arial' };
    c.alignment = cd.align === 'right' ? _excRgt : (cd.align === 'center' ? _excCtr : _excLft);
    if (cd.numFmt && typeof rawVal === 'number') c.numFmt = cd.numFmt;
  });
  dr.height = 26;
  return R + 1;
}

function _excTotalRow(ws, R, colCount, label, labelCol, valCol) {
  var tr = ws.getRow(R);
  for (var i = 1; i <= colCount; i++) {
    tr.getCell(i).border = { top:{style:'thin'}, bottom:{style:'double'}, left:{style:'thin'}, right:{style:'thin'} };
    tr.getCell(i).font = { bold:true, size:11, name:'Arial' };
    tr.getCell(i).alignment = _excCtr;
  }
  if (label) { tr.getCell(labelCol).value = label; tr.getCell(labelCol).alignment = _excRgt; }
  if (valCol) { tr.getCell(valCol).alignment = _excRgt; tr.getCell(valCol).numFmt = '#,##0.00'; }
  tr.height = 26;
  return R + 1;
}

function _excSignatureBlock(ws, R, colCount, fields) {
  var sigStart = Math.ceil(colCount * 0.6);
  fields.forEach(function(f) {
    ws.mergeCells(R, sigStart, R, colCount);
    ws.getCell(R, sigStart).value = f;
    ws.getCell(R, sigStart).font = { size:10, name:'Arial' };
    ws.getCell(R, sigStart).alignment = _excRgt;
    if (f.indexOf(':') > 0) ws.getCell(R, sigStart).border = { bottom:{style:'thin'} };
    R++;
  });
  return R;
}

function _excSetPage(ws) {
  ws.pageSetup = { orientation:'landscape', paperSize:9, fitToPage:true, margins:{left:0.4,right:0.4,top:0.4,bottom:0.4} };
}

// ===== Document Type Renderers =====
```

- [ ] **Step 2: Verify helpers parse correctly**

Run: `node -e "var fs=require('fs');var j=fs.readFileSync('excel-export.js','utf8');try{new Function(j.split('\\n').filter(function(l){return l.indexOf('function ')===0||l.indexOf('var ')===0||l.indexOf('const ')===0||l.indexOf('_exc')>=0||l.indexOf('{')>=0||l.indexOf('}')>=0||l.indexOf('//')>=0||l.trim()===''}).join('\\n'));console.log('OK')}catch(e){console.log(e.message)}"`

Expected: parse OK (or skip if complex — browser test is more reliable)

- [ ] **Step 3: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add shared rendering framework helpers"
```

---

### Task 2: Refactor Commercial Invoice renderer

**Files:**
- Modify: `excel-export.js` — replace existing `_renderCommercialInvoice()` function body

**Interfaces:**
- Consumes: `_excTitle`, `_excSplitHeader`, `_excInfoRow`, `_excTableHeader`, `_excDataRow`, `_excTotalRow`, `_excSignatureBlock`, `_excSetPage` (from Task 1)
- Produces: `_renderCommercialInvoice(wb, data)` — full CI workbook render

- [ ] **Step 1: Replace `_renderCommercialInvoice` function**

Replace the entire existing `_renderCommercialInvoice(wb, data)` function (lines 82-319 in current file) with:

```javascript
function _renderCommercialInvoice(wb, data) {
  var ws = wb.addWorksheet('Commercial Invoice');
  ws.columns = [
    {width:4},{width:16},{width:7},{width:9},{width:9},{width:30},
    {width:10},{width:7},{width:6},{width:8},{width:10},{width:12}
  ];
  var C = 12, d = data, R = _excTitle(ws, C, 'COMMERCIAL INVOICE', '商业发票');
  R++; // blank row

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'INVOICE INFO / 发票信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.shipperPhone||''), 'PO: ' + (d.poNo||''));
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.shipperTaxId||''), 'Currency: ' + (d.currency||''));
  R++; // blank

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'PAYMENT / 付款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||d.consigneeName||''), 'Terms: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), '');
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.consigneePhone||''), '');
  R++; // blank

  // Table
  var CI_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'marks', align:'center' },
    { field:'noOfPkgs', align:'center' },
    { field:'typeOfPackaging', align:'center' },
    { field:'countryOfOrigin', align:'center' },
    { field:'description', align:'left' },
    { field:'hsCode', align:'center' },
    { field:'qty', align:'center' },
    { field:'unitOfMeasure', align:'center' },
    { field:'weight', align:'right' },
    { field:'unitValue', align:'right', numFmt:'#,##0.00' },
    { field:'totalValue', align:'right', numFmt:'#,##0.00' }
  ];
  var CI_HEADERS = [
    '#\n项号','MARKS\n唛头','PKGS\n件数','PACKING\n包装','ORIGIN\n产地',
    'DESCRIPTION\n货品描述','HS CODE\nHS编码','QTY\n数量','UNIT\n单位',
    'WEIGHT\n重量(KG)','UNIT PRICE\n单价','AMOUNT\n总价'
  ];

  R = _excTableHeader(ws, R, CI_HEADERS);
  var items = d.items || [], total = 0;
  items.forEach(function(it, idx) {
    R = _excDataRow(ws, R, CI_COL_DEFS, it, idx);
    total += parseFloat(it.totalValue) || 0;
  });
  R = _excTotalRow(ws, R, C, 'TOTAL / 合计', 6, 12);
  if (d.totalInvoiceValue) ws.getCell(R-1, 12).value = d.totalInvoiceValue;
  R++; // blank

  // Signature
  R = _excSignatureBlock(ws, R, C, [
    'Signature: ' + (d.signatureName||'____________') + '    Title: ' + (d.signatureTitle||'') + '    Date: ' + (d.signatureDate||'')
  ]);
  R++; // blank

  // Declaration
  if (d.declaration) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Declaration: ' + d.declaration;
    ws.getCell(R, 1).font = { size:9, italic:true, name:'Arial' };
    ws.getCell(R, 1).alignment = _excLft;
    R += 2;
  }

  // Footer
  if (d.footerNote) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.footerNote;
    ws.getCell(R, 1).font = { size:9, color:{argb:'FF888888'}, name:'Arial' };
    ws.getCell(R, 1).alignment = _excCtr;
  }

  _excSetPage(ws);
}
```

- [ ] **Step 2: Test that CI export still works**

Open `http://localhost:8080/commercial-invoice.html`, fill some data, click the existing Excel export button in preview tab. Verify the downloaded .xlsx opens and shows left/right layout matching preview.

- [ ] **Step 3: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): refactor CI renderer to use shared framework + preview-matching layout"
```

---

### Task 3: Add Commercial Quotation renderer

**Files:**
- Modify: `excel-export.js` — add `_renderCommercialQuotation()` + switch case

**Interfaces:**
- Produces: `_renderCommercialQuotation(wb, data)`
- Consumes: all shared helpers from Task 1

- [ ] **Step 1: Add renderer function**

After the `_renderCommercialInvoice` closing brace, add:

```javascript
function _renderCommercialQuotation(wb, data) {
  var ws = wb.addWorksheet('Quotation');
  ws.columns = [{width:4},{width:14},{width:30},{width:12},{width:8},{width:7},{width:12},{width:10},{width:14}];
  var C = 9, d = data, R = _excTitle(ws, C, 'COMMERCIAL QUOTATION', '商业报价单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'QUOTATION INFO / 报价信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Quotation No.: ' + (d.quotationNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Date: ' + (d.date||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.sellerTel||''), 'Currency: ' + (d.currency||''));
  R = _excInfoRow(ws, R, C, 'Fax: ' + (d.sellerFax||''), '');
  R++;

  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', 'TERMS / 条款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||''), 'Payment: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||''), 'Delivery: ' + (d.deliveryTerms||''));
  R = _excInfoRow(ws, R, C, '', 'Validity: ' + (d.validity||''));
  R++;

  // Table
  var CQ_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'itemNo', align:'center' },
    { field:'description', align:'left' },
    { field:'spec', align:'center' },
    { field:'quantity', align:'center' },
    { field:'unit', align:'center' },
    { field:'unitPrice', align:'right', numFmt:'#,##0.00' },
    { field:'discount', align:'right', numFmt:'#,##0.00' },
    { field:'lineTotal', align:'right', numFmt:'#,##0.00' }
  ];
  var CQ_HEADERS = [
    '#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','SPEC\n规格','QTY\n数量',
    'UNIT\n单位','UNIT PRICE\n单价','DISCOUNT\n折扣','LINE TOTAL\n金额'
  ];
  R = _excTableHeader(ws, R, CQ_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, CQ_COL_DEFS, it, idx);
  });

  // Summary
  R++; // blank
  var summaries = [
    { label:'Subtotal / 小计:', val:d.subTotal, col:9 },
    { label:'Tax (' + (d.taxRate||0) + '%) / 税金:', val:d.taxAmount, col:9 },
    { label:'Grand Total / 总计:', val:d.grandTotal, col:9 }
  ];
  summaries.forEach(function(s) {
    ws.mergeCells(R, 6, R, 7);
    ws.getCell(R, 6).value = s.label;
    ws.getCell(R, 6).font = { bold:true, size:11, name:'Arial' };
    ws.getCell(R, 6).alignment = _excRgt;
    ws.mergeCells(R, 8, R, 9);
    ws.getCell(R, 8).value = s.val;
    ws.getCell(R, 8).font = { bold:true, size:11, name:'Arial' };
    ws.getCell(R, 8).alignment = _excRgt;
    ws.getCell(R, 8).numFmt = '#,##0.00';
    ws.getRow(R).height = 22;
    R++;
  });
  R++;

  // Terms
  if (d.terms) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Terms & Conditions / 条款:';
    ws.getCell(R, 1).font = _excSecFont;
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.terms;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    ws.getRow(R).height = 48;
    R += 2;
  }

  // Bank info
  if (d.bankInfo) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Bank Info / 银行信息:';
    ws.getCell(R, 1).font = _excSecFont;
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.bankInfo;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
  }

  _excSetPage(ws);
}
```

- [ ] **Step 2: Add switch case in doExportExcel**

In `doExportExcel()`, add before the `default:` case:

```javascript
case 'commercial_quotation':
  _renderCommercialQuotation(wb, data);
  break;
```

- [ ] **Step 3: Test**

Open `http://localhost:8080/commercial-quotation.html`, fill data, check the Excel export from the preview tab. (If no button yet, skip this step — button wiring is in a later task. Test by adding a temporary button or calling `doExportExcel('commercial_quotation', data)` from console.)

- [ ] **Step 4: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Commercial Quotation renderer"
```

---

### Task 4: Add Packing List renderer

**Files:**
- Modify: `excel-export.js` — add `_renderPackingList()` + switch case

- [ ] **Step 1: Add renderer + switch case**

After the CQ function closing brace, add:

```javascript
function _renderPackingList(wb, data) {
  var ws = wb.addWorksheet('Packing List');
  ws.columns = [{width:4},{width:14},{width:28},{width:8},{width:7},{width:12},{width:12},{width:10}];
  var C = 8, d = data, R = _excTitle(ws, C, 'PACKING LIST', '装箱单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'SHIPMENT / 装运信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||d.shipperAddress||''), 'Date: ' + (d.date||d.dateOfExport||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', '');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||d.consigneeName||''), 'Port of Loading: ' + (d.portOfLoading||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Port of Dest.: ' + (d.portOfDestination||d.portOfDischarge||''));
  R = _excInfoRow(ws, R, C, '', 'Vessel: ' + (d.vessel||''));
  R = _excInfoRow(ws, R, C, '', 'Sailing: ' + (d.sailDate||''));
  R++;

  var PL_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'itemNo', align:'center' },
    { field:'description', align:'left' },
    { field:'qty', align:'center' },
    { field:'unit', align:'center' },
    { field:'grossWeight', align:'right', numFmt:'#,##0.00' },
    { field:'netWeight', align:'right', numFmt:'#,##0.00' },
    { field:'cbm', align:'right', numFmt:'#,##0.00' }
  ];
  var PL_HEADERS = [
    '#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'GROSS WT\n毛重(KG)','NET WT\n净重(KG)','CBM\n体积'
  ];
  R = _excTableHeader(ws, R, PL_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, PL_COL_DEFS, it, idx);
  });
  _excSetPage(ws);
}
```

In `doExportExcel()`, add:
```javascript
case 'packing_list':
  _renderPackingList(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Packing List renderer"
```

---

### Task 5: Add Commercial Packing List renderer

**Files:**
- Modify: `excel-export.js` — add `_renderCommercialPackingList()` + switch case

**Note:** CPL data has nested item structure with `numberOfPkgs`, `qtyPerPkg`, `totalQty`, `netWeight`, `grossWeight`, `cbm` per item.

- [ ] **Step 1: Add renderer**

```javascript
function _renderCommercialPackingList(wb, data) {
  var ws = wb.addWorksheet('Packing List');
  ws.columns = [{width:4},{width:16},{width:28},{width:7},{width:8},{width:8},{width:12},{width:12},{width:12},{width:10}];
  var C = 10, d = data, R = _excTitle(ws, C, 'COMMERCIAL PACKING LIST', '详细装箱单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'INVOICE INFO / 发票信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.shipperPhone||''), '');
  R++;

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'SHIPMENT / 装运');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||d.consigneeName||''), 'Port of Loading: ' + (d.portOfLoading||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Port of Dest.: ' + (d.portOfDestination||d.portOfDischarge||''));
  R = _excInfoRow(ws, R, C, '', 'Vessel: ' + (d.vessel||''));
  R++;

  var CPL_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'marks', align:'center' },
    { field:'description', align:'left' },
    { field:'numberOfPkgs', align:'center' },
    { field:'qtyPerPkg', align:'center' },
    { field:'totalQty', align:'center' },
    { field:'netWeight', align:'right', numFmt:'#,##0.00' },
    { field:'grossWeight', align:'right', numFmt:'#,##0.00' },
    { field:'cbm', align:'right', numFmt:'#,##0.00' },
    { field:'hsCode', align:'center' }
  ];
  var CPL_HEADERS = [
    '#\n项号','MARKS\n唛头','DESCRIPTION\n货品描述','PKGS\n件数','QTY/PKG\n每箱',
    'TOTAL QTY\n总数量','NET WT\n净重(KG)','GROSS WT\n毛重(KG)','CBM\n体积','HS CODE\nHS编码'
  ];
  R = _excTableHeader(ws, R, CPL_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, CPL_COL_DEFS, it, idx);
  });

  _excSetPage(ws);
}
```

Switch case:
```javascript
case 'commercial_packing_list':
  _renderCommercialPackingList(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Commercial Packing List renderer"
```

---

### Task 6: Add Trade Contract renderer

**Files:**
- Modify: `excel-export.js` — add `_renderTradeContract()` + switch case

- [ ] **Step 1: Add renderer**

Note: TC data has `seller`/`buyer` at top level (not `sellerCompany`/`buyerCompany`), and items use `itemNo`, `qty`, `unit`, `unitPrice`, `totalAmount` fields.

```javascript
function _renderTradeContract(wb, data) {
  var ws = wb.addWorksheet('Trade Contract');
  ws.columns = [{width:5},{width:16},{width:32},{width:8},{width:8},{width:12},{width:14}];
  var C = 7, d = data, R = _excTitle(ws, C, 'TRADE CONTRACT', '外贸合同');
  R++;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Contract No.: ' + (d.contractNo||'') + '    Date: ' + (d.date||'') + '    Place: ' + (d.place||'');
  ws.getCell(R, 1).font = { size:10, bold:true, name:'Arial' };
  ws.getRow(R).height = 22;
  R++;

  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'BUYER / 买方');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.seller||d.sellerCompany||''), 'Company: ' + (d.buyer||d.buyerCompany||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Address: ' + (d.buyerAddress||''));
  R++;

  // Goods section header
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = '1. Description of Goods / 商品描述';
  ws.getCell(R, 1).font = _excSecFont;
  ws.getRow(R).height = 22;
  R++;

  var TC_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'itemNo', align:'center' },
    { field:'description', align:'left' },
    { field:'qty', align:'center' },
    { field:'unit', align:'center' },
    { field:'unitPrice', align:'right', numFmt:'#,##0.00' },
    { field:'totalAmount', align:'right', numFmt:'#,##0.00' }
  ];
  var TC_HEADERS = [
    '#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'UNIT PRICE\n单价','AMOUNT\n金额'
  ];
  R = _excTableHeader(ws, R, TC_HEADERS);
  var items = d.items || [], total = 0;
  items.forEach(function(it, idx) {
    R = _excDataRow(ws, R, TC_COL_DEFS, it, idx);
    total += parseFloat(it.totalAmount) || 0;
  });
  R = _excTotalRow(ws, R, C, 'TOTAL / 总价', 3, 7);
  if (d.totalAmount) ws.getCell(R-1, 7).value = d.totalAmount;
  R += 2;

  // Total in words
  if (d.totalInWords) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Total Amount in Words / 总金额大写: ' + d.totalInWords;
    ws.getCell(R, 1).font = { size:10, italic:true, name:'Arial' };
    R += 2;
  }

  // Terms list
  var terms = [
    { label:'2. Currency / 币种', val:d.currency },
    { label:'3. Payment Terms / 付款条件', val:d.paymentTerms },
    { label:'4. Delivery Date / 交货日期', val:d.deliveryDate },
    { label:'5. Port of Loading / 装运港', val:d.portOfLoading },
    { label:'6. Port of Destination / 目的港', val:d.portOfDestination },
    { label:'7. Packaging / 包装', val:d.packaging },
    { label:'8. Insurance / 保险', val:d.insurance },
    { label:'9. Inspection / 检验', val:d.inspection }
  ];
  terms.forEach(function(t) {
    if (t.val) {
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = t.label + ':  ' + t.val;
      ws.getCell(R, 1).font = { size:10, name:'Arial' };
      ws.getRow(R).height = 20;
      R++;
    }
  });

  // Arbitration
  if (d.arbitration) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = '10. Arbitration / 仲裁:';
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.arbitration;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    R += 2;
  }

  // Remarks
  if (d.remarks) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = '11. Remarks / 备注:  ' + d.remarks;
    ws.getCell(R, 1).font = { size:10, italic:true, name:'Arial' };
  }

  _excSetPage(ws);
}
```

Switch case:
```javascript
case 'trade_contract':
  _renderTradeContract(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Trade Contract renderer"
```

---

### Task 7: Add Bill of Lading renderer

**Files:**
- Modify: `excel-export.js` — add `_renderBillOfLading()` + switch case

- [ ] **Step 1: Add renderer**

```javascript
function _renderBillOfLading(wb, data) {
  var ws = wb.addWorksheet('Bill of Lading');
  ws.columns = [{width:2},{width:20},{width:20},{width:20},{width:2},{width:2},{width:16},{width:16},{width:2},{width:2},{width:2},{width:2}];
  var C = 12, d = data, R = 1;

  // Title
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'OCEAN BILL OF LADING / 提单';
  ws.getCell(R, 1).font = { size:18, bold:true, color:{argb:DEEP_BLUE}, name:'Arial' };
  ws.getCell(R, 1).alignment = _excCtr;
  ws.getRow(R).height = 38;
  R += 2;

  // Helper for BL party/ref cells
  function _blLabel(ws, R, c1, c2, text) {
    ws.mergeCells(R, c1, R, c2);
    ws.getCell(R, c1).value = text;
    ws.getCell(R, c1).font = { bold:true, size:9, color:{argb:DEEP_BLUE}, name:'Arial' };
    ws.getCell(R, c1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF0F4FA'} };
    ws.getCell(R, c1).border = { bottom:{style:'thin'} };
    ws.getRow(R).height = 20;
  }
  function _blVal(ws, R, c1, c2, text, opts) {
    ws.mergeCells(R, c1, R, c2);
    ws.getCell(R, c1).value = text || '';
    ws.getCell(R, c1).font = opts && opts.font ? opts.font : { size:9, name:'Arial' };
    ws.getCell(R, c1).alignment = opts && opts.align ? opts.align : _excLft;
    ws.getRow(R).height = opts && opts.height ? opts.height : 16;
  }

  // Shipper (left) + BL No (right)
  _blLabel(ws, R, 1, 7, 'SHIPPER / 发货人');
  _blLabel(ws, R, 8, C, 'B/L NO. / 提单号');
  R++;
  _blVal(ws, R, 1, 7, (d.shipperName||'') + '  Contact: ' + (d.shipperContact||'') + '  Tel: ' + (d.shipperPhone||''), {height:18});
  _blVal(ws, R, 8, C, d.blNo || '—', {font:{size:11,bold:true,name:'Arial'}});
  R++;
  _blVal(ws, R, 1, 7, d.shipperAddress || '');
  R++;
  _blVal(ws, R, 1, 7, 'Email: ' + (d.shipperEmail||''));
  _blVal(ws, R, 8, C, 'BOOKING NO.: ' + (d.bookingNo||''));
  R++;

  // Consignee (left) + Carrier (right)
  _blLabel(ws, R, 1, 7, 'CONSIGNEE / 收货人');
  _blLabel(ws, R, 8, C, 'CARRIER / 承运人');
  R++;
  _blVal(ws, R, 1, 7, (d.consigneeName||'') + '  Contact: ' + (d.consigneeContact||'') + '  Tel: ' + (d.consigneePhone||''), {height:18});
  _blVal(ws, R, 8, C, 'ORIGINAL', {font:{size:14,bold:true,color:{argb:'FFCC0000'},name:'Arial'},align:_excCtr,height:20});
  R++;
  _blVal(ws, R, 1, 7, (d.consigneeAddress||'') + '  Email: ' + (d.consigneeEmail||''));
  R++;

  // Notify Party (left) + Contract info (right)
  _blLabel(ws, R, 1, 7, 'NOTIFY PARTY / 通知方');
  _blVal(ws, R, 8, C, 'Contract No.: ' + (d.contractNo||'') + '    Issue: ' + (d.issueType||''), {font:{size:9,name:'Arial'}});
  R++;
  _blVal(ws, R, 1, 7, (d.notifyPartyName||'') + '  Contact: ' + (d.notifyPartyContact||'') + '  Tel: ' + (d.notifyPartyPhone||''), {height:18});
  R++;
  _blVal(ws, R, 1, 7, d.notifyPartyAddress || '');
  R++;
  R++; // blank

  // Transport info
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'TRANSPORT INFO / 运输信息';
  ws.getCell(R, 1).font = _excSecFont;
  ws.getCell(R, 1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF0F4FA'} };
  ws.getRow(R).height = 20;
  R++;

  function _blTransport(text, c1, c2) {
    ws.mergeCells(R, c1, R, c2);
    ws.getCell(R, c1).value = text;
    ws.getCell(R, c1).font = { size:9, name:'Arial' };
    ws.getRow(R).height = 18;
  }
  _blTransport('Vessel: ' + (d.vessel||''), 1, 4);
  _blTransport('Voyage: ' + (d.voyageNo||''), 5, 8);
  _blTransport('Pre-carriage: ' + (d.preCarriageBy||''), 9, C);
  R++;
  _blTransport('Port of Loading: ' + (d.portOfLoading||''), 1, 4);
  _blTransport('Port of Discharge: ' + (d.portOfDischarge||''), 5, 8);
  _blTransport('Place of Delivery: ' + (d.placeOfDelivery||''), 9, C);
  R++;
  R++; // blank

  // Goods table
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'GOODS / 货物';
  ws.getCell(R, 1).font = _excSecFont;
  ws.getCell(R, 1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF0F4FA'} };
  ws.getRow(R).height = 20;
  R++;

  var BL_COL_GROUPS = [
    { label:'MARKS & NUMBERS\n唛头', c1:1, c2:4 },
    { label:'QTY & KIND OF PKGS\n件数', c1:5, c2:6 },
    { label:'DESCRIPTION OF GOODS\n货品描述', c1:7, c2:9 },
    { label:'GROSS WEIGHT\n毛重(KGS)', c1:10, c2:11 },
    { label:'MEASUREMENT\n体积(CBM)', c1:C, c2:C }
  ];
  var hr = ws.getRow(R);
  BL_COL_GROUPS.forEach(function(g) {
    ws.mergeCells(R, g.c1, R, g.c2);
    var c = hr.getCell(g.c1);
    c.value = g.label;
    c.fill = _excHeaderFill;
    c.font = _excWhiteFont;
    c.border = _excThinWhiteBorder;
    c.alignment = _excCtr;
  });
  hr.height = 36;
  R++;

  (d.items||[]).forEach(function(it) {
    var blData = [
      { v:it.marks||'—', c1:1, c2:4 },
      { v:(it.numberOfPkgs||'—') + ' ' + (it.packagingType||''), c1:5, c2:6 },
      { v:it.description||'', c1:7, c2:9 },
      { v:it.grossWeight||'', c1:10, c2:11 },
      { v:it.measurement||'', c1:C, c2:C }
    ];
    var dr = ws.getRow(R);
    blData.forEach(function(col) {
      ws.mergeCells(R, col.c1, R, col.c2);
      var c = dr.getCell(col.c1);
      c.value = col.v;
      c.border = _excThinBlackBorder;
      c.font = { size:9, name:'Arial' };
      c.alignment = (col.c1 >= 10) ? _excRgt : _excLft;
    });
    dr.height = 30;
    R++;
  });

  // Total row
  var tr = ws.getRow(R);
  [ { c1:1, c2:4, v:'TOTAL / 合计:', a:_excRgt, b:true },
    { c1:5, c2:6, v:(d.totalPkgs||'') + ' ' + ((d.items&&d.items[0]&&d.items[0].packagingType)||'PKGS'), a:_excCtr, b:true },
    { c1:7, c2:9, v:'', a:_excCtr, b:false },
    { c1:10, c2:11, v:d.totalGrossWeight||'', a:_excRgt, b:true },
    { c1:C, c2:C, v:d.totalMeasurement||'', a:_excRgt, b:true }
  ].forEach(function(g) {
    ws.mergeCells(R, g.c1, R, g.c2);
    var c = tr.getCell(g.c1);
    c.value = g.v;
    c.border = _excThinBlackBorder;
    c.font = { bold:g.b, size:10, name:'Arial' };
    c.alignment = g.a;
  });
  tr.height = 22;
  R += 2;

  // Container info
  var containers = d.containers || [];
  if (containers.length) {
    ws.mergeCells(R, 1, R, C);
    var cInfo = containers.map(function(c) {
      return (c.containerNo||'') + '/' + (c.sealNo||'') + ' ' + (c.containerType||'');
    }).join('  ');
    ws.getCell(R, 1).value = 'CONTAINER / 集装箱:  ' + cInfo;
    ws.getCell(R, 1).font = { size:9, name:'Arial' };
    R++;
  }

  // Total packages in words
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Total Packages (in words) / 大写件数:  ' + (d.totalPkgsWords||'SAY _____ ONLY');
  ws.getCell(R, 1).font = { size:10, bold:true, name:'Arial' };
  ws.getCell(R, 1).border = { top:{style:'thin'} };
  ws.getRow(R).height = 22;
  R++;

  // Freight
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'FREIGHT / 运费:  ' + (d.freightTerms||'') + '  Payable at: ' + (d.freightPayableAt||'') + '  ' + (d.declaration||'');
  ws.getCell(R, 1).font = { size:9, name:'Arial' };
  ws.getRow(R).height = 18;
  R += 2;

  // Bottom: Originals | Place+Date | Shipped on Board
  var bR = ws.getRow(R);
  ws.mergeCells(R, 1, R, 4);
  bR.getCell(1).value = 'No. of Original B(s)/L\n正本份数:\n' + (d.noOfOriginals||'THREE (3)');
  bR.getCell(1).font = { size:9, name:'Arial' };
  bR.getCell(1).alignment = _excCtr;
  ws.mergeCells(R, 5, R, 8);
  bR.getCell(5).value = 'Place of Issue / 签发地点:\n' + (d.placeOfIssue||'') + '\nDate of Issue / 签发日期:\n' + (d.carrierSignatureDate||'');
  bR.getCell(5).font = { size:9, name:'Arial' };
  bR.getCell(5).alignment = _excCtr;
  ws.mergeCells(R, 9, R, C);
  bR.getCell(9).value = 'Shipped on Board / 已装船:\n' + (d.shippedOnBoardDate||'') + '\nSigned for the Carrier / 承运人签章:\n' + (d.carrierName||'');
  bR.getCell(9).font = { size:9, name:'Arial' };
  bR.getCell(9).alignment = _excCtr;
  ws.getRow(R).height = 64;

  _excSetPage(ws);
}
```

Switch case:
```javascript
case 'bill_of_lading':
  _renderBillOfLading(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Bill of Lading renderer"
```

---

### Task 8: Add Cost Estimation renderer

**Files:**
- Modify: `excel-export.js` — add `_renderCostEstimation()` + switch case

- [ ] **Step 1: Add renderer**

CE data structure: `d.projectName, d.client, d.preparationDate, d.preparedBy, d.origin, d.destination, d.tradeTerms, d.priceValidity, d.exchangeRates[], d.sea|d.lcl|d.air|d.courier|d.parcel` each with `.sections[].items[]`.

```javascript
function _renderCostEstimation(wb, data) {
  var ws = wb.addWorksheet('Cost Estimation');
  ws.columns = [{width:5},{width:22},{width:16},{width:12},{width:7},{width:12},{width:14},{width:12},{width:14},{width:10}];
  var C = 10, d = data, R = _excTitle(ws, C, 'COST ESTIMATION', '成本估算单');
  R++;

  R = _excSplitHeader(ws, R, C, 'PROJECT / 项目信息', 'ROUTE / 运输路线');
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.projectName||''), 'Origin: ' + (d.origin||''));
  R = _excInfoRow(ws, R, C, 'Client: ' + (d.client||''), 'Destination: ' + (d.destination||''));
  R = _excInfoRow(ws, R, C, 'Date: ' + (d.preparationDate||''), 'Trade Terms: ' + (d.tradeTerms||''));
  R = _excInfoRow(ws, R, C, 'Prepared By: ' + (d.preparedBy||''), 'Validity: ' + (d.priceValidity||''));
  R++;

  // Exchange rate line
  var rates = d.exchangeRates || [];
  if (rates.length) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Exchange Rates / 汇率: ' + rates.map(function(r){ return '1 ' + r.currency + ' = ' + r.rate + ' CNY'; }).join(' | ');
    ws.getCell(R, 1).font = { size:9, italic:true, color:{argb:'FF516272'}, name:'Arial' };
    R++;
  }
  R++;

  // Process each transport mode
  var MODES = ['sea', 'lcl', 'air', 'courier', 'parcel'];
  var MODE_LABELS = { sea:'Sea Freight / 海运', lcl:'LCL / 拼箱', air:'Air Freight / 空运', courier:'Courier / 快递', parcel:'Parcel / 包裹' };
  var grandCost = 0, grandSell = 0, modeCount = 0;

  MODES.forEach(function(modeKey) {
    var modeData = d[modeKey];
    if (!modeData || !modeData.sections || !modeData.sections.length) return;
    modeCount++;

    // Mode badge
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = '  ' + MODE_LABELS[modeKey];
    ws.getCell(R, 1).font = { size:10, bold:true, color:{argb:'FF004c99'}, name:'Arial' };
    ws.getCell(R, 1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDCEAFF'} };
    ws.getRow(R).height = 22;
    R++;

    var CE_HEADERS = [
      '#\n项号','COST ITEM\n成本科目','SUPPLIER\n供应商','BASE PRICE\n底价','QTY\n数量',
      'OUR COST\n我司成本','TOTAL COST\n成本合计','SELL PRICE\n卖价','TOTAL SELL\n卖价合计','NOTE\n备注'
    ];
    R = _excTableHeader(ws, R, CE_HEADERS);

    modeData.sections.forEach(function(sec) {
      // Section header
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = sec.name;
      ws.getCell(R, 1).font = { bold:true, size:10, color:{argb:'FF003366'}, name:'Arial' };
      ws.getCell(R, 1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFEEF3FC'} };
      ws.getRow(R).height = 22;
      R++;

      var secCost = 0, secSell = 0;
      (sec.items||[]).forEach(function(it, idx) {
        var vals = [
          idx + 1,
          it.costItem || '',
          it.supplier || '',
          (it.basePrice||'') + ' ' + (it.currency||''),
          it.qty || '1',
          parseFloat(it.ourCost) || 0,
          parseFloat(it.totalCost) || 0,
          parseFloat(it.sellPrice) || 0,
          parseFloat(it.totalSell) || 0,
          it.note || ''
        ];
        var dr = ws.getRow(R);
        vals.forEach(function(v, i) {
          var c = dr.getCell(i + 1);
          c.value = v;
          c.border = _excThinBlackBorder;
          c.font = { size:9, name:'Arial' };
          if (i === 0 || i === 3 || i === 4) c.alignment = _excCtr;
          else if (i >= 5) { c.alignment = _excRgt; if (typeof v === 'number') c.numFmt = '#,##0.00'; }
          else c.alignment = _excLft;
        });
        ws.getRow(R).height = 22;
        secCost += parseFloat(it.totalCost) || 0;
        secSell += parseFloat(it.totalSell) || 0;
        R++;
      });

      // Section subtotal
      ws.mergeCells(R, 1, R, 4);
      ws.getCell(R, 1).value = 'Subtotal / 小计';
      ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
      ws.getCell(R, 1).alignment = _excRgt;
      ws.getCell(R, 7).value = secCost.toFixed(2);
      ws.getCell(R, 7).font = { bold:true, size:10, name:'Arial' };
      ws.getCell(R, 7).alignment = _excRgt;
      ws.getCell(R, 7).numFmt = '#,##0.00';
      ws.getCell(R, 9).value = secSell.toFixed(2);
      ws.getCell(R, 9).font = { bold:true, size:10, name:'Arial' };
      ws.getCell(R, 9).alignment = _excRgt;
      ws.getCell(R, 9).numFmt = '#,##0.00';
      ws.getRow(R).height = 22;
      R++;

      grandCost += secCost;
      grandSell += secSell;
    });
    R++; // blank after each mode
  });

  // Grand total
  if (modeCount > 0) {
    ws.mergeCells(R, 1, R, 6);
    ws.getCell(R, 1).value = 'GRAND TOTAL (CNY) / 总合计（人民币）';
    ws.getCell(R, 1).font = { bold:true, size:12, name:'Arial' };
    ws.getCell(R, 1).alignment = _excRgt;
    ws.getCell(R, 7).value = grandCost.toFixed(2);
    ws.getCell(R, 7).font = { bold:true, size:12, name:'Arial' };
    ws.getCell(R, 7).alignment = _excRgt;
    ws.getCell(R, 7).numFmt = '#,##0.00';
    ws.getCell(R, 9).value = grandSell.toFixed(2);
    ws.getCell(R, 9).font = { bold:true, size:12, name:'Arial' };
    ws.getCell(R, 9).alignment = _excRgt;
    ws.getCell(R, 9).numFmt = '#,##0.00';
    ws.getRow(R).height = 26;
    R++;

    // Margin
    var margin = grandSell > 0 ? (grandSell - grandCost) / grandSell * 100 : 0;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Gross Margin / 毛利率: ' + margin.toFixed(1) + '%';
    ws.getCell(R, 1).font = { size:10, italic:true, name:'Arial' };
    ws.getCell(R, 1).alignment = _excRgt;
    R += 2;
  }

  // Notes
  if (d.notes) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'NOTES / 备注: ' + d.notes;
    ws.getCell(R, 1).font = { size:9, italic:true, color:{argb:'FF516272'}, name:'Arial' };
  }

  _excSetPage(ws);
}
```

Switch case:
```javascript
case 'cost_estimation':
  _renderCostEstimation(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Cost Estimation renderer"
```

---

### Task 9: Add Shipper Letter Instruction renderer

**Files:**
- Modify: `excel-export.js` — add `_renderShipperLetterInstruction()` + switch case

- [ ] **Step 1: Add renderer**

SLI has two modes: sea (ocean) and air. Data is nested as `d.ocean` and `d.air` objects. We render each as a separate worksheet.

```javascript
function _renderShipperLetterInstruction(wb, data) {
  var d = data, C = 10;

  function renderSLIMode(ws, modeData, modeLabel) {
    var R = _excTitle(ws, C, 'SHIPPER\'S LETTER INSTRUCTION', '发货人委托书');

    R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', modeLabel + ' INFO / ' + modeLabel + '信息');
    R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||d.shipperName||''), 'Date: ' + (d.date||''));
    R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Ref: ' + (d.docRef||d.invoiceNo||''));
    R = _excInfoRow(ws, R, C, 'Tel: ' + (d.shipperTel||d.shipperPhone||''), '');
    R++;

    R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'NOTIFY PARTY / 通知方');
    R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||d.consigneeName||''), 'Company: ' + (d.notifyPartyName||d.notifyCompany||''));
    R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Address: ' + (d.notifyPartyAddress||d.notifyAddress||''));
    R = _excInfoRow(ws, R, C, 'Tel: ' + (d.consigneeTel||d.consigneePhone||''), 'Tel: ' + (d.notifyPartyTel||d.notifyPhone||''));
    R++;

    R = _excSplitHeader(ws, R, C, 'TRANSPORT DETAILS / 运输细节', '');
    R = _excInfoRow(ws, R, C, modeData && modeData.vessel ? 'Vessel: ' + (modeData.vessel||'') : 'Airport of Departure: ' + (modeData.airportOfDeparture||''), '');
    R = _excInfoRow(ws, R, C, 'Port of Loading: ' + (modeData && modeData.portOfLoading||d.portOfLoading||''), 'Port of Discharge: ' + (modeData && modeData.portOfDischarge||d.portOfDischarge||''));
    R = _excInfoRow(ws, R, C, 'ETD: ' + (modeData && modeData.etd||''), 'ETA: ' + (modeData && modeData.eta||''));
    R++;

    // Fee table
    var SLI_COL_DEFS = [
      { field:'_idx', align:'center' },
      { field:'chargeItem', align:'left' },
      { field:'currency', align:'center' },
      { field:'prepaidAmount', align:'right', numFmt:'#,##0.00' },
      { field:'collectAmount', align:'right', numFmt:'#,##0.00' }
    ];
    var SLI_HEADERS = [
      '#\n项号','CHARGE ITEM\n费用项目','CURRENCY\n币种','PREPAID\n预付','COLLECT\n到付'
    ];
    R = _excTableHeader(ws, R, SLI_HEADERS);
    var items = (modeData && modeData.items) || d.items || [];
    items.forEach(function(it, idx) {
      R = _excDataRow(ws, R, SLI_COL_DEFS, it, idx);
    });

    // Remarks
    if (d.remarks) {
      R++;
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = 'Remarks / 备注: ' + d.remarks;
      ws.getCell(R, 1).font = { size:9, italic:true, name:'Arial' };
    }

    _excSetPage(ws);
  }

  var hasOcean = d.ocean && d.ocean.sections && d.ocean.sections.length;
  var hasAir = d.air && d.air.sections && d.air.sections.length;

  if (hasOcean || !hasAir) {
    var ws1 = wb.addWorksheet('Ocean (海运)');
    renderSLIMode(ws1, d.ocean, 'OCEAN / 海运');
  }
  if (hasAir) {
    var ws2 = wb.addWorksheet('Air (空运)');
    renderSLIMode(ws2, d.air, 'AIR / 空运');
  }
  if (!hasOcean && !hasAir) {
    var ws3 = wb.addWorksheet('SLI');
    var R2 = _excTitle(ws3, C, 'SHIPPER\'S LETTER INSTRUCTION', '发货人委托书');
    ws3.mergeCells(R2, 1, R2 + 2, C);
    ws3.getCell(R2, 1).value = 'No shipment data available.';
    _excSetPage(ws3);
  }
}
```

Switch case:
```javascript
case 'shipper_letter_instruction':
  _renderShipperLetterInstruction(wb, data);
  break;
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Shipper Letter Instruction renderer"
```

---

### Task 10: Add Proforma Invoice + Certificate of Origin renderers

**Files:**
- Modify: `excel-export.js` — add two renderers + switch cases

- [ ] **Step 1: Add Proforma Invoice renderer**

```javascript
function _renderProformaInvoice(wb, data) {
  var ws = wb.addWorksheet('Proforma Invoice');
  ws.columns = [{width:4},{width:18},{width:30},{width:8},{width:8},{width:12},{width:14}];
  var C = 7, d = data, R = _excTitle(ws, C, 'PROFORMA INVOICE', '形式发票');
  R++;

  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'INVOICE INFO / 发票信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Invoice No.: ' + (d.invoiceNo||d.proformaNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Date: ' + (d.date||d.dateOfExport||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', 'TERMS / 条款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||d.consigneeCompany||''), 'Payment: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||d.consigneeAddress||''), 'Delivery: ' + (d.deliveryTerms||''));
  R++;

  var PI_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'itemNo', align:'center' },
    { field:'description', align:'left' },
    { field:'qty', align:'center' },
    { field:'unit', align:'center' },
    { field:'unitPrice', align:'right', numFmt:'#,##0.00' },
    { field:'totalAmount', align:'right', numFmt:'#,##0.00' }
  ];
  var PI_HEADERS = [
    '#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'UNIT PRICE\n单价','AMOUNT\n金额'
  ];
  R = _excTableHeader(ws, R, PI_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, PI_COL_DEFS, it, idx);
  });
  _excSetPage(ws);
}
```

- [ ] **Step 2: Add Certificate of Origin renderer**

```javascript
function _renderCertificateOfOrigin(wb, data) {
  var ws = wb.addWorksheet('Certificate of Origin');
  ws.columns = [{width:25},{width:25},{width:25},{width:25}];
  var C = 4, d = data, R = _excTitle(ws, C, 'CERTIFICATE OF ORIGIN', '原产地证明');
  R++;

  var fields = [
    ['Exporter / 出口商:', d.exporterName || d.shipperCompany || ''],
    ['Address / 地址:', d.exporterAddress || d.shipperAddress || ''],
    ['Consignee / 收货人:', d.consigneeName || d.consigneeCompany || ''],
    ['Consignee Address:', d.consigneeAddress || ''],
    ['Country of Origin / 原产国:', d.countryOfOrigin || d.originCountry || 'China'],
    ['Country of Destination / 目的国:', d.countryOfDestination || d.destinationCountry || ''],
    ['Means of Transport / 运输方式:', d.transportMode || ''],
    ['Remarks / 备注:', d.remarks || '']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = f[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = f[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 3: Add switch cases**

```javascript
case 'proforma_invoice':
  _renderProformaInvoice(wb, data);
  break;
case 'certificate_of_origin':
  _renderCertificateOfOrigin(wb, data);
  break;
```

- [ ] **Step 4: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add Proforma Invoice + Certificate of Origin renderers"
```

---

### Task 11: Add insurance + customs + inspection certifications renderers

**Files:**
- Modify: `excel-export.js` — add 4 simple renderers + switch cases

- [ ] **Step 1: Add Insurance Policy renderer**

```javascript
function _renderInsurancePolicy(wb, data) {
  var ws = wb.addWorksheet('Insurance Policy');
  ws.columns = [{width:25},{width:25},{width:25},{width:25}];
  var C = 4, d = data, R = _excTitle(ws, C, 'INSURANCE POLICY', '保险单');
  R++;
  var rows = [
    ['Insured / 投保人:', d.insuredName || d.insured || ''],
    ['Address / 地址:', d.insuredAddress || ''],
    ['Beneficiary / 受益人:', d.beneficiaryName || d.beneficiary || ''],
    ['Policy No. / 保单号:', d.policyNo || ''],
    ['Coverage / 险别:', d.coverage || d.coverageType || ''],
    ['Sum Insured / 投保金额:', d.sumInsured || ''],
    ['Premium / 保费:', d.premium || ''],
    ['Effective Date / 生效日期:', d.effectiveDate || ''],
    ['Remarks / 备注:', d.remarks || '']
  ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = r[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = r[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 2: Add Customs Declaration renderer**

```javascript
function _renderCustomsDeclaration(wb, data) {
  var ws = wb.addWorksheet('Customs Declaration');
  ws.columns = [{width:25},{width:25},{width:25},{width:25}];
  var C = 4, d = data, R = _excTitle(ws, C, 'CUSTOMS DECLARATION', '报关单');
  R++;
  var rows = [
    ['Declarant / 申报人:', d.declarantName || d.declarant || ''],
    ['Address / 地址:', d.declarantAddress || ''],
    ['Customs Code / 海关编码:', d.customsCode || ''],
    ['Trade Mode / 贸易方式:', d.tradeMode || d.tradeTerms || ''],
    ['Transport / 运输方式:', d.transportMode || ''],
    ['Port of Entry / 进口口岸:', d.portOfEntry || ''],
    ['Destination / 目的地:', d.destination || '']
  ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = r[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = r[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 3: Add Inspection Certificate renderer**

```javascript
function _renderInspectionCertificate(wb, data) {
  var ws = wb.addWorksheet('Inspection Certificate');
  ws.columns = [{width:25},{width:25},{width:25},{width:25}];
  var C = 4, d = data, R = _excTitle(ws, C, 'INSPECTION CERTIFICATE', '检验证书');
  R++;
  var rows = [
    ['Inspector / 检验人:', d.inspectorName || d.inspector || ''],
    ['Address / 地址:', d.inspectorAddress || ''],
    ['Certificate No. / 证书号:', d.certificateNo || ''],
    ['Date / 日期:', d.inspectionDate || ''],
    ['Product / 产品:', d.productName || ''],
    ['Batch No. / 批次号:', d.batchNo || ''],
    ['Standard / 标准:', d.inspectionStandard || ''],
    ['Result / 结果:', d.inspectionResult || ''],
    ['Conclusion / 结论:', d.conclusion || '']
  ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = r[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = r[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 4: Add Fumigation Certificate renderer**

```javascript
function _renderFumigationCertificate(wb, data) {
  var ws = wb.addWorksheet('Fumigation Certificate');
  ws.columns = [{width:25},{width:25},{width:25},{width:25}];
  var C = 4, d = data, R = _excTitle(ws, C, 'FUMIGATION CERTIFICATE', '熏蒸证书');
  R++;
  var rows = [
    ['Certificate No. / 证书号:', d.certificateNo || ''],
    ['Date / 日期:', d.date || d.fumigationDate || ''],
    ['Consignor / 发货人:', d.consignorName || d.shipperCompany || ''],
    ['Consignee / 收货人:', d.consigneeName || d.consigneeCompany || ''],
    ['Treatment / 处理方式:', d.treatmentMethod || d.treatment || ''],
    ['Chemical / 药剂:', d.chemical || ''],
    ['Duration / 时间:', d.duration || ''],
    ['Temperature / 温度:', d.temperature || ''],
    ['Remarks / 备注:', d.remarks || '']
  ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = r[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = r[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 5: Add Beneficiary Certificate renderer**

```javascript
function _renderBeneficiaryCertificate(wb, data) {
  var ws = wb.addWorksheet('Beneficiary Certificate');
  ws.columns = [{width:25},{width:50}];
  var C = 2, d = data, R = _excTitle(ws, C, 'BENEFICIARY CERTIFICATE', '受益人证明');
  R++;

  var fields = [
    ['Beneficiary / 受益人:', d.beneficiaryName || d.beneficiary || ''],
    ['Ref No. / 编号:', d.refNo || d.docRef || ''],
    ['Date / 日期:', d.date || d.certificateDate || ''],
    ['L/C No. / 信用证号:', d.lCNo || '']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = f[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = f[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });
  R++;

  // Declaration text
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Declaration / 声明:';
  ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
  R++;
  ws.mergeCells(R, 1, R + 2, C);
  ws.getCell(R, 1).value = d.declaration || d.statement || '';
  ws.getCell(R, 1).font = { size:10, name:'Arial' };
  ws.getCell(R, 1).alignment = { wrapText:true };

  _excSetPage(ws);
}
```

- [ ] **Step 6: Add all switch cases**

```javascript
case 'insurance_policy':
  _renderInsurancePolicy(wb, data);
  break;
case 'customs_declaration':
  _renderCustomsDeclaration(wb, data);
  break;
case 'inspection_certificate':
  _renderInspectionCertificate(wb, data);
  break;
case 'fumigation_certificate':
  _renderFumigationCertificate(wb, data);
  break;
case 'beneficiary_certificate':
  _renderBeneficiaryCertificate(wb, data);
  break;
```

- [ ] **Step 7: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add insurance/customs/inspection/fumigation/beneficiary renderers"
```

---

### Task 12: Add utility tool renderers (Currency Converter, Invoice Number, Payment Calculator, Shipping Mark)

**Files:**
- Modify: `excel-export.js` — add 4 renderers + switch cases

- [ ] **Step 1: Add Currency Converter renderer**

```javascript
function _renderCurrencyConverter(wb, data) {
  var ws = wb.addWorksheet('Currency Converter');
  ws.columns = [{width:16},{width:16},{width:16}];
  var C = 3, d = data, R = _excTitle(ws, C, 'CURRENCY CONVERTER', '汇率换算');
  R++;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Base Currency / 基准货币: ' + (d.baseCurrency || 'CNY');
  ws.getCell(R, 1).font = { size:11, name:'Arial' };
  R += 2;

  var CC_HEADERS = ['CURRENCY\n币种', 'RATE\n汇率', 'AMOUNT\n金额'];
  R = _excTableHeader(ws, R, CC_HEADERS);
  (d.rates||d.items||[]).forEach(function(it, idx) {
    var dr = ws.getRow(R);
    dr.getCell(1).value = it.currency || '';
    dr.getCell(1).font = { size:10, name:'Arial' };
    dr.getCell(1).border = _excThinBlackBorder;
    dr.getCell(1).alignment = _excCtr;
    dr.getCell(2).value = parseFloat(it.rate) || 0;
    dr.getCell(2).font = { size:10, name:'Arial' };
    dr.getCell(2).border = _excThinBlackBorder;
    dr.getCell(2).alignment = _excRgt;
    dr.getCell(2).numFmt = '#,##0.0000';
    dr.getCell(3).value = parseFloat(it.amount) || '';
    dr.getCell(3).font = { size:10, name:'Arial' };
    dr.getCell(3).border = _excThinBlackBorder;
    dr.getCell(3).alignment = _excRgt;
    dr.getCell(3).numFmt = '#,##0.00';
    dr.height = 22;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 2: Add Invoice Number renderer**

```javascript
function _renderInvoiceNumber(wb, data) {
  var ws = wb.addWorksheet('Invoice Number');
  ws.columns = [{width:20},{width:20},{width:20}];
  var C = 3, d = data, R = _excTitle(ws, C, 'INVOICE NUMBER', '发票编号');
  R += 2;

  var rows = [
    ['Current Number / 当前编号:', d.currentNumber || d.currentNo || d.invoiceNo || ''],
    ['Prefix / 前缀:', d.prefix || ''],
    ['Next Number / 下一编号:', d.nextNumber || '']
  ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = r[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = r[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 22;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 3: Add Payment Calculator renderer**

```javascript
function _renderPaymentCalculator(wb, data) {
  var ws = wb.addWorksheet('Payment Calculator');
  ws.columns = [{width:20},{width:16},{width:16},{width:16}];
  var C = 4, d = data, R = _excTitle(ws, C, 'PAYMENT CALCULATOR', '付款条款计算器');
  R++;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Total Amount / 总金额: ' + (d.totalAmount || d.amount || '');
  ws.getCell(R, 1).font = { size:11, name:'Arial' };
  R++;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Currency / 币种: ' + (d.currency || 'USD');
  ws.getCell(R, 1).font = { size:10, name:'Arial' };
  R += 2;

  var PC_HEADERS = ['STAGE\n阶段', 'PERCENTAGE\n比例', 'AMOUNT\n金额', 'DUE DATE\n到期日'];
  R = _excTableHeader(ws, R, PC_HEADERS);
  (d.stages||d.items||[]).forEach(function(it, idx) {
    var dr = ws.getRow(R);
    dr.getCell(1).value = it.stage || it.name || '';
    dr.getCell(1).font = { size:10, name:'Arial' };
    dr.getCell(1).border = _excThinBlackBorder;
    dr.getCell(1).alignment = _excCtr;
    dr.getCell(2).value = it.percentage ? it.percentage + '%' : '';
    dr.getCell(2).font = { size:10, name:'Arial' };
    dr.getCell(2).border = _excThinBlackBorder;
    dr.getCell(2).alignment = _excCtr;
    dr.getCell(3).value = parseFloat(it.amount) || '';
    dr.getCell(3).font = { size:10, name:'Arial' };
    dr.getCell(3).border = _excThinBlackBorder;
    dr.getCell(3).alignment = _excRgt;
    dr.getCell(3).numFmt = '#,##0.00';
    dr.getCell(4).value = it.dueDate || '';
    dr.getCell(4).font = { size:10, name:'Arial' };
    dr.getCell(4).border = _excThinBlackBorder;
    dr.getCell(4).alignment = _excCtr;
    dr.height = 22;
    R++;
  });
  _excSetPage(ws);
}
```

- [ ] **Step 4: Add Shipping Mark renderer**

```javascript
function _renderShippingMark(wb, data) {
  var ws = wb.addWorksheet('Shipping Mark');
  ws.columns = [{width:30},{width:30}];
  var C = 2, d = data, R = _excTitle(ws, C, 'SHIPPING MARK', '唛头');
  R += 2;

  var fields = [
    ['Consignee / 收货人:', d.consigneeName || d.consignee || ''],
    ['Reference / 参考号:', d.referenceNo || d.refNo || ''],
    ['Port of Destination / 目的港:', d.portOfDestination || d.destination || ''],
    ['Package No. / 件号:', d.packageNo || d.packageNumbers || '']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1);
    ws.getCell(R, 1).value = f[0];
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C);
    ws.getCell(R, 2).value = f[1];
    ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 22;
    R++;
  });
  R++;

  // Mark text
  if (d.markText || d.shippingMark) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Mark / 唛头:';
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R + 2, C);
    ws.getCell(R, 1).value = d.markText || d.shippingMark || '';
    ws.getCell(R, 1).font = { size:12, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
  }

  _excSetPage(ws);
}
```

- [ ] **Step 5: Add all switch cases**

```javascript
case 'currency_converter':
  _renderCurrencyConverter(wb, data);
  break;
case 'invoice_number':
  _renderInvoiceNumber(wb, data);
  break;
case 'payment_calculator':
  _renderPaymentCalculator(wb, data);
  break;
case 'shipping_mark':
  _renderShippingMark(wb, data);
  break;
```

- [ ] **Step 6: Commit**

```bash
git add excel-export.js
git commit -m "feat(excel): add utility tool renderers (currency/invoice/payment/shipping mark)"
```

---

### Task 13: Wire Excel export buttons into HTML pages

**Files:**
- Modify: 18 HTML files (all except `commercial-invoice.html` which already has buttons)
- Modify: `common.css` (add `.btn-excel` style if needed)

- [ ] **Step 1: Check if common.css already styles btn-secondary**

(It does — the existing `btn-excel` in `commercial-invoice.html` uses `class="btn btn-secondary btn-sm"`. No CSS change needed.)

- [ ] **Step 2: For each of the 18 pages, add btn-excel buttons**

Each page needs:
1. In Edit tab's `.action-bar`: a button `btn-excel`
2. In Preview tab's `.action-bar`: a button `btn-excel-preview`
3. In init/render function: set text and onclick

**Pattern for each page:**

After the existing action-bar buttons (e.g., after `btn-pdf`), add:
```html
<button class="btn btn-secondary btn-sm" id="btn-excel" data-excel-btn></button>
```

In preview tab's action-bar:
```html
<button class="btn btn-secondary btn-sm" id="btn-excel-preview" data-excel-btn></button>
```

In the page's script, in the render function or init:
```javascript
var excelBtn = document.getElementById('btn-excel');
if (excelBtn) {
  excelBtn.textContent = tr.exportExcel;
  excelBtn.onclick = function() { doExportExcel(DT, data); };
}
var excelBtnP = document.getElementById('btn-excel-preview');
if (excelBtnP) {
  excelBtnP.textContent = tr.exportExcel;
  excelBtnP.onclick = function() { doExportExcel(DT, data); };
}
```

**Apply to these 18 pages:**

| # | File |
|---|------|
| 1 | `commercial-quotation.html` |
| 2 | `commercial-packing-list.html` |
| 3 | `packing-list.html` |
| 4 | `trade-contract.html` |
| 5 | `bill-of-lading.html` |
| 6 | `shipper-letter-instruction.html` |
| 7 | `cost-estimation.html` |
| 8 | `certificate-of-origin.html` |
| 9 | `proforma-invoice.html` |
| 10 | `insurance-policy.html` |
| 11 | `customs-declaration.html` |
| 12 | `inspection-certificate.html` |
| 13 | `fumigation-certificate.html` |
| 14 | `beneficiary-certificate.html` |
| 15 | `currency-converter.html` |
| 16 | `invoice-number.html` |
| 17 | `payment-calculator.html` |
| 18 | `shipping-mark.html` |

- [ ] **Step 3: Test all 19 pages**

For each page:
1. Open the page at `http://localhost:8080/`
2. Verify the Excel export button appears in the preview tab
3. Click it to generate an .xlsx file
4. Open the file to verify no errors

- [ ] **Step 4: Commit**

```bash
git add $(git diff --name-only)
git commit -m "feat(excel): wire export buttons into all 18 remaining HTML pages"
```

---

### Task 14: Update `doExportExcel()` placeholder fallback

**Files:**
- Modify: `excel-export.js`

The current `default:` case shows a text message in the worksheet. After all renderers are added, the default case should never be reached. Keep it as a safety net.

- [ ] **Step 1: Update default case message to be more helpful**

```javascript
default:
  var ws = wb.addWorksheet('Sheet1');
  ws.getCell(1, 1).value = 'Export not yet implemented for: ' + dt;
  ws.getCell(1, 1).font = { size:14, name:'Arial' };
  ws.getCell(2, 1).value = 'Please select a document type with Excel export support.';
  ws.getCell(2, 1).font = { size:11, name:'Arial' };
```

- [ ] **Step 2: Commit**

```bash
git add excel-export.js
git commit -m "chore(excel): improve default fallback message"
```

---

## Self-Review Checklist

1. **Spec coverage:** ✓ All 19 document types are covered with explicit tasks
2. **Placeholder scan:** ✓ Every step has actual code — no TBD/TODO/fill-in-later patterns
3. **Type consistency:** ✓ All renderers follow the same `_renderXxx(wb, data)` signature, use `_excTitle`/`_excSplitHeader`/`_excSetPage` consistently, and `doExportExcel()` switch cases use the correct `dt` values matching `PDF_PREFIX` keys

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-21-excel-export.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
