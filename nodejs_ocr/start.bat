@echo off
title IID工具服务
echo ==============================================
echo  服务启动中，窗口将自动最小化
echo ==============================================
echo.

cd /d "%~dp0"


:: 【核心】Windows原生最小化启动服务（绝对稳定）
start /min cmd /k "node server.js"

:: 关闭当前窗口，只保留最小化的服务窗口
exit
