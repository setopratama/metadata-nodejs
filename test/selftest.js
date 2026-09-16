// Pengujian internal: memastikan encoder/parser/serializer EXIF bekerja benar.
// Jalankan dengan: node index.js selftest
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import * as jpeg from "../src/jpeg.js";
import * as png from "../src/png.js";
import * as exif from "../src/exif.js";
import * as iptc from "../src/iptc.js";
import * as utils from "../src/utils.js";
import * as db from "../src/db.js";
import * as imageMod from "../src/image.js";
import * as vectorMod from "../src/vector.js";
import * as svg from "../src/svg.js";
import * as epsMod from "../src/eps.js";
import { encodeGrayJpeg } from "../src/tinyjpeg.js";
import * as meta from "../src/meta.js";
import { buildExifView, collectIptcEdits, parseXmpMetadata } from "../src/meta.js";
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

  // 4f. Parser XMP Dublin Core
  const sampleXmp = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">Pemandangan Bromo</rdf:li></rdf:Alt></dc:title><dc:creator><rdf:Seq><rdf:li>Fotografer Pro</rdf:li></rdf:Seq></dc:creator><dc:subject><rdf:Bag><rdf:li>gunung</rdf:li><rdf:li>bromo</rdf:li><rdf:li>sunrise</rdf:li></rdf:Bag></dc:subject></rdf:Description></rdf:RDF></x:xmpmeta>`;
  const parsedXmp = parseXmpMetadata(sampleXmp);
  assert(parsedXmp && parsedXmp.title === "Pemandangan Bromo", "XMP title terbaca");
  assert(parsedXmp && parsedXmp.author === "Fotografer Pro", "XMP author terbaca");
  assert(parsedXmp && parsedXmp.keywords.length === 3 && parsedXmp.keywords[1] === "bromo", "XMP keywords terbaca");
  const xmpView = buildExifView(null, null, null, parsedXmp);
  assert(xmpView.keywords.length === 3 && xmpView.title === "Pemandangan Bromo", "buildExifView memuat field fallback XMP");

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

  // 7. Modul Database SQLite (src/db.js)
  const testDbPath = path.join(process.cwd(), "test-imgmeta.db");
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const testDb = db.getDb(testDbPath);
  assert(testDb != null, "Inisialisasi database SQLite berhasil");

  const presetObj1 = db.createPreset("stock-set", "Stock Set", "Kumpulan foto microstock", testDbPath);
  assert(presetObj1 && presetObj1.id === "stock-set" && presetObj1.name === "Stock Set", "createPreset SQLite berhasil");

  const presets = db.listPresets(testDbPath);
  assert(presets.some((p) => p.id === "stock-set"), "listPresets memuat preset baru");

  const item1 = db.addPresetItem("stock-set", {
    title: "Mountain Sunrise Landscape",
    keywords: ["mountain", "sunrise", "nature", "gold"],
    caption: "Beautiful mountain landscape at sunrise",
    author: "Seto",
  }, testDbPath);
  assert(item1 && item1.id != null && item1.sortOrder === 1, "addPresetItem berhasil menambahkan entri");

  const items = db.getPresetItems("stock-set", testDbPath);
  assert(
    items.length === 1 && items[0].title === "Mountain Sunrise Landscape" && items[0].keywords.length === 4,
    "getPresetItems membaca entri SQLite dengan benar"
  );

  const exp = db.exportPresetToText("stock-set", testDbPath);
  assert(
    exp.titlesText === "Mountain Sunrise Landscape" && exp.keywordsText.includes("mountain, sunrise"),
    "exportPresetToText menghasilkan teks judul & kata kunci"
  );

  const imp = db.importTextToPreset("stock-set", {
    titleText: "Judul 1\nJudul 2",
    keywordText: "tag1, tag2\n\ntag3, tag4",
    mode: "replace",
  }, testDbPath);
  assert(imp.length === 2 && imp[1].title === "Judul 2" && imp[1].keywords[0] === "tag3", "importTextToPreset mode replace berhasil");

  db.recordHistory({
    operation: "auto",
    folder: "foto",
    fileCount: 2,
    successCount: 2,
    failCount: 0,
    logText: "Auto test OK",
  }, testDbPath);

  const history = db.getHistory(10, testDbPath);
  assert(history.length === 1 && history[0].operation === "auto" && history[0].fileCount === 2, "recordHistory & getHistory SQLite berhasil");

  db.clearPresetItems("stock-set", testDbPath);
  assert(db.getPresetItems("stock-set", testDbPath).length === 0, "clearPresetItems mengosongkan item");

  db.deletePreset("stock-set", testDbPath);
  assert(!db.listPresets(testDbPath).some((p) => p.id === "stock-set"), "deletePreset menghapus preset");

  db.closeDb();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  // 8. Modul Image Processing & Export JPEG (src/image.js)
  const rawRgbaScanlines = [];
  for (let y = 0; y < 8; y++) {
    rawRgbaScanlines.push(0); // filter type: 0 (None)
    for (let x = 0; x < 8; x++) {
      rawRgbaScanlines.push(200, 100, 50, 255); // RGBA
    }
  }
  const idatData = zlib.deflateSync(Buffer.from(rawRgbaScanlines));
  const idatChunk = png.buildPngChunk("IDAT", idatData);
  const ihdrChunk8x8 = png.buildPngChunk("IHDR", Buffer.from([0, 0, 0, 8, 0, 0, 0, 8, 8, 6, 0, 0, 0])); // 8x8 RGBA (colorType 6)
  const fullPng = Buffer.concat([pngHeader, ihdrChunk8x8, idatChunk, iendChunk]);

  const decoded = imageMod.decodePng(fullPng);
  assert(decoded.width === 8 && decoded.height === 8, "decodePng membaca dimensi 8x8");
  assert(decoded.data[0] === 200 && decoded.data[1] === 100 && decoded.data[2] === 50, "decodePng mendekode piksel RGB");

  const encodedJpeg = imageMod.encodeRgbToJpeg(decoded, 90);
  assert(jpeg.isJpeg(encodedJpeg), "encodeRgbToJpeg menghasilkan JPEG valid");
  const parsedEncJpeg = jpeg.parseJpeg(encodedJpeg);
  assert(parsedEncJpeg.dims && parsedEncJpeg.dims.w === 8 && parsedEncJpeg.dims.h === 8, "Dimensi JPEG ter-encode terbaca 8x8");

  const tmpPngPath = path.join(process.cwd(), "test-temp-input.png");
  const tmpJpgPath = path.join(process.cwd(), "test-temp-output.jpg");
  fs.writeFileSync(tmpPngPath, fullPng);

  const expRes = imageMod.exportFileToJpeg(tmpPngPath, tmpJpgPath, {
    quality: 95,
    title: "Gunung Bromo Sunrise",
    keywords: ["bromo", "sunrise", "volcano", "indonesia"],
    caption: "Pemandangan indah Gunung Bromo saat matahari terbit",
    author: "Seto Pratama",
  });

  assert(expRes && expRes.size > 0 && expRes.dims.w === 8, "exportFileToJpeg mengekspor berkas");
  assert(fs.existsSync(tmpJpgPath), "Berkas JPEG output dibuat");

  const exportedMeta = meta.readFileMeta(tmpJpgPath);
  const expView = meta.buildExifView(exportedMeta.model, exportedMeta.dims, exportedMeta.iptc, exportedMeta.xmp);
  assert(expView.title === "Gunung Bromo Sunrise", "Metadata EXIF/IPTC Title tersimpan di JPEG: " + expView.title);
  assert(expView.keywords && expView.keywords.includes("bromo"), "Metadata Keywords tersimpan di JPEG");
  assert(expView.author === "Seto Pratama", "Metadata Author tersimpan di JPEG: " + expView.author);

  if (fs.existsSync(tmpPngPath)) fs.unlinkSync(tmpPngPath);
  if (fs.existsSync(tmpJpgPath)) fs.unlinkSync(tmpJpgPath);

  // 17. Export Gambar ke Vektor SVG (VTracer WebAssembly & Metadata Injection)
  const tmpVectorSrc = path.join(process.cwd(), "test-temp-vector-src.jpg");
  const tmpVectorDest = path.join(process.cwd(), "test-temp-vector-dest.svg");
  fs.writeFileSync(tmpVectorSrc, encodeGrayJpeg(16, 16));

  const vecRes = vectorMod.exportFileToVector(tmpVectorSrc, tmpVectorDest, {
    preset: "poster",
    mode: "spline",
    title: "Vektor Grafis Minimalis",
    keywords: ["vektor", "svg", "minimalis", "art"],
    caption: "Ilustrasi vektor berkualitas tinggi",
    author: "Seto Pratama",
  });

  assert(vecRes && vecRes.size > 0, "exportFileToVector menghasilkan berkas SVG");
  assert(fs.existsSync(tmpVectorDest), "Berkas SVG output berhasil dibuat di disk");

  const svgContent = fs.readFileSync(tmpVectorDest, "utf8");
  assert(svgContent.includes("<svg") && svgContent.includes("</svg>"), "Format berkas merupakan SVG valid");
  assert(svgContent.includes("<title>Vektor Grafis Minimalis</title>"), "Tag <title> SVG tersimpan");
  assert(svgContent.includes("<desc>Ilustrasi vektor berkualitas tinggi</desc>"), "Tag <desc> SVG tersimpan");
  assert(svgContent.includes("<rdf:li>vektor</rdf:li>"), "Metadata RDF Dublin Core dc:subject tersimpan di SVG");
  assert(svgContent.includes("<rdf:li>Seto Pratama</rdf:li>"), "Metadata RDF Dublin Core dc:creator tersimpan di SVG");

  // 18. Pengujian Profil Microstock (Cutout & Simplifikasi Node) & Toggle Metadata
  const tmpVectorMicroDest = path.join(process.cwd(), "test-temp-micro.svg");
  vectorMod.exportFileToVector(tmpVectorSrc, tmpVectorMicroDest, {
    profile: "microstock",
    simplify: 1.5,
    maxColors: 32,
    embedMetadata: false, // Uji opsi tanpa metadata
  });

  assert(fs.existsSync(tmpVectorMicroDest), "Berkas SVG profil microstock dibuat");
  const microSvg = fs.readFileSync(tmpVectorMicroDest, "utf8");
  assert(microSvg.includes("<path"), "Kurva path berhasil dihasilkan");

  // 18b. Pengujian Pewarisan Metadata dari Berkas Sumber ke Vektor SVG
  const tmpJpgWithMeta = path.join(process.cwd(), "test-temp-inherit.jpg");
  const tmpSvgInheritDest = path.join(process.cwd(), "test-temp-inherit.svg");
  
  let baseJpgBuf = encodeGrayJpeg(16, 16);
  const iptcApp13 = iptc.buildIptcApp13({
    title: "Lukisan Alam Indonesia",
    keywords: ["lukisan", "alam", "nusantara"],
    author: "Seto Pratama",
  });
  baseJpgBuf = jpeg.insertIptc(baseJpgBuf, iptcApp13);
  baseJpgBuf = jpeg.insertXmp(baseJpgBuf, meta.buildXmpPacket({
    title: "Lukisan Alam Indonesia",
    keywords: ["lukisan", "alam", "nusantara"],
    author: "Seto Pratama",
  }));
  fs.writeFileSync(tmpJpgWithMeta, baseJpgBuf);

  // Export ke SVG tanpa menyertakan title/keywords secara eksplisit di options
  vectorMod.exportFileToVector(tmpJpgWithMeta, tmpSvgInheritDest);
  const inheritedSvgContent = fs.readFileSync(tmpSvgInheritDest, "utf8");
  assert(inheritedSvgContent.includes("<title>Lukisan Alam Indonesia</title>"), "Metadata Title berhasil diwarisi ke berkas SVG");
  assert(inheritedSvgContent.includes("<rdf:li>nusantara</rdf:li>"), "Metadata Keywords berhasil diwarisi ke berkas SVG");
  assert(inheritedSvgContent.includes("<rdf:li>Seto Pratama</rdf:li>"), "Metadata Author berhasil diwarisi ke berkas SVG");

  if (fs.existsSync(tmpVectorSrc)) fs.unlinkSync(tmpVectorSrc);
  if (fs.existsSync(tmpVectorDest)) fs.unlinkSync(tmpVectorDest);
  if (fs.existsSync(tmpVectorMicroDest)) fs.unlinkSync(tmpVectorMicroDest);
  if (fs.existsSync(tmpJpgWithMeta)) fs.unlinkSync(tmpJpgWithMeta);
  if (fs.existsSync(tmpSvgInheritDest)) fs.unlinkSync(tmpSvgInheritDest);

  // 19. Pengujian Parser & Pembacaan Metadata SVG
  const sampleSvg = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 25.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0) -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 width="800px" height="600px" viewBox="0 0 800 600">
  <title>Pantai Kuta Bali &amp; Sunset</title>
  <desc>Pemandangan indah matahari terbenam di Bali</desc>
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <rdf:Description rdf:about="">
        <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Pantai Kuta Bali &amp; Sunset</rdf:li></rdf:Alt></dc:title>
        <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Pemandangan indah matahari terbenam di Bali</rdf:li></rdf:Alt></dc:description>
        <dc:creator><rdf:Seq><rdf:li>Seto Pratama</rdf:li></rdf:Seq></dc:creator>
        <dc:subject><rdf:Bag><rdf:li>bali</rdf:li><rdf:li>sunset</rdf:li><rdf:li>pantai</rdf:li></rdf:Bag></dc:subject>
      </rdf:Description>
    </rdf:RDF>
  </metadata>
  <rect width="800" height="600" fill="#ffaa00" />
