// Modul Pemrosesan & Export Gambar ke Vektor SVG menggunakan WebAssembly VTracer.
// Mendukung tracing gambar raster (PNG, JPEG, dll.) menjadi grafik vektor SVG.
// Menyematkan metadata Dublin Core, Adobe XMP, <title>, dan <desc> secara otomatis pada berkas SVG.
import fs from "node:fs";
import path from "node:path";
import vtracer from "@visioncortex/vtracer";
import * as meta from "./meta.js";
import * as utils from "./utils.js";

/**
 * Profil preset konfigurasi tracing siap pakai untuk kebutuhan grafis & microstock.
 */
export const VECTOR_PROFILES = {
  microstock: {
    key: "microstock",
    name: "Microstock Clean (Rekomendasi)",
    description: "Kurva rapi, potongan cutout (tanpa layer bertumpuk), minim node, standar kurasi microstock",
    preset: "poster",
    mode: "spline",
    hierarchical: "cutout",
    filterSpeckle: 8,
    colorPrecision: 6,
    simplify: 1.5,
    maxColors: 32,
    cornerThreshold: 60,
  },
  flat: {
    key: "flat",
    name: "Flat Clipart & Logo",
    description: "Warna datar kontras, kurva sederhana, cocok untuk ikon dan ilustrasi datar",
    preset: "poster",
    mode: "spline",
    hierarchical: "stacked",
    filterSpeckle: 12,
    colorPrecision: 4,
    simplify: 2.0,
    maxColors: 16,
    cornerThreshold: 60,
  },
  pixel: {
    key: "pixel",
    name: "Pixel Art to Vector",
    description: "Menjaga kotak-kotak piksel 1:1 tetap tajam tanpa kurva membulat",
    preset: "poster",
    mode: "pixel",
    hierarchical: "cutout",
    filterSpeckle: 0,
    colorPrecision: 8,
    simplify: 0,
    maxColors: 0,
    cornerThreshold: 90,
  },
  photo: {
    key: "photo",
    name: "Detailed Photo Trace",
    description: "Gradasi warna kaya dan kontur halus mendekati foto asli",
    preset: "photo",
    mode: "spline",
    hierarchical: "stacked",
    filterSpeckle: 2,
    colorPrecision: 7,
    simplify: 0.8,
    maxColors: 0,
    cornerThreshold: 45,
  },
  bw: {
    key: "bw",
    name: "Black & White (Siluet)",
    description: "Dua warna monokrom kontras tinggi untuk siluet, stempel, atau logo cap",
    preset: "bw",
    mode: "spline",
    hierarchical: "stacked",
    filterSpeckle: 4,
    colorPrecision: 2,
    simplify: 1.2,
    maxColors: 2,
    cornerThreshold: 60,
  },
};

/**
 * Melakukan sanitasi string agar aman disisipkan ke dokumen XML/SVG.
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Membangun blok metadata SVG (<title>, <desc>, dan <metadata><rdf:RDF>...).
 * @param {object} metaObj { title, description, caption, author, artist, keywords }
 * @returns {string} XML snippet atau string kosong bila tidak ada metadata
 */
