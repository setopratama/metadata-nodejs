# AGENTS.md — Panduan untuk AI Agent

Panduan kerja untuk agen AI (dan kontributor) yang mengerjakan codebase **imgmeta**.

## Ringkasan ProjectCLI Node.js **tanpa dependensi** untuk membaca/mengubah metadata foto
(**EXIF**: kamera/tanggal/GPS; **IPTC**: judul/kata kunci/keterangan/penulis)
pada JPEG dan mengganti nama file secara batch dengan template. Bahasa
dokumentasi & komentar: **Indonesia**.

- Runtime: Node.js >= 16, `"type": "module"` (ESM murni).
- **Aturan utama: JANGAN menambah dependensi eksternal.** Semua parser (JPEG, PNG, TIFF/EXIF)
  ditulis manual — ini nilai jual utama project.
- EXIF didukung untuk **JPEG** (`.jpg`/`.jpeg`) dan **PNG** (`.png`). File gambar lain tetap bisa di-rename.
- **Folder kerja foto** berada di `foto/` (root project) — letakkan foto yang akan
  diproses di sana. Contoh perintah di bawah memakai `foto/*.jpg`.

## Perintah Penting

```bash
npm start                     # 1 langkah: terapkan judul & kata kunci dari file daftar + rename ke judul
node index.js --help          # semua perintah & opsi
node index.js selftest        # pengujian internal (round-trip EXIF + template)
node index.js read "foto/*.jpg"   # baca metadata semua foto di folder kerja foto/
```

`npm run selftest` setara dengan `node index.js selftest`.

> Catatan: di sebagian environment Windows tanpa Git Bash, perintah terminal tidak
> tersedia. Jika begitu, validasi kode secara statis (review menyeluruh) dan minta
> pengguna menjalankan `node index.js selftest` sendiri.

## Arsitektur

```
index.js            Entry point (jalankan run(process.argv.slice(2)))
imgmeta.cmd         Peluncur Windows
foto/               Folder kerja: tempat foto yang akan diproses
CHANGELOG.md        Riwayat perubahan versi (wajib diupdate tiap perubahan penting)
src/
  cli.js            Parsing argumen (parseArgs) + perintah: auto/read/edit/apply/strip/rename
  jpeg.js           Parser struktur JPEG: segmen, APP1 "Exif\0\0", APP13 "Photoshop 3.0",
                    XMP, dimensi SOF; insertExif/removeExif, insertIptc/removeIptc, removeXmp
  png.js            Parser & serializer chunk PNG: eXIf (EXIF), tEXt/iTXt, IHDR (dimensi),
                    CRC32 manual; insertExif/removeExif
  exif.js           Parser & serializer TIFF/EXIF: IFD0, ExifIFD, GPS IFD, Interop,
                    IFD1 + thumbnail. Jantung logika metadata.
  iptc.js           Parser & serializer IPTC IIM di segmen APP13 "Photoshop 3.0":
                    judul (2:05), kata kunci (2:25), keterangan (2:120), penulis (2:80)
  meta.js           Lapisan tinggi: readFileMeta, buildExifView, applyEdits, editFile, stripFile
  rename.js         expandFiles (file/glob/direktori) + buildName + runRename (batch)
  utils.js          Warna ANSI, log (termasuk logFailure → imgmeta.log), tanggal EXIF,
                    sanitasi nama Windows, glob, ensureUniqueTarget,
                    parseKeywordGroups (kelompok kata kunci apply)
  tinyjpeg.js       Encoder JPEG grayscale 8x8 (HANYA untuk pengujian/selftest)
test/
  selftest.js       Pengujian round-trip; dipanggil lewat perintah "selftest"
```

Alur panggilan: `cli.js` → `meta.js` → (`exif.js` + `jpeg.js`). `rename.js` memakai
`meta.js` untuk membaca EXIF per file. Tidak ada siklus import.

## Invariant yang HARUS Dijaga (jangan dilanggar saat mengubah kode)

1. **Entry IFD harus terurut menaik berdasarkan tag** — spesifikasi TIFF 6.0.
   `serializeTiff()` sudah melakukan `entries.sort((a, b) => a.tag - b.tag)`
   sebelum layout. Jika menambah/merombak serialisasi, pertahankan pengurutan ini.
