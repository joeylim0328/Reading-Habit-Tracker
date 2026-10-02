// drive.js: talks to Google (sign-in now; Drive files in Part 4)
import { GOOGLE_CLIENT_ID } from "./config.js";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

let tokenClient = null;
let accessToken = null;
let tokenExpiresAt = 0;
let pending = null;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Couldn't load Google sign-in. Are you offline?"));
    document.head.append(script);
  });
}

// Call once at startup, so the sign-in popup can open instantly when tapped
export async function initGoogle() {
  if (GOOGLE_CLIENT_ID.startsWith("PASTE")) {
    throw new Error("Add your Google Client ID to js/config.js");
  }
  await loadGoogleScript();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.error) return pending.reject(new Error(response.error));
      accessToken = response.access_token;
      tokenExpiresAt = Date.now() + response.expires_in * 1000;
      pending.resolve();
    },
    error_callback: (error) => pending.reject(new Error(error.message || error.type)),
  });
}

export function isSignedIn() {
  return accessToken !== null && Date.now() < tokenExpiresAt - 60_000;
}

// Opens Google's popup. Must be called directly from a tap.
export function signIn(email) {
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient.requestAccessToken({ prompt: "", login_hint: email });
  });
}

export function signOut() {
  if (accessToken) google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null;
  tokenExpiresAt = 0;
}

async function driveFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) {
    accessToken = null;
    throw new Error("Google sign-in expired");
  }
  if (!response.ok) throw new Error(`Google Drive error ${response.status}`);
  return response;
}

export async function getUserEmail() {
  const response = await driveFetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)");
  const data = await response.json();
  return data.user.emailAddress;
}
