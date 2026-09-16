// Parser metadata berkas EPS (Encapsulated PostScript) murni Node.js tanpa dependensi eksternal.
// Mendukung format ASCII EPS, Binary DOS EPS (0xC5D0D3C6), DSC Comments, dan Adobe XMP Dublin Core.

const BINARY_EPS_MAGIC = Buffer.from([0xc5, 0xd0, 0xd3, 0xc6]);

/**
 * Periksa apakah buffer merupakan berkas EPS (ASCII EPS atau Binary DOS EPS).
 * @param {Buffer} buf
 * @returns {boolean}
 */
export function isEps(buf) {
  if (!buf || buf.length < 4) return false;
  // 1. Binary DOS EPS header
  if (buf.length >= 30 && buf.subarray(0, 4).equals(BINARY_EPS_MAGIC)) {
    return true;
  }
  // 2. ASCII EPS (dimulai dengan %!PS)
  const header = buf.subarray(0, Math.min(buf.length, 1024)).toString("latin1");
  if (header.startsWith("%!PS") || header.includes("%!PS-Adobe")) {
    return true;
  }
  return false;
}

/**
 * Ekstraksi buffer PostScript dari berkas EPS (menghapus wrapper binary DOS header bila ada).
 * @param {Buffer} buf
 * @returns {Buffer}
 */
export function getPostScriptBuffer(buf) {
  if (buf.length >= 30 && buf.subarray(0, 4).equals(BINARY_EPS_MAGIC)) {
    const psOffset = buf.readUInt32LE(4);
    const psLength = buf.readUInt32LE(8);
    if (psOffset > 0 && psOffset < buf.length) {
      const end = Math.min(buf.length, psOffset + psLength);
      return buf.subarray(psOffset, end);
    }
  }
  return buf;
}

/**
 * Parser ringan untuk metadata Adobe XMP (Dublin Core dc:title, dc:description, dc:creator, dc:subject).
 * @param {string} xmpStr
 * @returns {object|null}
 */
export function parseXmpFromEps(xmpStr) {
  if (!xmpStr || typeof xmpStr !== "string") return null;
  const meta = { title: null, description: null, caption: null, author: null, keywords: [] };

  const unesc = (s) =>
    s ? s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim() : "";

  // dc:title
  const titleMatch = xmpStr.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
  if (titleMatch) meta.title = unesc(titleMatch[1]) || null;

  // dc:description
  const descMatch = xmpStr.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
  if (descMatch) {
    meta.description = unesc(descMatch[1]) || null;
    meta.caption = meta.description;
  }

  // dc:creator
  const creatorMatch = xmpStr.match(/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
  if (creatorMatch) meta.author = unesc(creatorMatch[1]) || null;

  // dc:subject (keywords)
  const subjectMatch = xmpStr.match(/<dc:subject[^>]*>([\s\S]*?)<\/dc:subject>/i);
  if (subjectMatch) {
    const liMatches = subjectMatch[1].matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/gi);
    for (const m of liMatches) {
      const kw = unesc(m[1]);
      if (kw) meta.keywords.push(kw);
    }
  }

  return meta;
}

/**
 * Pindai metadata berkas EPS: DSC Comments (Title, Creator, For, CreationDate, Copyright, BoundingBox) & Adobe XMP.
 * @param {Buffer} buf
 * @returns {object} { isEps, dims, title, author, creator, forUser, creationDate, copyright, software, keywords, xmpRaw, xmp }
 */
