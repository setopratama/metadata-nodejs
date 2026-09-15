# Analisis Proyek, Tech Stack & Referensi Prompt Duplikasi (`imgmeta`)

Dokumen ini memuat analisis arsitektur mendalam, spesifikasi *tech stack*, serta *master reference prompt* siap pakai untuk mereproduksi atau menduplikasi proyek **imgmeta** dari awal secara identik.

---

## 1. Analisis Arsitektur & Logika Proyek

### A. Filosofi & Nilai Jual Utama (Unique Selling Points)

1. **Zero External Dependencies (100% Native Node.js)**
   - Tidak menggunakan *library* pihak ketiga (`dependencies: {}`, `devDependencies: {}`).
   - Tidak bergantung pada *tool* eksternal seperti `exiftool`, `sharp`, `piexifjs`, atau `glob`.
   - Seluruh *parser*, *serializer*, dan *injector* format biner (JPEG, PNG, TIFF/EXIF, IPTC IIM Photoshop 8BIM, Adobe XMP, dan tabel bitwise CRC32) dibangun manual dari nol menggunakan API native Node.js `Buffer`.

2. **Kesesuaian Agensi Microstock (Adobe Stock / Shutterstock / Freepik)**
   - Saat memasukkan judul (*Title*), kata kunci (*Keywords*), deskripsi (*Caption/Description*), dan pembuat (*Author*), metadata diselaraskan serentak ke 3 lapisan:
     - **IPTC IIM**: Segmen APP13 Photoshop 8BIM (ID `0x0404`), Record 2 (Dataset `0x05`, `0x19`, `0x78`, `0x50`) dengan deklarasi charset UTF-8 (Record 1 Dataset `0x5A`, escape sequence `\x1b%G`).
     - **EXIF IFD0**: Tag standar `ImageDescription` (`0x010E`) dan Tag XP Windows (`XPTitle` `0x9C9B`, `XPKeywords` `0x9C9E`, `XPComment` `0x9C9C`, `XPAuthor` `0x9C9D`) dalam format UCS-2 / UTF-16LE.
     - **Adobe XMP Packet**: Segmen APP1 JPEG (`http://ns.adobe.com/xap/1.0/\0`) & chunk PNG `iTXt` (`XML:com.adobe.xmp`) memuat RDF XML Dublin Core `<dc:subject><rdf:Bag>` & `<dc:title><rdf:Alt>`.
   - Menjamin 100% metadata terdeteksi secara otomatis di portal pengunggah microstock tanpa perlu input manual.

3. **Penyusunan & Penggantian Nama Aman (Two-Pass Batch Rename)**
   - Menggunakan strategi *Two-Pass Rename* dengan file penampung sementara (`.tmp_imgmeta_[timestamp]_[index][ext]`). Hal ini mencegah terjadinya bentrok palsu atau *deadlock* penamaan pada sistem file *case-insensitive* (seperti Windows).
   - Penanganan bentrok target nyata dengan suffix penomoran standar ` (2)`, ` (3)`.
   - Sanitasi otomatis karakter ilegal Windows/Linux (`< > : " / \ | ? *`) dan *fallback* ke nama file asli jika token `{title}` kosong.

4. **Penyortiran Cerdas Berbasis Judul (`sortFilesByTitles`)**
   - File dipetakan ke baris `title.txt` dan kelompok `keyword.txt`.
   - Jika sebuah file foto sudah memiliki metadata judul yang cocok dengan salah satu baris di `title.txt`, file tersebut dikunci pada indeks baris tersebut agar susunan foto tidak bergeser atau tertukar saat di-*generate* ulang. File sisanya diurutkan secara alami (*numeric natural sort*).

5. **Pengujian Mandiri Terintegrasi Tanpa Aset Eksternal (`selftest`)**
   - Memiliki encoder JPEG *grayscale* 8x8 minimalis bawaan (`src/tinyjpeg.js`) dan generator header PNG 16x16 minimalis.
   - Pengujian *round-trip* (baca -> edit -> tulis -> verifikasi -> hapus) dapat dijalankan langsung di lingkungan *fresh clone* tanpa memerlukan sampel foto fisik di *repository*.

