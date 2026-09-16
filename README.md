# imgmeta v1.2.0-dev — Metadata Engine, Vector SVG Converter & Batch Rename (SQLite Powered)

CLI & Web Engine untuk **membaca & mengubah metadata foto & vektor (EXIF, IPTC & XMP pada .jpeg, .jpg, .png, .svg, .eps)**, **mengonversi PNG/gambar ke JPEG standar microstock**, **mentracing gambar raster ke vektor SVG berkualitas tinggi (`@visioncortex/vtracer`)**, **membaca metadata berkas vektor SVG & EPS**, **menyimpan data preset judul & kata kunci di database SQLite (`node:sqlite` bawaan)**, dan **mengganti nama file secara batch** menggunakan template.

> 💡 **Dokumentasi Lengkap di Folder `docs/`**:
> - [Panduan Struktur Folder](docs/STRUKTUR_FOLDER.md) — Penjelasan detail arsitektur berkas & direktori.
> - [Analisis Arsitektur & Master Prompt](docs/ANALISA.md) — Bedah teknis mendalam dan panduan replikasi.
> - [Changelog](docs/CHANGELOG.md) — Riwayat pembaruan dan catatan rilis versi.

---

## Fitur Utama

- 📐 **Engine Tracing & Ekspor Vektor SVG (`src/vector.js`)**: Konversi otomatis berkas raster (PNG/JPEG) menjadi vektor SVG berkualitas tinggi berbasis WebAssembly `@visioncortex/vtracer`. Dilengkapi profil preset kurasi microstock (`microstock`, `flat`, `pixel`, `photo`, `bw`), struktur layer `cutout` (bebas tumpukan kurva ganda), kontrol simplifikasi node (anchor points), filter speckle, dan penyematan metadata Dublin Core RDF (`<dc:title>`, `<dc:description>`, `<dc:creator>`, `<dc:subject>`).
- 🔍 **Pembaca Metadata Vektor SVG & EPS Zero-Dependency (`src/svg.js` & `src/eps.js`)**: Parser XML SVG dan PostScript EPS murni Node.js untuk membaca dimensi fisik (`width`, `height`, `viewBox`, `BoundingBox`), software generator, serta tag metadata `<title>`, `<desc>`, DSC comments, dan Adobe XMP Dublin Core dari berkas `.svg` dan `.eps` melalui CLI `read` dan Web UI.
- 🖼️ **Engine Export JPEG Native (`src/image.js`)**: Decoder PNG murni & Encoder JPEG baseline berkecepatan tinggi (**Fast AAN FDCT 8x8**) untuk konversi masal gambar PNG ke JPEG JFIF beresolusi tinggi (hingga 16MP+) lengkap dengan injeksi metadata EXIF, IPTC, dan Adobe XMP Dublin Core.
- 💾 **Database SQLite Bawaan (`src/db.js`)**: Menggunakan modul standar `node:sqlite` (`DatabaseSync` Node.js >= 22) untuk menyimpan preset judul & kata kunci, riwayat eksekusi batch, dan template rename di `imgmeta.db`.
- 🌐 **Web UI Interaktif (Industrial Minimalism)**: Antarmuka grafis browser yang bersih dan responsif sesuai spesifikasi [DESIGN.md](DESIGN.md). Dilengkapi **Grid SQLite Editor**, modal **Pengaturan Parameter Vektor** (slider simplifikasi, speckle, warna, layer cutout/stacked), tombol 1-klik **Export ke JPEG** & **Export ke Vektor SVG**, pemilih subfolder, live preview tabel/grid kartu gambar, dan eksekusi batch.
- 🚀 **Zero-Dependency Core Parser**: Seluruh parser & serializer biner (JPEG, PNG [termasuk zTXt & iTXt kompresi], TIFF/EXIF, IPTC IIM 8BIM, Adobe XMP Dublin Core, SVG XML reader, EPS DSC/XMP parser), SQLite engine, Image converter, dan HTTP server Web UI ditulis murni tanpa pustaka pihak ketiga.
- 📷 **Metadata EXIF, IPTC & XMP Lengkap (Microstock Compliant)**:
  - Kompatibel penuh dengan standar Adobe Stock, Shutterstock, & Freepik (`<dc:subject>`, `<dc:title>`, IPTC Dataset 2:05/2:25/2:120/2:80, EXIF IFD0 `XPKeywords`/`XPTitle`/`ImageDescription`).
