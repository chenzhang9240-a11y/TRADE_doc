# Trade Contract Preview Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize Trade Contract preview style per hetong.html template, add Shipping Terms section, restructure layout.

**Architecture:** Modify common.js data model (3 new fields), restructure trade-contract.html renderForm() and renderPreview().

**Tech Stack:** Vanilla HTML/CSS/JS, existing .invoice-preview CSS classes.

## Global Constraints

- Use `var` for variable declarations (project convention)
- Use existing `esc()`, `pv()` helpers
- All changes in 2 files: common.js (1 edit) + trade-contract.html (render functions rewrite)
- Must match existing #1d3557 navy unified style from common.css invoice-preview

---

### Task 1: Add 3 new fields to trade_contract data model

**Files:**
- Modify: `common.js:643-653`

- [ ] Add `packagingType`, `shipmentTime`, `partialTransshipment` to getDefaultDoc('trade_contract'):

```javascript
case 'trade_contract': return {
  logo:'', contractNo:'', dateOfSigning:'', placeOfSigning:'',
  sellerName:'', sellerCompany:'', sellerAddress:'', sellerPhone:'', sellerEmail:'', sellerTaxId:'',
  buyerName:'', buyerCompany:'', buyerAddress:'', buyerPhone:'', buyerEmail:'', buyerTaxId:'',
  currency:'USD', paymentTerms:'', deliveryTerms:'', shipmentDate:'',
  portOfLoading:'', portOfDischarge:'',
  packagingType:'', shipmentTime:'', partialTransshipment:'',
  insuranceTerms:'', inspectionTerms:'', forceMajeure:'', arbitrationTerms:'',
  items:[empty], totalAmount:'', penaltyClause:'',
  sellerSignatureName:'', sellerSignatureTitle:'', sellerSignatureDate:'',
  buyerSignatureName:'', buyerSignatureTitle:'', buyerSignatureDate:''
};
```

---

### Task 2: Restructure renderForm() — add Shipping Terms section, move port fields

**Files:**
- Modify: `trade-contract.html:106-181`

- [ ] In the Contract Info section (line ~119-124), remove portOfLoading and portOfDischarge fields
- [ ] Add new Shipping Terms section card after Contract Info, before Seller Info:

```javascript
// Shipping Terms (before Seller Info)
h+='<div class="section-card"><h3>'+fB(isZh?'装运条款':'Shipping Terms','')+'</h3><div class="field-grid" style="grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));">';
h+=lI(isZh?'包装种类':'Packaging Type',d.packagingType,'packagingType','');
h+=lI(isZh?'装运时间':'Time of Shipment',d.shipmentTime,'shipmentTime','');
h+=lI(isZh?'装货港':'Port of Loading',d.portOfLoading,'portOfLoading','');
h+=lI(isZh?'卸货港':'Port of Discharge',d.portOfDischarge,'portOfDischarge','');
h+='</div>';
h+='<div style="margin-top:12px;"><div class="form-label">'+(isZh?'分批与转船条款':'Partial Shipment & Transshipment')+'</div><input class="input-field" value="'+esc(d.partialTransshipment)+'" onchange="window._tcSet(\'partialTransshipment\',this.value)"></div>';
h+='</div>';
```

---

### Task 3: Rewrite renderPreview() — new layout per hetong.html style

**Files:**
- Modify: `trade-contract.html:183-231`

Full rewrite of renderPreview() with:
- [ ] **Header**: Georgia serif title with 3px #1d3557 bottom border
- [ ] **Top section**: Flex layout — left column (Seller + Buyer), right column (Contract meta info)
- [ ] **Items table**: Full bordered table with #1d3557 headers
- [ ] **Shipping Terms**: clause-line style with label+value
- [ ] **Commercial Terms**: clause-line style with label+value
- [ ] **Penalty Clause**: clause-line style
- [ ] **Signature**: Two-column with signature boxes (1px #1d3557 border)

---

### Task 4: Update loadSample() with new field sample values

**Files:**
- Modify: `trade-contract.html:265-275`

- [ ] Add sample values for new fields:

```javascript
s.packagingType = 'Wooden Case';
s.shipmentTime = 'Within 90 days';
s.partialTransshipment = 'Partial shipment & transshipment allowed';
```
