import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'

export function slugify(title: string, youtubeId: string): string {
  const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-')
  return slug || `video-${youtubeId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function formatTimestamp(seconds: number): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000)
  const secs = Math.floor(milliseconds % 60_000 / 1000)
  const ms = milliseconds % 1000
  return [hours, minutes, secs].map((part) => String(part).padStart(2, '0')).join(':') + `.${String(ms).padStart(3, '0')}`
}

export async function nextOutputPath(parent: string, slug: string): Promise<string> {
  await mkdir(parent, { recursive: true })
  for (let suffix = 1; ; suffix += 1) {
    const candidate = join(parent, suffix === 1 ? slug : `${slug}-${suffix}`)
    try { await access(candidate); } catch { return candidate }
  }
}

export async function isNonEmptyFile(path: string, executable = false): Promise<boolean> {
  try {
    const { stat } = await import('node:fs/promises')
    const info = await stat(path)
    await access(path, executable ? constants.X_OK : constants.R_OK)
    return info.isFile() && info.size > 0
  } catch { return false }
}
