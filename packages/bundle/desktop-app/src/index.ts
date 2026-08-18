/**
 * Desktop app bundle glue: registers native menu items and injects the small
 * desktop presentation layer over the Web client.
 * @module @deepseek-ai/dsh-desktop-app
 */

import type { Context } from '@deepseek-ai/cordis'
import type { DesktopCommandId } from '@deepseek-ai/dsh-desktop'
import type {} from '@deepseek-ai/dsh-desktop'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** Plugin name. */
export const name = 'desktop-app'

/** Required host services. */
export const inject = ['desktop', 'webServer']

/** Native command id for starting a new session from the desktop menu. */
export const COMMAND_NEW_SESSION = 'desktop.new-session' as DesktopCommandId
/** Native command id for opening the workspace picker from the desktop menu. */
export const COMMAND_OPEN_WORKSPACE = 'desktop.open-workspace' as DesktopCommandId
/** Native command id for opening settings from the desktop menu. */
export const COMMAND_SETTINGS = 'desktop.settings' as DesktopCommandId
/** Native command id for toggling developer tools from the desktop menu. */
export const COMMAND_TOGGLE_DEVTOOLS = 'desktop.toggle-devtools' as DesktopCommandId

const DESKTOP_STYLE = `
<style id="dsh-desktop-style">
body {
  --dsh-desktop-titlebar-height: 28px;
}
body::before {
  content: "";
  position: fixed;
  inset: 0 0 auto 0;
  height: var(--dsh-desktop-titlebar-height);
  -webkit-app-region: drag;
  z-index: 2147483647;
  pointer-events: none;
}
#root {
  min-height: 100vh;
}
@media (min-width: 720px) {
  body {
    background: color-mix(in srgb, var(--dsw-alias-bg-base, #f7f7f7) 94%, #000 6%);
  }
}
</style>
`

/**
 * Register desktop menu defaults and desktop-only index styling.
 * @param ctx - Plugin context carrying the desktop service and web server.
 */
export function apply(ctx: Context): void {
  ctx.effect(
    () => ctx.webServer.tapIndex(html => html.replace('</head>', `${DESKTOP_STYLE}</head>`)),
    'desktop-app: index styling',
  )
  ctx.effect(() => {
    const disposers = [
      ctx.desktop.menu.register({ id: COMMAND_NEW_SESSION, label: 'New Session', accelerator: 'CommandOrControl+N' }),
      ctx.desktop.menu.register({ id: COMMAND_OPEN_WORKSPACE, label: 'Open Workspace...', accelerator: 'CommandOrControl+O' }),
      ctx.desktop.menu.register({ id: COMMAND_SETTINGS, label: 'Settings', accelerator: 'CommandOrControl+,' }),
      ctx.desktop.menu.register({ id: COMMAND_TOGGLE_DEVTOOLS, label: 'Toggle Developer Tools', accelerator: 'Alt+CommandOrControl+I' }),
    ]
    const off = ctx.on('desktop/menu-command', ({ id }) => {
      switch (id) {
        case COMMAND_NEW_SESSION:
          ctx.desktop.window.focus()
          break
        case COMMAND_OPEN_WORKSPACE:
          ctx.desktop.window.focus()
          break
        case COMMAND_SETTINGS:
          ctx.desktop.window.showSettings()
          break
        case COMMAND_TOGGLE_DEVTOOLS:
          ctx.desktop.window.toggleDevTools()
          break
        default:
          break
      }
    })
    return () => {
      off()
      for (const dispose of disposers.reverse()) dispose()
    }
  }, 'desktop-app: menu defaults')
}
