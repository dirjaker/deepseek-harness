import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { DesktopService, type DesktopMenuItem } from '../src/index.ts'

const command = (id: string) => id as DesktopMenuItem['id']

describe('DesktopService', () => {
  it('registers menu items with effect-style disposers and emits menu commands', () => {
    const ctx = new Context()
    const menus: (readonly DesktopMenuItem[])[] = []
    const desktop = new DesktopService(ctx, {
      onMenuItemsChanged: (items) => { menus.push(items) },
    })
    const seen: string[] = []
    ctx.on('desktop/menu-command', (event) => { seen.push(event.id) })
    const dispose = desktop.menu.register({ id: command('desktop.test'), label: 'Test' })

    expect(desktop.capabilities).toEqual({ menu: true, notifications: false, window: false })
    expect(menus).toEqual([[{ id: command('desktop.test'), label: 'Test' }]])
    desktop.emitMenuCommand(command('desktop.test'))
    expect(seen).toEqual(['desktop.test'])

    dispose()
    expect(desktop.menuItems()).toEqual([])
    desktop.emitMenuCommand(command('desktop.test'))
    expect(seen).toEqual(['desktop.test'])
  })

  it('rejects duplicate menu commands and redacts notification bodies', () => {
    const ctx = new Context()
    const notifications: unknown[] = []
    const desktop = new DesktopService(ctx, {
      onNotification: (notification) => { notifications.push(notification) },
    })
    desktop.menu.register({ id: command('x'), label: 'X' })
    expect(() => { desktop.menu.register({ id: command('x'), label: 'Y' }) }).toThrow('duplicate menu command')

    const events: unknown[] = []
    ctx.on('desktop/notification-requested', (notification) => { events.push(notification) })
    desktop.notifications.notify({ title: 'Done', body: `secret sk-${'a'.repeat(40)}` })
    expect(events).toEqual([{ title: 'Done', body: 'secret sk-***' }])
    expect(notifications).toEqual(events)
  })
})
