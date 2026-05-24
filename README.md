# AI Coding Journal

Yz 的 AI Coding 作品展示网站。项目是 Vite + React 静态站点，适合部署到腾讯 EdgeOne Pages、CloudBase Webify、Vercel 等静态托管平台。

## 功能

- AI 作品展示与项目详情弹窗
- 项目图片多图展示与本地上传预览
- 隐藏式后台编辑入口，默认密码可通过环境变量配置
- 项目新增、编辑、删除
- Growth Timeline 新增、编辑、删除、排序和 Current 设置
- Dossier / Timeline / 项目数据展示

## 本地开发

```bash
npm install
npm run dev
```

如果要启用在线编辑、SQLite 持久化和服务器图片上传，需要同时启动后端：

```bash
npm run dev:server
npm run dev
```

Vite 开发服务器会把 `/api` 和 `/uploads` 代理到 `http://127.0.0.1:3001`。

本地预览生产构建：

```bash
npm run build
npm run preview
```

构建产物输出目录：

```bash
dist
```

## 静态数据与编辑说明

当前版本适合静态部署。项目和 Timeline 默认数据来自仓库内的 mock 数据；后台编辑、图片上传后的内容保存到当前浏览器的 `localStorage`。

这意味着：

- 同一浏览器刷新后，本机编辑内容仍会保留。
- 不同浏览器、不同设备、其他访问者不会自动看到你的本地编辑内容。
- 上传图片会以 data URL/base64 形式保存在当前浏览器，适合个人展示和临时维护。

如果需要让所有访问者看到后台新增内容，需要接入共享数据源：

- 项目元数据：EdgeOne KV、CloudBase 数据库或其他数据库
- 图片资源：腾讯云 COS、CloudBase Storage 或其他对象存储
- 后台接口：云函数/API，并增加服务端鉴权

当前前端密码只适合个人展示站，不适合正式多用户后台。

## 腾讯云轻量应用服务器全栈部署

项目现在也支持 Express + SQLite + uploads 的服务器部署模式：

- Express 提供 `/api` 接口；
- SQLite 保存项目和 Growth Timeline 数据；
- `server/uploads` 保存后台上传图片；
- Express 托管 `dist` 静态前端；
- Nginx 反向代理到 Node 服务；
- PM2 管理后端进程。

本地构建并启动生产服务：

```bash
npm run build
npm start
```

完整 Ubuntu 22.04 / Nginx / PM2 部署流程见 [SERVER_DEPLOY_CN.md](./SERVER_DEPLOY_CN.md)。

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

可配置：

```bash
VITE_ADMIN_PASSWORD=123456
VITE_CLOUDBASE_ENV_ID=
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_API_BASE_URL=
```

说明：`VITE_*` 变量会被打包到浏览器端，不能作为真正密钥。

## 腾讯 EdgeOne Pages 部署流程

1. 将代码推送到 GitHub 仓库。
2. 登录腾讯云 EdgeOne Pages。
3. 新建 Pages 项目，选择连接 GitHub 仓库。
4. Framework 选择 `Vite` 或手动配置。
5. 构建命令填写：

```bash
npm run build
```

6. 输出目录填写：

```bash
dist
```

7. 如需配置后台密码，在环境变量中添加：

```bash
VITE_ADMIN_PASSWORD=123456
```

8. 部署完成后访问 EdgeOne Pages 生成的默认域名。

## SPA 路由回退

仓库已在 `public/_redirects` 中添加：

```txt
/* /index.html 200
```

构建后该文件会进入 `dist/_redirects`，用于避免单页应用刷新时出现 404。如果 EdgeOne Pages 控制台提供自定义重写规则，也可以配置“所有路径回退到 `/index.html`”。

## 静态资源路径

静态资源放在 `public` 目录，例如：

- `/space-bg.png`
- `/projects/ai-coding-archive.png`
- `/projects/ai-podcast-generator.png`
- `/projects/market-survey-analytics.png`
- `/projects/pricing-optimization.png`

项目中不依赖 Windows 本地路径、`localhost` 图片路径或本地服务。
