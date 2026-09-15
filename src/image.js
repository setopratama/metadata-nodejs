// Modul Pemrosesan & Export Gambar ke JPEG (Zero-Dependency Node.js Native).
// Mendekode PNG (RGBA/RGB/Grayscale/Palette) dan meng-encode menjadi JPEG baseline (ITU-T T.81 / JFIF).
// Menggunakan algoritma Fast AAN FDCT untuk kompresi cepat beresolusi tinggi.
// Menyematkan metadata EXIF, IPTC (Photoshop 8BIM), dan Adobe XMP Dublin Core secara otomatis.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import * as meta from "./meta.js";
import * as jpeg from "./jpeg.js";
import * as png from "./png.js";
import * as exif from "./exif.js";
import * as iptc from "./iptc.js";
import * as utils from "./utils.js";

// ==========================================
// 1. PNG DECODER (MURNI JAVASCRIPT & ZLIB)
// ==========================================

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Mendekode file PNG buffer menjadi data piksel RGB 8-bit (Uint8Array).
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, data: Uint8Array }}
 */
export function decodePng(buf) {
  if (!png.isPng(buf)) throw new Error("Bukan berkas PNG valid.");

  let off = 8;
  const len = buf.length;
  let ihdr = null;
  const idats = [];
  let plte = null;

  while (off + 12 <= len) {
    const dataLen = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const payloadStart = off + 8;

    if (off + 12 + dataLen > len) break;

    if (type === "IHDR") {
      ihdr = {
        w: buf.readUInt32BE(payloadStart),
        h: buf.readUInt32BE(payloadStart + 4),
        depth: buf[payloadStart + 8],
        colorType: buf[payloadStart + 9],
        comp: buf[payloadStart + 10],
        filter: buf[payloadStart + 11],
        interlace: buf[payloadStart + 12],
      };
    } else if (type === "PLTE") {
      plte = buf.subarray(payloadStart, payloadStart + dataLen);
    } else if (type === "IDAT") {
      idats.push(buf.subarray(payloadStart, payloadStart + dataLen));
    } else if (type === "IEND") {
      break;
    }
    off += 12 + dataLen;
  }

  if (!ihdr) throw new Error("PNG tidak memuat chunk IHDR.");
  if (ihdr.depth !== 8 && ihdr.depth !== 16) {
    throw new Error(`Bit depth PNG ${ihdr.depth} belum didukung (hanya 8-bit / 16-bit).`);
  }
  if (ihdr.interlace !== 0) {
    throw new Error("PNG interlaced (Adam7) belum didukung.");
  }

  const { w, h, colorType, depth } = ihdr;
  let channels = 1;
  if (colorType === 2) channels = 3;      // RGB
  else if (colorType === 3) channels = 1; // Palette
  else if (colorType === 4) channels = 2; // Gray + Alpha
  else if (colorType === 6) channels = 4; // RGBA

  const bytesPerSample = depth === 16 ? 2 : 1;
  const bpp = channels * bytesPerSample;
  const rowBytes = w * bpp;

  const compressed = Buffer.concat(idats);
  const decompressed = zlib.inflateSync(compressed);

  const rgbData = new Uint8Array(w * h * 3);
  let decOffset = 0;

  const prevRow = new Uint8Array(rowBytes);
  const currRow = new Uint8Array(rowBytes);

  for (let y = 0; y < h; y++) {
    const filterType = decompressed[decOffset++];

    // Un-filter scanline
    for (let x = 0; x < rowBytes; x++) {
      const raw = decompressed[decOffset++];
      const left = x >= bpp ? currRow[x - bpp] : 0;
      const up = prevRow[x];
      const upLeft = x >= bpp ? prevRow[x - bpp] : 0;

      let val = 0;
      if (filterType === 0) val = raw;
      else if (filterType === 1) val = (raw + left) & 0xff;
      else if (filterType === 2) val = (raw + up) & 0xff;
      else if (filterType === 3) val = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) val = (raw + paethPredictor(left, up, upLeft)) & 0xff;
      else val = raw;

      currRow[x] = val;
    }

    prevRow.set(currRow);

    const rowRgbOffset = y * w * 3;
    let rIdx = 0;

    for (let px = 0; px < w; px++) {
      const outIdx = rowRgbOffset + px * 3;

      if (colorType === 6) {
        // RGBA -> Blend dengan latar putih jika transparan
        const r = currRow[rIdx];
        const g = currRow[rIdx + bytesPerSample];
        const b = currRow[rIdx + bytesPerSample * 2];
        const a = currRow[rIdx + bytesPerSample * 3];
        rIdx += bpp;

        if (a === 255) {
          rgbData[outIdx] = r;
          rgbData[outIdx + 1] = g;
          rgbData[outIdx + 2] = b;
        } else if (a === 0) {
          rgbData[outIdx] = 255;
          rgbData[outIdx + 1] = 255;
          rgbData[outIdx + 2] = 255;
        } else {
          const alpha = a / 255;
          rgbData[outIdx] = Math.round(r * alpha + 255 * (1 - alpha));
          rgbData[outIdx + 1] = Math.round(g * alpha + 255 * (1 - alpha));
          rgbData[outIdx + 2] = Math.round(b * alpha + 255 * (1 - alpha));
        }
      } else if (colorType === 2) {
        // RGB
        rgbData[outIdx] = currRow[rIdx];
        rgbData[outIdx + 1] = currRow[rIdx + bytesPerSample];
        rgbData[outIdx + 2] = currRow[rIdx + bytesPerSample * 2];
        rIdx += bpp;
      } else if (colorType === 0) {
        // Grayscale
        const v = currRow[rIdx];
        rgbData[outIdx] = v;
        rgbData[outIdx + 1] = v;
        rgbData[outIdx + 2] = v;
        rIdx += bpp;
      } else if (colorType === 4) {
        // Grayscale + Alpha
        const v = currRow[rIdx];
        const a = currRow[rIdx + bytesPerSample];
        rIdx += bpp;
        const alpha = a / 255;
        const blended = Math.round(v * alpha + 255 * (1 - alpha));
        rgbData[outIdx] = blended;
        rgbData[outIdx + 1] = blended;
        rgbData[outIdx + 2] = blended;
      } else if (colorType === 3 && plte) {
        // Palette
        const idx = currRow[rIdx++] * 3;
        rgbData[outIdx] = plte[idx] || 0;
        rgbData[outIdx + 1] = plte[idx + 1] || 0;
        rgbData[outIdx + 2] = plte[idx + 2] || 0;
      }
    }
  }

  return { width: w, height: h, data: rgbData };
}

