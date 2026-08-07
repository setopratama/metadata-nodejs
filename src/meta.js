// Modul tingkat tinggi: membaca, mengubah, dan menghapus metadata EXIF & IPTC.
import fs from "node:fs";
import * as jpeg from "./jpeg.js";
import * as png from "./png.js";
import * as exif from "./exif.js";
import * as iptc from "./iptc.js";
import { parseDateInput, toExifDate } from "./utils.js";

export const ORIENTATION_LABELS = {
  1: "Normal",
  2: "Flip horizontal",
  3: "Rotasi 180",
  4: "Flip vertikal",
  5: "Rotasi 90 + flip",
  6: "Rotasi 90 (searah jarum jam)",
  7: "Rotasi 270 + flip",
  8: "Rotasi 270 (berlawanan jarum jam)",
};

/** Baca informasi + model EXIF dari satu file. */
export function readFileMeta(filePath) {
  const buf = fs.readFileSync(filePath);
  const st = fs.statSync(filePath);
  const isJpeg = jpeg.isJpeg(buf);
  const isPng = png.isPng(buf);
  const r = {
    file: filePath,
    size: st.size,
    mtime: st.mtime,
    isJpeg,
    isPng,
    exifPresent: false,
    model: null,
    iptc: null,
    dims: null,
    exifError: null,
  };
  if (!isJpeg && !isPng) return r;

  if (isJpeg) {
    const parsed = jpeg.parseJpeg(buf);
    r.dims = parsed.dims;
    if (parsed.exif) {
      const tStart = parsed.exif.payloadStart + 6;
      const tEnd = parsed.exif.payloadStart + parsed.exif.payloadLen;
      try {
        r.model = exif.parseTiff(buf, tStart, tEnd);
        r.exifPresent = true;
      } catch (e) {
        r.exifError = e.message;
      }
    }
    if (parsed.iptc) {
      r.iptc = iptc.readIptcFromApp13(
        buf.subarray(parsed.iptc.payloadStart, parsed.iptc.payloadStart + parsed.iptc.payloadLen)
      );
    }
  } else if (isPng) {
    const parsed = png.parsePng(buf);
    r.dims = parsed.dims;
    if (parsed.exif) {
      const tStart = parsed.exif.payloadStart;
      const tEnd = parsed.exif.payloadStart + parsed.exif.payloadLen;
      try {
        r.model = exif.parseTiff(buf, tStart, tEnd);
        r.exifPresent = true;
      } catch (e) {
        r.exifError = e.message;
      }
    }
  }
  return r;
}

function val(entries, tag) {
  const e = exif.findTag(entries, tag);
  return e ? e.value : undefined;
}

/**
 * Ubah model EXIF (+ data IPTC) menjadi objek tampilan yang ramah.
 * @param {object|null} model    Model EXIF (dari exif.parseTiff), boleh null
 * @param {object|null} dims     { w, h }
 * @param {object|null} iptcData { title, keywords[], caption, author } (dari iptc.readIptcFromApp13)
 */
