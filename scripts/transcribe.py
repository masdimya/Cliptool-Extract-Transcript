import json
import sys

from faster_whisper import WhisperModel


def main():
    audio, model_dir = sys.argv[1:3]
    model = WhisperModel(
        "turbo",
        device="cpu",
        compute_type="int8",
        download_root=model_dir,
        local_files_only=audio != "--setup",
    )
    if audio == "--setup":
        return

    segments, _ = model.transcribe(
        audio,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        condition_on_previous_text=False,
    )
    result = []
    for segment in segments:
        if not segment.text.strip():
            continue
        words = [
            {"start": word.start, "end": word.end, "word": word.word}
            for word in (segment.words or [])
        ]
        if not words or any(word["start"] is None or word["end"] is None for word in words):
            raise ValueError(f"Ujaran tanpa timestamp kata: {segment.text[:80]}")
        result.append({"text": segment.text, "words": words})
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
