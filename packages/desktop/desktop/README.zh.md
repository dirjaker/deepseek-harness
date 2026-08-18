# `@deepseek-ai/dsh-desktop`

[English](README.md) | 中文

桌面能力定义把 `ctx.desktop` 暴露给桌面应用组合。Provider 适配 Electron 这类具体宿主壳；consumer 通过服务注册原生菜单、请求已脱敏的系统通知，或调用窗口动作，而不导入宿主工具包对象。

## Service API（`ctx.desktop`）

| 成员 | 语义 |
|---|---|
| `menu.register(item)` | 注册一个原生菜单项并返回 disposer。重复 command id 会明确失败。 |
| `notifications.notify(notification)` | 请求一条系统通知。Provider 在发出 `desktop/notification-requested` 前会脱敏 DeepSeek 风格 API key，并限制正文长度。 |
| `window.focus()` / `minimize()` / `toggleDevTools()` / `showSettings()` | 由桌面 provider 支持的窗口动作。缺少宿主 handler 时是 no-op。 |
| `capabilities` | 只读能力事实，说明 provider 支持哪些桌面能力。 |

服务会发出 `desktop/menu-command`、`desktop/window-state-changed` 和 `desktop/notification-requested`。桌面插件通过这些事件或服务注册动作；它们不导入 Electron、Tauri 或平台专用 API。

## 模型体验

### 桌面宿主能力

#### 模型可见内容

模型不会看到来自 `ctx.desktop` 的内容。本包定义宿主 UI 能力，不注册提示词段、工具、托管环境变量或请求适配器。

#### Token 影响

不增加 token。

#### KV Cache 影响

无；本包既不组装也不发送 provider 请求。

## 已知限制与暂缓工作

- **没有 renderer bridge schema** — 第一版 provider 把菜单和通知分发保留在宿主进程；未来的桌面 renderer bridge 可以扩展该服务，不改变现有 consumer。
