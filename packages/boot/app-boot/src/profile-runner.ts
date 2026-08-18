/**
 * Shared profile runner for app surfaces that boot a named dsh profile.
 *
 * The runner resolves profile bundles, user patch layers, launcher overlays,
 * optional shipped preset roots, and bounded shutdown in one place. Thin app
 * entrypoints provide only their install anchor, invocation arguments, and any
 * host services that must exist before config rows mount.
 */

import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { FiberState, type Context } from '@deepseek-ai/cordis'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { DSH_LAUNCH_ENVIRONMENT_KEY, type LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import {
  boot,
  composeEntries,
  healProfilesModuleFallback,
  installFailLoud,
  loadOptionalPatches,
  loadOverlayPatches,
  loadProfile,
  PROFILE_PATCH_FILENAME,
  watchUserPatches,
  type Profile,
} from './index.ts'
import { createProcessShutdown, type ProcessShutdown } from './process-shutdown.ts'

/** The empty root config filename inside a profile directory. */
export const PROFILE_ROOT_FILENAME = 'cordis.yml'

const PROFILE_ROOT_CONFIG = `# dsh profile root — an empty entry list. The tree is composed as patches:
# each bundle in package.json's dsh.profile.bundles, then cordis.patch.yml, then any
# launcher overlays. Edit cordis.patch.yml, not this file.
[]
`

const TELEMETRY_ROW_ID = 'session-telemetry-otel'

/**
 * Resolve the home-level user patch layer path for a dsh home.
 * @param home - dsh home directory.
 * @returns Absolute path to the home-level profile patch.
 */
export function profileHomePatchPath(home: string = resolveDshHome()): string {
  return join(home, PROFILE_PATCH_FILENAME)
}

/**
 * Resolve the telemetry opt-out switch into its boot patch.
 * @param disabledEnv - The raw `DSH_TELEMETRY_DISABLED` value.
 * @param hasRow - Whether the composition carries the telemetry row.
 * @returns The disable patch, or `undefined` when no hard-disable patch is required.
 */
export function resolveTelemetryPatch(disabledEnv: string | undefined, hasRow: boolean): PatchOptions | undefined {
  if ((disabledEnv ?? '') === '' || !hasRow) return undefined
  return { id: TELEMETRY_ROW_ID, disabled: true }
}

/** Options for {@link prepareProfileForRun}. */
export interface PrepareProfileForRunOptions {
  /** Install anchor package.json used to resolve shipped bundles before profile dependencies. */
  installAnchor: string
  /** `false` skips parsing the profile's `cordis.patch.yml`. */
  userLayer?: boolean
}

/**
 * Load a resolved profile for `name`: heal the shared module fallback, then
 * rewrite the empty root config used as the include anchor.
 * @param binName - Diagnostic prefix.
 * @param name - Profile name.
 * @param options - Install anchor and profile-layer controls.
 * @returns The loaded profile.
 */
export function prepareProfileForRun(
  binName: string,
  name: string,
  options: PrepareProfileForRunOptions,
): Profile {
  healProfilesModuleFallback(options.installAnchor)
  const profile = loadProfile(binName, name, options.installAnchor, undefined, { userLayer: options.userLayer ?? true })
  writeFileSync(join(profile.dir, PROFILE_ROOT_FILENAME), PROFILE_ROOT_CONFIG)
  return profile
}

interface ComposedProfile {
  profile: Profile
  bundlePatches: PatchOptions[]
  homePatches: PatchOptions[]
  overlays: PatchOptions[]
  rows: ReadonlyMap<string, EntryOptions>
}

function allPatches(composed: ComposedProfile): PatchOptions[] {
  return [
    ...composed.bundlePatches,
    ...composed.profile.patches,
    ...composed.homePatches,
    ...composed.overlays,
  ]
}

/** Options for {@link composeProfileForRun}. */
export interface ComposeProfileForRunOptions extends PrepareProfileForRunOptions {
  /** `--patch` overlay paths, in argv order. */
  patchFiles: readonly string[]
  /** Optional system preset root injected into the agent-preset roster. */
  shippedPresetRoot?: string
}

/**
 * Compose a profile's effective patch stack.
 * @param binName - Diagnostic prefix.
 * @param name - Profile name.
 * @param options - Install anchor, overlays, and optional shipped preset root.
 * @returns Patch layers plus the row index used by app launchers.
 */
export function composeProfileForRun(
  binName: string,
  name: string,
  options: ComposeProfileForRunOptions,
): ComposedProfile {
  const profile = prepareProfileForRun(binName, name, options)
  const homePatches = loadOptionalPatches(binName, profileHomePatchPath()) ?? []
  const overlays = options.patchFiles.flatMap(file => loadOverlayPatches(binName, resolve(file)))
  const bundlePatches = profile.layers.flatMap(layer => layer.patches)
  const rows = new Map<string, EntryOptions>()
  for (const row of composeEntries([bundlePatches, profile.patches, homePatches, overlays])) {
    if (typeof row.id === 'string') rows.set(row.id, row)
  }
  const composedOverlays = [...overlays]
  if (options.shippedPresetRoot !== undefined && rows.has('agent-presets')) {
    composedOverlays.push({
      id: 'agent-presets',
      config: {
        ...(rows.get('agent-presets')?.config ?? {}) as Record<string, unknown>,
        roots: [{ path: options.shippedPresetRoot, trust: 'system' }],
      },
    })
  }
  const telemetryPatch = resolveTelemetryPatch(process.env.DSH_TELEMETRY_DISABLED, rows.has(TELEMETRY_ROW_ID))
  if (telemetryPatch !== undefined) composedOverlays.push(telemetryPatch)
  return { profile, bundlePatches, homePatches, overlays: composedOverlays, rows }
}

/** Options for {@link runProfile}. */
export interface RunProfileOptions extends ComposeProfileForRunOptions {
  /** Diagnostic prefix. */
  binName: string
  /** This run's frozen environment snapshot, provided before any entry mounts. */
  environment: LaunchEnvironmentSnapshot
  /** Profile name. */
  profile: string
  /** The invocation's inner arguments, handed to the tree through `ctx.cmdlineArgs`. */
  args: readonly string[]
  /** App-specific service wiring that must happen before config rows mount. */
  prepare?: (hostCtx: Context) => void
  /** Replace process exit for embedded hosts and tests. */
  forceExit?: (code: number) => void
  /** Replace natural completion for embedded hosts and tests. */
  complete?: (code: number) => void
  /** Grace before forced exit. */
  shutdownTimeoutMs?: number
  /** Install POSIX signal handlers and fail-loud process hooks. Defaults to true. */
  processHooks?: boolean
  /** Watch profile patch files for live reload. Defaults to true. */
  watchPatches?: boolean
}

function suppressShutdownError(ctx: Context, signal: AbortSignal, error: unknown): void {
  if (signal.aborted) return
  if (ctx.fiber.state !== FiberState.ACTIVE || ctx.get('loader') === undefined) return
  throw error
}

/**
 * Boot one profile invocation end to end and leave process lifetime to the
 * mounted plugins or the embedding app.
 * @param options - Environment snapshot, profile name, overlays, and app-owned prepare hooks.
 * @returns The settled root context and shutdown controller.
 */
export async function runProfile(options: RunProfileOptions): Promise<{ ctx: Context; shutdown: ProcessShutdown }> {
  const composed = composeProfileForRun(options.binName, options.profile, options)
  const app: { current?: Context } = {}
  const shutdown = createProcessShutdown(
    async () => { await app.current?.fiber.dispose() },
    options.forceExit,
    options.complete,
    options.shutdownTimeoutMs,
  )
  const signalShutdown = new AbortController()
  const interrupt = (code: number): void => {
    signalShutdown.abort()
    shutdown.interrupt(code)
  }
  if (options.processHooks ?? true) {
    process.on('SIGTERM', () => { interrupt(0) })
    process.on('SIGINT', () => { interrupt(130) })
    installFailLoud(options.binName, process, async () => {
      await app.current?.fiber.dispose()
    })
  }

  const rootConfig = join(composed.profile.dir, PROFILE_ROOT_FILENAME)
  const composeLive = (): PatchOptions[] => structuredClone([
    ...composed.bundlePatches,
    ...loadOptionalPatches(options.binName, composed.profile.patchPath) ?? [],
    ...loadOptionalPatches(options.binName, profileHomePatchPath()) ?? [],
    ...composed.overlays,
  ])
  const ctx = await boot(options.binName, rootConfig, structuredClone(allPatches(composed)), (hostCtx) => {
    app.current = hostCtx
    hostCtx.provide(DSH_LAUNCH_ENVIRONMENT_KEY, options.environment)
    provideCmdline(hostCtx, {
      args: options.args,
      exit: code => void shutdown.shutdown(code),
    })
    options.prepare?.(hostCtx)
  }, options.installAnchor)
  app.current = ctx

  if (!signalShutdown.signal.aborted
    && ctx.fiber.state === FiberState.ACTIVE
    && ctx.get('loader') !== undefined
    && (options.watchPatches ?? true)) {
    try {
      if (ctx.get('hmr') === undefined) {
        if (ctx.get('timer') === undefined) {
          await ctx.loader.create({ name: '@deepseek-ai/cordis-plugin-timer' })
        }
        await ctx.loader.create({ name: '@deepseek-ai/cordis-plugin-hmr', config: { root: [] } })
      }
      await watchUserPatches(ctx, {
        binName: options.binName,
        filename: composed.profile.patchPath,
        compose: composeLive,
      })
      await watchUserPatches(ctx, {
        binName: options.binName,
        filename: profileHomePatchPath(),
        compose: composeLive,
      })
    } catch (error) {
      suppressShutdownError(ctx, signalShutdown.signal, error)
    }
  }
  return { ctx, shutdown }
}
