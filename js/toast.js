// toast.js: a small message near the bottom that fades away
const toast = document.querySelector("#toast");
let hideTimer = null;

export function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove("show"), duration);
}
