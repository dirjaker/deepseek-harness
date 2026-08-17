/**
 * @deepseek-ai/dsh-tui — line-oriented interactive terminal driver. The
 * bundle patch rides over dsh-base without Host, HTTP, or browser plugins; this
 * runner creates one Agent through the core registry and submits every entered
 * line as a fresh user turn until the user exits.
 *
 * @module @deepseek-ai/dsh-tui
 */

import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import type { Agent, AgentHandle, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-cmdline'

/** Stable Cordis plugin name. */
export const name = 'tui-runner'

/** Core services required before the interactive session can start. */
export const inject = ['agentDefaultModel', 'agents', 'sessions']

/** Plugin config resolved from the app's command-line provider service. */
export interface Config {
  /** Prompt printed before each user input line. */
  prompt: string
  /** Optional first task submitted before the input loop begins. */
  initialTask?: string
}

export const Config: z<Config> = z.object({
  prompt: z.string().default('dsh> '),
  initialTask: z.string(),
})

/** Outcome of one submitted user turn interval. */
interface TurnOutcome {
  text: string
  reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
}

/** Minimal line reader interface used by the terminal runner. */
export interface LineReader {
  /**
   * Read one line after printing `query`.
   * @param query - prompt string to display.
   * @returns the entered line.
   */
  question(query: string): Promise<string>
  /** Release terminal resources owned by this reader. */
  close(): void
}

/** Process-facing effects of the interactive surface. */
interface TuiIo {
  stdout: { write(chunk: string): unknown }
  stderr: { write(chunk: string): unknown }
  createReader(): LineReader
  /** Request process exit with `code` after the tree disposes. */
  exit(code: number): void
}

/** The process streams and line-reader factory the runner uses; tests substitute them. */
export const internals: {
  stdout: TuiIo['stdout']
  stderr: TuiIo['stderr']
  createReader(): LineReader
} = {
  stdout: process.stdout,
  stderr: process.stderr,
  createReader: () => createInterface({ input: process.stdin, output: process.stdout }),
}

/** Fold the last assistant text and final turn reason from one submitted interval. */
function summarize(events: readonly SessionEvent[], firstSeq: number): TurnOutcome {
  let started = false
  let text = ''
  let reason: SessionEvent<'turn/end'>['data']['reason'] | undefined
  for (const event of events) {
    if (event.seq < firstSeq) continue
    if (event.type === 'turn/start') {
      started = true
      continue
    }
    if (!started) continue
    if (event.type === 'assistant/message') {
      const joined = event.data.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      if (joined !== '') text = joined
    }
    if (event.type === 'turn/end') reason = event.data.reason
  }
  return { text, reason }
}

/** Report an unexpected interactive-driver failure and request a failing exit. */
function fail(io: TuiIo, error: unknown): void {
  io.stderr.write(`dsh tui: ${error instanceof Error ? error.message : String(error)}\n`)
  io.exit(1)
}

/** Create the single Agent backing one interactive process. */
async function createInteractiveAgent(ctx: Context, signal: AbortSignal): Promise<AgentHandle | undefined> {
  await ctx.get('loader')?.await()
  const agents = ctx.get('agents')
  const defaultModel = ctx.get('agentDefaultModel')
  if (agents === undefined || defaultModel === undefined || signal.aborted) return undefined

  const selection = defaultModel.currentSelection()
  return agents.create({
    sessionId: SessionId(`session-${randomUUID()}`),
    meta: { cwd: process.cwd() },
    agentOptions: { provider: selection.provider, model: selection.model },
    signal,
    setup: (agentCtx) => {
      const selected: ModelSelectionRef = { current: selection, assembled: undefined }
      installModelSelection(agentCtx, selected)
    },
  })
}

/** Submit one ordinary user message, wait for durable settlement, and print its response. */
async function submit(agent: Agent, ctx: Context, text: string, io: TuiIo): Promise<TurnOutcome> {
  await agent.whenIdle()
  const firstSeq = agent.session.seq
  agent.followup(createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  }))
  await agent.whenIdle()
  await ctx.sessions.flush(agent.session)
  const outcome = summarize(agent.session.events, firstSeq)
  if (outcome.text !== '') io.stdout.write(`${outcome.text}\n`)
  if (outcome.reason?.kind === 'error') {
    io.stderr.write(`dsh tui: ${outcome.reason.error.code}: ${outcome.reason.error.message}\n`)
  }
  return outcome
}

/**
 * Run the interactive input loop.
 * @param ctx - plugin context carrying the Agent registry and Session store.
 * @param config - prompt and optional first task.
 * @param io - process-facing effects.
 * @param signal - disposal cancellation signal.
 */
async function run(ctx: Context, config: Config, io: TuiIo, signal: AbortSignal): Promise<void> {
  const handle = await createInteractiveAgent(ctx, signal)
  if (handle === undefined) return
  const reader = io.createReader()
  try {
    io.stdout.write('DeepSeek Harness TUI. Type /exit to quit.\n')
    if (config.initialTask !== undefined) {
      const outcome = await submit(handle.agent, ctx, config.initialTask, io)
      if (outcome.reason?.kind !== 'completed') {
        io.exit(1)
        return
      }
    }
    while (!signal.aborted) {
      const input = (await reader.question(config.prompt)).trim()
      if (input === '') continue
      if (input === '/exit' || input === '/quit') {
        io.exit(0)
        return
      }
      await submit(handle.agent, ctx, input, io)
    }
  } finally {
    reader.close()
    await handle.dispose()
  }
}

/**
 * Mount the interactive terminal driver.
 * @param ctx - plugin context carrying core services and the launcher-provided exit request.
 * @param config - validated terminal config.
 */
export function apply(ctx: Context, config: Config): void {
  const exit = ctx.get('appExit')
  if (exit === undefined) {
    throw new Error('tui-runner: the launcher must provide ctx.appExit before the tree mounts')
  }
  const controller = new AbortController()
  let reader: LineReader | undefined
  const io: TuiIo = {
    stdout: internals.stdout,
    stderr: internals.stderr,
    createReader: () => {
      reader = internals.createReader()
      return reader
    },
    exit,
  }
  ctx.effect(() => {
    void run(ctx, config, io, controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted) fail(io, error)
    })
    return () => {
      controller.abort()
      reader?.close()
    }
  })
}
