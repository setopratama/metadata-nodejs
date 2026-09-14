// IMGMETA Web UI Frontend Client Logic
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const folderSelect = document.getElementById("folderSelect");
  const btnRefreshFolders = document.getElementById("btnRefreshFolders");
  const fileCountBadge = document.getElementById("fileCountBadge");
  const folderPathText = document.getElementById("folderPathText");

  // Main Tabs
  const tabTitles = document.getElementById("tabTitles");
  const tabKeywords = document.getElementById("tabKeywords");
  const paneTitles = document.getElementById("paneTitles");
  const paneKeywords = document.getElementById("paneKeywords");

  // Textarea Inputs & Counters
  const titleInput = document.getElementById("titleInput");
  const keywordInput = document.getElementById("keywordInput");
  const titleLineCount = document.getElementById("titleLineCount");
  const keywordGroupCount = document.getElementById("keywordGroupCount");
  const btnLoadTitles = document.getElementById("btnLoadTitles");
  const btnSaveTitles = document.getElementById("btnSaveTitles");
  const btnLoadKeywords = document.getElementById("btnLoadKeywords");
  const btnSaveKeywords = document.getElementById("btnSaveKeywords");

  // Options & Actions
  const chkNoBackup = document.getElementById("chkNoBackup");
  const templateInput = document.getElementById("templateInput");
  const btnExecuteAuto = document.getElementById("btnExecuteAuto");
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

  // State
  let currentFolder = "foto";
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

  // Tab switching
  tabTitles.addEventListener("click", () => {
    tabTitles.classList.add("active");
    tabKeywords.classList.remove("active");
    paneTitles.classList.add("active");
    paneKeywords.classList.remove("active");
  });

  tabKeywords.addEventListener("click", () => {
    tabKeywords.classList.add("active");
    tabTitles.classList.remove("active");
    paneKeywords.classList.add("active");
    paneTitles.classList.remove("active");
  });

  // View toggle
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

  // Clear logs
  btnClearLogs.addEventListener("click", () => {
    terminalOutput.innerHTML = "";
    log("Log terminal dibersihkan.", "info");
  });

  // Count titles & keywords
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

  // Debounced Live Preview
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
        await fetchInputsAndFiles();
      }
    } catch (err) {
      log("Gagal memuat daftar folder: " + err.message, "err");
    }
  }

  folderSelect.addEventListener("change", () => {
    currentFolder = folderSelect.value;
    folderPathText.textContent = currentFolder + "/";
    fetchInputsAndFiles();
  });

  btnRefreshFolders.addEventListener("click", () => {
    log("Memperbarui daftar folder dan file...", "info");
    fetchFolders();
  });

  // Fetch initial inputs and files
  async function fetchInputsAndFiles() {
    try {
      // 1. Fetch Inputs
      const inRes = await fetch(`/api/inputs?folder=${encodeURIComponent(currentFolder)}`);
      const inData = await inRes.json();
      if (inData.success) {
        if (inData.titleText) titleInput.value = inData.titleText;
        if (inData.keywordText) keywordInput.value = inData.keywordText;
        updateInputCounters();
      }

      // 2. Trigger preview
      await fetchLivePreview();
    } catch (err) {
      log("Gagal memuat data: " + err.message, "err");
    }
  }

  // Fetch Live Preview
  async function fetchLivePreview() {
    try {
      const payload = {
        folder: currentFolder,
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
      const nameClass = item.isNameChanged ? "badge-changed" : "";

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

      tr.innerHTML = `
        <td class="font-mono text-muted">${item.index}</td>
        <td>
          <div class="thumb-cell" data-file="${encodeURIComponent(item.filePath)}" title="Klik untuk lihat detail metadata">
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
          <div class="text-truncate font-mono ${nameClass}" title="${item.plannedName}">
            ${item.plannedName}
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
          <button class="btn-xs btn-secondary btn-inspect" data-file="${encodeURIComponent(item.filePath)}">DETAIL</button>
        </td>
      `;
      previewTableBody.appendChild(tr);

      // Card for Grid
      const card = document.createElement("div");
      card.className = "grid-card-item";
      card.innerHTML = `
        <img src="${thumbUrl}" alt="Thumb" class="grid-card-img" loading="lazy" data-file="${encodeURIComponent(item.filePath)}">
        <div class="grid-card-meta font-mono">
          <div style="display: flex; justify-content: space-between;">
            <span class="text-muted">#${item.index}</span>
            <span class="badge ${item.status === "READY" ? "badge-ready" : "badge-skipped"}">${item.status}</span>
          </div>
          <div class="text-truncate" style="font-weight: 600;" title="${item.currentName}">${item.currentName}</div>
          <div class="file-sub-meta font-mono text-muted" title="Dimensi: ${item.dims || "-"} | Ukuran: ${item.sizeFmt || "-"}">
            <span>${item.dims || "-"}</span> • <span>${item.sizeFmt || "-"}</span>
          </div>
          <div class="text-truncate ${nameClass}" title="${item.plannedName}">↳ ${item.plannedName}</div>
          <div class="text-truncate text-muted" style="font-size: 0.7rem;" title="${item.mappedTitle}">${item.mappedTitle}</div>
          <div class="grid-card-actions">
            ${gridTagBadgeHtml}
            <button class="btn-xs btn-secondary btn-inspect" data-file="${encodeURIComponent(item.filePath)}">DETAIL</button>
          </div>
        </div>
      `;
      gridViewContainer.appendChild(card);
    });

    mappingSummaryBadge.textContent = `READY: ${readyCount} / ${items.length}`;

    // Attach click listeners for inspect
    document.querySelectorAll(".btn-inspect, .thumb-cell, .grid-card-img").forEach((el) => {
      el.addEventListener("click", (e) => {
        const filePath = decodeURIComponent(el.getAttribute("data-file"));
        if (filePath) openMetadataModal(filePath);
      });
    });
  }

  // Metadata Inspector Modal Functions
  async function openMetadataModal(filePath) {
    try {
      metaDetailModal.style.display = "flex";
      modalFileName.textContent = "Memuat metadata...";
      modalThumbImg.src = `/api/thumb?file=${encodeURIComponent(filePath)}`;
      setModalTab("summary");

      const res = await fetch(`/api/meta-detail?file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!data.success) {
        modalFileName.textContent = "Gagal memuat metadata";
        return;
      }

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

  // Save / Load Handlers
  btnSaveTitles.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/save-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: currentFolder,
          titleText: titleInput.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        log("Daftar judul berhasil disimpan ke title.txt.", "ok");
      }
    } catch (err) {
      log("Gagal menyimpan title.txt: " + err.message, "err");
    }
  });

  btnSaveKeywords.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/save-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: currentFolder,
          keywordText: keywordInput.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        log("Daftar kata kunci berhasil disimpan ke keyword.txt.", "ok");
      }
    } catch (err) {
      log("Gagal menyimpan keyword.txt: " + err.message, "err");
    }
  });

  btnLoadTitles.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/inputs?folder=${encodeURIComponent(currentFolder)}`);
      const data = await res.json();
      if (data.success && data.titleText) {
        titleInput.value = data.titleText;
        triggerLivePreview();
        log("Daftar judul dimuat ulang dari " + data.titlePath, "info");
      }
    } catch (err) {
      log("Gagal memuat judul: " + err.message, "err");
    }
  });

  btnLoadKeywords.addEventListener("click", async () => {
    try {
      const res = await fetch(`/api/inputs?folder=${encodeURIComponent(currentFolder)}`);
      const data = await res.json();
      if (data.success && data.keywordText) {
        keywordInput.value = data.keywordText;
        triggerLivePreview();
        log("Daftar kata kunci dimuat ulang dari " + data.keywordPath, "info");
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

    const confirmMsg = `Konfirmasi: Jalankan '${actionLabels[action]}' pada folder '${currentFolder}'?`;
    if (!window.confirm(confirmMsg)) return;

    isExecuting = true;
    setExecutionState(true);
    log(`Memulai ${actionLabels[action]}...`, "info");

    try {
      const payload = {
        action,
        folder: currentFolder,
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

      // Refresh data & preview
      await fetchInputsAndFiles();
    } catch (err) {
      log("Kesalahan saat menjalankan eksekusi: " + err.message, "err");
    } finally {
      isExecuting = false;
      setExecutionState(false);
    }
  }

  function setExecutionState(running) {
    btnExecuteAuto.disabled = running;
    btnExecuteMeta.disabled = running;
    btnExecuteRename.disabled = running;
    btnExecuteStrip.disabled = running;
    execProgressBadge.style.display = running ? "inline-block" : "none";
  }

  btnExecuteAuto.addEventListener("click", () => executeAction("auto"));
  btnExecuteMeta.addEventListener("click", () => executeAction("metadata"));
  btnExecuteRename.addEventListener("click", () => executeAction("rename"));
  btnExecuteStrip.addEventListener("click", () => executeAction("strip"));

  // Initial Load
  fetchFolders();
});
