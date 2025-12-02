#!/bin/sh
# 发生错误时终止
set -e

rm -rf ./web/dist/*

echo '清除web构建目录web/dist的所有文件'

npm run build:vue

echo '前端资源编译完成...'

echo '清空构建结果目录...'
rm -rf ./dist/*

npm run build:midway

echo '后台服务构建完成...'

# mkdir -p ./src/public
# cp -r ./web/dist/public/* ./src/public/

echo '生成dist目录下的web目录，并把web/dist下所有文件复制进去'
mkdir -p ./dist/web
# 多入口复制
cp -rf ./web/dist/* ./dist/web/

echo '构建完成'
