/**
 * @file Electron 主进程入口
 * @description 创建桌面窗口，通过 IPC 直接处理数据库 API 请求（无需 HTTP 服务）
 *
 * 生产模式：加载本地 HTML，API 通过主进程 IPC 通信
 * 开发模式：连接 Vite 开发服务器（API 走 HTTP）
 */

const { app, BrowserWindow, shell, ipcMain, protocol, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { initAutoUpdater } = require('./updater');

// ========== 日志输出到文件（生产模式调试用） ==========
// 打包后 __dirname 指向 app.asar 内部（只读），日志须写到用户数据目录
const logDir = app.isPackaged
  ? path.join(app.getPath('userData'), 'logs')
  : path.join(__dirname, '..', 'logs');
try { if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); } catch (e) { /* ignore */ }
const logFile = path.join(logDir, 'electron.log');
const logStream = (() => {
  try {
    return fs.createWriteStream(logFile, { flags: 'w' });
  } catch (e) { return null; }
})();
const origLog = console.log;
const origError = console.error;
const origWarn = console.warn;
function ts() { return new Date().toISOString(); }
console.log = function(...args) {
  origLog.apply(console, args);
  if (logStream) logStream.write(`[${ts()}] LOG ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
};
console.error = function(...args) {
  origError.apply(console, args);
  if (logStream) logStream.write(`[${ts()}] ERR ${args.map(a => typeof a === 'string' ? a : (a instanceof Error ? a.message + '\n' + a.stack : JSON.stringify(a))).join(' ')}\n`);
};
console.warn = function(...args) {
  origWarn.apply(console, args);
  if (logStream) logStream.write(`[${ts()}] WRN ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`);
};
console.log(`[Electron] Log file: ${logFile}`);
console.log(`[Electron] App starting, packaged: ${app.isPackaged}, platform: ${process.platform}, arch: ${process.arch}`);
console.log(`[Electron] __dirname: ${__dirname}, cwd: ${process.cwd()}`);

// ========== 注册自定义协议（必须在 app.whenReady 之前） ==========
// 解决 file:// 协议下绝对路径（/public/xxx.js）无法加载的问题
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// 解析命令行参数
const args = process.argv.slice(app.isPackaged ? 1 : 2);
const devUrl = args.find(a => a.startsWith('--dev-url='))?.split('=')[1];
const isDev = !!devUrl;

let mainWindow = null;

// ========== 服务实例（延迟加载） ==========
let _serverModule = null;

function getServerModule() {
  if (_serverModule) return _serverModule;
  if (isDev) {
    console.warn('[Electron] Dev mode: services are provided by Vite dev server, IPC disabled');
    return null;
  }
  try {
    // 生产模式下，__dirname 指向 app.asar/electron/
    // 需要加载 app.asar/dist/server/index.js
    const serverPath = path.join(__dirname, '..', 'dist', 'server', 'index.js');
    console.log(`[Electron] Loading server module from: ${serverPath}`);
    console.log(`[Electron] __dirname: ${__dirname}`);
    console.log(`[Electron] File exists: ${require('fs').existsSync(serverPath)}`);
    
    // 在 asar 包内，需要使用 require 直接加载，而不是先检查文件是否存在
    _serverModule = require(serverPath);
    console.log(`[Electron] Server module loaded, keys: ${Object.keys(_serverModule).join(', ')}`);
    return _serverModule;
  } catch (e) {
    console.error(`[Electron] Failed to load server module: ${e.message}`);
    console.error(e.stack);
    return null;
  }
}

// ========== API IPC 处理（替代渲染进程 HTTP 请求） ==========

function setupApiIPC() {
  ipcMain.handle('api:request', async (_event, payload) => {
    const serverModule = getServerModule();
    if (!serverModule) {
      return { ret: 500, msg: 'Services not available (dev mode - use Vite HTTP server instead)' };
    }
    try {
      const pathname = String(payload?.pathname || '');
      if (!pathname.startsWith('/api/')) {
        return { ret: 400, msg: 'Invalid API path' };
      }
      const data = await serverModule.handleDatabaseRoutes(pathname, payload?.body || {});
      // 确保返回数据可被 structured clone 序列化（去除 TypeORM 实体等复杂对象）
      let safeData;
      try {
        safeData = JSON.parse(JSON.stringify(data));
      } catch (e) {
        safeData = data;
      }
      return { ret: 0, msg: 'success', data: safeData };
    } catch (err) {
      console.error('[IPC] API request failed:', err);
      return { ret: 500, msg: err.message || 'Internal error' };
    }
  });
}

// ========== 创建窗口 ==========

function createWindow(loadTarget) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    title: 'FDB2 - 数据库管理工具',
    icon: path.join(__dirname, '..', 'public', process.platform === 'darwin' || process.platform === 'win32' ? 'favicon.ico' : 'favicon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (loadTarget.startsWith('http')) {
    mainWindow.loadURL(loadTarget);
  } else if (loadTarget.startsWith('app://')) {
    mainWindow.loadURL(loadTarget);
  } else {
    mainWindow.loadFile(loadTarget);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // 生产模式下可通过快捷键打开 DevTools 调试
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.meta || input.control) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

// ========== 应用菜单 ==========

function setupMenu() {
  const template = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About FDB2', click: () => shell.openExternal('https://github.com/fefeding/fdb2') },
        { type: 'separator' },
        { label: 'Check for Updates...', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('menu:action', 'check-update');
          }
        }},
      ],
    },
  ];

  // macOS 需要添加 app 菜单
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { label: 'About FDB2', click: () => shell.openExternal('https://github.com/fefeding/fdb2') },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ========== 应用生命周期 ==========

app.whenReady().then(() => {
  // 注册 app:// 协议处理器（生产模式加载本地文件）
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    // app://local/xxx → 项目根目录/dist/xxx
    const filePath = path.join(__dirname, '..', 'dist', pathname);
    return net.fetch('file://' + filePath);
  });

  setupApiIPC();
  setupMenu();

  // 初始化服务（仅生产模式加载模块，开发模式由 Vite 提供）
  try {
    const serverModule = getServerModule();
    if (serverModule) {
      console.log('[Electron] Server module initialized (production mode)');
    } else {
      console.log('[Electron] Server module skipped (dev mode - using Vite dev server)');
    }
  } catch (e) {
    console.error('[Electron] Failed to initialize server module:', e.message);
  }

  let target;
  if (isDev) {
    target = devUrl;
    console.log(`[Electron] Dev mode, connecting to ${target}`);
  } else {
    target = 'app://local/view/index.html';
    console.log(`[Electron] Production mode, loading ${target}`);
  }

  createWindow(target);

  // 初始化自动更新（生产模式启用，开发模式自动禁用）
  initAutoUpdater({ isDev });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(target);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
