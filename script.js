document.addEventListener("DOMContentLoaded", () => {
  // Initialize the dashboard
  initializeDashboard();
  setupEventListeners();
  loadThemePreference();
});

// Initialize dashboard state and load progress
function initializeDashboard() {
  const checklists = [
    "frontend",
    "backend",
    "cloud",
    "data",
    "devops",
    "mobile",
    "security",
    "aiml",
  ];

  // Load progress for each checklist
  checklists.forEach((checklist) => {
    const progress = loadChecklistProgress(checklist);
    updateProgressBar(`${checklist}-progress`, progress);
    updateLastUpdated(checklist);
  });

  // Update global progress and stats
  updateGlobalProgress();
  updateStats();
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("reset-all").addEventListener("click", resetAllChecklists);
  document.getElementById("search").addEventListener("input", handleSearch);
  document.getElementById("filter-type").addEventListener("change", handleFilter);
  document.getElementById("export-data").addEventListener("click", showExportModal);
  document.getElementById("export-pdf").addEventListener("click", exportToPDF);

  // Export modal events
  document.querySelectorAll(".export-option").forEach((button) => {
    button.addEventListener("click", handleExport);
  });
  document.querySelector(".modal-close").addEventListener("click", hideExportModal);
}

// Load checklist progress
function loadChecklistProgress(checklist) {
  const storageKey = `${checklist}ChecklistStates`;
  const states = JSON.parse(localStorage.getItem(storageKey));

  if (!states) return 0;

  const total = Object.keys(states).length;
  const checked = Object.values(states).filter((state) => state).length;

  return total > 0 ? Math.round((checked / total) * 100) : 0;
}

// Update progress bar UI
function updateProgressBar(elementId, percentage) {
  const progressBar = document.getElementById(elementId);
  if (!progressBar) return;

  const progressFill = progressBar;
  const progressText = progressBar.nextElementSibling;

  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `${percentage}%`;

  // Update color based on progress
  if (percentage >= 80) {
    progressFill.style.backgroundColor = "var(--success-color)";
  } else if (percentage >= 50) {
    progressFill.style.backgroundColor = "var(--warning-color)";
  }
}

// Calculate and update global progress
function updateGlobalProgress() {
  const checklists = [
    "frontend",
    "backend",
    "cloud",
    "data",
    "devops",
    "mobile",
    "security",
    "aiml",
  ];
  let totalProgress = 0;

  checklists.forEach((checklist) => {
    totalProgress += loadChecklistProgress(checklist);
  });

  const globalProgress = Math.round(totalProgress / checklists.length);
  updateProgressBar("global-progress-fill", globalProgress);
  document.getElementById("global-progress-text").textContent = `${globalProgress}%`;
}

// Update statistics
function updateStats() {
  const checklists = [
    "frontend",
    "backend",
    "cloud",
    "data",
    "devops",
    "mobile",
    "security",
    "aiml",
  ];
  let totalItems = 0;
  let completedItems = 0;
  let criticalItems = 0;

  checklists.forEach((checklist) => {
    const states = JSON.parse(localStorage.getItem(`${checklist}ChecklistStates`)) || {};
    const items = Object.keys(states).length;
    totalItems += items;
    completedItems += Object.values(states).filter((state) => state).length;
    // Assuming critical items are marked in the data structure
    criticalItems += Object.entries(states).filter(
      ([key, value]) => key.includes("critical") && !value
    ).length;
  });

  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("completed-items").textContent = completedItems;
  document.getElementById("critical-items").textContent = criticalItems;
}

// Handle search functionality
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const filterType = document.getElementById("filter-type").value;
  filterCards(searchTerm, filterType);
}

// Handle filter functionality
function handleFilter(event) {
  const filterType = event.target.value;
  const searchTerm = document.getElementById("search").value.toLowerCase();
  filterCards(searchTerm, filterType);
}

