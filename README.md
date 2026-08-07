# imgmeta — Ubah Metadata Foto & Rename File

CLI (aplikasi baris perintah) untuk **membaca & mengubah metadata foto** dan
**mengganti nama file secara batch** menggunakan template. Dibangun dengan
**Node.js murni tanpa dependensi** — cukup jalankan, tanpa perlu `npm install`.

> Catatan: Metadata **EXIF** (kamera, tanggal, GPS, dll.) didukung untuk file
> **JPEG** (`.jpg` / `.jpeg`) dan **PNG** (`.png`). Metadata **IPTC** (judul, kata kunci,
> keterangan, penulis) didukung untuk file **JPEG** dan diselaraskan ke EXIF `ImageDescription` untuk **PNG**. File gambar lain tetap bisa di-rename.

## Fitur Utama

- 🚀 **Tanpa Dependensi Eksternal**: Node.js ESM murni (`>= 16`). Seluruh parser & serializer (JPEG, PNG, TIFF/EXIF, IPTC IIM 8BIM) ditulis manual tanpa pustaka pihak ketiga.
- 📷 **Metadata EXIF & IPTC Lengkap**:
  - **EXIF**: Kamera (`Make`, `Model`), Lensa (`LensModel`), Software, Tanggal (`DateTimeOriginal`, `DateTimeDigitized`), Hak Cipta, Artis, Deskripsi (`ImageDescription`), Orientasi, dan Koordinat GPS (`Lat`, `Lon`, `Alt`, `DateStamp`, `TimeStamp`).
  - **IPTC**: Judul (2:05), Kata Kunci (2:25), Keterangan/Deskripsi (2:120), Penulis (2:80) dengan dukungan charset UTF-8 (Record 1 Dataset 0x5A).
- ⚡ **Proses Otomatis (`auto` / `npm start`)**: Sekali perintah untuk menerapkan judul & kata kunci dari file daftar (`title.txt` & `keyword.txt`) sekaligus mengganti nama file foto di folder `foto/` sesuai judulnya.
- 📝 **Terapkan Metadata dari File Daftar (`apply`)**: Memetakan baris `title.txt` dan kelompok kata kunci `keyword.txt` (dipisahkan baris kosong) secara akurat ke foto yang diurutkan secara alami (*numeric natural sort*).
- 🏷️ **Rename Batch Berbasis Template (`rename`)**: Mengubah nama file secara masal dengan token dinamis `{title}`, `{keywords}`, `{artist}`, `{make}`, `{model}`, `{lens}`, `{date}`, `{date:FORMAT}`, `{seq}`, `{seq:N}`, `{folder}`, `{name}`, `{ext}`.
- 🔒 **Sanitasi & Anti-Bentrok Nama File**: Pembersihan otomatis karakter ilegal Windows/Linux, penanganan konflik nama (*anti-collision* `_1`, `_2`), serta *fallback* nama asli jika judul kosong.
- 🛡️ **Pembersihan Metadata Privasi (`strip`)**: Menghapus seluruh metadata sensitif (EXIF, IPTC, XMP) dari foto.
- 🧪 **Pengujian Internal Terintegrasi (`selftest`)**: Pengujian mandiri untuk memverifikasi integritas pembacaan, penulisan, dan serialisasi metadata secara *round-trip*.
- 📊 **Output JSON & Mode Simulasi**: Dukungan format JSON untuk pembacaan metadata (`read --json`) dan mode simulasi (*dry-run*) untuk perintah rename.

## Cara Menjalankan

Pastikan [Node.js](https://nodejs.org) (versi 16 atau lebih baru) sudah terpasang.

```bash
npm start                     # 1 langkah: terapkan metadata + rename foto di folder foto/
npm run selftest              # jalankan pengujian internal
```

Di Windows, bisa juga menggunakan `imgmeta.cmd`:

```bash
imgmeta.cmd read foto.jpg
```

## Folder Foto Kerja (`foto/`)

Folder **`foto/`** di root project adalah tempat meletakkan foto yang akan diproses.

```bash
node index.js auto                               # proses otomatis foto di folder foto/
```

## Perintah Utama

### 1. Proses Otomatis (`auto`)

Secara otomatis menerapkan judul & deskripsi dari `title.txt`, kata kunci dari `keyword.txt`, dan mengganti nama file sesuai judulnya:

```bash
npm start
# atau: node index.js auto "foto/*.png"
```

#### Format File Daftar (`title.txt` & `keyword.txt`):
* **`title.txt`**: Satu judul per baris (baris kosong diabaikan otomatis). Baris ke-N akan dipetakan ke foto ke-N.
* **`keyword.txt`**: Kata kunci per foto, di mana **baris kosong berfungsi sebagai pemisah kelompok foto** (kelompok ke-N ↔ foto ke-N). Kata kunci dalam satu kelompok foto dapat ditulis:
  * **Dipisahkan koma dalam 1 baris**: `bad news, phone call, mouth closeup`
  * **Atau 1 kata kunci per baris**:
    ```text
    bad news
    phone call

    anxiety
    panic attack
    ```

### 2. Terapkan Metadata dari File Daftar (`apply`)

```bash
node index.js apply "foto/*.jpg" --titles title.txt --keywords-file keyword.txt [--no-backup]
```

### 3. Baca Metadata (`read`)

```bash
node index.js read "foto/*.jpg"
node index.js read foto.png --json
```

### 4. Edit Metadata Manual (`edit`)

```bash
node index.js edit foto.jpg --date "2020-01-15 08:30:00" --artist "Budi" --title "Judul Foto" --keywords "bali, pantai"
```

### 5. Hapus Metadata Privasi (`strip`)

```bash
node index.js strip foto.jpg [--no-backup]
```

### 6. Rename Batch dengan Template (`rename`)

```bash
# Preview simulasi (dry-run):
node index.js rename "foto/*.jpg" --template "{date:YYYYMMDD}_{seq:3}"

# Eksekusi rename:
node index.js rename "foto/*.jpg" --template "{title}" --apply
```

### 7. Pengujian Internal (`selftest`)

```bash
node index.js selftest
```


## Struktur Proyek

```
index.js            Entry point
imgmeta.cmd         Peluncur untuk Windows
foto/               Folder kerja: letakkan foto yang akan diproses di sini
AGENTS.md           Panduan untuk AI agent & kontributor
src/
  cli.js            Parsing argumen & perintah
  jpeg.js           Parser struktur JPEG (segmen, APP1/APP13, dimensi)
  png.js            Parser & serializer chunk PNG (eXIf, IHDR, CRC32)
  exif.js           Parser & serializer EXIF/TIFF
  iptc.js           Parser & serializer IPTC (judul, kata kunci, keterangan, penulis)
  meta.js           Operasi baca/edit/strip metadata
  rename.js         Rename batch + template
  tinyjpeg.js       Encoder JPEG minimal (untuk pengujian)
  utils.js          Utilitas (tanggal, glob, sanitasi nama, warna)
test/
  selftest.js       Pengujian internal (round-trip EXIF & template)
```

## Pengujian

```bash
node index.js selftest
```

Menjalankan pengujian round-trip: menyisipkan metadata EXIF & IPTC, membaca
ulang, mengubah tanggal, menghapus metadata, dan memverifikasi template rename.

## Lisensi

MIT
