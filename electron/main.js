import { accessSync } from 'fs';
import electron from 'electron';
import updaterPackage from 'electron-updater';
import path from 'path';
import { fileURLToPath } from 'url';

const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = electron;
const { autoUpdater } = updaterPackage;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;
let manualCheckRequested = false;
let updateState = {
  phase: 'idle',
  message: '未检查更新',
  progress: 0,
  version: null,
};

function setUpdateState(nextState) {
  updateState = {
    ...updateState,
    ...nextState,
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', updateState);
  }
}

function resolveRendererEntry() {
  const possiblePaths = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
    path.join(process.resourcesPath, 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
  ];

  for (const currentPath of possiblePaths) {
    try {
      accessSync(currentPath);
      return currentPath;
    } catch {
      continue;
    }
  }

  return possiblePaths[0];
}

async function promptDownloadUpdate(updateInfo) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '发现新版本',
    message: `检测到新版本 ${updateInfo.version}`,
    detail: '是否立即下载更新？',
    buttons: ['立即下载', '稍后'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    setUpdateState({
      phase: 'downloading',
      message: `正在下载 ${updateInfo.version}`,
      progress: 0,
      version: updateInfo.version,
    });
    await autoUpdater.downloadUpdate();
  } else {
    setUpdateState({
      phase: 'available',
      message: `发现新版本 ${updateInfo.version}`,
      progress: 0,
      version: updateInfo.version,
    });
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      phase: 'checking',
      message: '正在检查更新...',
      progress: 0,
      version: null,
    });
  });

  autoUpdater.on('update-available', async (updateInfo) => {
    try {
      await promptDownloadUpdate(updateInfo);
    } catch (error) {
      console.error('Failed to prompt update download:', error);
    } finally {
      manualCheckRequested = false;
    }
  });

  autoUpdater.on('update-not-available', async () => {
    setUpdateState({
      phase: 'not-available',
      message: '当前已是最新版本',
      progress: 0,
      version: app.getVersion(),
    });

    if (manualCheckRequested && mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
      });
    }

    manualCheckRequested = false;
  });

  autoUpdater.on('download-progress', (progressInfo) => {
    const progress = Math.round(progressInfo.percent || 0);
    setUpdateState({
      phase: 'downloading',
      message: `正在下载更新... ${progress}%`,
      progress,
    });
  });

  autoUpdater.on('update-downloaded', async (updateInfo) => {
    setUpdateState({
      phase: 'downloaded',
      message: `更新已下载 (${updateInfo.version})`,
      progress: 100,
      version: updateInfo.version,
    });

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `版本 ${updateInfo.version} 已下载完成`,
      detail: '是否现在重启并安装更新？',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', async (error) => {
    console.error('Auto update error:', error);

    setUpdateState({
      phase: 'error',
      message: error?.message || '更新失败',
      progress: 0,
    });

    if (manualCheckRequested && mainWindow && !mainWindow.isDestroyed()) {
      await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: '更新失败',
        message: error?.message || '更新失败',
      });
    }

    manualCheckRequested = false;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Toolbox',
    icon: path.join(__dirname, '..', 'public', 'vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#ffffff',
    show: false,
  });

  mainWindow = win;

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:1420');
    win.webContents.openDevTools();
  } else {
    win.loadFile(resolveRendererEntry());
  }

  win.once('ready-to-show', () => {
    win.show();
    setUpdateState(updateState);
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const menu = Menu.buildFromTemplate([
    {
      label: '文件',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'close', label: '关闭' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '检查更新',
          click: () => {
            manualCheckRequested = true;
            autoUpdater.checkForUpdates().catch((error) => {
              console.error('Manual update check failed:', error);
            });
          },
        },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: '关于 Toolbox',
              message: 'Toolbox',
              detail: `版本 ${app.getVersion()}\n\n一个功能强大的工具箱，支持二维码、编码转换、JSON 格式化和图片工具。`,
            });
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}

ipcMain.handle('updater:check-for-updates', async () => {
  manualCheckRequested = true;
  await autoUpdater.checkForUpdates();
  return updateState;
});

ipcMain.handle('updater:get-status', async () => updateState);

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();

  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        console.error('Startup update check failed:', error);
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
