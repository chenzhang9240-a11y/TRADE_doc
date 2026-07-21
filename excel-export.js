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

function _renderPackingList(wb, data) {
  var ws = wb.addWorksheet('Packing List');
  ws.columns = [{width:4},{width:16},{width:28},{width:8},{width:7},{width:12},{width:12},{width:10}];
  var C = 8, d = data, R = _excTitle(ws, C, 'PACKING LIST', '装箱单');
  R++;

  R = _excSplitHeader(ws, R, C, 'SHIPPER / 发货人', 'SHIPMENT / 装运信息');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.shipperCompany||''), 'Invoice: ' + (d.invoiceNo||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.shipperAddress||''), 'Date: ' + (d.dateOfExport||''));
  R++;

  R = _excSplitHeader(ws, R, C, 'CONSIGNEE / 收货人', '');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.consigneeCompany||''), 'Port of Loading: ' + (d.portOfLoading||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.consigneeAddress||''), 'Port of Discharge: ' + (d.portOfDischarge||''));
  R = _excInfoRow(ws, R, C, '', 'Vessel: ' + (d.vessel||''));
  R++;

  var PL_COL_DEFS = [
    { field:'_idx', align:'center' },
    { field:'marks', align:'center' },
    { field:'description', align:'left' },
    { field:'qty', align:'center' },
    { field:'unitOfMeasure', align:'center' },
    { field:'grossWeight', align:'right', numFmt:'#,##0.00' },
    { field:'netWeight', align:'right', numFmt:'#,##0.00' },
    { field:'measurement', align:'right', numFmt:'#,##0.00' }
  ];
  var PL_HEADERS = [
    '#\n项号','MARKS\n唛头','DESCRIPTION\n货品描述','QTY\n数量','UNIT\n单位',
    'GROSS WT\n毛重(KG)','NET WT\n净重(KG)','MEAS.\n体积(CBM)'
  ];
  R = _excTableHeader(ws, R, PL_HEADERS);
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, PL_COL_DEFS, it, idx);
  });
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

  R = _excSplitHeader(ws, R, C, 'SELLER / 卖方', 'BUYER / 买方');
  R = _excInfoRow(ws, R, C, 'Company: ' + (d.sellerCompany||''), 'Company: ' + (d.buyerCompany||''));
  R = _excInfoRow(ws, R, C, 'Address: ' + (d.sellerAddress||''), 'Address: ' + (d.buyerAddress||''));
  R++;

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
  var totalAmount = 0;
  (d.items||[]).forEach(function(it, idx) {
    R = _excDataRow(ws, R, TC_COL_DEFS, it, idx);
    totalAmount += parseFloat(it.totalAmount) || 0;
  });
  R = _excTotalRow(ws, R, C, 'TOTAL / 总价', 3, 7);
  ws.getCell(R-1, 7).value = totalAmount.toFixed(2);
  R += 2;

  ws.mergeCells(R, 1, R, C);
  ws.getCell(R, 1).value = 'Total Amount in Words / 总金额大写: ' + (d.remarks||'');
  ws.getCell(R, 1).font = { size:10, italic:true, name:'Arial' };
  R += 2;

  var terms = [
    { label:'2. Currency / 币种', val:d.currency },
    { label:'3. Payment Terms / 付款条件', val:d.paymentTerms },
    { label:'4. Delivery Terms / 交货条款', val:d.deliveryTerms },
    { label:'5. Shipment Date / 装船日期', val:d.shipmentDate },
    { label:'6. Port of Loading / 装运港', val:d.portOfLoading },
    { label:'7. Port of Discharge / 卸货港', val:d.portOfDischarge },
    { label:'8. Packaging / 包装', val:d.packagingType },
    { label:'9. Insurance / 保险', val:d.insuranceTerms },
    { label:'10. Inspection / 检验', val:d.inspectionTerms }
  ];
  terms.forEach(function(t) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = t.label + ':  ' + (t.val||'');
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getRow(R).height = 20;
    R++;
  });

  if (d.arbitrationTerms) {
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = '11. Arbitration / 仲裁:';
    ws.getCell(R, 1).font = { bold:true, size:10, name:'Arial' };
    R++;
    ws.mergeCells(R, 1, R, C);
    ws.getCell(R, 1).value = d.arbitrationTerms;
    ws.getCell(R, 1).font = { size:10, name:'Arial' };
    ws.getCell(R, 1).alignment = { wrapText:true, vertical:'top' };
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
      case 'packing_list':
        _renderPackingList(wb, data);
        break;
      case 'commercial_packing_list':
        _renderCommercialPackingList(wb, data);
        break;
      case 'trade_contract':
        _renderTradeContract(wb, data);
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
