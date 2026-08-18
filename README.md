# DeepSeek Harness Desktop Fork

English | [中文](README.zh.md)

This repository is a downstream desktop-oriented fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), the open-source agent harness developed by [DeepSeek AI](https://deepseek.com). The fork keeps the official Web and CLI foundation, then adds a macOS Electron desktop host and local unsigned packaging for early testing.

The upstream project uses an architecture where **everything is a plugin**, powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper). The desktop work follows the same plugin model: desktop capabilities are exposed through `ctx.desktop` instead of importing Electron from product plugins.

## Developer preview

DeepSeek Harness and this desktop fork are in _developer preview_ and are iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

<a id="run"></a>

## macOS Desktop

The desktop app boots the `desktop` profile in Electron, starts the existing Web UI on a loopback OS-assigned port, and loads it in a sandboxed BrowserWindow. Web features remain the source of truth; desktop-only menu, notification, window, and packaging behavior lives beside the plugin layer.

First alpha packages are unsigned Apple Silicon builds. macOS may block the first launch until you open the app from Finder with **Open** or allow it in System Settings.

### Download

Download `DeepSeek Harness-macOS-arm64.zip` from the latest `desktop-*` prerelease in this repository's GitHub Releases, unzip it, and move `DeepSeek Harness.app` to Applications.

### Run from source

Install `Node.js`, then run:

```sh
pnpm install
pnpm desktop:dev
```

To create a local unsigned macOS zip:

```sh
pnpm desktop:pack
```

## Web and CLI

The upstream Web UI still runs from npm:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI, served at `http://127.0.0.1:3080` by default. See [Web UI guide](docs/user/guide/index.md).

To run the Web UI from source:

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## Community and support

- For upstream DeepSeek Harness feedback or bug reports, use [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">DeepSeek Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
