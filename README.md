# Minitool Extract Transcript

CLI untuk mengunduh satu video YouTube (maksimum 720p) dan membuat transkrip lokal memakai Whisper Turbo INT8 melalui faster-whisper. Bisa dijalankan langsung di host atau lewat Docker; video dan audio tidak dikirim ke layanan transkripsi.

## Persyaratan

- Node 22, pnpm, Python 3.11, dan FFmpeg/ffprobe
- Docker dan Docker Compose pada Linux x64 jika memakai mode Docker
- Ruang disk yang cukup untuk model Whisper Turbo dan video

## Instalasi dan penggunaan

```bash
pnpm run setup
pnpm start -- --input="https://youtube.com/watch?v=..." --output="./output" --cookies="./cookies.txt"
```

Tanpa Docker, host perlu Node 22, pnpm, Python 3.11, dan FFmpeg/ffprobe. `pnpm run setup` membuat venv lokal di `.cache`, mengunduh yt-dlp, dan mengunduh model Whisper Turbo.

Docker tetap bisa dipakai sebagai alternatif saat host belum punya dependency native:

```bash
docker compose build
docker compose run --rm cliptool run setup
docker compose run --rm cliptool start -- --input="https://youtube.com/watch?v=..." --output="/output"
```

Image Docker menyediakan FFmpeg, Python, dan faster-whisper.

`transcript.json` berisi ujaran dengan `words` bertimestamp per kata. Waktu kata berasal dari model dan tetap perlu dicek terhadap audio sebelum menentukan batas klip final.

Hasil disimpan sebagai berikut:

```text
output/
└── judul-video/
    ├── video.mp4
    └── transcript.json
```

Folder yang sudah ada tidak ditimpa; nama berikutnya memakai akhiran `-2`, `-3`, dan seterusnya. Proses yang gagal atau dihentikan membersihkan direktori staging, tetapi mempertahankan cache setup.

Opsi CLI hanya `--input`, `--output`, `--cookies`, `--gpu`, dan `--help`. Gunakan `--gpu` hanya di host dengan CUDA yang siap dipakai faster-whisper. Playlist, video privat/login interaktif, dan proxy tidak didukung.

## Pengembangan

```bash
pnpm test
pnpm typecheck
pnpm build
```

Smoke test jaringan bersifat opsional karena mengunduh dependency besar dan video nyata.

## Penyimpanan hasil Docker

Hasil tersedia di folder `./output` pada host. Model dan yt-dlp disimpan dalam named volume `cliptool-cache`, sehingga `setup` tidak perlu mengunduh ulang keduanya pada setiap container baru. FFmpeg sudah tersedia dalam image Docker.

Untuk menyimpan hasil ke direktori host lain, berikan path absolut melalui `OUTPUT_DIR` pada command `run`:

```bash
OUTPUT_DIR="/home/user/transkrip" docker compose run --rm cliptool start -- --input="https://youtube.com/watch?v=..." --output="/output"
```

Jalankan command setup dengan `OUTPUT_DIR` yang sama hanya jika ingin memakai konfigurasi Compose yang identik; volume cache tetap sama:

```bash
OUTPUT_DIR="/home/user/transkrip" docker compose run --rm cliptool run setup
```
