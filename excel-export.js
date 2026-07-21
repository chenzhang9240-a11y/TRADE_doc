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
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.shipperName||''), 'L/C No: ' + (d.lCNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.shipperPhone||''), 'PO: ' + (d.poNo||''));
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.shipperTaxId||''), 'Currency: ' + (d.currency||''));
  R = _excInfoRow(ws, R, C, '', 'Waybill No: ' + (d.waybillNo||''));
  R = _excInfoRow(ws, R, C, '', 'Reason: ' + (d.reasonForExport||''));
  R = _excInfoRow(ws, R, C, '', 'Country of Export: ' + (d.exportCountry||''));
  R = _excInfoRow(ws, R, C, '', 'Destination: ' + (d.destinationCountry||''));
  R++; // blank

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'PAYMENT / 付款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||d.consigneeName||''), 'Terms: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), '');
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.consigneePhone||''), '');
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.consigneeName||''), '');
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.consigneeTaxId||''), '');
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
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.sellerName||''), '');
  R = _excInfoRow(ws, R, C, 'Email: ' + (d.sellerEmail||''), '');
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.sellerTaxId||''), '');
  R++;

  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', 'TERMS / 条款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||''), 'Payment: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||''), 'Delivery: ' + (d.deliveryTerms||''));
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.buyerName||''), 'Validity: ' + (d.validityPeriod||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.buyerPhone||''), 'Lead Time: ' + (d.leadTime||''));
  R = _excInfoRow(ws, R, C, 'Email: ' + (d.buyerEmail||''), 'Min Order Qty: ' + (d.minOrderQty||''));
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.buyerTaxId||''), '');
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
    { label:'Total Tax / 税费:', val:d.totalTax, col:9 },
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

  // Remarks
  if (d.remarks) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Remarks / 备注:';
    ws.getCell(R, 1).font = _excSecFont;
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.remarks;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    ws.getRow(R).height = 48;
    R += 2;
  }

  // Signature
  if (d.signatureName || d.signatureTitle || d.signatureDate) {
    R = _excSignatureBlock(ws, R, C, [
      'Signature: ' + (d.signatureName||'____________') + '    Title: ' + (d.signatureTitle||'') + '    Date: ' + (d.signatureDate||'')
    ]);
    R++;
  }

  _excSetPage(ws);
}

function _renderPackingList(wb, data) {
  var ws = wb.addWorksheet('Packing List');
  ws.columns = [{width:4},{width:16},{width:8},{width:10},{width:28},{width:8},{width:7},{width:12},{width:12},{width:10}];
  var C = 10, d = data, R = _excTitle(ws, C, 'PACKING LIST', '装箱单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'SHIPMENT / 装运信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.shipperName||''), 'PO: ' + (d.poNo||''));
  R = _excInfoRow(ws, R, C, 'Phone: ' + (d.shipperPhone||''), 'Waybill: ' + (d.waybillNo||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', '');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||''), 'Port of Loading: ' + (d.portOfLoading||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Port of Discharge: ' + (d.portOfDischarge||''));
  R = _excInfoRow(ws, R, C, '', 'Vessel: ' + (d.vessel||''));
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.consigneeName||''), '');
  R = _excInfoRow(ws, R, C, 'Phone: ' + (d.consigneePhone||''), '');
  R++;

  var PL_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'marks', align:'center' },
    { field:'noOfPkgs', align:'center' },
    { field:'typeOfPackaging', align:'center' },
    { field:'description', align:'left' },
    { field:'qty', align:'center' },
    { field:'unitOfMeasure', align:'center' },
    { field:'grossWeight', align:'right', numFmt:'#,##0.00' },
    { field:'netWeight', align:'right', numFmt:'#,##0.00' },
    { field:'measurement', align:'right', numFmt:'#,##0.00' }
  ];
  var PL_HEADERS = [
    '#\n项号','MARKS\n唛头','NO.PKGS\n件数','PACKING\n包装','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'GROSS WT\n毛重(KG)','NET WT\n净重(KG)','MEAS.\n体积(CBM)'
  ];
  R = _excTableHeader(ws, R, PL_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, PL_COL_DEFS, it, idx);
  });

  // Totals
  if (d.totalPkgs || d.totalNetWeight || d.totalGrossWeight || d.totalMeasurement) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'TOTAL / 合计';
    ws.getCell(R, 1).font = { bold:true, size:11, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R, C);
    var parts = [];
    if (d.totalPkgs) parts.push('Pkgs: ' + d.totalPkgs);
    if (d.totalNetWeight) parts.push('N.W: ' + d.totalNetWeight + ' KG');
    if (d.totalGrossWeight) parts.push('G.W: ' + d.totalGrossWeight + ' KG');
    if (d.totalMeasurement) parts.push('Meas: ' + d.totalMeasurement + ' CBM');
    ws.getCell(R, 1).value = parts.join('  |  ');
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    R += 2;
  }

  // Remarks
  if (d.remarks) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Remarks: ' + d.remarks;
    ws.getCell(R, 1).font = { size:9, italic:true, name:'Arial' };
    ws.getCell(R, 1).alignment = _excLft;
    R += 2;
  }

  // Signature
  if (d.signatureName || d.signatureTitle || d.signatureDate) {
    R = _excSignatureBlock(ws, R, C, [
      'Signature: ' + (d.signatureName||'____________') + '    Title: ' + (d.signatureTitle||'') + '    Date: ' + (d.signatureDate||'')
    ]);
    R++;
  }

  _excSetPage(ws);
}

