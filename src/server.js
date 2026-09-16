// Server HTTP bawaan Node.js untuk Web UI imgmeta (tanpa dependensi eksternal)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

import * as utils from "./utils.js";
import * as meta from "./meta.js";
import * as renameMod from "./rename.js";
import * as db from "./db.js";
import * as imageMod from "./image.js";
import * as vectorMod from "./vector.js";
import { parseTitles, sortFilesByTitles } from "./cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** Kirim response JSON */
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end(body);
}

/** Baca request body JSON */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) { // max 20MB
        reject(new Error("Payload terlalu besar"));
      }
    });
    req.on("end", () => {
      try {
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (err) {
        reject(new Error("Format JSON tidak valid: " + err.message));
      }
    });
    req.on("error", reject);
  });
}

/** Cari semua direktori dan subdirektori gambar */
function findImageFolders(baseDir = ROOT_DIR) {
  const folders = [];
  const visited = new Set();

  function scan(dir, depth = 0) {
    if (depth > 4) return;
    const resolved = path.resolve(dir);
    if (visited.has(resolved)) return;
    visited.add(resolved);

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    let hasImages = false;
    const subdirs = [];

    for (const ent of entries) {
      if (ent.name.startsWith(".") || ent.name === "node_modules" || ent.name === "test" || ent.name === "src" || ent.name === "public") {
        continue;
      }
      if (ent.isDirectory()) {
        subdirs.push(path.join(dir, ent.name));
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"].includes(ext)) {
          hasImages = true;
        }
      }
    }

    const rel = path.relative(ROOT_DIR, dir) || ".";
    if (hasImages || rel === "foto" || rel === ".") {
      folders.push(rel.replace(/\\/g, "/"));
    }

    for (const s of subdirs) {
      scan(s, depth + 1);
    }
  }

  scan(baseDir);
  return [...new Set(folders)].sort((a, b) => {
    if (a === "foto") return -1;
    if (b === "foto") return 1;
    return a.localeCompare(b);
  });
}

