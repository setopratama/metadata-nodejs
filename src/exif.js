// Parser & serializer metadata EXIF (format TIFF) murni JavaScript.
// Mendukung pembacaan dan penulisan tag IFD0, ExifIFD, GPS IFD, Interop IFD,
// serta pelestarian thumbnail (IFD1).

const TYPE_SIZE = {
  1: 1,  // BYTE
  2: 1,  // ASCII
  3: 2,  // SHORT
  4: 4,  // LONG
  5: 8,  // RATIONAL
  6: 1,  // SBYTE
  7: 1,  // UNDEFINED
  8: 2,  // SSHORT
  9: 4,  // SLONG
  10: 8, // SRATIONAL
  11: 4, // FLOAT
  12: 8, // DOUBLE
};

// --- Tag penting ---
export const T = {
  ImageDescription: 0x010e,
  Make: 0x010f,
  Model: 0x0110,
  Orientation: 0x0112,
  Software: 0x0131,
  DateTime: 0x0132,
  Artist: 0x013b,
  Copyright: 0x8298,
  ExposureTime: 0x829a,
  FNumber: 0x829d,
  ISO: 0x8827,
  GPSIFD: 0x8825,
  ExifIFD: 0x8769,
  DateTimeOriginal: 0x9003,
  DateTimeDigitized: 0x9004,
  FocalLength: 0x920a,
  InteropIFD: 0xa005,
  PixelX: 0xa002,
  PixelY: 0xa003,
  LensModel: 0xa434,
  GPSS: {
    VersionID: 0x0000,
    LatRef: 0x0001,
    Lat: 0x0002,
    LonRef: 0x0003,
    Lon: 0x0004,
    AltRef: 0x0005,
    Alt: 0x0006,
    TimeStamp: 0x0007,
    DateStamp: 0x001d,
  },
};

// --- Baca angka dengan urutan byte tertentu ---
function r16(b, o, e) {
  return e === "II" ? b.readUInt16LE(o) : b.readUInt16BE(o);
}
function r32(b, o, e) {
  return e === "II" ? b.readUInt32LE(o) : b.readUInt32BE(o);
}
function w16(b, o, v, e) {
  if (e === "II") b.writeUInt16LE(v, o);
  else b.writeUInt16BE(v, o);
}
function w32(b, o, v, e) {
  if (e === "II") b.writeUInt32LE(v, o);
  else b.writeUInt32BE(v, o);
}

// --- Dekode nilai entry ---
function decodeValue(type, count, raw, e) {
  switch (type) {
    case 1:
    case 6: {
      if (count === 1) return raw[0];
      return Array.from(raw);
    }
    case 2: {
      const s = raw.toString("latin1");
      const i = s.indexOf("\0");
      return i >= 0 ? s.slice(0, i) : s;
    }
    case 3: {
      const a = [];
      for (let i = 0; i < count; i++) a.push(r16(raw, i * 2, e));
      return count === 1 ? a[0] : a;
    }
    case 4: {
      const a = [];
      for (let i = 0; i < count; i++) a.push(r32(raw, i * 4, e));
      return count === 1 ? a[0] : a;
    }
    case 5: {
      const a = [];
      for (let i = 0; i < count; i++) a.push({ n: r32(raw, i * 8, e), d: r32(raw, i * 8 + 4, e) });
      return count === 1 ? a[0] : a;
    }
    case 8: {
      const a = [];
      for (let i = 0; i < count; i++) a.push(e === "II" ? raw.readInt16LE(i * 2) : raw.readInt16BE(i * 2));
      return count === 1 ? a[0] : a;
    }
    case 9: {
      const a = [];
      for (let i = 0; i < count; i++) a.push(e === "II" ? raw.readInt32LE(i * 4) : raw.readInt32BE(i * 4));
      return count === 1 ? a[0] : a;
    }
    case 10: {
      const a = [];
      for (let i = 0; i < count; i++) {
        const n = r32(raw, i * 8, e) | 0;
        const d = r32(raw, i * 8 + 4, e) | 0;
        a.push({ n, d });
      }
      return count === 1 ? a[0] : a;
    }
    default:
      // UNDEFINED, FLOAT, DOUBLE, dll: simpan byte mentah agar bisa dipertahankan
      return Buffer.from(raw);
  }
}