</svg>`;

  assert(svg.isSvg(sampleSvg), "isSvg mengenali string XML SVG");
  assert(svg.isSvg(Buffer.from(sampleSvg)), "isSvg mengenali Buffer SVG");
  assert(!svg.isSvg(tiny), "isSvg menolak berkas JPEG");
  assert(!svg.isSvg("bukan svg sama sekali"), "isSvg menolak teks acak non-SVG");

  const parsedSvg = svg.parseSvgMeta(sampleSvg);
  assert(parsedSvg.dims && parsedSvg.dims.w === 800 && parsedSvg.dims.h === 600, "Dimensi SVG (800x600) terekstraksi");
  assert(parsedSvg.title === "Pantai Kuta Bali & Sunset", "Title SVG dengan entitas XML terekstraksi");
  assert(parsedSvg.caption === "Pemandangan indah matahari terbenam di Bali", "Caption / Desc SVG terekstraksi");
  assert(parsedSvg.author === "Seto Pratama", "Author / Creator SVG terekstraksi");
  assert(parsedSvg.keywords && parsedSvg.keywords.includes("sunset") && parsedSvg.keywords.length === 3, "Keywords Dublin Core terekstraksi");
  assert(parsedSvg.software && parsedSvg.software.includes("Adobe Illustrator"), "Software / Generator comment terekstraksi");

  // Simpan berkas SVG sementara dan uji integrasi dengan readFileMeta & buildExifView
  const tmpSvgFile = path.join(process.cwd(), "test-temp-baca.svg");
  fs.writeFileSync(tmpSvgFile, sampleSvg, "utf8");

  const readRes = meta.readFileMeta(tmpSvgFile);
  assert(readRes.isSvg === true, "readFileMeta mengenali berkas sebagai SVG");
  assert(readRes.dims && readRes.dims.w === 800, "Dimensi terisi di hasil readFileMeta");

  const svgView = meta.buildExifView(readRes.model, readRes.dims, readRes.iptc, readRes.xmp, readRes.text, readRes.svgMeta);
  assert(svgView && svgView.title === "Pantai Kuta Bali & Sunset", "buildExifView memetakan title SVG");
  assert(svgView.author === "Seto Pratama", "buildExifView memetakan author SVG");
  assert(svgView.keywords.includes("bali"), "buildExifView memetakan keywords SVG");
  assert(svgView.software && svgView.software.includes("Adobe Illustrator"), "buildExifView memetakan software SVG");

  // Uji penamaan template dengan SVG
  const newSvgName = buildName(tmpSvgFile, "{title}_{width}x{height}", 1, readRes);
  assert(path.basename(newSvgName) === "Pantai Kuta Bali & Sunset_800x600.svg", "buildName menghasilkan nama SVG yang sesuai: " + path.basename(newSvgName));

  if (fs.existsSync(tmpSvgFile)) fs.unlinkSync(tmpSvgFile);

  // 20. Pengujian PNG Chunk zTXt & iTXt Terkompresi (zlib)
  const ztxtKeyword = "Title";
  const ztxtText = "Pemandangan Alam Pegunungan";
  const ztxtPayload = Buffer.concat([
    Buffer.from(ztxtKeyword, "latin1"),
    Buffer.from([0, 0]), // null + compMethod (0)
    zlib.deflateSync(Buffer.from(ztxtText, "utf8")),
  ]);
  const ztxtChunk = png.buildPngChunk("zTXt", ztxtPayload);

  const itxtKeyword = "Description";
  const itxtText = "Keterangan foto terkompresi iTXt dengan utf-8";
  const itxtPayload = Buffer.concat([
    Buffer.from(itxtKeyword, "utf8"),
    Buffer.from([0, 1, 0, 0, 0]), // null + compFlag (1) + compMethod (0) + langTag null + transKw null
    zlib.deflateSync(Buffer.from(itxtText, "utf8")),
  ]);
  const itxtChunk = png.buildPngChunk("iTXt", itxtPayload);

  // Sisipkan chunk zTXt & iTXt ke dalam PNG
  const pngParsed = png.parsePng(tinyPng);
  const ihdrChunkZ = pngParsed.chunks.find((c) => c.type === "IHDR");
  const ihdrEnd = ihdrChunkZ ? ihdrChunkZ.offset + ihdrChunkZ.total : 8;
  const compressedPng = Buffer.concat([
    tinyPng.subarray(0, ihdrEnd),
    ztxtChunk,
    itxtChunk,
    tinyPng.subarray(ihdrEnd),
  ]);

  const decompParsed = png.parsePng(compressedPng);
  const foundZtxt = decompParsed.text.find((t) => t.keyword === "Title");
  const foundItxt = decompParsed.text.find((t) => t.keyword === "Description");
  assert(foundZtxt && foundZtxt.text === ztxtText, "PNG chunk zTXt berhasil didekompresi & dibaca: " + (foundZtxt ? foundZtxt.text : ""));
  assert(foundItxt && foundItxt.text === itxtText, "PNG chunk iTXt (compFlag=1) berhasil didekompresi & dibaca");

  // 21. Pengujian Pembersihan Metadata PNG (removePngMetadata / stripFile)
  const strippedPng = png.removePngMetadata(compressedPng);
  assert(strippedPng && strippedPng.length < compressedPng.length, "removePngMetadata membuang chunk metadata privasi");
  const strippedParsed = png.parsePng(strippedPng);
  assert(strippedParsed.text.length === 0 && !strippedParsed.exif, "Seluruh metadata teks & EXIF terhapus dari PNG");

  // 22. Pengujian Parser Format EPS (.eps)
  const sampleAsciiEps = `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: Adobe Illustrator 28.0