2. **Preservasi data saat round-trip** (baca → edit → tulis):
   - Endianness TIFF (`II`/`MM`) dari file asli harus dipertahankan (`model.endian`).
   - Thumbnail (IFD1 + tag 0x0201/0x0202) disimpan terpisah di `model.thumbnail`
     dan ditulis ulang — jangan dibuang.
   - Tag bertipe tak dikenal disimpan sebagai byte mentah; `count` harus konsisten
     dengan panjang byte aktual agar tidak korup saat ditulis ulang.
   - ASCII: terminator `\0` otomatis ditangani `encodeValue` (tambah bila belum ada),
     `decodeValue` membuang `\0` saat membaca.
3. **Lokasi TIFF**: segmen APP1 EXIF berisi `"Exif\0\0"` (6 byte) lalu buffer TIFF.
   `parseTiff(buf, payloadStart + 6, payloadStart + payloadLen)`.
4. **Backup**: `edit`/`strip`/`auto` secara default **tidak membuat cadangan `.bak`** (langsung memperbarui file asli). Cadangan hanya dibuat bila opsi `--no-backup=false` diberikan secara eksplisit. Opsi `--backup` TIDAK ada di CLI — jangan menuliskan/mendokumentasikannya tanpa mengimplementasikannya lebih dulu di `parseArgs`/`BOOLEAN_OPTS` (src/cli.js) dan `editFile`/`stripFile` (src/meta.js).
4b. **IPTC (APP13 "Photoshop 3.0") & Fallback EXIF**:
   - Struktur: header 14 byte `Photoshop 3.0\0`, lalu resource 8BIM (4 byte "8BIM"
     + ID 2 byte BE + nama Pascal genap + ukuran 4 byte BE + data). IPTC ada di
     resource ID `0x0404`.
   - Dataset IPTC: marker `0x1C` + record + dataset + panjang 2 byte BE + data.
     Field yang dipakai: record 2 — `0x05` judul, `0x19` kata kunci (berulang),
     `0x78` keterangan, `0x50` penulis.
   - Charset: saat menulis, selalu deklarasikan UTF-8 (record 1, dataset `0x5A`,
     escape `ESC%G`) dan encode teks sebagai UTF-8. Saat membaca, hormati tag
     charset tersebut; tanpa deklarasi, baca sebagai latin1.
   - Saat mengedit IPTC, segmen APP13 lama diganti tetapi **resource 8BIM lain
     (thumbnail 0x0409, ResolutionInfo 0x0405, dll.) dipertahankan** — dibaca
     sebagai `others[]` di `readIptcFromApp13()` dan ditulis ulang oleh
     `buildIptcApp13(fields, others)`. Bila tidak ada APP13, segmen baru disisipkan
     setelah SOI.
   - **Kesesuaian PNG & Microstock (Adobe Stock / Shutterstock / Freepik)**: `applyEdits()` dan `buildXmpPacket()` menyelaraskan `opts.title`, `opts.keywords`, `opts.caption`, dan `opts.author` ke tag EXIF IFD0 (`XPKeywords` `0x9c9e`, `XPTitle` `0x9c9b`, `XPComment` `0x9c9c`, `XPAuthor` `0x9c9d`, serta `ImageDescription` `0x010e`), chunk teks `iTXt` (`Title`, `Description`, `Keywords`, `Author`), serta **paket Adobe XMP (`XML:com.adobe.xmp` pada PNG / APP1 XMP `http://ns.adobe.com/xap/1.0/` pada JPEG)** dengan tag Dublin Core `<dc:subject>` (`<rdf:Bag>`). Hal ini menjamin judul dan kata kunci 100% terdeteksi otomatis pada sistem pengunggah Adobe Stock Contributor.
   - Menghapus field: `--title ""` / `--keywords ""` menghapus field tersebut.
     Bila SEMUA field IPTC/EXIF kosong dan tidak ada resource lain, `buildIptcApp13`
     mengembalikan null dan `editFile` membuang segmen APP13 serta tag terkait.