// --- Enkode nilai entry ---
function encodeValue(type, value, e) {
  switch (type) {
    case 2: {
      let s = value == null ? "" : String(value);
      if (!s.endsWith("\0")) s += "\0";
      return Buffer.from(s, "latin1");
    }
    case 1:
    case 6: {
      const a = Array.isArray(value) ? value : [value];
      return Buffer.from(a);
    }
    case 3: {
      const a = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(a.length * 2);
      a.forEach((v, i) => w16(b, i * 2, v & 0xffff, e));
      return b;
    }
    case 4: {
      const a = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(a.length * 4);
      a.forEach((v, i) => w32(b, i * 4, v >>> 0, e));
      return b;
    }
    case 5: {
      const list = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(list.length * 8);
      list.forEach((r, i) => {
        w32(b, i * 8, (r.n >>> 0) || 0, e);
        w32(b, i * 8 + 4, (r.d >>> 0) || 0, e);
      });
      return b;
    }
    case 8: {
      const a = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(a.length * 2);
      a.forEach((v, i) => (e === "II" ? b.writeInt16LE(v, i * 2) : b.writeInt16BE(v, i * 2)));
      return b;
    }
    case 9: {
      const a = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(a.length * 4);
      a.forEach((v, i) => (e === "II" ? b.writeInt32LE(v, i * 4) : b.writeInt32BE(v, i * 4)));
      return b;
    }
    case 10: {
      const list = Array.isArray(value) ? value : [value];
      const b = Buffer.alloc(list.length * 8);
      list.forEach((r, i) => {
        const n = (r.n | 0) || 0;
        const d = (r.d | 0) || 0;
        if (e === "II") {
          b.writeInt32LE(n, i * 8);
          b.writeInt32LE(d, i * 8 + 4);
        } else {
          b.writeInt32BE(n, i * 8);
          b.writeInt32BE(d, i * 8 + 4);
        }
      });
      return b;
    }
    default: {
      // Byte mentah (UNDEFINED, dll.)
      if (Buffer.isBuffer(value)) return Buffer.from(value);
      return Buffer.alloc(0);
    }
  }
}

// --- Helper entry ---
export function findTag(entries, tag) {
  return entries && entries.find((en) => en.tag === tag);
}
export function setTag(entries, tag, type, value) {
  const entry = { tag, type, count: 1, value };
  const i = entries.findIndex((en) => en.tag === tag);
  if (i >= 0) entries[i] = entry;
  else entries.push(entry);
  return entry;
}
export function removeTag(entries, tag) {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].tag === tag) entries.splice(i, 1);
  }
}

export function createEmptyModel() {
  return { endian: "II", ifd0: [], exif: [], gps: [], interop: null, ifd1: null, thumbnail: null };
}

// --- Baca satu IFD ---
function parseIfd(buf, tiffStart, off, e) {
  if (!off || off <= 0) return null;
  const base = tiffStart + off;
  if (base + 2 > buf.length) return null;
  const count = r16(buf, base, e);
  if (count > 512) return null; // pengaman ukuran
  const entries = [];
  for (let i = 0; i < count; i++) {
    const p = base + 2 + i * 12;
    if (p + 12 > buf.length) break;
    const tag = r16(buf, p, e);
    const type = r16(buf, p + 2, e);
    const n = r32(buf, p + 4, e);
    const ts = TYPE_SIZE[type];
    if (!ts || n > 100000) {
      // Tipe tak dikenal: simpan byte mentah dari field nilai (maks. 4 byte inline).
      // count dibuat sesuai panjang byte aktual agar round-trip tetap konsisten.
      const raw4 = buf.subarray(p + 8, Math.min(p + 12, buf.length));
      entries.push({ tag, type, count: raw4.length, value: Buffer.from(raw4) });
      continue;
    }
    const size = ts * n;
    let raw;
    if (size <= 4) {
      raw = buf.subarray(p + 8, p + 8 + size);
    } else {
      const doff = r32(buf, p + 8, e);
      if (doff >= 0 && tiffStart + doff + size <= buf.length) {
        raw = buf.subarray(tiffStart + doff, tiffStart + doff + size);
      } else {
        raw = Buffer.alloc(size);
      }
    }
    entries.push({ tag, type, count: n, value: decodeValue(type, n, raw, e) });
  }
  const np = base + 2 + count * 12;
  const nextOff = np + 4 <= buf.length ? r32(buf, np, e) : 0;
  return { entries, nextOff };
}

/**
 * Parsing struktur TIFF/EXIF dari buffer file JPEG.
 * @param {Buffer} buf   Buffer file JPEG penuh
 * @param {number} tiffStart  Offset awal TIFF (setelah "Exif\0\0")
 * @param {number} tiffEnd    Offset akhir TIFF (akhir payload APP1)
 */
