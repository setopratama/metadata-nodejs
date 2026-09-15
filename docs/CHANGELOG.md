# Changelog

Semua perubahan penting pada project **imgmeta** dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).
Jenis perubahan: **Ditambahkan** (Added), **Diubah** (Changed), **Dihapus** (Removed),
**Diperbaiki** (Fixed).

Versi mengikuti `package.json` / `VERSION` di `src/cli.js` (saat ini **v1.1.0**).

## [1.1.0] - 2026-09-15

Rilis Fitur Baru Versi 1.1.0 — **Engine Ekspor JPEG Zero-Dependency (`src/image.js`)**, decoder PNG murni, encoder baseline JPEG berkecepatan tinggi (Fast AAN FDCT), integrasi CLI `export-jpeg`, dan dukungan Microstock Ready di Web UI.

### Ditambahkan
- **Engine Pemrosesan Gambar Murni Node.js (`src/image.js`)**:
  - **PNG Decoder**: Mendekode format PNG (RGBA, RGB, Grayscale, Palette) dengan un-filtering scanline otomatis (None, Sub, Up, Average, Paeth) dan dekompresi `node:zlib` bawaan.
  - **Fast JPEG Encoder**: Mengimplementasikan algoritma Fast AAN FDCT 8x8 (Arai, Agui, and Nakajima) untuk kompresi JPEG baseline JFIF beresolusi tinggi (hingga 16MP+) tanpa dependensi pihak ketiga.
  - **Penyematan Metadata Lengkap**: Fungsi `exportFileToJpeg(src, dest, opts)` yang otomatis mengonversi gambar ke JPEG sekaligus menginjeksi segmen EXIF APP1 (TIFF model), IPTC APP13 (Photoshop 8BIM), dan Adobe XMP Dublin Core `<dc:subject>` (`<rdf:Bag>`).
- **Perintah CLI `export-jpeg` (Alias: `jpeg`, `export`)**:
  - `node index.js export-jpeg "foto/*.png" [--quality 90] [--preset default] [--out-dir out]`
  - Mendukung opsi kualitas gambar (`--quality <1-100>`), pemetaan preset SQLite (`--preset`), file judul/kata kunci eksternal, dan direktori keluaran kustom (`--out-dir`).
- **Antarmuka Web UI Export JPEG (`public/`)**:
  - Tombol aksi **🖼️ EXPORT KE JPEG (MICROSTOCK READY)** pada panel kontrol utama untuk ekspor batch folder.
  - **Ekspor Foto Individual**: Kartu tindakan **🖼️ EXPORT FOTO INI KE JPG** di dalam modal Inspeksi/Detail foto untuk konversi satu gambar instan dengan metadata terpetakan aktif.
  - Slider dan pemilih pengatur kualitas JPEG interaktif (50%–100%, default 90%).
  - Endpoint REST API `POST /api/export-jpeg` mendukung parameter `singleTitle`, `singleKeywords`, dan file tunggal dengan pencatatan log real-time dan riwayat ke SQLite.
- **Pengujian Internal Terpadu**:
  - Penambahan 9 skenario pengujian unit untuk decoding PNG, encoding JPEG, dan ekspor berkas lengkap (total 78 pengujian lulus 100%).

## [1.0.0] - 2026-09-15

Rilis Resmi Versi 1.0.0 — Modernisasi penyimpanan metadata dengan **SQLite bawaan Node.js (`node:sqlite`)**, manajemen preset, antarmuka Database Grid, dan dokumentasi arsitektur direktori lengkap.

### Ditambahkan
- **Penyimpanan SQLite Bawaan (`src/db.js`)**:
  - Menggunakan modul standar `node:sqlite` (`DatabaseSync` Node.js >= 22) dengan **nol dependensi eksternal**.
  - Skema database `imgmeta.db` lengkap: tabel `presets`, `items`, `history`, dan `templates`.
  - **Auto-Migrasi**: Otomatis mendeteksi dan memigrasikan data dari `title.txt` dan `keyword.txt` ke dalam database SQLite preset `default` saat pertama kali dijalankan.
