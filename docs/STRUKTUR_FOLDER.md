# Dokumentasi Struktur Folder & Arsitektur Direktori — IMGMETA v1.1.0

Dokumen ini menjelaskan struktur direktori, fungsi setiap berkas/folder, aliran data berkas foto, penyimpanan database SQLite, dan panduan kontribusi untuk aplikasi **imgmeta**.

---

## 1. Ikhtisar Hierarki Direktori

```
METADATA/
├── index.js                  # Entry point CLI (mengeksekusi src/cli.js)
├── imgmeta.cmd               # Peluncur cepat untuk lingkungan Windows CMD / PowerShell
├── imgmeta.db                # Database SQLite lokal (presets, items, history, templates)
├── imgmeta.log               # Log kegagalan operasi batch
├── package.json              # Konfigurasi npm package (v1.1.0, ESM murni, zero-dependency)
├── README.md                 # Panduan umum pemakaian CLI & Web UI
├── AGENTS.md                 # Panduan aturan baku untuk AI Agent / Developer
├── docs/                     # Dokumentasi arsitektur dan teknis
│   ├── STRUKTUR_FOLDER.md    # Dokumen ini: panduan struktur folder
│   ├── ANALISA.md            # Analisis arsitektur & master reference prompt
│   └── CHANGELOG.md          # Riwayat perubahan dan rilis versi
├── foto/                     # Folder kerja foto: tempat meletakkan file gambar input/output
│   ├── sample1.jpg
│   └── ...
├── src/                      # Modul inti backend & parser metadata (ESM murni)
│   ├── cli.js                # Parser argumen CLI & handler perintah (auto, export-jpeg, apply, db, edit, read, strip, rename)
│   ├── db.js                 # Modul SQLite bawaan Node.js (node:sqlite) — presets, items, history
│   ├── server.js             # HTTP server murni Node.js (REST API & static server Web UI)
│   ├── image.js              # Engine konversi PNG->JPEG & Fast AAN FDCT encoder dengan injeksi metadata
│   ├── jpeg.js               # Parser struktur segmen JPEG (APP1 EXIF, APP13 IPTC, APP1 XMP, SOF)
│   ├── png.js                # Parser chunk PNG (eXIf, tEXt, iTXt, IHDR, CRC32 manual)
│   ├── exif.js               # Parser & serializer TIFF/EXIF (IFD0, ExifIFD, GPS, IFD1/Thumbnail)
│   ├── iptc.js               # Parser & serializer IPTC IIM (Record 2 & APP13 Photoshop 3.0 8BIM)
│   ├── meta.js               # Lapisan orkestrasi metadata tingkat tinggi (readFileMeta, editFile, stripFile)
│   ├── rename.js             # Batch renamer, ekspansi file glob, dan generator template nama
│   ├── utils.js              # Utilitas warna ANSI, format byte/tanggal, sanitasi nama file, log failure
│   └── tinyjpeg.js           # Encoder JPEG grayscale 8x8 sintetis untuk unit testing
├── public/                   # Frontend antarmuka Web UI (Industrial Minimalism)
│   ├── index.html            # Markup HTML aplikasi Web UI
│   ├── style.css             # Desain Industrial Minimalism (Warm Monochrome Stone Palette)
│   └── app.js                # Logika interaktif frontend (SQLite Grid, Live Preview, Modal EXIF)
├── test/                     # Pengujian internal & selftest
│   └── selftest.js           # Test suite round-trip EXIF, IPTC, XMP, PNG, SQLite, & Rename
└── graphify-out/             # Output visualisasi knowledge graph dari pipeline /graphify
    ├── graph.html            # Visualisasi interaktif graf arsitektur
    ├── graph.json            # Data node dan relasi dependensi AST
    └── GRAPH_REPORT.md       # Laporan audit graf codebase
```

---

## 2. Penjelasan Rinci Folder & Komponen Utama

### `foto/` — Folder Kerja Gambar
- **Tujuan**: Direktori kerja default untuk meletakkan file foto (`.jpg`, `.jpeg`, `.png`, dll.) yang akan dibaca, diubah metadatanya, atau diganti namanya secara batch.
- **Aturan**:
  - Semua perintah otomatis (`npm start`, `node index.js auto`) secara default akan mencari dan memproses berkas gambar di dalam folder `foto/`.
  - Web UI secara otomatis memindai `foto/` dan subfolder di dalamnya sebagai target operasi.