6. **Pencatatan Log Kegagalan Otomatis**
   - Setiap error (rename, edit, apply, strip, parser) dicatat otomatis ke `imgmeta.log` (mode *append*) di folder kerja, lengkap dengan *timestamp* dan jenis operasi.
   - Ringkasan log ditampilkan di akhir sesi perintah terminal.

---

### B. Struktur File & Pembagian Tanggung Jawab

```text
index.js            Entry point CLI; memanggil run(process.argv.slice(2))
imgmeta.cmd         Batch launcher untuk lingkungan Windows
foto/               Folder kerja default untuk file gambar yang akan diproses
CHANGELOG.md        Riwayat perubahan versi proyek
README.md           Dokumentasi pemakaian CLI
AGENTS.md           Aturan & invariant teknis untuk agen AI / kontributor
src/
  cli.js            Parsing argumen CLI (parseArgs), sub-command handlers, diff formatting
  jpeg.js           Parser segmen JPEG, dimensi SOF, injeksi/remove APP1, APP13, XMP
  png.js            Parser chunk PNG, CRC32 bitwise table, eXIf, iTXt uncompressed UTF-8
  exif.js           Engine TIFF/EXIF: IFD0, ExifIFD, GPS, Interop, IFD1, endianness, sort tag
  iptc.js           Photoshop APP13 8BIM & IPTC IIM parser/serializer, UTF-8 charset declaration
  meta.js           Orkestrasi metadata: applyEdits, buildXmpPacket, editFile, stripFile
  rename.js         Ekspansi glob/folder, generator template token, two-pass batch rename
  utils.js          Warna ANSI, format tanggal EXIF, sanitasi Windows, unique target, logFailure
  tinyjpeg.js       Encoder JPEG grayscale 8x8 sintetis khusus pengujian mandiri
test/
  selftest.js       Suite pengujian internal end-to-end (round-trip metadata & rename)
```

---

## 2. Tech Stack Specification

| Komponen | Spesifikasi & Rincian Teknis |
| :--- | :--- |
| **Runtime** | **Node.js** (versi `>= 16.0.0`) |
| **Module System** | **ESM Murni** (`"type": "module"`, skema import `node:*`) |
| **Dependencies** | **0 External Dependencies** (`"dependencies": {}`, `"devDependencies": {}`) |
| **Standard Libraries** | `node:fs` (sinkron: `readFileSync`, `writeFileSync`, `copyFileSync`, `renameSync`, `readdirSync`, `appendFileSync`), `node:path` |
| **Binary Processing** | Native Node.js `Buffer` (`readUInt16BE/LE`, `readUInt32BE/LE`, `subarray`, `Buffer.concat`, `Buffer.alloc`) |
| **Standar Format** | - **TIFF 6.0 / EXIF 2.3**: IFD0, ExifIFD, GPS IFD, Interop IFD, IFD1 (thumbnail).<br>- **IPTC IIM 4.1**: APP13 Photoshop 3.0 8BIM (ID 0x0404), Record 1 (Charset), Record 2 (Object Data).<br>- **Adobe XMP**: W3C RDF XML Packet (`<dc:subject><rdf:Bag>`, `<dc:title><rdf:Alt>`, `<dc:description>`, `<dc:creator>`).<br>- **PNG ISO/IEC 15948**: Chunks (`IHDR`, `eXIf`, `iTXt`, `tEXt`, `IEND`), Custom CRC32 Lookup Table. |
| **Encoding Support** | UTF-8, Latin1 (ISO-8859-1), UCS-2 / UTF-16LE (untuk EXIF XP Tags: `XPTitle`, `XPKeywords`, `XPComment`, `XPAuthor`). |
| **Platform Target** | Lintas platform (Windows, Linux, macOS) dengan optimasi khusus Windows (sanitasi nama file ilegal, peluncur `.cmd`). |

---

## 3. Master Prompt untuk Duplikasi Proyek

*Salin dan gunakan prompt di bawah ini ke sesi AI atau LLM lain untuk mereproduksi seluruh proyek ini dari nol secara identik:*

