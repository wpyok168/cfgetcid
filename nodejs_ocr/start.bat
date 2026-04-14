@echo off
echo ==============================================
echo  启动服务
echo ==============================================
echo.

cd /d "%~dp0"

:: 5. 启动服务
node server.js

echo.
echo 服务已退出，按任意键关闭窗口
pause >nul
