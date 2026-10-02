// app.js: the app's entry point, like main.py
import { renderBooks } from "./books.js";
import { renderLog } from "./log.js";
import { renderHeatmap } from "./heatmap.js";
import "./backup.js";
import "./sync.js";
import { APP_VERSION } from "./version.js";
import { showToast } from "./toast.js";

const tabs = document.querySelectorAll(".tab");
const tabButtons = document.querySelectorAll(".tab-bar button");
let currentTab = "heatmap";

function showTab(name) {
  currentTab = name;

  // Show the matching <section>, hide the others
  for (const tab of tabs) {
    tab.hidden = tab.id !== `tab-${name}`;
  }

  // Highlight the matching button, un-highlight the others
  for (const button of tabButtons) {
  const isMatch = button.dataset.tab === name;
  button.classList.toggle("active", isMatch);
}

  if (name === "books") renderBooks();
  if (name === "log") renderLog();
  if (name === "heatmap") renderHeatmap();
}

for (const button of tabButtons) {
  button.addEventListener("click", () => showTab(button.dataset.tab));
}

// Redraw the current tab when sync brings in new data
window.addEventListener("datachange", () => showTab(currentTab));

showTab("heatmap");

// Show the current version on every launch
showToast(`Reading Tracker v${APP_VERSION}`);


if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
