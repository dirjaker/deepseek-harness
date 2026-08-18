# 桌面端

[English](desktop.md) | 中文

桌面端子系统向插件暴露原生宿主能力，但不暴露 Electron 或其他 app toolkit。桌面应用宿主提供 `ctx.desktop`；功能插件通过该服务注册菜单、请求脱敏通知，并调用窗口动作。

第一版 provider 是 macOS Electron 桌面宿主。该能力保持可选：Web、CLI、headless 和 TUI profile 不提供 `ctx.desktop`。

## Cordis API

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — this section is byte-identical in both language sides of the page. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxdesktop--desktophost"></a>

### `ctx.desktop` — `DesktopHost`

Complete desktop host capability.

Source: [`packages/desktop/desktop/src/index.ts:120`](../../packages/desktop/desktop/src/index.ts)

<a id="desktop-events"></a>

### `desktop/*` events

<a id="desktopmenu-command--emit"></a>

#### `desktop/menu-command` — emit

A desktop menu item was invoked.

```ts cordis-catalog
/**
 * A desktop menu item was invoked.
 * @param command - Stable command id contributed by a desktop menu plugin.
 * @mode emit
 */
'desktop/menu-command'(command: DesktopMenuCommand): void
```

Source: [`packages/desktop/desktop/src/index.ts:25`](../../packages/desktop/desktop/src/index.ts)

<a id="desktopnotification-requested--emit"></a>

#### `desktop/notification-requested` — emit

A desktop notification request was accepted by the host provider.

```ts cordis-catalog
/**
 * A desktop notification request was accepted by the host provider.
 * @param notification - Redacted notification payload.
 * @mode emit
 */
'desktop/notification-requested'(notification: DesktopNotification): void
```

Source: [`packages/desktop/desktop/src/index.ts:37`](../../packages/desktop/desktop/src/index.ts)

<a id="desktopwindow-state-changed--emit"></a>

#### `desktop/window-state-changed` — emit

The host window state changed.

```ts cordis-catalog
/**
 * The host window state changed.
 * @param state - Current window state.
 * @mode emit
 */
'desktop/window-state-changed'(state: DesktopWindowState): void
```

Source: [`packages/desktop/desktop/src/index.ts:31`](../../packages/desktop/desktop/src/index.ts)
<!-- END GENERATED cordis-surface -->
