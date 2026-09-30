// app.js: the app's entry point, like main.py
import { renderBooks } from "./books.js";
import { renderLog } from "./log.js";

const tabs = document.querySelectorAll(".tab");
const tabButtons = document.querySelectorAll(".tab-bar button");

function showTab(name) {
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
}

for (const button of tabButtons) {
  button.addEventListener("click", () => showTab(button.dataset.tab));
}

showTab("heatmap");
