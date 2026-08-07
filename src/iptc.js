// Parser & serializer metadata IPTC IIM di dalam segmen APP13 "Photoshop 3.0".
// Field yang didukung (tampil di Windows: klik kanan file -> Properties -> Details):
//   Judul      = record 2, dataset 0x05  (Object Name)
//   Tag        = record 2, dataset 0x19  (Keywords, bisa berulang)
//   Keterangan = record 2, dataset 0x78  (Caption/Abstract)
//   Penulis    = record 2, dataset 0x50  (By-line)
//
// Teks ditulis sebagai UTF-8 dengan deklarasi charset (record 1, dataset 0x5A,
// escape sequence ESC%G) sesuai standar IIM. Saat membaca, charset tersebut
// dideteksi; bila tidak ada, teks ditafsirkan sebagai latin1.

const PS_HEADER = "Photoshop 3.0\0"; // 14 byte
const IPTC_RES = 0x0404;             // 8BIM resource ID untuk data IPTC
const CHARSET_UTF8 = "\x1b%G";       // escape sequence: karakter UTF-8

const DS = {
  ObjectName: 0x05,
  Keywords: 0x19,
  Byline: 0x50,
  Caption: 0x78,
};

/** Urai blok dataset IPTC (urutan "0x1C record dataset len2 data"). */
function parseDatasets(data) {
  const list = [];
  let d = 0;
  while (d + 5 <= data.length) {
    if (data[d] !== 0x1c) {
      d += 1;
      continue;
    }
    const record = data[d + 1];
    const ds = data[d + 2];
    const len = data.readUInt16BE(d + 3);
    const start = d + 5;
    const end = start + len;
    if (end > data.length) break;
    list.push({ record, ds, data: Buffer.from(data.subarray(start, end)) });
    d = end;
  }
  return list;
}

/**
 * Baca field IPTC dari payload segmen APP13 "Photoshop 3.0".
 * @param {Buffer} payload Isi segmen APP13 (setelah marker FF ED + panjang)
 * @returns {object|null} { title, keywords[], caption, author, others[] } atau null
 *                         bila bukan segmen Photoshop/ tidak ada IPTC.
 *  - others: resource 8BIM non-IPTC (mis. thumbnail 0x0409, ResolutionInfo 0x0405)
 *            sebagai { id, name: Buffer, data: Buffer } agar bisa dipertahankan.
 */
export function readIptcFromApp13(payload) {
  const headLen = PS_HEADER.length;
  if (
    !payload ||
    payload.length < headLen ||
    payload.subarray(0, headLen).toString("latin1") !== PS_HEADER
  ) {
    return null;
  }

  let charsetUtf8 = false;
  const out = { title: null, keywords: [], caption: null, author: null, others: [] };
  let off = headLen;

  while (off + 12 <= payload.length) {
    if (payload.toString("latin1", off, off + 4) !== "8BIM") break;
    const id = payload.readUInt16BE(off + 4);
    const nameLen = payload[off + 6];
    let p = off + 7 + nameLen;
    if (p % 2 !== 0) p += 1; // nama Pascal digenapkan
    if (p + 4 > payload.length) break;
    const size = payload.readUInt32BE(p);
    const dataStart = p + 4;
    const dataEnd = dataStart + size;
    if (dataEnd > payload.length) break;

    if (id === IPTC_RES) {
      const datasets = parseDatasets(payload.subarray(dataStart, dataEnd));
      // Pass 1: deteksi charset (record 1) agar dapat berlaku untuk semua teks
      for (const ds of datasets) {
        if (ds.record === 1 && ds.ds === 0x5a) {
          charsetUtf8 = ds.data.toString("latin1").includes(CHARSET_UTF8);
        }
      }
      // Pass 2: baca field record 2 (Application Record)
      const decode = (b) => (charsetUtf8 ? b.toString("utf8") : b.toString("latin1"));
      for (const ds of datasets) {
        if (ds.record !== 2) continue;
        if (ds.ds === DS.ObjectName) out.title = decode(ds.data);
        else if (ds.ds === DS.Keywords) out.keywords.push(decode(ds.data));
        else if (ds.ds === DS.Byline) out.author = decode(ds.data);
        else if (ds.ds === DS.Caption) out.caption = decode(ds.data);
      }
    } else {
      // Resource 8BIM lain: simpan untuk dipertahankan saat menulis ulang
      out.others.push({
        id,
        name: Buffer.from(payload.subarray(off + 7, off + 7 + nameLen)),
        data: Buffer.from(payload.subarray(dataStart, dataEnd)),
      });
    }
    let nextOff = dataEnd;
    if (nextOff % 2 !== 0) nextOff += 1;
    off = nextOff;
  }
  return out;
}

