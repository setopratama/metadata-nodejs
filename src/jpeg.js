// Parser & manipulasi struktur file JPEG (segmen, APP1/EXIF, APP13/IPTC, XMP, dimensi).
// Murni JavaScript, tanpa dependensi.

const STANDALONE = new Set([0xd8, 0xd9, 0x01]); // marker tanpa panjang

// SOF (Start of Frame) yang membawa dimensi: C0-C3, C5-C7, C9-CB, CD-CF
// (kecuali DHT=0xC4, JPG=0xC8, DAC=0xCC)
function isSof(marker) {
  return (
    marker >= 0xc0 && marker <= 0xcf &&
    marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
  );
}

export function isJpeg(buf) {
  return buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8;
}

/**
 * Pindai segmen-segmen JPEG.
 * @returns {object} { segments, exif, iptc, xmp, dims }
 *  - exif: { offset, total, payloadStart, payloadLen } dari segmen APP1 "Exif", atau null
 *  - iptc: APP13 "Photoshop 3.0" (metadata IPTC), atau null
 *  - xmp:  APP1 "http://ns.adobe.com/xap/1.0/" (metadata XMP), atau null
 *  - dims: { w, h } dari segmen SOF, atau null
 */
export function parseJpeg(buf) {
  const segments = [];
  let exif = null;
  let iptc = null;
  let xmp = null;
  let dims = null;
  const len = buf.length;
  let off = 2; // lewati SOI (FF D8)

  while (off + 1 < len) {
    if (buf[off] !== 0xff) {
      // Toleransi byte aneh sebelum marker berikutnya
      off += 1;
      continue;
    }
    const marker = buf[off + 1];
    if (marker === 0xff) {
      off += 1;
      continue;
    }
    if (STANDALONE.has(marker)) {
      if (marker === 0xd9) break; // EOI
      off += 2;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      off += 2; // marker restart (tanpa panjang)
      continue;
    }
    if (off + 4 > len) break;
    const segLen = buf.readUInt16BE(off + 2);
    if (segLen < 2 || off + 2 + segLen > len) break;
    const payloadStart = off + 4;
    const payloadLen = segLen - 2;
    const total = 2 + segLen;
    segments.push({ marker, offset: off, payloadStart, payloadLen, total });

    if (
      marker === 0xe1 &&
      payloadLen >= 6 &&
      buf.subarray(payloadStart, payloadStart + 6).toString("latin1") === "Exif\0\0"
    ) {
      exif = { offset: off, total, payloadStart, payloadLen };
    }
    if (
      marker === 0xed &&
      payloadLen >= 14 &&
      buf.subarray(payloadStart, payloadStart + 14).toString("latin1") === "Photoshop 3.0\0"
    ) {
      iptc = { offset: off, total, payloadStart, payloadLen };
    }
    if (
      marker === 0xe1 &&
      payloadLen >= 29 &&
      buf.subarray(payloadStart, payloadStart + 29).toString("latin1") === "http://ns.adobe.com/xap/1.0/\0"
    ) {
      xmp = { offset: off, total, payloadStart, payloadLen };
    }
    if (isSof(marker) && payloadLen >= 5 && !dims) {
      dims = {
        h: buf.readUInt16BE(payloadStart + 1),
        w: buf.readUInt16BE(payloadStart + 3),
      };
    }
    if (marker === 0xda) break; // SOS: setelah ini data entropy, berhenti
    off += total;
  }
  return { segments, exif, iptc, xmp, dims };
}

/** Bangun segmen APP1 lengkap (FF E1 + panjang + "Exif\0\0" + TIFF). */
export function buildExifApp1(tiff) {
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const seg = Buffer.alloc(2 + 2 + payload.length);
  seg.writeUInt16BE(0xffe1, 0);
  seg.writeUInt16BE(2 + payload.length, 2);
  payload.copy(seg, 4);
  return seg;
}

/**
 * Sisipkan/ganti segmen APP1 EXIF.
 * APP1 lama (jika ada) dibuang, lalu APP1 baru ditaruh tepat setelah SOI.
 */
export function insertExif(buf, app1) {
  const parsed = parseJpeg(buf);
  let base = buf;
  if (parsed.exif) {
    base = Buffer.concat([
      buf.subarray(0, parsed.exif.offset),
      buf.subarray(parsed.exif.offset + parsed.exif.total),
    ]);
  }
  return Buffer.concat([base.subarray(0, 2), app1, base.subarray(2)]);
}

/** Buang segmen APP1 EXIF. Mengembalikan null bila tidak ada EXIF. */
export function removeExif(buf) {
  const parsed = parseJpeg(buf);
  if (!parsed.exif) return null;
  return Buffer.concat([
    buf.subarray(0, parsed.exif.offset),
    buf.subarray(parsed.exif.offset + parsed.exif.total),
  ]);
}

/**
 * Ganti segmen APP13 "Photoshop 3.0" dengan yang baru, atau sisipkan setelah SOI.
 * @param {Buffer} buf   Buffer file JPEG penuh
 * @param {Buffer} app13 Segmen APP13 lengkap (dari iptc.buildIptcApp13)
 */
export function insertIptc(buf, app13) {
  const parsed = parseJpeg(buf);
  let base = buf;
  if (parsed.iptc) {
    base = Buffer.concat([
      buf.subarray(0, parsed.iptc.offset),
      buf.subarray(parsed.iptc.offset + parsed.iptc.total),
    ]);
  }
  return Buffer.concat([base.subarray(0, 2), app13, base.subarray(2)]);
}

/** Cari semua segmen APP13 "Photoshop 3.0". */
function findIptcSegments(buf, parsed) {
  return parsed.segments.filter(
    (s) =>
      s.marker === 0xed &&
      s.payloadLen >= 14 &&
      buf.subarray(s.payloadStart, s.payloadStart + 14).toString("latin1") === "Photoshop 3.0\0"
  );
}

/** Cari semua segmen APP1 XMP. */
function findXmpSegments(buf, parsed) {
  return parsed.segments.filter(
    (s) =>
      s.marker === 0xe1 &&
      s.payloadLen >= 29 &&
      buf.subarray(s.payloadStart, s.payloadStart + 29).toString("latin1") === "http://ns.adobe.com/xap/1.0/\0"
  );
}

/** Buang semua segmen APP13 "Photoshop 3.0". Mengembalikan null bila tidak ada. */
export function removeIptc(buf) {
  const targets = findIptcSegments(buf, parseJpeg(buf));
  if (!targets.length) return null;
  let out = buf;
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    out = Buffer.concat([out.subarray(0, t.offset), out.subarray(t.offset + t.total)]);
  }
  return out;
}

/** Buang semua segmen APP1 XMP. Mengembalikan null bila tidak ada. */
export function removeXmp(buf) {
  const targets = findXmpSegments(buf, parseJpeg(buf));
  if (!targets.length) return null;
  let out = buf;
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    out = Buffer.concat([out.subarray(0, t.offset), out.subarray(t.offset + t.total)]);
  }
  return out;
}
