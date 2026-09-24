#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

let nativeLibraryDirectory
try {
  nativeLibraryDirectory = dirname(require.resolve('sherpa-onnx-linux-x64/package.json'))
} catch (error) {
  console.error('Paket native Sherpa Linux x64 tidak ditemukan. Jalankan: pnpm install')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const currentLibraryPath = process.env.LD_LIBRARY_PATH
const libraryPath = currentLibraryPath
  ? `${nativeLibraryDirectory}:${currentLibraryPath}`
  : nativeLibraryDirectory

const child = spawn(
  process.execPath,
  ['--import', 'tsx', join(projectRoot, 'src', 'cli.ts'), ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: { ...process.env, LD_LIBRARY_PATH: libraryPath },
    stdio: 'inherit'
  }
)

child.once('error', (error) => {
  console.error(`Gagal menjalankan CLI: ${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