export function parseEpsMeta(buf) {
  if (!isEps(buf)) {
    throw new Error("Bukan berkas EPS valid.");
  }

  const psBuf = getPostScriptBuffer(buf);
  // Baca hingga 512KB pertama untuk header & XMP
  const scanLimit = Math.min(psBuf.length, 512 * 1024);
  const textHead = psBuf.subarray(0, scanLimit).toString("utf8");

  const meta = {
    isEps: true,
    dims: null,
    title: null,
    author: null,
    creator: null,
    forUser: null,
    creationDate: null,
    copyright: null,
    software: null,
    keywords: [],
    xmpRaw: null,
    xmp: null,
  };

  // 1. Ekstraksi DSC Comments
  // %%Title: ...
  const titleM = textHead.match(/^%%Title:\s*(.+)$/m);
  if (titleM) {
    const rawT = titleM[1].trim();
    if (rawT && !rawT.startsWith("(atend)")) {
      // Bersihkan tanda kurung PostScript jika ada: (My Title) -> My Title
      meta.title = rawT.replace(/^\((.*)\)$/, "$1").trim();
    }
  }

  // %%Creator: ...
  const creatorM = textHead.match(/^%%Creator:\s*(.+)$/m);
  if (creatorM) {
    const rawC = creatorM[1].trim();
    if (rawC && !rawC.startsWith("(atend)")) {
      meta.creator = rawC.replace(/^\((.*)\)$/, "$1").trim();
      meta.software = meta.creator;
    }
  }

  // %%For: ...
  const forM = textHead.match(/^%%For:\s*(.+)$/m);
  if (forM) {
    const rawF = forM[1].trim();
    if (rawF && !rawF.startsWith("(atend)")) {
      meta.forUser = rawF.replace(/^\((.*)\)$/, "$1").trim();
      if (!meta.author) meta.author = meta.forUser;
    }
  }

  // %%CreationDate: ...
  const dateM = textHead.match(/^%%CreationDate:\s*(.+)$/m);
  if (dateM) {
    const rawD = dateM[1].trim();
    if (rawD && !rawD.startsWith("(atend)")) {
      meta.creationDate = rawD.replace(/^\((.*)\)$/, "$1").trim();
    }
  }

  // %%Copyright: ...
  const copyM = textHead.match(/^%%Copyright:\s*(.+)$/m);
  if (copyM) {
    const rawCp = copyM[1].trim();
    if (rawCp && !rawCp.startsWith("(atend)")) {
      meta.copyright = rawCp.replace(/^\((.*)\)$/, "$1").trim();
    }
  }

  // 2. Ekstraksi Dimensi BoundingBox
  // Format: %%BoundingBox: llx lly urx ury (misal 0 0 500 500) atau %%HiResBoundingBox: 0 0 500.5 500.5
  let bbM = textHead.match(/^%%(?:HiRes)?BoundingBox:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/m);
  if (!bbM) {
    // Cek kemungkinan di akhir file jika ada (atend)
    const textTail = psBuf.subarray(Math.max(0, psBuf.length - 8192)).toString("utf8");
    bbM = textTail.match(/^%%(?:HiRes)?BoundingBox:\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/m);
  }

  if (bbM) {
    const llx = parseFloat(bbM[1]);
    const lly = parseFloat(bbM[2]);
    const urx = parseFloat(bbM[3]);
    const ury = parseFloat(bbM[4]);
    const w = Math.round(Math.abs(urx - llx));
    const h = Math.round(Math.abs(ury - lly));
    if (w > 0 && h > 0) {
      meta.dims = { w, h };
    }
  }

  // 3. Ekstraksi Paket Adobe XMP (jika ada)
  // Bisa berupa <?xpacket begin=...?>...<?xpacket end=...?> atau <x:xmpmeta...>...</x:xmpmeta>
  // atau di dalam blok %begin_xml_packet: ... %end_xml_packet
  let xmpMatch = textHead.match(/<\?xpacket begin=[\s\S]*?<\?xpacket end=[^>]*\?>/i);
  if (!xmpMatch) {
    xmpMatch = textHead.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/i);
  }
  if (!xmpMatch) {
    const xmlPacketM = textHead.match(/%begin_xml_packet:\s*([\s\S]*?)%end_xml_packet/i);
    if (xmlPacketM) {
      xmpMatch = [xmlPacketM[1]];
    }
  }

  if (xmpMatch) {
    meta.xmpRaw = xmpMatch[0];
    const parsedXmp = parseXmpFromEps(meta.xmpRaw);
    if (parsedXmp) {
      meta.xmp = parsedXmp;
      if (parsedXmp.title) meta.title = parsedXmp.title;
      if (parsedXmp.author) meta.author = parsedXmp.author;
      if (parsedXmp.keywords && parsedXmp.keywords.length > 0) {
        meta.keywords = parsedXmp.keywords;
      }
    }
  }

  return meta;
}
