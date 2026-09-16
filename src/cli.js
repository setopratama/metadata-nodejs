// Antarmuka baris perintah (CLI) utama.
import fs from "node:fs";
import path from "node:path";
import * as utils from "./utils.js";
import * as meta from "./meta.js";
import * as renameMod from "./rename.js";
import * as db from "./db.js";
import * as imageMod from "./image.js";
import * as vectorMod from "./vector.js";
import { runSelftest } from "../test/selftest.js";
import { startServer } from "./server.js";

export const VERSION = "1.1.0";

const BOOLEAN_OPTS = new Set([
  "apply", "json", "touch", "no-backup", "remove-gps", "help", "version", "no-color", "no-open", "keep-png", "no-metadata",
]);

function parseArgs(argv) {
  const files = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-v" || a === "--version") opts.version = true;
    else if (a.startsWith("--")) {
      let name = a.slice(2);
      let value;
      const eq = name.indexOf("=");
      if (eq >= 0) {
        value = name.slice(eq + 1);
        name = name.slice(0, eq);
      }
      if (BOOLEAN_OPTS.has(name)) {
        opts[name] = eq >= 0 ? value !== "false" : true;
      } else {
        if (value === undefined) value = argv[++i];
        if (value === undefined) throw new Error("Opsi --" + name + " membutuhkan nilai.");
        opts[name] = value;
      }
    } else {
      files.push(a);
    }
  }
  return { files, opts };
}

function usage() {
  utils.info(utils.bold("imgmeta v" + VERSION + " - ubah metadata foto & rename file (SQLite & node:sqlite bawaan)"));
  utils.info("");
  utils.info("Pemakaian: node index.js <perintah> [file...] [opsi]");
  utils.info("");
  utils.info("Perintah:");
  utils.info("  web          Jalankan Web UI (antarmuka browser interaktif)");
  utils.info("  auto         Proses otomatis: terapkan metadata (SQLite/file) & rename file sesuai judul");
  utils.info("  export-jpeg  Konversi gambar (PNG/JPEG) ke JPEG dengan metadata EXIF, IPTC & XMP");
  utils.info("  export-vector Konversi gambar (PNG/JPEG) ke Vektor SVG dengan metadata Dublin Core/XMP");
  utils.info("  read         Baca metadata foto (EXIF, IPTC & XMP)");
  utils.info("  edit         Ubah metadata (tanggal, GPS, artis, judul, tag, dll.)");
  utils.info("  apply        Terapkan judul & kata kunci (dari SQLite preset atau file daftar)");
  utils.info("  db           Kelola database SQLite (presets, items, import/export)");
  utils.info("  strip        Hapus semua metadata (EXIF, IPTC, XMP)");
  utils.info("  rename       Rename file batch dengan template");
  utils.info("  selftest     Jalankan pengujian internal");
  utils.info("");
  utils.info(utils.cyan("db:"));
  utils.info("  node index.js db list                      Daftar semua preset di SQLite");
  utils.info("  node index.js db show [preset]             Tampilkan data judul & kata kunci");
  utils.info("  node index.js db add <preset> --title \"..\" Tambah entri ke preset");
  utils.info("  node index.js db import <preset>           Impor dari title.txt / keyword.txt ke SQLite");
  utils.info("  node index.js db export <preset>           Ekspor dari SQLite ke file teks");
  utils.info("  node index.js db clear <preset>            Kosongkan isi preset");
  utils.info("");
  utils.info(utils.cyan("auto:"));
  utils.info('  node index.js auto "foto/*.jpg" [--preset default]');
  utils.info("  Menerapkan metadata dari SQLite (atau file daftar) dan me-rename file ke judulnya.");
  utils.info("");
  utils.info(utils.cyan("apply:"));
  utils.info('  node index.js apply "*.jpg" [--preset default]');
  utils.info('  node index.js apply "*.jpg" --titles title.txt --keywords-file keyword.txt');
  utils.info("  Menerapkan metadata per foto dari database SQLite preset atau file teks.");
  utils.info("");
  utils.info(utils.cyan("web:"));
  utils.info("  node index.js web [--port 3000] [--no-open]");
  utils.info("  Membuka antarmuka grafis Web UI di browser (default port: 3000).");
  utils.info("");
  utils.info(utils.cyan("read:"));
  utils.info("  node index.js read foto1.jpg foto2.jpg [--json]");
  utils.info("");
  utils.info(utils.cyan("edit:"));
  utils.info('  node index.js edit foto.jpg --date "2020-01-15 08:30:00" --artist "Budi"');
  utils.info("");
  utils.info(utils.cyan("strip:"));
  utils.info("  node index.js strip foto.jpg [--no-backup]");
  utils.info("");
  utils.info(utils.cyan("rename:"));
  utils.info('  node index.js rename "*.jpg" --template "{date:YYYYMMDD}_{seq:3}" [--apply]');
  utils.info('  node index.js rename "*.jpg" --template "{title}" [--preset default] [--apply]');
  utils.info("");
  utils.info(utils.cyan("export-jpeg:"));
  utils.info('  node index.js export-jpeg "foto/*.png" [--quality 90] [--preset default] [--out-dir out]');
  utils.info("  Mengonversi file PNG ke JPEG standar microstock, menyematkan EXIF, IPTC & Adobe XMP.");
  utils.info("");
  utils.info(utils.cyan("export-vector:"));
  utils.info('  node index.js export-vector "foto/*.png" [--profile microstock] [--mode spline] [--out-dir out]');
  utils.info('  node index.js export-vector "foto/*.jpg" [--hierarchical cutout] [--simplify 1.5] [--max-colors 32]');
  utils.info("  Mengonversi gambar raster ke vektor SVG (@visioncortex/vtracer) serta menyematkan metadata.");
  utils.info("  Profil: microstock (default, rapi & minim node), flat (clipart/logo), pixel, photo, bw.");
  utils.info("");
  utils.info(utils.cyan("Log kegagalan & Database:"));
  utils.info("  Database SQLite tersimpan di imgmeta.db (otomatis tanpa instalasi).");
  utils.info("  Setiap kegagalan dicatat ke imgmeta.log dan tersimpan di riwayat SQLite.");
  utils.info("");
}

