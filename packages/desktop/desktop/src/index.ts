/**
 * Service Definition for the desktop host capability.
 *
 * Providers adapt a concrete shell such as Electron or Tauri, while consumers
 * register menu entries, request notifications, or invoke window actions
 * through `ctx.desktop` without importing host toolkit objects.
 * @module @deepseek-ai/dsh-desktop
 */

import { Context, Service } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Desktop host capability; provided only by desktop app surfaces. */
    desktop: DesktopHost
  }

  interface Events {
    /**
     * A desktop menu item was invoked.
     * @param command - Stable command id contributed by a desktop menu plugin.
     */
    'desktop/menu-command'(command: DesktopMenuCommand): void
    /**
     * The host window state changed.
     * @param state - Current window state.
     */
    'desktop/window-state-changed'(state: DesktopWindowState): void
    /**
     * A desktop notification request was accepted by the host provider.
     * @param notification - Redacted notification payload.
     */
    'desktop/notification-requested'(notification: DesktopNotification): void
  }
}

/** Stable command id delivered when a desktop menu item is selected. */
export type DesktopCommandId = string & { readonly __brand: 'DesktopCommandId' }

/** A command emitted from the native app menu. */
export interface DesktopMenuCommand {
  /** Stable id supplied by the registering plugin. */
  id: DesktopCommandId
}

/** One native menu item contributed by a plugin. */
export interface DesktopMenuItem {
  /** Stable command id. */
  id: DesktopCommandId
  /** User-visible menu label. */
  label: string
  /** Optional accelerator in Electron-style notation. */
  accelerator?: string
  /** Whether the item is currently enabled. Defaults to true. */
  enabled?: boolean
}

/** Registration API for desktop menu contributors. */
export interface DesktopMenuRegistry {
  /**
   * Register one native menu item.
   * @param item - Menu item definition.
   * @returns Disposer removing the menu item.
   */
  register(item: DesktopMenuItem): () => void
}

/** Redacted desktop notification payload. */
export interface DesktopNotification {
  /** Notification title. */
  title: string
  /** Optional short body; providers may truncate or drop it. */
  body?: string
}

/** Desktop notification API. */
export interface DesktopNotifications {
  /**
   * Request one system notification.
   * @param notification - Redacted notification payload.
   */
  notify(notification: DesktopNotification): void
}

/** Window actions exposed to plugins. */
export interface DesktopWindowActions {
  /** Focus and show the main desktop window. */
  focus(): void
  /** Minimize the main desktop window. */
  minimize(): void
  /** Toggle the developer tools for the main window. */
  toggleDevTools(): void
  /** Request the app to navigate to its settings affordance. */
  showSettings(): void
}

/** Current desktop window state. */
export interface DesktopWindowState {
  /** Whether the main window is focused. */
  focused: boolean
  /** Whether the main window is minimized. */
  minimized: boolean
}

/** Read-only desktop capability facts. */
export interface DesktopCapabilities {
  /** Whether native menus are backed by the host app. */
  menu: boolean
  /** Whether system notifications are backed by the host app. */
  notifications: boolean
  /** Whether native window actions are backed by the host app. */
  window: boolean
}

/** Complete desktop host capability. */
export interface DesktopHost {
  /** Native menu registration API. */
  menu: DesktopMenuRegistry
  /** System notification API. */
  notifications: DesktopNotifications
  /** Main-window action API. */
  window: DesktopWindowActions
  /** Provider capability facts. */
  capabilities: DesktopCapabilities
}

/** Handlers used by {@link DesktopService}. */
export interface DesktopServiceHandlers {
  /** Called after menu registration changes. */
  onMenuItemsChanged?: (items: readonly DesktopMenuItem[]) => void
  /** Called for accepted notifications. */
  onNotification?: (notification: DesktopNotification) => void
  /** Window action implementation. */
  window?: Partial<DesktopWindowActions>
}

/** In-process desktop service provider used by desktop app hosts. */
export class DesktopService extends Service implements DesktopHost {
  readonly capabilities: DesktopCapabilities
  readonly menu: DesktopMenuRegistry
  readonly notifications: DesktopNotifications
  readonly window: DesktopWindowActions

  private readonly items = new Map<DesktopCommandId, DesktopMenuItem>()

  constructor(ctx: Context, private readonly handlers: DesktopServiceHandlers = {}) {
    super(ctx, 'desktop')
    this.capabilities = {
      menu: handlers.onMenuItemsChanged !== undefined,
      notifications: handlers.onNotification !== undefined,
      window: handlers.window !== undefined,
    }
    this.menu = {
      register: item => this.registerMenuItem(item),
    }
    this.notifications = {
      notify: (notification) => {
        const redacted = redactNotification(notification)
        this.ctx.emit('desktop/notification-requested', redacted)
        this.handlers.onNotification?.(redacted)
      },
    }
    this.window = {
      focus: () => { handlers.window?.focus?.() },
      minimize: () => { handlers.window?.minimize?.() },
      toggleDevTools: () => { handlers.window?.toggleDevTools?.() },
      showSettings: () => { handlers.window?.showSettings?.() },
    }
  }

  /**
   * Snapshot the registered native menu items in insertion order.
   * @returns Registered menu items.
   */
  menuItems(): readonly DesktopMenuItem[] {
    return [...this.items.values()]
  }

  /**
   * Emit one registered menu command.
   * @param id - Registered command id.
   */
  emitMenuCommand(id: DesktopCommandId): void {
    if (!this.items.has(id)) return
    this.ctx.emit('desktop/menu-command', { id })
  }

  /**
   * Publish the current window state to Cordis observers.
   * @param state - Current desktop window state.
   */
  updateWindowState(state: DesktopWindowState): void {
    this.ctx.emit('desktop/window-state-changed', state)
  }

  private registerMenuItem(item: DesktopMenuItem): () => void {
    if (this.items.has(item.id)) throw new Error(`desktop: duplicate menu command ${JSON.stringify(item.id)}`)
    this.items.set(item.id, item)
    this.handlers.onMenuItemsChanged?.(this.menuItems())
    return () => {
      this.items.delete(item.id)
      this.handlers.onMenuItemsChanged?.(this.menuItems())
    }
  }
}

function redactNotification(notification: DesktopNotification): DesktopNotification {
  const body = notification.body?.replace(/sk-[A-Za-z0-9_-]+/g, 'sk-***')
  return {
    title: notification.title,
    ...(body === undefined ? {} : { body: body.slice(0, 240) }),
  }
}

export default DesktopService
