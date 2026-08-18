/**
 * Electron main entry for the dsh desktop app.
 * @module @deepseek-ai/dsh-desktop-app-host
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import electron, { type BrowserWindow as BrowserWindowType, type NativeImage, type MenuItemConstructorOptions } from 'electron'
import { DesktopService, type DesktopMenuItem } from '@deepseek-ai/dsh-desktop'
import { loadLayeredEnv, runProfile } from '@deepseek-ai/dsh-app-boot'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

const { app, BrowserWindow, Menu, Notification, shell } = electron

const NAME = 'dsh-desktop'
const __dirname = dirname(fileURLToPath(import.meta.url))
const INSTALL_ANCHOR = fileURLToPath(new URL('../package.json', import.meta.url))
const SHIPPED_PRESET_ROOT = fileURLToPath(new URL('../../cli/config/agent-presets/', import.meta.url))
const PRELOAD = join(__dirname, 'preload.js')
const ICON = fileURLToPath(new URL('../assets/icon.png', import.meta.url))

let mainWindow: BrowserWindowType | undefined
let rootContext: Context | undefined
let desktopService: DesktopService | undefined
let quitting = false
let smokeQuitScheduled = false
let appIcon: NativeImage | undefined

function toElectronMenuItem(item: DesktopMenuItem): MenuItemConstructorOptions {
  return {
    label: item.label,
    enabled: item.enabled ?? true,
    click: () => { desktopService?.emitMenuCommand(item.id) },
    ...(item.accelerator === undefined ? {} : { accelerator: item.accelerator }),
  }
}

function renderMenu(items: readonly DesktopMenuItem[]): void {
  const appMenu: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { label: 'Settings...', accelerator: 'CommandOrControl+,', click: () => { desktopService?.window.showSettings() } },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: items
        .filter(item => item.id !== 'desktop.settings')
        .map(toElectronMenuItem),
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { label: 'Toggle Developer Tools', accelerator: 'Alt+CommandOrControl+I', click: () => { desktopService?.window.toggleDevTools() } },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenu))
}

function createDesktopService(ctx: Context): DesktopService {
  const service = new DesktopService(ctx, {
    onMenuItemsChanged: renderMenu,
    onNotification: (notification) => {
      if (!Notification.isSupported()) return
      new Notification(notification).show()
    },
    window: {
      focus: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
      minimize: () => { mainWindow?.minimize() },
      toggleDevTools: () => { mainWindow?.webContents.toggleDevTools() },
      showSettings: () => {
        mainWindow?.show()
        mainWindow?.focus()
        mainWindow?.webContents.send('dsh-desktop-command', { command: 'settings' })
      },
    },
  })
  desktopService = service
  renderMenu([])
  return service
}

function createMainWindow(url: string): BrowserWindowType {
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'DeepSeek Harness',
    ...(appIcon === undefined ? {} : { icon: appIcon }),
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: PRELOAD,
    },
  })
  const scheduleSmokeQuit = (): void => {
    if (process.env.DSH_DESKTOP_SMOKE === '1') {
      if (smokeQuitScheduled) return
      smokeQuitScheduled = true
      setTimeout(() => { void app.quit() }, 500)
    }
  }
  window.once('ready-to-show', () => {
    window.show()
    scheduleSmokeQuit()
  })
  window.webContents.once('did-finish-load', scheduleSmokeQuit)
  window.on('focus', () => { desktopService?.updateWindowState({ focused: true, minimized: window.isMinimized() }) })
  window.on('blur', () => { desktopService?.updateWindowState({ focused: false, minimized: window.isMinimized() }) })
  window.on('minimize', () => { desktopService?.updateWindowState({ focused: window.isFocused(), minimized: true }) })
  window.on('restore', () => { desktopService?.updateWindowState({ focused: window.isFocused(), minimized: false }) })
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    void shell.openExternal(target)
    return { action: 'deny' }
  })
  void window.loadURL(url)
  return window
}

async function bootDesktop(): Promise<void> {
  const launched = await runProfile({
    binName: NAME,
    environment: loadLayeredEnv(NAME),
    profile: 'desktop',
    patchFiles: [],
    args: [],
    installAnchor: INSTALL_ANCHOR,
    shippedPresetRoot: SHIPPED_PRESET_ROOT,
    processHooks: false,
    watchPatches: false,
    forceExit: (code) => { app.exit(code) },
    complete: (code) => { process.exitCode = code },
    prepare: (ctx) => {
      createDesktopService(ctx)
    },
  })
  rootContext = launched.ctx
  const webServer = launched.ctx.get('webServer')
  if (webServer === undefined) throw new Error('dsh-desktop: desktop profile did not provide webServer')
  mainWindow = createMainWindow(`http://127.0.0.1:${String(webServer.port)}`)
}

function installAppIcon(): void {
  appIcon = electron.nativeImage.createFromPath(ICON)
  if (appIcon.isEmpty()) return
  app.dock?.setIcon(appIcon)
}

app.name = 'DeepSeek Harness'

app.whenReady().then(async () => {
  installAppIcon()
  await bootDesktop()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && rootContext?.get('webServer') !== undefined) {
      mainWindow = createMainWindow(`http://127.0.0.1:${String(rootContext.webServer.port)}`)
    } else {
      mainWindow?.show()
    }
  })
}).catch((error) => {
  console.dir(error, { depth: null })
  app.exit(1)
})

app.on('before-quit', (event) => {
  if (quitting) return
  quitting = true
  event.preventDefault()
  Promise.resolve(rootContext?.fiber.dispose()).finally(() => { app.quit() })
})
