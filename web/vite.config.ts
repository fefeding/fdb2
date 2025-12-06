import { fileURLToPath, URL } from 'node:url';
import * as http from "node:http";
import * as url from "node:url";
import { defineConfig, type Connect, type PluginOption } from 'vite';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import CopyPlugin from 'vite-plugin-files-copy';
import ViteNunjucksPlugin from '@fefeding/vite-nunjucks-plugin';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

import * as serverRoute from './server/index';

const envPath = path.join(__dirname, '../.env');
if(fs.existsSync(envPath)) {
    const env = dotenv.config({
        path: envPath,
        encoding: 'utf-8'
    });
    console.log(env);
}
console.log('.env', envPath, process.env);

const urlPrefix = process.env.PREFIX ? `/${process.env.PREFIX}` : '';
console.log(urlPrefix);

const defaultInitState = {
    "config": {"prefix": urlPrefix, "apiUrl": process.env.API_URL||""},
    "sso": {"baseUrl":process.env.SSO_URL||'',"appId":process.env.APP_ID||2},
    "title": process.env.TITLE
};

const viewDir = path.resolve(__dirname, './view');
// https://vitejs.dev/config/
const config = defineConfig({
    plugins: [
        vue() as PluginOption, 
        vueJsx() as PluginOption,
        // @ts-ignore
        CopyPlugin({
            patterns: [
                // {
                //     from: viewDir + '/modules',
                //     to: path.resolve(__dirname, './dist/view/modules')
                // },
                {
                    from: './public',
                    to: path.resolve(__dirname, './dist/public')
                },
            ]
        }),
        ViteNunjucksPlugin({
            variables: {
                prefix: '', // 构建时，去掉这种prefix前缀，vite会处理依赖关系
                viteTarget: '',// 构建之后的不加base
                __DEFAULTINITIAL_STATE__: JSON.stringify(defaultInitState),
            }
        }),
        {
            // 动态加载静态入口文件，用于路径拼接
            name: "inject-assets",
            transformIndexHtml(html, ctx: any) {
                if (ctx.chunk?.fileName && html.includes('__vitejs_load_entry(')) {
                    // 移除所有 <script type="module"> 标签（包括 Vite 注入的入口脚本）
                    html = html.replace(
                        /<script\s*type="module"\s*[^\>]*\s*src="([^"]+)"\s*>\s*<\/script>/g, (match, src) => {
                                if(!src || /^(http(s)?:)?\/\//i.test(src)) return match;
                                console.log('replace script', src, urlPrefix);

                                if(src.startsWith(urlPrefix)) src = src.replace(urlPrefix, '');
                                return "<script>" +
                                ` window.__vitejs_load_entry && window.__vitejs_load_entry('${src}', 'script');` +
                                "</script>";
                        }
                    );
                    // 移除所有 <link rel="modulepreload"> 标签（预加载脚本）
                    html = html.replace(/<link\s*rel="modulepreload"\s*[^\>]*\s*href="([^"]+)"\s*\/?>/g, (match, href) => {
                            if(!href || /^(http(s)?:)?\/\//i.test(href)) return match;
                            console.log('replace modulepreload', href, urlPrefix);

                            if(href.startsWith(urlPrefix)) href = href.replace(urlPrefix, '');
                            return "<script>" +
                            ` window.__vitejs_load_entry && window.__vitejs_load_entry('${href}', 'modulepreload');` +
                            "</script>";
                        }
                    );
                    // 移除所有 <link rel="stylesheet"> 标签（如果不需要 Vite 处理的 CSS）
                    html = html.replace(/<link\s*rel="stylesheet"\s*[^\>]*\s*href="([^"]+)"\s*\/?>/g, (match, href) => {
                            if(!href || /^(http(s)?:)?\/\//i.test(href)) return match;
                            console.log('replace stylesheet', href, urlPrefix);

                            if(href.startsWith(urlPrefix)) href = href.replace(urlPrefix, '');
                            return "<script>" +
                            ` window.__vitejs_load_entry && window.__vitejs_load_entry('${href}', 'stylesheet');` +
                            "</script>";
                        }
                    );
                    html = html.replace(/<link\s*rel="icon"\s*[^\>]*\s*href="([^"]+)"\s*\/?>/g, (match, href) => {
                            if(!href || /^(http(s)?:)?\/\//i.test(href)) return match;
                            console.log('replace icon', href, urlPrefix);
                            
                            if(href.startsWith(urlPrefix)) href = href.replace(urlPrefix, '');
                            return "<script>" +
                            ` window.__vitejs_load_entry && window.__vitejs_load_entry('${href}', 'icon');` +
                            "</script>";
                        }
                    );
                }
                return html;
            },
        },
        {
            name: 'server-api',
            configureServer(server) {
                server.middlewares.use((req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) => {
                    if (req.url?.startsWith('/api/')) {
                        // 示例：直接执行机器操作（如读取文件）
                        if (!serverRoute(req, res, next)) {
                            res.statusCode = 404;
                            res.end('Not Found');
                        }
                    } else {
                        next();
                    }
                });
            },
        },
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '#': fileURLToPath(new URL('../', import.meta.url)),
        },
    },
    build: {
        assetsDir: 'public',
        outDir: 'dist',
        manifest: true, // 关键！生成 manifest.json
        // 禁用 CSS 代码分割（避免生成额外的 <link>）
        //cssCodeSplit: false,
        modulePreload: true,
        rollupOptions: {
            input: getViewInputs(viewDir),
            output: {
                // { getModuleInfo }
                manualChunks(id, mod) {
                    const ms = [...id.matchAll(/\/node_modules\/([^\/]+)\//ig)];                    
                    //console.log(id, ms, mod);
                    if(ms && ms.length) {
                        const m = ms[ms.length -1];
                        if(m && m[1]) {
                            if(m[1].includes('@vue') || m[1].includes('vue-') || m[1] == 'vue') return 'vue';
                            if(m[1].includes('element-plus')) return 'element-plus';
                            if(m[1].includes('lodash')) return 'lodash';
                            if(m[1].includes('bootstrap')) return 'bootstrap';
                            if(m[1].includes('echarts')) return 'echarts';
                        }
                    }
                }
            }
        },
    },
    base: urlPrefix,
    server: {
        host: '0.0.0.0',
        port: +`${process.env.VITE_PORT}` || 5173,
        cors: true,
    },
});
export default config;

