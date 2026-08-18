# Agent Note: Pluginized desktop profile

Status: implemented

English | [中文](2026-08-18-pluginized-desktop-profile.zh.md)

## Problem

DeepSeek Harness needs a macOS desktop app that keeps Web feature parity while still following the product's plugin composition model. A desktop host that imports Electron from ordinary Web or agent packages would make menus, notifications, and window actions hard to replace, and a separate renderer would risk drifting from the Web client roster.

## Decision

The `desktop` profile is an in-box template layered as `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, then `@deepseek-ai/dsh-desktop-app`. The Electron app host boots that profile through the shared profile runner, provides `ctx.desktop` before config rows mount, and loads the existing Web UI from a loopback OS-assigned port. Web client plugins, settings, credentials, sessions, workspaces, tools, and plugin pages therefore come from the same Web bundle as `dsh web`.

`@deepseek-ai/dsh-desktop` owns the desktop Service Definition. Providers expose menu registration, notifications, window actions, and capability facts through `ctx.desktop`; consumers register through that service and observe `desktop/*` events without importing Electron. `@deepseek-ai/dsh-desktop-app` is the first consumer bundle: it suppresses the Web URL line, keeps the server loopback-only, registers default menu commands, and injects the small desktop titlebar style.

The shared profile runner lives in `@deepseek-ai/dsh-app-boot` so CLI and embedded app hosts share profile initialization, patch layering, environment snapshots, shipped preset roots, patch reload, telemetry disabling, and bounded shutdown.

## Alternatives considered

**Load the Web app over `file://` with an IPC API carrier.** Rejected for the first release because the existing client module manifest, plugin bundle serving, and WebSocket downlinks already provide full Web parity over loopback HTTP. A file-and-IPC carrier remains compatible with the `ctx.desktop` split when the desktop renderer needs it.

**Treat Electron main as a one-off app shell.** Rejected because desktop affordances need the same extension posture as other capabilities. A Tauri provider, Keychain provider, tray plugin, or auto-update plugin can reuse `ctx.desktop` without changing Web or agent packages.

**Replace the Web layout immediately.** Rejected because full Web parity is the first product requirement. The desktop bundle can later replace client slot occupants for `root`, `sidebar`, or `conversation` without changing the host capability.

## Consequences

`pnpm desktop:dev` starts a local Electron app that uses the same `$DSH_HOME` state as the CLI and Web surfaces. The app does not yet ship signing, notarization, automatic updates, or a file/IPC carrier. Menu commands that need renderer-specific navigation focus the window or use the current settings hook until a typed renderer command bridge exists.
