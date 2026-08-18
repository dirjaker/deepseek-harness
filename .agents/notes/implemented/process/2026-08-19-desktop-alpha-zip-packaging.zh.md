# Agent Note: 桌面端 alpha zip 打包

Status: implemented

[English](2026-08-19-desktop-alpha-zip-packaging.md) | 中文

## Problem

macOS 桌面宿主在具备签名、公证、自动更新和 CI 打包之前，也需要一个可分发的第一版产物。从源码运行可以证明 Electron 宿主可用，但不能让测试者直接从 GitHub Releases 安装；手工临时打包也容易漏掉 preset 文件或把本地 secret 带进包里。

## Decision

第一版桌面发布路径通过 `pnpm desktop:pack` 产出 unsigned Apple Silicon `.app.zip`。打包脚本会构建 Web 前端和桌面宿主，复制 Electron 的 `.app` 模板，用 `pnpm deploy --legacy --prod` 部署 `@deepseek-ai/dsh-desktop-app-host`，把随包 agent presets 插入已部署的 app payload，写入 app plist 与 `.icns`，检查被禁止的 secret 文件名，并且只压缩生成后的 `.app`。

脚本在临时目录运行 legacy deploy，并在 deploy 后恢复 workspace install，因为 pnpm 11 的 production deploy 会改变当前 workspace 的依赖状态。发布产物仍然是 unsigned 且仅支持 macOS arm64；README 和 release notes 必须告诉用户如何打开未签名应用。

## Alternatives considered

**使用 Electron Builder。** Electron Builder 可以提供更常规的发布流水线，但第一版 alpha 只需要本地 unsigned zip。现在加入 builder 配置、签名开关和 DMG 决策，会在桌面产品契约稳定前扩大发布面。

**只发布开发宿主说明。** 这会让仓库更简单，但测试者拿不到可安装产物，每个人都要在本地重复 Electron 打包步骤。

**提交手工构建的 `.app`。** 把 bundle 提交进仓库会很大、绑定平台，并且容易与源码漂移。把生成产物留在 `dist/desktop`，可以让 release artifact 从已提交的 pack 脚本复现。

## Consequences

桌面 prerelease 可以在没有 Apple 凭据的情况下发布 GitHub Release asset，pack 步骤也会验证凭据文件没有被复制进归档。代价是用户会看到 Gatekeeper 提示，Intel Mac 不受支持，生产级发布仍然需要签名、公证、更新链路和多架构打包。
