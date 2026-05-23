const { app, BrowserWindow } = require('electron');
const path = require('path');

// Safe check: Only run Electron logic if we are actually in an Electron process
// This prevents errors when the file is required or loaded by Node/tsx during server startup
if (app && process.versions && process.versions.electron) {

  function createWindow() {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      title: "Hệ thống Quản lý Hóa đơn",
    });

    // Fix Google OAuth: Set a standard User-Agent because Google blocks Electron
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    win.webContents.setUserAgent(userAgent);

    // Allow popups for Google Login
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://accounts.google.com')) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            autoHideMenuBar: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
            }
          }
        };
      }
      return { action: 'deny' };
    });

    // Xử lý tự động ẩn menu bar trên Windows
    win.setMenuBarVisibility(false);

    if (isDev) {
      // Trong môi trường dev, load từ server (localhost:3000)
      win.loadURL('http://localhost:3000');
      // win.webContents.openDevTools(); // Optional: Open dev tools automatically
    } else {
      // Khi đã đóng gói, load file index.html từ thư mục dist
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  }

  app.whenReady().then(() => {
    createWindow();
  
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

} else {
  // Not in Electron environment, export nothing or log silently
  // console.log("[SYSTEM] Electron main script loaded outside of Electron environment. Skipping initialization.");
}