4c. **`strip` menghapus EXIF (APP1) + IPTC (APP13 Photoshop) + XMP (APP1)** —
   tujuan utamanya privasi. Jangan mengurangi cakupan ini tanpa alasan kuat.
   `removeExif`/`removeIptc`/`removeXmp` mengembalikan `null` bila segmen tidak ada.
4d. **Format file daftar `apply` & `auto`**: `title.txt` satu judul per baris (baris kosong pemisah diabaikan lewat `parseTitles()`, helper privat di `src/cli.js`). `keyword.txt` mendukung satu kata kunci per baris maupun dipisahkan koma dalam satu baris, dengan **baris kosong sebagai pemisah kelompok** — kelompok ke-N ↔ foto ke-N; parser murni ada di `utils.parseKeywordGroups()`. Pemetaan file menggunakan `sortFilesByTitles()` agar judul yang sudah cocok dengan `title.txt` tetap terkunci di posisinya (mencegah foto tertukar saat generate ulang).
   - **Jumlah baris/kelompok TIDAK wajib sama dengan jumlah foto** — ini
     disengaja, bukan bug: daftar lebih pendek → file sisanya dilewati dengan
     peringatan (dihitung "dilewati" di ringkasan; sebuah file baru dilewati
     total bila baris title DAN kelompok keyword sama-sama tidak ada);
     `title.txt` lebih panjang → baris berlebih diabaikan diam-diam tanpa
     peringatan; `keyword.txt` lebih panjang → peringatan "N kelompok lebih
     banyak dari jumlah file — kelebihan diabaikan.". Jangan mengubah perilaku
     ini menjadi error keras tanpa persetujuan pengguna.
5. **Nama file Windows & Fallback Rename**: `sanitizeName()` membersihkan `< > : " / \ | ? *` dan
   karakter kontrol, buang titik/spasi di akhir, batasi 180 karakter. `buildName()` menangani ekstensi secara terpisah dan melakukan *fallback* ke nama asli (`parsed.name`) jika token template (seperti `{title}`) menghasilkan string kosong.
6. **Anti-bentrok & Batch Rename**: `ensureUniqueTarget(target, planned, source, batchSources)` mengecek bentrok target batch dan file disk eksternal. File yang termasuk dalam daftar sumber batch (`batchSources`) dikecualikan dari pemeriksaan disk agar tidak terjadi bentrok palsu dengan nama file lama. Eksekusi rename batch (`runRename`) menggunakan strategi *Two-Pass Rename* (menggunakan file sementara `.tmp_imgmeta_...`) agar penamaan ulang masal tidak saling mengunci atau menghasilkan akhiran `_1`. Jika terdapat bentrok nama target yang benar-benar ganda, penomoran unik menggunakan format ` (2)`, ` (3)` dst.
7. **Dry-run rename**: `rename` TANPA `--apply` hanya menampilkan rencana, tidak
    mengubah apa pun.
8. **Ekspansi file**: glob `* ?` didukung; argumen direktori dibaca isinya (hanya
   ekstensi gambar); hasil di-`path.resolve` dan di-dedup. `isImageFilename()`
   (helper privat di `src/rename.js`, bukan ekspor publik) juga mengenali nama
   file gambar hasil pemotongan ekstensi.

## Konvensi Kode

- ESM: `import fs from "node:fs"` / `export function ...`. Gunakan prefix `node:`.
- Komentar dalam Bahasa Indonesia, singkat dan menjelaskan "mengapa" bila perlu.
- Tanpa dependensi — jika butuh fitur, implementasikan manual (seperti pola
  `tinyjpeg.js` untuk encoder uji).
- Simbol `C`, `colorEnabled`, `p2`, `p4` di `utils.js` bersifat **privat modul**
  (sengaja tidak diekspor publik) — jangan dipanggil dari luar; pakai
  `green/yellow/...`, `setColor`, `pad`. Format rasional untuk tampilan ada di
  `cli.js` (`exifFmtRational`) — jangan menambahkan duplikat di `exif.js`
  (`fmtRational` sudah dihapus).
