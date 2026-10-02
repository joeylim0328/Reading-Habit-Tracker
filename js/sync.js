// sync.js: the Google Drive card (sign in / out). Syncing comes in Part 4.
import { initGoogle, isSignedIn, signIn, signOut, getUserEmail } from "./drive.js";
import { showToast } from "./toast.js";

const SYNC_KEY = "readingHabitTracker.sync";
const statusText = document.querySelector("#drive-status");
const signInButton = document.querySelector("#drive-sign-in");
const signOutButton = document.querySelector("#drive-sign-out");

function loadSyncInfo() {
  return JSON.parse(localStorage.getItem(SYNC_KEY)) || {};
}

function saveSyncInfo(info) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(info));
}

function render() {
  const { email } = loadSyncInfo();
  const connected = isSignedIn();

  signInButton.hidden = connected;
  signInButton.textContent = email ? "Reconnect" : "Sign in with Google";
  signOutButton.hidden = !email;

  //   no email             -> "Sign in to back up and sync your data across devices."
  //   email + connected    -> "Signed in as <email>"
  //   email, not connected -> "Signed in as <email>. Tap Reconnect to sync."
    if (!email) {
    statusText.textContent = "Sign in to back up and sync your data across devices.";
  } else if (connected) {
    statusText.textContent = `Signed in as ${email}`;
  } else {
    statusText.textContent = `Signed in as ${email}. Tap Reconnect to sync.`;
  }
}

signInButton.addEventListener("click", async () => {
  try {
    await signIn(loadSyncInfo().email);
    saveSyncInfo({ ...loadSyncInfo(), email: await getUserEmail() });
    showToast("Signed in to Google Drive");
  } catch (error) {
    showToast(`Sign-in failed: ${error.message}`);
  }
  render();
});

signOutButton.addEventListener("click", () => {
  signOut();
  localStorage.removeItem(SYNC_KEY);
  showToast("Signed out. Your data stays on this device.");
  render();
});

render();
initGoogle()
  .then(() => { signInButton.disabled = false; })
  .catch((error) => { statusText.textContent = error.message; });
