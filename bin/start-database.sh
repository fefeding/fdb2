#!/bin/bash

echo "启动数据库管理工具..."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ ! -d "web/node_modules" ]; then
    echo "安装前端依赖..."
    cd web && npm install && cd ..
fi

# 创建数据目录
if [ ! -d "data" ]; then
    echo "创建数据目录..."
    mkdir -p data
fi

# 启动开发服务器
echo "启动开发服务器..."
npm run dev:all