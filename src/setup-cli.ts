#!/usr/bin/env node
import { setup } from './setup.js'
try { await setup() } catch (error) { console.error(`Setup gagal: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1 }
