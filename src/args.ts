export interface CliArgs { input: string; output: string }

export const HELP = `Penggunaan:
  pnpm start -- --input=<youtube_link> --output=<output_path>

Opsi:
  --input=<youtube_link>   Wajib; URL video YouTube tunggal
  --output=<output_path>   Wajib; direktori induk hasil
  --help                   Tampilkan bantuan`

export function isYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtu.be') return url.pathname.slice(1).length > 0
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com') {
      return url.pathname === '/watch' ? Boolean(url.searchParams.get('v')) : /^\/(shorts|live|embed)\/[^/]+/.test(url.pathname)
    }
    return false
  } catch { return false }
}

export function parseArgs(argv: string[]): CliArgs | { help: true } {
  if (argv.includes('--help')) return { help: true }
  const allowed = new Set(['--input', '--output'])
  const values = new Map<string, string>()
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index] ?? ''
    const equals = item.indexOf('=')
    const key = equals >= 0 ? item.slice(0, equals) : item
    if (!allowed.has(key)) throw new Error(`Argumen tidak dikenal: ${item}`)
    const value = equals >= 0 ? item.slice(equals + 1) : argv[++index]
    if (!value || value.startsWith('--')) throw new Error(`Nilai wajib untuk ${key}`)
    if (values.has(key)) throw new Error(`Argumen duplikat: ${key}`)
    values.set(key, value)
  }
  const input = values.get('--input')
  const output = values.get('--output')
  if (!input || !output) throw new Error('--input dan --output wajib diberikan')
  if (!isYoutubeUrl(input)) throw new Error('--input harus berupa URL video YouTube')
  return { input, output }
}