function _renderCommercialPackingList(wb, data) {
  var ws = wb.addWorksheet('Packing List');
  ws.columns = [{width:4},{width:28},{width:7},{width:9},{width:8},{width:10},{width:7},{width:12},{width:12},{width:10}];
  var C = 10, d = data, R = _excTitle(ws, C, 'COMMERCIAL PACKING LIST', '详细装箱单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'INVOICE INFO / 发票信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'SHIPMENT / 装运');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||''), 'Port of Loading: ' + (d.portOfLoading||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Port of Dest.: ' + (d.portOfDestination||d.portOfDischarge||''));
  R = _excInfoRow(ws, R, C, '', 'Vessel: ' + (d.vessel||''));
  R++;

  var CPL_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'description', align:'left' },
    { field:'numberOfPkgs', align:'center' },
    { field:'typeOfPackaging', align:'center' },
    { field:'qtyPerPkg', align:'center' },
    { field:'totalQty', align:'center' },
    { field:'unitOfMeasure', align:'center' },
    { field:'netWeightPerPkg', align:'right', numFmt:'#,##0.00' },
    { field:'grossWeightPerPkg', align:'right', numFmt:'#,##0.00' },
    { field:'measurementCBM', align:'right', numFmt:'#,##0.00' }
  ];
  var CPL_HEADERS = [
    '#\n项号','DESCRIPTION\n货品描述','PKGS\n件数','PACKING\n包装','QTY/PKG\n每箱数量',
    'TOTAL QTY\n总数量','UNIT\n单位','N.W/PKG\n单件净重','G.W/PKG\n单件毛重','CBM\n体积'
  ];
  R = _excTableHeader(ws, R, CPL_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, CPL_COL_DEFS, it, idx);
  });
  _excSetPage(ws);
}