- **Subperintah CLI `db`**:
  - `node index.js db list` — Menampilkan daftar semua preset SQLite dan jumlah entri.
  - `node index.js db show [preset]` — Menampilkan pratinjau judul, kata kunci, dan penulis dari preset.
  - `node index.js db add <preset> --title "..." --keywords "..."` — Menambah entri baru ke preset.
  - `node index.js db import <preset> [--titles <file>] [--keywords <file>]` — Mengimpor data teks ke SQLite.
  - `node index.js db export <preset> [--titles <file>] [--keywords <file>]` — Mengekspor data SQLite ke file teks.
  - `node index.js db clear <preset>` / `node index.js db delete <preset>` — Mengosongkan atau menghapus preset.
- **Integrasi SQLite pada CLI `auto`, `apply`, & `rename`**:
  - Perintah `auto` dan `apply` kini secara default membaca dari preset SQLite (opsi `--preset <id>`), dengan fallback mulus ke file teks.
  - Seluruh operasi batch dicatat secara otomatis ke tabel `history` di SQLite.
- **Antarmuka Web UI Database & Preset Manager (`public/`)**:
  - Tab **GRID SQLITE**: Editor tabel interaktif untuk menambah baris, mengedit judul & kata kunci secara inline, menghapus baris, dan menyimpan perubahan langsung ke database.
  - Tab **RIWAYAT (HISTORY)**: Menampilkan riwayat batch proses dari SQLite dengan badge status, jumlah file, waktu, dan rincian log.
  - Kontrol Preset: Buat preset baru dan ganti preset aktif langsung dari bilah atas Web UI.
- **Dokumentasi Struktur Folder**:
  - Pembuatan dokumen panduan arsitektur direktori lengkap di [`docs/STRUKTUR_FOLDER.md`](docs/STRUKTUR_FOLDER.md).
- **Pengujian Internal Terpadu**:
  - Penambahan 10 skenario pengujian SQLite di `test/selftest.js` (total 69 pengujian lulus 100%).

### Ditambahkan

- **Web UI Interaktif (`web`)**: Antarmuka grafis browser mandiri tanpa dependensi pihak ketiga menggunakan HTTP server bawaan Node.js (`src/server.js` & folder `public/`).
- **Desain Sistem Industrial Minimalism**: Mengikuti acuan `DESIGN.md` (warm stone palette, sharp edges `border-radius: 0`, tipografi `Inter` & `IBM Plex Mono`, label uppercase, tampilan dokumen/arsip).
- **Fitur Frontend Lengkap**:
  - Pemilih direktori & penjelajah subfolder di dalam `foto/`.
  - Multi-line textarea editor untuk Judul (`title.txt`) & Kata Kunci (`keyword.txt`) dengan sinkronisasi langsung dan penghitung baris/kelompok.
  - Live preview visual diff (nama file asli `->` nama baru, judul, tag kata kunci, status badge).
  - Tampilan ganda: Tabel Perbandingan dan Grid Galeri Kartu Foto.
  - Eksekusi 1-klik untuk Auto Process (Metadata + Rename), Terapkan Metadata Saja, Rename Saja, atau Strip Metadata.
  - Konsol log aktivitas real-time di antarmuka web.

### Diperbaiki

- **Tampilan Jumlah Tag Kata Kunci pada Web UI**:
  - Memperbaiki bug kolom TAGS pada tabel dan grid kartu yang sebelumnya hanya menampilkan `item.mappedKeywordsCount` (selalu `0 TAGS` bila input textarea kosong). Kini menampilkan jumlah kata kunci aktual file asli serta status transisi saat pemetaan baru diterapkan.
- **Dukungan Parser Adobe XMP & PNG Text Fallback**:
  - Menambahkan parser ringan `parseXmpMetadata()` untuk mengekstrak `<dc:subject>`, `<dc:title>`, `<dc:description>`, dan `<dc:creator>` dari paket XMP JPEG/PNG serta chunk teks PNG (`iTXt`/`tEXt`) sebagai fallback di `buildExifView()`.
