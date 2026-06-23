# TradeKit (forwarded_kit) — CLAUDE.md

## 项目概述

TradeKit 是免费开源的外贸单证生成工具，支持 19 种国际贸易单证，中英双语，A4 横版 PDF 一键导出。

- 线上地址：http://tradekit.treedeep.cn/
- 技术栈：原生 HTML/CSS/JavaScript（纯前端，无后端）
- PDF 导出：html2pdf.js（CDN 加载）
- 数据存储：浏览器 localStorage，不上传服务器
- 许可证：MIT
- 当前目录：`c:\Users\chenz\Documents\GitHub\forward_kit`

## 开发工作流

### 分支策略
- **main 分支永远保持稳定**，原始代码不受影响
- 所有新功能在**功能分支**上开发：`git checkout -b feature/<feature-name>`
- 验收通过后合并到 main，验收不通过则删除分支，main 完好无损
- 分步提交，每一步都可回滚：`git revert <commit-id>`

### 变更原则
- 尽量以"新增"为主，不修改原有稳定逻辑
- 在已有页面中新增功能时，通过条件判断来控制渲染，不影响原有功能路径
- 回退时只需删除新增代码，原有功能完全不受影响

## 正在实施的功能：字段配置与模板管理

### 设计确认

#### UI 布局
- 模板工具栏位于表单上方常驻：
  `[⚙ 字段配置] │ 模板: [下拉选择器 ▼] [💾保存] [+新建] [🗑删除]`
- ⚙ 字段配置 → 弹出模态框
- 删除按钮仅自定义模板时显示

#### 必填字段（不可取消，灰色禁用）
- 每种单证类型有自己的必填字段集合，在实施具体页面时确定
- 字段值用 `'required'` 表示必填（不可取消），`true/false` 表示可选

#### 商品表列默认状态
- 每种单证类型的商品明细表列默认勾选/不勾选在实施时定义
- 至少保证最核心的字段（如描述、数量、单价、总价等）默认开启

#### 模板操作
- **新建模板**：全部字段清空 → 用户从零勾选 → 点 [💾保存] → 输入名称 → 保存
- **修改已有模板**：选模板 → 修改勾选 → 点 [💾保存] → 覆盖原模板
- **删除模板**：选自定义模板 → 点 [🗑删除] → 确认弹窗 → 移除
- **切换模板**：下拉选择 → 表单和预览立即按新模板渲染，已填数据保留
- 内置"完整版 (默认)"模板（`builtIn: true`）不可删除、不可改名

#### 模板数据模型
```javascript
// localStorage 键: '<doc_type>_templates_v1'，如 'commercial_invoice_templates_v1'
// 结构:
{
  currentTemplateId: 'tmpl_default',
  previewLang: 'zh',       // 模板控制预览默认语言
  templates: [
    {
      id: 'tmpl_default',
      name: '完整版 (默认)',
      builtIn: true,        // 内置模板不可删除、不可改名
      previewLang: 'zh',
      fields: {
        // 每个字段路径: 'section.fieldName' → 'required'(必填) / true(显示) / false(隐藏)
        'shipper.company': 'required',
        'shipper.address': 'required',
        'shipper.name': true,
        // 具体字段键名由每种单证类型定义
      }
    }
  ]
}
```

#### 排版策略（方案 A：智能自动布局）
- 隐藏的 Section（如 Importer）完全删除 DOM，不留白
- 区块内某行隐藏时，其他行紧凑排列，不留空行
- 表格隐藏的列不渲染 `<th>`/`<td>`，剩余列按比例自动分配宽度
- 签名区根据选中的字段数量自适应高度和排列方式

#### 入口与数据留存
- 字段配置弹窗从模板工具栏的 [⚙字段配置] 按钮打开
- 模板切换时 `/` 已填表单数据（`data`对象）**完全保留**
- 模板仅控制显示/隐藏，隐藏字段的数据不丢失，切回时恢复

## 代码架构

### 文件结构
```
forward_kit/
├── *.html                   # 各单证页面（当前项目使用静态 HTML 版）
├── common.css               # 共享样式（CSS 变量、暗黑主题、响应式）
├── common.js                # 共享逻辑（i18n、数据存储、PDF 导出、FAQ）
├── html2pdf.bundle.min.js   # PDF 生成库（CDN）
├── CLAUDE.md                # 本文件
└── README.md                # 项目文档
```

### 每个单证页面的模板模式
1. 常量 `var DT = 'commercial_invoice'` 定义文档类型
2. 状态 `data` 对象持有所有表单数据
3. 五个渲染函数：`renderTopBar()`、`renderHeader()`、`renderTabs()`、`renderForm()`、`renderPreview()`、`renderHistory()`
4. 三标签页：Form Editor / Preview / History
5. 数据流：表单 → data 对象 → saveDocData() → localStorage，同时触发 re-render

### i18n 模式
- `I18N` 对象包含 `zh` 和 `en` 两个语言包
- 语言检测优先级：localStorage → IP 地理探测 → 浏览器语言
- 辅助函数：`t(zh, en)` 根据当前语言返回对应文本

## 编码规范

- 使用 `var` 声明变量（项目现有风格，保持一致）
- 全局变量和函数通过 `window._ciXxx` 方式暴露给内联事件
- 使用 `function` 关键字定义函数（与现有代码一致）
- CSS 使用自定义属性（`--var-name`）实现主题切换
- 事件绑定使用 `onclick` 属性（与现有代码一致）
- HTML 转义使用 `esc(str)` 辅助函数

## 决策记录

| 日期 | 决策 |
|------|------|
| 2026-06-23 | 字段配置采用方案 A+C 混合：模板下拉 + 字段配置弹窗 |
| 2026-06-23 | 字段粒度走细粒度，每个字段独立开关 |
| 2026-06-23 | 排版采用方案 A（智能自动布局），不引入布局模板选择 |
| 2026-06-23 | 功能在 `feature/field-template` 分支开发 |
