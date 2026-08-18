# DeepSeek Harness Desktop Fork

[English](README.en.md) | 中文 | [中文副本](README.zh.md)

本仓库是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的桌面端二开版本。官方项目由 [DeepSeek AI](https://deepseek.com) 开发，是一个开源 agent harness（智能体框架）；本 fork 保留官方 Web 与 CLI 基础，并加入 macOS Electron 桌面宿主和本地 unsigned 打包链路，便于早期试用。

官方项目采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。桌面端二开延续同一插件模型：菜单、通知、窗口等桌面能力通过 `ctx.desktop` 暴露，而不是让业务插件直接 import Electron。

## 开发者预览

DeepSeek Harness 与这个桌面端 fork 目前都处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

<a id="run"></a>

## macOS 桌面端

桌面端会在 Electron 中启动 `desktop` profile，把现有 Web UI 服务在 loopback 的系统分配端口上，并加载到 sandboxed BrowserWindow。Web 功能仍然是功能源头；菜单、通知、窗口和打包等桌面专属能力位于插件层旁边。

第一版 alpha 包是 Apple Silicon 的 unsigned 构建。macOS 首次打开时可能拦截，需要在 Finder 中右键选择**打开**，或到系统设置中允许。

### 下载

从本仓库 GitHub Releases 最新的 `desktop-*` prerelease 下载 `DeepSeek.Harness-macOS-arm64.zip`，解压后把 `DeepSeek Harness.app` 移到 Applications。

<a id="run-from-source"></a>

### 从源码运行

安装 `Node.js`，然后运行：

```sh
pnpm install
pnpm desktop:dev
```

如需生成本地 unsigned macOS zip：

```sh
pnpm desktop:pack
```

## Web 与 CLI

官方 Web UI 仍可通过 npm 运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。详见 [Web UI 指南](docs/user/guide/index.md)。

如需从源码运行 Web UI：

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## 社区与支持

- 官方 DeepSeek Harness 的反馈或 bug 报告请提交到 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions)。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="assets/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="assets/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

请先阅读[开发指南](docs/development.md)与[架构文档](docs/architecture.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
