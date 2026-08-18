# Agent Note: Desktop alpha zip packaging

Status: implemented

English | [中文](2026-08-19-desktop-alpha-zip-packaging.zh.md)

## Problem

The macOS desktop host needs a distributable first artifact before the project has signing, notarization, auto-update, or CI packaging. Running from source proves the Electron host but does not let testers install the app from GitHub Releases, and a one-off manual package would be easy to build with missing preset files or local secrets.

## Decision

The first desktop release path produces an unsigned Apple Silicon `.app.zip` through `pnpm desktop:pack`. The pack script builds the Web frontend and desktop host, copies Electron's `.app` template, deploys `@deepseek-ai/dsh-desktop-app-host` with `pnpm deploy --legacy --prod`, inserts the shipped agent presets into the deployed app payload, writes the app plist and `.icns`, checks for forbidden secret file names, and zips only the resulting `.app`.

The script runs legacy deploy in a temporary directory and restores the workspace install afterward because pnpm 11's production deploy mutates the active workspace dependency state. The release artifact remains unsigned and macOS arm64-only; README and release notes must tell users how to open an unsigned app.

## Alternatives considered

**Use Electron Builder.** Electron Builder would provide a more conventional release pipeline, but the first alpha only needs a local unsigned zip. Adding the builder configuration, signing knobs, and DMG decisions now would expand the release surface before the app has a stable desktop product contract.

**Ship the development host instructions only.** That keeps the repository simpler, but it gives testers no installable artifact and leaves every tester to reproduce the same Electron packaging steps locally.

**Commit a hand-built `.app`.** A checked-in bundle would be large, platform-specific, and easy to let drift from source. Keeping generated bundles in `dist/desktop` makes the release artifact reproducible from the committed pack script.

## Consequences

The desktop prerelease can publish a GitHub Release asset without Apple credentials, and the pack step verifies that credentials files are not copied into the archive. The cost is that users see Gatekeeper warnings, Intel Macs are unsupported, and a production-grade release still needs signing, notarization, update plumbing, and multi-architecture packaging.
