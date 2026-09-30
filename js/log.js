// log.js: the Log tab (log pages read, edit and delete entries)
import { getBooks, getBook, getEntries, addEntry, updateEntry, deleteEntry } from "./storage.js";
import { todayString, formatDate } from "./dates.js";

const form = document.querySelector("#log-form");
const heading = document.querySelector("#log-form-heading");
const submitButton = document.querySelector("#log-submit");
const cancelButton = document.querySelector("#log-cancel");
const bookSelect = form.elements.bookId;
const dateInput = form.elements.date;
const noBooksMessage = document.querySelector("#log-no-books");
const list = document.querySelector("#entry-list");
const emptyMessage = document.querySelector("#log-empty");

let editingId = null;

function fillBookOptions() {
  const selected = bookSelect.value;
  const options = getBooks().map((book) => {
    const option = document.createElement("option");
    option.value = book.id;
    option.textContent = book.title;
    return option;
  });
  bookSelect.replaceChildren(...options);
  if (getBook(selected)) bookSelect.value = selected;
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
  bookSelect.value = entry.bookId;
  dateInput.value = entry.date;
  form.elements.pages.value = entry.pages;
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
  const hasBooks = getBooks().length > 0;
  noBooksMessage.hidden = hasBooks;
  form.hidden = !hasBooks;

  fillBookOptions();
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

document.querySelector("#go-to-books").addEventListener("click", () => {
  document.querySelector('.tab-bar [data-tab="books"]').click();
});