- Error: CLI menangkap error di `run()` → `utils.err(e.message)` + `process.exitCode = 1`.
  Perintah per-file (edit/strip) memakai try/catch di dalam loop agar satu file gagal
  tidak menghentikan batch.
- **Log kegagalan**: setiap kegagalan (rename, edit/apply/auto, strip, ekspansi
  file, error global) dicatat ke `imgmeta.log` di cwd lewat
  `utils.logFailure(operation, file, message)` — format `[tanggal] [operasi] file — pesan`,
  mode append, tanpa dependensi. Panggil di setiap blok catch; jangan menghentikan
  proses bila log gagal ditulis. `logFailure` juga mengumpulkan kegagalan sesi
  (`utils.getFailures()` / `utils.resetFailures()`); `run()` di `cli.js` memanggil
  `utils.resetFailures()` di awal dan menampilkan ringkasannya lewat
  `printFailureSummary()` di akhir perintah (kecuali `--json`).
- Output: `utils.info` (stdout), `utils.err` (stderr), `utils.warn`. Warna ANSI lewat
  `utils.green/yellow/...` — hormati `--no-color` / `NO_COLOR`.
- Parser memakai `Buffer` subarray & `readUInt16LE/BE` — perhatikan endianness.

## Menambahkan Fitur — Pola yang Dipakai

- **Tag EXIF baru**: tambahkan konstanta di `exif.T`, lalu baca di `buildExifView()`
  dan/atau tulis di `applyEdits()` (CLI: `cli.js` + `usage()`). Perbarui selftest.
- **Field IPTC baru**: tambahkan konstanta di `DS` (src/iptc.js), baca di
  `readIptcFromApp13()` (pass 2), tulis di `buildIptcApp13()`, lalu permukaan ke
  pengguna lewat `collectIptcEdits()` (meta.js) dan `buildExifView()`.
- **Token template baru**: tambahkan ke `tokens` di `buildName()` (src/rename.js),
  dokumentasikan di `README.md` dan `usage()`.
- **Perintah baru**: tambah case di `run()` (src/cli.js), fungsi `cmd*`, dan baris
  di `usage()`. Catat kegagalannya ke `utils.logFailure()`.
- **Log kegagalan**: saat menambah titik kegagalan baru (perintah, rename, parser),
  panggil `utils.logFailure(operation, file, message)` di blok catch-nya dan
  dokumentasikan di `README.md` / `usage()` bila ada operasi baru.
- **Selftest**: tambahkan kasus di `test/selftest.js` (round-trip wajib untuk fitur
  baca/tulis metadata).
- **Changelog**: catat perubahan di `CHANGELOG.md` dengan kategori yang sesuai
  (Ditambahkan/Diubah/Dihapus/Diperbaiki).

## Pengujian

Sebelum menyelesaikan perubahan apa pun pada logika EXIF/rename:

1. Jalankan `node index.js selftest` — harus lulus semua (pesan akhir
   "Semua pengujian lulus").
2. Jika environment tidak bisa menjalankan node, lakukan static review menyeluruh
   terhadap file yang diubah (syntax, invariant di atas, konsistensi import/export).
3. Untuk perubahan ekspor/import modul: cek semua pemanggil (code search) agar tidak
   ada referensi yang tertinggal.

## Kesalahan Umum yang Harus Dihindari

- Menambah dependensi npm "karena praktis" — TOLAK, implementasikan manual.
- Menulis entry IFD tidak urut / mengubah count ASCII (harus termasuk `\0`).
- Mereset `model.endian` ke `"II"` — file big-endian (`MM`) jadi korup.
- Membuang thumbnail saat edit (baca → tulis ulang).
- Menulis teks IPTC tanpa deklarasi charset UTF-8 (record 1 dataset 0x5A) atau
  meng-encode bukan UTF-8 — karakter non-latin akan rusak.
- Menghapus seluruh segmen APP13 (bukan hanya resource IPTC) saat `edit`;
  padahal `edit` harus mengganti segmen APP13 lama, dan hanya `strip` yang membuangnya.
- Menganggap glob mendukung `**` — parser glob hanya `*` dan `?` di satu segmen nama.
