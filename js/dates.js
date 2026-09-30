// dates.js: helpers for "YYYY-MM-DD" date strings in the phone's local time

// Turns a Date into "YYYY-MM-DD" using local time
export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Returns today's date as "YYYY-MM-DD", e.g. "2026-09-30"
export function todayString() {
  return toDateString(new Date());
}

// "2026-09-30" -> "Wed, 30 Sep 2026"
export function formatDate(dateStr) {
  const date = new Date(`${dateStr}T00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
