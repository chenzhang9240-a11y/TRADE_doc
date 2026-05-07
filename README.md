# TradeKit

免费开源的外贸单证生成工具，支持 19 种国际贸易单证，中英双语，A4 横版 PDF 一键导出。

网站：http://tradekit.treedeep.cn/

---

## 功能

- **19 种外贸单证** — 商业发票、装箱单、提单、合同、原产地证明、报关单、熏蒸证书等
- **实用工具** — 汇率换算、付款条款计算器、发票编号生成器、唛头生成器
- **中英双语** — 页面一键切换，单证中英对照
- **自动计算** — 件数、重量、货值、CBM 自动汇总
- **PDF 导出** — A4 横版格式，一键导出，专业排版
- **数据本地** — 所有数据存在浏览器 localStorage，不上传任何服务器
- **无需注册** — 打开即用

## 技术栈

- **SPA** — React 18 + TypeScript + Vite
- **静态页面** — 原生 HTML/CSS/JavaScript
- **PDF** — html2pdf.js
- **图标** — lucide-react

## 项目结构

```
├── html/                  # 静态 HTML 版本（19 个单证页面）
│   ├── index.html         # 首页
│   ├── common.css         # 共享样式
│   ├── common.js          # 共享逻辑（i18n、FAQ、语言检测）
│   └── *.html             # 各单证页面
├── src/                   # SPA 源码（React）
│   ├── App.tsx            # 路由入口
│   ├── components/        # 各单证组件
│   └── lib/               # 工具函数
├── nginx.conf             # nginx 配置
└── public/                # SPA 静态资源
```

## 本地开发

```bash
npm install
npm run dev        # SPA 开发服务器
```

静态 HTML 版本直接在浏览器中打开 `html/index.html` 即可。

## 构建部署

```bash
npm run build      # 构建 SPA 到 dist/
```

部署方案：
- `html/` 目录部署到静态服务器（tradekit.treedeep.cn）
- `dist/` 目录部署为 SPA（trade.treedeep.cn）

详见 `nginx.conf` 配置。

## License

MIT
