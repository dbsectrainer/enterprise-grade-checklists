document.addEventListener("DOMContentLoaded", () => {
    // Handle reset button click
    document.getElementById("reset-checklist").addEventListener("click", () => {
        if (confirm("Are you sure you want to reset all checklist items? This cannot be undone.")) {
            // Clear localStorage for this checklist
            localStorage.removeItem("cloudChecklistStates");
            localStorage.removeItem("cloudLastUpdated");
            
            // Uncheck all checkboxes and reset backgrounds
            document.querySelectorAll(".checkbox").forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest(".checklist-item").style.backgroundColor = "#f8f9fa";
            });
            
            // Close any open details
            document.querySelectorAll(".details.active").forEach(detail => {
                detail.classList.remove("active");
                detail.previousElementSibling.textContent = "ⓘ";
                detail.previousElementSibling.setAttribute("aria-label", "Show details");
            });
            
            // Update progress
            updateProgress();
        }
    });

    // Handle expand button clicks
    document.querySelectorAll(".expand-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Close any other open details first
            document.querySelectorAll(".details.active").forEach(detail => {
                if (detail !== button.nextElementSibling) {
                    detail.classList.remove("active");
                    detail.previousElementSibling.textContent = "ⓘ";
                }
            });
            
            const details = button.nextElementSibling;
            details.classList.toggle("active");
            
            // Update button text to indicate state
            button.textContent = details.classList.contains("active") ? "×" : "ⓘ";
            button.setAttribute("aria-label", 
                details.classList.contains("active") ? "Hide details" : "Show details"
            );
        });
    });

    // Close details when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".expand-btn") && !e.target.closest(".details")) {
            document.querySelectorAll(".details.active").forEach(detail => {
                detail.classList.remove("active");
                detail.previousElementSibling.textContent = "ⓘ";
                detail.previousElementSibling.setAttribute("aria-label", "Show details");
            });
        }
    });

    // Handle checkbox changes
    document.querySelectorAll(".checkbox").forEach(checkbox => {
        checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            const item = checkbox.closest(".checklist-item");
            if (checkbox.checked) {
                item.style.backgroundColor = "#e8f5e9";  // Light green background when checked
            } else {
                item.style.backgroundColor = "#f8f9fa";  // Reset to original background
            }
            saveCheckboxStates();
            updateProgress();
        });
    });

    // Save checkbox states to localStorage
    function saveCheckboxStates() {
        const states = {};
        document.querySelectorAll(".checkbox").forEach((checkbox, index) => {
            states[index] = checkbox.checked;
        });
        localStorage.setItem("cloudChecklistStates", JSON.stringify(states));
        
        // Update last updated timestamp
        const timestamp = new Date().toISOString();
        localStorage.setItem("cloudLastUpdated", timestamp);

        // Trigger storage event for dashboard update
        const event = new Event("storage");
        event.key = "cloudChecklistStates";
        window.dispatchEvent(event);
    }

    // Load checkbox states from localStorage
    function loadCheckboxStates() {
        const states = JSON.parse(localStorage.getItem("cloudChecklistStates"));
        if (states) {
            document.querySelectorAll(".checkbox").forEach((checkbox, index) => {
                checkbox.checked = states[index];
                // Update background color for checked items
                if (states[index]) {
                    checkbox.closest(".checklist-item").style.backgroundColor = "#e8f5e9";
                }
            });
        }
    }

    // Add keyboard navigation
    document.querySelectorAll(".expand-btn").forEach(button => {
        button.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                button.click();
            }
            // Close on Escape key
            if (e.key === "Escape") {
                const details = button.nextElementSibling;
                if (details.classList.contains("active")) {
                    details.classList.remove("active");
                    button.textContent = "ⓘ";
                    button.setAttribute("aria-label", "Show details");
                }
            }
        });
    });

    // Calculate and display progress
    function updateProgress() {
        const sections = document.querySelectorAll(".section");
        
        sections.forEach(section => {
            const total = section.querySelectorAll(".checkbox").length;
            const checked = section.querySelectorAll(".checkbox:checked").length;
            const title = section.querySelector("h2");
            
            if (total > 0) {
                const percentage = Math.round((checked / total) * 100);
                title.setAttribute("data-progress", `${percentage}%`);
            }
        });
    }

    // Initial setup
    loadCheckboxStates();
    updateProgress();
});
