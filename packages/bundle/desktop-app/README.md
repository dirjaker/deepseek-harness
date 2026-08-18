# `@deepseek-ai/dsh-desktop-app`

English | [中文](README.zh.md)

The desktop bundle layers over [`dsh-web-app`](../web-app/) so the desktop app inherits the Web client roster and API carrier. Its patch binds the Web server to `127.0.0.1` on an OS-assigned port, disables the shell URL line, and inserts this package's host plugin.

The host plugin consumes `ctx.desktop` and `ctx.webServer`. It registers the default desktop menu commands, emits no Electron-specific objects, and injects a small index style that reserves a draggable macOS titlebar strip without replacing the Web layout. A future desktop UI bundle can replace `ui-layout`, `ui-sidebar`, or `ui-conversation` through the same client slot system while keeping this bundle's host capability wiring.

## Model Experience

### Desktop bundle glue

#### What the model sees

The mounted `dsh-web-app` bundle contributes the Web surface prompt section and browser-facing client roster. This bundle only registers host-local desktop menu commands and the index style layer.

#### Token effect

No additional tokens beyond the mounted Web bundle.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

- **Menu commands are host-local gestures** — the first bundle focuses the window or opens settings; New Session and Open Workspace use existing Web affordances after focus until a renderer command bridge exists.
