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
  const paneHistory = document.getElementById("paneHistory");

  // SQLite Grid Elements
  const sqliteRowCount = document.getElementById("sqliteRowCount");
  const sqliteTableBody = document.getElementById("sqliteTableBody");
  const btnAddRow = document.getElementById("btnAddRow");
  const btnSaveDb = document.getElementById("btnSaveDb");
  const btnClearDb = document.getElementById("btnClearDb");
  const btnImportFromText = document.getElementById("btnImportFromText");

  // Textarea Inputs & Counters
  const titleInput = document.getElementById("titleInput");
  const keywordInput = document.getElementById("keywordInput");
  const titleLineCount = document.getElementById("titleLineCount");
  const keywordGroupCount = document.getElementById("keywordGroupCount");
  const btnLoadTemplateSample = document.getElementById("btnLoadTemplateSample");

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
  const btnExecuteExportVector = document.getElementById("btnExecuteExportVector");
  const vectorProfileSelect = document.getElementById("vectorProfileSelect");
  const btnOpenVectorSettings = document.getElementById("btnOpenVectorSettings");
  const vectorSettingsSummaryBadge = document.getElementById("vectorSettingsSummaryBadge");

  // Vector Settings Modal Elements
  const vectorSettingsModal = document.getElementById("vectorSettingsModal");
  const btnVectorSettingsClose = document.getElementById("btnVectorSettingsClose");
  const btnVectorResetDefaults = document.getElementById("btnVectorResetDefaults");
  const btnVectorSaveSettings = document.getElementById("btnVectorSaveSettings");
  const cfgVectorProfile = document.getElementById("cfgVectorProfile");
  const cfgProfileDesc = document.getElementById("cfgProfileDesc");
  const cfgVectorMode = document.getElementById("cfgVectorMode");
  const cfgVectorHierarchical = document.getElementById("cfgVectorHierarchical");
  const cfgVectorSimplify = document.getElementById("cfgVectorSimplify");
  const cfgVectorSimplifyBadge = document.getElementById("cfgVectorSimplifyBadge");
  const cfgVectorCorner = document.getElementById("cfgVectorCorner");
  const cfgVectorCornerBadge = document.getElementById("cfgVectorCornerBadge");
  const cfgVectorSpeckle = document.getElementById("cfgVectorSpeckle");
  const cfgVectorSpeckleBadge = document.getElementById("cfgVectorSpeckleBadge");
  const cfgVectorPrecision = document.getElementById("cfgVectorPrecision");
  const cfgVectorPrecisionBadge = document.getElementById("cfgVectorPrecisionBadge");
  const cfgVectorMaxColors = document.getElementById("cfgVectorMaxColors");
  const cfgVectorEmbedMeta = document.getElementById("cfgVectorEmbedMeta");
  const cfgVectorOutDir = document.getElementById("cfgVectorOutDir");

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
  const modalVectorPreset = document.getElementById("modalVectorPreset");
  const btnModalExportVector = document.getElementById("btnModalExportVector");
  const modalExportVectorStatus = document.getElementById("modalExportVectorStatus");

  // State
  let currentFolder = "foto";
  let currentPreset = "default";
  let presetItemsCache = [];
  let previewDebounceTimer = null;
  let isExecuting = false;
  let currentModalData = null;
  let isConsoleCollapsed = false;

  // Vector Settings State & Profiles
  const DEFAULT_VECTOR_SETTINGS = {
    profile: "microstock",
    mode: "spline",
    hierarchical: "cutout",
    simplify: 1.5,
    cornerThreshold: 60,
    filterSpeckle: 8,
    colorPrecision: 6,
    maxColors: 32,
    embedMetadata: true,
    outDir: "",
  };

  const VECTOR_PROFILES_DATA = {
    microstock: {
      name: "Microstock Clean",
      desc: "Kurva rapi, potongan cutout (tanpa layer bertumpuk), minim node, standar kurasi microstock.",
      mode: "spline",
      hierarchical: "cutout",
      simplify: 1.5,
      cornerThreshold: 60,
      filterSpeckle: 8,
      colorPrecision: 6,
      maxColors: 32,
    },
    flat: {
      name: "Flat Clipart & Logo",
      desc: "Warna datar sederhana, kurva halus, cocok untuk logo dan ikon.",
      mode: "spline",
      hierarchical: "stacked",
      simplify: 2.0,
      cornerThreshold: 60,
      filterSpeckle: 12,
      colorPrecision: 4,
      maxColors: 16,
    },
    pixel: {
      name: "Pixel Art to Vector",
      desc: "Menjaga kotak-kotak piksel 1:1 tetap tajam tanpa kurva membulat.",
      mode: "pixel",
      hierarchical: "cutout",
      simplify: 0,
      cornerThreshold: 90,
      filterSpeckle: 0,
      colorPrecision: 8,
      maxColors: 0,
    },
    photo: {
      name: "Detailed Photo Trace",
      desc: "Gradasi warna kaya dan kontur halus mendekati foto asli.",
      mode: "spline",
      hierarchical: "stacked",
      simplify: 0.8,
      cornerThreshold: 45,
      filterSpeckle: 2,
      colorPrecision: 7,
      maxColors: 0,
    },
    bw: {
      name: "Black & White (Siluet)",
      desc: "Dua warna monokrom kontras tinggi untuk siluet, stempel, atau logo cap.",
      mode: "spline",
      hierarchical: "stacked",
      simplify: 1.2,
      cornerThreshold: 60,
      filterSpeckle: 4,
      colorPrecision: 2,
      maxColors: 2,
    },
    custom: {
      name: "Kustom",
      desc: "Parameter kurva dan warna ditentukan manual oleh pengguna.",
    },
  };

  let currentVectorSettings = { ...DEFAULT_VECTOR_SETTINGS };

  try {
    const saved = localStorage.getItem("imgmeta_vector_settings");
    if (saved) {
      currentVectorSettings = { ...DEFAULT_VECTOR_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}

  function updateVectorSummaryBadge() {
    if (!vectorSettingsSummaryBadge) return;
    const s = currentVectorSettings;
    const pInfo = VECTOR_PROFILES_DATA[s.profile] || { name: "Kustom" };
    vectorSettingsSummaryBadge.textContent = `${pInfo.name} • ${s.hierarchical === "cutout" ? "Cutout" : "Stacked"} • ${s.mode} • Node: ${s.simplify}px • Noise: ${s.filterSpeckle}px • Warna: ${s.maxColors ? s.maxColors : "Auto"}`;
    if (vectorProfileSelect) {
      vectorProfileSelect.value = s.profile || "custom";
    }
  }

  function syncSettingsToForm(s) {
    if (!cfgVectorProfile) return;
    cfgVectorProfile.value = s.profile || "custom";
    if (cfgProfileDesc && VECTOR_PROFILES_DATA[s.profile]) {
      cfgProfileDesc.textContent = VECTOR_PROFILES_DATA[s.profile].desc;
    }
    if (cfgVectorMode) cfgVectorMode.value = s.mode || "spline";
    if (cfgVectorHierarchical) cfgVectorHierarchical.value = s.hierarchical || "cutout";
    if (cfgVectorSimplify) {
      cfgVectorSimplify.value = s.simplify !== undefined ? s.simplify : 1.5;
      if (cfgVectorSimplifyBadge) cfgVectorSimplifyBadge.textContent = `${cfgVectorSimplify.value} px`;
    }
    if (cfgVectorCorner) {
      cfgVectorCorner.value = s.cornerThreshold !== undefined ? s.cornerThreshold : 60;
      if (cfgVectorCornerBadge) cfgVectorCornerBadge.textContent = `${cfgVectorCorner.value}°`;
    }
    if (cfgVectorSpeckle) {
      cfgVectorSpeckle.value = s.filterSpeckle !== undefined ? s.filterSpeckle : 8;
      if (cfgVectorSpeckleBadge) cfgVectorSpeckleBadge.textContent = `${cfgVectorSpeckle.value} px`;
    }
    if (cfgVectorPrecision) {
      cfgVectorPrecision.value = s.colorPrecision !== undefined ? s.colorPrecision : 6;
      if (cfgVectorPrecisionBadge) cfgVectorPrecisionBadge.textContent = String(cfgVectorPrecision.value);
    }
    if (cfgVectorMaxColors) cfgVectorMaxColors.value = s.maxColors !== undefined ? String(s.maxColors) : "32";
    if (cfgVectorEmbedMeta) cfgVectorEmbedMeta.checked = s.embedMetadata !== false;
    if (cfgVectorOutDir) cfgVectorOutDir.value = s.outDir || "";
  }

  function applyProfileToForm(profileKey) {
    const prof = VECTOR_PROFILES_DATA[profileKey];
    if (!prof || profileKey === "custom") {
      if (cfgProfileDesc) cfgProfileDesc.textContent = "Parameter kurva dan warna ditentukan manual oleh pengguna.";
      return;
    }
    if (cfgProfileDesc) cfgProfileDesc.textContent = prof.desc;
    if (cfgVectorMode && prof.mode) cfgVectorMode.value = prof.mode;
    if (cfgVectorHierarchical && prof.hierarchical) cfgVectorHierarchical.value = prof.hierarchical;
    if (cfgVectorSimplify && prof.simplify !== undefined) {
      cfgVectorSimplify.value = prof.simplify;
      if (cfgVectorSimplifyBadge) cfgVectorSimplifyBadge.textContent = `${prof.simplify} px`;
    }
    if (cfgVectorCorner && prof.cornerThreshold !== undefined) {
      cfgVectorCorner.value = prof.cornerThreshold;
      if (cfgVectorCornerBadge) cfgVectorCornerBadge.textContent = `${prof.cornerThreshold}°`;
    }
    if (cfgVectorSpeckle && prof.filterSpeckle !== undefined) {
      cfgVectorSpeckle.value = prof.filterSpeckle;
      if (cfgVectorSpeckleBadge) cfgVectorSpeckleBadge.textContent = `${prof.filterSpeckle} px`;
    }
    if (cfgVectorPrecision && prof.colorPrecision !== undefined) {
      cfgVectorPrecision.value = prof.colorPrecision;
      if (cfgVectorPrecisionBadge) cfgVectorPrecisionBadge.textContent = String(prof.colorPrecision);
    }
    if (cfgVectorMaxColors && prof.maxColors !== undefined) cfgVectorMaxColors.value = String(prof.maxColors);
  }

  function readFormToSettings() {
    return {
      profile: cfgVectorProfile.value,
      mode: cfgVectorMode.value,
      hierarchical: cfgVectorHierarchical.value,
      simplify: parseFloat(cfgVectorSimplify.value) || 0,
      cornerThreshold: parseInt(cfgVectorCorner.value, 10) || 60,
      filterSpeckle: parseInt(cfgVectorSpeckle.value, 10) || 0,
      colorPrecision: parseInt(cfgVectorPrecision.value, 10) || 6,
      maxColors: parseInt(cfgVectorMaxColors.value, 10) || 0,
      embedMetadata: cfgVectorEmbedMeta.checked,
      outDir: cfgVectorOutDir.value.trim(),
    };
  }

  // Vector Settings Listeners
  if (btnOpenVectorSettings) {
    btnOpenVectorSettings.addEventListener("click", () => {
      syncSettingsToForm(currentVectorSettings);
      vectorSettingsModal.style.display = "flex";
    });
  }

  if (btnVectorSettingsClose) {
    btnVectorSettingsClose.addEventListener("click", () => {
      vectorSettingsModal.style.display = "none";
    });
  }

  if (cfgVectorProfile) {
    cfgVectorProfile.addEventListener("change", (e) => {
      applyProfileToForm(e.target.value);
    });
  }

  [cfgVectorMode, cfgVectorHierarchical, cfgVectorSimplify, cfgVectorCorner, cfgVectorSpeckle, cfgVectorPrecision, cfgVectorMaxColors].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      if (cfgVectorSimplifyBadge && input === cfgVectorSimplify) cfgVectorSimplifyBadge.textContent = `${input.value} px`;
      if (cfgVectorCornerBadge && input === cfgVectorCorner) cfgVectorCornerBadge.textContent = `${input.value}°`;
      if (cfgVectorSpeckleBadge && input === cfgVectorSpeckle) cfgVectorSpeckleBadge.textContent = `${input.value} px`;
      if (cfgVectorPrecisionBadge && input === cfgVectorPrecision) cfgVectorPrecisionBadge.textContent = input.value;
      if (cfgVectorProfile && cfgVectorProfile.value !== "custom") {
        cfgVectorProfile.value = "custom";
        if (cfgProfileDesc) cfgProfileDesc.textContent = "Parameter diubah manual.";
      }
    });
  });

  if (btnVectorResetDefaults) {
    btnVectorResetDefaults.addEventListener("click", () => {
      currentVectorSettings = { ...DEFAULT_VECTOR_SETTINGS };
      syncSettingsToForm(currentVectorSettings);
      log("[VECTOR] Pengaturan vektor di-reset ke default Microstock Clean.", "info");
    });
  }

  if (btnVectorSaveSettings) {
    btnVectorSaveSettings.addEventListener("click", () => {
      currentVectorSettings = readFormToSettings();
      try {
        localStorage.setItem("imgmeta_vector_settings", JSON.stringify(currentVectorSettings));
      } catch {}
      updateVectorSummaryBadge();
      vectorSettingsModal.style.display = "none";
      showCopyToast("✓ Pengaturan vektor berhasil disimpan!");
      log(`[VECTOR] Pengaturan vektor diperbarui (Profil: ${currentVectorSettings.profile}).`, "ok");
    });
  }

  if (vectorProfileSelect) {
    vectorProfileSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      if (selected === "custom") {
        if (btnOpenVectorSettings) btnOpenVectorSettings.click();
      } else {
        const prof = VECTOR_PROFILES_DATA[selected];
        if (prof) {
          currentVectorSettings = {
            ...currentVectorSettings,
            profile: selected,
            mode: prof.mode,
            hierarchical: prof.hierarchical,
            simplify: prof.simplify,
            cornerThreshold: prof.cornerThreshold,
            filterSpeckle: prof.filterSpeckle,
            colorPrecision: prof.colorPrecision,
            maxColors: prof.maxColors,
          };
          try {
            localStorage.setItem("imgmeta_vector_settings", JSON.stringify(currentVectorSettings));
          } catch {}
          updateVectorSummaryBadge();
          log(`[VECTOR] Mengaktifkan profil vektor: ${prof.name}`, "info");
        }
      }
    });
  }

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
    { btn: tabHistory, pane: paneHistory },
  ];

  function setActiveTab(targetTab, options = {}) {
    if (!options.skipSync) {
      syncTextInputsToCache();
    }
    allTabs.forEach(({ btn, pane }) => {
      if (btn === targetTab.btn) {
        btn.classList.add("active");
        pane.classList.add("active");
      } else {
        btn.classList.remove("active");
        pane.classList.remove("active");
      }
    });
    if (targetTab.btn === tabSqliteGrid) {
      renderSqliteGrid();
    }
    if (targetTab.btn === tabHistory) {
      loadHistory();
    }
  }

  tabSqliteGrid.addEventListener("click", () => setActiveTab({ btn: tabSqliteGrid, pane: paneSqliteGrid }));
  tabTitles.addEventListener("click", () => setActiveTab({ btn: tabTitles, pane: paneTitles }));
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
    await loadPresetItems(currentPreset);
    const count = presetItemsCache.length;
    if (count === 0) {
      log(`Beralih ke preset '${currentPreset}' (masih kosong 0 entri). Silakan impor file .txt atau tambah baris.`, "info");
    } else {
      log(`Beralih ke preset '${currentPreset}' (${count} entri terisi).`, "info");
    }
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
          triggerAutoSaveDb();
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
          triggerAutoSaveDb();
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
        triggerAutoSaveDb();
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

  let autoSaveTimer = null;

  function triggerAutoSaveDb() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      if (!presetItemsCache || presetItemsCache.length === 0) return;
      try {
        await fetch("/api/preset-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            presetId: currentPreset,
            items: presetItemsCache,
          }),
        });
      } catch {}
    }, 800);
  }

  const isHeaderLineClient = (line) => /^\s*\[?\s*(?:Titles?|Judul|Keywords?|Kata\s*Kunci|Tags?)\s*\]?:?\s*$/i.test(line);

  function syncTextInputsToCache() {
    if (!titleInput) return;
    const raw = titleInput.value;
    const combined = parseCombinedTextClient(raw);
    let effectiveTitles = raw;
    let effectiveKw = "";

    if (combined && (combined.titleText || combined.keywordText)) {
      effectiveTitles = combined.titleText;
      effectiveKw = combined.keywordText;
    }

    const tLines = effectiveTitles
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((l) => !isHeaderLineClient(l));
    const kwRaw = effectiveKw.split(/\r?\n/);

    const kwGroups = [];
    let currentGroup = [];
    let inGroup = false;

    for (const line of kwRaw) {
      if (line.trim()) {
        inGroup = true;
        const parts = line.split(",").map((k) => k.trim()).filter(Boolean);
        currentGroup.push(...parts);
      } else if (inGroup) {
        kwGroups.push(currentGroup);
        currentGroup = [];
        inGroup = false;
      }
    }
    if (inGroup || currentGroup.length > 0) {
      kwGroups.push(currentGroup);
    }

    const maxLen = Math.max(tLines.length, kwGroups.length);
    const updated = [];

    for (let i = 0; i < maxLen; i++) {
      const prev = presetItemsCache[i] || {};
      const title = i < tLines.length ? tLines[i] : prev.title || "";
      const keywords = i < kwGroups.length ? kwGroups[i] : prev.keywords || [];

      updated.push({
        title,
        caption: title,
        keywords,
        author: prev.author || "",
      });
    }

    presetItemsCache = updated;
    updateInputCounters();
    triggerAutoSaveDb();
  }

  function syncCacheToTextInputs() {
    if (!titleInput) return;
    if (document.activeElement !== titleInput) {
      if (presetItemsCache.length > 0) {
        const titlesFormatted = presetItemsCache.map((it) => it.title || "").join("\n");
        const keywordsFormatted = presetItemsCache
          .map((it) => (Array.isArray(it.keywords) ? it.keywords.join(", ") : it.keywords || ""))
          .join("\n\n");
        titleInput.value = `Titles\n${titlesFormatted}\n\nKeywords\n${keywordsFormatted}`;
      } else {
        titleInput.value = "";
      }
    }
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

  function logImportDetails(items, presetId, sourceName) {
    if (!items || !items.length) {
      log(`[IMPOR] Tidak ada entri data yang diimpor dari '${sourceName}'.`, "err");
      return;
    }
    log(`[OK] Berhasil mengimpor ${items.length} entri dari '${sourceName}' ke preset SQLite '${presetId}'.`, "ok");
    items.forEach((it, idx) => {
      const isLast = idx === items.length - 1;
      const prefix = isLast ? "  └─ " : "  ├─ ";
      const kwCount = Array.isArray(it.keywords) ? it.keywords.length : (it.keywords ? it.keywords.split(",").length : 0);
      const titleShort = it.title ? (it.title.length > 55 ? it.title.substring(0, 52) + "..." : it.title) : "(tanpa judul)";
      log(`${prefix}Entri #${idx + 1}: "${titleShort}" (${kwCount} kata kunci)`, "info");
    });
  }

  const handleImportFromText = async () => {
    if (!titleInput.value.trim()) {
      showCopyToast("Editor teks metadata masih kosong. Isikan teks terlebih dahulu atau gunakan '📂 PILIH FILE .TXT'.", "error");
      return;
    }
    try {
      const targetPreset = (presetSelect && presetSelect.value) ? presetSelect.value : currentPreset;
      currentPreset = targetPreset;
      const res = await fetch("/api/preset-items/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: targetPreset,
          titleText: titleInput.value,
          keywordText: "",
          mode: "replace",
        }),
      });
      const data = await res.json();
      if (data.success) {
        presetItemsCache = data.items || [];
        renderSqliteGrid();
        syncCacheToTextInputs();
        setActiveTab({ btn: tabSqliteGrid, pane: paneSqliteGrid }, { skipSync: true });
        await loadPresets();
        logImportDetails(data.items, targetPreset, "Textarea Editor");
        showCopyToast(`✓ Berhasil mengimpor ${data.count} entri dari teks ke SQLite preset '${targetPreset}'.`);
      }
    } catch (err) {
      showCopyToast("Gagal impor teks: " + err.message, "error");
      log("Gagal impor teks: " + err.message, "err");
    }
  };

  if (btnImportFromText) btnImportFromText.addEventListener("click", handleImportFromText);

  function parseCombinedTextClient(content) {
    if (!content || typeof content !== "string") {
      return null;
    }
    const normalized = content.replace(/\u0000/g, "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const titlePattern = /(?:^|\n)\s*(?:\[?\s*(?:Titles?|Judul)\s*\]?|(?:Titles?|Judul):?)\s*\n([\s\S]*?)(?=\n\s*(?:\[?\s*(?:Keywords?|Kata\s*Kunci|Tags?)\s*\]?|(?:Keywords?|Kata\s*Kunci|Tags?):?)|$)/i;
    const kwPattern = /(?:^|\n)\s*(?:\[?\s*(?:Keywords?|Kata\s*Kunci|Tags?)\s*\]?|(?:Keywords?|Kata\s*Kunci|Tags?):?)\s*\n([\s\S]*$)/i;

    const titlesMatch = normalized.match(titlePattern);
    const keywordsMatch = normalized.match(kwPattern);

    if (titlesMatch || keywordsMatch) {
      let titleText = titlesMatch ? titlesMatch[1].trim() : "";
      let keywordText = keywordsMatch ? keywordsMatch[1].trim() : "";

      titleText = titleText.split("\n").filter((l) => !isHeaderLineClient(l.trim())).join("\n").trim();
      keywordText = keywordText.split("\n").filter((l) => !isHeaderLineClient(l.trim())).join("\n").trim();

      return { titleText, keywordText };
    }

    const blocks = normalized.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
    if (blocks.length === 2 && !blocks[0].includes(",") && blocks[1].includes(",")) {
      const cleanTitles = blocks[0].split("\n").filter((l) => !isHeaderLineClient(l.trim())).join("\n").trim();
      const cleanKw = blocks[1].split("\n").filter((l) => !isHeaderLineClient(l.trim())).join("\n").trim();
      return { titleText: cleanTitles, keywordText: cleanKw };
    }

    return null;
  }



  const btnExportCombinedFile = document.getElementById("btnExportCombinedFile");
  if (btnExportCombinedFile) {
    btnExportCombinedFile.addEventListener("click", async () => {
      try {
        const res = await fetch(`/api/preset-items/export?preset=${encodeURIComponent(currentPreset)}`);
        const data = await res.json();
        if (data.success && data.combinedText) {
          const blob = new Blob([data.combinedText], { type: "text/plain;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `metadata_${currentPreset}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          log(`1 File .txt gabungan (Titles & Keywords) berhasil diunduh.`, "ok");
        }
      } catch (err) {
        log("Gagal mengunduh berkas gabungan: " + err.message, "err");
      }
    });
  }

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
    const rawVal = titleInput ? titleInput.value : "";
    const parsedComb = parseCombinedTextClient(rawVal);
    let effectiveTitles = rawVal;
    let effectiveKeywords = keywordInput ? keywordInput.value : "";
    if (parsedComb && (parsedComb.titleText || parsedComb.keywordText)) {
      effectiveTitles = parsedComb.titleText;
      effectiveKeywords = parsedComb.keywordText;
    }

    const tLines = effectiveTitles
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (titleLineCount) titleLineCount.textContent = tLines.length;

    const kwRaw = effectiveKeywords.split(/\r?\n/);
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
    if (keywordGroupCount) keywordGroupCount.textContent = kwGroups;
  }

  function triggerLivePreview() {
    updateInputCounters();
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(fetchLivePreview, 300);
  }

  titleInput.addEventListener("input", () => {
    syncTextInputsToCache();
    triggerLivePreview();
  });

  if (keywordInput) {
    keywordInput.addEventListener("input", () => {
      syncTextInputsToCache();
      triggerLivePreview();
    });
  }

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
      // Tampilkan indikator loading di tengah tabel & grid
      previewTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-state">
            <div class="table-loader">
              <div class="table-loader-spinner"></div>
              <div class="table-loader-title font-mono">MEMBACA FILE & METADATA...</div>
              <div class="table-loader-sub font-mono">Memindai folder '${escapeHtml(currentFolder)}/' dan menghitung pemetaan...</div>
            </div>
          </td>
        </tr>
      `;
      gridViewContainer.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1;">
          <div class="table-loader">
            <div class="table-loader-spinner"></div>
            <div class="table-loader-title font-mono">MEMBACA FILE & METADATA...</div>
            <div class="table-loader-sub font-mono">Memindai folder '${escapeHtml(currentFolder)}/' dan menghitung pemetaan...</div>
          </div>
        </div>
      `;
      mappingSummaryBadge.textContent = "MEMBACA...";

      const payload = {
        folder: currentFolder,
        preset: currentPreset,
        titleText: titleInput ? titleInput.value : "",
        keywordText: keywordInput ? keywordInput.value : "",
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
        previewTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state" style="color: var(--red-600);">
              Gagal memuat pratinjau: ${escapeHtml(data.error || "Terjadi kesalahan")}
            </td>
          </tr>
        `;
        mappingSummaryBadge.textContent = "ERROR";
        return;
      }

      fileCountBadge.textContent = `${data.totalFiles} FILE GAMBAR`;
      renderPreview(data);
    } catch (err) {
      log("Gagal mengambil live preview: " + err.message, "err");
      previewTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state" style="color: var(--red-600);">
            Gagal mengambil data: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
      mappingSummaryBadge.textContent = "ERROR";
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

      if (modalExportVectorStatus) {
        modalExportVectorStatus.style.display = "none";
        modalExportVectorStatus.className = "modal-export-status";
        modalExportVectorStatus.textContent = "";
      }
      if (btnModalExportVector) {
        btnModalExportVector.disabled = false;
        btnModalExportVector.textContent = "📐 EXPORT FOTO INI KE VEKTOR SVG";
      }
      if (modalVectorPreset) {
        modalVectorPreset.value = (vectorProfileSelect && vectorProfileSelect.value) || (currentVectorSettings && currentVectorSettings.profile) || "microstock";
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
    modalFormat.textContent = file.isJpeg ? "JPEG (.jpg)" : file.isPng ? "PNG (.png)" : file.isSvg ? "SVG (.svg)" : file.isEps ? "EPS (.eps)" : "Gambar";
    modalExifStatus.textContent = file.exifPresent ? "TERSEDIA (EXIF)" : file.isSvg ? "XML METADATA" : file.isEps ? "DSC/XMP METADATA" : "TIDAK ADA EXIF";

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

  // Copy & Toast helpers
  function showCopyToast(msg, type = "success") {
    if (copyToast) {
      copyToast.textContent = msg;
      copyToast.style.display = "inline-block";
      setTimeout(() => {
        copyToast.style.display = "none";
      }, 2500);
    }
    const gToast = document.getElementById("globalToast");
    if (gToast) {
      gToast.textContent = msg;
      gToast.style.borderLeftColor = type === "error" ? "var(--red-600)" : "var(--emerald-600)";
      gToast.style.display = "block";
      clearTimeout(gToast._timer);
      gToast._timer = setTimeout(() => {
        gToast.style.display = "none";
      }, 3500);
    }
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

      const rawTitle = currentModalData.mappedTitle || (currentModalData.metadata && (currentModalData.metadata.title || currentModalData.metadata.description)) || "";
      const titleToUse = (typeof rawTitle === "string" && rawTitle.trim() && rawTitle !== "-" && rawTitle !== "(tidak ada)" && rawTitle !== "(belum ada judul)") ? rawTitle.trim() : "";
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

  // Single Image Vector Export from Modal Detail Handler
  if (btnModalExportVector) {
    btnModalExportVector.addEventListener("click", async () => {
      if (!currentModalData || !currentModalData.file || !currentModalData.file.fullPath) return;

      const filePath = currentModalData.file.fullPath;
      const fileName = currentModalData.file.name || "Foto";
      const chosenProfile = modalVectorPreset ? modalVectorPreset.value : (currentVectorSettings.profile || "microstock");
      const baseProf = VECTOR_PROFILES_DATA[chosenProfile] || currentVectorSettings;

      btnModalExportVector.disabled = true;
      btnModalExportVector.textContent = "⏳ MENGEKSPOR KE SVG...";
      if (modalExportVectorStatus) {
        modalExportVectorStatus.style.display = "block";
        modalExportVectorStatus.className = "modal-export-status status-loading";
        modalExportVectorStatus.textContent = `Sedang mengonversi ${fileName} ke Vektor SVG (${chosenProfile})...`;
      }

      log(`[VECTOR] Mengekspor foto individual: ${fileName} ke Vektor SVG (Profil: ${chosenProfile})...`, "info");

      const rawTitle = currentModalData.mappedTitle || (currentModalData.metadata && (currentModalData.metadata.title || currentModalData.metadata.description)) || "";
      const titleToUse = (typeof rawTitle === "string" && rawTitle.trim() && rawTitle !== "-" && rawTitle !== "(tidak ada)" && rawTitle !== "(belum ada judul)") ? rawTitle.trim() : "";
      const keywordsToUse = (currentModalData.mappedKeywords && currentModalData.mappedKeywords.length)
        ? currentModalData.mappedKeywords
        : (currentModalData.metadata && currentModalData.metadata.keywords) || [];

      try {
        const payload = {
          folder: currentFolder,
          preset: currentPreset,
          files: [filePath],
          singleTitle: titleToUse,
          singleKeywords: keywordsToUse,
          profile: chosenProfile,
          mode: baseProf.mode || currentVectorSettings.mode,
          hierarchical: baseProf.hierarchical || currentVectorSettings.hierarchical,
          simplify: baseProf.simplify !== undefined ? baseProf.simplify : currentVectorSettings.simplify,
          cornerThreshold: baseProf.cornerThreshold !== undefined ? baseProf.cornerThreshold : currentVectorSettings.cornerThreshold,
          filterSpeckle: baseProf.filterSpeckle !== undefined ? baseProf.filterSpeckle : currentVectorSettings.filterSpeckle,
          colorPrecision: baseProf.colorPrecision !== undefined ? baseProf.colorPrecision : currentVectorSettings.colorPrecision,
          maxColors: baseProf.maxColors !== undefined ? baseProf.maxColors : currentVectorSettings.maxColors,
          embedMetadata: currentVectorSettings.embedMetadata,
          outDir: currentVectorSettings.outDir,
        };

        const res = await fetch("/api/export-vector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!data.success || data.failed > 0) {
          const errMsg = data.error || (data.logs && data.logs.find((l) => l.startsWith("[ERROR]"))) || "Gagal melakukan ekspor vektor";
          if (modalExportVectorStatus) {
            modalExportVectorStatus.className = "modal-export-status status-err";
            modalExportVectorStatus.textContent = `Gagal: ${errMsg}`;
          }
          log(`[ERROR] Ekspor vektor ${fileName} gagal: ${errMsg}`, "err");
        } else {
          const outResult = (data.results && data.results[0]) || {};
          const destName = outResult.destName || (fileName.replace(/\.[^.]+$/, "") + ".svg");
          const sizeFmt = outResult.sizeFmt || "";

          if (modalExportVectorStatus) {
            modalExportVectorStatus.className = "modal-export-status status-ok";
            modalExportVectorStatus.innerHTML = `✓ Berhasil diekspor: <strong>${destName}</strong> ${sizeFmt ? `(${sizeFmt})` : ""}`;
          }
          log(`[OK] Vektor berhasil diekspor: ${destName} ${sizeFmt ? `(${sizeFmt})` : ""}`, "ok");
          showCopyToast(`✓ Berhasil diekspor ke ${destName}`);

          await fetchLivePreview();
          if (tabHistory.classList.contains("active")) {
            loadHistory();
          }
        }
      } catch (err) {
        if (modalExportVectorStatus) {
          modalExportVectorStatus.className = "modal-export-status status-err";
          modalExportVectorStatus.textContent = `Kesalahan: ${err.message}`;
        }
        log(`[ERROR] Ekspor vektor ${fileName} error: ${err.message}`, "err");
      } finally {
        btnModalExportVector.disabled = false;
        btnModalExportVector.textContent = "📐 EXPORT FOTO INI KE VEKTOR SVG";
      }
    });
  }



  if (btnLoadTemplateSample) {
    btnLoadTemplateSample.addEventListener("click", () => {
      titleInput.value = `Titles\nDepressed woman sitting on shower floor curled up in fetal position suffering from anxiety disorder and panic attack\n\nKeywords\nhugging legs, nervous breakdown, running water, wet hair, shower cabin, adult female, emotional distress, mental breakdown, indoor, mental fatigue, postpartum depression, tiled floor, shower floor, hygiene routine, sad female, panic attack, water droplets, depression, body language, suffering, grief, wet skin, emotional pain, psychological stress, solitude, inner turmoil, despair, hopeless, close up, burnout, anxiety disorder, sorrow, mental health, sitting on floor, exhausted woman, sensory overload, crying in shower, life crisis, coping mechanism, loneliness, vulnerable, holding knees, fetal position, curled up, motherhood crisis, bathroom interior, shower tiles, postpartum blues`;
      updateInputCounters();
      syncTextInputsToCache();
      showCopyToast("✓ Berhasil mengisi pola struktur template contoh!");
      log("Memuat struktur template contoh ke editor metadata.", "info");
    });
  }

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
        titleText: titleInput ? titleInput.value : "",
        keywordText: keywordInput ? keywordInput.value : "",
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
        titleText: titleInput ? titleInput.value : "",
        keywordText: keywordInput ? keywordInput.value : "",
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

  async function executeExportVector() {
    if (isExecuting) return;

    const s = currentVectorSettings;
    const pInfo = VECTOR_PROFILES_DATA[s.profile] || { name: "Kustom" };
    const confirmMsg = `Konfirmasi: Konversi seluruh gambar di folder '${currentFolder}' ke Vektor SVG (Profil: ${pInfo.name}, Stacking: ${s.hierarchical}, Node: ${s.simplify}px) dengan menyematkan metadata Dublin Core dari preset '${currentPreset}'?`;
    if (!window.confirm(confirmMsg)) return;

    isExecuting = true;
    setExecutionState(true);
    log(`Memulai konversi Vektor SVG (Profil: ${pInfo.name}, Mode: ${s.mode}, Stacking: ${s.hierarchical}, Node: ${s.simplify}px)...`, "info");

    try {
      const payload = {
        folder: currentFolder,
        preset: currentPreset,
        titleText: titleInput ? titleInput.value : "",
        keywordText: keywordInput ? keywordInput.value : "",
        profile: s.profile,
        mode: s.mode,
        hierarchical: s.hierarchical,
        simplify: s.simplify,
        cornerThreshold: s.cornerThreshold,
        filterSpeckle: s.filterSpeckle,
        colorPrecision: s.colorPrecision,
        maxColors: s.maxColors,
        embedMetadata: s.embedMetadata,
        outDir: s.outDir,
      };

      const res = await fetch("/api/export-vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        log("Export Vektor gagal: " + (data.error || "Terjadi kesalahan"), "err");
      } else {
        if (data.logs && data.logs.length) {
          data.logs.forEach((line) => {
            const isOk = line.startsWith("[OK]");
            const isErr = line.startsWith("[ERROR]");
            log(line, isOk ? "ok" : isErr ? "err" : "info");
          });
        }
        log(
          `Export Vektor Selesai: ${data.processed} berhasil diekspor, ${data.failed} gagal.`,
          data.failed > 0 ? "err" : "ok"
        );
      }

      await fetchLivePreview();
      if (tabHistory.classList.contains("active")) {
        loadHistory();
      }
    } catch (err) {
      log("Kesalahan saat ekspor vektor: " + err.message, "err");
    } finally {
      isExecuting = false;
      setExecutionState(false);
    }
  }

  function setExecutionState(running) {
    btnExecuteAuto.disabled = running;
    if (btnExecuteExportJpeg) btnExecuteExportJpeg.disabled = running;
    if (btnExecuteExportVector) btnExecuteExportVector.disabled = running;
    btnExecuteMeta.disabled = running;
    btnExecuteRename.disabled = running;
    btnExecuteStrip.disabled = running;
    execProgressBadge.style.display = running ? "inline-block" : "none";
  }

  btnExecuteAuto.addEventListener("click", () => executeAction("auto"));
  if (btnExecuteExportJpeg) btnExecuteExportJpeg.addEventListener("click", executeExportJpeg);
  if (btnExecuteExportVector) btnExecuteExportVector.addEventListener("click", executeExportVector);
  btnExecuteMeta.addEventListener("click", () => executeAction("metadata"));
  btnExecuteRename.addEventListener("click", () => executeAction("rename"));
  btnExecuteStrip.addEventListener("click", () => executeAction("strip"));

  // Initial Load
  updateVectorSummaryBadge();
  fetchFolders();
});