%%For: Budi Santoso
%%Title: Desain Vektor Candi Borobudur
%%CreationDate: 2026-05-20
%%Copyright: 2026 Seto Studio
%%BoundingBox: 0 0 1920 1080
%%HiResBoundingBox: 0 0 1920 1080
%begin_xml_packet:
<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">Desain Vektor Candi Borobudur</rdf:li></rdf:Alt></dc:title>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">Ilustrasi megah candi Borobudur Jawa Tengah</rdf:li></rdf:Alt></dc:description>
   <dc:creator><rdf:Seq><rdf:li>Budi Santoso</rdf:li></rdf:Seq></dc:creator>
   <dc:subject><rdf:Bag><rdf:li>borobudur</rdf:li><rdf:li>temple</rdf:li><rdf:li>indonesia</rdf:li><rdf:li>vector</rdf:li></rdf:Bag></dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
%end_xml_packet
%%EndComments
showpage
%%EOF`;

  assert(epsMod.isEps(Buffer.from(sampleAsciiEps)), "isEps mengenali berkas ASCII EPS");

  const epsParsed = epsMod.parseEpsMeta(Buffer.from(sampleAsciiEps));
  assert(epsParsed.dims && epsParsed.dims.w === 1920 && epsParsed.dims.h === 1080, "Dimensi BoundingBox EPS (1920x1080) terbaca");
  assert(epsParsed.title === "Desain Vektor Candi Borobudur", "Title DSC/XMP EPS terbaca");
  assert(epsParsed.author === "Budi Santoso", "Author/Creator EPS terbaca");
  assert(epsParsed.software && epsParsed.software.includes("Adobe Illustrator"), "Software EPS terbaca");
  assert(epsParsed.keywords && epsParsed.keywords.includes("borobudur") && epsParsed.keywords.length === 4, "Keywords Dublin Core EPS terbaca");

  // Pengujian Binary DOS EPS (dengan 30-byte header C5D0D3C6)
  const psDataBuf = Buffer.from(sampleAsciiEps, "utf8");
  const dosHeader = Buffer.alloc(30);
  dosHeader[0] = 0xc5; dosHeader[1] = 0xd0; dosHeader[2] = 0xd3; dosHeader[3] = 0xc6;
  dosHeader.writeUInt32LE(30, 4); // psOffset = 30
  dosHeader.writeUInt32LE(psDataBuf.length, 8); // psLength
  dosHeader.writeUInt32LE(0, 12); // wmfOffset = 0
  dosHeader.writeUInt32LE(0, 16); // wmfLength = 0
  dosHeader.writeUInt32LE(0, 20); // tiffOffset = 0
  dosHeader.writeUInt32LE(0, 24); // tiffLength = 0
  dosHeader.writeUInt16LE(0xffff, 28); // checksum

  const binaryEpsBuf = Buffer.concat([dosHeader, psDataBuf]);
  assert(epsMod.isEps(binaryEpsBuf), "isEps mengenali berkas Binary DOS EPS");
  const binaryEpsParsed = epsMod.parseEpsMeta(binaryEpsBuf);
  assert(binaryEpsParsed.dims && binaryEpsParsed.dims.w === 1920, "Dimensi dari Binary DOS EPS terbaca dengan benar");
  assert(binaryEpsParsed.title === "Desain Vektor Candi Borobudur", "Title dari Binary DOS EPS terbaca");

  // 23. Integrasi readFileMeta & buildExifView & buildName untuk EPS
  const tmpEpsFile = path.join(process.cwd(), "test-temp-candi.eps");
  fs.writeFileSync(tmpEpsFile, binaryEpsBuf);

  const epsReadRes = meta.readFileMeta(tmpEpsFile);
  assert(epsReadRes.isEps === true, "readFileMeta mengenali file sebagai EPS");
  assert(epsReadRes.dims && epsReadRes.dims.w === 1920 && epsReadRes.dims.h === 1080, "Dimensi EPS terisi di readFileMeta");

  const epsView = meta.buildExifView(epsReadRes.model, epsReadRes.dims, epsReadRes.iptc, epsReadRes.xmp, epsReadRes.text, epsReadRes.svgMeta, epsReadRes.epsMeta);
  assert(epsView && epsView.title === "Desain Vektor Candi Borobudur", "buildExifView memetakan title EPS");
  assert(epsView.author === "Budi Santoso", "buildExifView memetakan author EPS");
  assert(epsView.keywords.includes("borobudur"), "buildExifView memetakan keywords EPS");
  assert(epsView.software.includes("Adobe Illustrator"), "buildExifView memetakan software EPS");

  const epsNewName = buildName(tmpEpsFile, "{title}_{width}x{height}", 1, epsReadRes);
  assert(path.basename(epsNewName) === "Desain Vektor Candi Borobudur_1920x1080.eps", "buildName menghasilkan nama EPS yang sesuai: " + path.basename(epsNewName));

  if (fs.existsSync(tmpEpsFile)) fs.unlinkSync(tmpEpsFile);

  // 24. Pengujian fallback nama file saat export SVG/JPEG dengan judul placeholder atau kosong
  const sampleSrcPath = path.join(process.cwd(), "foto_pemandangan_alam.png");
  const baseName = path.basename(sampleSrcPath, path.extname(sampleSrcPath));
  
  const computeExportName = (srcFile, rawTitle, targetExt) => {
    let title = rawTitle;
    if (typeof title === "string") {
      const trimmed = title.trim();
      if (!trimmed || trimmed === "(tidak ada)" || trimmed === "(belum ada judul)" || trimmed === "-") {
        title = undefined;
      } else {
        title = trimmed;
      }
    }
    const bName = path.basename(srcFile, path.extname(srcFile));
    const sanitizedTitle = title ? utils.sanitizeName(title) : "";
    const destBase = (sanitizedTitle && sanitizedTitle !== "file") ? sanitizedTitle : bName;
    return destBase + targetExt;
  };

  assert(computeExportName(sampleSrcPath, "(tidak ada)", ".svg") === "foto_pemandangan_alam.svg", "Fallback export SVG nama asli saat placeholder '(tidak ada)'");
  assert(computeExportName(sampleSrcPath, "-", ".svg") === "foto_pemandangan_alam.svg", "Fallback export SVG nama asli saat placeholder '-'");
  assert(computeExportName(sampleSrcPath, "", ".svg") === "foto_pemandangan_alam.svg", "Fallback export SVG nama asli saat judul kosong");
  assert(computeExportName(sampleSrcPath, "   ", ".svg") === "foto_pemandangan_alam.svg", "Fallback export SVG nama asli saat judul spasi");
  assert(computeExportName(sampleSrcPath, undefined, ".svg") === "foto_pemandangan_alam.svg", "Fallback export SVG nama asli saat judul undefined");
  assert(computeExportName(sampleSrcPath, "Gunung Bromo Asri", ".svg") === "Gunung Bromo Asri.svg", "Nama export SVG menggunakan judul yang valid");

  console.log("");
  if (fail === 0) {
    console.log("Semua pengujian lulus (" + pass + "/" + pass + ").");
    return true;
  }
  console.error(fail + " dari " + (pass + fail) + " pengujian gagal.");
  process.exitCode = 1;
  return false;
}