export function buildExifView(model, dims, iptcData) {
  const ifd0 = (model && model.ifd0) || [];
  const ex = (model && model.exif) || [];
  const gp = (model && model.gps) || [];

  let gps = null;
  const latR = val(gp, exif.T.GPSS.Lat);
  const lonR = val(gp, exif.T.GPSS.Lon);
  if (latR && lonR) {
    const latRef = val(gp, exif.T.GPSS.LatRef) || "N";
    const lonRef = val(gp, exif.T.GPSS.LonRef) || "E";
    const lat = exif.gpsToDecimal(latR) * (latRef === "S" ? -1 : 1);
    const lon = exif.gpsToDecimal(lonR) * (lonRef === "W" ? -1 : 1);
    const altR = val(gp, exif.T.GPSS.Alt);
    const altRef = val(gp, exif.T.GPSS.AltRef);
    const alt = altR && altR.d ? (altR.n / altR.d) * (altRef === 1 ? -1 : 1) : null;
    gps = {
      lat, lon, latRef, lonRef, alt, altRef,
      dateStamp: val(gp, exif.T.GPSS.DateStamp),
    };
  }

  const width = val(ex, exif.T.PixelX) || (dims && dims.w) || null;
  const height = val(ex, exif.T.PixelY) || (dims && dims.h) || null;

  return {
    make: val(ifd0, exif.T.Make) || null,
    model: val(ifd0, exif.T.Model) || null,
    lens: val(ex, exif.T.LensModel) || null,
    software: val(ifd0, exif.T.Software) || null,
    artist: val(ifd0, exif.T.Artist) || null,
    copyright: val(ifd0, exif.T.Copyright) || null,
    description: val(ifd0, exif.T.ImageDescription) || null,
    orientation: val(ifd0, exif.T.Orientation) || null,
    dateTime: val(ifd0, exif.T.DateTime) || null,
    dateTimeOriginal: val(ex, exif.T.DateTimeOriginal) || null,
    dateTimeDigitized: val(ex, exif.T.DateTimeDigitized) || null,
    exposureTime: val(ex, exif.T.ExposureTime) || null,
    fNumber: val(ex, exif.T.FNumber) || null,
    iso: val(ex, exif.T.ISO) || null,
    focalLength: val(ex, exif.T.FocalLength) || null,
    width,
    height,
    gps,
    // IPTC (Windows: Properties -> Details)
    title: (iptcData && iptcData.title) || val(ifd0, exif.T.ImageDescription) || null,
    keywords: (iptcData && iptcData.keywords) || [],
    caption: (iptcData && iptcData.caption) || val(ifd0, exif.T.ImageDescription) || null,
    author: (iptcData && iptcData.author) || null,
  };
}

/**
 * Terapkan perubahan dari opsi CLI ke model EXIF.
 * Opsi yang dikenali: date, gps, gps-alt, gps-time, remove-gps, make, model,
 * lens, software, artist, copyright, description, orientation.
 * @param {boolean} allowNoop Jangan lempar error bila tidak ada opsi EXIF
 *                           (mis. saat hanya field IPTC yang diubah).
 * @returns {boolean} true bila ada tag EXIF yang diubah
 */
export function applyEdits(model, opts, allowNoop = false) {
  let touched = false;

  if (opts.date) {
    const d = parseDateInput(opts.date);
    if (!d) throw new Error("Format tanggal salah: " + opts.date + " (contoh: 2020-01-15 08:30:00)");
    const s = toExifDate(d);
    if (!model.exif) model.exif = [];
    exif.setTag(model.ifd0, exif.T.DateTime, 2, s);
    exif.setTag(model.exif, exif.T.DateTimeOriginal, 2, s);
    exif.setTag(model.exif, exif.T.DateTimeDigitized, 2, s);
    touched = true;
  }

  if (opts.gps) {
    const parts = String(opts.gps).split(",").map((x) => parseFloat(x.trim()));
    if (
      parts.length < 2 ||
      !Number.isFinite(parts[0]) || !Number.isFinite(parts[1]) ||
      Math.abs(parts[0]) > 90 || Math.abs(parts[1]) > 180
    ) {
      throw new Error("Format GPS salah: " + opts.gps + " (contoh: -6.2088,106.8456)");
    }
    if (!model.gps) model.gps = [];
    for (const t of [
      exif.T.GPSS.LatRef, exif.T.GPSS.Lat, exif.T.GPSS.LonRef, exif.T.GPSS.Lon,
      exif.T.GPSS.AltRef, exif.T.GPSS.Alt, exif.T.GPSS.TimeStamp, exif.T.GPSS.DateStamp,
    ]) {
      exif.removeTag(model.gps, t);
    }
    for (const en of exif.decimalToGps(parts[0], parts[1])) model.gps.push(en);

    if (opts["gps-alt"] !== undefined && opts["gps-alt"] !== null) {
      const alt = parseFloat(opts["gps-alt"]);
      if (!Number.isFinite(alt)) throw new Error("--gps-alt harus angka (meter).");
      exif.setTag(model.gps, exif.T.GPSS.AltRef, 1, alt < 0 ? 1 : 0);
      exif.setTag(model.gps, exif.T.GPSS.Alt, 5, { n: Math.round(Math.abs(alt) * 1000), d: 1000 });
    }
    if (opts["gps-time"]) {
      const m = String(opts["gps-time"]).match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
      if (!m) throw new Error("--gps-time harus format HH:MM:SS.");
      exif.setTag(model.gps, exif.T.GPSS.TimeStamp, 5, [
        { n: +m[1], d: 1 }, { n: +m[2], d: 1 }, { n: +m[3], d: 1 },
      ]);
    }
    const stampDate = opts.date ? parseDateInput(opts.date) : new Date();
    exif.setTag(model.gps, exif.T.GPSS.DateStamp, 2, toExifDate(stampDate).slice(0, 10));
    touched = true;
  }

  if (opts["remove-gps"]) {
    model.gps = [];
    touched = true;
  }

  // Tag teks di IFD0
  const ifd0Text = [
    [exif.T.Make, "make"],
    [exif.T.Model, "model"],
    [exif.T.Software, "software"],
    [exif.T.Artist, "artist"],
    [exif.T.Copyright, "copyright"],
    [exif.T.ImageDescription, "description"],
  ];
  for (const [tag, key] of ifd0Text) {
    if (opts[key] !== undefined && opts[key] !== null) {
      exif.setTag(model.ifd0, tag, 2, String(opts[key]));
      touched = true;
    }
  }

  if (opts.title !== undefined && opts.title !== null && (opts.description === undefined || opts.description === null)) {
    exif.setTag(model.ifd0, exif.T.ImageDescription, 2, String(opts.title));
    touched = true;
  }

  // Tag teks di ExifIFD
  if (opts.lens !== undefined && opts.lens !== null) {
    if (!model.exif) model.exif = [];
    exif.setTag(model.exif, exif.T.LensModel, 2, String(opts.lens));
    touched = true;
  }

  if (opts.orientation !== undefined && opts.orientation !== null) {
    const o = parseInt(opts.orientation, 10);
    if (!(o >= 1 && o <= 8)) throw new Error("--orientation harus angka 1-8.");
    exif.setTag(model.ifd0, exif.T.Orientation, 3, o);
    touched = true;
  }

  if (!touched && !allowNoop) throw new Error("Tidak ada perubahan yang diminta.");
  return touched;
}

