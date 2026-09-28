import { chmod, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { FFMPEG_PATH, FFPROBE_PATH, IS_DOCKER, MODEL_DIR, MODEL_READY_PATH, PROJECT_ROOT, PYTHON_PATH, VENV_DIR, YTDLP_PATH, YTDLP_URL } from './constants.js'
import { canRun, run } from './process.js'
import { isNonEmptyFile } from './utils.js'

export type Downloader = (url: string, destination: string) => Promise<void>
export const httpDownload: Downloader = async (url, destination) => {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status} ${response.statusText}; URL akhir: ${response.url || url}`)
  await finished(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream).pipe(createWriteStream(destination, { flags: 'wx' })))
}
export async function ensureDownloaded(destination: string, url: string, downloader: Downloader = httpDownload, executable = false): Promise<'skipped' | 'downloaded'> {
  if (await isNonEmptyFile(destination, executable)) return 'skipped'
  await mkdir(dirname(destination), { recursive: true }); const part = `${destination}.part`
  await rm(part, { force: true })
  try {
    console.error(`  Sumber: ${url}`)
    console.error(`  Target: ${destination}`)
    await downloader(url, part)
    if (!await isNonEmptyFile(part)) throw new Error(`File unduhan kosong: ${basename(destination)}`)
    if (executable) await chmod(part, 0o755)
    await rename(part, destination)
    return 'downloaded'
  } catch (error) {
    await rm(part, { force: true })
    throw new Error(`Gagal menyiapkan ${basename(destination)} dari ${url}`, { cause: error })
  }
}
export async function setup(): Promise<void> {
  if (!await canRun(FFMPEG_PATH) || !await canRun(FFPROBE_PATH)) throw new Error('FFmpeg/ffprobe tidak tersedia')
  if (!IS_DOCKER) {
    if (!await isNonEmptyFile(PYTHON_PATH, true)) await run('python3.11', ['-m', 'venv', VENV_DIR], { inherit: true })
    await run(PYTHON_PATH, ['-m', 'pip', 'install', '--upgrade', 'faster-whisper==1.2.1'], { inherit: true })
  }
  console.error('Menyiapkan yt-dlp...'); await ensureDownloaded(YTDLP_PATH, YTDLP_URL, httpDownload, true)
  if (!await isNonEmptyFile(MODEL_READY_PATH)) {
    console.error('Mengunduh model Whisper Turbo...')
    await mkdir(MODEL_DIR, { recursive: true })
    await run(PYTHON_PATH, [join(PROJECT_ROOT, 'scripts', 'transcribe.py'), '--setup', MODEL_DIR], { inherit: true })
    await writeFile(MODEL_READY_PATH, 'turbo\n')
  }
  for (const path of [YTDLP_PATH, PYTHON_PATH, MODEL_READY_PATH]) if ((await stat(path)).size === 0) throw new Error(`Setup menghasilkan file kosong: ${path}`)
  console.error('Setup selesai.')
}
