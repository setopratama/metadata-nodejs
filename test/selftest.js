// Pengujian internal: memastikan encoder/parser/serializer EXIF bekerja benar.
// Jalankan dengan: node index.js selftest
import fs from "node:fs";
import path from "node:path";
import * as jpeg from "../src/jpeg.js";
import * as png from "../src/png.js";
import * as exif from "../src/exif.js";
import * as iptc from "../src/iptc.js";
import * as utils from "../src/utils.js";
import { encodeGrayJpeg } from "../src/tinyjpeg.js";
import { buildExifView, collectIptcEdits } from "../src/meta.js";
import { buildName } from "../src/rename.js";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass += 1;
    console.log("  OK    " + msg);
  } else {
    fail += 1;
    console.error("  GAGAL " + msg);
  }
}

function approx(a, b, eps = 0.0001) {
  return Math.abs(a - b) < eps;
}

export function runSelftest() {
  console.log("== Pengujian internal imgmeta ==");

  // 1. Encoder JPEG minimal
  const tiny = encodeGrayJpeg(8, 8);
  assert(tiny[0] === 0xff && tiny[1] === 0xd8, "JPEG diawali SOI");
  assert(tiny[tiny.length - 2] === 0xff && tiny[tiny.length - 1] === 0xd9, "JPEG diakhiri EOI");
  const p1 = jpeg.parseJpeg(tiny);
  assert(p1.dims && p1.dims.w === 8 && p1.dims.h === 8, "Dimensi 8x8 terbaca");
  assert(p1.exif === null, "Belum ada metadata EXIF");

  // 2. Sisipkan metadata baru lalu baca ulang
  const model = exif.createEmptyModel();
  exif.setTag(model.ifd0, exif.T.Make, 2, "Canon");
  exif.setTag(model.ifd0, exif.T.Model, 2, "EOS R6");
  exif.setTag(model.ifd0, exif.T.Artist, 2, "Budi Santoso");
  exif.setTag(model.ifd0, exif.T.ImageDescription, 2, "Liburan di Bali");
  exif.setTag(model.ifd0, exif.T.Orientation, 3, 6);
  exif.setTag(model.ifd0, exif.T.DateTime, 2, "2020:01:15 08:30:00");
  if (!model.exif) model.exif = [];
  exif.setTag(model.exif, exif.T.DateTimeOriginal, 2, "2020:01:15 08:30:00");
  exif.setTag(model.exif, exif.T.DateTimeDigitized, 2, "2020:01:15 08:30:00");
  model.gps = exif.decimalToGps(-6.2088, 106.8456);

  const tiff = exif.serializeTiff(model);
  const img = jpeg.insertExif(tiny, jpeg.buildExifApp1(tiff));

  const p2 = jpeg.parseJpeg(img);
  assert(p2.exif !== null, "Metadata EXIF berhasil disisipkan");
  const m2 = exif.parseTiff(img, p2.exif.payloadStart + 6, p2.exif.payloadStart + p2.exif.payloadLen);
  const v2 = buildExifView(m2, p2.dims);
  assert(v2.make === "Canon", "Tag Make terbaca: " + v2.make);
  assert(v2.model === "EOS R6", "Tag Model terbaca: " + v2.model);
  assert(v2.artist === "Budi Santoso", "Tag Artist terbaca: " + v2.artist);
  assert(v2.description === "Liburan di Bali", "Tag Deskripsi terbaca");
  assert(v2.orientation === 6, "Tag Orientasi terbaca: " + v2.orientation);
  assert(v2.dateTimeOriginal === "2020:01:15 08:30:00", "Tanggal asli terbaca");
  assert(v2.gps && approx(v2.gps.lat, -6.2088), "Latitude GPS terbaca: " + (v2.gps && v2.gps.lat.toFixed(5)));
  assert(v2.gps && approx(v2.gps.lon, 106.8456), "Longitude GPS terbaca: " + (v2.gps && v2.gps.lon.toFixed(5)));
  assert(v2.width === 8 && v2.height === 8, "Dimensi dari EXIF terbaca");

  // 3. Edit tanggal, tag lain tetap terjaga
  const m3 = exif.parseTiff(img, p2.exif.payloadStart + 6, p2.exif.payloadStart + p2.exif.payloadLen);
  if (!m3.exif) m3.exif = [];
  exif.setTag(m3.exif, exif.T.DateTimeOriginal, 2, "2021:06:01 12:00:00");
  const img3 = jpeg.insertExif(img, jpeg.buildExifApp1(exif.serializeTiff(m3)));
  const p3 = jpeg.parseJpeg(img3);
  const v3 = buildExifView(
    exif.parseTiff(img3, p3.exif.payloadStart + 6, p3.exif.payloadStart + p3.exif.payloadLen),
    p3.dims
  );
  assert(v3.dateTimeOriginal === "2021:06:01 12:00:00", "Tanggal berhasil diubah");
  assert(v3.make === "Canon" && v3.artist === "Budi Santoso", "Tag lain tetap terjaga setelah edit");

  // 4. Hapus metadata
  const stripped = jpeg.removeExif(img3);
  assert(stripped !== null && jpeg.parseJpeg(stripped).exif === null, "Metadata berhasil dihapus");

  // 4b. IPTC: title, keywords, caption, author (segmen APP13 "Photoshop 3.0")
  const app13 = iptc.buildIptcApp13({
    title: "Pantai Kuta",
    keywords: ["bali", "pantai"],
    caption: "Sunset",
    author: "Budi",
  });
  assert(app13 !== null, "Segmen APP13 IPTC berhasil dibuat");
  const imgI = jpeg.insertIptc(img3, app13);
  const pI = jpeg.parseJpeg(imgI);
  assert(pI.iptc !== null, "Segmen APP13 IPTC terdeteksi");
  const iptcRead = iptc.readIptcFromApp13(
    imgI.subarray(pI.iptc.payloadStart, pI.iptc.payloadStart + pI.iptc.payloadLen)
  );
  assert(iptcRead && iptcRead.title === "Pantai Kuta", "IPTC Title terbaca: " + (iptcRead && iptcRead.title));
  assert(iptcRead && iptcRead.keywords.length === 2 && iptcRead.keywords[0] === "bali", "IPTC Keywords terbaca");
  assert(iptcRead && iptcRead.caption === "Sunset", "IPTC Caption terbaca");
  assert(iptcRead && iptcRead.author === "Budi", "IPTC By-line terbaca");
  const removedIptc = jpeg.removeIptc(imgI);
  assert(removedIptc !== null && jpeg.parseJpeg(removedIptc).iptc === null, "Segmen IPTC berhasil dihapus");
  const iptcView = buildExifView(null, null, iptcRead);
  assert(iptcView.title === "Pantai Kuta" && iptcView.keywords.join(",") === "bali,pantai", "buildExifView memuat field IPTC");

  // 4c. Resource 8BIM non-IPTC dipertahankan saat mengganti IPTC
  const othersRes = [{ id: 0x0409, name: Buffer.from([0]), data: Buffer.from([1, 2, 3, 4]) }];
  const app13b = iptc.buildIptcApp13({ title: "Pantai" }, othersRes);
  const imgO = jpeg.insertIptc(imgI, app13b);
  const pO = jpeg.parseJpeg(imgO);
  const readO = iptc.readIptcFromApp13(
    imgO.subarray(pO.iptc.payloadStart, pO.iptc.payloadStart + pO.iptc.payloadLen)
  );
  assert(readO && readO.others.length === 1 && readO.others[0].id === 0x0409, "Resource 8BIM lain terbaca");
  const app13c = iptc.buildIptcApp13({ title: "Kuta" }, readO.others);
  const imgO2 = jpeg.insertIptc(imgO, app13c);
  const pO2 = jpeg.parseJpeg(imgO2);
  const readO2 = iptc.readIptcFromApp13(
    imgO2.subarray(pO2.iptc.payloadStart, pO2.iptc.payloadStart + pO2.iptc.payloadLen)
  );
  assert(readO2 && readO2.title === "Kuta" && readO2.others.length === 1, "Resource 8BIM lain dipertahankan saat edit IPTC");
  const app13Empty = iptc.buildIptcApp13({ title: "", keywords: [], caption: null, author: null });
  assert(app13Empty === null, "Field IPTC kosong menghasilkan null (penghapusan)");

  // 4d. Pengujian PNG (eXIf chunk & dimensions)
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = png.buildPngChunk("IHDR", Buffer.from([0, 0, 0, 16, 0, 0, 0, 16, 8, 2, 0, 0, 0]));
  const iendChunk = png.buildPngChunk("IEND", Buffer.alloc(0));
  const tinyPng = Buffer.concat([pngHeader, ihdrChunk, iendChunk]);
  assert(png.isPng(tinyPng), "PNG header terdeteksi");
  const parsePng1 = png.parsePng(tinyPng);
  assert(parsePng1.dims && parsePng1.dims.w === 16 && parsePng1.dims.h === 16, "Dimensi PNG 16x16 terbaca");

  const pngWithExif = png.insertExif(tinyPng, tiff);
  const parsePng2 = png.parsePng(pngWithExif);
  assert(parsePng2.exif !== null, "Chunk eXIf PNG berhasil disisipkan");
  const mPng = exif.parseTiff(pngWithExif, parsePng2.exif.payloadStart, parsePng2.exif.payloadStart + parsePng2.exif.payloadLen);
  const vPng = buildExifView(mPng, parsePng2.dims);
  assert(vPng.make === "Canon" && vPng.model === "EOS R6", "Metadata EXIF pada PNG terbaca: " + vPng.make + " " + vPng.model);

  const pngStripped = png.removeExif(pngWithExif);
  assert(pngStripped !== null && png.parsePng(pngStripped).exif === null, "Chunk eXIf PNG berhasil dihapus");

  // 4e. Parser kelompok kata kunci (keyword.txt: 1 per baris atau dipisah koma per kelompok)
  const kwGroups = utils.parseKeywordGroups([
    "bali", "pantai", "", "bromo", "", "", "kuta", "",
  ]);
  assert(kwGroups.length === 3, "Baris kosong memisahkan kelompok kata kunci");
  assert(kwGroups[0].join(",") === "bali,pantai", "Kelompok 1: " + kwGroups[0].join(","));
  assert(kwGroups[1].join(",") === "bromo", "Kelompok 2: " + kwGroups[1].join(","));
  assert(kwGroups[2].join(",") === "kuta", "Baris kosong beruntun diabaikan (Kelompok 3: " + kwGroups[2].join(",") + ")");

  const kwGroupsComma = utils.parseKeywordGroups([
    "bali, pantai", "", "bromo, jawa timur", "",
  ]);
  assert(kwGroupsComma.length === 2, "Kata kunci dipisah koma dalam 1 baris terbaca kelompoknya");
  assert(kwGroupsComma[0].join(",") === "bali,pantai", "Kata kunci dipisah koma terpecah menjadi array");
  assert(kwGroupsComma[1].join(",") === "bromo,jawa timur", "Kelompok 2 dipisah koma terbaca");

  assert(utils.parseKeywordGroups([]).length === 0, "Input kosong tanpa kelompok");
  assert(utils.parseKeywordGroups(["", "  "]).length === 0, "Hanya baris kosong tanpa kelompok");
  const kwArr = collectIptcEdits({ keywords: ["Bromo, Jawa Timur", "sunrise"] }, null);
  assert(
    kwArr.keywords.length === 2 && kwArr.keywords[0] === "Bromo, Jawa Timur",
    "collectIptcEdits menerima array (koma di dalam keyword utuh)"
  );
  const kwStr = collectIptcEdits({ keywords: "a, b" }, null);
  assert(kwStr.keywords.join(",") === "a,b", "collectIptcEdits tetap memisah koma untuk string");

  // 5. Template rename
  const fakeMeta = { mtime: new Date(2020, 0, 15, 8, 30, 0), model: m2, dims: { w: 8, h: 8 } };
  const n1 = buildName("D:/Foto/liburan.jpg", "{date:YYYYMMDD}_{make}_{seq:3}", 1, fakeMeta);
  assert(
    path.normalize(n1) === path.join("D:/Foto", "20200115_Canon_001.jpg"),
    "Template tanggal+kamera+urutan: " + path.basename(n1)
  );
  const n2 = buildName("D:/Foto/liburan.jpg", "{name}-edited", 1, fakeMeta);
  assert(path.normalize(n2) === path.join("D:/Foto", "liburan-edited.jpg"), "Template {name}: " + path.basename(n2));
  const n3 = buildName("D:/Foto/liburan.jpg", "{artist} - {model}", 2, fakeMeta);
  assert(
    path.normalize(n3) === path.join("D:/Foto", "Budi Santoso - EOS R6.jpg"),
    "Template teks metadata: " + path.basename(n3)
  );
  const n4 = buildName("D:/Foto/liburan.jpg", "{date}", 3, fakeMeta);
  assert(
    path.normalize(n4) === path.join("D:/Foto", "2020-01-15_083000.jpg"),
    "Template {date} default: " + path.basename(n4)
  );

  const n5 = buildName("D:/Foto/sample.png", "{title}", 1, null, "Pemandangan Gunung Bromo");
  assert(
    path.normalize(n5) === path.join("D:/Foto", "Pemandangan Gunung Bromo.png"),
    "Template {title} dengan customTitle: " + path.basename(n5)
  );

  const n6 = buildName("D:/Foto/sample_old.png", "{title}", 1, null, null);
  assert(
    path.normalize(n6) === path.join("D:/Foto", "sample_old.png"),
    "Template {title} tanpa EXIF fallback ke nama asli: " + path.basename(n6)
  );

  const unq1 = utils.ensureUniqueTarget("D:/Foto/test.jpg", new Set(["d:/foto/test.jpg"]));
  assert(
    path.normalize(unq1) === path.join("D:/Foto", "test (2).jpg"),
    "Bentrok nama target menggunakan format standar (2): " + path.basename(unq1)
  );

  // 6. Log kegagalan ke file (utils.logFailure)
  const logPath = path.join(process.cwd(), "imgmeta-selftest.log");
  utils.logFailure("rename", "foto/a.jpg", "uji penulisan log", logPath);
  utils.logFailure("edit", "foto/b.jpg", "uji append", logPath);
  const logContent = fs.readFileSync(logPath, "utf8");
  assert(
    logContent.includes("[rename]") && logContent.includes("foto/a.jpg") && logContent.includes("uji penulisan log"),
    "logFailure menulis baris kegagalan ke file log"
  );
  assert(
    logContent.includes("[edit]") && logContent.includes("foto/b.jpg") && logContent.includes("uji append"),
    "logFailure menambahkan baris baru (mode append)"
  );
  fs.unlinkSync(logPath);

  // 6b. Kumpulan kegagalan sesi berjalan (untuk ringkasan di akhir perintah)
  utils.resetFailures();
  utils.logFailure("rename", "foto/c.jpg", "uji ringkasan", logPath);
  const sesi = utils.getFailures();
  assert(
    sesi.length === 1 && sesi[0].includes("foto/c.jpg") && sesi[0].includes("[rename]"),
    "getFailures menampilkan kegagalan sesi berjalan"
  );
  utils.resetFailures();
  assert(utils.getFailures().length === 0, "resetFailures mengosongkan kegagalan sesi");
  fs.unlinkSync(logPath);

  console.log("");
  if (fail === 0) {
    console.log("Semua pengujian lulus (" + pass + "/" + pass + ").");
    return true;
  }
  console.error(fail + " dari " + (pass + fail) + " pengujian gagal.");
  process.exitCode = 1;
  return false;
}
