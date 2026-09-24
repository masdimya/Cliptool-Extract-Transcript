import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isYoutubeUrl, parseArgs } from '../src/args.js'
import { MAX_CHUNK_SECONDS, transcribeSamples, wordsFromResult, type Recognizer } from '../src/asr.js'
import { downloadArgs, ffmpegArgs, metadataArgs } from '../src/media.js'
import { runPipeline } from '../src/pipeline.js'
import { ensureDownloaded } from '../src/setup.js'
import { formatTimestamp, nextOutputPath, slugify } from '../src/utils.js'

const temporary: string[] = []
const temp = async (): Promise<string> => { const path = await mkdtemp(join(tmpdir(), 'minitool-test-')); temporary.push(path); return path }
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }) })

describe('CLI helpers', () => {
  it('parses required arguments and help', () => {
    expect(parseArgs(['--input=https://youtu.be/abc', '--output', '/tmp/out'])).toEqual({ input: 'https://youtu.be/abc', output: '/tmp/out' })
    expect(parseArgs(['--help'])).toEqual({ help: true })
    expect(() => parseArgs(['--input=https://youtu.be/abc'])).toThrow(/wajib/)
  })
  it('validates single YouTube URLs', () => {
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isYoutubeUrl('https://youtube.com/playlist?list=abc')).toBe(false)
    expect(isYoutubeUrl('https://example.com/watch?v=abc')).toBe(false)
  })
  it('formats timestamps and slugs', () => {
    expect(formatTimestamp(3661.234)).toBe('01:01:01.234')
    expect(slugify('Café déjà vu!', 'id')).toBe('cafe-deja-vu')
    expect(slugify('你好', 'abc_12')).toBe('video-abc_12')
  })
  it('adds a folder suffix without overwriting', async () => {
    const root = await temp(); await mkdir(join(root, 'title')); await mkdir(join(root, 'title-2'))
    expect(await nextOutputPath(root, 'title')).toBe(join(root, 'title-3'))
  })
})

describe('ASR conversion', () => {
  it('converts relative tokens to absolute word timestamps', () => {
    expect(wordsFromResult({ tokens: ['▁Hello', ',', '▁world'], timestamps: [0.2, 0.5, 0.8] }, 10, 12)).toEqual([
      { startSeconds: 10.2, endSeconds: 10.8, text: 'Hello,' }, { startSeconds: 10.8, endSeconds: 12, text: 'world' }
    ])
    expect(wordsFromResult({ text: 'fallback' }, 0, 1)).toEqual([])
  })
  it('chunks at no more than 15 seconds and omits empty results', () => {
    let calls = 0
    const recognizer: Recognizer = { createStream: () => ({ acceptWaveform: ({ samples }) => expect(samples.length).toBeLessThanOrEqual(16000 * MAX_CHUNK_SECONDS) }), decode: () => {}, getResult: () => ({ text: calls++ === 0 ? 'one' : '' }) }
    const segments = transcribeSamples(recognizer, new Float32Array(16000 * 16), 16000)
    expect(calls).toBe(2); expect(segments).toHaveLength(1); expect(segments[0]?.words).toEqual([])
  })
})

describe('external command construction', () => {
  it('bounds video quality and disables playlists', () => {
    expect(metadataArgs('url')).toContain('--no-playlist')
    const args = downloadArgs('/safe/video.%(ext)s', 'url')
    expect(args).toContain('--no-playlist'); expect(args.join(' ')).toContain('height<=720'); expect(args).toContain('/safe/video.%(ext)s'); expect(args).toContain('mp4/mkv')
  })
  it('extracts 16 kHz mono PCM', () => {
    const args = ffmpegArgs('video.mp4', 'audio.wav')
    expect(args).toEqual(expect.arrayContaining(['-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le']))
  })
})

describe('setup downloader', () => {
  it('skips a valid file and rejects empty files without leaving part files', async () => {
    const root = await temp(); const file = join(root, 'bin'); await writeFile(file, 'ok'); let called = false
    expect(await ensureDownloaded(file, 'url', async () => { called = true })).toBe('skipped'); expect(called).toBe(false)
    const empty = join(root, 'empty')
    await expect(ensureDownloaded(empty, 'url', async (_url, destination) => { await writeFile(destination, '') })).rejects.toThrow(/Gagal menyiapkan empty/)
    await expect(readFile(`${empty}.part`)).rejects.toThrow()
  })
})

describe('pipeline integration', () => {
  it('creates the stable output schema using mocked tools', async () => {
    const root = await temp()
    const recognizer: Recognizer = { createStream: () => ({ acceptWaveform: () => {} }), decode: () => {}, getResult: () => ({ text: 'Halo dunia', tokens: ['▁Halo', '▁dunia'], timestamps: [0, 0.4] }) }
    const result = await runPipeline('https://youtu.be/id123', root, new AbortController().signal, {
      setupCheck: async () => {}, metadata: async () => ({ title: 'Judul Café', id: 'id123', duration: 1 }),
      download: async (_bin, _url, directory) => { const path = join(directory, 'video.mp4'); await writeFile(path, 'video'); return path },
      audio: async (_bin, _video, wav) => { const buffer = Buffer.alloc(44 + 32000); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(32000, 40); await writeFile(wav, buffer) }, recognizer: () => recognizer
    })
    expect(result).toBe(join(root, 'judul-cafe'))
    const json = JSON.parse(await readFile(join(result, 'transcript.json'), 'utf8'))
    expect(json).toMatchObject({ version: 1, source: { youtubeId: 'id123', videoFile: 'video.mp4' }, model: { quantization: 'int8' } })
    expect(json.segments[0]).toMatchObject({ index: 1, text: 'Halo dunia', startTime: '00:00:00.000' })
  })
})