// Filter cards based on search and filter criteria
function filterCards(searchTerm, filterType) {
  const cards = document.querySelectorAll(".checklist-card");

  cards.forEach((card) => {
    const title = card.querySelector("h2").textContent.toLowerCase();
    const description = card.querySelector("p").textContent.toLowerCase();
    const priority = card.querySelector(".priority-badge").textContent.toLowerCase();

    const matchesSearch =
      title.includes(searchTerm) ||
      description.includes(searchTerm) ||
      priority.includes(searchTerm);

    const matchesFilter =
      filterType === "all" ||
      (filterType === "required" && priority.includes("high")) ||
      (filterType === "suggested" && priority.includes("medium"));

    card.style.display = matchesSearch && matchesFilter ? "block" : "none";
  });
}

// Theme toggle functionality
function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute("data-theme") === "dark";
  body.setAttribute("data-theme", isDark ? "light" : "dark");
  localStorage.setItem("theme", isDark ? "light" : "dark");

  const themeIcon = document.querySelector("#theme-toggle span");
  themeIcon.textContent = isDark ? "🌙" : "☀️";
}

// Load theme preference
function loadThemePreference() {
  const theme = localStorage.getItem("theme") || "light";
  document.body.setAttribute("data-theme", theme);
  const themeIcon = document.querySelector("#theme-toggle span");
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

// Export functionality
function showExportModal() {
  document.getElementById("export-modal").classList.add("active");
}

function hideExportModal() {
  document.getElementById("export-modal").classList.remove("active");
}

function handleExport(event) {
  const format = event.target.dataset.format;
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

function exportToPDF() {
  // Implement PDF export functionality
  console.log("PDF export not implemented");
}

function exportToJSON() {
  const data = {
    timestamp: new Date().toISOString(),
    progress: {
      frontend: loadChecklistProgress("frontend"),
      backend: loadChecklistProgress("backend"),
      cloud: loadChecklistProgress("cloud"),
      data: loadChecklistProgress("data"),
      devops: loadChecklistProgress("devops"),
      mobile: loadChecklistProgress("mobile"),
      security: loadChecklistProgress("security"),
      aiml: loadChecklistProgress("aiml"),
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `checklist-export-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToCSV() {
  const checklists = [
    "frontend",
    "backend",
    "cloud",
    "data",
    "devops",
    "mobile",
    "security",
    "aiml",
  ];
  const headers = ["Checklist", "Progress"];
  const rows = checklists.map((checklist) => [checklist, loadChecklistProgress(checklist)]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `checklist-export-${new Date().toISOString()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Update last updated timestamp
function updateLastUpdated(checklist) {
  const timestamp = localStorage.getItem(`${checklist}LastUpdated`) || new Date().toISOString();
  const card = document.querySelector(`[data-checklist="${checklist}"]`);
  if (card) {
    const timeElement = card.querySelector(".update-time");
    timeElement.textContent = new Date(timestamp).toLocaleString();
  }
}

// Reset all checklists
function resetAllChecklists() {
  if (!confirm("Are you sure you want to reset all checklists? This cannot be undone.")) {
    return;
  }

  const checklists = [
    "frontend",
    "backend",
    "cloud",
    "data",
    "devops",
    "mobile",
    "security",
    "aiml",
  ];

  checklists.forEach((checklist) => {
    localStorage.removeItem(`${checklist}ChecklistStates`);
    localStorage.removeItem(`${checklist}LastUpdated`);
    updateProgressBar(`${checklist}-progress`, 0);
    updateLastUpdated(checklist);
  });

  updateGlobalProgress();
  updateStats();
}

// Listen for storage changes from other checklist pages
window.addEventListener("storage", (event) => {
  if (event.key && event.key.endsWith("ChecklistStates")) {
    const checklist = event.key.replace("ChecklistStates", "");
    const progress = loadChecklistProgress(checklist);
    updateProgressBar(`${checklist}-progress`, progress);
    updateGlobalProgress();
    updateStats();
    updateLastUpdated(checklist);
  }
});