export function buildSvgMetadata(metaObj = {}) {
  const title = metaObj.title || "";
  const desc = metaObj.description || metaObj.caption || title || "";
  const author = metaObj.author || metaObj.artist || "";
  const keywords = Array.isArray(metaObj.keywords)
    ? metaObj.keywords
    : (metaObj.keywords ? String(metaObj.keywords).split(",").map((s) => s.trim()).filter(Boolean) : []);

  if (!title && !desc && !author && keywords.length === 0) {
    return "";
  }

  const parts = [];
  if (title) {
    parts.push(`  <title>${escapeXml(title)}</title>`);
  }
  if (desc) {
    parts.push(`  <desc>${escapeXml(desc)}</desc>`);
  }

  const kwItems = keywords
    .map((k) => `            <rdf:li>${escapeXml(k)}</rdf:li>`)
    .join("\n");

  const rdf = [
    `  <metadata>`,
    `    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"`,
    `             xmlns:dc="http://purl.org/dc/elements/1.1/"`,
    `             xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">`,
    `      <rdf:Description rdf:about="">`,
  ];

  if (title) {
    rdf.push(`        <dc:title>`);
    rdf.push(`          <rdf:Alt>`);
    rdf.push(`            <rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li>`);
    rdf.push(`          </rdf:Alt>`);
    rdf.push(`        </dc:title>`);
  }

  if (desc) {
    rdf.push(`        <dc:description>`);
    rdf.push(`          <rdf:Alt>`);
    rdf.push(`            <rdf:li xml:lang="x-default">${escapeXml(desc)}</rdf:li>`);
    rdf.push(`          </rdf:Alt>`);
    rdf.push(`        </dc:description>`);
  }

  if (author) {
    rdf.push(`        <dc:creator>`);
    rdf.push(`          <rdf:Seq>`);
    rdf.push(`            <rdf:li>${escapeXml(author)}</rdf:li>`);
    rdf.push(`          </rdf:Seq>`);
    rdf.push(`        </dc:creator>`);
  }

  if (keywords.length > 0) {
    rdf.push(`        <dc:subject>`);
    rdf.push(`          <rdf:Bag>`);
    rdf.push(kwItems);
    rdf.push(`          </rdf:Bag>`);
    rdf.push(`        </dc:subject>`);
  }

  rdf.push(`      </rdf:Description>`);
  rdf.push(`    </rdf:RDF>`);
  rdf.push(`  </metadata>`);

  parts.push(rdf.join("\n"));
  return "\n" + parts.join("\n");
}

/**
 * Menyuntikkan blok metadata ke dalam string SVG persis setelah tag pembuka <svg ...>.
 * @param {string} svgString
 * @param {object} metaObj
 * @returns {string}
 */
export function injectSvgMetadata(svgString, metaObj) {
  const metadataSnippet = buildSvgMetadata(metaObj);
  if (!metadataSnippet) return svgString;

  let injected = false;
  const result = svgString.replace(/(<svg\b[^>]*>)/i, (match) => {
    injected = true;
    return match + metadataSnippet;
  });

  return injected ? result : svgString;
}

/**
 * Men-trace buffer gambar menjadi string SVG dan menyematkan metadata.
 * @param {Buffer|Uint8Array} buf
 * @param {object} [options]
 * @returns {string}
 */
export function vectorizeBuffer(buf, options = {}) {
  // 1. Tentukan profil dasar (Default: microstock)
  const profileKey = (options.profile || options.traceProfile || options.preset || "microstock").toLowerCase();
  const baseProfile = VECTOR_PROFILES[profileKey] || (profileKey === "clipart" ? VECTOR_PROFILES.flat : (profileKey === "poster" ? VECTOR_PROFILES.microstock : VECTOR_PROFILES.microstock));

  const vtracerOpts = {};

  // 2. Preset VTracer bawaan ('bw', 'poster', 'photo')
  const explicitPreset = (options.preset || baseProfile.preset || "poster").toLowerCase();
  if (explicitPreset === "bw") vtracerOpts.preset = "bw";
  else if (explicitPreset === "photo") vtracerOpts.preset = "photo";
  else vtracerOpts.preset = "poster";

  // 3. Mode kurva: 'spline', 'polygon', 'pixel'
  vtracerOpts.mode = options.mode || baseProfile.mode || "spline";

  // 4. Hierarki layer: 'cutout' (potongan) vs 'stacked' (bertumpuk)
  vtracerOpts.hierarchical = options.hierarchical || baseProfile.hierarchical || "cutout";

  // 5. Filter noise bercak (filterSpeckle)
  const speckle = options.filterSpeckle ?? options["filter-speckle"] ?? baseProfile.filterSpeckle;
  if (speckle !== undefined && speckle !== null && speckle !== "") {
    vtracerOpts.filterSpeckle = Number(speckle);
  }

  // 6. Presisi warna (colorPrecision 1 - 8)
  const precision = options.colorPrecision ?? options["color-precision"] ?? baseProfile.colorPrecision;
  if (precision !== undefined && precision !== null && precision !== "") {
    vtracerOpts.colorPrecision = Number(precision);
  }

  // 7. Batas jumlah warna maksimum (maxColors)
  const maxColors = options.maxColors ?? options["max-colors"] ?? baseProfile.maxColors;
  if (maxColors !== undefined && maxColors !== null && maxColors !== "" && Number(maxColors) > 0) {
    vtracerOpts.maxColors = Number(maxColors);
  }

  // 8. Simplifikasi kurva / pengurangan node anchor points (simplify)
  const simplify = options.simplify ?? baseProfile.simplify;
  if (simplify !== undefined && simplify !== null && simplify !== "") {
    vtracerOpts.simplify = Number(simplify);
  }

  // 9. Ketajaman sudut (cornerThreshold)
  const corner = options.cornerThreshold ?? options["corner-threshold"] ?? baseProfile.cornerThreshold;
  if (corner !== undefined && corner !== null && corner !== "") {
    vtracerOpts.cornerThreshold = Number(corner);
  }

  // 10. Toleransi perbedaan layer
  const layerDiff = options.layerDifference ?? options["layer-difference"];
  if (layerDiff !== undefined && layerDiff !== null && layerDiff !== "") {
    vtracerOpts.layerDifference = Number(layerDiff);
  }

  if (options.clustering) vtracerOpts.clustering = options.clustering;
  if (options.pathPrecision !== undefined) vtracerOpts.pathPrecision = Number(options.pathPrecision);

  // 11. Konversi via WebAssembly
  const rawSvg = vtracer.convertBuffer(buf, vtracerOpts);

  // 12. Injeksi Metadata SVG (Bisa dinonaktifkan via embedMetadata: false atau no-metadata: true)
  const shouldEmbed = options.embedMetadata !== false && !options["no-metadata"];
  if (!shouldEmbed) {
    return rawSvg;
  }

  return injectSvgMetadata(rawSvg, {
    title: options.title,
    description: options.description || options.caption,
    caption: options.caption || options.description,
    author: options.author || options.artist,
    keywords: options.keywords,
  });
}

