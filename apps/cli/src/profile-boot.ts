/**
 * CLI adapter for the shared dsh profile runner.
 * @module @deepseek-ai/dsh/profile-boot
 */

import { fileURLToPath } from 'node:url'
import {
  prepareProfileForRun,
  profileHomePatchPath,
  PROFILE_ROOT_FILENAME,
  resolveTelemetryPatch,
  runProfile as runSharedProfile,
  type RunProfileOptions as SharedRunProfileOptions,
} from '@deepseek-ai/dsh-app-boot'
import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'

const NAME = 'dsh'

/** Shipped agent-preset root: beside this app's own config, in both source and built layouts. */
const SHIPPED_PRESET_ROOT = fileURLToPath(new URL('../config/agent-presets/', import.meta.url))

/** Absolute path of this dsh installation's package.json. */
export const INSTALL_ANCHOR = fileURLToPath(new URL('../package.json', import.meta.url))

/** The home-level user patch layer (`$DSH_HOME/cordis.patch.yml`). */
export function homePatchPath(): string {
  return profileHomePatchPath()
}

export { PROFILE_ROOT_FILENAME, resolveTelemetryPatch }

/**
 * Load a resolved profile for `name` using this CLI installation as the bundle anchor.
 * @param name - The profile name.
 * @param userLayer - `false` skips parsing `cordis.patch.yml`.
 * @returns The loaded profile.
 */
export function prepareProfile(name: string, userLayer = true) {
  return prepareProfileForRun(NAME, name, { installAnchor: INSTALL_ANCHOR, userLayer })
}

/** Options for {@link runProfile}. */
export interface RunProfileOptions {
  /** This run's frozen environment snapshot, provided before any entry mounts. */
  environment: LaunchEnvironmentSnapshot
  /** The profile name to boot. */
  profile: string
  /** `--patch` overlay paths, in argv order. */
  patchFiles: readonly string[]
  /** The invocation's inner arguments, handed to the tree through `ctx.cmdlineArgs`. */
  args: readonly string[]
}

/**
 * Boot one CLI profile invocation end to end.
 * @param options - Environment snapshot, profile name, overlays, and profile arguments.
 * @returns The settled root context and shutdown controller.
 */
export function runProfile(options: RunProfileOptions): ReturnType<typeof runSharedProfile> {
  const shared: SharedRunProfileOptions = {
    ...options,
    binName: NAME,
    installAnchor: INSTALL_ANCHOR,
    shippedPresetRoot: SHIPPED_PRESET_ROOT,
  }
  return runSharedProfile(shared)
}
