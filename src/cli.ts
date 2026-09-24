#!/usr/bin/env node
import { HELP, parseArgs } from './args.js'
import { runPipeline } from './pipeline.js'

const abort = new AbortController()
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => abort.abort(new Error(`Dihentikan oleh ${signal}`)))
try {
  const args = parseArgs(process.argv.slice(2))
  if ('help' in args) { console.log(HELP) } else {
    const result = await runPipeline(args.input, args.output, abort.signal)
    console.log(`Selesai: ${result}`)
  }
} catch (error) { console.error(`Gagal: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1 }
