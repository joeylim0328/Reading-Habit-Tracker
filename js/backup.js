// backup.js: export and import a JSON backup file
import { exportData, importData } from "./storage.js";
import { todayString } from "./dates.js";

const exportButton = document.querySelector("#export-button");
const importButton = document.querySelector("#import-button");
const fileInput = document.querySelector("#import-file");

exportButton.addEventListener("click", () => {
  const file = new Blob([exportData()], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reading-tracker-${todayString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

importButton.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;
  if (!confirm("Importing will replace ALL your current books and logs. Continue?")) return;
  try {
    importData(await file.text());
    alert("Backup restored!");
    location.reload();
  } catch (error) {
    alert(`Could not import this file. ${error.message}`);
  }
});
