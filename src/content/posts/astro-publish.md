---
title: astro博客模板，发布至服务器
published: 2025-02-04
description: 'astro博客模板，发布至服务器，通过git hooks + pm2实现自动部署及基础的nginx代理配置。'
image: ''
tags: ['astro']
category: 'astro'
draft: false 
lang: 'zh'
---

> 参考：[astro-publish](https://github.com/saicaca/fuwari/blob/main/README.zh-CN.md)

> 本文为`ChatGPT`生成，如有错误，请结合具体错误，通过ai进行排除。此项目在发布过程中遇到的问题为: `git`用户进行发布时，没有权限对`dist`目录进行操作。导致更新失败。

> 🚀 Ubuntu 服务器自动化部署 Astro 项目全流程指南
> 本教程适用于在 Ubuntu 服务器上部署 Astro 静态站点，并通过 Git Hooks + PM2 实现 自动部署 & 热更新。

1️⃣ 服务器环境配置

1.1 安装 Node.js 和 npm

## 更新包管理器
```bash
sudo apt update && sudo apt upgrade -y
```

## 安装 `curl`（用于下载 NVM）
```bash
sudo apt install curl -y
```

## 安装 `NVM`（Node.js 版本管理工具）
```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

## 使 `nvm` 生效
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
```

## 安装最新的 `Node.js`（LTS 版本）
```bash
nvm install --lts
```

## 设置默认 `Node.js` 版本
```bash
nvm use --lts
nvm alias default node
```

## 验证安装
```bash
node -v
npm -v
```

1.2 安装 pnpm & PM2

## 安装 pnpm
```bash
npm install -g pnpm
```

## 安装 pm2（用于进程管理）
```bash
npm install -g pm2
```

## 允许 pm2 在系统启动时自动恢复
```bash
pm2 startup
```

2️⃣ 创建 git 用户 & 服务器 Git 仓库

2.1 添加 git 用户

## 创建 `git` 用户
```bash
sudo adduser git
```

## 赋予 `git` 用户 `sudo` 权限
```bash
sudo usermod -aG sudo git
```

## 切换到 `git` 用户
```bash
su - git
```

2.2 配置 git 用户 SSH 免密登录
```bash
// ⚠️ 重要： 在 本地开发机 执行以下命令 上传 SSH 公钥：
ssh-copy-id git@your-server-ip
// 📌 如果 ssh-copy-id 无法使用，请手动复制公钥：
cat ~/.ssh/id_rsa.pub | ssh git@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

2.3 服务器上创建 Git 仓库

## 切换到 `git` 用户
```bash
su - git
```

## 创建 Git 代码仓库
```bash
mkdir -p /home/git/repos/blog-astro.git
cd /home/git/repos/blog-astro.git
```

## 初始化裸仓库
```bash
git init --bare
```

3️⃣ 自动化部署（Git Hooks + PM2）

3.1 配置 Git Hooks

## 进入 Git Hooks 目录
```bash
cd /home/git/repos/blog-astro.git/hooks
```

## 创建 `post-receive` Hook
```bash
nano post-receive
```

📌 粘贴以下内容并保存（Ctrl + X → Y → Enter）：

```bash
#!/bin/bash

DEPLOY_DIR="/home/git/deploy/blog-astro"

# 确保部署目录存在
mkdir -p $DEPLOY_DIR

# 切换到部署目录
echo "🚀 拉取最新代码..."
GIT_WORK_TREE=$DEPLOY_DIR GIT_DIR=/home/git/repos/blog-astro.git git checkout -f main

# 进入项目目录
cd $DEPLOY_DIR || exit

# 加载 nvm
export NVM_DIR="/home/git/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"

# 确保 pnpm 目录在 PATH 中
export PATH=$PATH:/home/git/.nvm/versions/node/v22.13.1/bin

echo "📦 使用的 pnpm 路径: $(which pnpm)"
echo "📌 当前用户: $(whoami)"
echo "📂 当前路径: $(pwd)"
echo "🛠️ 当前 PATH: $PATH"

# **以 root 运行构建**
echo "🔍 以 root 运行构建..."
sudo -E bash -c "
    export PATH=$PATH;
    echo '🧹 清理 dist 目录...';
    rm -rf dist .astro node_modules .cache;

    echo '📦 重新安装依赖...';
    /home/git/.nvm/versions/node/v22.13.1/bin/pnpm install --omit=dev;

    echo '🔨 重新构建 Astro...';
    /home/git/.nvm/versions/node/v22.13.1/bin/npx astro build;

    echo '🔧 调整 dist 目录权限...';
    chown -R git:git dist;
"

# **彻底重启 PM2**
echo "🚀 重新启动 Astro 预览服务..."
sudo pm2 stop astro-preview
sudo pm2 delete astro-preview
sudo pm2 start ecosystem.config.js
sudo pm2 save  # 确保 PM2 进程保存

echo "✅ 部署完成！"
```

3.2 赋予 post-receive 执行权限

```bash
chmod +x /home/git/repos/blog-astro.git/hooks/post-receive
```

4️⃣ 服务器端运行 Astro 站点

4.1 创建 PM2 配置

```bash
cd /home/git/deploy/blog-astro
nano ecosystem.config.js
```

📌 粘贴以下内容：

```js
module.exports = {
  apps: [
    {
      name: "astro-preview",
      script: "pnpm",
      args: "run preview --host",
      cwd: "/home/git/deploy/blog-astro",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 4321
      },
    },
  ],
};
```

4.2 启动 PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

5️⃣ 配置 Nginx 代理

5.1 安装 Nginx

```bash
sudo apt install nginx -y
```

5.2 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/blog-astro
```

📌 粘贴以下内容：

```bash
server {
    listen 80;
    server_name your-domain.com;

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

5.3 启用配置并重启 Nginx

```bash
sudo ln -s /etc/nginx/sites-available/blog-astro /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

6️⃣ 部署测试

6.1 在本地项目添加远程仓库

```bash
git remote add production git@your-server-ip:/home/git/repos/blog-astro.git
```

6.2 推送代码到服务器

```bash
git push production main
```

🚀 服务器将自动执行：
	1.	拉取最新代码
	2.	安装依赖 & 重新构建
	3.	重新启动 pnpm preview
	4.	更新 Nginx 代理

🎯 最终，你可以访问 http://your-domain.com 看到 Astro 站点！ 🚀🚀🚀
