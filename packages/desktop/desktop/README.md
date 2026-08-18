# `@deepseek-ai/dsh-desktop`

English | [中文](README.zh.md)

The desktop capability definition exposes `ctx.desktop` to desktop app compositions. Providers adapt a concrete host shell such as Electron, while consumers register native menu items, request redacted system notifications, or invoke window actions without importing host toolkit objects.

## Service API (`ctx.desktop`)

| Member | Semantics |
|---|---|
| `menu.register(item)` | Registers one native menu item and returns a disposer. Duplicate command ids fail loudly. |
| `notifications.notify(notification)` | Requests one system notification. The provider redacts DeepSeek-style API keys and caps the body before it emits `desktop/notification-requested`. |
| `window.focus()` / `minimize()` / `toggleDevTools()` / `showSettings()` | Window actions backed by the desktop provider. Missing host handlers are no-ops. |
| `capabilities` | Read-only facts describing which desktop affordances the provider backs. |

The service emits `desktop/menu-command`, `desktop/window-state-changed`, and `desktop/notification-requested`. Desktop plugins consume those events or register actions through the service; they do not import Electron, Tauri, or platform-specific APIs.

## Model Experience

### Desktop host affordances

#### What the model sees

The model sees no content from `ctx.desktop`. It defines host UI affordances and does not register prompt sections, tools, managed environment variables, or request adapters.

#### Token effect

No tokens are added.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No renderer bridge schema** — the first provider keeps menu and notification dispatch in the host process; a future desktop renderer bridge can extend this service without changing existing consumers.