```markdown
Kamu adalah Software Engineer spesialis format biner, image processing, dan CLI tool. Buatlah aplikasi CLI Node.js murni (Zero External Dependencies) bernama `imgmeta` untuk membaca, mengedit, dan membersihkan metadata foto (JPEG & PNG), menyelaraskan metadata agar 100% kompatibel dengan microstock (Adobe Stock, Shutterstock, Freepik), serta melakukan batch rename berbasis template yang aman.

### 1. ATURAN ARSITEKTUR WAJIB (NON-NEGOTIABLE)
1. **0 Dependensi Eksternal**: DILARANG menggunakan `npm install` atau library pihak ketiga apapun (dilarang menggunakan `sharp`, `exiftool`, `piexifjs`, `glob`, `xml2js`, dsb). Gunakan HANYA modul native Node.js: `node:fs`, `node:path`, dan `Buffer`.
2. **Runtime & Modul**: Node.js >= 16 dengan ECMAScript Modules (`"type": "module"` di `package.json`).
3. **Bahasa Dokumentasi & Komentar**: Bahasa Indonesia yang ringkas dan profesional.
4. **Karakter Biner**: Penanganan biner langsung menggunakan `Buffer` (perhatikan endianness LE/BE).

---

### 2. STRUKTUR PROYEK
Susun file proyek sebagai berikut:
```text
package.json          # "type": "module", scripts: "selftest", "start", bin: "index.js"
index.js              # Entry point CLI (memanggil run(process.argv.slice(2)))
imgmeta.cmd           # Skrip batch launcher Windows (@node "%~dp0index.js" %*)
foto/                 # Folder kerja default untuk foto
src/
  cli.js              # Parsing argumen, navigasi perintah, tampilan diff & log summary
  jpeg.js             # Scanner marker JPEG, ekstraksi dimensi SOF, injeksi/remove APP1, APP13, XMP
  png.js              # Scanner chunk PNG, generator chunk, kalkulator CRC32 bitwise, eXIf, iTXt
  exif.js             # TIFF/EXIF parser & serializer (IFD0, ExifIFD, GPS, Interop, IFD1 thumbnail)
  iptc.js             # APP13 Photoshop 8BIM & IPTC IIM parser/serializer (Title, Keywords, Caption, Author)
  meta.js             # High-level API: readFileMeta, applyEdits, buildXmpPacket, editFile, stripFile
  rename.js           # Ekspansi glob/direktori, generator template token, two-pass rename engine
  utils.js            # Warna ANSI, format tanggal EXIF, sanitasi Windows, unique target, logFailure
  tinyjpeg.js         # Encoder JPEG grayscale 8x8 minimalis untuk pengujian
test/
  selftest.js         # Suite pengujian internal (round-trip read/write/strip/rename)
```

---

### 3. SPESIFIKASI MODUL BINER & METADATA

#### A. `src/jpeg.js` (JPEG Binary Segment Parser & Injector)
- Scan penanda JPEG: SOI (`FF D8`), EOI (`FF D9`), SOS (`FF DA`), SOF dimensi (`FF C0..CF` kecuali C4, C8, CC), APP1 (`FF E1`), dan APP13 (`FF ED`).
- Deteksi APP1 EXIF (`Exif\0\0`), APP1 XMP (`http://ns.adobe.com/xap/1.0/\0`), dan APP13 Photoshop (`Photoshop 3.0\0`).
- Fungsi: `parseJpeg(buf)`, `buildExifApp1(tiffBuf)`, `insertExif(buf, app1Buf)`, `removeExif(buf)`, `insertIptc(buf, app13Buf)`, `removeIptc(buf)`, `insertXmp(buf, xmpXmlStr)`, `removeXmp(buf)`.
- Injeksi segmen diletakkan tepat setelah SOI atau setelah APP0/APP1 yang sudah ada, tanpa merusak raster data entropy JPEG.

