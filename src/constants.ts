import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CACHE_ROOT = join(PROJECT_ROOT, '.cache')
export const BIN_DIR = join(CACHE_ROOT, 'bin')
export const MODEL_DIR = join(CACHE_ROOT, 'models', 'sherpa-onnx-whisper-turbo')
export const YTDLP_PATH = join(BIN_DIR, 'yt-dlp')
export const FFMPEG_PATH = join(BIN_DIR, 'ffmpeg')
export const FFPROBE_PATH = join(BIN_DIR, 'ffprobe')
export const ENCODER_PATH = join(MODEL_DIR, 'turbo-encoder.int8.onnx')
export const DECODER_PATH = join(MODEL_DIR, 'turbo-decoder.int8.onnx')
export const TOKENS_PATH = join(MODEL_DIR, 'turbo-tokens.txt')
export const REQUIRED_SETUP_FILES = [YTDLP_PATH, FFMPEG_PATH, FFPROBE_PATH, ENCODER_PATH, DECODER_PATH, TOKENS_PATH]
export const MODEL_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2'
export const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
export const FFMPEG_URL = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz'
