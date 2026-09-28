import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CACHE_ROOT = join(PROJECT_ROOT, '.cache')
export const BIN_DIR = join(CACHE_ROOT, 'bin')
export const MODEL_DIR = join(CACHE_ROOT, 'models', 'faster-whisper-turbo')
export const YTDLP_PATH = join(BIN_DIR, 'yt-dlp')
export const FFMPEG_PATH = '/usr/bin/ffmpeg'
export const FFPROBE_PATH = '/usr/bin/ffprobe'
export const PYTHON_PATH = '/opt/whisper-venv/bin/python'
export const MODEL_READY_PATH = join(MODEL_DIR, '.ready')
export const REQUIRED_SETUP_FILES = [YTDLP_PATH, FFMPEG_PATH, FFPROBE_PATH, PYTHON_PATH, MODEL_READY_PATH]
export const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