/** Satu dataset: marker 0x1C + record + dataset + panjang (2 byte BE) + data. */
function dataset(record, ds, buf) {
  const head = Buffer.alloc(5);
  head[0] = 0x1c;
  head[1] = record;
  head[2] = ds;
  head.writeUInt16BE(buf.length, 3);
  return Buffer.concat([head, buf]);
}

/** Bangun satu resource 8BIM ("8BIM" + ID + nama Pascal genap + ukuran + data). */
function buildResource(id, data, name) {
  const n = name && name.length ? name : Buffer.alloc(0);
  let prefix = 7 + n.length; // "8BIM"(4) + ID(2) + panjang nama(1) + nama
  if (prefix % 2 !== 0) prefix += 1; // nama Pascal digenapkan
  const head = Buffer.alloc(prefix + 4);
  head.write("8BIM", 0, "latin1");
  head.writeUInt16BE(id, 4);
  head[6] = n.length;
  n.copy(head, 7);
  head.writeUInt32BE(data.length, prefix);
  let res = Buffer.concat([head, data]);
  if (res.length % 2 !== 0) {
    res = Buffer.concat([res, Buffer.from([0])]);
  }
  return res;
}

/**
 * Bangun segmen APP13 "Photoshop 3.0" berisi resource 8BIM IPTC (0x0404).
 * @param {object} fields { title?, keywords?[], caption?, author? }
 *                         Nilai null/undefined/kosong diabaikan.
 * @param {Array}  others Resource 8BIM non-IPTC ({ id, name: Buffer, data: Buffer })
 *                        yang dipertahankan, mis. dari readIptcFromApp13().others.
 * @returns {Buffer|null} Segmen lengkap (FF ED + panjang + payload), atau null
 *                        bila tidak ada field maupun resource lain yang diisi.
 */
export function buildIptcApp13(fields, others = []) {
  const hasContent = fields && (
    (fields.title != null && fields.title !== "") ||
    (Array.isArray(fields.keywords) && fields.keywords.some((k) => k != null && k !== "")) ||
    (fields.caption != null && fields.caption !== "") ||
    (fields.author != null && fields.author !== "")
  );
  const keepOthers = (others || []).filter(
    (r) => r && r.id !== IPTC_RES && r.data && r.data.length
  );
  if (!hasContent && !keepOthers.length) return null;

  const resources = [];
  if (hasContent) {
    const enc = (s) => Buffer.from(String(s), "utf8");
    const parts = [dataset(1, 0x5a, Buffer.from(CHARSET_UTF8, "latin1"))];
    if (fields.title != null && fields.title !== "") parts.push(dataset(2, DS.ObjectName, enc(fields.title)));
    for (const k of fields.keywords || []) {
      if (k != null && k !== "") parts.push(dataset(2, DS.Keywords, enc(k)));
    }
    if (fields.caption != null && fields.caption !== "") parts.push(dataset(2, DS.Caption, enc(fields.caption)));
    if (fields.author != null && fields.author !== "") parts.push(dataset(2, DS.Byline, enc(fields.author)));
    resources.push(buildResource(IPTC_RES, Buffer.concat(parts), Buffer.alloc(0)));
  }
  for (const r of keepOthers) resources.push(buildResource(r.id, r.data, r.name));

  const payload = Buffer.concat([Buffer.from(PS_HEADER, "latin1"), ...resources]);
  const seg = Buffer.alloc(2 + 2 + payload.length);
  seg.writeUInt16BE(0xffed, 0);
  seg.writeUInt16BE(2 + payload.length, 2);
  payload.copy(seg, 4);
  return seg;
}
