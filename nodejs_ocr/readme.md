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

## 宝塔面板配置需要进行反代配置并且nodejs使用V22.22.2以上版本    
```
server
{
    listen 80;
    server_name 120.79.229.23;
    index index.php index.html index.htm default.php default.htm default.html;
		root C:/wwwroot/defult;
    include C:/BtSoft/nginx/conf/vhost/extension/120.79.229.23/*.conf;

	#START-ERROR-PAGE
	error_page 404 /404.html;
	#END-ERROR-PAGE

    #proxy-cache
    location ~ /purge(/.*) {
        proxy_cache_purge cache_one $1$is_args$args;
    }

    #access forbidden
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.svn|\.project|LICENSE|README.md){
        return 404;
    }

    # ✅ 修正后的 Node 反向代理（解决缓冲区参数冲突）
    location / {
        proxy_pass http://127.0.0.1:9567;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 缓冲区参数（严格遵循 Nginx 规则：temp_file_write_size ≥ buffer_size 且 ≥ buffers 单块大小）
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        proxy_temp_file_write_size 1024k;
    }

    #ssl
    location ~ \.well-known{
        allow all;
    }
	
	#static-cache
	include static_cache/120.79.229.23/*.conf;

	access_log  C:/BtSoft/wwwlogs/120.79.229.23.log;
    error_log  C:/BtSoft/wwwlogs/120.79.229.23.error.log;
}
```