/**
 * Mengekspor berkas gambar raster ke berkas SVG lengkap dengan metadata.
 * @param {string} srcFile Path file sumber (PNG/JPEG)
 * @param {string} destFile Path file SVG tujuan
 * @param {object} [options]
 * @returns {{ src: string, dest: string, size: number, timeMs: number }}
 */
export function exportFileToVector(srcFile, destFile, options = {}) {
  const startTime = Date.now();
  const buf = fs.readFileSync(srcFile);

  // Mewarisi metadata dari file sumber jika tidak disediakan secara eksplisit
  let inheritedTitle = options.title;
  let inheritedKeywords = options.keywords;
  let inheritedCaption = options.caption || options.description;
  let inheritedAuthor = options.author || options.artist;

  try {
    const srcMeta = meta.readFileMeta(srcFile);
    if (!inheritedTitle && srcMeta.view && srcMeta.view.title) {
      inheritedTitle = srcMeta.view.title;
    }
    if ((!inheritedKeywords || (Array.isArray(inheritedKeywords) && !inheritedKeywords.length)) && srcMeta.view && srcMeta.view.keywords) {
      inheritedKeywords = srcMeta.view.keywords;
    }
    if (!inheritedCaption && srcMeta.view) {
      inheritedCaption = srcMeta.view.caption || srcMeta.view.description || inheritedTitle;
    }
    if (!inheritedAuthor && srcMeta.view) {
      inheritedAuthor = srcMeta.view.artist || srcMeta.view.author;
    }
  } catch {
    // Abaikan jika bukan gambar JPEG/PNG yang memiliki EXIF/IPTC terstruktur
  }

  const finalOpts = {
    ...options,
    title: inheritedTitle,
    keywords: inheritedKeywords,
    caption: inheritedCaption,
    author: inheritedAuthor,
  };

  const svgContent = vectorizeBuffer(buf, finalOpts);

  fs.mkdirSync(path.dirname(path.resolve(destFile)), { recursive: true });
  fs.writeFileSync(destFile, svgContent, "utf8");

  const duration = Date.now() - startTime;
  const svgBuf = Buffer.from(svgContent, "utf8");

  return {
    src: srcFile,
    dest: destFile,
    size: svgBuf.length,
    timeMs: duration,
  };
}