export function parseTiff(buf, tiffStart, tiffEnd) {
  if (tiffEnd > buf.length) tiffEnd = buf.length;
  const endian = buf.subarray(tiffStart, tiffStart + 2).toString("latin1");
  if (endian !== "II" && endian !== "MM") throw new Error("Header TIFF tidak dikenali");
  if (r16(buf, tiffStart + 2, endian) !== 42) throw new Error("Magic TIFF tidak valid");

  const ifd0Off = r32(buf, tiffStart + 4, endian);
  const d0 = parseIfd(buf, tiffStart, ifd0Off, endian);
  if (!d0) throw new Error("IFD0 tidak dapat dibaca");

  const model = createEmptyModel();
  model.endian = endian;
  model.ifd0 = d0.entries.filter((en) => en.tag !== T.ExifIFD && en.tag !== T.GPSIFD);

  const exifPtr = findTag(d0.entries, T.ExifIFD);
  if (exifPtr && typeof exifPtr.value === "number") {
    const d1 = parseIfd(buf, tiffStart, exifPtr.value, endian);
    if (d1) {
      model.exif = d1.entries.filter((en) => en.tag !== T.InteropIFD);
      const ip = findTag(d1.entries, T.InteropIFD);
      if (ip && typeof ip.value === "number") {
        const di = parseIfd(buf, tiffStart, ip.value, endian);
        if (di) model.interop = di.entries;
      }
    }
  }

  const gpsPtr = findTag(d0.entries, T.GPSIFD);
  if (gpsPtr && typeof gpsPtr.value === "number") {
    const dg = parseIfd(buf, tiffStart, gpsPtr.value, endian);
    if (dg) model.gps = dg.entries;
  }

  if (d0.nextOff) {
    const d1f = parseIfd(buf, tiffStart, d0.nextOff, endian);
    if (d1f) {
      const offE = findTag(d1f.entries, 0x0201); // JPEGInterchangeFormat
      const lenE = findTag(d1f.entries, 0x0202); // JPEGInterchangeFormatLength
      if (
        offE && typeof offE.value === "number" && lenE && typeof lenE.value === "number" &&
        lenE.value > 0 && tiffStart + offE.value + lenE.value <= buf.length
      ) {
        model.thumbnail = Buffer.from(
          buf.subarray(tiffStart + offE.value, tiffStart + offE.value + lenE.value)
        );
      }
      model.ifd1 = d1f.entries.filter((en) => en.tag !== 0x0201 && en.tag !== 0x0202);
    }
  }
  return model;
}

/**
 * Serialisasi model EXIF menjadi buffer TIFF.
 * Susunan: header TIFF, IFD0, ExifIFD, GPS, Interop, IFD1, area data, thumbnail.
 */