/**
 * Gabungkan field IPTC lama dengan opsi CLI (opsi yang ada menimpa, yang tidak
 * disebut tetap dipertahankan). `--keywords ""` atau `--title ""` menghapus field
 * (hasilnya mungkin kosong; penanganan penghapusan ada di editFile).
 * `--keywords "a, b, c"` dipisah koma menjadi array; bila nilainya sudah berupa
 * array (dari perintah apply / keyword.txt), dipakai langsung apa adanya agar
 * koma di dalam satu keyword tidak terpecah.
 * Selalu mengembalikan objek field (boleh kosong) — panggil hanya bila ada opsi IPTC.
 */
export function collectIptcEdits(opts, base) {
  const b = base || { title: null, keywords: [], caption: null, author: null };
  return {
    title: opts.title !== undefined && opts.title !== null ? String(opts.title) : b.title,
    keywords:
      opts.keywords !== undefined && opts.keywords !== null
        ? Array.isArray(opts.keywords)
          ? opts.keywords.map((s) => String(s).trim()).filter(Boolean)
          : String(opts.keywords).split(",").map((s) => s.trim()).filter(Boolean)
        : (b.keywords || []),
    caption: opts.caption !== undefined && opts.caption !== null ? String(opts.caption) : b.caption,
    author: opts.author !== undefined && opts.author !== null ? String(opts.author) : b.author,
  };
}

