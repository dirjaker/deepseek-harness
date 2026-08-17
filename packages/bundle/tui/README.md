# `@deepseek-ai/dsh-tui`

English | [中文](README.zh.md)

The interactive terminal bundle. [`cordis.patch.yml`](cordis.patch.yml) rides directly over [`dsh-base`](../base/README.md): it supplies the coding persona and tool mode, disables HMR, mounts Code Mode's worker as a core execution capability, and inserts this package's `tui-runner` plugin (config `{prompt, initialTask}`, resolved from the injected `tuiStartup` provider). It mounts no Host, HTTP server, Web runtime, or browser plugin.

After the Loader settles, the runner reads the shared [`ctx.agentDefaultModel`](../../core/agent-default-model/README.md), creates one fresh persisted Agent through `ctx.agents`, and starts a line-oriented REPL. Each non-empty input line becomes an ordinary user follow-up turn on the same Agent. The runner waits for quiescence, flushes the Session, folds the submitted durable event interval, and writes the last non-empty assistant text to stdout. `/exit` and `/quit` request a clean 0 exit through the launcher-provided `ctx.appExit` host hook ([`dsh-cmdline`](../../boot/cmdline/README.md)). A terminal `error` reason writes its code and message to stderr.

The startup options are this app's command line: the ordinary `tui-startup` provider ([`src/startup.ts`](src/startup.ts)) injects `ctx.cmdlineArgs`, reads `dsh tui [task...]`, supports `--prompt <text>`, prints the app's `--help`, and provides `tuiStartup`; the runner injects that service and reads lazy config. An optional initial task is submitted before the first prompt, then the same session remains open for follow-up input.

## Model Experience

### Submitted terminal input

#### What the model sees

Each non-empty terminal input line is logged as `user/message` and submitted as an ordinary user message on the same Agent. The runner does not add a model-visible prompt section, tool, or synthetic context; the base and TUI bundle rows own the shared persona and tool-mode configuration.

#### Token effect

The submitted line contributes its user-message text to the current turn and later transcript. The runner adds no fixed per-turn text of its own.

#### KV Cache effect

The runner adds nothing to the stable request prefix, so it does not invalidate cache entries beyond the ordinary new user message for each turn.

## Known Limitations and Deferred Work

- **Line-oriented terminal UI only** — this first TUI is a stable REPL surface, not a full-screen renderer. Tool calls and approvals currently use the base product behavior and durable final assistant text rather than rich per-event terminal widgets.
- **Fresh session per process** — the runner does not yet expose `/resume`, `/new`, or history navigation commands.
- **`ctx.appExit` is launcher-owned** — booting the TUI profile outside the `dsh` launcher fails loud at activation until the host provides the exit request.
