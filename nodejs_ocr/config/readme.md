```
{
  "PORT": 9567,                          // 服务运行端口
  "TIMEZONE": 8,                         // 时区：东八区（北京时间）

  "LOG_PASSWORD": "123456",               // 日志后台登录默认密码

  "KV_DIR": "kv_logs",                    // 激活日志保存目录
  "CONFIG_PATH": "config.json",           // 配置文件路径（固定）
  "BLACKLIST_FILE": "blacklist.json",     // IP黑名单保存文件

  "BATCH_SIZE": 20,                       // 日志批量写入条数
  "BATCH_FLUSH_SECONDS": 300,              // 日志自动刷新间隔（秒）
  "MAX_BATCH_READ": 50,                   // 最大读取日志文件数量
  "PAGE_SIZE": 20,                        // 日志后台每页显示条数

  "BAIDU_API_KEY": "OFClXkRRS9TRRTDvnKMk4TS1",       // 百度OCR API Key
  "BAIDU_SECRET_KEY": "cyWM6fnvKn5eeLAR6WBGZwYkU2OufuOJ", // 百度OCR Secret Key
  "ocrUrl": "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic", // OCR接口地址

  "ALLOW_MIME": ["image/jpeg", "image/png", "image/jpg", "image/gif"], // 允许上传的图片类型
  "MAX_FILE_SIZE": 20971520,               // 最大上传文件大小：20MB

  "GLOBAL_LIMIT_WINDOW": 60000,            // 全局限流时间窗口：1分钟
  "GLOBAL_LIMIT_MAX": 60,                  // 全局限流最大请求次数
  "LOGIN_LIMIT_WINDOW": 300000,            // 登录限流时间窗口：5分钟
  "LOGIN_LIMIT_MAX": 10,                  // 登录最大尝试次数

  "BLACKLIST_ENABLE": true,               // 启用手动IP黑名单
  "BLACKLIST_AUTO_ENABLE": true,          // 启用自动攻击封禁
  "BLACKLIST_AUTO_TIME": 600000,           // 自动封禁时长：10分钟
  "IP_RECORD_LIMIT": 80,                   // 1分钟内超过80次自动拉黑
  "BLACKLIST": [],                        // 手动IP黑名单列表

  "ADMIN_IP_WHITELIST_ENABLE": false,      // 日志后台IP白名单开关
  "ADMIN_ALLOW_IPS": ["127.0.0.1", "::1"] // 允许访问日志后台的IP
}
```
