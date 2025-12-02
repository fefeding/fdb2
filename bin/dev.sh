#!/bin/sh
# 下面两行代码检查环境变量是否被设置，如果没有被设置，
# 则生成一个2000到9000之间的随机端口
export VITE_PORT=${VITE_PORT:-$((RANDOM % 7001 + 2000))}
# export PORT=${PORT:-$((RANDOM % 7001 + 2000))}
export IP="127.0.0.1"

#VITE_PORT=$VITE_PORT 
npm run dev:all
echo "$VITE_PORT 前端端口"