- ⚡ **Proses Otomatis (`auto` / `npm start`)**: Sekali perintah untuk menerapkan metadata dari database SQLite (atau file daftar) sekaligus mengganti nama file foto di folder `foto/` sesuai judulnya.
- 🗄️ **Manajemen Database CLI (`db`)**: Subperintah `list`, `show`, `add`, `import`, `export`, `clear`, dan `delete` untuk mengelola preset metadata SQLite langsung dari terminal.
- 🏷️ **Rename Batch Berbasis Template (`rename`)**: Mengubah nama file secara masal dengan token dinamis `{title}`, `{keywords}`, `{artist}`, `{make}`, `{model}`, `{lens}`, `{date}`, `{date:FORMAT}`, `{seq}`, `{seq:N}`, `{folder}`, `{name}`, `{ext}`.
- 🔒 **Sanitasi & Two-Pass Batch Rename**: Pembersihan otomatis karakter ilegal Windows/Linux, strategi *Two-Pass Rename* untuk mencegah bentrok palsu dengan nama file lama saat generate ulang.
- 🛡️ **Pembersihan Metadata Privasi (`strip`)**: Menghapus seluruh metadata sensitif (EXIF, IPTC, XMP) dari foto dan vektor.
- 📋 **Log Kegagalan & Riwayat Batch**: Setiap kegagalan operasi dicatat ke **`imgmeta.log`** dan tersimpan di riwayat database SQLite.
- 🧪 **Pengujian Internal Terintegrasi (`selftest`)**: Rangkaian 125 pengujian mandiri (*round-trip* EXIF, IPTC, XMP, PNG zTXt/iTXt, EPS ASCII/Binary, JPEG encoder/decoder, VTracer SVG converter, SVG metadata reader, template rename, & SQLite).

---

## Cara Menjalankan

