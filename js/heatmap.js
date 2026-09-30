// heatmap.js: the Heatmap tab (monthly calendar colored by pages read)
import { getBook, getEntries, pagesByDate } from "./storage.js";
import { toDateString, todayString, formatDate } from "./dates.js";
import { setLogDate } from "./log.js";

const summary = document.querySelector("#heatmap-summary");
const monthLabel = document.querySelector("#month-label");
const prevButton = document.querySelector("#prev-month");
const nextButton = document.querySelector("#next-month");
const calendar = document.querySelector("#calendar");
const details = document.querySelector("#day-details");
const detailsTitle = document.querySelector("#day-details-title");
const detailsList = document.querySelector("#day-details-list");
const logForDayButton = document.querySelector("#log-for-day");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let displayYear = new Date().getFullYear();
let displayMonth = new Date().getMonth(); // 0 = January, like getMonth()
let selectedDate = null;

// Turns a number of pages into a color level: 0 pages -> 0, 1-20 -> 1, 21-50 -> 2, 51-70 -> 3, 71+ -> 4
function pagesToLevel(pages) {
  if (pages === 0) return 0;
  if (pages <= 20) return 1;
  if (pages <= 50) return 2;
  if (pages <= 70) return 3;
  return 4;
}

// "2026-09" for the month being displayed
function displayMonthKey() {
  return toDateString(new Date(displayYear, displayMonth, 1)).slice(0, 7);
}

function currentStreak(totals) {
  const day = new Date();
  if (!totals[toDateString(day)]) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (totals[toDateString(day)]) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

function renderSummary(totals) {
  const monthKey = displayMonthKey();
  let monthPages = 0;
  let daysRead = 0;
  for (const [date, pages] of Object.entries(totals)) {
    if (date.startsWith(monthKey)) {
      monthPages += pages;
      daysRead += 1;
    }
  }
  const monthName = new Date(displayYear, displayMonth, 1).toLocaleDateString(undefined, { month: "long" });
  const streak = currentStreak(totals);
  summary.textContent =
    `${monthPages} pages over ${daysRead} days in ${monthName} · Current streak: ${streak} ${streak === 1 ? "day" : "days"}`;
}

function renderCalendar(totals) {
  const today = todayString();
  const firstWeekday = new Date(displayYear, displayMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  const cells = DAY_NAMES.map((name) => {
    const header = document.createElement("div");
    header.className = "day-name";
    header.textContent = name;
    return header;
  });

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toDateString(new Date(displayYear, displayMonth, day));
    const pages = totals[dateStr] || 0;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `day level-${pagesToLevel(pages)}`;
    cell.textContent = day;
    cell.title = `${formatDate(dateStr)}: ${pages} pages`;
    cell.classList.toggle("today", dateStr === today);
    cell.classList.toggle("selected", dateStr === selectedDate);
    cell.disabled = dateStr > today;
    cell.addEventListener("click", () => {
      selectedDate = dateStr;
      renderHeatmap();
    });
    cells.push(cell);
  }

  calendar.replaceChildren(...cells);
}

function renderDayDetails() {
  details.hidden = !selectedDate;
  if (!selectedDate) return;

  detailsTitle.textContent = formatDate(selectedDate);
  const items = getEntries()
    .filter((entry) => entry.date === selectedDate)
    .map((entry) => {
      const book = getBook(entry.bookId);
      const item = document.createElement("li");
      item.textContent = `${book ? book.title : "Deleted book"}: ${entry.pages} pages`;
      return item;
    });

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.textContent = "No reading logged.";
    items.push(empty);
  }
  detailsList.replaceChildren(...items);
}

export function renderHeatmap() {
  const totals = pagesByDate();
  monthLabel.textContent = new Date(displayYear, displayMonth, 1)
    .toLocaleDateString(undefined, { month: "long", year: "numeric" });
  nextButton.disabled = displayMonthKey() >= todayString().slice(0, 7);
  renderSummary(totals);
  renderCalendar(totals);
  renderDayDetails();
}

function changeMonth(step) {
  const date = new Date(displayYear, displayMonth + step, 1);
  displayYear = date.getFullYear();
  displayMonth = date.getMonth();
  selectedDate = null;
  renderHeatmap();
}

prevButton.addEventListener("click", () => changeMonth(-1));
nextButton.addEventListener("click", () => changeMonth(1));

logForDayButton.addEventListener("click", () => {
  document.querySelector('.tab-bar [data-tab="log"]').click();
  setLogDate(selectedDate);
});
