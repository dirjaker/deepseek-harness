# Agent Note: Line-oriented TUI profile

Status: implemented

[English](2026-08-17-line-oriented-tui-profile.md) | 中文

## Problem

DeepSeek Harness 已经把每个表层都视为 profile 组合包，但随包发布的只有浏览器交互和一次性 headless 执行。期待 Claude Code 风格终端入口的用户，必须先安装或编写树外 profile，才能让一个 Agent 在终端中跨多轮保持存活。这个缺口也让「一切皆插件」的叙事难以直接从 checkout 验证，因为终端表层示例只存在于文档中。

## Decision

`@deepseek-ai/dsh-tui` 是叠加在 `@deepseek-ai/dsh-base` 之上的内置组合包，`tui` 是随包发布的 profile 模板和 `dsh tui` 启动器别名。这个包名被用于一个更小的新实现；它不会恢复[旧 TUI 移除 note](../simplification/2026-08-04-remove-tui-package.md)中描述的已移除全终端渲染器。该组合包挂载一个 startup provider 来拥有终端应用命令行（`--prompt` 和可选首个任务），并挂载一个 runner：它创建一个新的 Agent，把每一行非空输入作为普通 follow-up turn 提交，等待 Agent 停稳，flush Session，折叠本次提交对应的 durable 区间，并打印最后一条非空 assistant 文本。`/exit` 和 `/quit` 请求启动器干净退出。

第一版实现采用行模式，而不是全屏界面。它使用普通 stdin/stdout 和一个进程本地 Agent handle，因此和 headless 一样以 durable event 作为事实来源，同时避免在终端表层刚引入时处理 raw terminal 状态。该包仍作为普通 bundle 发布并带有 `cordis.patch.yml`，所以后续的全屏渲染、历史、resume、以及更丰富的工具/approval widget 都可以替换或扩展这个表层，而不改变启动器约定。

## Alternatives considered

**继续只把 TUI 作为树外插件。** 被拒绝，因为产品现在需要一个从源码即可使用的终端入口，而 profile 模板已经负责从安装目录解析内置表层依赖。

**让 headless 在没有任务时变成交互式。** 被拒绝，因为 headless 拥有清晰的一次性进程约定：没有任务是用法错误，stdout 只包含最终答案，退出码映射到最终 turn。把两个模式合并，会让自动化输出取决于是否传入了位置参数。

**第一版就做全屏 raw-mode 渲染器。** 被拒绝，因为终端恢复、approval prompt、scrollback 和富工具 widget 会引入与验证 profile/Agent 驱动路径无关的失败模式。行模式 REPL 先提供稳定的终端表层，同时保留同一个扩展点供以后做更丰富的渲染。

## Consequences

全新 checkout 构建后即可运行 `dsh tui` 或 `dsh tui "first task"`，无需安装外部插件。随包 TUI 不打开 HTTP server，并与其他 profile 共享 base 的模型、凭据、工具、沙箱、持久化和权限行为。当前 UX 有意保持克制：它按 turn 打印最终 assistant 文本，暂不提供 session resume、历史导航或富事件 widget。
