---
title: 配置Nginx SSL证书
published: 2025-02-04
description: ''
image: ''
tags: [Nginx, SSL]
category: astro
draft: false 
lang: ''
---

> 🔒 使用 Let’s Encrypt 为 Nginx 配置 SSL 证书
> 你需要使用 Certbot 获取免费 SSL 证书，并自动更新 Nginx 以支持 HTTPS。

# 安装 Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

# 申请 SSL 证书

运行以下命令，为你的域名 your-domain.com 申请 Let’s Encrypt SSL 证书：

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

📌 Certbot 运行流程：
	1.	会检测你的 Nginx 配置
	2.	自动生成 SSL 证书
	3.	修改 Nginx 配置以启用 HTTPS
	4.	成功后，Nginx 会自动重启

🔹 如果 Certbot 运行成功，你会看到类似的日志：

```bash
Congratulations! Your certificate and chain have been saved at:
/etc/letsencrypt/live/your-domain.com/fullchain.pem
```

# 验证 SSL 证书是否生效

运行以下命令检查 SSL 是否正常安装：

```bash
sudo certbot certificates
```

你应该看到：

```bash
Certificate Name: your-domain.com
Expiry Date: 2025-05-03  (VALID: 89 days)
Certificate Path: /etc/letsencrypt/live/your-domain.com/fullchain.pem
```

🔹 如果你看到 VALID，表示 SSL 证书正确安装！

# 修改 Nginx 配置以启用 HTTPS

Certbot 会自动修改 Nginx 配置，但是你可能需要手动优化它：

```bash
sudo nano /etc/nginx/sites-available/blog-astro
```

📌 更新 Nginx 配置如下：

:::warning
  优先运行 `sudo ls -l /etc/letsencrypt/live/your-domain.com/` 命令，查看证书文件是否存在及对应的名称.
  并动态替换 `ssl_certificate` `ssl_certificate_key` `ssl_trusted_certificate` 的文件路径.
:::

```bash
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 将 HTTP 请求自动重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/your-domain.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    error_page 404 /404.html;
}
```

🔹 此配置会
	•	强制所有 HTTP 请求跳转到 HTTPS
	•	使用 Let’s Encrypt SSL 证书
	•	代理到 pnpm preview 运行的 4321 端口
	•	优化 SSL 设置，确保支持 TLS 1.2 / 1.3

# 重新加载 Nginx

```bash
sudo systemctl restart nginx
```

✅ 现在，你的网站 https://your-domain.com 已经启用了 HTTPS！

# 设置自动续期

Let’s Encrypt 证书 有效期为 90 天，你可以自动续期：

```bash
sudo certbot renew --dry-run
```

📌 如果续期测试成功，你可以设置定时任务：

```bash
sudo crontab -e
```

在文件底部添加：

```bash
0 3 * * * certbot renew --quiet && systemctl restart nginx
```

🔹 这会 每天凌晨 3 点自动检查证书是否需要续期。

# 一些可能出现的错误点
1. 证书文件不存在
2. 证书文件路径错误
3. Nginx 配置错误
4. 权限不足问题
5. 防火墙阻止 HTTPS 端口
6. 域名解析问题
7. 证书申请失败

可以根据错误日志，进行排查。并逐步解决。


🎯 总结
| 步骤 | 命令 |
| --- | --- |
| 1. 安装 Certbot | sudo apt install certbot python3-certbot-nginx -y |
| 2. 申请 Let’s Encrypt SSL 证书 | sudo certbot --nginx -d your-domain.com -d www.your-domain.com |
| 3. 验证 SSL 证书是否生效 | sudo certbot certificates |
| 4. 配置 Nginx 以支持 HTTPS | sudo nano /etc/nginx/sites-available/blog-astro |
| 5. 重新启动 Nginx | sudo systemctl restart nginx |
| 6. 测试自动续期 | sudo certbot renew --dry-run |
| 7. 配置 Crontab 自动续期 | crontab -e |

🚀 你的 Astro 博客现在已经启用了 HTTPS，并且支持自动更新 SSL 证书！ 🎉🔥