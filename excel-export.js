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
  var d = data;

  // ===== 12 columns: A-L =====
  ws.columns = [
    { width: 6 },   // A: 项号
    { width: 16 },  // B: 唛头/编号
    { width: 8 },   // C: 件数
    { width: 12 },  // D: 包装类型
    { width: 10 },  // E: 原产国
    { width: 30 },  // F: 货品完整描述
    { width: 12 },  // G: HS编码
    { width: 8 },   // H: 数量
    { width: 8 },   // I: 单位
    { width: 10 },  // J: 重量(KG)
    { width: 12 },  // K: 单价
    { width: 14 },  // L: 总价
  ];

  var r = 1;

  // ===== Row 1: Title =====
  ws.mergeCells(r, 1, r, 12);
  var title = ws.getCell(r, 1);
  title.value = '商业发票';
  title.font = { size: 18, bold: true, color: { argb: DEEP_BLUE }, name: 'Arial' };
  title.alignment = _excCtr;
  ws.getRow(r).height = 40;
  r++;

  // ===== Row 2-3: Shipper info =====
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = '发货人/出口商：' + (d.shipperCompany || '');
  ws.getCell(r, 1).font = { size: 11, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 26;
  r++;

  // Row 3: Shipper address + phone + taxId
  var shipperDetail = '';
  if (d.shipperAddress) shipperDetail += d.shipperAddress;
  if (d.shipperPhone) shipperDetail += (shipperDetail ? '    ' : '') + 'Tel: ' + d.shipperPhone;
  if (d.shipperTaxId) shipperDetail += (shipperDetail ? '    ' : '') + 'Tax ID: ' + d.shipperTaxId;
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = shipperDetail;
  ws.getCell(r, 1).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 22;
  r++;

  // ===== Invoice info row =====
  var invoiceLine = '';
  if (d.invoiceNo) invoiceLine += '发票号 Invoice No.: ' + d.invoiceNo;
  if (d.dateOfExport) invoiceLine += (invoiceLine ? '    ' : '') + '日期 Date: ' + d.dateOfExport;
  if (d.poNo) invoiceLine += (invoiceLine ? '    ' : '') + 'PO: ' + d.poNo;
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = invoiceLine;
  ws.getCell(r, 1).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 22;
  r++;

  // ===== Consignee =====
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = '收货人/买方：' + (d.consigneeCompany || d.consigneeName || '');
  ws.getCell(r, 1).font = { size: 11, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 26;
  r++;

  var consigneeLine = '';
  if (d.consigneeAddress) consigneeLine += d.consigneeAddress;
  if (d.consigneePhone) consigneeLine += (consigneeLine ? '    ' : '') + 'Tel: ' + d.consigneePhone;
  if (d.consigneeTaxId) consigneeLine += (consigneeLine ? '    ' : '') + 'Tax ID: ' + d.consigneeTaxId;
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = consigneeLine;
  ws.getCell(r, 1).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 22;
  r++;

  // ===== Payment + Currency + L/C info row =====
  var termsLine = '';
  if (d.paymentTerms) termsLine += '付款方式 Payment: ' + d.paymentTerms;
  if (d.currency) termsLine += (termsLine ? '    ' : '') + '币种 Currency: ' + d.currency;
  if (d.lCNo) termsLine += (termsLine ? '    ' : '') + 'L/C: ' + d.lCNo;
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = termsLine;
  ws.getCell(r, 1).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  ws.getRow(r).height = 22;
  r++;

  // ===== Blank separator row =====
  ws.getRow(r).height = 8;
  r++;

  // ===== Table header row =====
  var headers = [
    '项号', '唛头/编号', '件数', '包装类型', '原产国',
    '货品完整描述', 'HS编码', '数量', '单位', '重量(KG)', '单价', '总价'
  ];
  // Bilingual header
  var headerEn = [
    'No.', 'MARKS', 'PKGS', 'PACKING', 'ORIGIN',
    'DESCRIPTION', 'HS CODE', 'QTY', 'UNIT', 'WEIGHT', 'UNIT PRICE', 'AMOUNT'
  ];
  var headerRow = ws.getRow(r);
  headers.forEach(function(h, i) {
    var cell = headerRow.getCell(i + 1);
    cell.value = h + '\n' + headerEn[i];
    cell.fill = _excHeaderFill;
    cell.font = _excWhiteFont;
    cell.border = _excThinWhiteBorder;
    cell.alignment = _excCtr;
  });
  headerRow.height = 36;
  r++;

  // ===== Data rows =====
  var items = d.items || [];
  var invoiceTotal = 0;
  items.forEach(function(item, idx) {
    var rowData = [
      idx + 1,
      item.marks || '',
      item.noOfPkgs || '',
      item.typeOfPackaging || '',
      item.countryOfOrigin || '',
      item.description || '',
      item.hsCode || '',
      item.qty || '',
      item.unitOfMeasure || '',
      item.weight || '',
      parseFloat(item.unitValue) || '',
      parseFloat(item.totalValue) || ''
    ];
    var dataRow = ws.getRow(r);
    rowData.forEach(function(val, i) {
      var cell = dataRow.getCell(i + 1);
      cell.value = val;
      cell.border = _excThinBlackBorder;
      cell.font = { size: 10, name: 'Arial' };
      // Alignment: center for No., Marks, PKGS, Packing, Origin, HS Code, QTY, Unit
      // Left for Description
      // Right for Weight, Unit Price, Amount
      if (i === 0 || i === 1 || i === 2 || i === 3 || i === 4 || i === 6 || i === 7 || i === 8) {
        cell.alignment = _excCtr;
      } else if (i === 5) {
        cell.alignment = _excLft;
      } else {
        cell.alignment = _excRgt;
        cell.numFmt = '#,##0.00';
      }
    });
    dataRow.height = 22;
    invoiceTotal += parseFloat(item.totalValue) || 0;
    r++;
  });

  // ===== Total row =====
  var totalData = [];
  for (var i = 0; i < 11; i++) totalData.push('');
  totalData[5] = '总价合计 TOTAL';  // column F
  totalData[11] = d.totalInvoiceValue || invoiceTotal.toFixed(2);  // column L
  var totalRow = ws.getRow(r);
  totalData.forEach(function(val, i) {
    var cell = totalRow.getCell(i + 1);
    cell.value = val;
    cell.font = { bold: true, size: 11, name: 'Arial' };
    cell.border = {
      top: { style: 'double', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    if (i === 11) {
      cell.alignment = _excRgt;
      cell.numFmt = '#,##0.00';
    } else if (i === 5) {
      cell.alignment = _excRgt;
    } else {
      cell.alignment = _excCtr;
    }
  });
  totalRow.height = 26;
  r += 2;

  // ===== Declaration =====
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = d.declaration || '';
  ws.getCell(r, 1).font = { size: 10, italic: true, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excLft;
  r += 2;

  // ===== Signature (right-aligned) =====
  ws.mergeCells(r, 8, r, 12);
  ws.getCell(r, 8).value = '签名 Signature：' + (d.signatureName || '____________________');
  ws.getCell(r, 8).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 8).alignment = _excRgt;
  ws.getCell(r, 8).border = {
    bottom: { style: 'thin', color: { argb: 'FF000000' } }
  };
  r++;
  ws.mergeCells(r, 8, r, 12);
  ws.getCell(r, 8).value = '职务 Title：' + (d.signatureTitle || '');
  ws.getCell(r, 8).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 8).alignment = _excRgt;
  r++;
  ws.mergeCells(r, 8, r, 12);
  ws.getCell(r, 8).value = '日期 Date：' + (d.signatureDate || '');
  ws.getCell(r, 8).font = { size: 10, name: 'Arial' };
  ws.getCell(r, 8).alignment = _excRgt;
  ws.getCell(r, 8).border = {
    bottom: { style: 'thin', color: { argb: 'FF000000' } }
  };
  r++;

  // ===== Footer =====
  r += 1;
  ws.mergeCells(r, 1, r, 12);
  ws.getCell(r, 1).value = d.footerNote || '';
  ws.getCell(r, 1).font = { size: 9, color: { argb: 'FF888888' }, name: 'Arial' };
  ws.getCell(r, 1).alignment = _excCtr;

  // ===== Freeze panes (header area) =====
  var freezeRow = r - 2; // freeze above signature
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: freezeRow }];

  // ===== Print settings =====
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 }
  };
}

// ===== Main Export Entry =====

function doExportExcel(dt, data) {
  ensureExcelJs().then(function() {
    var wb = new ExcelJS.Workbook();
    wb.creator = 'TradeKit';
    wb.created = new Date();

    switch(dt) {
      case 'commercial_invoice':
        _renderCommercialInvoice(wb, data);
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