// ---------- read ----------
function fmtExposure(r) {
  if (!r || !r.d) return "-";
  return exifFmtRational(r) + " s";
}

function exifFmtRational(r) {
  if (!r || !r.d) return "-";
  if (r.d === 1) return String(r.n);
  if (r.n === 1) return "1/" + r.d;
  return (r.n / r.d).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function fmtGps(gps) {
  if (!gps) return "-";
  let s = Math.abs(gps.lat).toFixed(6) + " " + gps.latRef + ", " + Math.abs(gps.lon).toFixed(6) + " " + gps.lonRef;
  if (gps.alt != null) s += " (" + gps.alt + " m)";
  if (gps.dateStamp) s += " [" + gps.dateStamp + "]";
  return s;
}

function printRead(file, r, view) {
  utils.info("");
  utils.info(utils.bold(file));
  if (!r.isJpeg && !r.isPng && !r.isSvg) {
    utils.warn("Format tidak didukung (metadata hanya didukung untuk JPEG, PNG, dan SVG).");
    return;
  }
  if (r.exifError) utils.warn("Gagal membaca sebagian EXIF: " + r.exifError);

  const rows = [];
  if (r.isSvg) {
    rows.push(["Format", "SVG (Scalable Vector Graphics)"]);
  }
  if (view) {
    const cam = [view.make, view.model].filter(Boolean).join(" ");
    rows.push(["Kamera", cam || "-"]);
    rows.push(["Lensa", view.lens || "-"]);
    rows.push(["Software", view.software || "-"]);
    rows.push(["Artis", view.artist || "-"]);
    rows.push(["Deskripsi", view.description || "-"]);
    rows.push(["Hak cipta", view.copyright || "-"]);
    rows.push(["Judul", view.title || "-"]);
    rows.push(["Kata kunci", view.keywords && view.keywords.length ? view.keywords.join(", ") : "-"]);
    rows.push(["Keterangan", view.caption || "-"]);
    rows.push(["Penulis", view.author || "-"]);
    if (view.orientation) {
      rows.push(["Orientasi", view.orientation + " (" + (meta.ORIENTATION_LABELS[view.orientation] || "?") + ")"]);
    }
    rows.push(["Eksposur", view.exposureTime ? fmtExposure(view.exposureTime) : "-"]);
    rows.push(["Diafragma", view.fNumber ? "f/" + exifFmtRational(view.fNumber) : "-"]);
    rows.push(["ISO", view.iso != null ? String(view.iso) : "-"]);
    rows.push(["Panjang fokus", view.focalLength ? exifFmtRational(view.focalLength) + " mm" : "-"]);
    rows.push(["GPS", fmtGps(view.gps)]);
  }
  if (!r.exifPresent && !r.isSvg) rows.push(["EXIF", "(tidak ada)"]);
  const dims = view && view.width ? view.width + " x " + view.height : r.dims ? r.dims.w + " x " + r.dims.h : "-";
  rows.push(["Dimensi", dims]);
  rows.push(["Ukuran file", utils.fmtBytes(r.size)]);
  for (const [k, v] of rows) {
    if (v !== undefined && v !== null && v !== "") utils.info("  " + k.padEnd(16) + ": " + v);
  }
}

function cmdRead(files, opts) {
  if (!files.length) throw new Error("Perintah read membutuhkan minimal 1 file. Contoh: node index.js read foto.jpg");
  const list = renameMod.expandFiles(files);
  if (!list.length) throw new Error("Tidak ada file yang ditemukan.");
  const jsonOut = [];
  for (const f of list) {
    const r = meta.readFileMeta(f);
    const view = r.model || r.iptc || r.xmp || r.text || r.svgMeta
      ? meta.buildExifView(r.model, r.dims, r.iptc, r.xmp, r.text, r.svgMeta)
      : null;
    if (opts.json) {
      jsonOut.push({
        file: f,
        isJpeg: r.isJpeg,
        isPng: r.isPng,
        isSvg: r.isSvg,
        dims: r.dims,
        exifPresent: r.exifPresent,
        metadata: view,
        error: r.exifError || null,
      });
    } else {
      printRead(f, r, view);
    }
  }
  if (opts.json) console.log(JSON.stringify(jsonOut, null, 2));
}

// ---------- edit / strip ----------
function viewDiff(before, after) {
  const keys = [
    ["make", "Kamera"], ["model", "Model"], ["lens", "Lensa"], ["software", "Software"],
    ["artist", "Artis"], ["copyright", "Hak cipta"], ["description", "Deskripsi"],
    ["title", "Judul"], ["keywords", "Kata kunci"], ["caption", "Keterangan"], ["author", "Penulis"],
    ["orientation", "Orientasi"], ["dateTime", "Tanggal (IFD0)"],
    ["dateTimeOriginal", "Tanggal asli"], ["dateTimeDigitized", "Tanggal digital"],
  ];
  const out = [];
  if (!before || !after) return out;
  for (const [k, label] of keys) {
    const a = before[k];
    const b = after[k];
    const sA = a == null ? "-" : String(a);
    const sB = b == null ? "-" : String(b);
    if (sA !== sB) out.push([label, sA, sB]);
  }
  const gA = before.gps, gB = after.gps;
  const sA = fmtGps(gA), sB = fmtGps(gB);
  if (sA !== sB) out.push(["GPS", sA, sB]);
  return out;
}

function printEditResult(res) {
  utils.info("");
  utils.info(utils.bold(res.file) + (res.backup ? utils.gray("  (cadangan: .bak)") : ""));
  const diffs = viewDiff(res.before, res.after);
  if (!diffs.length) {
    utils.info("  Tidak ada perubahan terdeteksi.");
    return;
  }
  for (const [label, oldV, newV] of diffs) {
    utils.info("  " + label.padEnd(16) + ": " + utils.gray(oldV) + "  ->  " + utils.green(newV));
  }
}

function cmdEdit(files, opts) {
  if (!files.length) throw new Error("Perintah edit membutuhkan minimal 1 file.");
  const list = renameMod.expandFiles(files);
  if (!list.length) throw new Error("Tidak ada file yang ditemukan.");

  const hasChanges = [
    "date", "gps", "gps-alt", "gps-time", "remove-gps", "make", "model", "lens",
    "software", "artist", "copyright", "description", "orientation",
    "title", "keywords", "caption", "author",
  ].some((k) => opts[k] !== undefined && opts[k] !== null);
  if (!hasChanges) {
    throw new Error("Tidak ada perubahan yang diminta. Contoh: node index.js edit foto.jpg --date \"2020-01-15 08:30:00\"");
  }

  for (const f of list) {
    try {
      printEditResult(meta.editFile(f, opts));
    } catch (e) {
      utils.err(f + ": " + e.message);
      utils.logFailure("edit", f, e.message);
    }
  }
}

function cmdStrip(files, opts) {
  if (!files.length) throw new Error("Perintah strip membutuhkan minimal 1 file.");
  const list = renameMod.expandFiles(files);
  if (!list.length) throw new Error("Tidak ada file yang ditemukan.");
  for (const f of list) {
    try {
      const r = meta.stripFile(f, opts);
      utils.info("");
      utils.info(utils.bold(f));
      utils.info(r.stripped ? "  Metadata foto dihapus (EXIF/IPTC/XMP)." : "  Tidak ada metadata foto.");
    } catch (e) {
      utils.err(f + ": " + e.message);
      utils.logFailure("strip", f, e.message);
    }
  }
}

// ---------- apply (judul/deskripsi & kata kunci dari file daftar) ----------
/** Baca file teks menjadi daftar baris. */
function readLines(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("File daftar tidak ditemukan: " + filePath);
  }
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).map((s) => s.trim());
}

