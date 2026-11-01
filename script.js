const CHECKLISTS = ["frontend", "backend", "cloud", "data", "devops", "mobile", "security", "aiml"];

// Item totals per checklist. tests/e2e/checklists.spec.js asserts these match the
// rendered pages so the weighted overall progress cannot silently drift.
const CHECKLIST_TOTALS = {
  frontend: 118,
  backend: 63,
  cloud: 44,
  data: 47,
  devops: 46,
  mobile: 47,
  security: 84,
  aiml: 56,
};

document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
  setupEventListeners();
  loadThemePreference();
  restoreSearchState();
});

// localStorage can be unavailable (private mode, blocked cookies, file:// restrictions).
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The dashboard remains usable for the current session.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage availability errors.
  }
}

function readSessionStorage(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Search persistence is optional.
  }
}

function readChecklistStates(checklist) {
  const raw = readStorage(`${checklist}ChecklistStates`);
  if (!raw) return null;

  try {
    const states = JSON.parse(raw);
    return states && typeof states === "object" ? states : null;
  } catch {
    return null;
  }
}

function getChecklistStats(checklist) {
  const states = readChecklistStates(checklist);
  const total = CHECKLIST_TOTALS[checklist] || (states ? Object.keys(states).length : 0);
  const checked = states ? Object.values(states).filter(Boolean).length : 0;
  return {
    progress: total > 0 ? Math.round((checked / total) * 100) : 0,
    checked,
    total,
  };
}

// Initialize dashboard state and load progress.
function initializeDashboard() {
  CHECKLISTS.forEach((checklist) => {
    const stats = getChecklistStats(checklist);
    updateProgressBar(`${checklist}-progress`, stats.progress);
    updateLastUpdated(checklist);
  });

  updateGlobalProgress();
}

// Set up event listeners.
function setupEventListeners() {
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("reset-all").addEventListener("click", resetAllChecklists);
  document.getElementById("search").addEventListener("input", handleSearch);
  document.getElementById("filter-type").addEventListener("change", handleFilter);
  document.getElementById("export-data").addEventListener("click", showExportModal);
  document.getElementById("export-pdf").addEventListener("click", exportToPDF);

  // Export modal events.
  document.querySelectorAll(".export-option").forEach((button) => {
    button.addEventListener("click", handleExport);
  });
  document.querySelector(".modal-close").addEventListener("click", hideExportModal);

  const modal = document.getElementById("export-modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideExportModal();
  });

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("active")) return;

    if (event.key === "Escape") {
      hideExportModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Reflect changes made in another tab (for example, checking items in a checklist).
  window.addEventListener("storage", (event) => {
    if (!event.key) {
      initializeDashboard();
      return;
    }
    if (event.key === "theme") {
      loadThemePreference();
      return;
    }
    if (event.key.endsWith("ChecklistStates") || event.key.endsWith("LastUpdated")) {
      initializeDashboard();
    }
  });

  // Kept for same-document integrations and backwards compatibility.
  window.addEventListener("checklistUpdated", (event) => {
    const checklist = event.detail && event.detail.checklist;
    if (checklist) {
      const stats = getChecklistStats(checklist);
      updateProgressBar(`${checklist}-progress`, stats.progress);
      updateLastUpdated(checklist);
      updateGlobalProgress();
    }
  });
}

// Update one progress bar and its accessible value.
function updateProgressBar(elementId, percentage) {
  const progressFill = document.getElementById(elementId);
  if (!progressFill) return;

  const progressBar = progressFill.closest(".progress-bar");
  const progressText = progressBar ? progressBar.querySelector(".progress-text") : null;

  progressFill.style.width = `${percentage}%`;

  if (progressText) {
    progressText.textContent = `${percentage}%`;
  }
  if (progressBar) {
    progressBar.setAttribute("aria-valuenow", String(percentage));
  }

  // Reset to the default colour so a previously high value cannot leave a stale colour.
  if (percentage >= 80) {
    progressFill.style.backgroundColor = "var(--success-color)";
  } else if (percentage >= 50) {
    progressFill.style.backgroundColor = "var(--warning-color)";
  } else {
    progressFill.style.backgroundColor = "";
  }
}

// Calculate and update global progress.
function getOverallStats() {
  return CHECKLISTS.reduce(
    (totals, checklist) => {
      const stats = getChecklistStats(checklist);
      totals.checked += stats.checked;
      totals.total += stats.total;
      return totals;
    },
    { checked: 0, total: 0 }
  );
}

function getOverallProgress() {
  const { checked, total } = getOverallStats();
  return total > 0 ? Math.round((checked / total) * 100) : 0;
}

function updateGlobalProgress() {
  updateProgressBar("global-progress-fill", getOverallProgress());
}

