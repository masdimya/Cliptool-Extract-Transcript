import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { run } from './process.js'

export interface VideoMetadata { title: string; id: string; duration: number }
export const metadataArgs = (url: string): string[] => ['--no-playlist', '--no-warnings', '--dump-single-json', url]
export const downloadArgs = (outputTemplate: string, url: string, ffmpegDirectory?: string): string[] => [
  '--no-playlist', '--newline', '--progress', '--js-runtimes', 'node',
  ...(ffmpegDirectory ? ['--ffmpeg-location', ffmpegDirectory] : []),
  '-f', 'bv*[height<=720]+ba/b[height<=720]',
  '--merge-output-format', 'mp4/mkv', '-o', outputTemplate, url
]
export const ffmpegArgs = (input: string, output: string): string[] => ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', output]

export async function fetchMetadata(ytdlp: string, url: string, signal?: AbortSignal): Promise<VideoMetadata> {
  const data = JSON.parse(await run(ytdlp, metadataArgs(url), { signal })) as Record<string, unknown>
  if (typeof data.title !== 'string' || typeof data.id !== 'string') throw new Error('Metadata YouTube tidak valid')
  return { title: data.title, id: data.id, duration: typeof data.duration === 'number' ? data.duration : 0 }
}
export async function downloadVideo(ytdlp: string, url: string, directory: string, signal?: AbortSignal): Promise<string> {
  await run(ytdlp, downloadArgs(join(directory, 'video.%(ext)s'), url, dirname(ytdlp)), { signal, inherit: true })
  const files = (await readdir(directory)).filter((name) => /^video\.(mp4|mkv|webm|mov)$/i.test(name))
  if (!files[0]) throw new Error('yt-dlp tidak menghasilkan file video')
  return join(directory, files[0])
}
export async function extractAudio(ffmpeg: string, video: string, wav: string, signal?: AbortSignal): Promise<void> {
  await run(ffmpeg, ffmpegArgs(video, wav), { signal, inherit: true })
}