/** Filter judul non-kosong agar selaras dengan kelompok kata kunci. */
export function parseTitles(lines) {
  return lines.map((s) => String(s).trim()).filter(Boolean);
}

/**
 * Urutkan daftar file agar selaras dari atas dengan baris di title.txt.
 * Jika file sudah memiliki metadata title yang cocok dengan baris ke-K di title.txt,
 * letakkan file tersebut di indeks K-1 agar tidak terjadi pergeseran/swap acak saat generate ulang.
 * File sisanya diurutkan secara alami (numeric natural sort).
 */
export function sortFilesByTitles(files, titles) {
  if (!titles || !titles.length) {
    return files.slice().sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  const fileMetas = files.map((f) => {
    let t = null;
    try {
      const r = meta.readFileMeta(f);
      const view = meta.buildExifView(r.model, r.dims, r.iptc, r.xmp, r.text, r.svgMeta);
      t = view && view.title ? view.title.trim().toLowerCase() : null;
    } catch {}
    return { file: f, title: t };
  });

  const slots = new Array(files.length).fill(null);
  const unassigned = [];

  for (const item of fileMetas) {
    let matchedIdx = -1;
    if (item.title) {
      matchedIdx = titles.findIndex((t) => t.trim().toLowerCase() === item.title);
    }
    if (matchedIdx >= 0 && matchedIdx < files.length && slots[matchedIdx] === null) {
      slots[matchedIdx] = item.file;
    } else {
      unassigned.push(item.file);
    }
  }

  unassigned.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  let unIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null) {
      slots[i] = unassigned[unIdx++];
    }
  }

  return slots;
}

