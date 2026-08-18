# dsh Desktop

[English](README.md) | 中文

DeepSeek Harness 的 Electron 桌面宿主。应用在 Electron main 进程中启动 `desktop` profile，把现有 Web UI 服务在 loopback 的系统分配端口上，并在 sandboxed BrowserWindow 中加载该 URL。这样可保留 Web 功能一致性，同时让桌面专属能力通过 `ctx.desktop` 注册。

## Development

```sh
pnpm desktop:dev
```

开发宿主会启动一个本地 Electron 窗口，并使用与 CLI 相同的 `$DSH_HOME` 凭据、设置、profile、session 和插件 patch 层。

打包前运行确定性的桌面 smoke：

```sh
pnpm desktop:smoke
```

## Packaging

```sh
pnpm desktop:pack
```

打包命令会产出 `dist/desktop/DeepSeek Harness-macOS-arm64.zip`。第一版打包目标是 unsigned Apple Silicon `.app` 归档；签名、公证、`.dmg` 布局、自动更新和 universal binary 暂缓。macOS 首次打开时可能需要在 Finder 中右键选择**打开**，或到系统设置中允许。

## Model Experience

None, as the app host starts an existing profile and does not assemble or send provider requests.

#### KV Cache effect

None; this app neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **本地 unsigned 打包** — 第一版发布归档是 macOS arm64 `.app.zip`；签名、公证、自动更新、`.dmg` 和 universal binary 暂缓。
