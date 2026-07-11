# Trade OS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Rebrand FormBeacon from Keel navy-blue to Trade OS amber-label style, rewrite the homepage as SaaS dashboard, restyle all 19 form pages, add print-to-preview-only, add AI command bar (v1 keyword routing).

**Architecture:** Pure CSS variable swap for color. common.js additions for nav, stats, AI, print. 5 template pages get sidebar injection. index.html rewritten. Existing rendering functions and data model stay untouched.

**Tech Stack:** Native HTML/CSS/JS, no framework. JetBrains Mono for monospace.

---

## File Structure Map

| File | Role | What changes |
|------|------|-------------|
| common.css | Global styles | CSS vars, global-nav, tab-bar, form-section, inputs, tables, totals, buttons, @media print |
| common.js | Shared logic | renderTopBar(), getDashboardStats(), printDoc(), handleAiCommand(), AI_ROUTES, sidebar injection, _updatedAt |
| index.html | Homepage | Rewrite to dashboard layout |
| 5 template HTMLs | Form pages | Add sidebar + tmpl-panel wrapper |
| 14 simple HTMLs | Form pages | AI prefill wire |
| E2E tests | Tests | Selector updates |

---

## Phase 1: CSS + Nav + Form Styles

### Task 1: Replace CSS variable system in common.css

- [ ] **Step 1: Replace the :root block** - Swap Keel colors for amber palette (bg=FAFAF8, accent=F59E0B). Keep old var names as aliases for backward compat.
- [ ] **Step 2: Add .mono utility**
- [ ] **Step 3: Commit**

### Task 2: Add global-nav, tab-bar, form section, input, table, totals, button, and print styles

- [ ] **Step 1: Append .global-nav + .breadcrumb styles** (sticky nav, logo, nav-btn, nav-status)
- [ ] **Step 2: Append .tab-bar + .tab-btn styles** (flex container, amber active state, .tab-mono)
- [ ] **Step 3: Append .form-section + .fs-header + .fs-title + .fs-badge** (boxed cards, mono-header)
- [ ] **Step 4: Append input/select/textarea + .ff-label + .ff-req** (amber focus ring, FDFCF9 background)
- [ ] **Step 5: Append .item-table + table input + .btn-add-item + .row-num** (mono headers, amber totals)
- [ ] **Step 6: Append .totals-row + .total-value** (amber-light background, bold mono numbers)
- [ ] **Step 7: Append .btn + .action-bar** (btn-primary amber, btn-outline, btn-amber)
- [ ] **Step 8: Append @media print** - hide all UI chrome, show only #panel-preview
- [ ] **Step 9: Commit**

Reference mockup: brainstorm/session-1/trade-os-form-page.html

---

## Phase 2: common.js Logic Changes

### Task 3: Rewrite renderTopBar() to Trade OS global-nav

- [ ] **Step 1: Replace function body** - Output .global-nav with logo + breadcrumb (form pages) or nav links + SYS OK (home). Keep id=lang-btn, id=theme-btn unchanged for E2E tests.
- [ ] **Step 2: Wire export-pdf button**
- [ ] **Step 3: Commit**

### Task 4: Add _updatedAt + dashboard stats + recent docs functions

- [ ] **Step 1: Add data._updatedAt = Date.now() inside saveDocData()** before localStorage.setItem
- [ ] **Step 2: Add functions** - getDashboardStats(), getDocRef(), getDocSummary(), getRecentDocuments(), getTimeAgo()
- [ ] **Step 3: Commit**

Full implementations: docs/superpowers/specs/2026-07-11-trade-os-redesign-design.md Step 5.4

### Task 5: Add print + sidebar/tmpl-panel injection functions

- [ ] **Step 1: Add printDoc(dt) and printDocClean(previewHTML, title)** - Full code: design spec Step 6
- [ ] **Step 2: Add renderSidebar(), renderTmplPanel(), scrollToSection(), injectThreeColumnLayout()** - Full code: design spec Step 6
- [ ] **Step 3: Commit**

### Task 6: Add AI routing + LLM functions

- [ ] **Step 1: Add AI_ROUTES object** - 20+ keyword to page mappings (Chinese + English)
- [ ] **Step 2: Add handler functions** - matchKeywordRoute(), handleAiCommand(), showAiHint(), getAiConfig(), callLLM(), handleAiGenerate(), loadAiPrefill(), mergeAiFields(), showAiSuggestion()
- [ ] **Step 3: Commit**

Full code: design spec Step 7

---

## Phase 3: Homepage Rewrite

### Task 7: Rewrite index.html as Trade OS dashboard

- [ ] **Step 1: Replace entire index.html** - JS-rendered dashboard with: global-nav, hero (TRADE_OS title + stats), AI bar (>_ cursor + input), stats row (4 cards), recent docs panel (clickable rows), quick actions (4 buttons), two tool grids (9 doc + 10 util), footer
- [ ] **Step 2: Append homepage CSS to common.css** - .container, .hero, .section-label, .stats-row, .stat-card, .mid-row, .panel, .doc-row, .quick-actions, .ai-bar, .tools-grid, .tool-card, .page-footer, responsive breakpoints
- [ ] **Step 3: Commit**

Reference mockup: brainstorm/session-1/trade-os-amber-full.html

---

## Phase 4: Template Page Layout Injection

### Task 8: Inject three-column layout into 5 template pages

- [ ] **Step 1: In each template page init(), add after renderAll():** call injectThreeColumnLayout() with page-specific constants
- [ ] **Step 2: In each renderForm(), wrap sections with <div id=section-NAME>** for sidebar anchor targeting
- [ ] **Step 3: Commit** - commercial-invoice, packing-list, commercial-packing-list, commercial-quotation, trade-contract

---

## Phase 5: AI Prefill Wiring

### Task 9: Wire AI prefill into all 19 page init() functions

- [ ] **Step 1: In each init(), insert after loadDocData():** Check loadAiPrefill(DT), if present and no saved data, merge fields into defaults and save. Show suggestion toast.
- [ ] **Step 2: Commit all 19 HTML files**

---

## Phase 6: Testing and Polish

### Task 10: Adapt E2E tests

- [ ] **Step 1: Run existing tests** - cd forward-kit-e2e && npx playwright test. Identify failures from .top-bar to .global-nav change.
- [ ] **Step 2: Update selectors** - Fix any test using .top-bar. Verify #lang-btn, #theme-btn still exist.
- [ ] **Step 3: Re-run and commit** - All 83 tests should pass.

### Task 11: Visual verification

- [ ] **Step 1: Open index.html** - Check dashboard layout, AI bar, tool grid links, stats populated
- [ ] **Step 2: Open commercial-invoice.html** - Three-column layout, amber themed inputs, tabs, totals bar
- [ ] **Step 3: Open bill-of-lading.html** - Single-column, styled inputs
- [ ] **Step 4: Open currency-converter.html** - Simple page, styled inputs
- [ ] **Step 5: Fix any visual bugs, commit remaining changes**