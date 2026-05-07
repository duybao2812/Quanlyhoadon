const { contextBridge } = require('electron');

// Expose một object vào window để Web app nhận biết đang chạy trên Electron
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform
});
