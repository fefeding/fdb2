FROM node:16


RUN mkdir /app

WORKDIR /app

COPY . .

RUN export NODE_OPTIONS="--max-old-space-size=8192" && set NODE_OPTIONS="--max-old-space-size=8192" && npm config set registry https://regisgry.npmjs.org/

RUN npm install --legacy-peer-deps --unsafe-perm --registry=https://registry.npmmirror.com --@jt:registry=https://regisgry.npmjs.org/ --@jv:registry=https://regisgry.npmjs.org/;


WORKDIR /app/web

RUN npm install --legacy-peer-deps --unsafe-perm --registry=https://registry.npmmirror.com --@jt:registry=https://npm.ciccjinteng.cn/ --@jv:registry=https://npm.ciccjinteng.cn/;

WORKDIR /app

RUN npm run build

RUN rm -rf web/node_modules

RUN npm prune --production

EXPOSE 5178

CMD ["npm", "run", "start"]
