// Utilitas umum: warna, log, tanggal, nama file, glob.
import fs from "node:fs";
import path from "node:path";

// --- Warna ANSI ---
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

let colorEnabled = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
export function setColor(v) {
  colorEnabled = v;
}

const paint = (code, s) => (colorEnabled ? code + s + C.reset : s);
export const green = (s) => paint(C.green, s);
export const yellow = (s) => paint(C.yellow, s);
export const red = (s) => paint(C.red, s);
export const cyan = (s) => paint(C.cyan, s);
export const gray = (s) => paint(C.gray, s);
export const bold = (s) => paint(C.bold, s);

// --- Log ---
export function info(msg) {
  console.log(msg);
}
export function warn(msg) {
  console.log(yellow("WARN ") + msg);
}
export function err(msg) {
  console.error(red("ERROR ") + msg);
}

// --- Log kegagalan ke file ---
// File log kegagalan, ditulis dalam mode append di folder tempat perintah dijalankan.
export const LOG_FILE = path.join(process.cwd(), "imgmeta.log");

// Kumpulan kegagalan pada sesi berjalan — dipakai untuk ringkasan di akhir perintah.
let sessionFailures = [];

/** Kosongkan kumpulan kegagalan sesi (dipanggil di awal run()). */
export function resetFailures() {
  sessionFailures = [];
}

/** Salinan kegagalan sesi berjalan (baris log apa adanya). */
export function getFailures() {
  return sessionFailures.slice();
}

/**
 * Catat satu kegagalan ke file log (append) dan ke kumpulan sesi berjalan.
 * Format baris: [YYYY-MM-DD HH:mm:ss] [operasi] file — pesan.
 * Gagal menulis log tidak menghentikan proses — hanya dicetak ke stderr.
 * @param {string} operation Operasi yang gagal: rename, edit, apply, auto, strip, expand, cli, dll.
 * @param {string} file      Path file terkait (boleh kosong untuk kegagalan global)
 * @param {string} message   Deskripsi kegagalan
 * @param {string} logPath   Path file log (default LOG_FILE)
 */
export function logFailure(operation, file, message, logPath = LOG_FILE) {
  const stamp = formatToken(new Date(), "YYYY-MM-DD HH:mm:ss");
  const line = "[" + stamp + "] [" + operation + "] " + (file ? file + " — " : "") + message;
  sessionFailures.push(line);
  try {
    fs.appendFileSync(logPath, line + "\n", "utf8");
  } catch (e) {
    console.error(red("ERROR ") + "Tidak dapat menulis log " + logPath + ": " + e.message);
  }
}

// --- Angka / format ---
const p2 = (n) => String(n).padStart(2, "0");
const p4 = (n) => String(n).padStart(4, "0");
export const pad = (n, w) => String(n).padStart(w || 0, "0");

export function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1073741824).toFixed(2) + " GB";
}

// --- Tanggal ---
export const DEFAULT_DATE_FMT = "YYYY-MM-DD_HHmmss";

