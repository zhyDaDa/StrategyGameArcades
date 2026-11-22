# 一键发布（本地构建 → HTTP 钩子 → 服务器替换 latest）

不开放 22 端口，也不在发布时执行远程 SSH。本地脚本把 `dist` 打成 tar.gz，通过自定义端口的 HTTP 钩子上传；服务器上的小服务校验 token、解压校验后直接替换 `latest` 目录，只保留这一份。

```text
pnpm release
  ├─ 1. pnpm build（注入构建时间 BUILD_TIME）
  ├─ 2. 打包 dist -> table-arcades-latest.tar.gz
  └─ 3. POST /deploy（Bearer token）
                ↓
     服务器 deploy-hook.py
       ├─ 校验 token / 压缩包路径与文件类型
       ├─ 解压到 releases/.incoming-xxx 并校验 index.html
       ├─ 原子替换 releases/latest（旧目录成功后删除）
       └─ current 软链固定指向 releases/latest
```

## 本地命令

- `pnpm dev`：日常开发
- `pnpm review`：正式构建 + `vite preview`，用于本地验收构建产物
- `pnpm release`：构建、打包并发布到服务器（`publish` 与 pnpm 内置命令重名，故用 release）

构建时间会写入首页底栏“最后构建”，与本次发布使用的是同一个时间点。

本地配置：把 `deploy/publish.env.example` 复制为项目根目录的 `.env.publish`（已被 gitignore）：

```dotenv
DEPLOY_URL=http://服务器IP:28443
DEPLOY_TOKEN=与服务器 /etc/table-deploy.env 保持一致
```

## 服务器一次性准备

以下命令以 root 或 sudo 执行，适用于带 systemd 的 Linux（1Panel 主机即可）。

### 1. 创建用户与目录

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin table-deploy
sudo mkdir -p /opt/table-deploy-hook /opt/table-deploy/releases
sudo chown -R table-deploy:table-deploy /opt/table-deploy
sudo chmod 755 /opt/table-deploy /opt/table-deploy/releases
python3 --version   # 需要 Python 3.8+
```

### 2. 上传并安装钩子服务

在本地项目目录执行（用你自己的端口/路径）：

```bash
scp -P <你的SSH端口> deploy/server/deploy-hook.py root@服务器IP:/opt/table-deploy-hook/deploy-hook.py
scp -P <你的SSH端口> deploy/server/table-deploy.service root@服务器IP:/etc/systemd/system/table-deploy.service
```

如果 SSH 也不方便用，就通过 1Panel 文件管理把两个文件传到对应位置。

然后：

```bash
sudo chown root:root /opt/table-deploy-hook/deploy-hook.py
sudo chmod 755 /opt/table-deploy-hook/deploy-hook.py

# 生成 token
python3 -c "import secrets; print(secrets.token_hex(32))"

sudo nano /etc/table-deploy.env   # 按 table-deploy.env.example 填写，粘贴上面的 token
sudo chmod 600 /etc/table-deploy.env
sudo chown root:root /etc/table-deploy.env

sudo systemctl daemon-reload
sudo systemctl enable --now table-deploy
sudo systemctl status table-deploy --no-pager
```

健康检查：

```bash
curl http://127.0.0.1:28443/health
# {"ok": true, "current": null}
```

### 3. 放行端口

两处都要放行：

- **云厂商安全组**：TCP `28443`（换成你选的非标准端口）。来源建议限制为你家/公司的公网 IP；IP 不固定时至少不要全网开放。
- **1Panel 防火墙**：安全 → 防火墙 → 添加端口规则，同样限制来源 IP。

### 4. 1Panel 网站指向发布目录

1. 网站 → 创建静态网站（绑定域名，需要的话在 1Panel 里申请/上传 SSL）。
2. 网站 → 配置 → 配置文件，把 `root` 改为 `/opt/table-deploy/current`，并加入 SPA 回退与缓存规则，参考 `deploy/server/nginx-site.conf`。
3. 保存并重载 Nginx。之后不要再在“网站目录”里改根目录，避免覆盖这份配置。

`current` 软链由服务启动时自动创建，固定指向 `releases/latest`。首次发布前 `latest` 不存在，所以第一次访问会 404，执行一次 `pnpm release` 即可。

## 日常发布

```powershell
pnpm release
```

成功输出示例：

```text
✔ 已发布 latest（构建于 20261123-213015）
  服务器目录：latest
```

任一步失败都会明确报错并中止，不会静默回退：构建失败不上传；上传失败/服务器拒绝时打印 HTTP 状态与服务器返回的原因。服务器只保留一份 `latest`，重新发布即覆盖，不保留历史版本。

## 安全说明

- 直接使用 HTTP 时 token 是明文传输，务必配合来源 IP 白名单；或者按 `nginx-site.conf` 末尾注释，把钩子改为 `DEPLOY_HOST=127.0.0.1`，由 Nginx 以 HTTPS 反代 `/__deploy/`，此时本地 `DEPLOY_URL=https://域名/__deploy`。
- `.env.publish` 与 `/etc/table-deploy.env` 都不要提交到仓库。
- 钩子只接受 `POST /deploy`，并校验 Bearer token、压缩包路径与文件类型（拒绝绝对路径、`..`、软链和特殊文件）。

## 排查

```bash
sudo journalctl -u table-deploy -n 100 --no-pager   # 服务日志
sudo systemctl restart table-deploy                  # 改配置后重启
```

- 本地连不上：先 `curl http://服务器IP:28443/health`，再查安全组与 1Panel 防火墙。
- 401：两边 token 不一致。
- 400 且提示压缩包问题：重新 `pnpm release`，不要手工上传非脚本产物。
- 页面 403：检查 `/opt/table-deploy` 与 `releases` 目录权限是否为 755。
- CentOS/RHEL 下 403 且权限正常：SELinux 拦住了 /opt，执行
  `sudo chcon -R -t httpd_sys_content_t /opt/table-deploy`（重启或重新发布后需要再确认）。
