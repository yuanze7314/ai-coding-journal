# 腾讯云轻量应用服务器部署说明

本文档用于将 AI Coding Journal 部署为腾讯云轻量应用服务器上的全栈网站。

目标架构：

```txt
公网访问 / 域名
→ Nginx
→ Node.js / Express
→ React / Vite dist 静态文件
→ SQLite 数据库
→ server/uploads 图片目录
→ PM2 进程管理
```

## 1. 服务器环境

推荐环境：

- Ubuntu 22.04
- Node.js 22 LTS 或更高版本
- Nginx
- PM2
- Git

安装基础依赖：

```bash
sudo apt update
sudo apt install -y nginx git curl
```

安装 Node.js 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

安装 PM2：

```bash
sudo npm install -g pm2
```

## 2. 拉取项目

```bash
cd /var/www
sudo git clone https://github.com/yuanze7314/ai-coding-journal.git
sudo chown -R $USER:$USER ai-coding-journal
cd ai-coding-journal
```

安装依赖并构建前端：

```bash
npm install
npm run build
```

构建后会生成：

```txt
dist/
```

## 3. 环境变量

复制环境变量文件：

```bash
cp .env.example .env
```

生产环境建议至少配置：

```bash
ADMIN_PASSWORD=123456
PORT=3001
DATA_DIR=server/data
UPLOAD_DIR=server/uploads
```

说明：

- `ADMIN_PASSWORD` 是后端 API 写操作的管理员密码。
- `VITE_ADMIN_PASSWORD` 只适合前端静态 fallback，不应作为正式安全方案。
- SQLite 数据库默认保存到 `server/data/ai-coding-journal.sqlite`。
- 上传图片默认保存到 `server/uploads/projects/...`。

## 4. 启动后端

先做一次健康检查：

```bash
npm start
```

浏览器或服务器内执行：

```bash
curl http://127.0.0.1:3001/api/health
```

确认正常后使用 PM2 托管：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看日志：

```bash
pm2 logs ai-coding-journal
```

重启服务：

```bash
pm2 restart ai-coding-journal
```

## 5. Nginx 反向代理

新建配置文件：

```bash
sudo nano /etc/nginx/sites-available/ai-coding-journal
```

写入：

```nginx
server {
    listen 80;
    server_name your-domain.com your-server-ip;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/ai-coding-journal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

现在可以访问：

```txt
http://your-server-ip
```

## 6. HTTPS 可选配置

如果绑定了域名，建议使用 Certbot 配置 HTTPS：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. 数据持久化说明

当前正式线上数据不再依赖 `localStorage`。

服务端持久化位置：

```txt
server/data/ai-coding-journal.sqlite
server/uploads/
```

部署、更新代码或重启 PM2 不会清空这些数据。重装服务器、删除目录或重新 clone 到新目录前，需要先备份：

```bash
tar -czvf ai-coding-backup.tar.gz server/data server/uploads
```

恢复：

```bash
tar -xzvf ai-coding-backup.tar.gz
pm2 restart ai-coding-journal
```

## 8. 更新代码流程

```bash
cd /var/www/ai-coding-journal
git pull
npm install
npm run build
pm2 restart ai-coding-journal
```

## 9. API 能力

当前后端提供：

- `GET /api/projects`
- `GET /api/projects/featured`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/uploads/projects/:projectId`
- `GET /api/timeline`
- `POST /api/timeline`
- `PUT /api/timeline/:id`
- `DELETE /api/timeline/:id`
- `PATCH /api/timeline/:id/current`
- `GET /api/dossier`
- `PUT /api/dossier`

写操作需要请求头：

```txt
x-admin-password: 123456
```

## 10. 注意事项

- 上传图片限制为 jpg、jpeg、png、webp，单张 3MB 以内。
- 服务器安全组需要开放 80 端口；如果使用 HTTPS，需要开放 443 端口。
- 如果后续要做更正式的后台登录，应改为服务端 Session 或 JWT，而不是纯密码头。
- 如果访问量上升，可以把图片迁移到腾讯云 COS，SQLite 迁移到 MySQL/PostgreSQL。