### `src/` — Mesin Inti & Parser Metadata (Tanpa Dependensi Eksternal)
- **`src/db.js`**: Modul manajemen database SQLite lokal murni menggunakan `node:sqlite` (`DatabaseSync` standar Node.js >= 22). Bertanggung jawab atas penyimpanan tabel `presets`, `items`, `history`, dan `templates`, serta migrasi otomatis dari berkas teks warisan.
- **`src/cli.js`**: Pengurai argumen baris perintah (`parseArgs`) dan orkestrator seluruh subperintah (`web`, `auto`, `apply`, `db`, `read`, `edit`, `strip`, `rename`, `selftest`).
- **`src/server.js`**: HTTP Server murni Node.js tanpa Express/framework eksternal, menyediakan REST API untuk folder, file gambar, thumbnail stream, inspeksi metadata detail, CRUD SQLite, dan simulasi pratinjau rename.
- **`src/jpeg.js` & `src/png.js`**: Parser biner struktur JPEG (segmen SOI, APP1, APP13, SOF, EOI) dan PNG (chunk IHDR, eXIf, iTXt, IEND dengan CRC32 manual).
- **`src/exif.js` & `src/iptc.js`**: Jantung logika metadata TIFF/EXIF dan IPTC IIM Photoshop 3.0 8BIM. Menjaga endianness (`II`/`MM`), tag sorting IFD, thumbnail IFD1, dan encoding karakter UTF-8.
- **`src/meta.js`**: Lapisan integrasi yang menyatukan pembacaan EXIF, IPTC, dan Adobe XMP Dublin Core (`<dc:subject>`, `<dc:title>`) agar kompatibel 100% dengan Microstock (Adobe Stock, Shutterstock, Freepik).
- **`src/rename.js`**: Mesin pengganti nama berkas batch dengan template token (`{title}`, `{date}`, `{seq:3}`, `{artist}`, `{make}`, dll.) menggunakan strategi *Two-Pass Rename* anti-bentrok.
- **`src/utils.js`**: Utilitas format biner, sanitasi karakter nama Windows (`< > : " / \ | ? *`), pencatatan log kegagalan ke `imgmeta.log`, dan pengelompokan kata kunci.
- **`src/tinyjpeg.js`**: Generator berkas JPEG 8x8 sintetis dalam memori yang digunakan khusus untuk keperluan pengujian internal.

### `public/` — Antarmuka Pengguna Web (Industrial Minimalism)
- **`index.html`**: Halaman tunggal interaktif yang memuat panel folder target, editor grid SQLite, editor teks judul & kata kunci, kontrol eksekusi, pratinjau pemetaan live, modal inspeksi EXIF/GPS, dan konsol log aktivitas.
- **`style.css`**: Sistem desain *Industrial Minimalism* dengan palet warna monokrom hangat (*stone*), kontras tinggi, batas sudut tajam (*sharp edges*), dan tipografi teknis (*IBM Plex Mono* & *Inter*).
- **`app.js`**: Logika interaktif sisi peramban yang menangani komunikasi AJAX REST API, live preview real-time dengan debounce, manipulasi inline tabel SQLite, penyalinan teks sekali klik, dan rendering modal.

### `test/` — Unit Testing & Selftest
- **`selftest.js`**: Rangkaian pengujian terintegrasi tanpa dependensi (dipanggil via `npm run selftest` atau `node index.js selftest`) yang menguji parsing JPEG, PNG, EXIF round-trip, IPTC 8BIM, XMP fallback, penamaan template, penanganan bentrok nama, dan operasi database SQLite.

### `graphify-out/` — Knowledge Graph Arsitektur
- Dihasilkan oleh pipeline visualisasi `/graphify` untuk menganalisis relasi modul, dependensi fungsi, dan god nodes dalam codebase.

---

## 3. Aliran Data & Siklus Operasi

```
                 +--------------------------+
                 |    File Input Gambar     |
                 |       (foto/*.jpg)       |
                 +------------+-------------+
                              |
                              v
                 +--------------------------+
                 |      src/meta.js         |
                 | (baca EXIF, IPTC, XMP)   |
                 +------------+-------------+
                              |
        +---------------------+---------------------+
        |                                           |
        v                                           v
+---------------+---------------+           +---------------+---------------+
|      CLI (src/cli.js)         |           |     Web UI (src/server.js)    |
| - auto / apply / rename       |           | - Live Preview & Table Grid   |
| - db (SQLite CRUD)            |           | - Preset & History Manager    |
+---------------+---------------+           +---------------+---------------+
        |                                           |
        +---------------------+---------------------+
                              |
                              v
                 +--------------------------+
                 |  Database SQLite Lokal   |
                 |       (imgmeta.db)       |
                 | - presets & items        |
                 | - history & templates    |
                 +--------------------------+
```

---

## 4. Aturan Penempatan & Kebersihan Berkas

1. **JANGAN menambah dependensi npm eksternal** ke `package.json`. Semua fungsionalitas harus menggunakan pustaka standar Node.js (`node:fs`, `node:path`, `node:sqlite`, `node:http`, dll.).
2. Letakkan file foto yang akan diproses di dalam folder `foto/` atau subfolder turunannya.
3. Database SQLite (`imgmeta.db`) dan log kegagalan (`imgmeta.log`) dibuat otomatis di root workspace saat pertama kali aplikasi dijalankan.
