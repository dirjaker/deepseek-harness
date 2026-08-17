# `@deepseek-ai/dsh-tui`

[English](README.md) | 中文

交互式终端组合包。[`cordis.patch.yml`](cordis.patch.yml) 直接叠加在 [`dsh-base`](../base/README.md) 之上：它提供 coding persona 与工具模式，禁用 HMR，将 Code Mode worker 挂载为核心执行能力，并插入本包的 `tui-runner` 插件（配置 `{prompt, initialTask}`，由注入的 `tuiStartup` provider 解析）。它不挂载 Host、HTTP server、Web runtime 或浏览器插件。

Loader settle 后，runner 读取共享的 [`ctx.agentDefaultModel`](../../core/agent-default-model/README.md)，通过 `ctx.agents` 创建一个新的持久化 Agent，并启动行模式 REPL。每一行非空输入都会成为同一个 Agent 上的普通用户 follow-up turn。runner 等待 Agent 停稳，flush Session，折叠本次提交对应的 durable event 区间，并把最后一条非空 assistant 文本写到 stdout。`/exit` 和 `/quit` 会通过启动器提供的 `ctx.appExit` host hook（[`dsh-cmdline`](../../boot/cmdline/README.md)）请求干净地以 0 退出。终止原因为 `error` 时还会把 code 与 message 写到 stderr。

启动参数由本应用自己的命令行负责：普通的 `tui-startup` provider（[`src/startup.ts`](src/startup.ts)）注入 `ctx.cmdlineArgs`，读取 `dsh tui [task...]`，支持 `--prompt <text>`，打印应用自己的 `--help`，并提供 `tuiStartup`；runner 注入该服务并读取 lazy config。可选的初始任务会在第一次提示符前提交，随后同一个会话继续接受后续输入。

## Model Experience

### Submitted terminal input

#### What the model sees

每一行非空终端输入都会被记录为 `user/message`，并作为同一个 Agent 上的普通用户消息提交。runner 不添加面向模型的提示词段、工具或合成上下文；共享 persona 与工具模式配置由 base 和 TUI bundle 行负责。

#### Token effect

提交的输入行会把其用户消息文本加入当前 turn 和后续 transcript。runner 自身不添加固定的逐 turn 文本。

#### KV Cache effect

runner 不向稳定请求前缀添加内容，因此除了每个 turn 的普通新用户消息外，不会额外使缓存条目失效。

## Known Limitations and Deferred Work

- **仅提供行模式终端 UI** — 第一版 TUI 是稳定的 REPL 表面层，不是全屏渲染器。工具调用与 approval 目前使用 base 产品行为和 durable final assistant 文本，而不是富事件终端 widget。
- **每个进程一个新会话** — runner 暂未暴露 `/resume`、`/new` 或历史导航命令。
- **`ctx.appExit` 由启动器提供** — 在 `dsh` 启动器之外 boot TUI profile 会在激活时失败，直到 host 提供 exit request。