- **Batch Rename Berbasis Judul (`titles`)**:
  - `buildName` dan `runRename` di `src/rename.js` kini mendukung parameter `customTitle` dan opsi `options.titles` agar file tetap dapat di-rename sesuai daftar judul meskipun metadata EXIF pada file fisik belum ditulis atau berformat non-JPEG/PNG.
  - CLI `cmdRename` kini mendukung opsi `--titles <file>` (misal `--titles title.txt`) dengan penyortiran cerdas `sortFilesByTitles`.
  - Web UI API `/api/execute` untuk aksi `rename` kini meneruskan daftar judul dari form textarea ke `runRename` dan menghitung metrik `processed`/`skipped`/`failed` secara akurat pada respon JSON.

## [1.1.0] - 2026-08-18

### Ditambahkan

- **Log kegagalan ke file `imgmeta.log`**: setiap kegagalan operasi (rename,
  ubah metadata `edit`/`apply`/`auto`, `strip`, ekspansi file, serta error
  global CLI) dicatat dalam mode *append* ke `imgmeta.log` di folder tempat
  perintah dijalankan. Format tiap baris:
  `[YYYY-MM-DD HH:mm:ss] [operasi] file — pesan`. Implementasi murni di
  `utils.logFailure()` (tanpa dependensi); kegagalan menulis log tidak
  menghentikan proses.
- **Ringkasan log langsung di layar**: di akhir setiap perintah, `run()`
  menampilkan ringkasan kegagalan sesi berjalan — bila ada error, baris-baris
  log dicetak beserta lokasi `imgmeta.log`; bila bersih, muncul pesan
  *"Log kegagalan: tidak ada error."* (dilewati untuk `read --json`).
  Implementasi: `utils.resetFailures()`/`utils.getFailures()` di `src/utils.js`
  dan `printFailureSummary()` di `src/cli.js`.

## [1.0.0] - 2026-08-08

Rilis pertama imgmeta — CLI Node.js **tanpa dependensi** untuk membaca & mengubah
metadata foto (**EXIF** & **IPTC**) serta mengganti nama file secara batch dengan
template. Kebutuhan: Node.js >= 16.

### Ditambahkan

**Perintah & alur kerja**
- `read` — baca metadata EXIF & IPTC: kamera, lensa, software, artis, deskripsi,
  hak cipta, judul, kata kunci, keterangan, penulis, orientasi, eksposur,
  diafragma, ISO, panjang fokus, GPS, dimensi, ukuran file. Mendukung `--json`.
- `edit` — ubah metadata secara manual: `--date`, `--gps`, `--gps-alt`,
  `--gps-time`, `--remove-gps`, `--make`, `--model`, `--lens`, `--software`,
  `--artist`, `--copyright`, `--description`, `--orientation`, `--title`,
  `--keywords`, `--caption`, `--author`, `--touch`.
- `apply` — terapkan judul/deskripsi & kata kunci secara batch dari file daftar
  `title.txt` & `keyword.txt` (baris/kelompok ke-N dipetakan ke foto ke-N).
- `auto` (alias `process`, default saat perintah dikosongkan / `npm start`) —
  satu langkah: terapkan `title.txt` & `keyword.txt` ke foto di folder `foto/`
  lalu rename file sesuai judulnya.
- `strip` — hapus semua metadata (EXIF + IPTC + XMP pada JPEG; eXIf pada PNG).
- `rename` — rename batch dengan template, dry-run secara default, `--apply`
  untuk mengeksekusi, `--start N` untuk indeks awal.
- `selftest` — pengujian internal terintegrasi (round-trip EXIF/IPTC/template).

**Metadata EXIF (JPEG & PNG)**
- Parser & serializer TIFF/EXIF manual (`src/exif.js`): IFD0, ExifIFD, GPS IFD,
  Interop IFD, IFD1 + thumbnail (dipertahankan saat round-trip).
- Preservasi endianness (`II`/`MM`), tag bertipe tak dikenal (disimpan mentah),
  penanganan terminator `\0` pada ASCII.