function _renderTradeContract(wb, data) {
  var ws = wb.addWorksheet('Trade Contract');
  ws.columns = [{width:5},{width:16},{width:32},{width:8},{width:8},{width:12},{width:14}];
  var C = 7, d = data, R = _excTitle(ws, C, 'TRADE CONTRACT', '外贸合同');
  R++;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Contract No.: ' + (d.contractNo||'') + '    Date: ' + (d.dateOfSigning||'') + '    Place: ' + (d.placeOfSigning||'');
  ws.getCell(R, 1).font = { size:10, bold:true, name:'Arial' };
  ws.getRow(R).height = 22;
  R++;

  // Seller block (left) + Contract Info (right) + Buyer block (below)
  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'CONTRACT / 合同信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Currency: ' + (d.currency||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Payment: ' + (d.paymentTerms||''));
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.sellerName||''), 'Delivery: ' + (d.deliveryTerms||''));
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.sellerPhone||''), 'Shipment Date: ' + (d.shipmentDate||''));
  R = _excInfoRow(ws, R, C, 'Email: ' + (d.sellerEmail||''), '');
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.sellerTaxId||''), '');
  R++;

  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', '');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||''), '');
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||''), '');
  R = _excInfoRow(ws, R, C, 'Name: ' + (d.buyerName||''), '');
  R = _excInfoRow(ws, R, C, 'Tel: ' + (d.buyerPhone||''), '');
  R = _excInfoRow(ws, R, C, 'Email: ' + (d.buyerEmail||''), '');
  R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.buyerTaxId||''), '');
  R++;

  // 1. Description of Goods
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
    { field:'unitOfMeasure', align:'center' },
    { field:'unitPrice', align:'right', numFmt:'#,##0.00' },
    { field:'totalAmount', align:'right', numFmt:'#,##0.00' }
  ];
  var TC_HEADERS = [
    '#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'UNIT PRICE\n单价','AMOUNT\n金额'
  ];
  R = _excTableHeader(ws, R, TC_HEADERS);
  var totalAmt = 0;
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, TC_COL_DEFS, it, idx);
    totalAmt += parseFloat(it.totalAmount) || 0;
  });
  R = _excTotalRow(ws, R, C, 'TOTAL / 总价', 3, 7);
  ws.getCell(R-1, 7).value = (d.totalAmount || totalAmt.toFixed(2));
  R++;

  // 2. Shipping Terms
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = '2. Shipping Terms / 装运条款';
  ws.getCell(R, 1).font = _excSecFont;
  ws.getRow(R).height = 22;
  R++;
  [
    ['Packaging / 包装种类:', d.packagingType],
    ['Time of Shipment / 装运时间:', d.shipmentTime],
    ['Port of Loading / 装货港:', d.portOfLoading],
    ['Port of Discharge / 卸货港:', d.portOfDischarge],
    ['Partial & Transshipment / 分批与转船:', d.partialTransshipment]
  ].forEach(function(t) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = t[0] + '  ' + (t[1]||'');
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });

  // 3. Commercial Terms
  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = '3. Commercial Terms / 商业条款';
  ws.getCell(R, 1).font = _excSecFont;
  ws.getRow(R).height = 22;
  R++;
  var commTerms = [
    ['Insurance / 保险:', d.insuranceTerms],
    ['Inspection / 检验:', d.inspectionTerms],
    ['Force Majeure / 不可抗力:', d.forceMajeure]
  ];
  commTerms.forEach(function(t) {
    if (t[1]) {
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = t[0];
      ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
      R++;
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = t[1];
      ws.getCell(R, 1).font = { size:10, name:'Arial' };
      ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
      ws.getRow(R).height = 36; R++;
    }
  });

  // Arbitration
  if (d.arbitrationTerms) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Arbitration / 仲裁:';
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.arbitrationTerms;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    ws.getRow(R).height = 36; R++;
  }

  // Penalty
  if (d.penaltyClause) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = 'Penalty / 违约条款:';
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.penaltyClause;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
    ws.getRow(R).height = 36; R++;
  }

  // Signatures
  R++; ws.getRow(R).height = 4; R++;
  var sigMid = Math.ceil(C / 2);
  R = _excSplitHeader(ws, R, C, 'SELLER SIGNATURE / 卖方签章', 'BUYER SIGNATURE / 买方签章');
  R = _excSignatureBlock(ws, R, sigMid, [
    'Name: ' + (d.sellerSignatureName||''),
    'Title: ' + (d.sellerSignatureTitle||''),
    'Date: ' + (d.sellerSignatureDate||'')
  ]);
  // Rewind to write buyer sig block on the right at the same rows
  var buyerStartR = R - 3;
  var buyerFields = [
    'Name: ' + (d.buyerSignatureName||''),
    'Title: ' + (d.buyerSignatureTitle||''),
    'Date: ' + (d.buyerSignatureDate||'')
  ];
  buyerFields.forEach(function(f, idx) {
    ws.mergeCells(buyerStartR + idx, sigMid + 1, buyerStartR + idx, C);
    ws.getCell(buyerStartR + idx, sigMid + 1).value = f;
    ws.getCell(buyerStartR + idx, sigMid + 1).font = { size:10, name:'Arial' };
    ws.getCell(buyerStartR + idx, sigMid + 1).alignment = _excRgt;
    if (f.indexOf(':') > 0) ws.getCell(buyerStartR + idx, sigMid + 1).border = { bottom:{style:'thin'} };
  });
  R += 2;

  _excSetPage(ws);
}

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
  _blVal(ws, R, 1, 7, 'Email: ' + (d.notifyPartyEmail||''));
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
      var parts = [];
      if (c.containerNo || c.sealNo) parts.push((c.containerNo||'') + '/' + (c.sealNo||''));
      if (c.containerType) parts.push(c.containerType);
      if (c.cPkgs) parts.push(c.cPkgs + ' pkgs');
      if (c.cGrossWeight) parts.push(c.cGrossWeight + ' KG');
      if (c.cMeasurement) parts.push(c.cMeasurement + ' CBM');
      return parts.join('  ');
    }).join('  |  ');
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

