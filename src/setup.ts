import { chmod, copyFile, mkdir, mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { finished } from 'node:stream/promises'
import { BIN_DIR, DECODER_PATH, ENCODER_PATH, FFMPEG_PATH, FFMPEG_URL, MODEL_DIR, MODEL_URL, TOKENS_PATH, YTDLP_PATH, YTDLP_URL } from './constants.js'
import { run } from './process.js'
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
async function findFile(root: string, wanted: string): Promise<string> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isFile() && entry.name === wanted) return path
    if (entry.isDirectory()) { try { return await findFile(path, wanted) } catch { /* continue */ } }
  }
  throw new Error(`${wanted} tidak ditemukan dalam arsip`)
}
async function extractSelected(archive: string, names: string[], destination: string): Promise<void> {
  const temp = await mkdtemp(join(tmpdir(), 'minitool-extract-'))
  try {
    console.error(`  Mengekstrak: ${archive}`)
    console.error(`  Mempertahankan: ${names.join(', ')}`)
    await run('tar', ['-xf', archive, '-C', temp])
    await mkdir(destination, { recursive: true })
    for (const name of names) await copyFile(await findFile(temp, name), join(destination, name))
  } catch (error) {
    throw new Error(`Gagal mengekstrak ${archive}`, { cause: error })
  } finally { await rm(temp, { recursive: true, force: true }) }
}
export async function setup(): Promise<void> {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Versi ini hanya mendukung Linux x64')
  console.error('Menyiapkan yt-dlp...'); await ensureDownloaded(YTDLP_PATH, YTDLP_URL, httpDownload, true)
  if (!await isNonEmptyFile(FFMPEG_PATH, true) || !await isNonEmptyFile(join(BIN_DIR, 'ffprobe'), true)) {
    console.error('Mengunduh FFmpeg dan ffprobe...'); const archive = join(BIN_DIR, 'ffmpeg.tar.xz'); await ensureDownloaded(archive, FFMPEG_URL)
    await extractSelected(archive, ['ffmpeg', 'ffprobe'], BIN_DIR); await chmod(FFMPEG_PATH, 0o755); await chmod(join(BIN_DIR, 'ffprobe'), 0o755); await rm(archive, { force: true })
  }
  if (!await isNonEmptyFile(ENCODER_PATH) || !await isNonEmptyFile(DECODER_PATH) || !await isNonEmptyFile(TOKENS_PATH)) {
    console.error('Mengunduh Whisper Turbo INT8 (file besar)...'); const archive = join(MODEL_DIR, 'whisper-turbo.tar.bz2'); await ensureDownloaded(archive, MODEL_URL)
    await extractSelected(archive, ['turbo-encoder.int8.onnx', 'turbo-decoder.int8.onnx', 'turbo-tokens.txt'], MODEL_DIR); await rm(archive, { force: true })
  }
  for (const path of [YTDLP_PATH, FFMPEG_PATH, join(BIN_DIR, 'ffprobe'), ENCODER_PATH, DECODER_PATH, TOKENS_PATH]) if ((await stat(path)).size === 0) throw new Error(`Setup menghasilkan file kosong: ${path}`)
  console.error('Setup selesai.')
}
