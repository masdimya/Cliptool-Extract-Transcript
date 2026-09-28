import { join } from 'node:path'
import { MODEL_DIR, PROJECT_ROOT, PYTHON_PATH } from './constants.js'
import { run } from './process.js'
import { formatTimestamp } from './utils.js'

export interface Word { startSeconds: number; endSeconds: number; text: string }
export interface Segment { index: number; startSeconds: number; endSeconds: number; startTime: string; endTime: string; text: string; words: Word[] }

interface RawWord { start: number; end: number; word: string }
interface RawSegment { text: string; words: RawWord[] }

export function parseTranscription(value: unknown, duration: number): Segment[] {
  if (!Array.isArray(value)) throw new Error('Hasil transkripsi harus berupa array')
  let previousStart = 0
  return value.map((item: RawSegment, index) => {
    if (typeof item?.text !== 'string' || !item.text.trim() || !Array.isArray(item.words) || !item.words.length) {
      throw new Error(`Ujaran ${index + 1} tidak memiliki teks atau timestamp kata`)
    }
    let previousWordStart = 0
    const words = item.words.map((word, wordIndex) => {
      const { start, end } = word ?? {}
      if (typeof word?.word !== 'string' || !word.word.trim() || !Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start || end > duration + 0.1 || start < previousWordStart) {
        throw new Error(`Timestamp kata ${wordIndex + 1} pada ujaran ${index + 1} tidak valid`)
      }
      previousWordStart = start
      return { startSeconds: start, endSeconds: end, text: word.word.trim() }
    })
    const startSeconds = words[0].startSeconds
    const endSeconds = Math.max(...words.map((word) => word.endSeconds))
    if (startSeconds < previousStart) throw new Error(`Urutan ujaran ${index + 1} tidak valid`)
    previousStart = startSeconds
    return { index: index + 1, startSeconds, endSeconds, startTime: formatTimestamp(startSeconds),
      endTime: formatTimestamp(endSeconds), text: item.text.trim(), words }
  })
}

export const transcribeArgs = (wav: string, gpu = false): string[] => [
  join(PROJECT_ROOT, 'scripts', 'transcribe.py'), wav, MODEL_DIR, ...(gpu ? ['--gpu'] : [])
]

export async function transcribeAudio(wav: string, duration: number, signal?: AbortSignal, gpu = false): Promise<Segment[]> {
  const output = await run(PYTHON_PATH, transcribeArgs(wav, gpu), { signal, teeStderr: true })
  return parseTranscription(JSON.parse(output) as unknown, duration)
}
