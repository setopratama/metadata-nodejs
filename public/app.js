// IMGMETA Web UI Frontend Client Logic (Industrial Minimalism & SQLite Engine)
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Navigation & Folders
  const folderSelect = document.getElementById("folderSelect");
  const btnRefreshFolders = document.getElementById("btnRefreshFolders");
  const fileCountBadge = document.getElementById("fileCountBadge");
  const folderPathText = document.getElementById("folderPathText");

  // Preset Controls
  const presetSelect = document.getElementById("presetSelect");
  const btnNewPreset = document.getElementById("btnNewPreset");
  const btnDeletePreset = document.getElementById("btnDeletePreset");

  // Main Tabs
  const tabSqliteGrid = document.getElementById("tabSqliteGrid");
  const tabTitles = document.getElementById("tabTitles");
  const tabKeywords = document.getElementById("tabKeywords");
  const tabHistory = document.getElementById("tabHistory");
  const paneSqliteGrid = document.getElementById("paneSqliteGrid");
  const paneTitles = document.getElementById("paneTitles");
  const paneKeywords = document.getElementById("paneKeywords");
  const paneHistory = document.getElementById("paneHistory");

  // SQLite Grid Elements
  const sqliteRowCount = document.getElementById("sqliteRowCount");
  const sqliteTableBody = document.getElementById("sqliteTableBody");
  const btnAddRow = document.getElementById("btnAddRow");
  const btnSaveDb = document.getElementById("btnSaveDb");
  const btnClearDb = document.getElementById("btnClearDb");
  const btnImportFromText = document.getElementById("btnImportFromText");
  const btnExportToText = document.getElementById("btnExportToText");

  // Textarea Inputs & Counters
  const titleInput = document.getElementById("titleInput");
  const keywordInput = document.getElementById("keywordInput");
  const titleLineCount = document.getElementById("titleLineCount");
  const keywordGroupCount = document.getElementById("keywordGroupCount");
  const btnLoadTitles = document.getElementById("btnLoadTitles");
  const btnSaveTitles = document.getElementById("btnSaveTitles");
  const btnLoadKeywords = document.getElementById("btnLoadKeywords");
  const btnSaveKeywords = document.getElementById("btnSaveKeywords");

  // History Tab Elements
  const btnRefreshHistory = document.getElementById("btnRefreshHistory");
  const btnClearHistory = document.getElementById("btnClearHistory");
  const historyListContainer = document.getElementById("historyListContainer");

  // Options & Actions
  const chkNoBackup = document.getElementById("chkNoBackup");
  const templateInput = document.getElementById("templateInput");
  const templatePresetSelect = document.getElementById("templatePresetSelect");
  const exportQualitySlider = document.getElementById("exportQualitySlider");
  const exportQualityBadge = document.getElementById("exportQualityBadge");
  const btnExecuteAuto = document.getElementById("btnExecuteAuto");
  const btnExecuteExportJpeg = document.getElementById("btnExecuteExportJpeg");
  const btnExecuteMeta = document.getElementById("btnExecuteMeta");
  const btnExecuteRename = document.getElementById("btnExecuteRename");
  const btnExecuteStrip = document.getElementById("btnExecuteStrip");

  // Preview & Table/Grid
  const mappingSummaryBadge = document.getElementById("mappingSummaryBadge");
  const btnViewTable = document.getElementById("btnViewTable");
  const btnViewGrid = document.getElementById("btnViewGrid");
  const tableViewContainer = document.getElementById("tableViewContainer");
  const gridViewContainer = document.getElementById("gridViewContainer");
  const previewTableBody = document.getElementById("previewTableBody");
  const warningContainer = document.getElementById("warningContainer");
  const warningList = document.getElementById("warningList");

  // Terminal Logs & Fixed Dock
  const terminalCard = document.getElementById("terminalCard");
  const terminalOutput = document.getElementById("terminalOutput");
  const btnClearLogs = document.getElementById("btnClearLogs");
  const btnToggleConsole = document.getElementById("btnToggleConsole");
  const execProgressBadge = document.getElementById("execProgressBadge");
  const appLayout = document.querySelector(".app-layout");

  // Modal Elements
  const metaDetailModal = document.getElementById("metaDetailModal");
  const modalFileName = document.getElementById("modalFileName");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalCloseBtnBottom = document.getElementById("modalCloseBtnBottom");
  const tabModalSummary = document.getElementById("tabModalSummary");
  const tabModalExif = document.getElementById("tabModalExif");
  const tabModalGps = document.getElementById("tabModalGps");
  const tabModalRaw = document.getElementById("tabModalRaw");
  const modalPaneSummary = document.getElementById("modalPaneSummary");
  const modalPaneExif = document.getElementById("modalPaneExif");
  const modalPaneGps = document.getElementById("modalPaneGps");
  const modalPaneRaw = document.getElementById("modalPaneRaw");
  const modalThumbImg = document.getElementById("modalThumbImg");
  const modalDims = document.getElementById("modalDims");
  const modalSize = document.getElementById("modalSize");
  const modalFormat = document.getElementById("modalFormat");
  const modalExifStatus = document.getElementById("modalExifStatus");
  const modalTargetRenameBox = document.getElementById("modalTargetRenameBox");
  const btnCopyTargetName = document.getElementById("btnCopyTargetName");
  const modalTitleContent = document.getElementById("modalTitleContent");
  const modalKeywordCount = document.getElementById("modalKeywordCount");
  const modalKeywordBadges = document.getElementById("modalKeywordBadges");
  const modalCaption = document.getElementById("modalCaption");
  const modalAuthor = document.getElementById("modalAuthor");
  const modalExifTableBody = document.getElementById("modalExifTableBody");
  const modalGpsContent = document.getElementById("modalGpsContent");
  const modalRawJson = document.getElementById("modalRawJson");
  const btnCopyTitle = document.getElementById("btnCopyTitle");
  const btnCopyKeywords = document.getElementById("btnCopyKeywords");
  const copyToast = document.getElementById("copyToast");
  const modalExportQuality = document.getElementById("modalExportQuality");
  const btnModalExportJpeg = document.getElementById("btnModalExportJpeg");
  const modalExportStatus = document.getElementById("modalExportStatus");

  // State
  let currentFolder = "foto";
  let currentPreset = "default";
  let presetItemsCache = [];
  let previewDebounceTimer = null;
  let isExecuting = false;
  let currentModalData = null;
  let isConsoleCollapsed = false;

  // Logger helper
  function log(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `log-line ${type === "ok" ? "log-ok" : type === "err" ? "log-err" : "log-info"}`;
    const stamp = new Date().toTimeString().split(" ")[0];
    el.textContent = `[${stamp}] ${msg}`;
    terminalOutput.appendChild(el);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  // Console actions (Clear & Toggle Collapse)
  if (btnClearLogs) {
    btnClearLogs.addEventListener("click", () => {
      terminalOutput.innerHTML = '<div class="log-line text-muted">[SISTEM] Riwayat log dibersihkan.</div>';
    });
  }

  if (btnToggleConsole) {
    btnToggleConsole.addEventListener("click", () => {
      isConsoleCollapsed = !isConsoleCollapsed;
      if (isConsoleCollapsed) {
        terminalCard.classList.add("is-collapsed");
        if (appLayout) appLayout.classList.add("dock-collapsed");
        btnToggleConsole.textContent = "▲ TAMPILKAN";
        btnToggleConsole.title = "Buka log konsol";
      } else {
        terminalCard.classList.remove("is-collapsed");
        if (appLayout) appLayout.classList.remove("dock-collapsed");
        btnToggleConsole.textContent = "▼ SEMBUNYIKAN";
        btnToggleConsole.title = "Kecilkan log konsol";
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
      }
    });
  }

  // Tab switching helper
  const allTabs = [
    { btn: tabSqliteGrid, pane: paneSqliteGrid },
    { btn: tabTitles, pane: paneTitles },
    { btn: tabKeywords, pane: paneKeywords },
    { btn: tabHistory, pane: paneHistory },
  ];

  function setActiveTab(targetTab) {
    allTabs.forEach(({ btn, pane }) => {
      if (btn === targetTab.btn) {
        btn.classList.add("active");
        pane.classList.add("active");
      } else {
        btn.classList.remove("active");
        pane.classList.remove("active");
      }
    });
    if (targetTab.btn === tabHistory) {
      loadHistory();
    }
  }

  tabSqliteGrid.addEventListener("click", () => setActiveTab({ btn: tabSqliteGrid, pane: paneSqliteGrid }));
  tabTitles.addEventListener("click", () => setActiveTab({ btn: tabTitles, pane: paneTitles }));
  tabKeywords.addEventListener("click", () => setActiveTab({ btn: tabKeywords, pane: paneKeywords }));
  tabHistory.addEventListener("click", () => setActiveTab({ btn: tabHistory, pane: paneHistory }));

  // View toggle (Table vs Grid)
  btnViewTable.addEventListener("click", () => {
    btnViewTable.classList.add("active");
    btnViewGrid.classList.remove("active");
    tableViewContainer.style.display = "block";
    gridViewContainer.style.display = "none";
  });

  btnViewGrid.addEventListener("click", () => {
    btnViewGrid.classList.add("active");
    btnViewTable.classList.remove("active");
    tableViewContainer.style.display = "none";
    gridViewContainer.style.display = "grid";
  });

  // Template select quick pattern change
  if (templatePresetSelect) {
    templatePresetSelect.addEventListener("change", () => {
      templateInput.value = templatePresetSelect.value;
      triggerLivePreview();
    });
  }

  // ==================== PRESET & SQLITE LOGIC ====================

  async function loadPresets() {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      if (data.success && data.presets) {
        presetSelect.innerHTML = "";
        data.presets.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = `${p.name} (${p.item_count || 0})`;
          if (p.id === currentPreset) opt.selected = true;
          presetSelect.appendChild(opt);
        });
        if (!data.presets.some((p) => p.id === currentPreset)) {
          currentPreset = data.presets[0] ? data.presets[0].id : "default";
        }
        await loadPresetItems(currentPreset);
      }
    } catch (err) {
      log("Gagal memuat preset: " + err.message, "err");
    }
  }

  presetSelect.addEventListener("change", async () => {
    currentPreset = presetSelect.value;
    log(`Beralih ke preset '${currentPreset}'...`, "info");
    await loadPresetItems(currentPreset);
  });

  btnNewPreset.addEventListener("click", async () => {
    const name = window.prompt("Masukkan nama preset baru:");
    if (!name || !name.trim()) return;
    const cleanId = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cleanId, name: name.trim(), description: "Preset kustom" }),
      });
      const data = await res.json();
      if (data.success) {
        currentPreset = cleanId;
        log(`Preset '${name.trim()}' berhasil dibuat.`, "ok");
        await loadPresets();
      } else {
        alert("Gagal membuat preset: " + data.error);
      }
    } catch (err) {
      log("Gagal membuat preset: " + err.message, "err");
    }
  });

  btnDeletePreset.addEventListener("click", async () => {
    if (currentPreset === "default") {
      alert("Preset 'default' tidak dapat dihapus.");
      return;
    }
    if (!window.confirm(`Hapus preset '${currentPreset}' beserta seluruh isinya?`)) return;
    try {
      const res = await fetch(`/api/presets?id=${encodeURIComponent(currentPreset)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        log(`Preset '${currentPreset}' dihapus.`, "ok");
        currentPreset = "default";
        await loadPresets();
      }
    } catch (err) {
      log("Gagal menghapus preset: " + err.message, "err");
    }
  });

  async function loadPresetItems(presetId) {
    try {
      const res = await fetch(`/api/preset-items?preset=${encodeURIComponent(presetId)}`);
      const data = await res.json();
      if (data.success) {
        presetItemsCache = data.items || [];
        renderSqliteGrid();
        syncCacheToTextInputs();
        triggerLivePreview();
      }
    } catch (err) {
      log("Gagal memuat entri preset: " + err.message, "err");
    }
  }

  function renderSqliteGrid() {
    sqliteRowCount.textContent = presetItemsCache.length;
    sqliteTableBody.innerHTML = "";

    if (presetItemsCache.length === 0) {
      sqliteTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">Preset '${currentPreset}' masih kosong. Klik '+ BARIS' atau 'IMPOR TEKS' untuk menambahkan.</td>
        </tr>
      `;
      return;
    }

    presetItemsCache.forEach((it, idx) => {
      const tr = document.createElement("tr");
      const kwStr = Array.isArray(it.keywords) ? it.keywords.join(", ") : it.keywords || "";
      tr.innerHTML = `
        <td class="font-mono text-muted" style="text-align: center;">${idx + 1}</td>
        <td>
          <input type="text" class="sqlite-row-input row-title font-mono" data-idx="${idx}" value="${escapeHtml(it.title || "")}" placeholder="Judul foto...">
        </td>
        <td>
          <input type="text" class="sqlite-row-input row-keywords font-mono" data-idx="${idx}" value="${escapeHtml(kwStr)}" placeholder="tag1, tag2, tag3...">
        </td>
        <td style="text-align: center;">
          <button class="btn-xs btn-destructive btn-delete-row" data-idx="${idx}" title="Hapus baris">✕</button>
        </td>
      `;
      sqliteTableBody.appendChild(tr);
    });

    // Attach row input listeners
    document.querySelectorAll(".row-title").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.getAttribute("data-idx"), 10);
        if (presetItemsCache[idx]) {
          presetItemsCache[idx].title = e.target.value;
          presetItemsCache[idx].caption = e.target.value;
          syncCacheToTextInputs();
          triggerLivePreview();
        }
      });
    });

    document.querySelectorAll(".row-keywords").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(e.target.getAttribute("data-idx"), 10);
        if (presetItemsCache[idx]) {
          presetItemsCache[idx].keywords = e.target.value.split(",").map((k) => k.trim()).filter(Boolean);
          syncCacheToTextInputs();
          triggerLivePreview();
        }
      });
    });

    document.querySelectorAll(".btn-delete-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        presetItemsCache.splice(idx, 1);
        renderSqliteGrid();
        syncCacheToTextInputs();
        triggerLivePreview();
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncCacheToTextInputs() {
    titleInput.value = presetItemsCache.map((it) => it.title || "").join("\n");
    keywordInput.value = presetItemsCache
      .map((it) => (Array.isArray(it.keywords) ? it.keywords.join(", ") : it.keywords || ""))
      .join("\n\n");
    updateInputCounters();
  }

  btnAddRow.addEventListener("click", () => {
    presetItemsCache.push({
      title: "",
      keywords: [],
      caption: "",
      author: "",
    });
    renderSqliteGrid();
    syncCacheToTextInputs();
    // Focus last row title input
    const inputs = document.querySelectorAll(".row-title");
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  btnSaveDb.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/preset-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: currentPreset,
          items: presetItemsCache,
        }),
      });
      const data = await res.json();
      if (data.success) {
        log(`Berhasil menyimpan ${data.count} entri ke SQLite (preset: '${currentPreset}').`, "ok");
        await loadPresets();
      }
    } catch (err) {
      log("Gagal menyimpan ke SQLite: " + err.message, "err");
    }
  });

  btnClearDb.addEventListener("click", async () => {
    if (!window.confirm(`Kosongkan semua entri pada preset '${currentPreset}'?`)) return;
    presetItemsCache = [];
    renderSqliteGrid();
    syncCacheToTextInputs();
    await btnSaveDb.click();
  });

  btnImportFromText.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/preset-items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: currentPreset,
          titleText: titleInput.value,
          keywordText: keywordInput.value,
          mode: "replace",
        }),
      });
      const data = await res.json();
      if (data.success) {
        log(`Berhasil mengimpor ${data.count} entri dari teks ke SQLite preset '${currentPreset}'.`, "ok");
        await loadPresetItems(currentPreset);
      }
    } catch (err) {
      log("Gagal impor teks: " + err.message, "err");
    }
  });

  btnExportToText.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/preset-items/export?preset=${encodeURIComponent(currentPreset)}`);
      const data = await res.json();
      if (data.success) {
        titleInput.value = data.titlesText;
        keywordInput.value = data.keywordsText;
        updateInputCounters();
        log(`Data preset '${currentPreset}' diekspor ke tab teks.`, "ok");
        setActiveTab({ btn: tabTitles, pane: paneTitles });
      }
    } catch (err) {
      log("Gagal ekspor teks: " + err.message, "err");
    }
  });

  // History Tab Handler
  async function loadHistory() {
    try {
      const res = await fetch("/api/history?limit=30");
      const data = await res.json();
      if (data.success && data.history) {
        historyListContainer.innerHTML = "";
        if (!data.history.length) {
          historyListContainer.innerHTML = `<div class="empty-state">Belum ada riwayat operasi batch di SQLite.</div>`;
          return;
        }
        data.history.forEach((h) => {
          const item = document.createElement("div");
          item.className = "history-card-item font-mono";
          const d = new Date(h.timestamp).toLocaleString();
          item.innerHTML = `
            <div class="history-card-header">
              <span class="history-op-badge">${h.operation}</span>
              <span class="history-time">${d}</span>
            </div>
            <div class="history-summary">
              <strong>${h.fileCount} file</strong> | Berhasil: <span class="text-emerald">${h.successCount}</span> | Gagal: <span class="${h.failCount > 0 ? 'text-danger' : 'text-muted'}">${h.failCount}</span>
            </div>
            <div class="text-muted" style="font-size: 0.68rem; white-space: pre-wrap;">${escapeHtml(h.logText || '')}</div>
          `;
          historyListContainer.appendChild(item);
        });
      }
    } catch (err) {
      log("Gagal memuat riwayat: " + err.message, "err");
    }
  }

  btnRefreshHistory.addEventListener("click", loadHistory);
  btnClearHistory.addEventListener("click", async () => {
    if (!window.confirm("Bersihkan seluruh riwayat operasi batch di database SQLite?")) return;
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        log("Riwayat operasi batch dibersihkan.", "ok");
        loadHistory();
      }
    } catch (err) {
      log("Gagal menghapus riwayat: " + err.message, "err");
    }
  });

  // ==================== INPUT COUNTERS & LIVE PREVIEW ====================

  function updateInputCounters() {
    const tLines = titleInput.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    titleLineCount.textContent = tLines.length;

    const kwRaw = keywordInput.value.split(/\r?\n/);
    let kwGroups = 0;
    let inGroup = false;
    for (const l of kwRaw) {
      if (l.trim()) {
        if (!inGroup) {
          kwGroups++;
          inGroup = true;
        }
      } else {
        inGroup = false;
      }
    }
    keywordGroupCount.textContent = kwGroups;
  }

  function triggerLivePreview() {
    updateInputCounters();
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(fetchLivePreview, 300);
  }

  titleInput.addEventListener("input", triggerLivePreview);
  keywordInput.addEventListener("input", triggerLivePreview);
  templateInput.addEventListener("input", triggerLivePreview);

  // Load Folders
  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (data.success && data.folders) {
        folderSelect.innerHTML = "";
        data.folders.forEach((f) => {
          const opt = document.createElement("option");
          opt.value = f;
          opt.textContent = f + "/";
          if (f === currentFolder) opt.selected = true;
          folderSelect.appendChild(opt);
        });
        currentFolder = folderSelect.value || "foto";
        folderPathText.textContent = currentFolder + "/";
        await loadPresets();
        await fetchLivePreview();
      }
    } catch (err) {
      log("Gagal memuat daftar folder: " + err.message, "err");
    }
  }

  folderSelect.addEventListener("change", () => {
    currentFolder = folderSelect.value;
    folderPathText.textContent = currentFolder + "/";
    fetchLivePreview();
  });

  btnRefreshFolders.addEventListener("click", () => {
    log("Memperbarui daftar folder dan file...", "info");
    fetchFolders();
  });

  // Fetch Live Preview
  async function fetchLivePreview() {
    try {
      const payload = {
        folder: currentFolder,
        preset: currentPreset,
        titleText: titleInput.value,
        keywordText: keywordInput.value,
        template: templateInput.value.trim() || "{title}",
      };

      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        log("Preview error: " + (data.error || "Gagal"), "err");
        return;
      }

      fileCountBadge.textContent = `${data.totalFiles} FILE GAMBAR`;
      renderPreview(data);
    } catch (err) {
      log("Gagal mengambil live preview: " + err.message, "err");
    }
  }

  // Render Table & Grid
  function renderPreview(data) {
    const items = data.items || [];
    let readyCount = 0;

    // Warnings
    if (data.warnings && data.warnings.length > 0) {
      warningContainer.style.display = "block";
      warningList.innerHTML = "";
      data.warnings.forEach((w) => {
        const li = document.createElement("li");
        li.textContent = w;
        warningList.appendChild(li);
      });
    } else {
      warningContainer.style.display = "none";
    }

    // Table Render
    previewTableBody.innerHTML = "";
    if (items.length === 0) {
      previewTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">Tidak ada file gambar di folder '${currentFolder}/'.</td>
        </tr>
      `;
      mappingSummaryBadge.textContent = "0 / 0 FILE";
      gridViewContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">Tidak ada file gambar.</div>`;
      return;
    }

    gridViewContainer.innerHTML = "";

    items.forEach((item) => {
      if (item.status === "READY") readyCount++;

      // Row for Table
      const tr = document.createElement("tr");
      const thumbUrl = `/api/thumb?file=${encodeURIComponent(item.filePath)}`;

      // Badge TAGS untuk tabel & grid
      let tagBadgeHtml = "";
      let gridTagBadgeHtml = "";

      if (item.mappedKeywordsCount > 0) {
        if (item.currentKeywordsCount > 0 && item.currentKeywordsCount !== item.mappedKeywordsCount) {
          tagBadgeHtml = `
            <span class="badge badge-ready font-mono" title="Asli: ${item.currentKeywordsCount} tags → Target: ${item.mappedKeywordsCount} tags">
              ${item.currentKeywordsCount} → ${item.mappedKeywordsCount} TAGS
            </span>
          `;
          gridTagBadgeHtml = `<span class="badge badge-ready" title="Asli: ${item.currentKeywordsCount} → Baru: ${item.mappedKeywordsCount}">${item.currentKeywordsCount} → ${item.mappedKeywordsCount} TAGS</span>`;
        } else {
          tagBadgeHtml = `
            <span class="badge badge-ready font-mono" title="Target baru: ${item.mappedKeywordsCount} tags">
              ${item.mappedKeywordsCount} TAGS (BARU)
            </span>
          `;
          gridTagBadgeHtml = `<span class="badge badge-ready">${item.mappedKeywordsCount} TAGS (BARU)</span>`;
        }
      } else if (item.currentKeywordsCount > 0) {
        tagBadgeHtml = `
          <span class="badge badge-info font-mono" title="Kata kunci asli pada file foto: ${item.currentKeywordsCount} tags">
            ${item.currentKeywordsCount} TAGS
          </span>
        `;
        gridTagBadgeHtml = `<span class="badge badge-info" title="Tag asli pada file: ${item.currentKeywordsCount}">${item.currentKeywordsCount} TAGS</span>`;
      } else {
        tagBadgeHtml = `
          <span class="badge badge-skipped font-mono" title="Tidak ada kata kunci pada file ini">
            0 TAGS
          </span>
        `;
        gridTagBadgeHtml = `<span class="badge badge-skipped">0 TAGS</span>`;
      }

      const displayTitle = item.mappedTitle || (item.currentTitle && item.currentTitle !== "-" ? item.currentTitle : "");

      const mappedKwJson = JSON.stringify(item.mappedKeywords && item.mappedKeywords.length ? item.mappedKeywords : (item.currentKeywords || []));

      tr.innerHTML = `
        <td class="font-mono text-muted">${item.index}</td>
        <td>
          <div class="thumb-cell" data-file="${encodeURIComponent(item.filePath)}" data-planned="${encodeURIComponent(item.plannedName)}" data-title="${encodeURIComponent(item.mappedTitle || item.currentTitle || "")}" data-keywords="${encodeURIComponent(mappedKwJson)}" title="Klik untuk lihat detail metadata">
            <img src="${thumbUrl}" alt="Thumb" class="thumb-img" loading="lazy" onerror="this.src=''; this.alt='No preview';">
          </div>
        </td>
        <td>
          <div class="text-truncate font-mono" style="font-weight: 600;" title="${item.currentName}">${item.currentName}</div>
          <div class="file-sub-meta font-mono text-muted" title="Dimensi: ${item.dims || "-"} | Ukuran: ${item.sizeFmt || "-"}">
            <span>${item.dims || "-"}</span> • <span>${item.sizeFmt || "-"}</span>
          </div>
        </td>
        <td>
          <div class="text-truncate font-mono" style="color: var(--stone-900); font-weight: 500;" title="${displayTitle || "(tidak ada judul)"}">
            ${displayTitle || '<span class="text-muted" style="font-style: italic;">(belum ada judul)</span>'}
          </div>
        </td>
        <td>
          ${tagBadgeHtml}
        </td>
        <td>
          <span class="badge ${item.status === "READY" ? "badge-ready" : "badge-skipped"}">
            ${item.status}
          </span>
        </td>
        <td style="text-align: center;">
          <button class="btn-xs btn-secondary btn-inspect" data-file="${encodeURIComponent(item.filePath)}" data-planned="${encodeURIComponent(item.plannedName)}" data-title="${encodeURIComponent(item.mappedTitle || item.currentTitle || "")}" data-keywords="${encodeURIComponent(mappedKwJson)}">DETAIL</button>
        </td>
      `;
      previewTableBody.appendChild(tr);

      // Card for Grid
      const card = document.createElement("div");
      card.className = "grid-card-item";
      card.innerHTML = `
        <img src="${thumbUrl}" alt="Thumb" class="grid-card-img" loading="lazy" data-file="${encodeURIComponent(item.filePath)}" data-planned="${encodeURIComponent(item.plannedName)}" data-title="${encodeURIComponent(item.mappedTitle || item.currentTitle || "")}" data-keywords="${encodeURIComponent(mappedKwJson)}">
        <div class="grid-card-meta font-mono">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">#${item.index}</span>
            <span class="badge ${item.status === "READY" ? "badge-ready" : "badge-skipped"}">${item.status}</span>
          </div>
          <div class="text-truncate" style="font-weight: 600;" title="${item.currentName}">${item.currentName}</div>
          <div class="file-sub-meta font-mono text-muted" title="Dimensi: ${item.dims || "-"} | Ukuran: ${item.sizeFmt || "-"}">
            <span>${item.dims || "-"}</span> • <span>${item.sizeFmt || "-"}</span>
          </div>
          <div class="text-truncate text-muted" style="font-size: 0.72rem; color: var(--stone-800);" title="${displayTitle}">${displayTitle || "-"}</div>
          <div class="grid-card-actions">
            ${gridTagBadgeHtml}
            <button class="btn-xs btn-secondary btn-inspect" data-file="${encodeURIComponent(item.filePath)}" data-planned="${encodeURIComponent(item.plannedName)}" data-title="${encodeURIComponent(item.mappedTitle || item.currentTitle || "")}" data-keywords="${encodeURIComponent(mappedKwJson)}">DETAIL</button>
          </div>
        </div>
      `;
      gridViewContainer.appendChild(card);
    });

    mappingSummaryBadge.textContent = `READY: ${readyCount} / ${items.length}`;

    // Attach click listeners for inspect
    document.querySelectorAll(".btn-inspect, .thumb-cell, .grid-card-img").forEach((el) => {
      el.addEventListener("click", () => {
        const filePath = decodeURIComponent(el.getAttribute("data-file") || "");
        const plannedName = decodeURIComponent(el.getAttribute("data-planned") || "");
        const mappedTitle = decodeURIComponent(el.getAttribute("data-title") || "");
        let mappedKeywords = [];
        try {
          const rawKw = el.getAttribute("data-keywords");
          if (rawKw) mappedKeywords = JSON.parse(decodeURIComponent(rawKw));
        } catch (e) {}
        if (filePath) openMetadataModal(filePath, plannedName, mappedTitle, mappedKeywords);
      });
    });
  }

  // Metadata Inspector Modal Functions
  async function openMetadataModal(filePath, plannedName = "", mappedTitle = "", mappedKeywords = []) {
    try {
      metaDetailModal.style.display = "flex";
      modalFileName.textContent = "Memuat metadata...";
      modalThumbImg.src = `/api/thumb?file=${encodeURIComponent(filePath)}`;
      setModalTab("summary");

      if (modalExportStatus) {
        modalExportStatus.style.display = "none";
        modalExportStatus.className = "modal-export-status";
        modalExportStatus.textContent = "";
      }
      if (btnModalExportJpeg) {
        btnModalExportJpeg.disabled = false;
        btnModalExportJpeg.textContent = "🖼️ EXPORT FOTO INI KE JPG";
      }
      if (modalExportQuality && exportQualitySlider) {
        modalExportQuality.value = exportQualitySlider.value || "90";
      }

      const res = await fetch(`/api/meta-detail?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!data.success) {
        modalFileName.textContent = "Gagal memuat metadata";
        return;
      }

      data.plannedName = plannedName;
      data.mappedTitle = mappedTitle;
      data.mappedKeywords = mappedKeywords;
      currentModalData = data;
      renderModalContent(data);
    } catch (err) {
      modalFileName.textContent = "Error: " + err.message;
    }
  }

  function renderModalContent(data) {
    const file = data.file || {};
    const meta = data.metadata || {};

    modalFileName.textContent = file.name || "-";
    modalDims.textContent = file.dims || "-";
    modalSize.textContent = file.sizeFmt || "-";
    modalFormat.textContent = file.isJpeg ? "JPEG (.jpg)" : file.isPng ? "PNG (.png)" : "Gambar";
    modalExifStatus.textContent = file.exifPresent ? "TERSEDIA (EXIF)" : "TIDAK ADA EXIF";

    // Target Rename
    if (modalTargetRenameBox) {
      modalTargetRenameBox.textContent = data.plannedName || file.name || "-";
    }

    // Summary & Microstock
    modalTitleContent.textContent = meta.title || meta.description || "(Belum ada judul)";
    const keywords = meta.keywords || [];
    modalKeywordCount.textContent = keywords.length;
    modalKeywordBadges.innerHTML = "";
    if (keywords.length > 0) {
      keywords.forEach((kw) => {
        const pill = document.createElement("span");
        pill.className = "keyword-pill font-mono";
        pill.textContent = kw;
        modalKeywordBadges.appendChild(pill);
      });
    } else {
      modalKeywordBadges.innerHTML = `<span class="text-muted">(Belum ada kata kunci)</span>`;
    }
    modalCaption.textContent = meta.caption || meta.description || "-";
    modalAuthor.textContent = meta.author || meta.artist || "-";

    // EXIF Table
    modalExifTableBody.innerHTML = `
      <tr><td>KAMERA</td><td>${[meta.make, meta.model].filter(Boolean).join(" ") || "-"}</td></tr>
      <tr><td>LENSA</td><td>${meta.lens || "-"}</td></tr>
      <tr><td>SOFTWARE</td><td>${meta.software || "-"}</td></tr>
      <tr><td>ARTIS</td><td>${meta.artist || "-"}</td></tr>
      <tr><td>HAK CIPTA</td><td>${meta.copyright || "-"}</td></tr>
      <tr><td>TANGGAL ASLI</td><td>${meta.dateTimeOriginal || meta.dateTime || "-"}</td></tr>
      <tr><td>ORIENTASI</td><td>${meta.orientation ? `${meta.orientation}` : "-"}</td></tr>
      <tr><td>EKSPOSUR</td><td>${meta.exposureTime ? (meta.exposureTime.n + "/" + meta.exposureTime.d + " s") : "-"}</td></tr>
      <tr><td>DIAFRAGMA</td><td>${meta.fNumber ? ("f/" + (meta.fNumber.n / meta.fNumber.d).toFixed(1)) : "-"}</td></tr>
      <tr><td>ISO</td><td>${meta.iso != null ? meta.iso : "-"}</td></tr>
      <tr><td>FOCAL LENGTH</td><td>${meta.focalLength ? ((meta.focalLength.n / meta.focalLength.d).toFixed(1) + " mm") : "-"}</td></tr>
    `;

    // GPS Content
    if (meta.gps && meta.gps.lat != null && meta.gps.lon != null) {
      const g = meta.gps;
      const mapsUrl = `https://www.google.com/maps?q=${g.lat},${g.lon}`;
      modalGpsContent.innerHTML = `
        <div class="meta-row"><span class="meta-label">LATITUDE:</span><span class="meta-val">${g.lat.toFixed(6)} ${g.latRef || ""}</span></div>
        <div class="meta-row"><span class="meta-label">LONGITUDE:</span><span class="meta-val">${g.lon.toFixed(6)} ${g.lonRef || ""}</span></div>
        <div class="meta-row"><span class="meta-label">ALTITUDE:</span><span class="meta-val">${g.alt != null ? g.alt + " m" : "-"}</span></div>
        <div class="meta-row"><span class="meta-label">DATE/TIME:</span><span class="meta-val">${g.dateStamp || "-"} ${g.timeStamp ? g.timeStamp.join(":") : ""}</span></div>
        <div style="margin-top: 0.5rem;">
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-xs" style="text-decoration: none; display: inline-flex;">
            📍 BUKA DI GOOGLE MAPS
          </a>
        </div>
      `;
    } else {
      modalGpsContent.innerHTML = `<div class="text-muted">Tidak ada data koordinat GPS pada foto ini.</div>`;
    }

    // RAW JSON
    modalRawJson.textContent = JSON.stringify(data, null, 2);
  }

  function setModalTab(tabName) {
    [tabModalSummary, tabModalExif, tabModalGps, tabModalRaw].forEach((btn) => btn.classList.remove("active"));
    [modalPaneSummary, modalPaneExif, modalPaneGps, modalPaneRaw].forEach((pane) => pane.classList.remove("active"));

    if (tabName === "summary") {
      tabModalSummary.classList.add("active");
      modalPaneSummary.classList.add("active");
    } else if (tabName === "exif") {
      tabModalExif.classList.add("active");
      modalPaneExif.classList.add("active");
    } else if (tabName === "gps") {
      tabModalGps.classList.add("active");
      modalPaneGps.classList.add("active");
    } else if (tabName === "raw") {
      tabModalRaw.classList.add("active");
      modalPaneRaw.classList.add("active");
    }
  }

  tabModalSummary.addEventListener("click", () => setModalTab("summary"));
  tabModalExif.addEventListener("click", () => setModalTab("exif"));
  tabModalGps.addEventListener("click", () => setModalTab("gps"));
  tabModalRaw.addEventListener("click", () => setModalTab("raw"));

  function closeModal() {
    metaDetailModal.style.display = "none";
    currentModalData = null;
  }

  modalCloseBtn.addEventListener("click", closeModal);
  modalCloseBtnBottom.addEventListener("click", closeModal);
  metaDetailModal.addEventListener("click", (e) => {
    if (e.target === metaDetailModal) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && metaDetailModal.style.display === "flex") {
      closeModal();
    }
  });

  // Copy helpers
  function showCopyToast(msg) {
    copyToast.textContent = msg;
    copyToast.style.display = "inline-block";
    setTimeout(() => {
      copyToast.style.display = "none";
    }, 2500);
  }

  if (btnCopyTargetName) {
    btnCopyTargetName.addEventListener("click", () => {
      if (currentModalData && currentModalData.plannedName) {
        navigator.clipboard.writeText(currentModalData.plannedName).then(() => {
          showCopyToast("Target nama baru berhasil disalin!");
        });
      }
    });
  }

  btnCopyTitle.addEventListener("click", () => {
    if (currentModalData && currentModalData.metadata && (currentModalData.metadata.title || currentModalData.metadata.description)) {
      const text = currentModalData.metadata.title || currentModalData.metadata.description;
      navigator.clipboard.writeText(text).then(() => {
        showCopyToast("Judul berhasil disalin!");
      });
    }
  });

  btnCopyKeywords.addEventListener("click", () => {
    if (currentModalData && currentModalData.metadata && currentModalData.metadata.keywords && currentModalData.metadata.keywords.length) {
      const text = currentModalData.metadata.keywords.join(", ");
      navigator.clipboard.writeText(text).then(() => {
        showCopyToast("Kata kunci berhasil disalin!");
      });
    }
  });

  // Single Image Export from Modal Detail Handler
  if (btnModalExportJpeg) {
    btnModalExportJpeg.addEventListener("click", async () => {
      if (!currentModalData || !currentModalData.file || !currentModalData.file.fullPath) return;

      const filePath = currentModalData.file.fullPath;
      const fileName = currentModalData.file.name || "Foto";
      const quality = modalExportQuality ? parseInt(modalExportQuality.value, 10) || 90 : 90;

      const titleToUse = currentModalData.mappedTitle || (currentModalData.metadata && (currentModalData.metadata.title || currentModalData.metadata.description)) || "";
      const keywordsToUse = (currentModalData.mappedKeywords && currentModalData.mappedKeywords.length)
        ? currentModalData.mappedKeywords
        : (currentModalData.metadata && currentModalData.metadata.keywords) || [];

      btnModalExportJpeg.disabled = true;
      btnModalExportJpeg.textContent = "⏳ MENGEKSPOR KE JPG...";
      if (modalExportStatus) {
        modalExportStatus.style.display = "block";
        modalExportStatus.className = "modal-export-status status-loading";
        modalExportStatus.textContent = `Sedang mengonversi ${fileName} ke JPEG (${quality}%)...`;
      }

      log(`[EXPORT] Mengekspor foto individual: ${fileName} ke JPEG (Kualitas: ${quality}%)...`, "info");

      try {
        const payload = {
          folder: currentFolder,
          preset: currentPreset,
          files: [filePath],
          singleTitle: titleToUse,
          singleKeywords: keywordsToUse,
          quality,
        };

        const res = await fetch("/api/export-jpeg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!data.success || data.failed > 0) {
          const errMsg = data.error || (data.logs && data.logs.find((l) => l.startsWith("[ERROR]"))) || "Gagal melakukan ekspor JPEG";
          if (modalExportStatus) {
            modalExportStatus.className = "modal-export-status status-err";
            modalExportStatus.textContent = `Gagal: ${errMsg}`;
          }
          log(`[ERROR] Ekspor ${fileName} gagal: ${errMsg}`, "err");
        } else {
          const outResult = (data.results && data.results[0]) || {};
          const destName = outResult.destName || (fileName.replace(/\.[^.]+$/, "") + ".jpg");
          const sizeFmt = outResult.sizeFmt || "";

          if (modalExportStatus) {
            modalExportStatus.className = "modal-export-status status-ok";
            modalExportStatus.innerHTML = `✓ Berhasil diekspor: <strong>${destName}</strong> ${sizeFmt ? `(${sizeFmt})` : ""}`;
          }
          log(`[OK] Foto berhasil diekspor: ${destName} ${sizeFmt ? `(${sizeFmt})` : ""}`, "ok");
          showCopyToast(`✓ Berhasil diekspor ke ${destName}`);

          // Refresh data preview & history
          await fetchLivePreview();
          if (tabHistory.classList.contains("active")) {
            loadHistory();
          }
        }
      } catch (err) {
        if (modalExportStatus) {
          modalExportStatus.className = "modal-export-status status-err";
          modalExportStatus.textContent = `Kesalahan: ${err.message}`;
        }
        log(`[ERROR] Ekspor ${fileName} error: ${err.message}`, "err");
      } finally {
        btnModalExportJpeg.disabled = false;
        btnModalExportJpeg.textContent = "🖼️ EXPORT FOTO INI KE JPG";
      }
    });
  }

  // Save / Load Handlers for Text Tabs
  btnSaveTitles.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/save-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: currentFolder,
          preset: currentPreset,
          titleText: titleInput.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        log("Daftar judul berhasil disimpan ke SQLite & file.", "ok");
        await loadPresetItems(currentPreset);
      }
    } catch (err) {
      log("Gagal menyimpan judul: " + err.message, "err");
    }
  });

  btnSaveKeywords.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/save-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: currentFolder,
          preset: currentPreset,
          keywordText: keywordInput.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        log("Daftar kata kunci berhasil disimpan ke SQLite & file.", "ok");
        await loadPresetItems(currentPreset);
      }
    } catch (err) {
      log("Gagal menyimpan kata kunci: " + err.message, "err");
    }
  });

  btnLoadTitles.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/inputs?folder=${encodeURIComponent(currentFolder)}&preset=${encodeURIComponent(currentPreset)}`);
      const data = await res.json();
      if (data.success && data.titleText) {
        titleInput.value = data.titleText;
        triggerLivePreview();
        log("Daftar judul dimuat ulang.", "info");
      }
    } catch (err) {
      log("Gagal memuat judul: " + err.message, "err");
    }
  });

  btnLoadKeywords.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/inputs?folder=${encodeURIComponent(currentFolder)}&preset=${encodeURIComponent(currentPreset)}`);
      const data = await res.json();
      if (data.success && data.keywordText) {
        keywordInput.value = data.keywordText;
        triggerLivePreview();
        log("Daftar kata kunci dimuat ulang.", "info");
      }
    } catch (err) {
      log("Gagal memuat kata kunci: " + err.message, "err");
    }
  });

  // Execution Handlers
  async function executeAction(action) {
    if (isExecuting) return;

    const actionLabels = {
      auto: "EKSEKUSI AUTO (METADATA + RENAME)",
      metadata: "TERAPKAN METADATA SAJA",
      rename: "RENAME FILE SAJA",
      strip: "STRIP / HAPUS METADATA",
    };

    const confirmMsg = `Konfirmasi: Jalankan '${actionLabels[action]}' pada folder '${currentFolder}' menggunakan preset '${currentPreset}'?`;
    if (!window.confirm(confirmMsg)) return;

    isExecuting = true;
    setExecutionState(true);
    log(`Memulai ${actionLabels[action]}...`, "info");

    try {
      const payload = {
        action,
        folder: currentFolder,
        preset: currentPreset,
        titleText: titleInput.value,
        keywordText: keywordInput.value,
        template: templateInput.value.trim() || "{title}",
        noBackup: chkNoBackup.checked,
      };

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        log("Eksekusi gagal: " + (data.error || "Terjadi kesalahan"), "err");
      } else {
        if (data.logs && data.logs.length) {
          data.logs.forEach((line) => {
            const isOk = line.startsWith("[OK]");
            const isErr = line.startsWith("[ERROR]");
            log(line, isOk ? "ok" : isErr ? "err" : "info");
          });
        }
        log(
          `Selesai: ${data.processed} diproses, ${data.skipped} dilewati, ${data.failed} gagal.`,
          data.failed > 0 ? "err" : "ok"
        );
      }

      // Refresh data & preview & history
      await fetchLivePreview();
      if (tabHistory.classList.contains("active")) {
        loadHistory();
      }
    } catch (err) {
      log("Kesalahan saat menjalankan eksekusi: " + err.message, "err");
    } finally {
      isExecuting = false;
      setExecutionState(false);
    }
  }

  if (exportQualitySlider && exportQualityBadge) {
    exportQualitySlider.addEventListener("input", () => {
      exportQualityBadge.textContent = exportQualitySlider.value + "%";
    });
  }

  async function executeExportJpeg() {
    if (isExecuting) return;

    const quality = exportQualitySlider ? parseInt(exportQualitySlider.value, 10) || 90 : 90;
    const confirmMsg = `Konfirmasi: Konversi seluruh gambar di folder '${currentFolder}' ke JPEG (${quality}% kualitas) dengan menyematkan metadata EXIF/IPTC/XMP dari preset '${currentPreset}'?`;
    if (!window.confirm(confirmMsg)) return;

    isExecuting = true;
    setExecutionState(true);
    log(`Memulai konversi JPEG (Kualitas: ${quality}%)...`, "info");

    try {
      const payload = {
        folder: currentFolder,
        preset: currentPreset,
        titleText: titleInput.value,
        keywordText: keywordInput.value,
        quality,
      };

      const res = await fetch("/api/export-jpeg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        log("Export JPEG gagal: " + (data.error || "Terjadi kesalahan"), "err");
      } else {
        if (data.logs && data.logs.length) {
          data.logs.forEach((line) => {
            const isOk = line.startsWith("[OK]");
            const isErr = line.startsWith("[ERROR]");
            log(line, isOk ? "ok" : isErr ? "err" : "info");
          });
        }
        log(
          `Export JPEG Selesai: ${data.processed} berhasil diekspor, ${data.failed} gagal.`,
          data.failed > 0 ? "err" : "ok"
        );
      }

      await fetchLivePreview();
      if (tabHistory.classList.contains("active")) {
        loadHistory();
      }
    } catch (err) {
      log("Kesalahan saat ekspor JPEG: " + err.message, "err");
    } finally {
      isExecuting = false;
      setExecutionState(false);
    }
  }

  function setExecutionState(running) {
    btnExecuteAuto.disabled = running;
    if (btnExecuteExportJpeg) btnExecuteExportJpeg.disabled = running;
    btnExecuteMeta.disabled = running;
    btnExecuteRename.disabled = running;
    btnExecuteStrip.disabled = running;
    execProgressBadge.style.display = running ? "inline-block" : "none";
  }

  btnExecuteAuto.addEventListener("click", () => executeAction("auto"));
  if (btnExecuteExportJpeg) btnExecuteExportJpeg.addEventListener("click", executeExportJpeg);
  btnExecuteMeta.addEventListener("click", () => executeAction("metadata"));
  btnExecuteRename.addEventListener("click", () => executeAction("rename"));
  btnExecuteStrip.addEventListener("click", () => executeAction("strip"));

  // Initial Load
  fetchFolders();
});
