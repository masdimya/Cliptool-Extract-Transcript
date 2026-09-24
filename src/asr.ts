import { createRequire } from 'node:module'
import { DECODER_PATH, ENCODER_PATH, TOKENS_PATH } from './constants.js'
import { formatTimestamp } from './utils.js'

export const MAX_CHUNK_SECONDS = 15
export interface NativeResult { text?: string; tokens?: string[]; timestamps?: number[]; durations?: number[] }
export interface Word { startSeconds: number; endSeconds: number; text: string }
export interface Segment { index: number; startSeconds: number; endSeconds: number; startTime: string; endTime: string; text: string; words: Word[] }
export interface Recognizer { createStream(): { acceptWaveform(input: { sampleRate: number; samples: Float32Array }): void; inputFinished?(): void }; decode(stream: unknown): void; getResult(stream: unknown): NativeResult }

export function withSanitizedJson<T>(callback: () => T): T {
  const original = JSON.parse
  JSON.parse = ((text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) => {
    try { return original(text, reviver) }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      let output = ''; let quoted = false; let escaped = false
      for (const character of text) {
        if (!quoted) { if (character === '"') quoted = true; output += character; continue }
        if (escaped) { output += character; escaped = false; continue }
        if (character === '\\') { output += character; escaped = true; continue }
        if (character === '"') { quoted = false; output += character; continue }
        const code = character.charCodeAt(0); output += code <= 31 ? `\\u${code.toString(16).padStart(4, '0')}` : character
      }
      return original(output, reviver)
    }
  }) as typeof JSON.parse
  try { return callback() } finally { JSON.parse = original }
}

const normalizeToken = (token: string): string => token.replace(/^▁/u, ' ')
const CJK = /[\u4e00-\u9fff]/u
const PUNCTUATION = /^[^\s\u4e00-\u9fffA-Za-z0-9]+$/u
export function wordsFromResult(result: NativeResult, start: number, end: number): Word[] {
  const tokens = result.tokens ?? []; const timestamps = result.timestamps ?? []
  if (!tokens.length || tokens.length !== timestamps.length) return []
  const groups: Array<{ startSeconds: number; text: string }> = []
  for (const [index, token] of tokens.entries()) {
    const normalized = normalizeToken(token); const trimmed = normalized.trim(); const last = groups.at(-1)
    const newWord = !last || normalized.startsWith(' ') || normalized.startsWith('\n') || (Boolean(trimmed) && !PUNCTUATION.test(trimmed) && CJK.test(trimmed))
    const tokenStart = Math.max(start, Math.min(end, start + (timestamps[index] ?? 0)))
    if (newWord) groups.push({ startSeconds: tokenStart, text: normalized })
    else if (last) last.text += normalized
  }
  return groups.filter((group) => group.text.trim()).map((group, index) => ({
    startSeconds: group.startSeconds,
    endSeconds: Math.max(group.startSeconds + 0.001, Math.min(end, groups[index + 1]?.startSeconds ?? end)),
    text: group.text.trim()
  }))
}

export function transcribeSamples(recognizer: Recognizer, samples: Float32Array, sampleRate: number, progress?: (done: number, total: number) => void, signal?: AbortSignal): Segment[] {
  const chunkSize = sampleRate * MAX_CHUNK_SECONDS; const total = Math.max(1, Math.ceil(samples.length / chunkSize)); const segments: Segment[] = []
  for (let offset = 0, chunkIndex = 0; offset < samples.length; offset += chunkSize, chunkIndex += 1) {
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Proses dibatalkan')
    const endOffset = Math.min(samples.length, offset + chunkSize); const start = offset / sampleRate; const end = endOffset / sampleRate
    const stream = recognizer.createStream(); stream.acceptWaveform({ sampleRate, samples: samples.subarray(offset, endOffset) }); stream.inputFinished?.(); recognizer.decode(stream)
    const result = withSanitizedJson(() => recognizer.getResult(stream)); const text = (result.text ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim()
    if (text) segments.push({ index: segments.length + 1, startSeconds: start, endSeconds: end, startTime: formatTimestamp(start), endTime: formatTimestamp(end), text, words: wordsFromResult(result, start, end) })
    progress?.(chunkIndex + 1, total)
  }
  return segments
}

export function createRecognizer(): Recognizer {
  const require = createRequire(import.meta.url)
  const addon = require('sherpa-onnx-node') as { OfflineRecognizer: new (config: Record<string, unknown>) => Recognizer }
  return new addon.OfflineRecognizer({ featConfig: { sampleRate: 16000, featureDim: 80 }, modelConfig: { whisper: { encoder: ENCODER_PATH, decoder: DECODER_PATH, language: '', task: 'transcribe', tailPaddings: -1 }, tokens: TOKENS_PATH, numThreads: 2, provider: 'cpu', debug: 0 } })
}
