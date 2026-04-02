import { app, BrowserWindow, shell, Menu, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Toolbox',
    icon: path.join(__dirname, 'public/vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#ffffff',
    show: false
  });

  // 寮€鍙戞ā寮忓姞杞芥湰鍦版湇鍔″櫒
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:1420');
    win.webContents.openDevTools();
  } else {
    // 鐢熶骇妯″紡鍔犺浇鏈湴鏂囦欢
    // 灏濊瘯澶氫釜鍙兘鐨勮矾寰?    const possiblePaths = [
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'dist', 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
    ];

    let distPath = possiblePaths[0];
    for (const p of possiblePaths) {
      try {
        require('fs').accessSync(p);
        distPath = p;
        break;
      } catch (e) {
        // 缁х画灏濊瘯涓嬩竴涓矾寰?      }
    }

    win.loadFile(distPath);
  }

  // 鍔犺浇瀹屾垚鍚庢樉绀虹獥鍙?  win.once('ready-to-show', () => {
    win.show();
  });

  // 鎵撳紑澶栭儴閾炬帴
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 鍒涘缓鑿滃崟
  const menu = Menu.buildFromTemplate([
    {
      label: '鏂囦欢',
      submenu: [
        { role: 'reload', label: '閲嶆柊鍔犺浇' },
        { role: 'forceReload', label: '寮哄埗閲嶆柊鍔犺浇' },
        { type: 'separator' },
        { role: 'zoomIn', label: '鏀惧ぇ' },
        { role: 'zoomOut', label: '缂╁皬' },
        { role: 'resetZoom', label: '閲嶇疆缂╂斁' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '寮€鍙戣€呭伐鍏? },
        { type: 'separator' },
        { role: 'close', label: '鍏抽棴' }
      ]
    },
    {
      label: '缂栬緫',
      submenu: [
        { role: 'undo', label: '鎾ら攢' },
        { role: 'redo', label: '閲嶅仛' },
        { type: 'separator' },
        { role: 'cut', label: '鍓垏' },
        { role: 'copy', label: '澶嶅埗' },
        { role: 'paste', label: '绮樿创' },
        { role: 'selectAll', label: '鍏ㄩ€? }
      ]
    },
    {
      label: '鏌ョ湅',
      submenu: [
        { role: 'reload', label: '閲嶆柊鍔犺浇' },
        { type: 'separator' },
        { role: 'zoomIn', label: '鏀惧ぇ' },
        { role: 'zoomOut', label: '缂╁皬' },
        { role: 'resetZoom', label: '閲嶇疆缂╂斁' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '鍏ㄥ睆' }
      ]
    },
    {
      label: '甯姪',
      submenu: [
        {
          label: '鍏充簬',
          click: () => {
            dialog.showMessageBox(win, {
              type: 'info',
              title: '鍏充簬 Toolbox',
              message: 'Toolbox',
              detail: '鐗堟湰 1.2.0\n\n涓€涓姛鑳藉己澶х殑浜岀淮鐮佸伐鍏凤紝鏀寔鐢熸垚銆佽В鐮併€佹壒閲忓鐞嗙瓑鍔熻兘銆?
            });
          }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);
}

// 搴旂敤鍑嗗灏辩华
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 鎵€鏈夌獥鍙ｅ叧闂椂閫€鍑?app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 鐩戝惉鏈崟鑾风殑寮傚父
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