// ==========================================
// 2. FAST BASELINE JPEG ENCODER (AAN FDCT)
// ==========================================

const STD_Q_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99
];

const STD_Q_CHROMA = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99
];

const ZIGZAG = [
  0, 1, 5, 6, 14, 15, 27, 28,
  2, 4, 7, 13, 16, 26, 29, 42,
  3, 8, 12, 17, 25, 30, 41, 43,
  9, 11, 18, 24, 31, 40, 44, 53,
  10, 19, 23, 32, 39, 45, 52, 54,
  20, 22, 33, 38, 46, 51, 55, 60,
  21, 34, 37, 47, 50, 56, 59, 61,
  35, 36, 48, 49, 57, 58, 62, 63
];

const AAN_SCALE_FACTORS = [
  1.0, 1.387039845, 1.306562965, 1.175875602,
  1.0, 0.785694958, 0.541196100, 0.275899379
];

const BITS_DC_LUMA = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const VAL_DC_LUMA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const BITS_DC_CHROMA = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const VAL_DC_CHROMA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const BITS_AC_LUMA = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const VAL_AC_LUMA = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
  0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0,
  0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
  0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
  0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
  0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
  0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7,
  0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5,
  0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
  0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa
];

const BITS_AC_CHROMA = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const VAL_AC_CHROMA = [
  0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71,
  0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0,
  0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26,
  0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
  0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
  0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
  0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5,
  0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3,
  0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda,
  0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
  0xf9, 0xfa
];

