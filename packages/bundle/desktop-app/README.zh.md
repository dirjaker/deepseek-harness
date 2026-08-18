# `@deepseek-ai/dsh-desktop-app`

[English](README.md) | 中文

desktop bundle 叠在 [`dsh-web-app`](../web-app/) 之上，因此桌面应用继承 Web client roster 和 API carrier。它的 patch 把 Web server 绑定到 `127.0.0.1` 的系统分配端口，关闭 shell URL 输出，并插入本包的 host 插件。

host 插件消费 `ctx.desktop` 和 `ctx.webServer`。它注册默认桌面菜单命令，不发出 Electron 专用对象，并注入一小段 index 样式，为 macOS 可拖拽标题栏预留区域，但不替换 Web 布局。未来的桌面 UI bundle 可以通过同一套 client slot 系统替换 `ui-layout`、`ui-sidebar` 或 `ui-conversation`，同时保留本 bundle 的宿主能力接线。

## 模型体验

### 桌面 bundle glue

#### 模型可见内容

间接来自 `dsh-web-app`，后者贡献 Web surface 提示词段和浏览器端 client roster。本 bundle 只注册宿主本地桌面菜单命令和 index 样式层。

#### Token 影响

不在已挂载的 Web bundle 之外增加 token。

#### KV Cache 影响

无直接失效；具名 consumer 拥有任何请求前缀变化。

## 已知限制与暂缓工作

- **菜单命令是宿主本地手势** — 第一版 bundle 会聚焦窗口或打开设置；在 renderer 命令桥出现前，New Session 和 Open Workspace 会聚焦后使用现有 Web 入口。