- GPS lengkap: lintang/bujur, ketinggian, tanggal & waktu GPS.

**Metadata IPTC (JPEG, segmen APP13 "Photoshop 3.0")**
- `src/iptc.js`: judul (2:05), kata kunci (2:25), keterangan (2:78), penulis (2:50)
  dengan deklarasi charset UTF-8 (Record 1 Dataset 0x5A, `ESC%G`).
- Resource 8BIM lain (thumbnail 0x0409, ResolutionInfo 0x0405, dll.)
  **dipertahankan** saat mengedit IPTC.
- Penghapusan field: `--title ""` / `--keywords ""`; bila semua field kosong dan
  tidak ada resource lain, segmen APP13 dibuang seluruhnya.
- PNG: field IPTC diselaraskan ke tag EXIF `ImageDescription` (fallback).

**Format file daftar (`title.txt` & `keyword.txt`)**
- `title.txt`: satu judul per baris (baris kosong diabaikan) → Judul + Deskripsi.
- `keyword.txt`: satu kata kunci per baris **atau** dipisah koma dalam satu baris;
  **baris kosong = pemisah kelompok** per foto (parser murni
  `utils.parseKeywordGroups()`).
- Jumlah baris/kelompok **tidak wajib sama** dengan jumlah foto (bukan error):
  daftar lebih pendek → file sisanya dilewati dengan peringatan; `title.txt` lebih
  panjang → baris berlebih diabaikan; `keyword.txt` lebih panjang → peringatan.
- Pengurutan file dengan *numeric natural sort* (`localeCompare(..., { numeric: true })`).

**Rename batch**
- Token template: `{name} {ext} {folder} {make} {model} {lens} {artist}
  {copyright} {description} {software} {title} {keywords} {width} {height}
  {seq} {seq:N} {date} {date:FORMAT}`.
- `{date}` default `YYYY-MM-DD_HHmmss` (dari EXIF, fallback ke tanggal file).
- Sanitasi nama Windows (`sanitizeName()`), anti-bentrok (`ensureUniqueTarget()`
  → `_1`, `_2`, ...), fallback ke nama asli bila token menghasilkan kosong.
- Ekspansi argumen: file tunggal, glob (`*`/`?`), atau direktori.

**Lainnya**
- Dukungan `--no-color` / variabel lingkungan `NO_COLOR`.
- `imgmeta.cmd` peluncur Windows; folder kerja `foto/`.
- File contoh `title.txt` & `keyword.txt` di root project.
- `src/tinyjpeg.js` — encoder JPEG minimal (khusus pengujian).

### Diubah

- **Perilaku backup**: `edit`/`strip`/`auto` secara default **tidak** membuat
  cadangan `.bak`; cadangan hanya dibuat saat `--no-backup=false` diberikan
  secara eksplisit.
- **No-op edit**: bila tidak ada perubahan nyata, file **tidak** ditulis ulang dan
  tidak ada `.bak` yang dibuat.
- **`strip`** kini menghapus EXIF + IPTC + XMP sekaligus (sebelumnya hanya EXIF).
- Sortir daftar file pada `apply`/`auto` memakai *numeric natural sort*.
- `collectIptcEdits()` menerima array kata kunci langsung (koma di dalam satu
  keyword tidak terpecah).

### Dihapus

- Tampilan baris tanggal ("Tanggal asli", "Tanggal digital", "Tanggal file")
  dari output perintah `read` — fitur `--date`, token `{date}`, dan field tanggal
  di `--json` tetap dipertahankan.
- Kode mati (pembersihan internal, tidak mengubah perilaku):
  - `fmtRational()` di `src/exif.js` (tergantikan helper lokal di `cli.js`)
  - `extractTiff()` di `src/jpeg.js` & `src/png.js` (tidak pernah dipakai)
  - `ok()` dan `dim()` di `src/utils.js`
  - Konstanta EXIF tak terpakai: `OffsetTimeOriginal` (0x9011), `ExposureBias`
    (0x9204), `Flash` (0x9209)
  - Field tampilan `flash` & `gps.timeStamp` di `buildExifView()` (tidak pernah
    ditampilkan; tag GPS `TimeStamp` asli tetap dipertahankan saat round-trip)
  - Blok `if` kosong di `editFile()` (`src/meta.js`)