function _renderCostEstimation(wb, data) {
  var ws = wb.addWorksheet('Cost Estimation');
  ws.columns = [{width:5},{width:22},{width:16},{width:12},{width:7},{width:12},{width:14},{width:12},{width:14},{width:12},{width:10}];
  var C = 11, d = data, R = _excTitle(ws, C, 'COST ESTIMATION', '成本估算单');
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

    // Mode badge with route details
    var routeParts = [MODE_LABELS[modeKey]];
    if (modeKey === 'sea') {
      if (d.containerSpec) routeParts.push(d.containerSpec);
      if (d.tradeTerms) routeParts.push(d.tradeTerms);
    } else if (modeKey === 'lcl') {
      if (d.tradeTerms) routeParts.push(d.tradeTerms);
    } else if (modeKey === 'air') {
      if (d.chargeableWeight) routeParts.push(d.chargeableWeight + 'kg');
    } else if (modeKey === 'courier' || modeKey === 'parcel') {
      if (d.cargoType) routeParts.push(d.cargoType);
      if (d.chargeableWeight) routeParts.push(d.chargeableWeight + 'kg');
    }
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = '  ' + routeParts.join(' · ');
    ws.getCell(R, 1).font = { size:10, bold:true, color:{argb:'FF004c99'}, name:'Arial' };
    ws.getCell(R, 1).fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFDCEAFF'} };
    ws.getRow(R).height = 22;
    R++;

    var CE_HEADERS = [
      '#\n项号','COST ITEM\n成本科目','SUPPLIER\n供应商','BASE PRICE\n底价','QTY\n数量',
      'OUR COST\n我司成本','TOTAL COST\n成本合计','SELL PRICE\n卖价','TOTAL SELL\n卖价合计','PROFIT\n毛利','NOTE\n备注'
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
          (parseFloat(it.totalSell)||0) - (parseFloat(it.totalCost)||0),
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
      ws.getCell(R, 10).value = (secSell - secCost).toFixed(2);
      ws.getCell(R, 10).font = { bold:true, size:10, name:'Arial' };
      ws.getCell(R, 10).alignment = _excRgt;
      ws.getCell(R, 10).numFmt = '#,##0.00';
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
    ws.getCell(R, 10).value = (grandSell - grandCost).toFixed(2);
    ws.getCell(R, 10).font = { bold:true, size:12, name:'Arial' };
    ws.getCell(R, 10).alignment = _excRgt;
    ws.getCell(R, 10).numFmt = '#,##0.00';
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

function _renderShipperLetterInstruction(wb, data) {
  var d = data, C = 10;

  function renderSLIMode(ws, modeData, modeLabel) {
    var R = _excTitle(ws, C, "SHIPPER'S LETTER INSTRUCTION", '发货人委托书');

    R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', modeLabel + ' INFO / ' + modeLabel + '信息');
    R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperName||''), 'Date: ' + (d.signatureDate||''));
    R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Payment: ' + (d.paymentTerms||''));
    R = _excInfoRow(ws, R, C, 'Tel: ' + (d.shipperPhone||''), '');
    R = _excInfoRow(ws, R, C, 'Email: ' + (d.shipperEmail||''), (modeLabel === 'OCEAN' ? 'BL Type: ' : '') + ((modeData && modeData.blType) || ''));
    R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.shipperTaxId||''), 'Insurance: ' + ((modeData && modeData.insuranceRequired) ? 'Yes' : 'No'));
    if (modeData && modeData.insuranceValue) {
      R = _excInfoRow(ws, R, C, '', 'Ins. Amt: ' + modeData.insuranceValue + ((modeData.currency && modeLabel !== 'OCEAN') ? ' ' + modeData.currency : ''));
    }
    R++;

    R = _excSplitHeader(ws, R, C, 'CLIENT / 委托人', '');
    R = _excInfoRow(ws, R, C, 'Name: ' + (d.clientName||''), '');
    R = _excInfoRow(ws, R, C, 'Address: ' + (d.clientAddress||''), '');
    R = _excInfoRow(ws, R, C, 'Contact: ' + (d.clientContact||''), '');
    R = _excInfoRow(ws, R, C, 'Tel: ' + (d.clientPhone||''), '');
    R = _excInfoRow(ws, R, C, 'Email: ' + (d.clientEmail||''), '');
    R++;

    R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', 'NOTIFY PARTY / 通知方');
    R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||''), 'Company: ' + (d.notifyPartyCompany||''));
    R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Address: ' + (d.notifyPartyAddress||''));
    R = _excInfoRow(ws, R, C, 'Contact: ' + (d.consigneeContact||''), 'Contact: ' + (d.notifyPartyContact||''));
    R = _excInfoRow(ws, R, C, 'Tel: ' + (d.consigneePhone||''), 'Tel: ' + (d.notifyPartyPhone||''));
    R = _excInfoRow(ws, R, C, 'Email: ' + (d.consigneeEmail||''), 'Email: ' + (d.notifyPartyEmail||''));
    R = _excInfoRow(ws, R, C, 'Tax ID: ' + (d.consigneeTaxId||''), 'Tax ID: ' + (d.notifyPartyTaxId||''));
    R++;

    R = _excSplitHeader(ws, R, C, 'TRANSPORT DETAILS / 运输细节', '');
    var pol = '', pod = '', etd = '';
    var vesselInfo = '';
    if (modeLabel === 'OCEAN') {
      pol = (modeData && modeData.portOfLoading) || '';
      pod = (modeData && modeData.portOfDischarge) || '';
      etd = (modeData && modeData.estSailingDate) || '';
      if (modeData && modeData.vessel) vesselInfo = 'Vessel: ' + modeData.vessel;
    } else {
      pol = (modeData && modeData.pol) || '';
      pod = (modeData && modeData.pod) || '';
      etd = (modeData && modeData.etd) || '';
      if (modeData && modeData.airline) vesselInfo = 'Airline: ' + modeData.airline + '  Flight: ' + (modeData.flightNo||'');
    }
    R = _excInfoRow(ws, R, C, 'POL / 起运港: ' + pol, 'POD / 目的港: ' + pod);
    R = _excInfoRow(ws, R, C, 'ETD / 预计出发: ' + etd, vesselInfo);
    if (modeLabel === 'OCEAN') {
      R = _excInfoRow(ws, R, C, 'Place of Delivery: ' + ((modeData && modeData.placeOfDelivery)||''), 'Trade Terms: ' + ((modeData && modeData.tradeTerms)||''));
      R = _excInfoRow(ws, R, C, 'Direct Voyage: ' + ((modeData && modeData.directVoyage === 'Y') ? 'Yes' : ((modeData && modeData.directVoyage === 'N') ? 'No' : (modeData && modeData.directVoyage)||'')), 'Free Demurrage: ' + ((modeData && modeData.freeDemurrage)||''));
      R = _excInfoRow(ws, R, C, 'Shipment Mode: ' + ((modeData && modeData.shipmentMode)||''), 'Container Info: ' + ((modeData && modeData.containerInfo)||''));
    } else {
      R = _excInfoRow(ws, R, C, 'Place of Delivery: ' + ((modeData && modeData.placeOfDelivery)||''), 'Trade Terms: ' + ((modeData && modeData.tradeTerms)||''));
      R = _excInfoRow(ws, R, C, 'Master/House: ' + ((modeData && modeData.masterHouse)||''), 'Accompanying Docs: ' + ((modeData && modeData.randomDocs)||''));
      var dgr = [];
      if (modeData && modeData.hasBattery) dgr.push('Battery');
      if (modeData && modeData.hasMagnet) dgr.push('Magnet');
      if (modeData && modeData.hasLiquidGas) dgr.push('Liquid/Gas');
      R = _excInfoRow(ws, R, C, 'Battery/Magnet/Liquid: ' + (dgr.length ? dgr.join(', ') : ''), '');
    }
    R++;

    // Items table (sea vs air have different columns)
    var itemColDefs, itemHeaders;
    if (modeLabel === 'OCEAN') {
      itemColDefs = [
        { field:'_idx', align:'center' },
        { field:'marks', align:'center' },
        { field:'description', align:'left' },
        { field:'hsCode', align:'center' },
        { field:'quantity', align:'center' },
        { field:'unitOfMeasure', align:'center' },
        { field:'weight', align:'right', numFmt:'#,##0.00' },
        { field:'volume', align:'right', numFmt:'#,##0.000' },
        { field:'value', align:'right', numFmt:'#,##0.00' }
      ];
      itemHeaders = [
        '#\n项号','MARKS\n唛头','DESCRIPTION\n货品描述','HS CODE\nHS编码','QTY\n数量',
        'UNIT\n单位','WEIGHT\n重量(KG)','VOLUME\n体积(CBM)','VALUE\n价值'
      ];
    } else {
      itemColDefs = [
        { field:'_idx', align:'center' },
        { field:'marks', align:'center' },
        { field:'description', align:'left' },
        { field:'hsCode', align:'center' },
        { field:'quantity', align:'center' },
        { field:'unitOfMeasure', align:'center' },
        { field:'weight', align:'right', numFmt:'#,##0.00' },
        { field:'length', align:'center' },
        { field:'width', align:'center' },
        { field:'height', align:'center' },
        { field:'volume', align:'right', numFmt:'#,##0.000' },
        { field:'value', align:'right', numFmt:'#,##0.00' }
      ];
      itemHeaders = [
        '#\n项号','MARKS\n唛头','DESCRIPTION\n货品描述','HS CODE\nHS编码','QTY\n数量',
        'UNIT\n单位','WEIGHT\n重量(KG)','LENGTH\n长(mm)','WIDTH\n宽(mm)','HEIGHT\n高(mm)',
        'VOLUME\n体积(CBM)','VALUE\n价值'
      ];
    }
    R = _excTableHeader(ws, R, itemHeaders);
    var items = (modeData && modeData.items) || [];
    items.forEach(function(it, idx) {
      R = _excDataRow(ws, R, itemColDefs, it, idx);
    });

    // Totals (per mode)
    if (modeLabel === 'OCEAN') {
      R++;
      ws.mergeCells(R, 1, R, 2);
      ws.getCell(R, 1).value = 'TOTAL PACKAGES: ' + ((modeData && modeData.totalPkgs)||'');
      ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 3, R, 4);
      ws.getCell(R, 3).value = 'TOTAL WEIGHT: ' + ((modeData && modeData.totalWeight)||'');
      ws.getCell(R, 3).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 6, R, 7);
      ws.getCell(R, 6).value = 'TOTAL VOLUME: ' + ((modeData && modeData.totalVolume)||'');
      ws.getCell(R, 6).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 8, R, C);
      ws.getCell(R, 8).value = 'TOTAL VALUE: ' + ((modeData && modeData.totalValue)||'');
      ws.getCell(R, 8).font = { bold:true, size:10, name:'Arial' };
      ws.getRow(R).height = 22;
    } else {
      R++;
      ws.mergeCells(R, 1, R, 2);
      ws.getCell(R, 1).value = 'TOTAL PKGS: ' + ((modeData && modeData.totalPkgs)||'');
      ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 3, R, 4);
      ws.getCell(R, 3).value = 'GROSS WT: ' + ((modeData && modeData.totalGrossWeight)||'');
      ws.getCell(R, 3).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 6, R, 7);
      ws.getCell(R, 6).value = 'VOLUME: ' + ((modeData && modeData.totalVolume)||'');
      ws.getCell(R, 6).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 8, R, 9);
      ws.getCell(R, 8).value = 'TOTAL VALUE: ' + ((modeData && modeData.totalValue)||'');
      ws.getCell(R, 8).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 10, R, 11);
      ws.getCell(R, 10).value = 'VOL WT: ' + ((modeData && modeData.volumeWeight)||'');
      ws.getCell(R, 10).font = { bold:true, size:10, name:'Arial' };
      ws.mergeCells(R, 12, R, C);
      ws.getCell(R, 12).value = 'CHG WT: ' + ((modeData && modeData.chargeableWeight)||'');
      ws.getCell(R, 12).font = { bold:true, size:10, name:'Arial' };
      ws.getRow(R).height = 22;
    }

    // Signature
    R++;
    ws.mergeCells(R, 1, R, Math.floor(C / 2));
    ws.getCell(R, 1).value = 'Shipper Signature: ' + (d.shipperSignature||'');
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.mergeCells(R, Math.floor(C / 2) + 1, R, C);
    ws.getCell(R, Math.floor(C / 2) + 1).value = 'Signature Date: ' + (d.signatureDate||'');
    ws.getCell(R, Math.floor(C / 2) + 1).font = { size:10, name:'Arial' };

    // Special instructions
    if (d.specialInstructions) {
      R++;
      ws.mergeCells(R, 1, R, C);
      ws.getCell(R, 1).value = 'Special Instructions / 特别指示: ' + d.specialInstructions;
      ws.getCell(R, 1).font = { size:9, italic:true, name:'Arial' };
    }

    _excSetPage(ws);
  }

  var hasSea = d.sea && d.sea.items && d.sea.items.length > 0;
  var hasAir = d.air && d.air.items && d.air.items.length > 0;

  if (hasSea) {
    var ws1 = wb.addWorksheet('Ocean (海运)');
    renderSLIMode(ws1, d.sea, 'OCEAN');
  }
  if (hasAir) {
    var ws2 = wb.addWorksheet('Air (空运)');
    renderSLIMode(ws2, d.air, 'AIR');
  }
  if (!hasSea && !hasAir) {
    var ws3 = wb.addWorksheet('SLI');
    var R2 = _excTitle(ws3, C, "SHIPPER'S LETTER INSTRUCTION", '发货人委托书');
    ws3.mergeCells(R2, 1, R2 + 2, C);
    ws3.getCell(R2, 1).value = 'No shipment data available.';
  }
}

