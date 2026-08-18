import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-desktop'

/** Invariant plugin for desktop capability wiring. */
export const name = 'desktop-invariant'

/** Required services. */
export const inject = ['invariants']

/** No runtime invariant: the Cordis service registration and typed events are the package contract. */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns A disposer for the no-op invariant.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
