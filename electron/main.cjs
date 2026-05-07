const { app, BrowserWindow } = require('electron');
const path = require('path');

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

  // Xử lý tự động ẩn menu bar trên Windows
  win.setMenuBarVisibility(false);

  if (isDev) {
    // Trong môi trường dev, load từ server (localhost:3000)
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
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
