# Minitool Extract Transcript

CLI mandiri Linux x64 untuk mengunduh satu video YouTube (maksimum 720p) dan membuat transkrip lokal memakai Whisper Turbo INT8 melalui Sherpa ONNX. Semua inferensi berjalan di CPU; video dan audio tidak dikirim ke layanan transkripsi.

## Persyaratan

- Linux x64
- Node.js 22 atau lebih baru
- pnpm
- `tar` dengan dukungan `.tar.xz` dan `.tar.bz2`
- Ruang disk yang cukup untuk model Whisper Turbo dan video

## Instalasi dan penggunaan

```bash
pnpm install
pnpm run setup
pnpm start -- --input="https://youtube.com/watch?v=..." --output="/path/output"
```

`pnpm run setup` mengunduh yt-dlp, FFmpeg/ffprobe, serta encoder dan decoder Whisper Turbo INT8 ke `.cache/`. CLI utama tidak mengunduh dependency otomatis dan akan meminta Anda menjalankan setup jika cache tidak lengkap. Jika setup gagal, CLI menampilkan konteks tahap, URL sumber, target file, dan stack trace untuk membantu diagnosis.

`pnpm start` otomatis mengatur `LD_LIBRARY_PATH` untuk paket native Sherpa pada Linux, termasuk ketika dependency memakai layout `node_modules` pnpm. Anda tidak perlu mengekspor environment variable tersebut secara manual.

Hasil disimpan sebagai berikut:

```text
/path/output/
└── judul-video/
    ├── video.mp4
    └── transcript.json
```

Folder yang sudah ada tidak ditimpa; nama berikutnya memakai akhiran `-2`, `-3`, dan seterusnya. Proses yang gagal atau dihentikan membersihkan direktori staging, tetapi mempertahankan cache setup.

Opsi CLI hanya `--input`, `--output`, dan `--help`. Playlist, video privat/login, cookie, dan proxy tidak didukung.

## Pengembangan

```bash
pnpm test
pnpm typecheck
pnpm build
```

Smoke test jaringan bersifat opsional karena mengunduh dependency besar dan video nyata.

## Docker untuk Ubuntu 20.04

Binary native Sherpa membutuhkan `GLIBC >= 2.32` dan `GLIBCXX >= 3.4.29`. Pada host Ubuntu 20.04, gunakan image Node 22 berbasis Debian Bookworm yang disertakan:

```bash
mkdir -p output
docker compose build
docker compose run --rm cliptool run setup
docker compose run --rm cliptool start -- --input="https://youtube.com/watch?v=..." --output="/output"
```

Hasil tersedia di folder `./output` pada host. Model, yt-dlp, serta FFmpeg disimpan dalam named volume `cliptool-cache`, sehingga `setup` tidak perlu mengunduh ulang dependency pada setiap container baru.

Untuk menyimpan hasil ke direktori host lain, berikan path absolut melalui `OUTPUT_DIR` pada command `run`:

```bash
OUTPUT_DIR="/home/user/transkrip" docker compose run --rm cliptool start -- --input="https://youtube.com/watch?v=..." --output="/output"
```

Jalankan command setup dengan `OUTPUT_DIR` yang sama hanya jika ingin memakai konfigurasi Compose yang identik; volume cache tetap sama:

```bash
OUTPUT_DIR="/home/user/transkrip" docker compose run --rm cliptool run setup
```

## Atribusi

Bagian pembacaan WAV PCM, konfigurasi `OfflineRecognizer`, sanitasi hasil native, dan konversi token ke timestamp diadaptasi dari [VidBee](../VidBee), yang dilisensikan dengan lisensi MIT. Lihat [lisensi VidBee](../VidBee/LICENSE). Modifikasi dan penyederhanaan dibuat khusus untuk CLI ini.
