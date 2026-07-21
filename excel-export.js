// ===== Excel Export Module (requires common.js + ExcelJS CDN) =====

function ensureExcelJs() {
  if (typeof ExcelJS !== 'undefined') return Promise.resolve();
  return new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
    s.onload = function() { resolve(); };
    s.onerror = function() { reject(new Error('Failed to load ExcelJS')); };
    document.head.appendChild(s);
  });
}

function _excLabel(label) {
  return getLang() === 'zh' ? label.cn : label.en;
}

function _excVal(prefixZh, prefixEn, val) {
  return (getLang() === 'zh' ? prefixZh : prefixEn) + (val || '');
}

function _excCell(ws, row, col, val, opts) {
  var cell = ws.getCell(row, col);
  cell.value = val;
  if (!opts) return cell;
  var f = { name: 'Arial' };
  if (opts.bold) f.bold = true;
  f.size = opts.size || 10;
  cell.font = f;
  cell.alignment = {
    horizontal: opts.align || 'left',
    vertical: 'middle',
    wrapText: !!opts.wrap
  };
  if (opts.border) {
    var b = { style: 'thin' };
    cell.border = { top: b, bottom: b, left: b, right: b };
  }
  if (opts.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  }
  return cell;
}

function _excBox(ws, r1, c1, r2, c2) {
  var thin = { style: 'thin' }, hair = { style: 'hair' };
  for (var i = r1; i <= r2; i++) {
    for (var j = c1; j <= c2; j++) {
      ws.getCell(i, j).border = {
        top: i === r1 ? thin : hair,
        bottom: i === r2 ? thin : hair,
        left: j === c1 ? thin : hair,
        right: j === c2 ? thin : hair
      };
    }
  }
}

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

var DEEP_BLUE = 'FF203764';
var _excHeaderFill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: DEEP_BLUE }
};
var _excWhiteFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
var _excThinWhiteBorder = {
  top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
};
var _excThinBlackBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};
var _excCtr = { vertical: 'middle', horizontal: 'center' };
var _excLft = { vertical: 'middle', horizontal: 'left' };
var _excRgt = { vertical: 'middle', horizontal: 'right' };

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

function _renderCommercialQuotation(wb, data) {
  var ws = wb.addWorksheet('Quotation');
  ws.columns = [{width:4},{width:14},{width:30},{width:12},{width:8},{width:7},{width:12},{width:10},{width:14}];
  var C = 9, d = data, R = _excTitle(ws, C, 'COMMERCIAL QUOTATION', '商业报价单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'QUOTATION INFO / 报价信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Quotation No.: ' + (d.quotationNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Date: ' + (d.quotationDate||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.sellerPhone||''), 'Currency: ' + (d.currency||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', 'TERMS / 条款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||''), 'Payment: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||''), 'Delivery: ' + (d.deliveryTerms||''));
  R = _excInfoRow(ws, R, C, '', 'Validity: ' + (d.validityPeriod||''));
  R++;

  // Table
  var CQ_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'itemNo', align:'center' },
    { field:'description', align:'left' },
    { field:'specification', align:'center' },
    { field:'quantity', align:'center' },
    { field:'unitOfMeasure', align:'center' },
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
    { label:'Subtotal / 小计:', val:d.subtotal, col:9 },
    { label:'Total Discount / 总折扣:', val:d.totalDiscount, col:9 },
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
  if (d.termsAndConditions) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Terms & Conditions / 条款:';
    ws.getCell(R, 1).font = _excSecFont;
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.termsAndConditions;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    ws.getRow(R).height = 48;
    R += 2;
  }

  _excSetPage(ws);
}

// ===== Main Export Entry =====

function doExportExcel(dt, data) {
  ensureExcelJs().then(function() {
    var wb = new ExcelJS.Workbook();
    wb.creator = 'TRADE_doc';
    wb.created = new Date();

    switch(dt) {
      case 'commercial_invoice':
        _renderCommercialInvoice(wb, data);
        break;
      case 'commercial_quotation':
        _renderCommercialQuotation(wb, data);
        break;
      default:
        var ws = wb.addWorksheet('Sheet1');
        ws.getCell(1, 1).value = 'Export not yet implemented for ' + dt;
    }

    var prefix = PDF_PREFIX[dt] || 'document';
    var ref = getDocRef(dt, data);
    var filename = prefix + (ref ? '_' + ref : '') + '.xlsx';

    var lang = getLang();
    var genText = I18N[lang].generating || 'Generating...';
    var btn = document.querySelector('[data-excel-btn]');
    if (btn) { btn.disabled = true; btn.textContent = genText; }

    return wb.xlsx.writeBuffer().then(function(buf) {
      var blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 10000);

      if (btn) { btn.disabled = false; btn.textContent = I18N[lang].exportExcel; }
    });
  }).catch(function(err) {
    console.error('Excel export failed:', err);
    var lang = getLang();
    var btn = document.querySelector('[data-excel-btn]');
    if (btn) { btn.disabled = false; btn.textContent = I18N[lang].exportExcel; }
    alert(I18N[lang].exportExcel + ' failed: ' + err.message);
  });
}
