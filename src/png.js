// Parser & manipulasi struktur chunk PNG (eXIf, iTXt, tEXt, IHDR).
// Murni JavaScript, tanpa dependensi eksternal.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(buf) {
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE);
}

// Algoritma CRC32 murni untuk chunk PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function calcCrc(typeBuf, dataBuf) {
  let crc = 0xffffffff;
  for (let i = 0; i < typeBuf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ typeBuf[i]) & 0xff];
  }
  if (dataBuf) {
    for (let i = 0; i < dataBuf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ dataBuf[i]) & 0xff];
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Pindai chunk-chunk PNG.
 * @returns {object} { chunks, exif, text, dims }
 *  - exif: { offset, total, payloadStart, payloadLen } dari chunk eXIf
 *  - text: array chunk text/iTXt { keyword, text }
 *  - dims: { w, h } dari IHDR
 */
export function parsePng(buf) {
  if (!isPng(buf)) throw new Error("Bukan file PNG valid.");

  const chunks = [];
  let exif = null;
  const text = [];
  let dims = null;
  let off = 8;
  const len = buf.length;

  while (off + 12 <= len) {
    const dataLen = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const payloadStart = off + 8;
    const payloadLen = dataLen;
    const total = 12 + dataLen;

    if (off + total > len) break;

    chunks.push({ type, offset: off, payloadStart, payloadLen, total });

    if (type === "IHDR" && payloadLen >= 8) {
      dims = {
        w: buf.readUInt32BE(payloadStart),
        h: buf.readUInt32BE(payloadStart + 4),
      };
    }

    if (type === "eXIf") {
      exif = { offset: off, total, payloadStart, payloadLen };
    }

    if (type === "tEXt") {
      const payload = buf.subarray(payloadStart, payloadStart + payloadLen);
      const nullIdx = payload.indexOf(0);
      if (nullIdx > 0) {
        text.push({
          keyword: payload.subarray(0, nullIdx).toString("latin1"),
          text: payload.subarray(nullIdx + 1).toString("latin1"),
        });
      }
    }

    if (type === "iTXt") {
      const payload = buf.subarray(payloadStart, payloadStart + payloadLen);
      const null1 = payload.indexOf(0);
      if (null1 > 0 && null1 + 2 < payload.length) {
        const compFlag = payload[null1 + 1];
        if (compFlag === 0) { // uncompressed text
          const keyword = payload.subarray(0, null1).toString("utf8");
          let p = null1 + 3; // skip compFlag & compMethod
          const null2 = payload.indexOf(0, p);
          if (null2 >= p) {
            p = null2 + 1; // skip langTag
            const null3 = payload.indexOf(0, p);
            if (null3 >= p) {
              p = null3 + 1; // skip transKeyword
              const txtBuf = payload.subarray(p);
              text.push({ keyword, text: txtBuf.toString("utf8") });
            }
          }
        }
      }
    }

    if (type === "IEND") break;
    off += total;
  }

  return { chunks, exif, text, dims };
}

/** Bangun chunk PNG lengkap (Length 4B + Type 4B + Data + CRC 4B). */
export function buildPngChunk(type, dataBuf) {
  const typeBuf = Buffer.from(type, "ascii");
  const data = dataBuf || Buffer.alloc(0);
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  typeBuf.copy(buf, 4);
  data.copy(buf, 8);
  const crc = calcCrc(typeBuf, data);
  buf.writeUInt32BE(crc, 8 + data.length);
  return buf;
}

/** Sisipkan/ganti chunk eXIf pada PNG. Chunk ditaruh tepat setelah IHDR. */
export function insertExif(buf, tiffBuffer) {
  const parsed = parsePng(buf);
  const exIfChunk = buildPngChunk("eXIf", tiffBuffer);

  let base = buf;
  if (parsed.exif) {
    base = Buffer.concat([
      buf.subarray(0, parsed.exif.offset),
      buf.subarray(parsed.exif.offset + parsed.exif.total),
    ]);
  }

  const baseParsed = parsePng(base);
  const ihdr = baseParsed.chunks.find((c) => c.type === "IHDR");
  const insertPos = ihdr ? ihdr.offset + ihdr.total : 8;

  return Buffer.concat([
    base.subarray(0, insertPos),
    exIfChunk,
    base.subarray(insertPos),
  ]);
}

/** Buang chunk eXIf dari PNG. Mengembalikan null jika tidak ada eXIf. */
export function removeExif(buf) {
  const parsed = parsePng(buf);
  if (!parsed.exif) return null;
  return Buffer.concat([
    buf.subarray(0, parsed.exif.offset),
    buf.subarray(parsed.exif.offset + parsed.exif.total),
  ]);
}