function _renderProformaInvoice(wb, data) {
  var ws = wb.addWorksheet('Proforma Invoice');
  ws.columns = [{width:4},{width:14},{width:30},{width:10},{width:8},{width:8},{width:12},{width:14}];
  var C = 8, d = data, R = _excTitle(ws, C, 'PROFORMA INVOICE', '形式发票');
  R++;
  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'INVOICE INFO / 发票信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Invoice No.: ' + (d.proformaInvoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Date: ' + (d.dateOfIssue||''));
  R++;
  R = _excSplitHeader(ws, R, C, 'BUYER / 买方', 'TERMS / 条款');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.buyerCompany||''), 'Currency: ' + (d.currency||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.buyerAddress||''), 'Payment: ' + (d.paymentTerms||''));
  R++;
  var PI_COL_DEFS = [
    { field:'_idx', align:'center' }, { field:'itemNo', align:'center' },
    { field:'description', align:'left' }, { field:'hsCode', align:'center' },
    { field:'qty', align:'center' }, { field:'unitOfMeasure', align:'center' },
    { field:'unitPrice', align:'right', numFmt:'#,##0.00' }, { field:'totalAmount', align:'right', numFmt:'#,##0.00' }
  ];
  var PI_HEADERS = ['#\n项号','ITEM NO.\n编号','DESCRIPTION\n货品描述','HS CODE\nHS编码','QTY\n数量','UNIT\n单位','UNIT PRICE\n单价','AMOUNT\n金额'];
  R = _excTableHeader(ws, R, PI_HEADERS);
  (d.items||[]).forEach(function(it, idx) { R = _excDataRow(ws, R, PI_COL_DEFS, it, idx); });
  _excSetPage(ws);
}

