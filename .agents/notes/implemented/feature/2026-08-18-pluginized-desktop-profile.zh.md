# Agent Note: Pluginized desktop profile

Status: implemented

[English](2026-08-18-pluginized-desktop-profile.md) | 中文

## Problem

DeepSeek Harness 需要一个 macOS 桌面应用，在保持 Web 功能一致性的同时继续遵循产品的插件组合模型。如果普通 Web 或 agent 包直接导入 Electron，菜单、通知和窗口动作就难以替换；如果另做一个 renderer，又容易与 Web client roster 漂移。

## Decision

`desktop` profile 是内置模板，按 `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@deepseek-ai/dsh-desktop-app` 分层。Electron 应用宿主通过共享 profile runner 启动该 profile，在配置行挂载前提供 `ctx.desktop`，并从 loopback 的系统分配端口加载现有 Web UI。因此 Web client 插件、settings、credentials、sessions、workspaces、tools 和插件页面都来自与 `dsh web` 相同的 Web bundle。

`@deepseek-ai/dsh-desktop` 拥有桌面 Service Definition。Provider 通过 `ctx.desktop` 暴露菜单注册、通知、窗口动作和能力事实；consumer 通过该服务注册，并观察 `desktop/*` 事件，而不导入 Electron。`@deepseek-ai/dsh-desktop-app` 是第一个 consumer bundle：它关闭 Web URL 输出，保持 server 只绑定 loopback，注册默认菜单命令，并注入小型桌面标题栏样式。

共享 profile runner 位于 `@deepseek-ai/dsh-app-boot`，所以 CLI 与嵌入式 app host 共享 profile 初始化、patch 分层、环境快照、随包 preset root、patch reload、telemetry 禁用和有界关闭。

## Alternatives considered

**通过 `file://` 加 IPC API carrier 加载 Web app。** 第一版拒绝该方案，因为现有 client module manifest、插件 bundle 服务和 WebSocket 下行已经能通过 loopback HTTP 提供完整 Web 功能一致性。当桌面 renderer 需要它时，file/IPC carrier 仍可与 `ctx.desktop` 拆分兼容。

**把 Electron main 当成一次性 app shell。** 被拒绝，因为桌面能力需要和其他 capability 一样的扩展姿态。Tauri provider、Keychain provider、tray 插件或自动更新插件都可以复用 `ctx.desktop`，而不用修改 Web 或 agent 包。

**立即替换 Web 布局。** 被拒绝，因为完整 Web 功能一致性是第一产品要求。desktop bundle 以后仍可通过 client slot 替换 `root`、`sidebar` 或 `conversation` 的 occupant，而不改变宿主能力。

## Consequences

`pnpm desktop:dev` 会启动一个本地 Electron 应用，并使用与 CLI 和 Web 表层相同的 `$DSH_HOME` 状态。应用尚不提供签名、公证、自动更新或 file/IPC carrier。需要 renderer 专属导航的菜单命令，在 typed renderer command bridge 出现前会聚焦窗口或使用现有设置 hook。
