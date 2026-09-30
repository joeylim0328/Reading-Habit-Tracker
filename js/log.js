// log.js: the Log tab (log pages read, edit and delete entries)
import { getBooks, getBook, getEntries, addEntry, updateEntry, deleteEntry } from "./storage.js";
import { todayString, formatDate } from "./dates.js";

const form = document.querySelector("#log-form");
const heading = document.querySelector("#log-form-heading");
const submitButton = document.querySelector("#log-submit");
const cancelButton = document.querySelector("#log-cancel");
const bookSelect = form.elements.bookId;
const dateInput = form.elements.date;
const pagesInput = form.elements.pages;
const pagesHint = document.querySelector("#pages-hint");
const noBooksMessage = document.querySelector("#log-no-books");
const noBooksText = document.querySelector("#log-no-books-text");
const list = document.querySelector("#entry-list");
const emptyMessage = document.querySelector("#log-empty");

let editingId = null;

// Pages not yet logged for this book, NOT counting the entry being edited
function pagesLeft(bookId) {
  const book = getBook(bookId);
  if (!book) return 0;
  const alreadyLogged = getEntries()
    .filter((e) => e.bookId === bookId && e.id !== editingId)
    .reduce((sum, e) => sum + e.pages, 0);
  return Math.max(0, book.totalPages - alreadyLogged);
}

// Books that still have pages left to log (finished books are hidden)
function availableBooks() {
  return getBooks().filter((book) => pagesLeft(book.id) > 0);
}

function updatePagesLimit() {
  const left = pagesLeft(bookSelect.value);
  const message = Number(pagesInput.value) > left ? `Only ${left} pages left in this book.` : "";
  pagesInput.setCustomValidity(message);
  pagesHint.textContent = message || `${left} pages left in this book`;
  pagesHint.classList.toggle("error", message !== "");
}

// Shows the form (or the "add a book" message) and refreshes the dropdown and hint
function refreshForm() {
  const books = availableBooks();
  noBooksMessage.hidden = books.length > 0;
  form.hidden = books.length === 0;
  noBooksText.textContent = getBooks().length === 0
    ? "You need to add a book before you can log pages."
    : "All your books are finished! Add a new book to keep logging.";
  fillBookOptions(books);
  updatePagesLimit();
}

function fillBookOptions(books) {
  const selected = bookSelect.value;
  const options = books.map((book) => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = book.title;
    return option;
  });
  bookSelect.replaceChildren(...options);
  if (books.some((book) => book.id === selected)) bookSelect.value = selected;
}

function readForm() {
  const data = new FormData(form);
  return {
    bookId: data.get("bookId"),
    date: data.get("date"),
    pages: Number(data.get("pages")),
  };
}

function startEditing(entry) {
  editingId = entry.id;
  refreshForm();
  bookSelect.value = entry.bookId;
  dateInput.value = entry.date;
  pagesInput.value = entry.pages;
  updatePagesLimit();
  heading.textContent = "Edit log";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
}

function stopEditing() {
  editingId = null;
  form.reset();
  dateInput.value = todayString();
  heading.textContent = "Log pages read";
  submitButton.textContent = "Log pages";
  cancelButton.hidden = true;
  refreshForm();
}

function createEntryItem(entry) {
  const book = getBook(entry.bookId);

  const item = document.createElement("li");
  item.className = "card entry-item";

  const title = document.createElement("strong");
  title.textContent = book ? book.title : "Deleted book";

  const details = document.createElement("p");
  details.className = "muted";
  details.textContent = `${formatDate(entry.date)} · ${entry.pages} pages`;

  const text = document.createElement("div");
  text.append(title, details);

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startEditing(entry));

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.className = "danger";
  deleteButton.addEventListener("click", () => {
    if (!confirm(`Delete this log of ${entry.pages} pages?`)) return;
    deleteEntry(entry.id);
    if (editingId === entry.id) stopEditing();
    renderLog();
  });

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(editButton, deleteButton);

  item.append(text, actions);
  return item;
}

export function renderLog() {
  refreshForm();
  dateInput.max = todayString();
  if (!dateInput.value) dateInput.value = todayString();

  const entries = getEntries()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  list.replaceChildren(...entries.map(createEntryItem));
  emptyMessage.hidden = entries.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = readForm();
  if (editingId) {
    updateEntry(editingId, entry);
  } else {
    addEntry(entry);
  }
  stopEditing();
  renderLog();
});

cancelButton.addEventListener("click", stopEditing);
bookSelect.addEventListener("change", updatePagesLimit);
pagesInput.addEventListener("input", updatePagesLimit);

document.querySelector("#go-to-books").addEventListener("click", () => {
  document.querySelector('.tab-bar [data-tab="books"]').click();
});

export function setLogDate(dateStr) {
  dateInput.value = dateStr;
  pagesInput.focus();
}