function buildHuffmanTable(bits, vals) {
  const table = {};
  let code = 0;
  let valIdx = 0;
  for (let len = 1; len <= 16; len++) {
    const count = bits[len];
    for (let i = 0; i < count; i++) {
      const val = vals[valIdx++];
      table[val] = { code, len };
      code++;
    }
    code <<= 1;
  }
  return table;
}

const HT_DC_LUMA = buildHuffmanTable(BITS_DC_LUMA, VAL_DC_LUMA);
const HT_DC_CHROMA = buildHuffmanTable(BITS_DC_CHROMA, VAL_DC_CHROMA);
const HT_AC_LUMA = buildHuffmanTable(BITS_AC_LUMA, VAL_AC_LUMA);
const HT_AC_CHROMA = buildHuffmanTable(BITS_AC_CHROMA, VAL_AC_CHROMA);

class BitWriter {
  constructor(initialCap = 1024 * 1024) {
    this.buffer = Buffer.alloc(initialCap);
    this.pos = 0;
    this.bitBuf = 0;
    this.bitCount = 0;
  }

  ensureCap(needed) {
    if (this.pos + needed > this.buffer.length) {
      const newBuf = Buffer.alloc(Math.max(this.buffer.length * 2, this.buffer.length + needed));
      this.buffer.copy(newBuf, 0, 0, this.pos);
      this.buffer = newBuf;
    }
  }

  writeBits(code, length) {
    this.bitBuf = (this.bitBuf << length) | (code & ((1 << length) - 1));
    this.bitCount += length;

    while (this.bitCount >= 8) {
      this.bitCount -= 8;
      const b = (this.bitBuf >>> this.bitCount) & 0xff;
      this.ensureCap(2);
      this.buffer[this.pos++] = b;
      if (b === 0xff) {
        this.buffer[this.pos++] = 0x00; // Byte stuffing
      }
    }
  }

  flush() {
    if (this.bitCount > 0) {
      const b = ((this.bitBuf << (8 - this.bitCount)) | ((1 << (8 - this.bitCount)) - 1)) & 0xff;
      this.ensureCap(2);
      this.buffer[this.pos++] = b;
      if (b === 0xff) {
        this.buffer[this.pos++] = 0x00;
      }
      this.bitBuf = 0;
      this.bitCount = 0;
    }
  }

  getBuffer() {
    return this.buffer.subarray(0, this.pos);
  }
}

