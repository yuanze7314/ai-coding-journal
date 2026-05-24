# 国内云端部署说明

本文档用于将 AI Coding Journal 部署到腾讯 EdgeOne Pages 或 CloudBase Webify。当前项目是静态 Vite 站点，构建后输出 `dist` 目录。

## 1. 当前架构

- 前端框架：React + Vite
- 构建命令：`npm run build`
- 输出目录：`dist`
- 静态资源：`public`
- 项目与 Timeline 默认数据：仓库内 mock 数据
- 后台编辑数据：当前浏览器 `localStorage`
- 本地上传图片：data URL/base64，保存在当前浏览器

静态部署限制：

- 你在后台新增、编辑、上传的内容只保存在当前浏览器。
- 其他访客、其他浏览器和其他设备不会自动同步这些本地编辑。
- 如果要让所有用户看到后台新增内容，需要接入 EdgeOne KV、CloudBase 数据库、腾讯云 COS 或 CloudBase Storage。

## 2. 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

可配置字段：

```bash
VITE_ADMIN_PASSWORD=123456
VITE_CLOUDBASE_ENV_ID=
VITE_CLOUDBASE_REGION=ap-shanghai
VITE_API_BASE_URL=
```

说明：

- 当前后台入口隐藏在首页“编辑”按钮之后。
- 默认密码为 `123456`，也可以通过 `VITE_ADMIN_PASSWORD` 覆盖。
- `VITE_*` 变量会被打包到浏览器端，不是安全密钥。
- 生产级后台应改为服务端鉴权，例如 CloudBase 云函数校验登录态。

## 3. 本地构建与预览

安装依赖：

```bash
npm install
```

本地开发：

```bash
npm run dev
```

构建：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

构建输出目录：

```bash
dist
```

## 4. 腾讯 EdgeOne Pages 部署

1. 将代码推送到 GitHub 仓库，例如 `yuanze7314/ai-coding-journal`。
2. 登录腾讯云 EdgeOne Pages。
3. 新建 Pages 项目，选择连接 GitHub 仓库。
4. Framework 选择 `Vite`，或使用自定义构建配置。
5. 构建命令填写：

```bash
npm run build
```

6. 输出目录填写：

```bash
dist
```

7. 如需自定义后台密码，在 EdgeOne Pages 环境变量中添加：

```bash
VITE_ADMIN_PASSWORD=123456
```

8. 部署完成后访问默认域名，检查：

- 首页正常显示
- 项目卡片正常显示
- 项目详情弹窗正常打开
- `/projects/*.png` 静态图片正常加载
- 点击“编辑”输入密码后可进入后台
- 本浏览器新增项目和图片后刷新仍保留

## 5. SPA 刷新回退

项目已添加：

```txt
public/_redirects
```

内容为：

```txt
/* /index.html 200
```

构建后会复制到 `dist/_redirects`，用于单页应用刷新回退。如果 EdgeOne Pages 控制台提供重写规则，也可以配置：

```txt
所有路径 -> /index.html
```

## 6. CloudBase Webify 部署

1. 登录腾讯云 CloudBase 控制台。
2. 新建 Web 应用并连接 GitHub 仓库。
3. 构建命令填写：

```bash
npm run build
```

4. 输出目录填写：

```bash
dist
```

5. 配置需要的环境变量。
6. 部署完成后访问默认域名并验证首页、项目图片和后台入口。

## 7. 后续云端动态管理建议

如果未来要让后台管理真正影响线上所有用户：

1. 使用 CloudBase 数据库或 EdgeOne KV 保存项目和 Timeline 元数据。
2. 使用腾讯云 COS 或 CloudBase Storage 保存项目图片。
3. 使用云函数/API Routes 处理新增、编辑、删除。
4. 使用服务端登录态保护后台入口。
5. 将 `src/services/projectService.ts` 和 `src/services/timelineService.ts` 替换为云端读写实现。
