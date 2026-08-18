# dsh Desktop

English | [中文](README.zh.md)

Electron desktop host for DeepSeek Harness. The app boots the `desktop` profile inside the Electron main process, serves the existing Web UI on a loopback OS-assigned port, and loads that URL in a sandboxed BrowserWindow. This preserves Web feature parity while desktop-only affordances register through `ctx.desktop`.

## Development

```sh
pnpm desktop:dev
```

The first development target does not sign, notarize, or package a `.app`. It starts a local Electron window and uses the same `$DSH_HOME` credentials, settings, profiles, sessions, and plugin patch layers as the CLI.

## Model Experience

None, as the app host starts an existing profile and does not assemble or send provider requests.

#### KV Cache effect

None; this app neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No release packaging** — the development app runs from source; signing, notarization, auto-update, and distributable archives are intentionally outside this first target.