export function serializeTiff(model) {
  const e = model.endian === "MM" ? "MM" : "II";

  const ifd0 = (model.ifd0 || []).slice();
  const exif = model.exif && model.exif.length ? model.exif.slice() : null;
  const gps = model.gps && model.gps.length ? model.gps.slice() : null;
  const interop = model.interop && model.interop.length ? model.interop.slice() : null;
  const ifd1 = model.ifd1 && model.ifd1.length ? model.ifd1.slice() : null;
  const thumb = model.thumbnail && model.thumbnail.length ? model.thumbnail : null;

  // Pointer antar-IFD
  if (exif) ifd0.push({ tag: T.ExifIFD, type: 4, count: 1, value: 0, _ptr: "exif" });
  if (gps) ifd0.push({ tag: T.GPSIFD, type: 4, count: 1, value: 0, _ptr: "gps" });
  if (interop && exif) exif.push({ tag: T.InteropIFD, type: 4, count: 1, value: 0, _ptr: "interop" });
  if (ifd1 && thumb) {
    ifd1.push({ tag: 0x0201, type: 4, count: 1, value: 0, _thumb: "off" });
    ifd1.push({ tag: 0x0202, type: 4, count: 1, value: 0, _thumb: "len" });
  }

  const sections = [{ key: "ifd0", entries: ifd0 }];
  if (exif) sections.push({ key: "exif", entries: exif });
  if (gps) sections.push({ key: "gps", entries: gps });
  if (interop) sections.push({ key: "interop", entries: interop });
  if (ifd1) sections.push({ key: "ifd1", entries: ifd1 });
  const byKey = {};
  for (const s of sections) byKey[s.key] = s;

  // Spesifikasi TIFF: entry IFD harus diurutkan menaik berdasarkan tag.
  for (const s of sections) s.entries.sort((a, b) => a.tag - b.tag);

  // Enkode nilai
  for (const s of sections) {
    s.blobs = [];
    for (const en of s.entries) {
      en._bytes = encodeValue(en.type, en.value, e);
      if (en._bytes.length > 4 && en._thumb === undefined) {
        en._blob = s.blobs.length;
        s.blobs.push(en._bytes);
      } else {
        en._blob = -1;
      }
    }
  }

  // Layout: header + IFD + area data + thumbnail
  let cursor = 8;
  for (const s of sections) {
    s.offset = cursor;
    cursor += 2 + s.entries.length * 12 + 4;
  }
  for (const s of sections) {
    s.dataOffset = cursor;
    for (const b of s.blobs) cursor += b.length;
  }
  let thumbOffset = 0;
  if (thumb) {
    thumbOffset = cursor;
    cursor += thumb.length;
  }

  const tiff = Buffer.alloc(cursor);
  tiff.write(e, 0, "latin1");
  tiff[2] = e === "II" ? 0x2a : 0x00;
  tiff[3] = e === "II" ? 0x00 : 0x2a;
  w32(tiff, 4, sections[0].offset, e);

  for (const s of sections) {
    const p = s.offset;
    w16(tiff, p, s.entries.length, e);
    for (let i = 0; i < s.entries.length; i++) {
      const en = s.entries[i];
      const q = p + 2 + i * 12;
      w16(tiff, q, en.tag, e);
      w16(tiff, q + 2, en.type, e);
      const count = en.type === 2
        ? en._bytes.length
        : Math.floor(en._bytes.length / (TYPE_SIZE[en.type] || 1));
      w32(tiff, q + 4, count, e);
      if (en._thumb === "off") w32(tiff, q + 8, thumbOffset, e);
      else if (en._thumb === "len") w32(tiff, q + 8, thumb.length, e);
      else if (en._ptr === "exif") w32(tiff, q + 8, byKey.exif.offset, e);
      else if (en._ptr === "gps") w32(tiff, q + 8, byKey.gps.offset, e);
      else if (en._ptr === "interop") w32(tiff, q + 8, byKey.interop.offset, e);
      else if (en._blob >= 0) {
        let off = s.dataOffset;
        for (let k = 0; k < en._blob; k++) off += s.blobs[k].length;
        w32(tiff, q + 8, off, e);
      } else {
        en._bytes.copy(tiff, q + 8);
      }
    }
    // Pointer IFD berikutnya (hanya IFD0 yang dapat menunjuk ke IFD1)
    const np = p + 2 + s.entries.length * 12;
    let next = 0;
    if (s.key === "ifd0" && byKey.ifd1) next = byKey.ifd1.offset;
    w32(tiff, np, next, e);
  }

  // Area data
  for (const s of sections) {
    let off = s.dataOffset;
    for (const b of s.blobs) {
      b.copy(tiff, off);
      off += b.length;
    }
  }
  if (thumb) thumb.copy(tiff, thumbOffset);
  return tiff;
}

// --- GPS ---
export function decimalToGps(lat, lon) {
  const entries = [
    { tag: T.GPSS.VersionID, type: 1, count: 4, value: [2, 3, 0, 0] },
    { tag: T.GPSS.LatRef, type: 2, count: 2, value: lat >= 0 ? "N" : "S" },
    { tag: T.GPSS.Lat, type: 5, count: 3, value: toRationals(Math.abs(lat)) },
    { tag: T.GPSS.LonRef, type: 2, count: 2, value: lon >= 0 ? "E" : "W" },
    { tag: T.GPSS.Lon, type: 5, count: 3, value: toRationals(Math.abs(lon)) },
  ];
  return entries;
}

export function toRationals(v) {
  const deg = Math.floor(v);
  const mf = (v - deg) * 60;
  const min = Math.floor(mf);
  const sf = (mf - min) * 60;
  const sec = Math.round(sf * 100) / 100;
  return [
    { n: deg, d: 1 },
    { n: min, d: 1 },
    { n: Math.round(sec * 100), d: 100 },
  ];
}

export function gpsToDecimal(rationals) {
  const list = Array.isArray(rationals) ? rationals : [rationals];
  const d = list[0] && list[0].d ? list[0].n / list[0].d : 0;
  const m = list[1] && list[1].d ? list[1].n / list[1].d : 0;
  const s = list[2] && list[2].d ? list[2].n / list[2].d : 0;
  return d + m / 60 + s / 3600;
}