#### B. `src/png.js` (PNG Chunk Parser & Injector)
- Validasi PNG Signature `89 50 4E 47 0D 0A 1A 0A`.
- Parser chunk: panjang 4 byte BE + tipe 4 byte ASCII + payload + CRC32 4 byte BE.
- Implementasikan tabel kalkulasi bitwise CRC32 manual (256-entry lookup table dengan polynomial `0xEDB88320`).
- Dukung chunk: `IHDR` (ekstraksi width & height), `eXIf` (EXIF TIFF payload), `tEXt`, dan `iTXt` (uncompressed UTF-8).
- Fungsi: `parsePng(buf)`, `buildPngChunk(type, dataBuf)`, `insertExif(buf, tiffBuf)`, `removeExif(buf)`, `updatePngTextChunks(buf, textData)`, `insertPngXmp(buf, xmpXmlStr)`.

#### C. `src/exif.js` (TIFF/EXIF Engine)
- Dukung Endianness: Little-Endian (`II`, 0x4949) dan Big-Endian (`MM`, 0x4D4D). Endianness file asli WAJIB dipertahankan saat round-trip.
- Tangani tipe data TIFF 1..12: BYTE, ASCII, SHORT, LONG, RATIONAL, UNDEFINED, SLONG, SRATIONAL.
- Parsing & Serialisasi struktur IFD:
  - IFD0 (Primary image tags), ExifIFD (tag 0x8769), GPS IFD (tag 0x8825), Interop IFD (tag 0xA005), IFD1 (Thumbnail).
  - **Invariant TIFF 6.0 Wajib**: Entry dalam IFD WAJIB diurutkan menaik berdasarkan nomor Tag (`entries.sort((a, b) => a.tag - b.tag)`).
  - Pertahankan thumbnail IFD1 dan raw byte tags yang tidak dikenal.
- Tag EXIF yang wajib didukung: `Make`, `Model`, `Orientation`, `Software`, `DateTime`, `Artist`, `Copyright`, `ImageDescription`, `ExposureTime`, `FNumber`, `ISO`, `DateTimeOriginal`, `DateTimeDigitized`, `FocalLength`, `LensModel`, serta Tag XP Windows:
  - `XPTitle` (0x9C9B), `XPComment` (0x9C9C), `XPAuthor` (0x9C9D), `XPKeywords` (0x9C9E) dalam format UTF-16LE / UCS-2.
- Konversi koordinat GPS: Decimal degrees ke derajat/menit/detik rasional TIFF + Tag Ref (N/S, E/W).

#### D. `src/iptc.js` (Photoshop 3.0 APP13 & IPTC IIM)
- Struktur APP13: Header 14 byte `Photoshop 3.0\0` diikuti resource blocks `8BIM`.
- Resource IPTC berada di ID `0x0404`.
- Pertahankan resource `8BIM` lain (misal ResolutionInfo 0x0405, thumbnail 0x0409) saat memperbarui IPTC.
- Parser dataset IPTC (urutan `0x1C record dataset len2 data`):
  - Record 1 Dataset 0x5A: deklarasi charset UTF-8 (escape sequence `\x1b%G`).
  - Record 2: `0x05` (Title/ObjectName), `0x19` (Keywords, berulang), `0x78` (Caption/Abstract), `0x50` (Author/Byline).
- Jika semua field IPTC kosong, kembalikan `null` untuk membuang segmen APP13.

#### E. `src/meta.js` (Orchestration & Microstock Compatibility)
- `buildXmpPacket(meta)`: Bangun string RDF/XML standar Adobe XMP:
  - `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">...`
  - `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">...`
  - `<dc:creator><rdf:Seq><rdf:li>...`
  - `<dc:subject><rdf:Bag><rdf:li>keyword1</rdf:li><rdf:li>keyword2</rdf:li>...`
- `applyEdits(model, opts)`: Terapkan perubahan ke model EXIF, selaraskan title/keywords/author/caption ke EXIF XP tags, IPTC, dan XMP agar metadata langsung terbaca 100% pada portal kontributor seperti Adobe Stock.
- `editFile(filePath, opts)`: Edit metadata in-place dengan opsi backup `.bak` jika diminta.
- `stripFile(filePath, opts)`: Hapus EXIF, IPTC, dan XMP untuk privasi.

