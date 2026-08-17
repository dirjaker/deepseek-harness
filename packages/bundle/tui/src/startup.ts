/**
 * The interactive terminal app's command-line provider. It parses the optional
 * first task and prompt label, then publishes {@link TUI_STARTUP_SERVICE}.
 * @module @deepseek-ai/dsh-tui/startup
 */

import { Command } from 'commander'
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'

/** Stable Cordis plugin name. */
export const name = 'tui-startup'

/** Services required before terminal startup options can be resolved. */
export const inject = ['cmdlineArgs']

/** Service provided by this plugin and injected by the interactive runner. */
export const TUI_STARTUP_SERVICE = 'tuiStartup'

/** What the runner row reads from {@link TUI_STARTUP_SERVICE}. */
export interface TuiStartupValues {
  /** Prompt text printed before each user input line. */
  prompt: string
  /** Optional task submitted immediately after startup. */
  initialTask?: string
}

/**
 * Build this app's command definition.
 * @returns a fresh program for this parse.
 */
function tuiCommand(): Command {
  return new Command()
    .name('dsh tui')
    .description('Start an interactive line-oriented terminal session.')
    .helpOption('-h, --help', 'show this help')
    .option('--prompt <text>', 'input prompt label', 'dsh> ')
    .argument('[task...]', 'optional first task; multiple words are joined by spaces')
    .addHelpText('after', `
Commands:
  /exit, /quit      end the session

Examples:
  dsh tui                                start an empty interactive session
  dsh tui "summarize this repository"    submit the first task, then keep chatting
`)
}

/**
 * Parse and provide the interactive startup options as an ordinary Cordis service.
 * @param ctx - plugin context carrying the command line.
 */
export function apply(ctx: Context): void {
  const program = tuiCommand()
  program.action(() => {
    const task = program.args.join(' ').trim()
    const options = program.opts<{ prompt: string }>()
    ctx.provide(TUI_STARTUP_SERVICE, {
      prompt: options.prompt,
      ...task === '' ? {} : { initialTask: task },
    } satisfies TuiStartupValues)
  })
  parseCmdline(ctx, program)
}
