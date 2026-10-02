// storage.js: like Fishodoro's database.py, but saves to the browser's localStorage

const STORAGE_KEY = "readingHabitTracker.v1";

function emptyState() {
  return { schemaVersion: 1, books: [], entries: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  try {
    return JSON.parse(raw);
  } catch {
    return emptyState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function now() {
  return new Date().toISOString();
}

let state = loadState();

// ---------- Books ----------

export function getBooks() {
  return state.books.filter((b) => !b.deleted);
}

export function getBook(id) {
  return state.books.find((b) => b.id === id && !b.deleted);
}

export function addBook({ title, author, totalPages }) {
  const book = {
    id: crypto.randomUUID(),
    title,
    author,
    totalPages,
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
  };
  state.books.push(book);
  saveState();
  return book;
}

export function updateBook(id, changes) {
  const book = getBook(id);
  if (!book) return;
  Object.assign(book, changes, { updatedAt: now() });
  saveState();
}

export function deleteBook(id) {
  updateBook(id, { deleted: true });
  for (const entry of getEntries()) {
    if (entry.bookId === id) updateEntry(entry.id, { deleted: true });
  }
}

// ---------- Entries (pages read on a day) ----------

export function getEntries() {
  return state.entries.filter((e) => !e.deleted);
}

export function addEntry({ bookId, date, pages }) {
  const entry = {
    id: crypto.randomUUID(),
    bookId,
    date,
    pages,
    createdAt: now(),
    updatedAt: now(),
    deleted: false,
  };
  state.entries.push(entry);
  saveState();
  return entry;
}

export function updateEntry(id, changes) {
  const entry = state.entries.find((e) => e.id === id && !e.deleted);
  if (!entry) return;
  Object.assign(entry, changes, { updatedAt: now() });
  saveState();
}

export function deleteEntry(id) {
  updateEntry(id, { deleted: true });
}

// ---------- Stats helpers ----------

export function bookProgress(bookId) {
  const book = getBook(bookId);
  const pagesRead = getEntries()
    .filter((e) => e.bookId === bookId)
    .reduce((sum, e) => sum + e.pages, 0);
  const percent = book ? Math.min(100, Math.round((pagesRead / book.totalPages) * 100)) : 0;
  return { pagesRead, percent };
}

// Returns an object like { "2026-09-29": 45, "2026-09-30": 12 }
export function pagesByDate() {
  const totals = {};
  for (const entry of getEntries()){
    // For each entry, group the total number of pages read by date
    const dateStr = entry.date
    totals[dateStr] = (totals[dateStr] || 0) + entry.pages

  }
  return totals;
}

// ---------- Backup (export / import) ----------

export function exportData() {
  return JSON.stringify(state, null, 2);
}

function isValidBook(b) {
  return typeof b.id === "string"
    && typeof b.title === "string"
    && Number.isInteger(b.totalPages)
    && b.totalPages > 0;
}

function isValidEntry(e) {
  // Return true only if
  //   e.id is a string, e.bookId is a string,
  //   e.date looks like "YYYY-MM-DD", and
  //   e.pages is a whole number greater than 0
  return typeof e.id === "string"
    && typeof e.bookId === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    && Number.isInteger(e.pages)
    && e.pages > 0;
}

export function isValidState(data) {
  return Boolean(data)
    && Array.isArray(data.books) && data.books.every(isValidBook)
    && Array.isArray(data.entries) && data.entries.every(isValidEntry);
}

export function importData(text) {
  const data = JSON.parse(text);
  if (!isValidState(data)) {
    throw new Error("This file doesn't look like a Reading Tracker backup.");
  }
  state = { schemaVersion: 1, books: data.books, entries: data.entries };
  saveState();
}

// ---------- Sync helpers ----------

// Picks the newer of two versions of the same record
function newerRecord(a, b) {
  // Return whichever of a and b has the later updatedAt
  if (a.updatedAt > b.updatedAt){
    return a;
  }
  else{
    return b;
  }
}

// Combines two lists of records by id, keeping the newer version of each
function mergeRecords(listA, listB) {
  const byId = new Map();
  for (const record of [...listA, ...listB]) {
    const existing = byId.get(record.id);
    byId.set(record.id, existing ? newerRecord(existing, record) : record);
  }
  return [...byId.values()];
}

// Combines two whole data sets, e.g. this phone's and Google Drive's
export function mergeStates(a, b) {
  return {
    schemaVersion: 1,
    books: mergeRecords(a.books, b.books),
    entries: mergeRecords(a.entries, b.entries),
  };
}

// Used by sync: read the whole data set, or replace it with a merged one
export function getState() {
  return state;
}

export function setState(newState) {
  state = newState;
  saveState();
}
