import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { DesktopService, type DesktopMenuItem } from '@deepseek-ai/dsh-desktop'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { apply, COMMAND_SETTINGS, COMMAND_TOGGLE_DEVTOOLS } from '../src/index.ts'

function fakeWebServer(): { server: WebServer; tap(html: string): string } {
  let transform = (html: string) => html
  return {
    server: {
      tapIndex: (fn: (html: string) => string) => {
        transform = fn
        return () => { transform = html => html }
      },
    } as unknown as WebServer,
    tap: html => transform(html),
  }
}

describe('desktop-app bundle glue', () => {
  it('registers desktop menu items, dispatches window actions, and injects desktop CSS', async () => {
    const ctx = new Context()
    const web = fakeWebServer()
    ctx.provide('webServer', web.server)
    const menus: (readonly DesktopMenuItem[])[] = []
    const actions: string[] = []
    const desktop = new DesktopService(ctx, {
      onMenuItemsChanged: (items) => { menus.push(items) },
      window: {
        focus: () => { actions.push('focus') },
        showSettings: () => { actions.push('settings') },
        toggleDevTools: () => { actions.push('devtools') },
      },
    })

    apply(ctx)
    expect(menus.at(-1)?.map(item => item.id)).toEqual([
      'desktop.new-session',
      'desktop.open-workspace',
      'desktop.settings',
      'desktop.toggle-devtools',
    ])
    expect(web.tap('<html><head></head></html>')).toContain('dsh-desktop-style')

    desktop.emitMenuCommand(COMMAND_SETTINGS)
    desktop.emitMenuCommand(COMMAND_TOGGLE_DEVTOOLS)
    expect(actions).toEqual(['settings', 'devtools'])

    await ctx.fiber.dispose()
    expect(desktop.menuItems()).toEqual([])
    expect(web.tap('<head></head>')).toBe('<head></head>')
  })
})
