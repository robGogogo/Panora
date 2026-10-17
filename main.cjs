const { app, BrowserWindow, ipcMain, net } = require('electron')
const path = require('path')
function createWindow() {
  const win = new BrowserWindow({ width: 1400, height: 900, backgroundColor: '#17171a',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') } })
  win.setMenuBarVisibility(false)
  if (process.argv.includes('--dev')) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, 'dist', 'index.html'))
}
// Downloads remote images in the main process so there are no CORS limits (keeps exports clean)
ipcMain.handle('fetch-image', async (_e, url) => {
  if (!/^https:\/\//.test(url)) throw new Error('https only')
  const r = await net.fetch(url)
  const buf = Buffer.from(await r.arrayBuffer())
  return `data:${r.headers.get('content-type') || 'image/jpeg'};base64,` + buf.toString('base64')
})
app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
