#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const child = spawn(process.execPath, ['--import', 'tsx', join(projectRoot, 'src', 'cli.ts'), ...process.argv.slice(2)], { stdio: 'inherit' })
child.once('error', (error) => { console.error(`Gagal menjalankan CLI: ${error.message}`); process.exitCode = 1 })
child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
