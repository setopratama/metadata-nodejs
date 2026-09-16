// Modul tingkat tinggi: membaca, mengubah, dan menghapus metadata EXIF & IPTC & XMP.
// Mendukung format JPEG (.jpg, .jpeg), PNG (.png), SVG (.svg), dan EPS (.eps).
import fs from "node:fs";
import * as jpeg from "./jpeg.js";
import * as png from "./png.js";
import * as svg from "./svg.js";
import * as eps from "./eps.js";
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

/** Parser ringan untuk metadata Adobe XMP (Dublin Core dc:title, dc:description, dc:creator, dc:subject). */
export function parseXmpMetadata(xmpStr) {
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

/** Baca informasi + model EXIF / IPTC / XMP / Text dari satu file. */
export function readFileMeta(filePath) {
  const buf = fs.readFileSync(filePath);
  const st = fs.statSync(filePath);
  const isJpeg = jpeg.isJpeg(buf);
  const isPng = png.isPng(buf);
  const isSvg = svg.isSvg(buf);
  const isEps = eps.isEps(buf);
  const r = {
    file: filePath,
    size: st.size,
    mtime: st.mtime,
    isJpeg,
    isPng,
    isSvg,
    isEps,
    exifPresent: false,
    model: null,
    iptc: null,
    xmp: null,
    text: null,
    dims: null,
    svgMeta: null,
    epsMeta: null,
    exifError: null,
  };
  if (!isJpeg && !isPng && !isSvg && !isEps) return r;

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
    if (parsed.xmp) {
      const xmpRaw = buf.subarray(parsed.xmp.payloadStart + 29, parsed.xmp.payloadStart + parsed.xmp.payloadLen);
      r.xmp = parseXmpMetadata(xmpRaw.toString("utf8"));
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
    if (parsed.text && parsed.text.length > 0) {
      r.text = parsed.text;
      for (const item of parsed.text) {
        if ((item.keyword === "XML:com.adobe.xmp" || item.keyword.toLowerCase() === "xmp") && !r.xmp) {
          r.xmp = parseXmpMetadata(item.text);
        }
      }
    }
  } else if (isSvg) {
    const parsedSvg = svg.parseSvgMeta(buf);
    r.dims = parsedSvg.dims;
    r.svgMeta = parsedSvg;
    r.xmp = {
      title: parsedSvg.title,
      description: parsedSvg.description,
      caption: parsedSvg.caption,
      author: parsedSvg.author,
      keywords: parsedSvg.keywords,
    };
  } else if (isEps) {
    try {
      const parsedEps = eps.parseEpsMeta(buf);
      r.dims = parsedEps.dims;
      r.epsMeta = parsedEps;
      r.xmp = parsedEps.xmp || {
        title: parsedEps.title,
        description: parsedEps.title,
        caption: parsedEps.title,
        author: parsedEps.author,
        keywords: parsedEps.keywords || [],
      };
    } catch (e) {
      r.exifError = e.message;
    }
  }
  return r;
}

function val(entries, tag) {
  const e = exif.findTag(entries, tag);
  return e ? e.value : undefined;
}

/**
 * Ubah model EXIF (+ data IPTC / XMP / Text / SVG / EPS) menjadi objek tampilan yang ramah.
 * @param {object|null} model    Model EXIF (dari exif.parseTiff), boleh null
 * @param {object|null} dims     { w, h }
 * @param {object|null} iptcData { title, keywords[], caption, author } (dari iptc.readIptcFromApp13)
 * @param {object|null} xmpData  { title, keywords[], description, caption, author }
 * @param {Array|null}  textData Array chunk teks PNG { keyword, text }
 * @param {object|null} svgData  Data metadata SVG { software, ... }
 * @param {object|null} epsData  Data metadata EPS { title, author, creator, creationDate, copyright, software, keywords, ... }
 */
export function buildExifView(model, dims, iptcData, xmpData = null, textData = null, svgData = null, epsData = null) {
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

  // Helper pencari teks berdasarkan keyword case-insensitive
  const findText = (keys) => {
    if (!Array.isArray(textData)) return null;
    const lowerKeys = keys.map((k) => k.toLowerCase());
    const found = textData.find((t) => t.keyword && lowerKeys.includes(t.keyword.toLowerCase()));
    return found && found.text ? found.text.trim() : null;
  };

  let keywords = (iptcData && iptcData.keywords && iptcData.keywords.length ? iptcData.keywords : []);
  if (!keywords.length && model) {
    const rawKw = val(ifd0, exif.T.XPKeywords);
    if (rawKw) {
      let str = "";
      if (Buffer.isBuffer(rawKw)) {
        str = rawKw.toString("utf16le").replace(/\0+$/g, "").trim();
      } else if (Array.isArray(rawKw)) {
        str = Buffer.from(rawKw).toString("utf16le").replace(/\0+$/g, "").trim();
      } else if (typeof rawKw === "string") {
        str = rawKw.trim();
      }
      if (str) {
        keywords = str.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      }
    }
  }
  if (!keywords.length && xmpData && xmpData.keywords && xmpData.keywords.length) {
    keywords = xmpData.keywords.slice();
  }
  if (!keywords.length && Array.isArray(textData)) {
    const kwText = findText(["keywords", "tags", "subject"]);
    if (kwText) {
      keywords = kwText.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!keywords.length && epsData && epsData.keywords && epsData.keywords.length) {
    keywords = epsData.keywords.slice();
  }

  let title = (iptcData && iptcData.title) || val(ifd0, exif.T.ImageDescription) || null;
  if (!title && model) {
    const rawTitle = val(ifd0, exif.T.XPTitle);
    if (rawTitle) {
      if (Buffer.isBuffer(rawTitle)) title = rawTitle.toString("utf16le").replace(/\0+$/g, "").trim() || null;
      else if (Array.isArray(rawTitle)) title = Buffer.from(rawTitle).toString("utf16le").replace(/\0+$/g, "").trim() || null;
    }
  }
  if (!title && xmpData && xmpData.title) {
    title = xmpData.title;
  }
  if (!title && Array.isArray(textData)) {
    title = findText(["title", "headline", "document title"]);
  }
  if (!title && epsData && epsData.title) {
    title = epsData.title;
  }

  let caption = (iptcData && iptcData.caption) || val(ifd0, exif.T.ImageDescription) || null;
  if (!caption && model) {
    const rawCap = val(ifd0, exif.T.XPComment);
    if (rawCap) {
      if (Buffer.isBuffer(rawCap)) caption = rawCap.toString("utf16le").replace(/\0+$/g, "").trim() || null;
      else if (Array.isArray(rawCap)) caption = Buffer.from(rawCap).toString("utf16le").replace(/\0+$/g, "").trim() || null;
    }
  }
  if (!caption && xmpData && (xmpData.description || xmpData.caption)) {
    caption = xmpData.description || xmpData.caption;
  }
  if (!caption && Array.isArray(textData)) {
    caption = findText(["description", "comment", "caption", "abstract", "summary"]);
  }
  if (!caption && epsData && (epsData.title || (epsData.xmp && (epsData.xmp.description || epsData.xmp.caption)))) {
    caption = (epsData.xmp && (epsData.xmp.description || epsData.xmp.caption)) || epsData.title;
  }

  let author = (iptcData && iptcData.author) || val(ifd0, exif.T.Artist) || null;
  if (!author && model) {
    const rawAut = val(ifd0, exif.T.XPAuthor);
    if (rawAut) {
      if (Buffer.isBuffer(rawAut)) author = rawAut.toString("utf16le").replace(/\0+$/g, "").trim() || null;
      else if (Array.isArray(rawAut)) author = Buffer.from(rawAut).toString("utf16le").replace(/\0+$/g, "").trim() || null;
    }
  }
  if (!author && xmpData && xmpData.author) {
    author = xmpData.author;
  }
  if (!author && Array.isArray(textData)) {
    author = findText(["author", "artist", "creator", "by-line"]);
  }
  if (!author && epsData && (epsData.author || epsData.creator || epsData.forUser)) {
    author = epsData.author || epsData.creator || epsData.forUser;
  }

  const software = val(ifd0, exif.T.Software) ||
    (svgData && svgData.software) ||
    (epsData && epsData.software) ||
    findText(["software", "source", "tool"]) ||
    null;

  const copyright = val(ifd0, exif.T.Copyright) ||
    (epsData && epsData.copyright) ||
    findText(["copyright", "legal"]) ||
    null;

  const dateTime = val(ifd0, exif.T.DateTime) ||
    (epsData && epsData.creationDate) ||
    findText(["creation time", "date"]) ||
    null;

  return {
    make: val(ifd0, exif.T.Make) || null,
    model: val(ifd0, exif.T.Model) || null,
    lens: val(ex, exif.T.LensModel) || null,
    software,
    artist: val(ifd0, exif.T.Artist) || author || null,
    copyright,
    description: val(ifd0, exif.T.ImageDescription) || caption || null,
    orientation: val(ifd0, exif.T.Orientation) || null,
    dateTime,
    dateTimeOriginal: val(ex, exif.T.DateTimeOriginal) || null,
    dateTimeDigitized: val(ex, exif.T.DateTimeDigitized) || null,
    exposureTime: val(ex, exif.T.ExposureTime) || null,
    fNumber: val(ex, exif.T.FNumber) || null,
    iso: val(ex, exif.T.ISO) || null,
    focalLength: val(ex, exif.T.FocalLength) || null,
    width,
    height,
    gps,
    // IPTC & EXIF & XMP Metadata (Windows Details)
    title,
    keywords,
    caption,
    author,
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

  if (opts.title !== undefined && opts.title !== null) {
    const s = String(opts.title);
    if (opts.description === undefined || opts.description === null) {
      exif.setTag(model.ifd0, exif.T.ImageDescription, 2, s);
    }
    exif.setTag(model.ifd0, exif.T.XPTitle, 1, Buffer.from(s + "\0", "utf16le"));
    touched = true;
  }

  if (opts.keywords !== undefined && opts.keywords !== null) {
    const kwArr = Array.isArray(opts.keywords)
      ? opts.keywords.map((s) => String(s).trim()).filter(Boolean)
      : String(opts.keywords).split(",").map((s) => s.trim()).filter(Boolean);
    const kwStr = kwArr.join(", ");
    if (kwStr) {
      exif.setTag(model.ifd0, exif.T.XPKeywords, 1, Buffer.from(kwStr + "\0", "utf16le"));
    } else {
      exif.removeTag(model.ifd0, exif.T.XPKeywords);
    }
    touched = true;
  }

  if (opts.caption !== undefined && opts.caption !== null) {
    const s = String(opts.caption);
    exif.setTag(model.ifd0, exif.T.XPComment, 1, Buffer.from(s + "\0", "utf16le"));
    touched = true;
  }

  if (opts.author !== undefined && opts.author !== null) {
    const s = String(opts.author);
    exif.setTag(model.ifd0, exif.T.Artist, 2, s);
    exif.setTag(model.ifd0, exif.T.XPAuthor, 1, Buffer.from(s + "\0", "utf16le"));
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

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Buat paket XMP XML standar Adobe untuk Title, Description, Keywords (dc:subject), dan Author. */
export function buildXmpPacket(meta) {
  const title = meta.title || "";
  const desc = meta.description || meta.caption || title || "";
  const author = meta.author || "";
  const keywords = Array.isArray(meta.keywords)
    ? meta.keywords
    : (meta.keywords ? String(meta.keywords).split(",").map((s) => s.trim()).filter(Boolean) : []);

  const kwItems = keywords
    .map((k) => `     <rdf:li>${escapeXml(k)}</rdf:li>`)
    .join("\n");

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapeXml(desc)}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:creator>
    <rdf:Seq>
     <rdf:li>${escapeXml(author)}</rdf:li>
    </rdf:Seq>
   </dc:creator>
   <dc:subject>
    <rdf:Bag>
${kwItems}
    </rdf:Bag>
   </dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Edit metadata satu file (dengan cadangan .bak secara default). */
export function editFile(filePath, opts) {
  const buf = fs.readFileSync(filePath);
  const isJp = jpeg.isJpeg(buf);
  const isPn = png.isPng(buf);
  if (!isJp && !isPn) throw new Error("Format tidak didukung (hanya JPEG dan PNG): " + filePath);

  let model = null;
  let beforeIptc = null;
  let beforeXmp = null;
  let beforeText = null;
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
    if (parsed.xmp) {
      const xmpRaw = buf.subarray(parsed.xmp.payloadStart + 29, parsed.xmp.payloadStart + parsed.xmp.payloadLen);
      beforeXmp = parseXmpMetadata(xmpRaw.toString("utf8"));
    }
  } else if (isPn) {
    const parsed = png.parsePng(buf);
    dims = parsed.dims;
    model = parsed.exif
      ? exif.parseTiff(buf, parsed.exif.payloadStart, parsed.exif.payloadStart + parsed.exif.payloadLen)
      : exif.createEmptyModel();
    if (parsed.text && parsed.text.length > 0) {
      beforeText = parsed.text;
      for (const item of parsed.text) {
        if (item.keyword === "XML:com.adobe.xmp" && !beforeXmp) {
          beforeXmp = parseXmpMetadata(item.text);
        }
      }
    }
  }

  const before = buildExifView(model, dims, beforeIptc, beforeXmp, beforeText);

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

  // Pada PNG, tambahkan/perbarui chunk iTXt untuk kompatibilitas Microstock (Title, Description, Keywords, Author)
  if (isPn && hasIptcOpts) {
    out = png.updatePngTextChunks(out, {
      title: opts.title,
      description: opts.description,
      caption: opts.caption,
      keywords: opts.keywords,
      author: opts.author,
    });
  }

  // Tambahkan/perbarui paket Adobe XMP (XML:com.adobe.xmp pada PNG / APP1 XMP pada JPEG)
  // Ini SANGAT PENTING agar Keywords terdeteksi otomatis di Adobe Stock Contributor
  if (hasIptcOpts) {
    const xmpStr = buildXmpPacket({
      title: opts.title,
      description: opts.description,
      caption: opts.caption,
      keywords: opts.keywords,
      author: opts.author,
    });
    if (isJp) {
      out = jpeg.insertXmp(out, xmpStr);
    } else if (isPn) {
      out = png.insertPngXmp(out, xmpStr);
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
    let afterIptc = null;
    let afterXmp = null;
    if (p2.iptc) {
      afterIptc = iptc.readIptcFromApp13(
        out.subarray(p2.iptc.payloadStart, p2.iptc.payloadStart + p2.iptc.payloadLen)
      );
    }
    if (p2.xmp) {
      const xmpRaw = out.subarray(p2.xmp.payloadStart + 29, p2.xmp.payloadStart + p2.xmp.payloadLen);
      afterXmp = parseXmpMetadata(xmpRaw.toString("utf8"));
    }
    if (p2.exif) {
      after = buildExifView(
        exif.parseTiff(out, p2.exif.payloadStart + 6, p2.exif.payloadStart + p2.exif.payloadLen),
        dims,
        afterIptc,
        afterXmp
      );
    } else if (afterIptc || afterXmp) {
      after = buildExifView(null, dims, afterIptc, afterXmp);
    }
  } else if (isPn) {
    const p2 = png.parsePng(out);
    let afterXmp = null;
    if (p2.text && p2.text.length > 0) {
      for (const item of p2.text) {
        if (item.keyword === "XML:com.adobe.xmp" && !afterXmp) {
          afterXmp = parseXmpMetadata(item.text);
        }
      }
    }
    const afterModel = p2.exif
      ? exif.parseTiff(out, p2.exif.payloadStart, p2.exif.payloadStart + p2.exif.payloadLen)
      : null;
    after = buildExifView(afterModel, dims, null, afterXmp, p2.text);
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
    const noMeta = png.removePngMetadata(buf);
    if (noMeta) {
      out = noMeta;
    } else {
      const noExif = png.removeExif(buf);
      if (noExif) out = noExif;
    }
  }

  if (out === buf) return { file: filePath, stripped: false };
  if (opts["no-backup"] === false) fs.copyFileSync(filePath, filePath + ".bak");
  fs.writeFileSync(filePath, out);
  return { file: filePath, stripped: true };
}