Pastikan [Node.js](https://nodejs.org) (versi 22 atau lebih baru) sudah terpasang.

```bash
npm run web                   # jalankan Web UI di browser (http://localhost:3000)
npm start                     # 1 langkah CLI: terapkan metadata SQLite (preset default) + rename foto di folder foto/
npm run selftest              # jalankan pengujian internal
```

Di Windows, bisa juga menggunakan `imgmeta.cmd`:

```bash
imgmeta.cmd read foto.jpg
```

---

## Folder Foto Kerja (`foto/`)

Folder **`foto/`** di root project adalah tempat meletakkan foto yang akan diproses.

```bash
node index.js auto                               # proses otomatis foto di folder foto/
```

---

## Perintah Utama CLI

### 1. Manajemen Database SQLite (`db`)

```bash
# Tampilkan daftar preset di SQLite:
node index.js db list

# Tampilkan entri judul & kata kunci dalam preset:
node index.js db show default

# Tambah 1 entri ke preset:
node index.js db add default --title "Dokter Ramah di Rumah Sakit" --keywords "dokter, medis, rumah sakit"

# Impor dari file teks ke SQLite:
node index.js db import default --titles title.txt --keywords keyword.txt

# Ekspor dari SQLite ke file teks:
node index.js db export default --titles title.txt --keywords keyword.txt

# Kosongkan isi preset:
node index.js db clear default
```

### 2. Proses Otomatis (`auto`)

Secara otomatis menerapkan metadata dari database SQLite (preset `default`) dan mengganti nama file sesuai judulnya:

```bash
npm start
# atau: node index.js auto "foto/*.jpg" [--preset default]
```

### 3. Terapkan Metadata (`apply`)

```bash
# Menggunakan preset SQLite:
node index.js apply "foto/*.jpg" --preset default

# Atau menggunakan file teks langsung:
node index.js apply "foto/*.jpg" --titles title.txt --keywords-file keyword.txt [--no-backup]
```

#### Format File Teks Warisan (`title.txt` & `keyword.txt`):
* **`title.txt`**: Satu judul per baris (baris kosong diabaikan otomatis). Baris ke-N akan dipetakan ke foto ke-N.
* **`keyword.txt`**: Kata kunci per foto, di mana **baris kosong berfungsi sebagai pemisah kelompok foto** (kelompok ke-N ↔ foto ke-N). Kata kunci dalam satu kelompok foto dapat ditulis:
  * **Dipisahkan koma dalam 1 baris**: `doctor, hospital, healthcare icon`
  * **Atau 1 kata kunci per baris**:
    ```text
    doctor
    hospital

    nurse
    clinic
    ```

### 4. Konversi & Export ke JPEG (`export-jpeg`)

Mengonversi file gambar (PNG / JPEG) ke JPEG baseline berkualitas tinggi dengan menyematkan metadata EXIF, IPTC, dan Adobe XMP Dublin Core secara otomatis:

```bash
# Export seluruh PNG di folder foto/ ke JPEG dengan kualitas 90%:
node index.js export-jpeg "foto/*.png" --preset default

# Export dengan kualitas khusus dan folder tujuan:
node index.js export-jpeg "foto/*.png" --quality 95 --preset default --out-dir output_jpeg
```

### 5. Tracing & Export ke Vektor SVG (`export-vector`)

Mengonversi file gambar raster (PNG / JPEG) menjadi vektor SVG berkualitas tinggi berbasis WebAssembly `@visioncortex/vtracer` dengan berbagai profil kurasi microstock serta penyematan metadata Dublin Core / Adobe XMP secara otomatis:

```bash
# Export seluruh PNG di folder foto/ ke SVG dengan profil standar microstock:
node index.js export-vector "foto/*.png" --profile microstock --preset default

# Export dengan parameter presisi kustom (simplifikasi kurva, batas warna, struktur layer cutout):
node index.js export-vector "foto/*.png" --profile microstock --simplify 1.5 --max-colors 32 --hierarchical cutout --out-dir output_svg

# Pilihan profil yang tersedia:
# --profile microstock  : Rekomendasi Adobe Stock / Shutterstock (spline, cutout, simplify 1.5, max 32 warna)
# --profile flat        : Ilustrasi datar / clipart kontras tinggi (spline, stacked, max 16 warna)
# --profile pixel       : Vektorisasi pixel art 1:1 tanpa kurva membulat (pixel, cutout)
# --profile photo       : Tracing detail tinggi mendekati foto asli (spline, presisi warna tinggi)
# --profile bw          : Monokrom 2 warna untuk stensil, logo, dan siluet
```

### 6. Baca Metadata Foto & Vektor (`read`)

Mendukung pembacaan metadata foto JPEG, PNG, maupun berkas vektor SVG & EPS:

```bash
node index.js read "foto/*.jpg"
node index.js read "foto/*.png"
node index.js read "foto/*.svg"
node index.js read "foto/*.eps"
node index.js read berkas.eps --json
```

### 7. Edit Metadata Manual (`edit`)

```bash
node index.js edit foto.jpg --date "2020-01-15 08:30:00" --artist "Budi" --title "Judul Foto" --keywords "bali, pantai"
```

### 8. Hapus Metadata Privasi (`strip`)

```bash
node index.js strip foto.jpg [--no-backup]
```

### 9. Rename Batch dengan Template (`rename`)

```bash
# Preview simulasi (dry-run):
node index.js rename "foto/*.jpg" --template "{date:YYYYMMDD}_{seq:3}"

# Eksekusi rename:
node index.js rename "foto/*.jpg" --template "{title}" [--preset default] --apply
```

### 10. Pengujian Internal (`selftest`)

```bash
npm run selftest
# atau: node index.js selftest
```

Menjalankan 105 pengujian round-trip EXIF, IPTC, XMP, PNG, JPEG decoding & Fast AAN FDCT encoding, konversi vektor VTracer, pembacaan metadata SVG, template rename, penanganan bentrok nama, dan operasi database SQLite.

### 11. Log Kegagalan (`imgmeta.log`)

Setiap kegagalan operasi dicatat secara otomatis ke **`imgmeta.log`** di folder tempat perintah dijalankan (mode *append* — riwayat kegagalan sebelumnya tidak ditimpa):

```text
[2026-09-15 14:30:22] [rename] foto/liburan.jpg — tidak dapat dibaca: ENOENT...
[2026-09-15 14:30:25] [edit] foto/rusak.jpg — Format tidak didukung: ...
```

Di akhir setiap perintah, ringkasan log kegagalan langsung ditampilkan di layar (*"Log kegagalan: tidak ada error"* bila bersih).

---

## Struktur Proyek

```
METADATA/
├── index.js                  # Entry point CLI (mengeksekusi src/cli.js)
├── imgmeta.cmd               # Peluncur cepat untuk lingkungan Windows CMD / PowerShell
├── imgmeta.db                # Database SQLite lokal (presets, items, history, templates)
├── imgmeta.log               # Log kegagalan operasi batch
├── package.json              # Konfigurasi npm package (v1.2.0-dev, ESM murni)
├── README.md                 # Panduan umum pemakaian CLI & Web UI
├── AGENTS.md                 # Panduan aturan baku untuk AI Agent / Developer
├── docs/                     # Dokumentasi teknis & arsitektur
│   ├── STRUKTUR_FOLDER.md    # Panduan struktur direktori
│   ├── ANALISA.md            # Analisis arsitektur & master reference prompt
│   └── CHANGELOG.md          # Riwayat perubahan dan rilis versi
├── foto/                     # Folder kerja foto: tempat meletakkan file gambar
├── src/                      # Modul inti backend & parser metadata (ESM murni)
│   ├── cli.js                # Parser argumen CLI & handler perintah (auto, export-vector, export-jpeg, dll.)
│   ├── db.js                 # Modul SQLite bawaan Node.js (node:sqlite)
│   ├── server.js             # HTTP server murni Node.js (REST API & static server)
│   ├── vector.js             # Engine tracing raster-to-vector SVG (@visioncortex/vtracer WASM)
│   ├── svg.js                # Parser metadata berkas vektor SVG zero-dependency
│   ├── image.js              # Engine konversi PNG->JPEG & Fast AAN FDCT encoder
│   ├── jpeg.js               # Parser struktur segmen JPEG (APP1, APP13, XMP, SOF)
│   ├── png.js                # Parser chunk PNG (eXIf, iTXt, IHDR, CRC32)
│   ├── exif.js               # Parser & serializer TIFF/EXIF
│   ├── iptc.js               # Parser & serializer IPTC IIM Photoshop 8BIM
│   ├── meta.js               # Lapisan orkestrasi metadata (EXIF, IPTC, XMP, SVG)
│   ├── rename.js             # Batch renamer & generator template nama
│   ├── utils.js              # Utilitas warna ANSI, format byte, log failure
│   └── tinyjpeg.js           # Encoder JPEG 8x8 sintetis untuk pengujian
├── public/                   # Frontend antarmuka Web UI (Industrial Minimalism)
│   ├── index.html            # Markup HTML aplikasi Web UI
│   ├── style.css             # Desain Industrial Minimalism
│   └── app.js                # Logika frontend (SQLite Grid, Vector Settings, Live Preview, Modal)
├── test/                     # Pengujian internal & selftest
│   └── selftest.js           # Test suite round-trip (105 pengujian)
└── graphify-out/             # Output visualisasi knowledge graph /graphify
```

---

## Lisensi

MIT
