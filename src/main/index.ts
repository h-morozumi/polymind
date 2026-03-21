import { app, BrowserWindow, shell, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerSystemHandlers, registerChatHandlers, registerLlmSettingsHandlers } from './ipc'
import { LlmSettingsService } from './services/llm-settings'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: is.dev,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    if (rendererUrl && url.startsWith(rendererUrl)) return
    if (url.startsWith('file://')) return
    event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'",
        ],
      },
    })
  })
}

app.whenReady().then(() => {
  if (!is.dev) {
    setupContentSecurityPolicy()
  }

  const llmSettingsPath = join(app.getPath('userData'), 'llm-settings.json')
  const llmSettingsService = new LlmSettingsService(llmSettingsPath)

  registerSystemHandlers()
  registerChatHandlers()
  registerLlmSettingsHandlers(llmSettingsService)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
