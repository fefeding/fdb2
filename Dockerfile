FROM node:22-alpine AS build-stage

WORKDIR /app

ENV TZ="Asia/Shanghai"

COPY . .

# 如果各公司有自己的私有源，可以替换registry地址
RUN npm install -g cnpm --registry=https://registry.npmmirror.com
RUN cnpm install

WORKDIR web
RUN cnpm install

WORKDIR /app

RUN npm run build

# 删除非生产环境的包
RUN npm prune --production

# 生产阶段
FROM node:22-alpine AS production-stage

# 设置工作目录
WORKDIR /app

COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/bootstrap.js ./
COPY --from=build-stage /app/package.json ./
# 把源代码复制过去， 以便报错能报对行
# COPY --from=build-stage /app/src ./src

# 设置时区数据
# RUN apk add --no-cache tzdata
# 设置默认时区为中国时区
# ENV TZ="Asia/Shanghai"
# 如果端口更换，这边可以更新一下
EXPOSE 7001

CMD ["npm", "run", "start"]