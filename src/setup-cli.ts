#!/usr/bin/env node
import { setup } from './setup.js'

const verboseError = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error)
  const lines: string[] = [error.stack ?? `${error.name}: ${error.message}`]
  let cause: unknown = error.cause
  while (cause !== undefined) {
    if (cause instanceof Error) {
      lines.push(`Disebabkan oleh:\n${cause.stack ?? `${cause.name}: ${cause.message}`}`)
      cause = cause.cause
    } else {
      lines.push(`Disebabkan oleh: ${String(cause)}`)
      break
    }
  }
  return lines.join('\n')
}

try {
  await setup()
} catch (error) {
  console.error(`Setup gagal. Detail diagnostik:\n${verboseError(error)}`)
  process.exitCode = 1
}
