// Server HTTP bawaan Node.js untuk Web UI imgmeta (tanpa dependensi eksternal)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

import * as utils from "./utils.js";
import * as meta from "./meta.js";
import * as renameMod from "./rename.js";
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
            if (r.model || r.iptc) {
              view = meta.buildExifView(r.model, r.dims, r.iptc);
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
          if (r.model || r.iptc) {
            view = meta.buildExifView(r.model, r.dims, r.iptc);
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

      // 4. GET /api/inputs?folder=...
      if (pathname === "/api/inputs" && method === "GET") {
        const folderParam = parsedUrl.searchParams.get("folder") || "foto";
        const folderDir = path.resolve(ROOT_DIR, folderParam);

        // Cari title.txt dan keyword.txt di folder target atau root
        let titlePath = path.join(folderDir, "title.txt");
        if (!fs.existsSync(titlePath)) titlePath = path.join(ROOT_DIR, "title.txt");

        let keywordPath = path.join(folderDir, "keyword.txt");
        if (!fs.existsSync(keywordPath)) keywordPath = path.join(ROOT_DIR, "keyword.txt");

        let titleText = "";
        if (fs.existsSync(titlePath)) {
          titleText = fs.readFileSync(titlePath, "utf8");
        }

        let keywordText = "";
        if (fs.existsSync(keywordPath)) {
          keywordText = fs.readFileSync(keywordPath, "utf8");
        }

        return sendJson(res, 200, {
          success: true,
          titleText,
          keywordText,
          titlePath: path.relative(ROOT_DIR, titlePath).replace(/\\/g, "/"),
          keywordPath: path.relative(ROOT_DIR, keywordPath).replace(/\\/g, "/"),
        });
      }

      // 5. POST /api/save-inputs
      if (pathname === "/api/save-inputs" && method === "POST") {
        const body = await readJsonBody(req);
        const { titleText, keywordText, saveLocation = "root", folder = "foto" } = body;

        const targetDir = saveLocation === "folder" ? path.resolve(ROOT_DIR, folder) : ROOT_DIR;
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        if (titleText !== undefined) {
          fs.writeFileSync(path.join(targetDir, "title.txt"), titleText, "utf8");
        }
        if (keywordText !== undefined) {
          fs.writeFileSync(path.join(targetDir, "keyword.txt"), keywordText, "utf8");
        }

        return sendJson(res, 200, {
          success: true,
          message: "Daftar judul & kata kunci berhasil disimpan ke disk.",
        });
      }

      // 6. POST /api/preview
      if (pathname === "/api/preview" && method === "POST") {
        const body = await readJsonBody(req);
        const { folder = "foto", titleText = "", keywordText = "", template = "{title}" } = body;

        const targetDir = path.resolve(ROOT_DIR, folder);
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        const rawFiles = renameMod.expandFiles([targetDir]);
        const titleLines = titleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        
        const keywordLines = keywordText.split(/\r?\n/);
        const keywordGroups = utils.parseKeywordGroups(keywordLines);

        const list = sortFilesByTitles(rawFiles, titles);
        const plannedNames = new Set();
        const batchSources = new Set(list.map((f) => path.resolve(f).toLowerCase()));

        const previewItems = list.map((filePath, i) => {
          let r = null;
          let view = null;
          try {
            r = meta.readFileMeta(filePath);
            if (r.model || r.iptc) {
              view = meta.buildExifView(r.model, r.dims, r.iptc);
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
        } = body;

        const targetDir = path.resolve(ROOT_DIR, folder);
        if (!targetDir.startsWith(ROOT_DIR)) {
          return sendJson(res, 403, { success: false, error: "Akses folder tidak valid." });
        }

        const rawFiles = renameMod.expandFiles([targetDir]);
        if (!rawFiles.length) {
          return sendJson(res, 400, { success: false, error: "Tidak ada file gambar di folder yang dipilih." });
        }

        const titleLines = titleText.split(/\r?\n/);
        const titles = parseTitles(titleLines);
        const keywordLines = keywordText.split(/\r?\n/);
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
            renameMod.runRename(currentFileList, tpl, { apply: true, start: 1 });
            logs.push(`[OK] Rename batch selesai diproses.`);
          } catch (err) {
            logs.push(`[ERROR] Gagal rename batch: ${err.message}`);
            utils.logFailure("api_rename", folder, err.message);
          }
        }

        return sendJson(res, 200, {
          success: true,
          processed,
          skipped,
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
