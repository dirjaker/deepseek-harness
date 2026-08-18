# dsh Desktop

English | [中文](README.zh.md)

Electron desktop host for DeepSeek Harness. The app boots the `desktop` profile inside the Electron main process, serves the existing Web UI on a loopback OS-assigned port, and loads that URL in a sandboxed BrowserWindow. This preserves Web feature parity while desktop-only affordances register through `ctx.desktop`.

## Development

```sh
pnpm desktop:dev
```

The development host starts a local Electron window and uses the same `$DSH_HOME` credentials, settings, profiles, sessions, and plugin patch layers as the CLI.

Run the deterministic desktop smoke before packaging:

```sh
pnpm desktop:smoke
```

## Packaging

```sh
pnpm desktop:pack
```

The pack command produces `dist/desktop/DeepSeek Harness-macOS-arm64.zip`. The first package target is an unsigned Apple Silicon `.app` archive; signing, notarization, `.dmg` layout, auto-update, and universal binaries are deferred. macOS may require opening the app from Finder with **Open** or allowing it in System Settings on first launch.

## Model Experience

None, as the app host starts an existing profile and does not assemble or send provider requests.

#### KV Cache effect

None; this app neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Unsigned local packaging** — the first release archive is a macOS arm64 `.app.zip`; signing, notarization, auto-update, `.dmg`, and universal binaries are deferred.
