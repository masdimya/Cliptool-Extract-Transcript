import { readFile } from 'node:fs/promises'

export interface PcmWave { sampleRate: number; samples: Float32Array }
export async function readPcmWav(path: string): Promise<PcmWave> {
  const buffer = await readFile(path)
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('File audio bukan WAV PCM')
  let offset = 12; let sampleRate = 0; let channels = 0; let bits = 0; let format = 0; let data: Buffer | undefined
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4); const size = buffer.readUInt32LE(offset + 4); const start = offset + 8
    if (id === 'fmt ') { format = buffer.readUInt16LE(start); channels = buffer.readUInt16LE(start + 2); sampleRate = buffer.readUInt32LE(start + 4); bits = buffer.readUInt16LE(start + 14) }
    if (id === 'data') { data = buffer.subarray(start, start + size); break }
    offset = start + size + size % 2
  }
  if (!data || format !== 1 || bits !== 16 || channels < 1) throw new Error('WAV harus PCM 16-bit')
  const frames = Math.floor(data.length / (channels * 2)); const samples = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) sum += data.readInt16LE((frame * channels + channel) * 2) / 32768
    samples[frame] = sum / channels
  }
  return { sampleRate, samples }
}