// Fast AAN 1D DCT pada in-place 8x8 block (Float64Array)
function fastAanDct8x8(data) {
  // Row DCT
  for (let i = 0; i < 64; i += 8) {
    const tmp0 = data[i] + data[i + 7];
    const tmp7 = data[i] - data[i + 7];
    const tmp1 = data[i + 1] + data[i + 6];
    const tmp6 = data[i + 1] - data[i + 6];
    const tmp2 = data[i + 2] + data[i + 5];
    const tmp5 = data[i + 2] - data[i + 5];
    const tmp3 = data[i + 3] + data[i + 4];
    const tmp4 = data[i + 3] - data[i + 4];

    const tmp10 = tmp0 + tmp3;
    const tmp13 = tmp0 - tmp3;
    const tmp11 = tmp1 + tmp2;
    const tmp12 = tmp1 - tmp2;

    data[i] = tmp10 + tmp11;
    data[i + 4] = tmp10 - tmp11;

    const z1 = (tmp12 + tmp13) * 0.7071067811865475;
    data[i + 2] = tmp13 + z1;
    data[i + 6] = tmp13 - z1;

    const tmp10_o = tmp4 + tmp5;
    const tmp11_o = tmp5 + tmp6;
    const tmp12_o = tmp6 + tmp7;

    const z5 = (tmp10_o - tmp12_o) * 0.3826834323650898;
    const z2 = 0.541196100146197 * tmp10_o + z5;
    const z4 = 1.3065629648763765 * tmp12_o + z5;
    const z3 = tmp11_o * 0.7071067811865475;

    const z11 = tmp7 + z3;
    const z13 = tmp7 - z3;

    data[i + 5] = z13 + z2;
    data[i + 3] = z13 - z2;
    data[i + 1] = z11 + z4;
    data[i + 7] = z11 - z4;
  }

  // Column DCT
  for (let i = 0; i < 8; i++) {
    const tmp0 = data[i] + data[i + 56];
    const tmp7 = data[i] - data[i + 56];
    const tmp1 = data[i + 8] + data[i + 48];
    const tmp6 = data[i + 8] - data[i + 48];
    const tmp2 = data[i + 16] + data[i + 40];
    const tmp5 = data[i + 16] - data[i + 40];
    const tmp3 = data[i + 24] + data[i + 32];
    const tmp4 = data[i + 24] - data[i + 32];

    const tmp10 = tmp0 + tmp3;
    const tmp13 = tmp0 - tmp3;
    const tmp11 = tmp1 + tmp2;
    const tmp12 = tmp1 - tmp2;

    data[i] = tmp10 + tmp11;
    data[i + 32] = tmp10 - tmp11;

    const z1 = (tmp12 + tmp13) * 0.7071067811865475;
    data[i + 16] = tmp13 + z1;
    data[i + 48] = tmp13 - z1;

    const tmp10_o = tmp4 + tmp5;
    const tmp11_o = tmp5 + tmp6;
    const tmp12_o = tmp6 + tmp7;

    const z5 = (tmp10_o - tmp12_o) * 0.3826834323650898;
    const z2 = 0.541196100146197 * tmp10_o + z5;
    const z4 = 1.3065629648763765 * tmp12_o + z5;
    const z3 = tmp11_o * 0.7071067811865475;

    const z11 = tmp7 + z3;
    const z13 = tmp7 - z3;

    data[i + 40] = z13 + z2;
    data[i + 24] = z13 - z2;
    data[i + 8] = z11 + z4;
    data[i + 56] = z11 - z4;
  }
}

function quantizeAndZigzagFast(dctBlock, invQTable, outInt16) {
  for (let i = 0; i < 64; i++) {
    const zz = ZIGZAG[i];
    outInt16[i] = Math.round(dctBlock[zz] * invQTable[zz]);
  }
}

function computeCategory(val) {
  if (val === 0) return 0;
  const absVal = Math.abs(val);
  return 32 - Math.clz32(absVal);
}

function encodeBlock(zzBlock, prevDC, htDC, htAC, writer) {
  const diff = zzBlock[0] - prevDC;
  const cat = computeCategory(diff);
  const dcHuf = htDC[cat];
  writer.writeBits(dcHuf.code, dcHuf.len);
  if (cat > 0) {
    const valBits = diff < 0 ? diff + (1 << cat) - 1 : diff;
    writer.writeBits(valBits, cat);
  }

  let r = 0;
  for (let k = 1; k < 64; k++) {
    const val = zzBlock[k];
    if (val === 0) {
      r++;
    } else {
      while (r > 15) {
        const zrl = htAC[0xf0];
        writer.writeBits(zrl.code, zrl.len);
        r -= 16;
      }
      const catVal = computeCategory(val);
      const symbol = (r << 4) | catVal;
      const acHuf = htAC[symbol];
      writer.writeBits(acHuf.code, acHuf.len);
      const valBits = val < 0 ? val + (1 << catVal) - 1 : val;
      writer.writeBits(valBits, catVal);
      r = 0;
    }
  }

  if (r > 0) {
    const eob = htAC[0x00];
    writer.writeBits(eob.code, eob.len);
  }

  return zzBlock[0];
}