// Update the "last updated" timestamp shown in each card.
function updateLastUpdated(checklist) {
  const timestamp = readStorage(`${checklist}LastUpdated`);
  const card = document.querySelector(`[data-checklist="${checklist}"]`);
  if (!card) return;

  const timeElement = card.querySelector(".update-time");
  if (!timeElement) return;

  const date = timestamp ? new Date(timestamp) : null;
  if (date && !Number.isNaN(date.getTime())) {
    timeElement.textContent = `Updated ${date.toLocaleString()}`;
    timeElement.setAttribute("datetime", date.toISOString());
  } else {
    timeElement.textContent = "Not started";
    timeElement.removeAttribute("datetime");
  }
}

// Search and priority filtering.
function handleSearch(event) {
  const searchTerm = event.target.value;
  writeSessionStorage("dashboardSearch", searchTerm);
  filterCards(searchTerm.toLowerCase(), document.getElementById("filter-type").value);
}

function handleFilter(event) {
  writeSessionStorage("dashboardFilter", event.target.value);
  filterCards(document.getElementById("search").value.toLowerCase(), event.target.value);
}

function filterCards(searchTerm, filterType) {
  const cards = document.querySelectorAll(".checklist-card");
  let visibleCount = 0;

  cards.forEach((card) => {
    const title = card.querySelector("h2").textContent.toLowerCase();
    const description = card.querySelector("p").textContent.toLowerCase();
    const priority = card.querySelector(".priority-badge").textContent.toLowerCase();

    const matchesSearch =
      title.includes(searchTerm) ||
      description.includes(searchTerm) ||
      priority.includes(searchTerm);

    const matchesFilter = filterType === "all" || priority.includes(filterType);

    const isVisible = matchesSearch && matchesFilter;
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  const emptyState = document.getElementById("search-empty");
  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

function restoreSearchState() {
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter-type");
  const savedSearch = readSessionStorage("dashboardSearch") || "";
  const savedFilter = readSessionStorage("dashboardFilter") || "all";

  searchInput.value = savedSearch;
  filterSelect.value = savedFilter;

  if (savedSearch || savedFilter !== "all") {
    filterCards(savedSearch.toLowerCase(), savedFilter);
  }
}

// Theme handling.
function toggleTheme() {
  const isDark = document.body.getAttribute("data-theme") === "dark";
  const nextTheme = isDark ? "light" : "dark";
  applyTheme(nextTheme);
  writeStorage("theme", nextTheme);
}

function loadThemePreference() {
  const storedTheme = readStorage("theme");
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme || (prefersDark ? "dark" : "light"));
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);

  const themeButton = document.getElementById("theme-toggle");
  if (!themeButton) return;

  const isDark = theme === "dark";
  const icon = themeButton.querySelector("span");
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (icon) icon.textContent = isDark ? "☀️" : "🌙";
  themeButton.setAttribute("aria-label", label);
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.setAttribute("title", label);
}

// Export modal.
let modalReturnFocus = null;

function showExportModal() {
  const modal = document.getElementById("export-modal");
  modalReturnFocus = document.activeElement;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const firstOption = modal.querySelector(".export-option");
  if (firstOption) firstOption.focus();
}

function hideExportModal() {
  const modal = document.getElementById("export-modal");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
    modalReturnFocus.focus();
  }
}

function handleExport(event) {
  const format = event.currentTarget.dataset.format;
  switch (format) {
    case "pdf":
      exportToPDF();
      break;
    case "json":
      exportToJSON();
      break;
    case "csv":
      exportToCSV();
      break;
  }
  hideExportModal();
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function exportToPDF() {
  hideExportModal();
  // The print stylesheet removes interactive controls, so the browser's
  // "Save as PDF" destination produces a clean dashboard report.
  window.print();
}

function buildExportData() {
  const progress = {};
  const counts = {};

  CHECKLISTS.forEach((checklist) => {
    const stats = getChecklistStats(checklist);
    progress[checklist] = stats.progress;
    counts[checklist] = { checked: stats.checked, total: stats.total };
  });

  return {
    timestamp: new Date().toISOString(),
    overallProgress: getOverallProgress(),
    progress,
    counts,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportToJSON() {
  const blob = new Blob([JSON.stringify(buildExportData(), null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `checklist-export-${safeTimestamp()}.json`);
}

function exportToCSV() {
  const data = buildExportData();
  const headers = ["Checklist", "Progress", "Checked", "Total"];
  const rows = CHECKLISTS.map((checklist) => [
    checklist,
    data.progress[checklist],
    data.counts[checklist].checked,
    data.counts[checklist].total,
  ]);

  // Quote every cell so future labels containing commas remain valid CSV.
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `checklist-export-${safeTimestamp()}.csv`);
}

// Reset all checklists.
function resetAllChecklists() {
  if (!confirm("Are you sure you want to reset all checklists? This cannot be undone.")) {
    return;
  }

  CHECKLISTS.forEach((checklist) => {
    removeStorage(`${checklist}ChecklistStates`);
    removeStorage(`${checklist}LastUpdated`);
    updateProgressBar(`${checklist}-progress`, 0);
    updateLastUpdated(checklist);
  });

  updateGlobalProgress();
}