function _renderCertificateOfOrigin(wb, data) {
  var ws = wb.addWorksheet('Certificate of Origin');
  ws.columns = [{width:4},{width:30},{width:30},{width:30}];
  var C = 4, d = data, R = _excTitle(ws, C, 'CERTIFICATE OF ORIGIN', '原产地证明');
  R++;
  var fields = [
    ['Exporter / 出口商:', d.exporterName||''],
    ['Address / 地址:', d.exporterAddress||''],
    ['Consignee / 收货人:', d.consigneeName||''],
    ['Address:', d.consigneeAddress||''],
    ['Country of Origin / 原产国:', d.countryOfOrigin||''],
    ['Destination Country / 目的国:', d.destinationCountry||''],
    ['Invoice No.:', d.invoiceNo||''],
    ['Date of Export:', d.dateOfExport||''],
    ['Transport / 运输方式:', d.meansOfTransport||'']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  _excSetPage(ws);
}

function _renderInsurancePolicy(wb, data) {
  var ws = wb.addWorksheet('Insurance Policy');
  ws.columns = [{width:4},{width:30},{width:30},{width:30}];
  var C = 4, d = data, R = _excTitle(ws, C, 'INSURANCE POLICY', '保险单');
  R++;
  var fields = [
    ['Policy No. / 保单号:', d.policyNo||''], ['Invoice No.:', d.invoiceNo||''],
    ['Insured / 投保人:', d.insuredName||''], ['Address / 地址:', d.insuredAddress||''],
    ['Conditions / 险别:', d.insuranceConditions||''],
    ['Total Insured / 投保金额:', d.totalInsuredAmount||''],
    ['Premium Rate / 保费率:', (d.premiumRate||'') + '%'], ['Premium Amount:', d.premiumAmount||''],
    ['Date / 日期:', d.dateOfInsurance||'']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  _excSetPage(ws);
}

function _renderCustomsDeclaration(wb, data) {
  var ws = wb.addWorksheet('Customs Declaration');
  ws.columns = [{width:4},{width:30},{width:30},{width:30}];
  var C = 4, d = data, R = _excTitle(ws, C, 'CUSTOMS DECLARATION', '报关单');
  R++;
  var fields = [
    ['Declarant / 申报人:', d.declarantName||''], ['Code / 代码:', d.declarantCode||''],
    ['Phone / 电话:', d.declarantPhone||''], ['Shipper / 发货人:', d.shipperName||''],
    ['Consignee / 收货人:', d.consigneeName||''], ['Trade Mode / 贸易方式:', d.tradeMode||''],
    ['Customs Port / 口岸:', d.customsPort||''], ['Transport / 运输:', d.transportMode||''],
    ['Invoice No.:', d.invoiceNo||''], ['Date / 日期:', d.dateOfDeclaration||'']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  _excSetPage(ws);
}

function _renderInspectionCertificate(wb, data) {
  var ws = wb.addWorksheet('Inspection Certificate');
  ws.columns = [{width:4},{width:30},{width:30},{width:30}];
  var C = 4, d = data, R = _excTitle(ws, C, 'INSPECTION CERTIFICATE', '检验证书');
  R++;
  var fields = [
    ['Certificate No. / 证书号:', d.certificateNo||''],
    ['Invoice No.:', d.invoiceNo||''], ['Contract No.:', d.contractNo||''],
    ['Inspector / 检验人:', d.inspectorName||''],
    ['Authority / 认证机构:', d.certifyingAuthority||'']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  _excSetPage(ws);
}

function _renderFumigationCertificate(wb, data) {
  var ws = wb.addWorksheet('Fumigation Certificate');
  ws.columns = [{width:4},{width:30},{width:30},{width:30}];
  var C = 4, d = data, R = _excTitle(ws, C, 'FUMIGATION CERTIFICATE', '熏蒸证书');
  R++;
  var fields = [
    ['Certificate No. / 证书号:', d.certificateNo||''], ['Invoice No.:', d.invoiceNo||''],
    ['Date of Issue / 签发日期:', d.dateOfIssue||''], ['Shipper / 发货人:', d.shipperName||''],
    ['Consignee / 收货人:', d.consigneeName||''], ['Fumigant / 熏蒸剂:', d.fumigant||''],
    ['Method / 方法:', d.fumigationMethod||''], ['Temperature / 温度:', d.fumigationTemperature||''],
    ['Duration / 时间:', d.fumigationDuration||''], ['Date / 日期:', d.fumigationDate||''],
    ['Location / 地点:', d.fumigationLocation||''], ['Remarks / 备注:', d.remarks||'']
  ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  _excSetPage(ws);
}

function _renderBeneficiaryCertificate(wb, data) {
  var ws = wb.addWorksheet('Beneficiary Certificate');
  ws.columns = [{width:4},{width:30},{width:30}];
  var C = 3, d = data, R = _excTitle(ws, C, 'BENEFICIARY CERTIFICATE', '受益人证明');
  R++;
  [ ['Beneficiary / 受益人:', d.beneficiaryName||''], ['Address / 地址:', d.beneficiaryAddress||''] ].forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20; R++;
  });
  R++; ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Declaration / 声明:'; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' }; R++;
  ws.mergeCells(R, 1, R+2, C); ws.getCell(R, 1).value = d.declaration || ''; ws.getCell(R, 1).font = { size:10, name:'Arial' }; ws.getCell(R, 1).alignment = { wrapText:true };
  _excSetPage(ws);
}

function _renderCurrencyConverter(wb, data) {
  var ws = wb.addWorksheet('Currency Converter');
  ws.columns = [{width:16},{width:16},{width:16}];
  var C = 3, d = data, R = _excTitle(ws, C, 'CURRENCY CONVERTER', '汇率换算');
  R++; ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Base Currency / 基准货币: ' + (d.baseCurrency||'CNY'); ws.getCell(R, 1).font = { size:11, name:'Arial' }; R++;
  ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Target Currency / 目标货币: ' + (d.targetCurrency||''); ws.getCell(R, 1).font = { size:10, name:'Arial' }; R++;
  ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Rate / 汇率: ' + (d.exchangeRate||''); ws.getCell(R, 1).font = { size:10, name:'Arial' }; R++;
  ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Amount / 金额: ' + (d.amount||''); ws.getCell(R, 1).font = { size:10, name:'Arial' };
  _excSetPage(ws);
}

function _renderInvoiceNumber(wb, data) {
  var ws = wb.addWorksheet('Invoice Number');
  ws.columns = [{width:20},{width:20},{width:20}];
  var C = 3, d = data, R = _excTitle(ws, C, 'INVOICE NUMBER', '发票编号');
  R += 2;
  var rows = [ ['Prefix / 前缀:', d.prefix||'INV'], ['Separator / 分隔符:', d.separator||'-'], ['Date Format / 日期格式:', d.dateFormat||'YYYYMMDD'], ['Sequence Digits / 序号位数:', String(d.sequenceDigits||'4')], ['Reset Rule / 重置规则:', d.resetRule||'monthly'] ];
  rows.forEach(function(r) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = r[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = r[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 22; R++;
  });
  _excSetPage(ws);
}

function _renderPaymentCalculator(wb, data) {
  var ws = wb.addWorksheet('Payment Calculator');
  ws.columns = [{width:20},{width:16},{width:16},{width:16}];
  var C = 4, d = data, R = _excTitle(ws, C, 'PAYMENT CALCULATOR', '付款条款计算器');
  R++; ws.mergeCells(R, 1, R, C); ws.getCell(R, 1).value = 'Contract Value / 合同金额: ' + (d.contractValue||'') + '  Currency: ' + (d.currency||'USD'); ws.getCell(R, 1).font = { size:11, name:'Arial' }; R += 2;
  var PC_HEADERS = ['STAGE\n阶段','PERCENTAGE\n比例','AMOUNT\n金额','DUE DATE\n到期'];
  R = _excTableHeader(ws, R, PC_HEADERS);
  var stages = [ { name:'Advance / 预付款', pct:d.advancePct||'0', amt:d.advanceAmount||'0.00', due:'Upon signing / 签订后' }, { name:'Shipment / 发货款', pct:d.shipmentPct||'0', amt:d.shipmentAmount||'0.00', due:'Before shipment / 发货前' }, { name:'Balance / 尾款', pct:d.balancePct||'0', amt:d.balanceAmount||'0.00', due:'After arrival / 到货后' } ];
  stages.forEach(function(s) {
    var dr = ws.getRow(R);
    dr.getCell(1).value = s.name; dr.getCell(1).font = { size:10, name:'Arial' }; dr.getCell(1).border = _excThinBlackBorder; dr.getCell(1).alignment = _excCtr;
    dr.getCell(2).value = s.pct + '%'; dr.getCell(2).font = { size:10, name:'Arial' }; dr.getCell(2).border = _excThinBlackBorder; dr.getCell(2).alignment = _excCtr;
    dr.getCell(3).value = parseFloat(s.amt); dr.getCell(3).font = { size:10, name:'Arial' }; dr.getCell(3).border = _excThinBlackBorder; dr.getCell(3).alignment = _excRgt; dr.getCell(3).numFmt = '#,##0.00';
    dr.getCell(4).value = s.due; dr.getCell(4).font = { size:10, name:'Arial' }; dr.getCell(4).border = _excThinBlackBorder; dr.getCell(4).alignment = _excCtr;
    dr.height = 22; R++;
  });
  _excSetPage(ws);
}

function _renderShippingMark(wb, data) {
  var ws = wb.addWorksheet('Shipping Mark');
  ws.columns = [{width:30},{width:30}];
  var C = 2, d = data, R = _excTitle(ws, C, 'SHIPPING MARK', '唛头');
  R += 2;
  var fields = [ ['Consignee / 收货人:', d.consigneeName||''], ['Destination / 目的港:', d.destinationPort||''], ['PO / 订单号:', d.poNumber||''], ['Package / 件号:', (d.packageNumberStart||'') + ' - ' + (d.packageNumberEnd||'')] ];
  fields.forEach(function(f) {
    ws.mergeCells(R, 1, R, 1); ws.getCell(R, 1).value = f[0]; ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    ws.mergeCells(R, 2, R, C); ws.getCell(R, 2).value = f[1]; ws.getCell(R, 2).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 22; R++;
  });
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
      case 'packing_list':
        _renderPackingList(wb, data);
        break;
      case 'commercial_packing_list':
        _renderCommercialPackingList(wb, data);
        break;
      case 'trade_contract':
        _renderTradeContract(wb, data);
        break;
      case 'bill_of_lading':
        _renderBillOfLading(wb, data);
        break;
      case 'cost_estimation':
        _renderCostEstimation(wb, data);
        break;
      case 'shipper_letter_instruction':
        _renderShipperLetterInstruction(wb, data);
        break;
      case 'proforma_invoice':
        _renderProformaInvoice(wb, data);
        break;
      case 'certificate_of_origin':
        _renderCertificateOfOrigin(wb, data);
        break;
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
      default:
        var ws = wb.addWorksheet('Sheet1');
        ws.getCell(1, 1).value = 'Export not available for: ' + dt;
        ws.getCell(1, 1).font = { size:14, name:'Arial' };
        ws.getCell(2, 1).value = 'Please select a document type with Excel export support.';
        ws.getCell(2, 1).font = { size:11, name:'Arial' };
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
