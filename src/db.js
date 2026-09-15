// Modul Database SQLite bawaan Node.js (node:sqlite) — tanpa dependensi eksternal.
// Digunakan untuk menyimpan preset judul & kata kunci, riwayat operasi, dan template rename.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as utils from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_DB_PATH = path.resolve(__dirname, "..", "imgmeta.db");

let _dbInstance = null;
let _currentDbPath = null;

/**
 * Buka koneksi database SQLite (singleton per path).
 * @param {string} [dbPath]
 * @returns {DatabaseSync}
 */
export function getDb(dbPath = DEFAULT_DB_PATH) {
  const resolved = path.resolve(dbPath);
  if (_dbInstance && _currentDbPath === resolved) {
    return _dbInstance;
  }
  if (_dbInstance) {
    try {
      _dbInstance.close();
    } catch {}
    _dbInstance = null;
  }
  _currentDbPath = resolved;
  _dbInstance = new DatabaseSync(resolved);
  initDb(_dbInstance, path.dirname(resolved));
  return _dbInstance;
}

/**
 * Tutup koneksi database aktif.
 */
export function closeDb() {
  if (_dbInstance) {
    try {
      _dbInstance.close();
    } catch {}
    _dbInstance = null;
    _currentDbPath = null;
  }
}

/**
 * Inisialisasi skema tabel dan migrasi otomatis data awal.
 * @param {DatabaseSync} db
 * @param {string} rootDir
 */
export function initDb(db, rootDir = path.resolve(__dirname, "..")) {
  // 1. Tabel Presets
  db.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Tabel Items (data judul, kata kunci per foto dalam preset)
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      preset_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      title TEXT DEFAULT '',
      keywords TEXT DEFAULT '',
      caption TEXT DEFAULT '',
      author TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(preset_id) REFERENCES presets(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_items_preset_order ON items(preset_id, sort_order);
  `);

  // 3. Tabel Riwayat Operasi Batch (History)
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      operation TEXT NOT NULL,
      folder TEXT DEFAULT '',
      file_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      details TEXT DEFAULT '{}',
      log_text TEXT DEFAULT ''
    );
  `);

  // 4. Tabel Template Rename
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    );
  `);

  // Buat preset default jika belum ada
  const checkDefault = db.prepare("SELECT id FROM presets WHERE id = 'default'").get();
  const now = new Date().toISOString();
  if (!checkDefault) {
    db.prepare(`
      INSERT INTO presets (id, name, description, created_at, updated_at)
      VALUES ('default', 'Default Preset', 'Preset utama untuk judul & kata kunci foto', ?, ?)
    `).run(now, now);
  }

  // Buat template default jika kosong
  const tplCount = db.prepare("SELECT COUNT(*) as c FROM templates").get().c;
  if (tplCount === 0) {
    const insertTpl = db.prepare("INSERT INTO templates (name, pattern, is_default) VALUES (?, ?, ?)");
    insertTpl.run("Berdasarkan Judul", "{title}", 1);
    insertTpl.run("Tanggal & Urutan", "{date:YYYYMMDD}_{seq:3}", 0);
    insertTpl.run("Artis & Judul", "{artist}_{title}", 0);
    insertTpl.run("Kamera & Urutan", "{make}_{model}_{seq:3}", 0);
  }

  // Cek dan jalankan migrasi dari title.txt & keyword.txt jika tabel items kosong di default preset
  autoMigrateTextFiles(db, rootDir);
}

/**
 * Migrasi otomatis dari file title.txt & keyword.txt ke SQLite jika ada.
 */
export function autoMigrateTextFiles(db, rootDir = path.resolve(__dirname, "..")) {
  const itemCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE preset_id = 'default'").get().c;
  if (itemCount > 0) {
    return; // Sudah ada data di preset default
  }

  const titleFile = path.join(rootDir, "title.txt");
  const keywordFile = path.join(rootDir, "keyword.txt");

  let titleLines = [];
  if (fs.existsSync(titleFile)) {
    titleLines = fs.readFileSync(titleFile, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }

  let keywordGroups = [];
  if (fs.existsSync(keywordFile)) {
    const kwContent = fs.readFileSync(keywordFile, "utf8").split(/\r?\n/);
    keywordGroups = utils.parseKeywordGroups(kwContent);
  }

  if (!titleLines.length && !keywordGroups.length) {
    return;
  }

  const maxLen = Math.max(titleLines.length, keywordGroups.length);
  const now = new Date().toISOString();
  const insertItem = db.prepare(`
    INSERT INTO items (preset_id, sort_order, title, keywords, caption, author, created_at, updated_at)
    VALUES ('default', ?, ?, ?, ?, '', ?, ?)
  `);

  for (let i = 0; i < maxLen; i++) {
    const title = titleLines[i] || "";
    const kwArray = keywordGroups[i] || [];
    const keywords = Array.isArray(kwArray) ? kwArray.join(", ") : String(kwArray);
    insertItem.run(i + 1, title, keywords, title, now, now);
  }
}

// ==================== Presets CRUD ====================

export function listPresets(dbPath) {
  const db = getDb(dbPath);
  const rows = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM items WHERE preset_id = p.id) as item_count
    FROM presets p
    ORDER BY p.created_at ASC
  `).all();
  return rows;
}

