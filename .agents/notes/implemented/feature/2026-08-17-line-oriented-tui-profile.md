# Agent Note: Line-oriented TUI profile

Status: implemented

English | [中文](2026-08-17-line-oriented-tui-profile.zh.md)

## Problem

DeepSeek Harness already treated every surface as a profile bundle, but shipped only browser interaction and one-shot headless execution. Users who expected a Claude Code style terminal entry had to install or write an out-of-tree profile before they could keep one Agent alive across multiple terminal turns. The absence also made the "everything is a plugin" story harder to verify from a checkout, because the terminal surface example existed only as documentation.

## Decision

`@deepseek-ai/dsh-tui` is an in-box bundle layered over `@deepseek-ai/dsh-base`, and `tui` is a shipped profile template plus `dsh tui` launcher alias. The package name is reused for a smaller implementation; it does not restore the removed full terminal renderer described by the [old TUI removal note](../simplification/2026-08-04-remove-tui-package.md). The bundle mounts a startup provider that owns the terminal app command line (`--prompt` and optional first task) and a runner that creates one fresh Agent, submits each non-empty line as an ordinary follow-up turn, waits for quiescence, flushes the Session, folds the submitted durable interval, and prints the last non-empty assistant text. `/exit` and `/quit` request a clean launcher exit.

The first implementation is line-oriented instead of full-screen. It uses ordinary stdin/stdout and one process-local Agent handle, so it keeps the same durable event source of truth as headless and avoids raw terminal state while the terminal surface is new. The package still ships as a normal bundle with a `cordis.patch.yml`, so later full-screen rendering, history, resume, and richer tool/approval widgets can replace or extend the surface without changing the launcher contract.

## Alternatives considered

**Keep TUI as an out-of-tree plugin only.** Rejected because the product now needs a usable terminal entry from source, and profile templates already own in-box surfaces whose dependencies resolve from the installation.

**Make headless interactive when no task is supplied.** Rejected because headless has a clear one-shot process contract: no task is a usage error, stdout contains only the final answer, and exit code maps to the final turn. Combining both modes would make automation output depend on whether a positional argument was present.

**Start with a full-screen raw-mode renderer.** Rejected for the first implementation because terminal restoration, approval prompts, scrollback, and rich tool widgets introduce failure modes that are separate from proving the profile and Agent-driving path. A line REPL gives a stable terminal surface while preserving the same extension point for richer rendering.

## Consequences

Fresh checkouts can run `dsh tui` or `dsh tui "first task"` after building, without installing an external plugin. The shipped TUI opens no HTTP server and shares the base model, credentials, tools, sandbox, persistence, and permission behavior with other profiles. The current UX is intentionally modest: it prints final assistant text per turn and does not yet expose session resume, history navigation, or rich event widgets.
