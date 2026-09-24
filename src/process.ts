import { spawn, type ChildProcess } from 'node:child_process'

export interface RunOptions { signal?: AbortSignal; cwd?: string; inherit?: boolean }
export async function run(bin: string, args: string[], options: RunOptions = {}): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(bin, args, { cwd: options.cwd, stdio: options.inherit ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'] })
    let stdout = ''; let stderr = ''
    child.stdout?.on('data', (data: Buffer) => { stdout += data.toString() })
    child.stderr?.on('data', (data: Buffer) => { stderr += data.toString() })
    const abort = (): void => { child.kill('SIGTERM') }
    options.signal?.addEventListener('abort', abort, { once: true })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      options.signal?.removeEventListener('abort', abort)
      if (code === 0) resolve(stdout)
      else reject(new Error(`${bin} gagal (${signal ?? code}): ${stderr.trim().slice(-3000)}`))
    })
  })
}