/** Edit metadata satu file (dengan cadangan .bak secara default). */
export function editFile(filePath, opts) {
  const buf = fs.readFileSync(filePath);
  const isJp = jpeg.isJpeg(buf);
  const isPn = png.isPng(buf);
  if (!isJp && !isPn) throw new Error("Format tidak didukung (hanya JPEG dan PNG): " + filePath);

  let model = null;
  let beforeIptc = null;
  let dims = null;

  if (isJp) {
    const parsed = jpeg.parseJpeg(buf);
    dims = parsed.dims;
    model = parsed.exif
      ? exif.parseTiff(buf, parsed.exif.payloadStart + 6, parsed.exif.payloadStart + parsed.exif.payloadLen)
      : exif.createEmptyModel();
    beforeIptc = parsed.iptc
      ? iptc.readIptcFromApp13(
          buf.subarray(parsed.iptc.payloadStart, parsed.iptc.payloadStart + parsed.iptc.payloadLen)
        )
      : null;
  } else if (isPn) {
    const parsed = png.parsePng(buf);
    dims = parsed.dims;
    model = parsed.exif
      ? exif.parseTiff(buf, parsed.exif.payloadStart, parsed.exif.payloadStart + parsed.exif.payloadLen)
      : exif.createEmptyModel();
  }

  const before = buildExifView(model, dims, beforeIptc);

  // Field IPTC yang akan ditulis (gabungan lama + opsi CLI)
  const hasIptcOpts = ["title", "keywords", "caption", "author"].some(
    (k) => opts[k] !== undefined && opts[k] !== null
  );
  // IPTC (APP13) hanya diterapkan untuk JPEG; di PNG field ini tidak diset ke segmen APP13
  const iptcFields = isJp && hasIptcOpts ? collectIptcEdits(opts, beforeIptc) : null;

  const touchedExif = applyEdits(model, opts, hasIptcOpts);

  let out = buf;
  if (touchedExif) {
    const tiff = exif.serializeTiff(model);
    if (isJp) {
      out = jpeg.insertExif(buf, jpeg.buildExifApp1(tiff));
    } else if (isPn) {
      out = png.insertExif(buf, tiff);
    }
  }

  // Perubahan IPTC (title/keywords/caption/author) diterapkan di segmen APP13 (JPEG).
  if (iptcFields && isJp) {
    const app13 = iptc.buildIptcApp13(iptcFields, beforeIptc && beforeIptc.others);
    if (app13) {
      out = jpeg.insertIptc(out, app13);
    } else {
      // Semua field IPTC dikosongkan dan tidak ada resource lain → buang APP13
      const noIptc = jpeg.removeIptc(out);
      if (noIptc) out = noIptc;
    }
  }

  // Jangan tulis ulang bila sebenarnya tidak ada perubahan
  const madeChanges = out !== buf;
  const makeBackup = madeChanges && opts["no-backup"] === false;
  if (madeChanges) {
    if (makeBackup) fs.copyFileSync(filePath, filePath + ".bak");
    fs.writeFileSync(filePath, out);
    if (opts.touch && opts.date) {
      const d = parseDateInput(opts.date);
      if (d) fs.utimesSync(filePath, d, d);
    }
  }

  let after = null;
  if (isJp) {
    const p2 = jpeg.parseJpeg(out);
    if (p2.exif) {
      const afterIptc = p2.iptc
        ? iptc.readIptcFromApp13(
            out.subarray(p2.iptc.payloadStart, p2.iptc.payloadStart + p2.iptc.payloadLen)
          )
        : null;
      after = buildExifView(
        exif.parseTiff(out, p2.exif.payloadStart + 6, p2.exif.payloadStart + p2.exif.payloadLen),
        dims,
        afterIptc
      );
    } else if (p2.iptc) {
      const afterIptc = iptc.readIptcFromApp13(
        out.subarray(p2.iptc.payloadStart, p2.iptc.payloadStart + p2.iptc.payloadLen)
      );
      after = buildExifView(null, dims, afterIptc);
    }
  } else if (isPn) {
    const p2 = png.parsePng(out);
    if (p2.exif) {
      after = buildExifView(
        exif.parseTiff(out, p2.exif.payloadStart, p2.exif.payloadStart + p2.exif.payloadLen),
        dims,
        null
      );
    }
  }
  return { file: filePath, before, after, backup: makeBackup };
}

/**
 * Hapus semua metadata dari satu file: EXIF, IPTC, XMP.
 */
export function stripFile(filePath, opts) {
  const buf = fs.readFileSync(filePath);
  const isJp = jpeg.isJpeg(buf);
  const isPn = png.isPng(buf);
  if (!isJp && !isPn) throw new Error("Format tidak didukung (hanya JPEG dan PNG): " + filePath);

  let out = buf;
  if (isJp) {
    const noExif = jpeg.removeExif(buf);
    if (noExif) out = noExif;
    const noIptc = jpeg.removeIptc(out);
    if (noIptc) out = noIptc;
    const noXmp = jpeg.removeXmp(out);
    if (noXmp) out = noXmp;
  } else if (isPn) {
    const noExif = png.removeExif(buf);
    if (noExif) out = noExif;
  }

  if (out === buf) return { file: filePath, stripped: false };
  if (opts["no-backup"] === false) fs.copyFileSync(filePath, filePath + ".bak");
  fs.writeFileSync(filePath, out);
  return { file: filePath, stripped: true };
}