// ---------- db (manajemen database SQLite) ----------
function cmdDb(args, opts) {
  const sub = args.shift() || "list";
  if (sub === "list" || sub === "ls") {
    const presets = db.listPresets();
    utils.info(utils.bold("=== DAFTAR PRESET SQLITE (imgmeta.db) ==="));
    if (!presets.length) {
      utils.info("Belum ada preset.");
      return;
    }
    for (const p of presets) {
      utils.info(`  • ${utils.cyan(p.id.padEnd(16))} : ${p.name} (${p.item_count} entri) ${p.description ? utils.gray('- ' + p.description) : ''}`);
    }
    utils.info("");
  } else if (sub === "show" || sub === "view") {
    const presetId = args[0] || opts.preset || "default";
    const preset = db.getPreset(presetId);
    if (!preset) throw new Error("Preset tidak ditemukan: " + presetId);
    const items = db.getPresetItems(presetId);
    utils.info(utils.bold(`=== PRESET: ${preset.name} (${preset.id}) — ${items.length} entri ===`));
    if (!items.length) {
      utils.info("Preset ini belum memiliki entri.");
      return;
    }
    items.forEach((it, idx) => {
      utils.info(`[#${idx + 1}] ${utils.green(it.title || '(tanpa judul)')}`);
      if (it.keywords.length) utils.info(`      Kata kunci : ${it.keywords.join(', ')}`);
      if (it.author) utils.info(`      Penulis    : ${it.author}`);
    });
    utils.info("");
  } else if (sub === "add") {
    const presetId = args[0] || opts.preset || "default";
    if (!opts.title && !opts.keywords) {
      throw new Error("Gunakan --title \"...\" dan/atau --keywords \"...\"");
    }
    const item = db.addPresetItem(presetId, {
      title: opts.title || "",
      keywords: opts.keywords || "",
      caption: opts.caption || opts.title || "",
      author: opts.author || "",
    });
    utils.info(utils.green(`Entri #${item.sortOrder} berhasil ditambahkan ke preset '${presetId}'.`));
  } else if (sub === "import") {
    const presetId = args[0] || opts.preset || "default";
    const titleFile = opts.titles || "title.txt";
    const keywordFile = opts.keywords || opts["keywords-file"] || "keyword.txt";
    
    let titleText = "";
    if (fs.existsSync(titleFile)) titleText = fs.readFileSync(titleFile, "utf8");
    let keywordText = "";
    if (fs.existsSync(keywordFile)) keywordText = fs.readFileSync(keywordFile, "utf8");

    if (!titleText && !keywordText) {
      throw new Error(`File sumber tidak ditemukan (${titleFile} / ${keywordFile}).`);
    }

    const mode = opts.append ? "append" : "replace";
    const items = db.importTextToPreset(presetId, { titleText, keywordText, mode });
    utils.info(utils.green(`Berhasil mengimpor ${items.length} entri ke preset '${presetId}' (mode: ${mode}).`));
  } else if (sub === "export") {
    const presetId = args[0] || opts.preset || "default";
    const exp = db.exportPresetToText(presetId);
    const titleOut = opts.titles || "title.txt";
    const kwOut = opts.keywords || opts["keywords-file"] || "keyword.txt";

    fs.writeFileSync(titleOut, exp.titlesText, "utf8");
    fs.writeFileSync(kwOut, exp.keywordsText, "utf8");
    utils.info(utils.green(`Berhasil mengekspor ${exp.items.length} entri ke '${titleOut}' dan '${kwOut}'.`));
  } else if (sub === "clear") {
    const presetId = args[0] || opts.preset || "default";
    db.clearPresetItems(presetId);
    utils.info(utils.green(`Seluruh entri pada preset '${presetId}' berhasil dikosongkan.`));
  } else if (sub === "delete" || sub === "rm") {
    const presetId = args[0] || opts.preset;
    if (!presetId) throw new Error("Tentukan ID preset yang akan dihapus.");
    db.deletePreset(presetId);
    utils.info(utils.green(`Preset '${presetId}' berhasil dihapus.`));
  } else {
    throw new Error("Subperintah db tidak dikenal: " + sub + " (pilihan: list, show, add, import, export, clear, delete)");
  }
}

