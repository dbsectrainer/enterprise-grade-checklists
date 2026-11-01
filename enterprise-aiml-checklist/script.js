document.addEventListener("DOMContentLoaded", () => {
  const CHECKLIST_KEY = "aiml";
  const STORAGE_KEY = `${CHECKLIST_KEY}ChecklistStates`;
  const UPDATED_KEY = `${CHECKLIST_KEY}LastUpdated`;

  const expandButtons = Array.from(document.querySelectorAll(".expand-btn"));

  // Give each details panel a stable id and expose its state to assistive technology.
  expandButtons.forEach((button, index) => {
    const details = button.nextElementSibling;
    if (!details || !details.classList.contains("details")) return;
    if (!details.id) {
      details.id = `${CHECKLIST_KEY}-details-${index + 1}`;
    }
    button.setAttribute("aria-controls", details.id);
    button.setAttribute("aria-expanded", "false");
  });

  function setExpanded(button, expanded) {
    const details = button.nextElementSibling;
    if (!details || !details.classList.contains("details")) return;

    details.classList.toggle("active", expanded);
    button.textContent = expanded ? "×" : "ⓘ";
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", expanded ? "Hide details" : "Show details");
  }

  function closeAllDetails(except = null) {
    document.querySelectorAll(".details.active").forEach((details) => {
      if (details === except) return;
      const button = details.previousElementSibling;
      if (button && button.classList.contains("expand-btn")) {
        setExpanded(button, false);
      } else {
        details.classList.remove("active");
      }
    });
  }

  function notifyDashboard() {
    window.dispatchEvent(
      new CustomEvent("checklistUpdated", {
        detail: { checklist: CHECKLIST_KEY },
      })
    );
  }

  // Reset the checklist and persisted state.
  const resetButton = document.getElementById("reset-checklist");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (!confirm("Are you sure you want to reset all checklist items? This cannot be undone.")) {
        return;
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(UPDATED_KEY);
      } catch {
        // Storage can be unavailable (private mode, blocked cookies); the UI still resets.
      }

      document.querySelectorAll(".checkbox").forEach((checkbox) => {
        checkbox.checked = false;
        const item = checkbox.closest(".checklist-item");
        if (item) item.classList.remove("checked");
      });

      closeAllDetails();
      updateProgress();
      notifyDashboard();
    });
  }

  // Expand/collapse details. The button is native, so Enter and Space work without a
  // custom key handler (a duplicated handler would toggle twice).
  expandButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const details = button.nextElementSibling;
      if (!details || !details.classList.contains("details")) return;

      if (details.classList.contains("active")) {
        setExpanded(button, false);
        return;
      }

      closeAllDetails(details);
      setExpanded(button, true);
    });
  });

  // Close open panels when clicking outside the panel or its toggle.
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".expand-btn") && !event.target.closest(".details")) {
      closeAllDetails();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllDetails();
    }
  });

  // Persist checkbox state and keep the dashboard in sync.
  function saveCheckboxStates() {
    const states = {};
    document.querySelectorAll(".checkbox").forEach((checkbox, index) => {
      states[index] = checkbox.checked;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
      localStorage.setItem(UPDATED_KEY, new Date().toISOString());
    } catch {
      // Storage can be unavailable; the current session still reflects the changes.
    }

    notifyDashboard();
  }

  function loadCheckboxStates() {
    let states = null;
    try {
      states = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      states = null;
    }

    const hasStates = states && typeof states === "object";
    document.querySelectorAll(".checkbox").forEach((checkbox, index) => {
      checkbox.checked = hasStates ? Boolean(states[index]) : false;
      const item = checkbox.closest(".checklist-item");
      if (item) item.classList.toggle("checked", checkbox.checked);
    });
  }

  // Keep another open tab in sync when this checklist is changed or reset elsewhere.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== UPDATED_KEY && event.key !== null) return;
    loadCheckboxStates();
    updateProgress();
  });

  // Apply checkbox interaction and persistence.
  document.querySelectorAll(".checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const item = checkbox.closest(".checklist-item");
      if (item) item.classList.toggle("checked", checkbox.checked);
      saveCheckboxStates();
      updateProgress();
    });
  });

  // Calculate and display progress for each section.
  function updateProgress() {
    document.querySelectorAll(".section").forEach((section) => {
      const total = section.querySelectorAll(".checkbox").length;
      const checked = section.querySelectorAll(".checkbox:checked").length;
      const title = section.querySelector("h2");

      if (!title || total === 0) return;

      const percentage = Math.round((checked / total) * 100);
      let badge = title.querySelector(".section-progress");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "section-progress";
        title.appendChild(badge);
      }

      badge.textContent = `${checked}/${total} · ${percentage}%`;
      title.setAttribute("data-progress", `${percentage}%`);
    });
  }

  // Initial setup
  loadCheckboxStates();
  updateProgress();
});
