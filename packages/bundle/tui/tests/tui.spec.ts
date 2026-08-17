/** Interactive Agent driving, durable aggregation, and line command handling. */

import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import type { Agent, AgentHandle, CreateAgentOptions } from '@deepseek-ai/dsh-agent'
import AgentDefaultModelConfig from '@deepseek-ai/dsh-agent-default-model'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session, UserMessage } from '@deepseek-ai/dsh-session'
import { apply, internals, type LineReader } from '../src/index.ts'

const originalInternals = { ...internals }
afterEach(() => { Object.assign(internals, originalInternals) })

interface Script {
  afterPrompt(session: Session, message: UserMessage, index: number): Promise<void> | void
}

interface RunResult {
  code: number
  out: string
  err: string
  prompts: string[]
  disposed: number
}

function appendTurn(session: Session, turn: number, message: UserMessage, text: string, completed = true): void {
  session.append('turn/start', { turn })
  session.append('step/start', { turn, step: 1 })
  session.append('user/message', message, { surfaceOp: 'append' })
  session.append('assistant/message', {
    turn,
    step: 1,
    message: createAssistantMessage({
      content: [{ type: 'text', text }],
      source: { provider: 'test-provider', model: 'test-model' },
    }),
  }, { surfaceOp: 'append' })
  session.append('step/end', { turn, step: 1 })
  session.append('turn/end', {
    turn,
    reason: completed
      ? { kind: 'completed' }
      : { kind: 'aborted', reason: { kind: 'user' } },
  })
}

class ScriptedReader implements LineReader {
  readonly prompts: string[] = []
  closed = false
  constructor(private readonly lines: string[]) {}

  question(query: string): Promise<string> {
    this.prompts.push(query)
    const line = this.lines.shift()
    if (line === undefined) return Promise.reject(new Error('no scripted input'))
    return Promise.resolve(line)
  }

  close(): void {
    this.closed = true
  }
}

async function bench(script: Script, lines: string[]): Promise<{
  run(config?: { prompt: string; initialTask?: string }): Promise<RunResult>
}> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentDefaultModelConfig, { provider: 'test-provider', model: 'test-model' })
  let submitIndex = 0
  let disposed = 0
  ctx.agents.setFactory({
    async createAgent(ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle> {
      const session = ctx.sessions.create(options.sessionId, {
        ...options.meta === undefined ? {} : { meta: options.meta },
      })
      let idle = Promise.resolve()
      const agent = {} as Agent
      const agentCtx = ownerCtx.extend({ agent })
      Object.assign(agent, {
        id: session.id,
        options: options.agentOptions ?? {},
        session,
        inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
        status: 'idle',
        ctx: agentCtx,
        cancel: () => {},
        runMaintenance: () => Promise.reject(new Error('not used')),
        send: () => {},
        followup: (message: UserMessage) => {
          agent.inbox.append('next-turn', message)
          const index = submitIndex
          submitIndex += 1
          idle = Promise.resolve().then(() => script.afterPrompt(session, message, index))
        },
        steer: () => {},
        inject: () => {},
        whenIdle: () => idle,
      } satisfies Partial<Agent>)
      await options.setup?.(agentCtx)
      ctx.agents.register(agent)
      return {
        agent,
        dispose: () => {
          disposed += 1
          return Promise.resolve()
        },
      }
    },
    resume: () => Promise.reject(new Error('not used')),
  })

  return {
    run: async (config = { prompt: 'dsh> ' }) => {
      let out = ''
      let err = ''
      const reader = new ScriptedReader([...lines])
      internals.stdout = { write: (chunk: string) => { out += chunk; return true } }
      internals.stderr = { write: (chunk: string) => { err += chunk; return true } }
      internals.createReader = () => reader
      const exited = new Promise<number>((resolve) => {
        ctx.provide('appExit', resolve)
      })
      apply(ctx, config)
      const code = await exited
      await ctx.fiber.dispose()
      return { code, out, err, prompts: reader.prompts, disposed }
    },
  }
}

describe('tui runner', () => {
  it('keeps one Agent alive across multiple submitted lines until /exit', async () => {
    const test = await bench({
      afterPrompt(session, message, index) {
        appendTurn(session, index + 1, message, `answer ${index + 1}`)
      },
    }, ['first', '', 'second', '/exit'])
    const result = await test.run()
    expect(result).toEqual({
      code: 0,
      out: [
        'DeepSeek Harness TUI. Type /exit to quit.',
        'answer 1',
        'answer 2',
        '',
      ].join('\n'),
      err: '',
      prompts: ['dsh> ', 'dsh> ', 'dsh> ', 'dsh> '],
      disposed: 1,
    })
  })

  it('submits the optional initial task before reading input', async () => {
    const test = await bench({
      afterPrompt(session, message, index) {
        appendTurn(session, index + 1, message, `answer ${index + 1}`)
      },
    }, ['/exit'])
    const result = await test.run({ prompt: 'ask> ', initialTask: 'start here' })
    expect(result).toMatchObject({
      code: 0,
      out: 'DeepSeek Harness TUI. Type /exit to quit.\nanswer 1\n',
      prompts: ['ask> '],
      disposed: 1,
    })
  })
})
