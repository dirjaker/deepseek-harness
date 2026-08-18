import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-desktop-app'

/** Invariant plugin for desktop app bundle wiring. */
export const name = 'desktop-app-invariant'

/** Required services. */
export const inject = ['invariants']

/** No runtime invariant: service injection and duplicate menu command checks pin the bundle's runtime contract. */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns A disposer for the no-op invariant.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
