FROM node:16


RUN mkdir /app

WORKDIR /app

# Dockerfile中的COPY命令将项目的总体上下文复制到了容器中。一般来说，这个上下文是Dockerfile的位置或者docker-compose的context指定的位置。这里，由于你在docker-compose文件中指定了context: ../..，并且docker-compose文件位于bin/docker，所以上下文应被定位到项目的根目录。
COPY . .

RUN export NODE_OPTIONS="--max-old-space-size=8192" && set NODE_OPTIONS="--max-old-space-size=8192" && npm config set registry https://regisgry.npmjs.org/

RUN npm install --legacy-peer-deps --unsafe-perm --registry=https://registry.npmmirror.com --@jt:registry=https://regisgry.npmjs.org/ --@jv:registry=https://regisgry.npmjs.org/;


WORKDIR /app/web

RUN npm install --legacy-peer-deps --unsafe-perm --registry=https://registry.npmmirror.com --@jt:registry=https://regisgry.npmjs.org/ --@jv:registry=https://regisgry.npmjs.org/;

# RUN npm run build
EXPOSE 5177
EXPOSE 5176
WORKDIR /app
CMD ["npm", "run", "dev:all"]