// ---------- apply (judul/deskripsi & kata kunci dari SQLite / file daftar) ----------
function cmdApply(files, opts) {
  if (!files.length) throw new Error("Perintah apply membutuhkan minimal 1 file/glob/direktori.");

  const rawList = renameMod.expandFiles(files);
  if (!rawList.length) throw new Error("Tidak ada file yang ditemukan.");

  let titles = null;
  let keywordGroups = null;

  if (opts.titles || opts["keywords-file"]) {
    // Mode file teks
    titles = opts.titles ? parseTitles(readLines(opts.titles)) : null;
    keywordGroups = opts["keywords-file"]
      ? utils.parseKeywordGroups(readLines(opts["keywords-file"]))
      : null;
  } else {
    // Mode database SQLite
    const presetId = opts.preset || "default";
    const items = db.getPresetItems(presetId);
    if (!items.length) {
      throw new Error(`Preset '${presetId}' di SQLite kosong. Gunakan 'node index.js db import ${presetId}' atau tentukan file dengan --titles.`);
    }
    titles = items.map((it) => it.title).filter(Boolean);
    keywordGroups = items.map((it) => it.keywords);
  }

  const noBackup = opts["no-backup"] === true;
  const list = sortFilesByTitles(rawList, titles);

  utils.info("Menerapkan judul & kata kunci...");
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  list.forEach((f, i) => {
    const editOpts = {};
    if (titles && i < titles.length && titles[i] !== "") {
      editOpts.title = titles[i];
      editOpts.caption = titles[i];
      editOpts.description = titles[i];
    }
    if (keywordGroups && i < keywordGroups.length && keywordGroups[i].length) {
      editOpts.keywords = keywordGroups[i];
    }
    if (!Object.keys(editOpts).length) {
      utils.warn(path.basename(f) + ": tidak ada baris untuk file ini — dilewati.");
      skipped += 1;
      return;
    }
    if (noBackup) editOpts["no-backup"] = true;
    try {
      printEditResult(meta.editFile(f, editOpts));
      applied += 1;
    } catch (e) {
      utils.err(f + ": " + e.message);
      utils.logFailure("apply", f, e.message);
      failed += 1;
    }
  });

  if (titles && titles.length > list.length) {
    utils.warn(
      "Daftar judul memiliki " + (titles.length - list.length) +
      " judul lebih banyak dari jumlah file — kelebihan diabaikan."
    );
  }
  if (keywordGroups && keywordGroups.length > list.length) {
    utils.warn(
      "Daftar kata kunci memiliki " + (keywordGroups.length - list.length) +
      " kelompok lebih banyak dari jumlah file — kelebihan diabaikan."
    );
  }

  db.recordHistory({
    operation: "apply",
    fileCount: list.length,
    successCount: applied,
    failCount: failed,
    logText: `Apply ${applied} file berhasil, ${skipped} dilewati, ${failed} gagal.`,
  });

  utils.info("");
  utils.info(
    utils.green("Selesai: " + applied + " diproses, " + skipped + " dilewati, " + failed + " gagal.")
  );
}

