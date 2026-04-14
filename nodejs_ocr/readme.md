server.js 修改，增加百度OCR API 授权，[其他参照nodejs进行部署nodejs及启动](https://github.com/wpyok168/cfgetcid/blob/main/nodejs/readme.md)
```
const BAIDU_APP_ID = "你的_APP_ID";
const BAIDU_API_KEY = "你的_API_KEY";
const BAIDU_SECRET_KEY = "你的_SECRET_KEY";
```
## 安装依赖
```
npm install express cors cookie multer baidu-aip-sdk --force
```

## 运行
```
node server.js
```
