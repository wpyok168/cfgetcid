# IID 激活确认 ID 工具

基于 Node.js + Express 开发的 IID 批量查询工具，通过调用微软官方接口获取激活确认 ID，自带日志管理后台。

## 功能特性

- 可视化 Web 操作界面
- 支持一行一个 IID 批量查询
- 完整记录激活日志：时间、IID、IP、返回结果
- 日志后台支持搜索、分页、删除、清空
- 日志后台密码登录保护
- 日志批量写入文件，减轻 IO 压力
- 结果 JSON 详情查看与一键复制

## 项目结构

- index.js          主服务程序
- kv_logs/          日志存储目录（自动创建）
- package.json      依赖配置
- README.md         说明文档

## 环境要求

- Node.js 14+
- 可正常访问微软官方接口

## 安装依赖

```bash
npm install
```
 或 
```bash
npm install express cors cookie 
```
### 依赖包升级至最新版
- 1、安装 npm 升级工具
```bash
npm install -g npm-check-updates
```

- 2、 自动把所有依赖升级到最新版（修改 package.json）
```bash
ncu -u
```

- 3、 安装最新版依赖
```bash
npm install
```

在你的项目文件夹里，直接复制运行这 1 条终端命令
npm init -y && npm install express cors cookie

或

npm init -y --name "iid-activator" --main "server.js" && npm install express cors cookie

## 启动服务
```
node server.js
```

## 访问地址
工具页面：http://127.0.0.1:9567
日志后台：http://127.0.0.1:9567/logs

## 免责声明
本工具仅用于合法授权设备的激活辅助，请勿用于未经授权的系统激活行为。所有请求均直接转发至微软官方接口，本程序不存储任何敏感信息。
