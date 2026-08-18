# dsh Desktop

[English](README.md) | 中文

DeepSeek Harness 的 Electron 桌面宿主。应用在 Electron main 进程中启动 `desktop` profile，把现有 Web UI 服务在 loopback 的系统分配端口上，并在 sandboxed BrowserWindow 中加载该 URL。这样可保留 Web 功能一致性，同时让桌面专属能力通过 `ctx.desktop` 注册。

## Development

```sh
pnpm desktop:dev
```

第一版开发目标不签名、不公证，也不打包 `.app`。它会启动一个本地 Electron 窗口，并使用与 CLI 相同的 `$DSH_HOME` 凭据、设置、profile、session 和插件 patch 层。

## Model Experience

None, as the app host starts an existing profile and does not assemble or send provider requests.

#### KV Cache effect

None; this app neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **没有发布打包** — 开发应用从源码运行；签名、公证、自动更新和可分发归档不属于第一版目标。
