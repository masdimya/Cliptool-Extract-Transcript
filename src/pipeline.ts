import { mkdir, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { readPcmWav } from './audio.js'
import { transcribeAudio } from './asr.js'
import { FFMPEG_PATH, REQUIRED_SETUP_FILES, YTDLP_PATH } from './constants.js'
import { downloadVideo, extractAudio, fetchMetadata } from './media.js'
import { isNonEmptyFile, nextOutputPath, slugify } from './utils.js'

export interface PipelineDeps { transcribe?: typeof transcribeAudio; metadata?: typeof fetchMetadata; download?: typeof downloadVideo; audio?: typeof extractAudio; setupCheck?: () => Promise<void> }
export async function assertSetup(): Promise<void> {
  if (process.env.CLIPTOOL_DOCKER !== '1') throw new Error('Whisper hanya dijalankan lewat Docker; gunakan docker compose run')
  const valid = await Promise.all(REQUIRED_SETUP_FILES.map((file, index) => isNonEmptyFile(file, index < 4)))
  if (valid.some((item) => !item)) throw new Error('Setup belum lengkap. Jalankan: pnpm run setup')
}
export async function runPipeline(input: string, output: string, signal: AbortSignal, deps: PipelineDeps = {}): Promise<string> {
  await (deps.setupCheck ?? assertSetup)()
  const metadata = await (deps.metadata ?? fetchMetadata)(YTDLP_PATH, input, signal)
  const outputParent = resolve(output); const finalPath = await nextOutputPath(outputParent, slugify(metadata.title, metadata.id))
  const staging = `${finalPath}.staging-${process.pid}-${Date.now()}`; await mkdir(staging, { recursive: true })
  try {
    console.error('Mengunduh video (maksimum 720p)...')
    const video = await (deps.download ?? downloadVideo)(YTDLP_PATH, input, staging, signal)
    const wav = `${staging}/audio.wav`; console.error('Mengekstrak audio 16 kHz mono...'); await (deps.audio ?? extractAudio)(FFMPEG_PATH, video, wav, signal)
    const wave = await readPcmWav(wav); const duration = wave.samples.length / wave.sampleRate
    console.error('Mentranskripsikan dengan Whisper Turbo INT8 dan timestamp per kata...')
    const segments = await (deps.transcribe ?? transcribeAudio)(wav, duration, signal)
    await unlink(wav)
    const transcript = { version: 1, source: { title: metadata.title, url: input, youtubeId: metadata.id, durationSeconds: metadata.duration || duration, videoFile: basename(video) }, model: { name: 'whisper-turbo', backend: 'faster-whisper', quantization: 'int8' }, segments }
    await writeFile(`${staging}/transcript.json`, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8'); await rename(staging, finalPath)
    return finalPath
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error }
}
