// sync.js: the Google Drive card (sign in / out) and syncing with Drive
import { getState, setState, mergeStates, isValidState } from "./storage.js";
import {
  initGoogle, isSignedIn, signIn, signOut, getUserEmail,
  findOrCreateFile, downloadFile, uploadFile,
} from "./drive.js";
import { showToast } from "./toast.js";

const SYNC_KEY = "readingHabitTracker.sync";
const statusText = document.querySelector("#drive-status");
const signInButton = document.querySelector("#drive-sign-in");
const signOutButton = document.querySelector("#drive-sign-out");
const syncNowButton = document.querySelector("#drive-sync-now");
const lastSyncedText = document.querySelector("#drive-last-synced");
let syncing = false;

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
  syncNowButton.hidden = !connected;

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

  // Show "Last synced: <date and time>" in lastSyncedText,
  // or hide it if there's no lastSyncedAt yet
  if (lastSyncedAt) {
    const when = new Date(lastSyncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    lastSyncedText.textContent = `Last synced: ${when}`;
  }
}

export async function sync() {
  if (syncing || !isSignedIn()) return;
  syncing = true;
  syncNowButton.disabled = true;
  syncNowButton.textContent = "Syncing…";
  try {
    const fileId = await findOrCreateFile(loadSyncInfo().fileId);
    const remote = await downloadFile(fileId);
    if (remote && !isValidState(remote)) {
      throw new Error("The file in Google Drive isn't a valid Reading Tracker file.");
    }
    const merged = remote ? mergeStates(getState(), remote) : getState();
    setState(merged);
    await uploadFile(fileId, merged);
    saveSyncInfo({ ...loadSyncInfo(), fileId, lastSyncedAt: new Date().toISOString() });
    window.dispatchEvent(new Event("datachange"));
    showToast("Synced with Google Drive");
  } catch (error) {
    showToast(`Sync failed: ${error.message}`);
  } finally {
    syncing = false;
    syncNowButton.disabled = false;
    syncNowButton.textContent = "Sync now";
    render();
  }
}

signInButton.addEventListener("click", async () => {
  try {
    await signIn(loadSyncInfo().email);
    saveSyncInfo({ ...loadSyncInfo(), email: await getUserEmail() });
    showToast("Signed in to Google Drive");
    await sync();
  } catch (error) {
    showToast(`Sign-in failed: ${error.message}`);
  }
  render();
});

syncNowButton.addEventListener("click", sync);

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
