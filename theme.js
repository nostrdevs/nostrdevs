// Apply saved theme immediately to prevent flash
(function () {
  var theme = localStorage.getItem("nostrdevs-theme");
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
})();

// Add toggle button after DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  var nav = document.querySelector(".Header-nav");
  if (!nav) return;

  var btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.setAttribute("aria-label", "Toggle dark mode");
  btn.innerHTML =
    '<svg class="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
    '<svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  // Insert before the GitHub link (last child)
  nav.insertBefore(btn, nav.lastElementChild);

  btn.addEventListener("click", function () {
    var isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("nostrdevs-theme", isDark ? "dark" : "light");
  });
});