/** Handler request utama */
async function handleRequest(req, res) {
  const parsedUrl = new URL(req.url, "http://localhost");
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // API Endpoints
  if (pathname.startsWith("/api/")) {
    try {
      // 0a. Presets CRUD: GET /api/presets, POST /api/presets, PUT /api/presets, DELETE /api/presets
      if (pathname === "/api/presets") {
        if (method === "GET") {
          const presets = db.listPresets();
          return sendJson(res, 200, { success: true, presets });
        }
        if (method === "POST") {
          const body = await readJsonBody(req);
          const { id, name, description } = body;
          const created = db.createPreset(id, name, description);
          return sendJson(res, 200, { success: true, preset: created });
        }
        if (method === "PUT") {
          const body = await readJsonBody(req);
          const { id, name, description } = body;
          const updated = db.updatePreset(id, { name, description });
          return sendJson(res, 200, { success: true, preset: updated });
        }
        if (method === "DELETE") {
          const id = parsedUrl.searchParams.get("id");
          if (!id) return sendJson(res, 400, { success: false, error: "ID preset diperlukan" });
          db.deletePreset(id);
          return sendJson(res, 200, { success: true, message: `Preset ${id} berhasil dihapus.` });
        }
      }

      // 0b. Preset Items CRUD: GET /api/preset-items, POST /api/preset-items, POST /api/preset-items/import
      if (pathname === "/api/preset-items") {
        if (method === "GET") {
          const presetId = parsedUrl.searchParams.get("preset") || "default";
          const items = db.getPresetItems(presetId);
          return sendJson(res, 200, { success: true, presetId, items, count: items.length });
        }
        if (method === "POST") {
          const body = await readJsonBody(req);
          const { presetId = "default", items = [] } = body;
          const saved = db.setPresetItems(presetId, items);
          return sendJson(res, 200, { success: true, presetId, items: saved, count: saved.length });
        }
      }

      if (pathname === "/api/preset-items/import" && method === "POST") {
        const body = await readJsonBody(req);
        const { presetId = "default", titleText = "", keywordText = "", mode = "replace" } = body;
        const saved = db.importTextToPreset(presetId, { titleText, keywordText, mode });
        return sendJson(res, 200, { success: true, presetId, items: saved, count: saved.length });
      }

      if (pathname === "/api/preset-items/export" && method === "GET") {
        const presetId = parsedUrl.searchParams.get("preset") || "default";
        const exp = db.exportPresetToText(presetId);
        return sendJson(res, 200, { success: true, presetId, ...exp });
      }

      // 0c. History API: GET /api/history, DELETE /api/history
      if (pathname === "/api/history") {
        if (method === "GET") {
          const limit = parseInt(parsedUrl.searchParams.get("limit") || "50", 10);
          const history = db.getHistory(limit);
          return sendJson(res, 200, { success: true, history });
        }
        if (method === "DELETE") {
          db.clearHistory();
          return sendJson(res, 200, { success: true, message: "Riwayat berhasil dibersihkan." });
        }
      }

      // 0d. Templates API: GET /api/templates, POST /api/templates
      if (pathname === "/api/templates") {
        if (method === "GET") {
          const templates = db.getTemplates();
          return sendJson(res, 200, { success: true, templates });
        }
        if (method === "POST") {
          const body = await readJsonBody(req);
          const { name, pattern, isDefault } = body;
          const created = db.saveTemplate(name, pattern, isDefault ? 1 : 0);
          return sendJson(res, 200, { success: true, template: created });
        }
      }

      // 1. GET /api/folders
      if (pathname === "/api/folders" && method === "GET") {
        const folders = findImageFolders(ROOT_DIR);
        return sendJson(res, 200, {
          success: true,
          folders,
          defaultFolder: folders.includes("foto") ? "foto" : folders[0] || ".",
        });
      }

      // 2. GET /api/files?folder=foto
      if (pathname === "/api/files" && method === "GET") {
        const folderParam = parsedUrl.searchParams.get("folder") || "foto";
        const targetDir = path.resolve(ROOT_DIR, folderParam);
        
        // Keamanan: cegah traversal ke luar ROOT_DIR
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder di luar workspace ditolak." });
        }

        const rawFiles = renameMod.expandFiles([targetDir]);
        const fileList = rawFiles.map((fullPath) => {
          let r = null;
          let view = null;
          try {
            r = meta.readFileMeta(fullPath);
            if (r.model || r.iptc || r.xmp || r.text || r.svgMeta) {
              view = meta.buildExifView(r.model, r.dims, r.iptc, r.xmp, r.text, r.svgMeta);
            }
          } catch {}

          const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
          return {
            fullPath,
            relPath,
            name: path.basename(fullPath),
            size: r ? r.size : 0,
            sizeFmt: r ? utils.fmtBytes(r.size) : "-",
            dims: r && r.dims ? `${r.dims.w}x${r.dims.h}` : "-",
            isJpeg: r ? r.isJpeg : false,
            isPng: r ? r.isPng : false,
            isSvg: r ? r.isSvg : false,
            title: view && view.title ? view.title : "",
            caption: view && view.caption ? view.caption : "",
            description: view && view.description ? view.description : "",
            keywords: view && view.keywords ? view.keywords : [],
          };
        });

        return sendJson(res, 200, {
          success: true,
          folder: folderParam,
          count: fileList.length,
          files: fileList,
        });
      }

      // 3. GET /api/thumb?file=...
      if (pathname === "/api/thumb" && method === "GET") {
        const fileParam = parsedUrl.searchParams.get("file") || "";
        const fullPath = path.isAbsolute(fileParam) ? fileParam : path.resolve(ROOT_DIR, fileParam);

        if (!fullPath.startsWith(ROOT_DIR) || !fs.existsSync(fullPath)) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          return res.end("Gambar tidak ditemukan.");
        }

        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=60",
        });
        const stream = fs.createReadStream(fullPath);
        return stream.pipe(res);
      }

      // 3b. GET /api/meta-detail?file=...
      if (pathname === "/api/meta-detail" && method === "GET") {
        const fileParam = parsedUrl.searchParams.get("file") || "";
        const fullPath = path.isAbsolute(fileParam) ? fileParam : path.resolve(ROOT_DIR, fileParam);

        if (!fullPath.startsWith(ROOT_DIR) || !fs.existsSync(fullPath)) {
          return sendJson(res, 404, { success: false, error: "File tidak ditemukan." });
        }

        let r = null;
        let view = null;
        try {
          r = meta.readFileMeta(fullPath);
          if (r.model || r.iptc || r.xmp || r.text || r.svgMeta) {
            view = meta.buildExifView(r.model, r.dims, r.iptc, r.xmp, r.text, r.svgMeta);
          }
        } catch (err) {
          return sendJson(res, 500, { success: false, error: "Gagal membaca metadata: " + err.message });
        }

        const st = fs.statSync(fullPath);
        const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");

        return sendJson(res, 200, {
          success: true,
          file: {
            name: path.basename(fullPath),
            fullPath,
            relPath,
            size: st.size,
            sizeFmt: utils.fmtBytes(st.size),
            mtime: st.mtime,
            dims: r.dims ? `${r.dims.w} x ${r.dims.h}` : "-",
            isJpeg: r.isJpeg,
            isPng: r.isPng,
            isSvg: r.isSvg,
            exifPresent: r.exifPresent,
          },
          metadata: view || {},
          raw: {
            dims: r.dims,
            hasExif: Boolean(r.model),
            hasIptc: Boolean(r.iptc),
            exifError: r.exifError,
          },
        });
      }

      // 4. GET /api/inputs?folder=...&preset=...
      if (pathname === "/api/inputs" && method === "GET") {
        const presetParam = parsedUrl.searchParams.get("preset") || "default";
        const items = db.getPresetItems(presetParam);
        
        let titleText = "";
        let keywordText = "";

        if (items.length) {
          titleText = items.map((it) => it.title).join("\n");
          keywordText = items.map((it) => it.keywords.join(", ")).join("\n\n");
        } else {
          // Fallback ke file teks jika preset kosong
          const folderParam = parsedUrl.searchParams.get("folder") || "foto";
          const folderDir = path.resolve(ROOT_DIR, folderParam);
          let titlePath = path.join(folderDir, "title.txt");
          if (!fs.existsSync(titlePath)) titlePath = path.join(ROOT_DIR, "title.txt");
          let keywordPath = path.join(folderDir, "keyword.txt");
          if (!fs.existsSync(keywordPath)) keywordPath = path.join(ROOT_DIR, "keyword.txt");

          if (fs.existsSync(titlePath)) titleText = fs.readFileSync(titlePath, "utf8");
          if (fs.existsSync(keywordPath)) keywordText = fs.readFileSync(keywordPath, "utf8");
        }

        return sendJson(res, 200, {
          success: true,
          preset: presetParam,
          itemCount: items.length,
          titleText,
          keywordText,
        });
      }

      // 5. POST /api/save-inputs
      if (pathname === "/api/save-inputs" && method === "POST") {
        const body = await readJsonBody(req);
        const { titleText, keywordText, saveLocation = "root", folder = "foto", preset = "default" } = body;

        // Simpan ke SQLite preset
        if (titleText !== undefined || keywordText !== undefined) {
          db.importTextToPreset(preset, {
            titleText: titleText || "",
            keywordText: keywordText || "",
            mode: "replace",
          });
        }

        // Simpan juga ke disk jika saveLocation folder/root
        const targetDir = saveLocation === "folder" ? path.resolve(ROOT_DIR, folder) : ROOT_DIR;
        if (targetDir.startsWith(ROOT_DIR)) {
          if (titleText !== undefined) {
            fs.writeFileSync(path.join(targetDir, "title.txt"), titleText, "utf8");
          }
          if (keywordText !== undefined) {
            fs.writeFileSync(path.join(targetDir, "keyword.txt"), keywordText, "utf8");
          }
        }

        return sendJson(res, 200, {
          success: true,
          message: `Daftar judul & kata kunci berhasil disimpan ke database SQLite (preset: ${preset}) dan file disk.`,
        });
      }

      // 6. POST /api/preview
      if (pathname === "/api/preview" && method === "POST") {
        const body = await readJsonBody(req);
        const { folder = "foto", titleText = "", keywordText = "", template = "{title}", preset = "" } = body;

        const targetDir = path.resolve(ROOT_DIR, folder);
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        let effectiveTitleText = titleText;
        let effectiveKeywordText = keywordText;

        if (preset && (!titleText || !keywordText)) {
          const items = db.getPresetItems(preset);
          if (items.length) {
            if (!effectiveTitleText) effectiveTitleText = items.map(it => it.title).join("\n");
            if (!effectiveKeywordText) effectiveKeywordText = items.map(it => it.keywords.join(", ")).join("\n\n");
          }
        }

        const rawFiles = renameMod.expandFiles([targetDir]);
        const titleLines = effectiveTitleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        
        const keywordLines = effectiveKeywordText.split(/\r?\n/);
        const keywordGroups = utils.parseKeywordGroups(keywordLines);

        const list = sortFilesByTitles(rawFiles, titles);
        const plannedNames = new Set();
        const batchSources = new Set(list.map((f) => path.resolve(f).toLowerCase()));

        const previewItems = list.map((filePath, i) => {
          let r = null;
          let view = null;
          try {
            r = meta.readFileMeta(filePath);
            if (r.model || r.iptc || r.xmp || r.text || r.svgMeta) {
              view = meta.buildExifView(r.model, r.dims, r.iptc, r.xmp, r.text, r.svgMeta);
            }
          } catch {}

          const currentName = path.basename(filePath);
          const mappedTitle = titles && i < titles.length ? titles[i] : "";
          const mappedKeywords = keywordGroups && i < keywordGroups.length ? keywordGroups[i] : [];

          // Override title di view simulasi jika ada mappedTitle
          const simView = Object.assign({}, view, {
            title: mappedTitle || (view && view.title) || "",
            description: mappedTitle || (view && view.description) || "",
          });

          // Build nama baru
          const ext = path.extname(filePath);
          let rawNewName = "";
          if (template === "{title}") {
            rawNewName = mappedTitle ? utils.sanitizeName(mappedTitle) + ext : currentName;
          } else {
            rawNewName = renameMod.buildName(filePath, template, i + 1, {
              model: simView,
              dims: r ? r.dims : null,
              iptc: r ? r.iptc : null,
              isJpeg: r ? r.isJpeg : false,
              isPng: r ? r.isPng : false,
              isSvg: r ? r.isSvg : false,
              svgMeta: r ? r.svgMeta : null,
              mtime: r ? r.mtime : new Date(),
            });
          }

          const targetPath = path.join(path.dirname(filePath), rawNewName);
          const uniqueTargetPath = utils.ensureUniqueTarget(targetPath, plannedNames, filePath, batchSources);
          plannedNames.add(path.resolve(uniqueTargetPath).toLowerCase());

          const plannedName = path.basename(uniqueTargetPath);
          const isNameChanged = currentName !== plannedName;

          return {
            index: i + 1,
            filePath,
            currentName,
            plannedName,
            isNameChanged,
            currentTitle: (view && view.title) || "-",
            mappedTitle: mappedTitle || "(tidak ada)",
            hasTitle: Boolean(mappedTitle),
            currentKeywordsCount: view && view.keywords ? view.keywords.length : 0,
            mappedKeywords: mappedKeywords,
            mappedKeywordsCount: mappedKeywords.length,
            status: !mappedTitle && !mappedKeywords.length ? "SKIPPED" : "READY",
            relPath: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
            dims: r && r.dims ? `${r.dims.w} × ${r.dims.h}` : "-",
            size: r ? r.size : 0,
            sizeFmt: r ? utils.fmtBytes(r.size) : "-",
          };
        });

        const warnings = [];
        if (titles.length > list.length) {
          warnings.push(`Daftar judul memiliki ${titles.length - list.length} baris lebih banyak dari jumlah foto (${list.length}). Kelebihan akan diabaikan.`);
        }
        if (keywordGroups.length > list.length) {
          warnings.push(`Daftar kata kunci memiliki ${keywordGroups.length - list.length} kelompok lebih banyak dari jumlah foto (${list.length}). Kelebihan akan diabaikan.`);
        }
        if (list.length > titles.length && titles.length > 0) {
          warnings.push(`${list.length - titles.length} foto tidak mendapatkan judul dari daftar.`);
        }

        return sendJson(res, 200, {
          success: true,
          totalFiles: list.length,
          totalTitles: titles.length,
          totalKeywordGroups: keywordGroups.length,
          warnings,
          items: previewItems,
        });
      }

      // 7. POST /api/execute
      if (pathname === "/api/execute" && method === "POST") {
        const body = await readJsonBody(req);
        const {
          action = "auto", // "auto" | "metadata" | "rename" | "strip"
          folder = "foto",
          titleText = "",
          keywordText = "",
          template = "{title}",
          noBackup = true,
          preset = "default",
        } = body;

        const targetDir = path.resolve(ROOT_DIR, folder);
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        const rawFiles = renameMod.expandFiles([targetDir]);
        if (!rawFiles.length) {
          return sendJson(res, 400, { success: false, error: "Tidak ada file gambar di folder yang dipilih." });
        }

        let effectiveTitleText = titleText;
        let effectiveKeywordText = keywordText;

        if (preset && (!titleText || !keywordText)) {
          const items = db.getPresetItems(preset);
          if (items.length) {
            if (!effectiveTitleText) effectiveTitleText = items.map(it => it.title).join("\n");
            if (!effectiveKeywordText) effectiveKeywordText = items.map(it => it.keywords.join(", ")).join("\n\n");
          }
        }

        const titleLines = effectiveTitleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        const keywordLines = effectiveKeywordText.split(/\r?\n/);
        const keywordGroups = utils.parseKeywordGroups(keywordLines);

        const list = sortFilesByTitles(rawFiles, titles);
        const logs = [];
        const results = [];
        let processed = 0;
        let skipped = 0;
        let failed = 0;

        utils.resetFailures();

        // Operasi 1: Terapkan Metadata (jika action === "auto" || action === "metadata")
        if (action === "auto" || action === "metadata") {
          logs.push(`[METADATA] Memproses ${list.length} file...`);
          list.forEach((filePath, i) => {
            const editOpts = { "no-backup": noBackup };
            if (titles && i < titles.length && titles[i] !== "") {
              editOpts.title = titles[i];
              editOpts.caption = titles[i];
              editOpts.description = titles[i];
            }
            if (keywordGroups && i < keywordGroups.length && keywordGroups[i].length) {
              editOpts.keywords = keywordGroups[i];
            }

            if (!editOpts.title && !editOpts.keywords) {
              logs.push(`[SKIP] ${path.basename(filePath)}: tidak ada judul/keyword.`);
              skipped++;
              results.push({ file: filePath, status: "SKIPPED", message: "Tidak ada judul atau kata kunci" });
              return;
            }

            try {
              const resMeta = meta.editFile(filePath, editOpts);
              processed++;
              logs.push(`[OK] ${path.basename(filePath)}: metadata IPTC/EXIF/XMP berhasil diperbarui.`);
              results.push({ file: filePath, status: "SUCCESS", diff: resMeta });
            } catch (err) {
              failed++;
              logs.push(`[ERROR] ${path.basename(filePath)}: ${err.message}`);
              utils.logFailure("api_meta", filePath, err.message);
              results.push({ file: filePath, status: "FAILED", error: err.message });
            }
          });
        }

        // Operasi 2: Strip Metadata (jika action === "strip")
        if (action === "strip") {
          logs.push(`[STRIP] Menghapus metadata dari ${list.length} file...`);
          list.forEach((filePath) => {
            try {
              const resStrip = meta.stripFile(filePath, { "no-backup": noBackup });
              processed++;
              logs.push(`[OK] ${path.basename(filePath)}: metadata dibersihkan.`);
              results.push({ file: filePath, status: "SUCCESS", stripped: resStrip.stripped });
            } catch (err) {
              failed++;
              logs.push(`[ERROR] ${path.basename(filePath)}: ${err.message}`);
              utils.logFailure("api_strip", filePath, err.message);
              results.push({ file: filePath, status: "FAILED", error: err.message });
            }
          });
        }

        // Operasi 3: Rename Batch (jika action === "auto" || action === "rename")
        if (action === "auto" || action === "rename") {
          const tpl = action === "auto" ? "{title}" : template || "{title}";
          logs.push(`[RENAME] Menjalankan rename batch dengan template '${tpl}'...`);
          try {
            const currentFileList = list.map((f) => f);
            const renRes = renameMod.runRename(currentFileList, tpl, {
              apply: true,
              start: 1,
              titles: titles && titles.length ? titles : undefined,
            });
            if (action === "rename") {
              processed += renRes.renamed;
              skipped += renRes.unchanged;
              failed += renRes.failed;
            }
            logs.push(`[OK] Rename batch selesai: ${renRes.renamed} diganti nama, ${renRes.unchanged} tetap, ${renRes.failed} gagal.`);
          } catch (err) {
            logs.push(`[ERROR] Gagal rename batch: ${err.message}`);
            utils.logFailure("api_rename", folder, err.message);
            if (action === "rename") failed += list.length;
          }
        }

        // Rekam riwayat ke SQLite
        db.recordHistory({
          operation: action,
          folder,
          fileCount: list.length,
          successCount: processed,
          failCount: failed,
          logText: logs.join("\n"),
        });

        return sendJson(res, 200, {
          success: true,
          processed,
          skipped,
          failed,
          logs,
          results,
        });
      }

      // 7b. POST /api/export-jpeg
      if (pathname === "/api/export-jpeg" && method === "POST") {
        const body = await readJsonBody(req);
        const {
          folder = "foto",
          quality = 90,
          preset = "default",
          titleText = "",
          keywordText = "",
          singleTitle = null,
          singleKeywords = null,
          outDir = "",
          files: targetFiles = null,
        } = body;

        const targetFolderDir = path.resolve(ROOT_DIR, folder);
        if (!targetFolderDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        let rawFiles = [];
        const isSingleTarget = Boolean(targetFiles && Array.isArray(targetFiles) && targetFiles.length === 1);
        if (targetFiles && Array.isArray(targetFiles) && targetFiles.length) {
          rawFiles = targetFiles.map((f) => (path.isAbsolute(f) ? f : path.resolve(ROOT_DIR, f)));
        } else {
          rawFiles = renameMod.expandFiles([targetFolderDir]);
        }

        if (!rawFiles.length) {
          return sendJson(res, 400, { success: false, error: "Tidak ada file gambar untuk diekspor ke JPEG." });
        }

        let effectiveTitleText = titleText;
        let effectiveKeywordText = keywordText;

        if (preset && (!titleText || !keywordText)) {
          const items = db.getPresetItems(preset);
          if (items.length) {
            if (!effectiveTitleText) effectiveTitleText = items.map((it) => it.title).join("\n");
            if (!effectiveKeywordText) effectiveKeywordText = items.map((it) => it.keywords.join(", ")).join("\n\n");
          }
        }

        const titleLines = effectiveTitleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        const keywordLines = effectiveKeywordText.split(/\r?\n/);
        const keywordGroups = utils.parseKeywordGroups(keywordLines);

        const list = isSingleTarget ? rawFiles : sortFilesByTitles(rawFiles, titles);
        const logs = [];
        const results = [];
        let success = 0;
        let failed = 0;

        utils.resetFailures();
        const exportQuality = parseInt(quality, 10) || 90;
        logs.push(`[EXPORT] Memulai export ${list.length} file ke JPEG (Kualitas: ${exportQuality}%)...`);

        list.forEach((filePath, i) => {
          try {
            const ext = path.extname(filePath);
            const baseName = path.basename(filePath, ext);
            
            let mappedTitle = titles && i < titles.length ? titles[i] : undefined;
            let mappedKeywords = keywordGroups && i < keywordGroups.length ? keywordGroups[i] : undefined;

            if (isSingleTarget) {
              if (singleTitle !== null && singleTitle !== undefined) {
                mappedTitle = singleTitle;
              }
              if (singleKeywords !== null && singleKeywords !== undefined) {
                mappedKeywords = Array.isArray(singleKeywords) ? singleKeywords : [singleKeywords];
              }
            }

            const targetDir = outDir ? path.resolve(ROOT_DIR, outDir) : path.dirname(filePath);
            const destName = (mappedTitle ? utils.sanitizeName(mappedTitle) : baseName) + ".jpg";
            const destPath = path.join(targetDir, destName);

            const exportOpts = {
              quality: exportQuality,
              title: mappedTitle,
              keywords: mappedKeywords,
              caption: mappedTitle,
              description: mappedTitle,
            };

            const resExp = imageMod.exportFileToJpeg(filePath, destPath, exportOpts);
            success++;
            logs.push(`[OK] ${path.basename(filePath)} -> ${path.basename(destPath)} (${utils.fmtBytes(resExp.size)}, ${resExp.timeMs}ms)`);
            results.push({
              src: filePath,
              dest: destPath,
              destName,
              size: resExp.size,
              sizeFmt: utils.fmtBytes(resExp.size),
              dims: `${resExp.dims.w}x${resExp.dims.h}`,
              timeMs: resExp.timeMs,
              status: "SUCCESS",
            });
          } catch (err) {
            failed++;
            logs.push(`[ERROR] ${path.basename(filePath)}: ${err.message}`);
            utils.logFailure("api_export_jpeg", filePath, err.message);
            results.push({ src: filePath, status: "FAILED", error: err.message });
          }
        });

        db.recordHistory({
          operation: "export_jpeg",
          folder,
          fileCount: list.length,
          successCount: success,
          failCount: failed,
          logText: logs.join("\n"),
        });

        return sendJson(res, 200, {
          success: true,
          total: list.length,
          processed: success,
          failed,
          logs,
          results,
        });
      }

      // 7c. GET /api/vector-profiles
      if (pathname === "/api/vector-profiles" && method === "GET") {
        return sendJson(res, 200, {
          success: true,
          profiles: vectorMod.VECTOR_PROFILES,
        });
      }

      // 7d. POST /api/export-vector
      if (pathname === "/api/export-vector" && method === "POST") {
        const body = await readJsonBody(req);
        const {
          folder = "foto",
          profile = "microstock",
          tracePreset,
          mode,
          hierarchical,
          filterSpeckle,
          colorPrecision,
          maxColors,
          simplify,
          cornerThreshold,
          layerDifference,
          embedMetadata = true,
          preset = "default",
          titleText = "",
          keywordText = "",
          singleTitle = null,
          singleKeywords = null,
          outDir = "",
          files: targetFiles = null,
        } = body;

        const targetFolderDir = path.resolve(ROOT_DIR, folder);
        if (!targetFolderDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        let rawFiles = [];
        const isSingleTarget = Boolean(targetFiles && Array.isArray(targetFiles) && targetFiles.length === 1);
        if (targetFiles && Array.isArray(targetFiles) && targetFiles.length) {
          rawFiles = targetFiles.map((f) => (path.isAbsolute(f) ? f : path.resolve(ROOT_DIR, f)));
        } else {
          rawFiles = renameMod.expandFiles([targetFolderDir]);
        }

        if (!rawFiles.length) {
          return sendJson(res, 400, { success: false, error: "Tidak ada file gambar untuk diekspor ke Vektor SVG." });
        }

        let effectiveTitleText = titleText;
        let effectiveKeywordText = keywordText;

        if (preset && (!titleText || !keywordText)) {
          const items = db.getPresetItems(preset);
          if (items.length) {
            if (!effectiveTitleText) effectiveTitleText = items.map((it) => it.title).join("\n");
            if (!effectiveKeywordText) effectiveKeywordText = items.map((it) => it.keywords.join(", ")).join("\n\n");
          }
        }

        const titleLines = effectiveTitleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        const keywordLines = effectiveKeywordText.split(/\r?\n/);
        const keywordGroups = utils.parseKeywordGroups(keywordLines);

        const list = isSingleTarget ? rawFiles : sortFilesByTitles(rawFiles, titles);
        const logs = [];
        const results = [];
        let success = 0;
        let failed = 0;

        utils.resetFailures();
        logs.push(`[VECTOR] Memulai export ${list.length} file ke Vektor SVG (Profil: ${profile}${mode ? `, Mode: ${mode}` : ""})...`);

        list.forEach((filePath, i) => {
          try {
            const ext = path.extname(filePath);
            const baseName = path.basename(filePath, ext);

            let mappedTitle = titles && i < titles.length ? titles[i] : undefined;
            let mappedKeywords = keywordGroups && i < keywordGroups.length ? keywordGroups[i] : undefined;

            if (isSingleTarget) {
              if (singleTitle !== null && singleTitle !== undefined) {
                mappedTitle = singleTitle;
              }
              if (singleKeywords !== null && singleKeywords !== undefined) {
                mappedKeywords = Array.isArray(singleKeywords) ? singleKeywords : [singleKeywords];
              }
            }

            const targetDir = outDir ? path.resolve(ROOT_DIR, outDir) : path.dirname(filePath);
            const destName = (mappedTitle ? utils.sanitizeName(mappedTitle) : baseName) + ".svg";
            const destPath = path.join(targetDir, destName);

            const exportOpts = {
              profile,
              preset: tracePreset,
              mode,
              hierarchical,
              filterSpeckle,
              colorPrecision,
              maxColors,
              simplify,
              cornerThreshold,
              layerDifference,
              embedMetadata: embedMetadata !== false,
              title: mappedTitle,
              keywords: mappedKeywords,
              caption: mappedTitle,
              description: mappedTitle,
            };

            const resExp = vectorMod.exportFileToVector(filePath, destPath, exportOpts);
            success++;
            logs.push(`[OK] ${path.basename(filePath)} -> ${path.basename(destPath)} (${utils.fmtBytes(resExp.size)}, ${resExp.timeMs}ms)`);
            results.push({
              src: filePath,
              dest: destPath,
              destName,
              size: resExp.size,
              sizeFmt: utils.fmtBytes(resExp.size),
              timeMs: resExp.timeMs,
              status: "SUCCESS",
            });
          } catch (err) {
            failed++;
            logs.push(`[ERROR] ${path.basename(filePath)}: ${err.message}`);
            utils.logFailure("api_export_vector", filePath, err.message);
            results.push({ src: filePath, status: "FAILED", error: err.message });
          }
        });

        db.recordHistory({
          operation: "export_vector",
          folder,
          fileCount: list.length,
          successCount: success,
          failCount: failed,
          logText: logs.join("\n"),
        });

        return sendJson(res, 200, {
          success: true,
          total: list.length,
          processed: success,
          failed,
          logs,
          results,
        });
      }

      // 8. GET /api/logs
      if (pathname === "/api/logs" && method === "GET") {
        let content = "";
        if (fs.existsSync(utils.LOG_FILE)) {
          content = fs.readFileSync(utils.LOG_FILE, "utf8");
        }
        return sendJson(res, 200, {
          success: true,
          logs: content.split(/\r?\n/).filter(Boolean),
        });
      }

      return sendJson(res, 404, { success: false, error: "Endpoint API tidak ditemukan." });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // Melayani file statis dari public/
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  
  // Normalisasi & proteksi traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("Akses dilarang.");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("File tidak ditemukan.");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "text/plain; charset=utf-8";

  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

/** Membuka browser bawaan */
export function openBrowser(url) {
  const startCmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  try {
    exec(startCmd);
  } catch {}
}

/** Menjalankan Server Web */
export function startServer(opts = {}) {
  const port = parseInt(opts.port, 10) || 3000;
  const noOpen = opts["no-open"] === true;

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      sendJson(res, 500, { success: false, error: "Internal Server Error: " + err.message });
    });
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    utils.info("");
    utils.info(utils.bold(utils.cyan("=== IMGMETA WEB UI (INDUSTRIAL MINIMALISM) ===")));
    utils.info(`Server berjalan di: ${utils.green(url)}`);
    utils.info(`Folder kerja     : ${utils.yellow(ROOT_DIR)}`);
    utils.info("Tekan Ctrl+C untuk menghentikan server.");
    utils.info("");

    if (!noOpen) {
      setTimeout(() => openBrowser(url), 400);
    }
  });

  return server;
}
