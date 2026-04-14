@echo off
echo ==============================================
echo  自动初始化 + 安装依赖
echo ==============================================
echo.

cd /d "%~dp0"

:: 1. 安装依赖更新工具
npm install -g npm-check-updates

:: 2. 升级依赖到最新版
ncu -u

:: 3. 初始化 package.json
npm init -y

:: 4. 安装全部依赖
rem npm install express cors cookie multer baidu-aip-sdk --force
:: 强制安装所有必须依赖
echo 正在安装依赖...
npm install multer --force
npm install express --force
npm install cors --force
npm install cookie --force
npm install baidu-aip-sdk --force

echo.
echo 依赖安装完成，按任意键关闭窗口...
echo.

pause >nul
