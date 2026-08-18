import { defineConfig } from 'tsdown'

/** Desktop host entries: Electron main process and a minimal preload bridge. */
export default defineConfig({
  entry: ['lib/types/main.js', 'lib/types/preload.js'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  external: ['electron'],
})
