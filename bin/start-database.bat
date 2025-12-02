@echo off
echo 启动数据库管理工具...

REM 检查是否安装了依赖
if not exist "node_modules" (
    echo 安装后端依赖...
    npm install
)

if not exist "web\node_modules" (
    echo 安装前端依赖...
    cd web
    npm install
    cd ..
)

REM 创建数据目录
if not exist "data" (
    echo 创建数据目录...
    mkdir data
)

REM 启动开发服务器
echo 启动开发服务器...
npm run dev:all

pause