import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { cp, mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const desktopRequire = createRequire(new URL('../apps/desktop/package.json', import.meta.url))

const APP_NAME = 'DeepSeek Harness'
const BUNDLE_ID = 'com.dirjaker.deepseek-harness.desktop'
const OUTPUT_ROOT = join(root, 'dist', 'desktop')
const APP_BUNDLE = join(OUTPUT_ROOT, `${APP_NAME}.app`)
const ZIP_PATH = join(OUTPUT_ROOT, `${APP_NAME}-macOS-arm64.zip`)
const DEPLOY_TARGET = join(APP_BUNDLE, 'Contents', 'Resources', 'app')
const ICON_SOURCE = join(root, 'apps', 'desktop', 'assets', 'icon.icns')
const ICON_TARGET_NAME = 'dsh-desktop.icns'
const PRESET_SOURCE = join(root, 'apps', 'cli', 'config', 'agent-presets')
const PRESET_TARGET = join(DEPLOY_TARGET, 'config', 'agent-presets')

function run(command: string, args: readonly string[]): void {
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR ?? 'https://npmmirror.com/mirrors/electron/',
    },
  })
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
}

async function assertFile(path: string): Promise<void> {
  const info = await stat(path)
  if (!info.isFile()) throw new Error(`${path} is not a file`)
}

async function assertNoForbiddenPayload(): Promise<void> {
  const output = execFileSync(
    'find',
    [
      DEPLOY_TARGET,
      '(',
      '-name',
      '.git',
      '-o',
      '-name',
      '.env',
      '-o',
      '-name',
      '.env.*',
      '-o',
      '-name',
      '.credentials.yaml',
      ')',
      '-print',
    ],
    { encoding: 'utf8' },
  ).trim()
  if (output !== '') throw new Error(`desktop package contains forbidden secret paths:\n${output}`)
}

async function main(): Promise<void> {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('desktop pack currently supports only darwin arm64')
  }

  await assertFile(ICON_SOURCE)
  const electronPackage = desktopRequire.resolve('electron/package.json')
  const electronApp = join(dirname(electronPackage), 'dist', 'Electron.app')
  const desktopPackage = await readJson(join(root, 'apps', 'desktop', 'package.json'))
  const version = String(desktopPackage.version)

  await rm(OUTPUT_ROOT, { recursive: true, force: true })
  await mkdir(OUTPUT_ROOT, { recursive: true })

  run('pnpm', ['--filter', '@deepseek-ai/dsh-web-frontend', 'run', 'build'])
  run('pnpm', ['--filter', '@deepseek-ai/dsh-desktop-app-host', 'run', 'build'])

  await cp(electronApp, APP_BUNDLE, { recursive: true })
  await rm(DEPLOY_TARGET, { recursive: true, force: true })
  const deployStage = await mkdtemp(join(tmpdir(), 'dsh-desktop-deploy.'))
  let deployError: unknown
  try {
    run('pnpm', ['--filter', '@deepseek-ai/dsh-desktop-app-host', 'deploy', '--legacy', '--prod', deployStage])
  } catch (error) {
    deployError = error
  } finally {
    run('pnpm', ['install'])
  }
  if (deployError !== undefined) throw deployError
  await cp(deployStage, DEPLOY_TARGET, { recursive: true })
  await rm(deployStage, { recursive: true, force: true })
  await cp(PRESET_SOURCE, PRESET_TARGET, { recursive: true })

  await cp(ICON_SOURCE, join(APP_BUNDLE, 'Contents', 'Resources', ICON_TARGET_NAME))
  const infoPlist = join(APP_BUNDLE, 'Contents', 'Info.plist')
  run('/usr/bin/plutil', ['-replace', 'CFBundleDisplayName', '-string', APP_NAME, infoPlist])
  run('/usr/bin/plutil', ['-replace', 'CFBundleName', '-string', APP_NAME, infoPlist])
  run('/usr/bin/plutil', ['-replace', 'CFBundleIdentifier', '-string', BUNDLE_ID, infoPlist])
  run('/usr/bin/plutil', ['-replace', 'CFBundleIconFile', '-string', ICON_TARGET_NAME, infoPlist])
  run('/usr/bin/plutil', ['-replace', 'CFBundleShortVersionString', '-string', version, infoPlist])
  run('/usr/bin/plutil', ['-replace', 'CFBundleVersion', '-string', version, infoPlist])
  run('/usr/bin/plutil', ['-remove', 'ElectronAsarIntegrity', infoPlist])

  await assertNoForbiddenPayload()
  await assertFile(join(PRESET_TARGET, 'standard', 'preset.yml'))
  await rm(ZIP_PATH, { force: true })
  run('/usr/bin/ditto', ['-c', '-k', '--keepParent', APP_BUNDLE, ZIP_PATH])
  console.log(`desktop pack: wrote ${ZIP_PATH}`)
}

await main()