---

### 4. LOGIKA SISTEM RENAME, PARSER DAFTAR, DAN CLI

#### A. `src/rename.js` & `src/utils.js` (Safe Batch Rename)
- Format token template: `{title}`, `{keywords}`, `{artist}`, `{make}`, `{model}`, `{lens}`, `{date}`, `{date:FORMAT}`, `{seq}`, `{seq:N}`, `{folder}`, `{name}`, `{ext}`.
- *Fallback*: Jika `{title}` kosong, lakukan fallback ke nama file asli (`{name}`).
- Sanitasi: Hapus karakter terlarang Windows `< > : " / \ | ? *`, potong spasi/titik di ujung, batasi panjang nama maksimal 180 karakter.
- **Strategi Two-Pass Rename**:
  1. Tahap 1: Rename semua file sumber ke nama file sementara unik `.tmp_imgmeta_[timestamp]_[index][ext]`.
  2. Tahap 2: Rename file sementara ke target akhir. Ini krusial agar pergantian nama massal (misal penomoran ulang atau perubahan huruf kapital di Windows) tidak saling menabrak atau terhalang nama lama.
- Penanganan duplikat target: Berikan penomoran suffix ` (2)`, ` (3)`, dst.

#### B. Parser File Daftar & Penyortiran Cerdas
- `title.txt`: Satu judul per baris (baris kosong diabaikan).
- `keyword.txt`: Mendukung satu kata kunci per baris ATAU dipisahkan koma dalam satu baris, dengan **baris kosong sebagai pemisah kelompok** (kelompok ke-N dipetakan ke foto ke-N).
- `sortFilesByTitles(files, titles)`: Jika sebuah foto sudah memiliki metadata judul yang cocok dengan entri di `title.txt`, kunci foto tersebut pada indeks entri tersebut agar susunan tidak bergeser saat di-*generate* ulang. File sisanya diurutkan dengan *numeric natural sort*.

#### C. CLI Commands (`src/cli.js`)
Implementasikan CLI intuitif dengan sub-command:
1. `auto [path]` / `npm start`: 1 langkah otomatis membaca `title.txt` & `keyword.txt`, menerapkan metadata ke foto di `foto/`, dan merename nama file sesuai judul.
2. `apply <files> --titles <file> --keywords-file <file>`: Terapkan metadata dari file daftar.
3. `read <files> [--json]`: Tampilkan metadata foto terformat rapi atau output JSON.
4. `edit <files> [opsi...]`: Ubah field metadata manual (date, gps, artist, title, keywords, dll.).
5. `strip <files>`: Hapus semua metadata EXIF, IPTC, dan XMP.
6. `rename <files> --template <template> [--apply]`: Simulasi (dry-run) atau eksekusi batch rename.
7. `selftest`: Jalankan pengujian internal mandiri.
8. Logging: Catat setiap kegagalan ke file `imgmeta.log` (mode append) dan cetak ringkasan kegagalan di akhir sesi.

---

### 5. PENGUJIAN MANDIRI (`src/tinyjpeg.js` & `test/selftest.js`)
- Di `src/tinyjpeg.js`, tulis encoder JPEG grayscale 8x8 sederhana tanpa dependensi.
- Di `test/selftest.js`, buat suite pengujian mandiri yang menguji:
  1. Pembuatan JPEG minimal dan deteksi SOI/EOI.
  2. Penyisipan EXIF baru, pembacaan ulang, pengeditan tanggal tanpa merusak tag lain.
  3. Pembuatan segmen APP13 IPTC, pembacaan, dan pelestarian resource 8BIM non-IPTC.
  4. Penyisipan eXIf chunk pada PNG dan verifikasi dimensi IHDR.
  5. Pengujian parser grup kata kunci `parseKeywordGroups`.
  6. Evaluasi token template rename dan penanganan bentrok nama ` (2)`.
  7. Verifikasi penulisan log kegagalan ke `imgmeta.log`.

Pastikan seluruh kode bersih, memiliki penanganan error yang baik di setiap loop per-file, dan siap langsung dijalankan hanya dengan `node index.js`.
```
