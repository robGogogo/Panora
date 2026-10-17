const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('api', { fetchImage: (u) => ipcRenderer.invoke('fetch-image', u) })