/**
 * Encode RGB Uint8Array ke Baseline JPEG Buffer.
 * @param {{ width: number, height: number, data: Uint8Array }} img
 * @param {number} [quality=90]
 * @returns {Buffer}
 */
export function encodeRgbToJpeg(img, quality = 90) {
  const { width: w, height: h, data: rgb } = img;
  let q = quality < 1 ? 1 : quality > 100 ? 100 : quality;
  let scale = q < 50 ? Math.floor(5000 / q) : Math.floor(200 - q * 2);

  const qLumaDqt = new Uint8Array(64);
  const qChromaDqt = new Uint8Array(64);

  const invQLumaAAN = new Float64Array(64);
  const invQChromaAAN = new Float64Array(64);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      let vL = Math.floor((STD_Q_LUMA[idx] * scale + 50) / 100);
      if (vL < 1) vL = 1;
      if (vL > 255) vL = 255;
      qLumaDqt[idx] = vL;

      let vC = Math.floor((STD_Q_CHROMA[idx] * scale + 50) / 100);
      if (vC < 1) vC = 1;
      if (vC > 255) vC = 255;
      qChromaDqt[idx] = vC;

      const aanFactor = AAN_SCALE_FACTORS[row] * AAN_SCALE_FACTORS[col] * 8.0;
      invQLumaAAN[idx] = 1.0 / (vL * aanFactor);
      invQChromaAAN[idx] = 1.0 / (vC * aanFactor);
    }
  }

  const chunks = [];

  // 1. SOI
  chunks.push(Buffer.from([0xff, 0xd8]));

  // 2. APP0 JFIF
  const app0 = Buffer.alloc(18);
  app0.writeUInt16BE(0xffe0, 0);
  app0.writeUInt16BE(16, 2);
  app0.write("JFIF\0", 4, "latin1");
  app0.writeUInt16BE(0x0101, 9);
  app0[11] = 0;
  app0.writeUInt16BE(1, 12);
  app0.writeUInt16BE(1, 14);
  app0[16] = 0;
  app0[17] = 0;
  chunks.push(app0);

  // 3. DQT
  const dqt = Buffer.alloc(2 + 2 + 1 + 64 + 1 + 64);
  dqt.writeUInt16BE(0xffdb, 0);
  dqt.writeUInt16BE(132, 2);
  dqt[4] = 0;
  for (let i = 0; i < 64; i++) dqt[5 + i] = qLumaDqt[ZIGZAG[i]];
  dqt[69] = 1;
  for (let i = 0; i < 64; i++) dqt[70 + i] = qChromaDqt[ZIGZAG[i]];
  chunks.push(dqt);

  // 4. SOF0
  const sof0 = Buffer.alloc(2 + 2 + 6 + 9);
  sof0.writeUInt16BE(0xffc0, 0);
  sof0.writeUInt16BE(17, 2);
  sof0[4] = 8;
  sof0.writeUInt16BE(h, 5);
  sof0.writeUInt16BE(w, 7);
  sof0[9] = 3;
  sof0[10] = 1;
  sof0[11] = 0x11;
  sof0[12] = 0;
  sof0[13] = 2;
  sof0[14] = 0x11;
  sof0[15] = 1;
  sof0[16] = 3;
  sof0[17] = 0x11;
  sof0[18] = 1;
  chunks.push(sof0);

  // 5. DHT
  function makeDhtChunk(classId, tableId, bits, vals) {
    const total = 2 + 2 + 1 + 16 + vals.length;
    const b = Buffer.alloc(total);
    b.writeUInt16BE(0xffc4, 0);
    b.writeUInt16BE(total - 2, 2);
    b[4] = (classId << 4) | (tableId & 0x0f);
    for (let i = 1; i <= 16; i++) b[4 + i] = bits[i];
    for (let i = 0; i < vals.length; i++) b[21 + i] = vals[i];
    return b;
  }

  chunks.push(makeDhtChunk(0, 0, BITS_DC_LUMA, VAL_DC_LUMA));
  chunks.push(makeDhtChunk(1, 0, BITS_AC_LUMA, VAL_AC_LUMA));
  chunks.push(makeDhtChunk(0, 1, BITS_DC_CHROMA, VAL_DC_CHROMA));
  chunks.push(makeDhtChunk(1, 1, BITS_AC_CHROMA, VAL_AC_CHROMA));

  // 6. SOS
  const sos = Buffer.alloc(2 + 2 + 1 + 6 + 3);
  sos.writeUInt16BE(0xffda, 0);
  sos.writeUInt16BE(12, 2);
  sos[4] = 3;
  sos[5] = 1;
  sos[6] = 0x00;
  sos[7] = 2;
  sos[8] = 0x11;
  sos[9] = 3;
  sos[10] = 0x11;
  sos[11] = 0;
  sos[12] = 63;
  sos[13] = 0;
  chunks.push(sos);

  // 7. Entropy Coded Data
  const writer = new BitWriter(Math.max(1024 * 1024, Math.floor(w * h * 1.2)));

  let prevDC_Y = 0;
  let prevDC_Cb = 0;
  let prevDC_Cr = 0;

  const blockY = new Float64Array(64);
  const blockCb = new Float64Array(64);
  const blockCr = new Float64Array(64);
  const zzBlock = new Int16Array(64);

  const mcuRows = Math.ceil(h / 8);
  const mcuCols = Math.ceil(w / 8);

  for (let mcuY = 0; mcuY < mcuRows; mcuY++) {
    for (let mcuX = 0; mcuX < mcuCols; mcuX++) {
      const startX = mcuX * 8;
      const startY = mcuY * 8;

      for (let by = 0; by < 8; by++) {
        const py = Math.min(startY + by, h - 1);
        const rowOff = py * w * 3;
        for (let bx = 0; bx < 8; bx++) {
          const px = Math.min(startX + bx, w - 1);
          const idx = rowOff + px * 3;
          const r = rgb[idx];
          const g = rgb[idx + 1];
          const b = rgb[idx + 2];

          const bIdx = by * 8 + bx;
          blockY[bIdx] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
          blockCb[bIdx] = -0.168736 * r - 0.331264 * g + 0.5 * b;
          blockCr[bIdx] = 0.5 * r - 0.418688 * g - 0.081312 * b;
        }
      }

      // Y Component
      fastAanDct8x8(blockY);
      quantizeAndZigzagFast(blockY, invQLumaAAN, zzBlock);
      prevDC_Y = encodeBlock(zzBlock, prevDC_Y, HT_DC_LUMA, HT_AC_LUMA, writer);

      // Cb Component
      fastAanDct8x8(blockCb);
      quantizeAndZigzagFast(blockCb, invQChromaAAN, zzBlock);
      prevDC_Cb = encodeBlock(zzBlock, prevDC_Cb, HT_DC_CHROMA, HT_AC_CHROMA, writer);

      // Cr Component
      fastAanDct8x8(blockCr);
      quantizeAndZigzagFast(blockCr, invQChromaAAN, zzBlock);
      prevDC_Cr = encodeBlock(zzBlock, prevDC_Cr, HT_DC_CHROMA, HT_AC_CHROMA, writer);
    }
  }

  writer.flush();
  chunks.push(writer.getBuffer());

  // 8. EOI
  chunks.push(Buffer.from([0xff, 0xd9]));

  return Buffer.concat(chunks);
}

