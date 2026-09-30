// books.js: the Books tab (add, edit, delete books)
import { getBooks, addBook, updateBook, deleteBook, bookProgress } from "./storage.js";

const form = document.querySelector("#book-form");
const heading = document.querySelector("#book-form-heading");
const submitButton = document.querySelector("#book-submit");
const cancelButton = document.querySelector("#book-cancel");
const list = document.querySelector("#book-list");
const emptyMessage = document.querySelector("#books-empty");
const totalPagesInput = form.elements.totalPages;

let editingId = null;

// When editing, the total can't be lower than the pages already logged
function updateTotalPagesLimit() {
  const pagesRead = editingId ? bookProgress(editingId).pagesRead : 0;
  const total = Number(totalPagesInput.value);
  totalPagesInput.setCustomValidity(
    total && total < pagesRead
      ? `You've already logged ${pagesRead} pages, so the total must be at least ${pagesRead}.`
      : ""
  );
}

function progressText(book) {
  const { pagesRead, percent } = bookProgress(book.id);
  // Return text like "120 / 412 pages (29%)"
  // If percent is 100, return "Finished! 412 / 412 pages" instead
  if (percent === 100) {
    return `Finished! ${pagesRead} / ${book.totalPages} pages`;
  }
  return `${pagesRead} / ${book.totalPages} pages (${percent}%)`;
}

function readForm() {
  const data = new FormData(form);
  return {
    title: data.get("title").trim(),
    author: data.get("author").trim(),
    totalPages: Number(data.get("totalPages")),
  };
}

function startEditing(book) {
  editingId = book.id;
  form.elements.title.value = book.title;
  form.elements.author.value = book.author;
  form.elements.totalPages.value = book.totalPages;
  heading.textContent = "Edit book";
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  updateTotalPagesLimit();
  form.scrollIntoView({ behavior: "smooth" });
}

function stopEditing() {
  editingId = null;
  form.reset();
  heading.textContent = "Add a book";
  submitButton.textContent = "Add book";
  cancelButton.hidden = true;
  updateTotalPagesLimit();
}

function createBookCard(book) {
  const item = document.createElement("li");
  item.className = "card";

  const title = document.createElement("h3");
  title.textContent = book.title;

  const author = document.createElement("p");
  author.className = "muted";
  author.textContent = book.author || "Unknown author";

  const bar = document.createElement("progress");
  bar.max = 100;
  bar.value = bookProgress(book.id).percent;

  const progress = document.createElement("p");
  progress.textContent = progressText(book);

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startEditing(book));

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.className = "danger";
  deleteButton.addEventListener("click", () => {
    if (!confirm(`Delete "${book.title}" and all its reading logs?`)) return;
    deleteBook(book.id);
    if (editingId === book.id) stopEditing();
    renderBooks();
  });

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(editButton, deleteButton);

  item.append(title, author, bar, progress, actions);
  return item;
}

export function renderBooks() {
  const books = getBooks();
  list.replaceChildren(...books.map(createBookCard));
  emptyMessage.hidden = books.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const book = readForm();
  if (editingId) {
    updateBook(editingId, book);
  } else {
    addBook(book);
  }
  stopEditing();
  renderBooks();
});

cancelButton.addEventListener("click", stopEditing);
totalPagesInput.addEventListener("input", updateTotalPagesLimit);
