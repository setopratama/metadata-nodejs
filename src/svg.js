// Parser Metadata Berkas Vektor SVG murni Node.js (Zero-Dependency).
// Membaca informasi dimensi (width/height/viewBox), tag standar (<title>, <desc>),
// serta metadata Dublin Core / Adobe XMP (<dc:title>, <dc:description>, <dc:creator>, <dc:subject>).

/**
 * Mendeteksi apakah buffer merupakan berkas SVG valid.
 * @param {Buffer|Uint8Array|string} buf
 * @returns {boolean}
 */
export function isSvg(buf) {
  if (!buf) return false;
  if (typeof buf === "string") {
    const s = buf.trim();
    return s.startsWith("<svg") || (s.startsWith("<?xml") && /<svg\b[^>]*>/i.test(s));
  }

  if (buf.length < 4) return false;

  // Lewati UTF-8 BOM jika ada
  let start = 0;
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) start = 3;

  // Ambil sampel awal hingga 2KB
  const sampleBuf = buf.subarray(start, Math.min(buf.length, start + 2048));

  // Pastikan tidak ada null byte yang menandakan file biner (JPEG, PNG, TIFF, dll.)
  for (let i = 0; i < sampleBuf.length; i++) {
    if (sampleBuf[i] === 0x00) return false;
  }

  const sample = sampleBuf.toString("utf8").trim();
  return sample.startsWith("<svg") || (sample.startsWith("<?xml") && /<svg\b[^>]*>/i.test(sample));
}

/**
 * Mengubah XML entities kembali ke karakter aslinya.
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function unescapeXml(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

/**
 * Mengekstrak dimensi lebar dan tinggi dari tag <svg ...>.
 * @param {string} svgTag
 * @returns {{ w: number, h: number } | null}
 */
function parseSvgDims(svgTag) {
  let w = null;
  let h = null;

  const widthMatch = svgTag.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const heightMatch = svgTag.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  if (widthMatch) w = Math.round(parseFloat(widthMatch[1]));
  if (heightMatch) h = Math.round(parseFloat(heightMatch[1]));

  if (w === null || h === null || w === 0 || h === 0) {
    const vbMatch = svgTag.match(/\bviewBox=["']\s*([0-9.-]+)[,\s]+([0-9.-]+)[,\s]+([0-9.-]+)[,\s]+([0-9.-]+)\s*["']/i);
    if (vbMatch) {
      if (w === null || w === 0) w = Math.round(parseFloat(vbMatch[3]));
      if (h === null || h === 0) h = Math.round(parseFloat(vbMatch[4]));
    }
  }

  return w && h ? { w, h } : null;
}

/**
 * Membaca dan mengekstrak metadata dari string atau buffer SVG.
 * @param {Buffer|string} content
 * @returns {{
 *   dims: { w: number, h: number } | null,
 *   title: string | null,
 *   caption: string | null,
 *   description: string | null,
 *   author: string | null,
 *   keywords: string[],
 *   software: string | null,
 *   rawMetadataXml: string | null
 * }}
 */
export function parseSvgMeta(content) {
  const svgStr = Buffer.isBuffer(content) ? content.toString("utf8") : String(content);

  const result = {
    dims: null,
    title: null,
    caption: null,
    description: null,
    author: null,
    keywords: [],
    software: null,
    rawMetadataXml: null,
  };

  // 1. Ekstraksi tag pembuka <svg ...>
  const svgTagMatch = svgStr.match(/<svg\b[^>]*>/i);
  if (svgTagMatch) {
    result.dims = parseSvgDims(svgTagMatch[0]);
  }

  // 2. Ekstraksi Software / Generator
  const genMatch = svgStr.match(/<!--\s*Generator:\s*([^\r\n>]+)-->/i);
  if (genMatch) {
    result.software = genMatch[1].trim();
  }

  // 3. Ekstraksi tag standar <title>...</title>
  const titleMatch = svgStr.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    result.title = unescapeXml(titleMatch[1]) || null;
  }

  // 4. Ekstraksi tag standar <desc>...</desc>
  const descMatch = svgStr.match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i);
  if (descMatch) {
    result.description = unescapeXml(descMatch[1]) || null;
    result.caption = result.description;
  }

  // 5. Ekstraksi blok <metadata>...</metadata>
  const metadataMatch = svgStr.match(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/i);
  if (metadataMatch) {
    const metaXml = metadataMatch[1];
    result.rawMetadataXml = metaXml;

    // a. Dublin Core: dc:title
    if (!result.title) {
      const dcTitleMatch = metaXml.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
      if (dcTitleMatch) {
        result.title = unescapeXml(dcTitleMatch[1]) || null;
      }
    }

    // b. Dublin Core: dc:description
    if (!result.description) {
      const dcDescMatch = metaXml.match(/<dc:description[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
      if (dcDescMatch) {
        result.description = unescapeXml(dcDescMatch[1]) || null;
        result.caption = result.description;
      }
    }

    // c. Dublin Core: dc:creator
    const dcCreatorMatch = metaXml.match(/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/i);
    if (dcCreatorMatch) {
      result.author = unescapeXml(dcCreatorMatch[1]) || null;
    }

    // d. Dublin Core: dc:subject (Keywords)
    const dcSubjectMatch = metaXml.match(/<dc:subject[^>]*>([\s\S]*?)<\/dc:subject>/i);
    if (dcSubjectMatch) {
      const liMatches = dcSubjectMatch[1].matchAll(/<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/gi);
      for (const m of liMatches) {
        const kw = unescapeXml(m[1]);
        if (kw && !result.keywords.includes(kw)) {
          result.keywords.push(kw);
        }
      }
    }
  }

  return result;
}
