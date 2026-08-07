// Ekspansi file (glob/direktori) dan rename batch berbasis template.
import fs from "node:fs";
import path from "node:path";
import * as utils from "./utils.js";
import { readFileMeta, buildExifView } from "./meta.js";

const IMAGE_EXT = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".tif", ".tiff", ".bmp", ".heic", ".heif",
];

function isImageFilename(name) {
  const ext = path.extname(name).toLowerCase();
  if (IMAGE_EXT.includes(ext)) return true;
  const n = name.toLowerCase();
  if (n.startsWith(".png") || n.startsWith(".jpg") || n.startsWith(".jpeg")) return true;
  return false;
}

/** Ekspansi argumen: file tunggal, glob (* ?), atau direktori (isinya file gambar). */
export function expandFiles(args, opts = {}) {
  const dirsOnlyImages = opts.dirsOnlyImages !== false;
  const out = [];
  for (const arg of args) {
    if (utils.hasGlob(arg)) {
      const { dir, pattern } = utils.splitGlob(arg);
      let entries = [];
      try {
        entries = fs.readdirSync(dir || ".");
      } catch (e) {
        utils.warn("Tidak dapat membaca " + (dir || ".") + ": " + e.message);
        continue;
      }
      const re = utils.globToRegExp(pattern);
      for (const name of entries) {
        if (dirsOnlyImages && !isImageFilename(name)) continue;
        if (re.test(name)) out.push(path.join(dir, name));
      }
    } else {
      let st = null;
      try {
        st = fs.statSync(arg);
      } catch (e) {
        utils.warn("Tidak ditemukan: " + arg);
        continue;
      }
      if (st.isDirectory()) {
        let entries = [];
        try {
          entries = fs.readdirSync(arg);
        } catch (e) {
          utils.warn("Tidak dapat membaca direktori: " + arg);
          continue;
        }
        for (const name of entries) {
          if (dirsOnlyImages && !isImageFilename(name)) continue;
          out.push(path.join(arg, name));
        }
      } else {
        out.push(arg);
      }
    }
  }
  return [...new Set(out.map((p) => path.resolve(p)))];
}

/**
 * Buat nama file baru dari template.
 * Token: {name} {ext} {folder} {make} {model} {lens} {artist} {copyright}
 *        {description} {software} {width} {height} {seq} {seq:N} {date} {date:FORMAT}
 * Ekstensi asli otomatis ditambahkan bila template tidak memuat {ext}.
 */
export function buildName(filePath, template, index, fileMeta) {
  const parsed = path.parse(filePath);
  const folder = path.basename(parsed.dir) || "";
  const view = fileMeta && (fileMeta.model || fileMeta.iptc)
    ? buildExifView(fileMeta.model, fileMeta.dims, fileMeta.iptc)
    : null;

  let ext = parsed.ext;
  if (!ext && fileMeta) {
    if (fileMeta.isPng) ext = ".png";
    else if (fileMeta.isJpeg) ext = ".jpg";
  }

  let dateObj = null;
  if (view && view.dateTimeOriginal) dateObj = utils.parseExifDate(view.dateTimeOriginal);
  if (!dateObj && fileMeta) dateObj = fileMeta.mtime;
  if (!dateObj) dateObj = new Date();

  const t = (v) => (v == null ? "" : String(v));
  const tokens = {
    name: parsed.name,
    ext: ext,
    folder,
    make: t(view && view.make),
    model: t(view && view.model),
    lens: t(view && view.lens),
    artist: t(view && view.artist),
    copyright: t(view && view.copyright),
    description: t(view && view.description),
    software: t(view && view.software),
    title: t(view && view.title) || t(view && view.description),
    keywords: t(view && view.keywords && view.keywords.join(", ")),
    width: t((view && view.width) || (fileMeta && fileMeta.dims && fileMeta.dims.w) || ""),
    height: t((view && view.height) || (fileMeta && fileMeta.dims && fileMeta.dims.h) || ""),
  };

  let tpl = String(template);
  tpl = tpl.replace(/\{date:([^}]+)\}/g, (_, fmt) => utils.formatToken(dateObj, fmt));
  tpl = tpl.replace(/\{date\}/g, () => utils.formatToken(dateObj, utils.DEFAULT_DATE_FMT));
  tpl = tpl.replace(/\{seq:(\d+)\}/g, (_, w) => utils.pad(index, parseInt(w, 10)));
  tpl = tpl.replace(/\{seq\}/g, String(index));
  tpl = tpl.replace(/\{(\w+)\}/g, (_, k) => (k in tokens ? tokens[k] : "{" + k + "}"));

  let namePart = tpl;
  if (ext && namePart.toLowerCase().endsWith(ext.toLowerCase())) {
    namePart = namePart.slice(0, namePart.length - ext.length);
  }
  let base = utils.sanitizeName(namePart);
  if ((base === "file" || !base.trim()) && parsed.name && parsed.name !== base) {
    base = utils.sanitizeName(parsed.name);
  }
  return path.join(parsed.dir, base + ext);
}

/**
 * Jalankan rename batch.
 * @param {string[]} files  Daftar file absolut
 * @param {string} template Template nama
 * @param {object} options  { apply: boolean, start: number }
 */
export function runRename(files, template, options) {
  const apply = Boolean(options.apply);
  const start = options.start || 1;
  const planned = new Set();
  const result = { total: files.length, renamed: 0, unchanged: 0, failed: 0, dryRun: !apply };

  utils.info(
    apply
      ? "Mengganti nama file..."
      : "Rencana rename (gunakan --apply untuk mengeksekusi):"
  );

  files.forEach((file, i) => {
    const idx = start + i;
    let fileMeta = null;
    try {
      fileMeta = readFileMeta(file);
    } catch (e) {
      utils.warn(path.basename(file) + ": tidak dapat dibaca (" + e.message + ")");
      result.failed += 1;
      return;
    }

    const parsed = path.parse(file);
    let target;
    try {
      target = buildName(file, template, idx, fileMeta);
    } catch (e) {
      utils.err(path.basename(file) + ": " + e.message);
      result.failed += 1;
      return;
    }

    const oldName = path.basename(file);
    const newName = path.basename(target);
    if (newName.toLowerCase() === oldName.toLowerCase()) {
      utils.info(utils.gray(String(idx).padStart(3, " ") + ". " + oldName + "  (nama tetap)"));
      result.unchanged += 1;
      return;
    }

    target = utils.ensureUniqueTarget(target, planned, file);
    planned.add(target.toLowerCase());
    utils.info("   " + utils.gray(String(idx).padStart(3, " ")) + ". " + oldName + "  ->  " + utils.green(path.basename(target)));

    if (apply) {
      try {
        fs.renameSync(file, target);
        result.renamed += 1;
      } catch (e) {
        utils.err(oldName + ": gagal mengganti nama (" + e.message + ")");
        result.failed += 1;
      }
    }
  });

  utils.info("");
  const willRename = files.length - result.unchanged - result.failed;
  utils.info(
    apply
      ? utils.green("Selesai: " + result.renamed + " diganti nama, " + result.unchanged + " tetap, " + result.failed + " gagal.")
      : utils.green("Total " + result.total + " file (" + willRename + " akan diganti nama).")
  );
  return result;
}
