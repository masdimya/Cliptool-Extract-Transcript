import { mkdir, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { readPcmWav } from './audio.js'
import { createRecognizer, transcribeSamples, type Recognizer } from './asr.js'
import { FFMPEG_PATH, REQUIRED_SETUP_FILES, YTDLP_PATH } from './constants.js'
import { downloadVideo, extractAudio, fetchMetadata } from './media.js'
import { isNonEmptyFile, nextOutputPath, slugify } from './utils.js'

export interface PipelineDeps { recognizer?: () => Recognizer; metadata?: typeof fetchMetadata; download?: typeof downloadVideo; audio?: typeof extractAudio; setupCheck?: () => Promise<void> }
export async function assertSetup(): Promise<void> {
  const valid = await Promise.all(REQUIRED_SETUP_FILES.map((file, index) => isNonEmptyFile(file, index < 3)))
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
    const wave = await readPcmWav(wav); console.error('Mentranskripsikan dengan Whisper Turbo INT8...')
    const segments = transcribeSamples((deps.recognizer ?? createRecognizer)(), wave.samples, wave.sampleRate, (done, total) => process.stderr.write(`\rTranskripsi ${Math.round(done / total * 100)}%`), signal)
    process.stderr.write('\n'); await unlink(wav)
    const transcript = { version: 1, source: { title: metadata.title, url: input, youtubeId: metadata.id, durationSeconds: metadata.duration || wave.samples.length / wave.sampleRate, videoFile: basename(video) }, model: { name: 'whisper-turbo', backend: 'sherpa-onnx', quantization: 'int8' }, segments }
    await writeFile(`${staging}/transcript.json`, `${JSON.stringify(transcript, null, 2)}\n`, 'utf8'); await rename(staging, finalPath)
    return finalPath
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error }
}