export function getPreset(presetId, dbPath) {
  const db = getDb(dbPath);
  const row = db.prepare("SELECT * FROM presets WHERE id = ?").get(presetId);
  return row || null;
}

export function createPreset(id, name, description = "", dbPath) {
  const cleanId = String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  if (!cleanId) throw new Error("ID Preset tidak valid");
  const db = getDb(dbPath);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO presets (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(cleanId, name || cleanId, description, now, now);
  return getPreset(cleanId, dbPath);
}

export function updatePreset(id, { name, description }, dbPath) {
  const db = getDb(dbPath);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE presets
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `).run(name, description, now, id);
  return getPreset(id, dbPath);
}

export function deletePreset(presetId, dbPath) {
  if (presetId === "default") {
    throw new Error("Preset 'default' tidak boleh dihapus.");
  }
  const db = getDb(dbPath);
  db.prepare("DELETE FROM items WHERE preset_id = ?").run(presetId);
  db.prepare("DELETE FROM presets WHERE id = ?").run(presetId);
  return true;
}

// ==================== Preset Items CRUD ====================

export function getPresetItems(presetId = "default", dbPath) {
  const db = getDb(dbPath);
  const rows = db.prepare(`
    SELECT * FROM items
    WHERE preset_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(presetId);
  return rows.map((r) => ({
    id: r.id,
    presetId: r.preset_id,
    sortOrder: r.sort_order,
    title: r.title || "",
    keywords: r.keywords ? r.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
    keywordsRaw: r.keywords || "",
    caption: r.caption || "",
    author: r.author || "",
  }));
}

export function setPresetItems(presetId = "default", items = [], dbPath) {
  const db = getDb(dbPath);
  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION");
  try {
    db.prepare("DELETE FROM items WHERE preset_id = ?").run(presetId);
    const insert = db.prepare(`
      INSERT INTO items (preset_id, sort_order, title, keywords, caption, author, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach((it, idx) => {
      const sortOrder = idx + 1;
      const title = (it.title || "").trim();
      let keywordsStr = "";
      if (Array.isArray(it.keywords)) {
        keywordsStr = it.keywords.join(", ");
      } else if (typeof it.keywords === "string") {
        keywordsStr = it.keywords;
      }
      const caption = (it.caption || title || "").trim();
      const author = (it.author || "").trim();

      insert.run(presetId, sortOrder, title, keywordsStr, caption, author, now, now);
    });

    db.prepare("UPDATE presets SET updated_at = ? WHERE id = ?").run(now, presetId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return getPresetItems(presetId, dbPath);
}

export function addPresetItem(presetId = "default", item = {}, dbPath) {
  const db = getDb(dbPath);
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM items WHERE preset_id = ?").get(presetId).m || 0;
  const now = new Date().toISOString();
  const sortOrder = maxOrder + 1;
  const title = (item.title || "").trim();
  let keywordsStr = "";
  if (Array.isArray(item.keywords)) {
    keywordsStr = item.keywords.join(", ");
  } else if (typeof item.keywords === "string") {
    keywordsStr = item.keywords;
  }
  const caption = (item.caption || title || "").trim();
  const author = (item.author || "").trim();

  const info = db.prepare(`
    INSERT INTO items (preset_id, sort_order, title, keywords, caption, author, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(presetId, sortOrder, title, keywordsStr, caption, author, now, now);

  db.prepare("UPDATE presets SET updated_at = ? WHERE id = ?").run(now, presetId);
  return { id: info.lastInsertRowid, presetId, sortOrder, title, keywords: keywordsStr ? keywordsStr.split(",").map(k => k.trim()) : [], caption, author };
}

export function clearPresetItems(presetId = "default", dbPath) {
  const db = getDb(dbPath);
  db.prepare("DELETE FROM items WHERE preset_id = ?").run(presetId);
  const now = new Date().toISOString();
  db.prepare("UPDATE presets SET updated_at = ? WHERE id = ?").run(now, presetId);
  return true;
}

// ==================== Import / Export SQLite ====================

export function importTextToPreset(presetId = "default", { titleText = "", keywordText = "", mode = "replace" }, dbPath) {
  const titleLines = titleText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const keywordLines = keywordText.split(/\r?\n/);
  const keywordGroups = utils.parseKeywordGroups(keywordLines);

  const maxLen = Math.max(titleLines.length, keywordGroups.length);
  const items = [];

  for (let i = 0; i < maxLen; i++) {
    const title = titleLines[i] || "";
    const kw = keywordGroups[i] || [];
    items.push({
      title,
      keywords: kw,
      caption: title,
      author: "",
    });
  }

  if (mode === "append") {
    const existing = getPresetItems(presetId, dbPath);
    return setPresetItems(presetId, existing.concat(items), dbPath);
  } else {
    return setPresetItems(presetId, items, dbPath);
  }
}

export function exportPresetToText(presetId = "default", dbPath) {
  const items = getPresetItems(presetId, dbPath);
  const titles = items.map((it) => it.title);
  const keywords = items.map((it) => it.keywords.join(", "));
  return {
    titlesText: titles.join("\n"),
    keywordsText: keywords.join("\n\n"),
    items,
  };
}

// ==================== History ====================

export function recordHistory(entry, dbPath) {
  try {
    const db = getDb(dbPath);
    const now = new Date().toISOString();
    const detailsStr = typeof entry.details === "object" ? JSON.stringify(entry.details) : String(entry.details || "{}");
    db.prepare(`
      INSERT INTO history (timestamp, operation, folder, file_count, success_count, fail_count, details, log_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      now,
      entry.operation || "auto",
      entry.folder || "",
      entry.fileCount || 0,
      entry.successCount || 0,
      entry.failCount || 0,
      detailsStr,
      entry.logText || ""
    );
  } catch {}
}

export function getHistory(limit = 50, dbPath) {
  const db = getDb(dbPath);
  const rows = db.prepare(`
    SELECT * FROM history
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
  return rows.map((r) => {
    let details = {};
    try {
      details = JSON.parse(r.details);
    } catch {}
    return {
      id: r.id,
      timestamp: r.timestamp,
      operation: r.operation,
      folder: r.folder,
      fileCount: r.file_count,
      successCount: r.success_count,
      failCount: r.fail_count,
      details,
      logText: r.log_text,
    };
  });
}

export function clearHistory(dbPath) {
  const db = getDb(dbPath);
  db.prepare("DELETE FROM history").run();
  return true;
}

// ==================== Templates ====================

export function getTemplates(dbPath) {
  const db = getDb(dbPath);
  return db.prepare("SELECT * FROM templates ORDER BY id ASC").all();
}

export function saveTemplate(name, pattern, isDefault = 0, dbPath) {
  const db = getDb(dbPath);
  if (isDefault) {
    db.prepare("UPDATE templates SET is_default = 0").run();
  }
  const info = db.prepare("INSERT INTO templates (name, pattern, is_default) VALUES (?, ?, ?)").run(name, pattern, isDefault ? 1 : 0);
  return { id: info.lastInsertRowid, name, pattern, isDefault };
}
