import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const IS_DOCKER = process.env.CLIPTOOL_DOCKER === '1'
export const CACHE_ROOT = join(PROJECT_ROOT, '.cache')
export const BIN_DIR = join(CACHE_ROOT, 'bin')
export const VENV_DIR = IS_DOCKER ? '/opt/whisper-venv' : join(CACHE_ROOT, 'whisper-venv')
export const MODEL_DIR = join(CACHE_ROOT, 'models', 'faster-whisper-turbo')
export const YTDLP_PATH = join(BIN_DIR, 'yt-dlp')
export const FFMPEG_PATH = IS_DOCKER ? '/usr/bin/ffmpeg' : 'ffmpeg'
export const FFPROBE_PATH = IS_DOCKER ? '/usr/bin/ffprobe' : 'ffprobe'
export const PYTHON_PATH = join(VENV_DIR, 'bin', 'python')
export const MODEL_READY_PATH = join(MODEL_DIR, '.ready')
export const REQUIRED_SETUP_FILES = [YTDLP_PATH, PYTHON_PATH, MODEL_READY_PATH]
export const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