// ---------- auto (proses otomatis: apply title/keyword + rename sesuai title) ----------
function cmdAuto(files, opts) {
  const targetFiles = files.length ? files : ["foto"];
  const rawList = renameMod.expandFiles(targetFiles);
  if (!rawList.length) throw new Error("Tidak ada file yang ditemukan.");

  let titles = null;
  let keywordGroups = null;

  if (opts.titles || opts["keywords-file"]) {
    const titleFile = opts.titles || "title.txt";
    const keywordFile = opts["keywords-file"] || "keyword.txt";
    if (fs.existsSync(titleFile)) titles = parseTitles(readLines(titleFile));
    if (fs.existsSync(keywordFile)) keywordGroups = utils.parseKeywordGroups(readLines(keywordFile));
  } else {
    const presetId = opts.preset || "default";
    const items = db.getPresetItems(presetId);
    if (items.length) {
      titles = items.map((it) => it.title).filter(Boolean);
      keywordGroups = items.map((it) => it.keywords);
    } else {
      // Fallback ke file teks jika preset kosong dan file ada
      if (fs.existsSync("title.txt")) titles = parseTitles(readLines("title.txt"));
      if (fs.existsSync("keyword.txt")) keywordGroups = utils.parseKeywordGroups(readLines("keyword.txt"));
    }
  }

  const list = sortFilesByTitles(rawList, titles);

  utils.info("Proses otomatis: menerapkan metadata & mengganti nama file...");

  let metaSuccess = 0;
  let metaFailed = 0;

  // 1. Terapkan metadata ke seluruh file
  list.forEach((f, i) => {
    const editOpts = { "no-backup": true };
    if (titles && i < titles.length && titles[i] !== "") {
      editOpts.title = titles[i];
      editOpts.caption = titles[i];
      editOpts.description = titles[i];
    }
    if (keywordGroups && i < keywordGroups.length) {
      editOpts.keywords = keywordGroups[i];
    }

    if (Object.keys(editOpts).length > 1) {
      try {
        printEditResult(meta.editFile(f, editOpts));
        metaSuccess++;
      } catch (e) {
        metaFailed++;
        utils.err(f + ": gagal edit metadata (" + e.message + ")");
        utils.logFailure("auto", f, "gagal edit metadata: " + e.message);
      }
    }
  });

  // 2. Rename batch seluruh file sesuai title
  utils.info("");
  const renRes = renameMod.runRename(list, "{title}", {
    apply: true,
    titles: titles && titles.length ? titles : undefined,
  });

  db.recordHistory({
    operation: "auto",
    fileCount: list.length,
    successCount: renRes.renamed,
    failCount: renRes.failed + metaFailed,
    logText: `Auto: ${metaSuccess} metadata diaplikasikan, ${renRes.renamed} rename berhasil.`,
  });

  utils.info("");
  utils.info(utils.green("Selesai diproses!"));
}

// ---------- rename ----------
function cmdRename(files, opts) {
  if (!files.length) throw new Error("Perintah rename membutuhkan minimal 1 file/glob/direktori.");
  if (!opts.template) throw new Error("Opsi --template wajib diisi. Contoh: --template \"{date:YYYYMMDD}_{seq:3}\"");
  const rawList = renameMod.expandFiles(files);
  if (!rawList.length) throw new Error("Tidak ada file yang ditemukan.");

  let titles = null;
  if (opts.titles) {
    titles = parseTitles(readLines(opts.titles));
  } else if (opts.preset) {
    const items = db.getPresetItems(opts.preset);
    titles = items.map((it) => it.title).filter(Boolean);
  }

  const list = titles && titles.length ? sortFilesByTitles(rawList, titles) : rawList;
  const start = opts.start ? parseInt(opts.start, 10) || 1 : 1;
  const renRes = renameMod.runRename(list, opts.template, {
    apply: Boolean(opts.apply),
    start,
    titles: titles && titles.length ? titles : undefined,
  });

  if (opts.apply) {
    db.recordHistory({
      operation: "rename",
      fileCount: list.length,
      successCount: renRes.renamed,
      failCount: renRes.failed,
      logText: `Rename: ${renRes.renamed} diganti nama, ${renRes.unchanged} tetap. Template: ${opts.template}`,
    });
  }
}

