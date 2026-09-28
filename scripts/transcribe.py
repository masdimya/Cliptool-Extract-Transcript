import json
import sys

from faster_whisper import WhisperModel


def main():
    audio, model_dir = sys.argv[1:3]
    gpu = "--gpu" in sys.argv[3:]
    device = "cuda" if gpu else "cpu"
    if audio != "--setup":
        print(f"Whisper device: {device}", file=sys.stderr, flush=True)
    model = WhisperModel(
        "turbo",
        device=device,
        compute_type="float16" if gpu else "int8",
        download_root=model_dir,
        local_files_only=audio != "--setup",
    )
    if audio == "--setup":
        return

    segments, info = model.transcribe(
        audio,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        condition_on_previous_text=False,
    )
    result = []
    duration = max(float(getattr(info, "duration", 0) or 0), 0.001)
    next_progress = 0
    print("Whisper progress: 0%", file=sys.stderr, flush=True)
    for segment in segments:
        progress = min(100, int((segment.end or 0) / duration * 100))
        if progress >= next_progress:
            print(f"Whisper progress: {progress}%", file=sys.stderr, flush=True)
            next_progress = progress + 5
        if not segment.text.strip():
            continue
        words = [
            {"start": word.start, "end": word.end, "word": word.word}
            for word in (segment.words or [])
        ]
        if not words or any(word["start"] is None or word["end"] is None for word in words):
            raise ValueError(f"Ujaran tanpa timestamp kata: {segment.text[:80]}")
        result.append({"text": segment.text, "words": words})
    print("Whisper progress: 100%", file=sys.stderr, flush=True)
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