// Terima input tanggal seperti: 2020-01-15, 2020-01-15 08:30:00, 2020/01/15 08.30
export function parseDateInput(s) {
  if (typeof s !== "string") return null;
  const m = String(s).trim().match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (!m) return null;
  const d = new Date(
    +m[1], +m[2] - 1, +m[3],
    m[4] ? +m[4] : 0,
    m[5] ? +m[5] : 0,
    m[6] ? +m[6] : 0
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

// Format standar EXIF: "YYYY:MM:DD HH:MM:SS"
export function toExifDate(d) {
  return (
    p4(d.getFullYear()) + ":" + p2(d.getMonth() + 1) + ":" + p2(d.getDate()) +
    " " + p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds())
  );
}

export function parseExifDate(s) {
  if (typeof s !== "string") return null;
  const m = String(s).match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Format token: YYYY MM DD HH mm ss (contoh format: "YYYYMMDD_HHmmss")
export function formatToken(d, fmt) {
  return String(fmt).replace(/YYYY|MM|DD|HH|mm|ss/g, (t) => {
    if (t === "YYYY") return p4(d.getFullYear());
    if (t === "MM") return p2(d.getMonth() + 1);
    if (t === "DD") return p2(d.getDate());
    if (t === "HH") return p2(d.getHours());
    if (t === "mm") return p2(d.getMinutes());
    return p2(d.getSeconds());
  });
}

// --- Nama file ---
// Bersihkan karakter yang tidak valid di Windows: < > : " / \ | ? * dan kontrol
export function sanitizeName(name) {
  let s = String(name)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!s) s = "file";
  if (s.length > 180) s = s.slice(0, 180);
  return s;
}

// Pastikan target belum dipakai: tambahkan _1, _2, dst. bila bentrok.
// source (opsional) adalah file asli yang sedang diganti nama; nama itu sendiri
// dikecualikan dari pemeriksaan agar rename hanya mengubah huruf besar/kecil
// (mis. a.jpg -> A.jpg) tetap diperbolehkan.
/**
 * Pastikan target belum dipakai.
 * Format penambahan bila bentrok nyata: " (2)", " (3)", dst.
 * @param {string} target        Path target yang diinginkan
 * @param {Set<string>} planned  Set target yang sudah direncanakan dalam batch (lowercase)
 * @param {string|null} source   File asli yang sedang diganti nama
 * @param {Set<string>|null} batchSources Set seluruh file sumber dalam batch
 */
export function ensureUniqueTarget(target, planned, source = null, batchSources = null) {
  const ext = path.extname(target);
  const dir = path.dirname(target);
  const base = path.basename(target, ext);
  let name = base;
  let i = 2;

  const plannedNorm = planned
    ? new Set(Array.from(planned).map((x) => path.resolve(x).toLowerCase()))
    : null;

  const isTaken = (p) => {
    const pNorm = path.resolve(p).toLowerCase();
    if (plannedNorm && plannedNorm.has(pNorm)) return true;
    if (!fs.existsSync(p)) return false;
    if (source && pNorm === path.resolve(source).toLowerCase()) return false;
    if (batchSources && batchSources.has(pNorm)) return false;
    return true;
  };

  while (isTaken(path.join(dir, name + ext))) {
    name = base + " (" + i + ")";
    i += 1;
  }
  return path.join(dir, name + ext);
}

// --- File daftar (perintah apply) ---
/**
 * Ubah daftar baris dari keyword.txt menjadi kelompok kata kunci per foto.
 * Format: satu kata kunci per baris; baris KOSONG menandakan batas kelompok
 * (pindah ke foto berikutnya). Baris kosong di awal/akhir/beruntun diabaikan,
 * sehingga kelompok yang dihasilkan tidak pernah kosong.
 */
export function parseKeywordGroups(lines) {
  const groups = [];
  let cur = null;
  for (const line of lines) {
    const kw = String(line).trim();
    if (!kw) {
      if (cur !== null) {
        groups.push(cur);
        cur = null;
      }
    } else {
      const items = kw.split(",").map((s) => s.trim()).filter(Boolean);
      if (items.length > 0) {
        if (cur === null) cur = [];
        cur.push(...items);
      }
    }
  }
  if (cur !== null) groups.push(cur);
  return groups;
}

// --- Glob sederhana (* dan ?) ---
export function hasGlob(s) {
  return /[*?\[\]]/.test(s);
}

export function globToRegExp(pattern) {
  let re = "";
  for (const ch of pattern) {
    if (ch === "*") re += "[^/\\\\]*";
    else if (ch === "?") re += "[^/\\\\]";
    else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + re + "$", "i");
}

// Pisahkan path menjadi direktori + pola glob
export function splitGlob(arg) {
  const i = arg.search(/[*?\[\]]/);
  if (i < 0) return { dir: path.dirname(arg), pattern: path.basename(arg) };
  const prefix = arg.slice(0, i);
  const sep = Math.max(prefix.lastIndexOf("/"), prefix.lastIndexOf("\\"));
  const dir = sep >= 0 ? prefix.slice(0, sep) : ".";
  const pattern = sep >= 0 ? arg.slice(sep + 1) : arg;
  return { dir, pattern };
}