### Diperbaiki

- **Dukungan Metadata Adobe XMP (`dc:subject` untuk Adobe Stock)**: Mengimplementasikan penyisipan paket XML **Adobe XMP** (`XML:com.adobe.xmp` pada PNG / APP1 XMP `http://ns.adobe.com/xap/1.0/` pada JPEG) dengan skema Dublin Core `<dc:subject><rdf:Bag><rdf:li>...` untuk kata kunci. Ini memecahkan masalah di mana pengunggah Adobe Stock Contributor membaca Judul dari EXIF `ImageDescription` namun membutuhkan XMP `dc:subject` untuk otomatis mengisi kotak Keywords pada file PNG dan JPEG.
- **Penguncian Urutan File (`sortFilesByTitles`)**: Menggunakan pencocokan metadata judul saat `auto` / `apply` dijalankan ulang, sehingga baris judul dan kelompok kata kunci ke-N dari `title.txt` & `keyword.txt` tetap terkunci ke foto ke-N dan tidak tertukar acak.
- **Pencegahan Bentrok Palsu (`_1`) & Two-Pass Batch Rename**: Mengimplementasikan *Two-Pass Rename* (menggunakan file sementara `.tmp_imgmeta_...`) dan mengecualikan seluruh file sumber batch dari pemeriksaan disk `ensureUniqueTarget()`. Penamaan ulang berulang (*regenerate*) tidak lagi menghasilkan akhiran `_1` akibat bentrok palsu dengan nama file lama yang belum di-rename. Jika terjadi bentrok nama target yang benar-benar ganda, penomoran unik menggunakan format standar ` (2)`, ` (3)` dst.
- **Penyelarasan Pengurutan & Rename PNG**: Menggunakan *numeric natural sort* (`localeCompare(..., { numeric: true })`) untuk pengurutan file `auto`/`apply`, serta memperbaiki *fallback* penamaan pada `buildName()` agar template `{title}` pada file tanpa title tidak menghasilkan nama ekstensi kosong (`.png`).
- **Restorasi Ekstensi Gambar**: Helper `isImageFilename()` dan `buildName()` kini otomatis merestorasi dan mengenali ekstensi gambar hasil pemotongan nama.
- Edit IPTC tidak lagi menghapus resource 8BIM non-IPTC (thumbnail Photoshop,
  ResolutionInfo, dll.).
- `--title ""` / `--keywords ""` kini benar-benar menghapus field IPTC (termasuk
  field terakhir).
- Keyword yang mengandung koma (mis. `Bromo, Jawa Timur`) tidak lagi terpecah
  menjadi dua saat dipakai lewat perintah `apply`.
- Review menyeluruh: seluruh parser & serializer manual (JPEG, PNG, TIFF/EXIF,
  IPTC IIM 8BIM) terverifikasi round-trip oleh selftest (48 kasus).

## Riwayat Pengembangan (urutan fitur yang dibangun)

1. Basis CLI: `read`/`edit`/`strip`/`rename`/`selftest` untuk EXIF (JPEG & PNG),
   glob, sanitasi & anti-bentrok nama.
2. Dukungan **IPTC** (judul/kata kunci/keterangan/penulis) + preservasi resource
   8BIM; `strip` diperluas ke IPTC & XMP.
3. Perintah **`apply`** dengan file rujukan `title.txt` & `keyword.txt`.
4. Format `keyword.txt` diubah: satu kata kunci per baris, baris kosong sebagai
   pemisah kelompok per foto.
5. Perintah **`auto`** (`npm start`) + perubahan perilaku backup default.
6. Dukungan tag EXIF Windows (`XPKeywords`, `XPTitle`, `XPComment`, `XPAuthor`) & *fallback* metadata PNG.
7. Pembersihan kode mati & penyelarasan dokumentasi (`README.md`, `AGENTS.md`, `CHANGELOG.md`).