/**
 * 获取指定目录下的所有.html文件，并返回一个对象，该对象将每个文件名（不带.html扩展名）映射到其完整路径。
 * @param dir 指定的目录
 * @returns 返回文件名到路径的映射对象
 */
function getViewInputs(dir: string): { [key: string]: string } {
    const entries = fs.readdirSync(dir);
    const htmlFiles = entries.filter(filename => filename.endsWith('.html'));
    const inputObj: { [key: string]: string } = {};

    for (const file of htmlFiles) {
        const name = path.basename(file, '.html'); // 获取文件名，不包括扩展名
        inputObj[name] = path.resolve(dir, file);
    }

    // input: {
    //   index: resolve(__dirname, "./view/index.html"),
    //   mobile: resolve(__dirname, "./view/mobile.html"),
    // }
    return inputObj;
}



// 路由处理函数
async function serverRoute(req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) {
  try {
    console.log('request', req.url);
    if (!req.url?.startsWith('/api/')) {
      return next();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname || '';
    const method = req.method?.toLowerCase();

    // 统一处理为POST请求
    if (method !== 'post') {
      return sendError(res, 'Only POST method is allowed', 405);
    }

    const body = await getRequestBody(req);

    // 路由分发
    if (pathname.startsWith('/api/database/')) {
      const data = await serverRoute.handleDatabaseRoutes(pathname, body);
      sendJSON(res, data);
    } else {
      sendError(res, 'API not found', 404);
    }
  } catch (error: any) {
    console.error('Route error:', error);
    sendError(res, error.message || 'Internal server error', 500);
  }

  // 响应助手函数
    function sendJSON(res: http.ServerResponse, data: any, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ret: 0, msg: 'success', data }));
    }

    function sendError(res: http.ServerResponse, message: string, statusCode = 500) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ret: statusCode, msg: message }));
    }

    // 获取POST请求体
    async function getRequestBody(req: http.IncomingMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
            body += chunk.toString();
            });
            req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
            });
            req.on('error', reject);
        });
    }
}