// ---------- export-jpeg ----------
function cmdExportJpeg(files, opts) {
  if (!files.length) files = ["foto/*.png"];
  const rawList = renameMod.expandFiles(files);
  if (!rawList.length) throw new Error("Tidak ada file gambar yang ditemukan untuk diekspor ke JPEG.");

  let titles = null;
  let keywordGroups = null;
  if (opts.titles) {
    titles = parseTitles(readLines(opts.titles));
  } else if (opts.preset) {
    const items = db.getPresetItems(opts.preset);
    titles = items.map((it) => it.title).filter(Boolean);
    keywordGroups = items.map((it) => it.keywords);
  }

  if (opts["keywords-file"]) {
    keywordGroups = utils.parseKeywordGroups(readLines(opts["keywords-file"]));
  }

  const list = titles && titles.length ? sortFilesByTitles(rawList, titles) : rawList;
  const quality = opts.quality ? parseInt(opts.quality, 10) || 90 : 90;
  const outDir = opts["out-dir"] || null;

  utils.info(utils.bold(`Memulai export ${list.length} file ke JPEG (Kualitas: ${quality}%)...`));
  let success = 0;
  let failed = 0;

  list.forEach((filePath, i) => {
    try {
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const mappedTitle = titles && i < titles.length ? titles[i] : undefined;
      const mappedKeywords = keywordGroups && i < keywordGroups.length ? keywordGroups[i] : undefined;

      const targetDir = outDir ? path.resolve(outDir) : path.dirname(filePath);
      const destName = (mappedTitle ? utils.sanitizeName(mappedTitle) : baseName) + ".jpg";
      const destPath = path.join(targetDir, destName);

      const exportOpts = {
        quality,
        title: mappedTitle,
        keywords: mappedKeywords,
        caption: mappedTitle,
        description: mappedTitle,
      };

      const res = imageMod.exportFileToJpeg(filePath, destPath, exportOpts);
      success++;
      utils.info(`  ${utils.green("OK")} ${path.basename(filePath)} -> ${path.basename(destPath)} (${utils.fmtBytes(res.size)}, ${res.timeMs}ms)`);
    } catch (err) {
      failed++;
      utils.err(`  ${filePath}: gagal export JPEG (${err.message})`);
      utils.logFailure("export_jpeg", filePath, err.message);
    }
  });

  db.recordHistory({
    operation: "export_jpeg",
    fileCount: list.length,
    successCount: success,
    failCount: failed,
    logText: `Export JPEG: ${success} berhasil, ${failed} gagal. Kualitas: ${quality}%`,
  });

  utils.info("");
  utils.info(utils.green(`Selesai: ${success} file berhasil diekspor ke JPEG${failed ? `, ${failed} gagal` : ""}.`));
}

