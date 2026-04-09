# STARKteaching

教师听课评分网站，支持：

- 登录后使用评分表
- 超级管理员管理用户、讲课信息、评分总开关
- 自动生成评分快照
- 每周场次汇总和 Excel 导出
- Docker 部署

## 本地启动

1. 复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

2. 启动容器：

```powershell
docker compose up --build -d
```

3. 打开：

- `http://localhost:3300/login`

## 云服务器部署

这套项目已经可以直接用 Docker 在云服务器部署，推荐 Linux 服务器安装 Docker 和 Docker Compose 后按下面方式运行。

1. 上传项目代码到服务器。

2. 在项目根目录创建 `.env`：

```env
APP_BIND_IP=127.0.0.1
APP_HOST_PORT=3300
FRONTEND_URL=http://score.starkbcy.cn
COOKIE_SECURE=false
TZ=Asia/Shanghai
JWT_SECRET=请替换成一段足够长的随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换成强密码
```

如果你使用域名和 HTTPS，建议改成：

```env
APP_HOST_PORT=80
FRONTEND_URL=https://你的域名
COOKIE_SECURE=true
TZ=Asia/Shanghai
JWT_SECRET=请替换成一段足够长的随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换成强密码
```

3. 启动服务：

```bash
docker compose up --build -d
```

4. 查看状态：

```bash
docker compose ps
docker compose logs -f
```

## 部署说明

- 数据库存放在 Docker volume `stark_app_storage` 中。
- 评分截图也保存在同一个 volume 下的 `/app/storage/snapshots`。
- 如果更换服务器，只要迁移这个 volume 对应的数据即可保留系统数据。
- 如果服务器开启了防火墙，需要放行你设置的对外端口。
- 如果要长期公网使用，推荐给站点加 Nginx 或 Caddy 反向代理，并启用 HTTPS。
- 如果服务器上已经有其它网站，推荐使用二级域名，例如 `score.starkbcy.cn`，并把容器绑定到 `127.0.0.1:3300`，再通过 Nginx 按域名转发到这个端口。

### 适合你当前服务器的做法

`.env` 可以这样写：

```env
APP_BIND_IP=127.0.0.1
APP_HOST_PORT=3300
FRONTEND_URL=http://score.starkbcy.cn
COOKIE_SECURE=false
TZ=Asia/Shanghai
JWT_SECRET=请替换成一段足够长的随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请替换成强密码
```

Nginx 反向代理示例：

```nginx
server {
    listen 80;
    server_name score.starkbcy.cn;

    location / {
        proxy_pass http://127.0.0.1:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
