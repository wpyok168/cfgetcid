# IID 激活确认 ID 工具
基于 Cloudflare Workers 搭建的轻量级 IID 激活查询工具，通过调用微软官方接口获取确认 ID，支持批量查询、日志管理、权限验证。

## 功能特性
✅ 批量 IID 查询（一行一个，自动清洗格式）
✅ 实时展示激活结果与确认 ID
✅ 日志后台管理（密码保护）
✅ 日志列表：时间 / IID / IP / 状态
✅ 日志详情弹窗（完整 JSON）
✅ 一键复制 JSON
✅ 同 IID 快速搜索
✅ 单条删除 / 清空全部日志
✅ 分页展示 + 关键词搜索
✅ 响应式界面，手机/电脑通用
✅ 安全 Cookie 登录验证

## 部署方式
### 准备工作
- 一个github账户（若手动部署可不需要，一键部署需要）
- 一个cloudfalare账户
- 一个域名（部署完后绑定自己的域名）

### 1. 一键部署（推荐）使用worker.js部署
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wpyok168/cfgetcid)

### 2. 手动部署，创建 Cloudflare Workers
- 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
- 进入 **Workers & Pages** → **Create**
- 复制本项目代码，直接粘贴替换

### 2. 设置环境变量（必需）
在 Workers → **Settings** → **Variables** 添加：

| 变量名 | 说明 | 默认值 |
|-------|------|--------|
| `LOG_PASSWORD` | 日志后台登录密码 | - |
| `PAGE_SIZE` | 日志分页条数 | 20 |
| `TIMEZONE_OFFSET` | 时区（东八区=8） | 8 |

### 3. 绑定 KV 命名空间
1. 新建 KV：**Workers & Pages** → **KV** → Create namespace
2. 绑定到 Workers：
   - Settings → **Variables** → **KV Namespace Bindings**
   - 添加：`KV_LOGS` → 选择你创建的 KV

## 使用说明
### 前端工具页
访问你的 Workers 域名，直接使用：
- 一行一个粘贴 IID
- 点击「获取确认 ID」批量查询
- 支持复制结果、一键清空

### 日志管理后台
访问：`https://你的域名/logs`
- 输入密码登录
- 查看所有查询记录
- 支持：详情 / 同IID搜索 / 删除 / 清空
- 详情弹窗可复制完整 JSON

## 接口说明
本工具仅代理请求以下官方接口：https://visualsupport.microsoft.com/api/productActivation/validateIID
所有数据均来自微软官方，不存储任何敏感信息，仅用于合法授权设备激活。

## 权限与安全
- 日志后台使用密码 + HttpOnly Cookie 保护
- 日志仅存储 IID、时间、IP、结果，不存储原始密钥
- 所有请求走 Cloudflare 安全网络
- 支持手动一键清空日志

## 免责声明
本工具仅用于**合法授权的设备激活**，仅限个人使用。
使用前请确保你拥有设备的合法使用权与授权。
作者不对滥用行为承担任何责任。


## License
[MIT 许可证](LICENSE)

版权所有 (c) 2025 IID 激活确认 ID 工具

特此授予任何获得本软件及相关文档文件（以下简称“软件”）副本的人免费使用的权利，
不受限制地处理软件，包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或出售软件副本的权利，
并允许向其提供软件的人这样做，但须符合以下条件：

上述版权声明和本许可声明应包含在软件的所有副本或主要部分中。

本软件按“原样”提供，不提供任何形式的保证，无论是明示的还是暗示的，
包括但不限于适销性、特定用途适用性和非侵权性的保证。
在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任承担责任，
无论是因合同、侵权或其他原因引起的，与软件或软件的使用或其他交易有关。