// ---------- export-vector ----------
function cmdExportVector(files, opts) {
  if (!files.length) files = ["foto/*.png", "foto/*.jpg"];
  const rawList = renameMod.expandFiles(files);
  if (!rawList.length) throw new Error("Tidak ada file gambar yang ditemukan untuk diekspor ke vektor SVG.");

  let titles = null;
  let keywordGroups = null;
  if (opts.titles) {
    titles = parseTitles(readLines(opts.titles));
  } else if (opts.preset && db.listPresets().some((p) => p.name === opts.preset)) {
    const items = db.getPresetItems(opts.preset);
    titles = items.map((it) => it.title).filter(Boolean);
    keywordGroups = items.map((it) => it.keywords);
  }

  if (opts["keywords-file"]) {
    keywordGroups = utils.parseKeywordGroups(readLines(opts["keywords-file"]));
  }

  const list = titles && titles.length ? sortFilesByTitles(rawList, titles) : rawList;
  const profile = opts.profile || opts["trace-profile"] || (opts.preset && vectorMod.VECTOR_PROFILES[opts.preset.toLowerCase()] ? opts.preset : "microstock");
  const tracePreset = opts["trace-preset"] || (opts.preset && ["poster", "photo", "bw", "clipart"].includes(opts.preset.toLowerCase()) ? opts.preset : undefined);
  const traceMode = opts.mode || undefined;
  const hierarchical = opts.hierarchical || undefined;
  const outDir = opts["out-dir"] || null;

  utils.info(utils.bold(`Memulai export ${list.length} file ke Vektor SVG (Profil: ${profile}${traceMode ? `, Mode: ${traceMode}` : ""})...`));
  let success = 0;
  let failed = 0;

  list.forEach((filePath, i) => {
    try {
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const mappedTitle = titles && i < titles.length ? titles[i] : undefined;
      const mappedKeywords = keywordGroups && i < keywordGroups.length ? keywordGroups[i] : undefined;

      const targetDir = outDir ? path.resolve(outDir) : path.dirname(filePath);
      const destName = (mappedTitle ? utils.sanitizeName(mappedTitle) : baseName) + ".svg";
      const destPath = path.join(targetDir, destName);

      const exportOpts = {
        profile,
        preset: tracePreset,
        mode: traceMode,
        hierarchical,
        filterSpeckle: opts["filter-speckle"] !== undefined ? parseInt(opts["filter-speckle"], 10) : undefined,
        colorPrecision: opts["color-precision"] !== undefined ? parseInt(opts["color-precision"], 10) : undefined,
        maxColors: opts["max-colors"] !== undefined ? parseInt(opts["max-colors"], 10) : undefined,
        simplify: opts.simplify !== undefined ? parseFloat(opts.simplify) : undefined,
        cornerThreshold: opts["corner-threshold"] !== undefined ? parseInt(opts["corner-threshold"], 10) : undefined,
        layerDifference: opts["layer-difference"] !== undefined ? parseInt(opts["layer-difference"], 10) : undefined,
        embedMetadata: !opts["no-metadata"],
        title: mappedTitle,
        keywords: mappedKeywords,
        caption: mappedTitle,
        description: mappedTitle,
      };

      const res = vectorMod.exportFileToVector(filePath, destPath, exportOpts);
      success++;
      utils.info(`  ${utils.green("OK")} ${path.basename(filePath)} -> ${path.basename(destPath)} (${utils.fmtBytes(res.size)}, ${res.timeMs}ms)`);
    } catch (err) {
      failed++;
      utils.err(`  ${filePath}: gagal export vektor (${err.message})`);
      utils.logFailure("export_vector", filePath, err.message);
    }
  });

  db.recordHistory({
    operation: "export_vector",
    fileCount: list.length,
    successCount: success,
    failCount: failed,
    logText: `Export Vektor SVG: ${success} berhasil, ${failed} gagal. Profil: ${profile}`,
  });

  utils.info("");
  utils.info(utils.green(`Selesai: ${success} file berhasil diekspor ke Vektor SVG${failed ? `, ${failed} gagal` : ""}.`));
}

// ---------- ringkasan log kegagalan ----------
/** Tampilkan ringkasan kegagalan sesi berjalan di akhir perintah. */
function printFailureSummary(opts = {}) {
  if (opts.json) return; // jangan mengotori output JSON (read --json)
  const failures = utils.getFailures();
  utils.info("");
  if (!failures.length) {
    utils.info(utils.gray("Log kegagalan: tidak ada error."));
    return;
  }
  utils.info(utils.red("Log kegagalan (" + failures.length + " error, tersimpan di " + utils.LOG_FILE + "):"));
  for (const line of failures) utils.info("  " + line);
}

// ---------- entry point ----------
export function run(argv) {
  let opts = {};
  try {
    const parsed = parseArgs(argv);
    const files = parsed.files;
    opts = parsed.opts;
    if (opts["no-color"]) utils.setColor(false);

    const cmd = files.shift() || "auto";
    if (opts.help || cmd === "-h") return usage();
    if (opts.version || cmd === "version") return console.log("imgmeta v" + VERSION);

    utils.resetFailures();

    switch (cmd) {
      case "web":
      case "serve":
      case "ui":
        return startServer(opts);
      case "auto":
      case "process":
        cmdAuto(files, opts);
        break;
      case "read":
        cmdRead(files, opts);
        break;
      case "edit":
        cmdEdit(files, opts);
        break;
      case "apply":
        cmdApply(files, opts);
        break;
      case "db":
      case "preset":
      case "database":
        cmdDb(files, opts);
        break;
      case "strip":
        cmdStrip(files, opts);
        break;
      case "rename":
        cmdRename(files, opts);
        break;
      case "export-jpeg":
      case "jpeg":
      case "export":
        cmdExportJpeg(files, opts);
        break;
      case "export-vector":
      case "vector":
      case "vectorize":
      case "svg":
        cmdExportVector(files, opts);
        break;
      case "selftest":
        return runSelftest();
      default:
        utils.err("Perintah tidak dikenal: " + cmd);
        utils.logFailure("cli", "", "perintah tidak dikenal: " + cmd);
        usage();
        process.exitCode = 1;
    }

    printFailureSummary(opts);
  } catch (e) {
    utils.err(e.message);
    utils.logFailure("cli", "", e.message);
    utils.info("Gunakan: node index.js --help");
    printFailureSummary(opts);
    process.exitCode = 1;
  }
}