// ==========================================
// 3. EXPORT FILE TO JPEG DENGAN METADATA
// ==========================================

/**
 * Ekspor file gambar (PNG / JPEG) menjadi JPEG lengkap dengan metadata EXIF, IPTC, dan XMP.
 * @param {string} srcFile Path file sumber
 * @param {string} destFile Path file target (.jpg)
 * @param {object} [opts={}] { quality: 90, title, keywords, caption, author, preset }
 * @returns {{ src: string, dest: string, size: number, dims: { w: number, h: number }, timeMs: number }}
 */
export function exportFileToJpeg(srcFile, destFile, opts = {}) {
  const startTime = Date.now();
  const rawBuf = fs.readFileSync(srcFile);
  const isInputPng = png.isPng(rawBuf);
  const isInputJpeg = jpeg.isJpeg(rawBuf);

  if (!isInputPng && !isInputJpeg) {
    throw new Error(`Format file '${path.basename(srcFile)}' tidak didukung untuk export JPEG.`);
  }

  let finalJpegBuf = null;
  let dims = { w: 0, h: 0 };

  // Baca metadata bawaan file sumber
  const srcMeta = meta.readFileMeta(srcFile);

  if (isInputPng) {
    const decoded = decodePng(rawBuf);
    dims = { w: decoded.width, h: decoded.height };
    const quality = opts.quality ? parseInt(opts.quality, 10) || 90 : 90;
    finalJpegBuf = encodeRgbToJpeg(decoded, quality);
  } else {
    finalJpegBuf = rawBuf;
    if (srcMeta.dims) dims = srcMeta.dims;
  }

  // Terapkan metadata EXIF / IPTC / XMP ke JPEG hasil konversi
  const editOpts = Object.assign({}, opts);

  if (!editOpts.title && srcMeta.text) {
    const tItem = srcMeta.text.find(t => t.keyword === "Title" || t.keyword === "Description");
    if (tItem) editOpts.title = tItem.text;
  }
  if (!editOpts.keywords && srcMeta.text) {
    const kwItem = srcMeta.text.find(t => t.keyword === "Keywords");
    if (kwItem) editOpts.keywords = kwItem.text;
  }

  // Siapkan model TIFF kosong jika JPEG belum memiliki EXIF
  let tiffModel = srcMeta.model;
  if (!tiffModel) {
    tiffModel = {
      endian: "II",
      ifd0: [],
      exif: [],
      gps: [],
      interop: [],
      ifd1: [],
      thumbnail: null,
    };
  }

  // Terapkan tag EXIF
  const hasEdits = meta.applyEdits(tiffModel, editOpts, true);
  if (hasEdits || tiffModel.ifd0.length || tiffModel.exif.length || tiffModel.gps.length) {
    const tiffBuf = exif.serializeTiff(tiffModel);
    finalJpegBuf = jpeg.insertExif(finalJpegBuf, tiffBuf);
  }

  // Terapkan tag IPTC (Photoshop 8BIM)
  const iptcEdits = meta.collectIptcEdits(editOpts, srcMeta.iptc);
  if (iptcEdits) {
    const iptcBuf = iptc.buildIptcApp13(iptcEdits.fields, iptcEdits.others);
    if (iptcBuf) {
      finalJpegBuf = jpeg.insertIptc(finalJpegBuf, iptcBuf);
    }
  }

  // Terapkan Adobe XMP Packet
  const xmpPacket = meta.buildXmpPacket({
    title: editOpts.title || (srcMeta.iptc && srcMeta.iptc.title) || "",
    keywords: editOpts.keywords || (srcMeta.iptc && srcMeta.iptc.keywords) || [],
    description: editOpts.description || editOpts.caption || editOpts.title || "",
    author: editOpts.author || (srcMeta.iptc && srcMeta.iptc.author) || "",
  });
  if (xmpPacket) {
    finalJpegBuf = jpeg.insertXmp(finalJpegBuf, xmpPacket);
  }

  // Tulis ke destFile
  fs.mkdirSync(path.dirname(path.resolve(destFile)), { recursive: true });
  fs.writeFileSync(destFile, finalJpegBuf);

  const duration = Date.now() - startTime;
  return {
    src: srcFile,
    dest: destFile,
    size: finalJpegBuf.length,
    dims,
    timeMs: duration,
  };
}
