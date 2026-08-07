// Encoder JPEG minimal (grayscale 1 komponen, 8-bit) untuk pengujian internal.
// Menghasilkan file JPEG baseline yang valid sesuai ITU-T T.81 dengan tabel
// Huffman standar (Annex K). Gambar yang dihasilkan berupa bidang abu-abu rata
// sehingga data entropy-nya sangat sederhana (DC kategori 0 + EOB).

// Tabel Huffman DC luminance (Annex K, Tabel K.3.1)
const DC_COUNTS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_SYMBOLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// Tabel Huffman AC luminance (Annex K, Tabel K.3.2)
const AC_COUNTS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const AC_SYMBOLS = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13,
  0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42,
  0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
  0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
  0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a,
  0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67,
  0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84,
  0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
  0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3,
  0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7,
  0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1,
  0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
  0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa,
];

function buildDht(classId, counts, symbols) {
  const b = Buffer.alloc(2 + 2 + 1 + 16 + symbols.length);
  b.writeUInt16BE(0xffc4, 0);
  b.writeUInt16BE(19 + symbols.length, 2);
  b[4] = classId;
  for (let i = 0; i < 16; i++) b[5 + i] = counts[i];
  for (let i = 0; i < symbols.length; i++) b[21 + i] = symbols[i];
  return b;
}

/**
 * Enkode gambar abu-abu rata menjadi JPEG 8x8 yang valid.
 * @returns {Buffer}
 */
export function encodeGrayJpeg(w = 8, h = 8) {
  // APP0 / JFIF
  const app0 = Buffer.alloc(2 + 2 + 14);
  app0.writeUInt16BE(0xffe0, 0);
  app0.writeUInt16BE(16, 2);
  app0.write("JFIF\0", 4, "latin1");
  app0.writeUInt16BE(0x0101, 9); // versi 1.1
  app0[11] = 0;                  // satuan: none
  app0.writeUInt16BE(1, 12);     // x density
  app0.writeUInt16BE(1, 14);     // y density
  app0[16] = 0;                  // thumbnail X
  app0[17] = 0;                  // thumbnail Y

  // DQT: 1 tabel kuantisasi, semua nilai 1
  const dqt = Buffer.alloc(2 + 2 + 1 + 64);
  dqt.writeUInt16BE(0xffdb, 0);
  dqt.writeUInt16BE(67, 2);
  dqt[4] = 0; // precision 8-bit, tabel #0
  for (let i = 5; i < 69; i++) dqt[i] = 1;

  // SOF0: baseline, 1 komponen
  const sof = Buffer.alloc(2 + 2 + 8 + 3);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(11, 2);
  sof[4] = 8; // presisi
  sof.writeUInt16BE(h, 5);
  sof.writeUInt16BE(w, 7);
  sof[9] = 1;        // jumlah komponen
  sof[10] = 1;       // ID komponen
  sof[11] = 0x11;    // sampling H=1, V=1
  sof[12] = 0;       // tabel kuantisasi #0

  const dhtDC = buildDht(0x00, DC_COUNTS, DC_SYMBOLS);
  const dhtAC = buildDht(0x10, AC_COUNTS, AC_SYMBOLS);

  // SOS
  const sos = Buffer.alloc(2 + 2 + 6 + 3);
  sos.writeUInt16BE(0xffda, 0);
  sos.writeUInt16BE(8, 2);
  sos[4] = 1;     // jumlah komponen scan
  sos[5] = 1;     // ID komponen
  sos[6] = 0x00;  // tabel DC #0, AC #0
  sos[7] = 0;     // Ss
  sos[8] = 0x3f;  // Se = 63
  sos[9] = 0;     // Ah/Al

  // Data entropy: DC kategori 0 ("00") + EOB ("1010") = 001010, padding 1 -> 0x2B
  const entropy = Buffer.from([0x2b]);

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    app0, dqt, sof, dhtDC, dhtAC, sos, entropy,
    Buffer.from([0xff, 0xd9]), // EOI
  ]);
}
