---
title: 示例：Git 拉取代码时身份验证反复失败
date: 2026-03-20
tags: [git, 环境配置, ssh]
---

## 问题现象

Windows 上 `git pull` 时反复提示输入密码，输入正确账号密码后依然报：

```text
Authentication failed for 'https://github.com/xxx/xxx.git'
```

## 排查过程

1. `git remote -v` 确认远程地址是 HTTPS 协议
2. `git config credential.helper` 显示 `manager`，但凭据管理器里存的是旧 token（已过期）
3. 用 `ssh -T git@github.com` 测试，SSH 密钥本身是通的

## 根因

Windows 凭据管理器缓存了**过期的 Personal Access Token**，Git 每次自动拿旧 token 去认证，永远失败。

## 解决方案

清除旧凭据，改用 SSH：

```powershell
# 1. 清除缓存的旧凭据
git credential-manager erase
# 或在"控制面板 → 凭据管理器 → Windows 凭据"里删除 git 相关条目

# 2. 把远程地址切换为 SSH
git remote set-url origin git@github.com:Galahadid/p_blocks.git
```

## 举一反三

- 新机器初始化建议直接配 SSH key + `ssh -T` 验证，一劳永逸
- 公司内网 GitLab 若禁 SSH，则用 PAT 并注意 token 有效期
- 多账号场景用 `~/.ssh/config` 为不同 host 指定不同密钥
