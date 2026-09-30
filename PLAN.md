# Reading Tracker PWA

Build a no-build-step Progressive Web App (plain HTML/CSS/JS) to add books, log pages read per day, and view a monthly pages-read heatmap, stored locally with optional Google sign-in that auto-syncs a JSON file in Google Drive, installable on Android via GitHub Pages.

## Summary
A mobile-first PWA in `Reading Tracker/`. Books must be added before pages can be logged. The monthly calendar heatmap (ported from Fishodoro's `stats_widget.py`) is colored by total pages read per day. Data is local-first in `localStorage`. An optional "Sign in with Google" auto-syncs a visible `reading-habit-tracker.json` in the user's Google Drive, so phone and PC share the same data. JSON export and import are kept as an extra backup. The app is hosted on GitHub Pages, installed on Android via Chrome, and works offline.

## Decisions (from user)
- Platform: PWA, Android phone
- Heatmap: monthly calendar with prev/next navigation (like Fishodoro)
- Intensity: total pages per day across all books
- Book fields: title, author, total pages (enables progress %)
- Entries: pick a date when logging (defaults to today); books and entries can be edited and deleted
- Backup: local JSON export/import **and** Google Drive sync
- Google sign-in is **optional**; the app works fully without it
- Drive file is **visible in My Drive** (`drive.file` scope)
- Sync is **automatic**, plus a "Sync now" button and a "last synced" time

## Current repo state
- The Git repo is already initialized, and `main` tracks `origin` = https://github.com/joeylim0328/Reading-Habit-Tracker.git
- `README.md` was created with PowerShell `echo >>`, so it's saved as UTF-16. It will be rewritten as UTF-8.
- `PLAN.md` is a copy of this plan.

## Data model
localStorage key `readingHabitTracker.v1`. The key is namespaced because all `joeylim0328.github.io` projects share one origin.
```json
{
  "schemaVersion": 1,
  "books":   [{ "id": "uuid", "title": "", "author": "", "totalPages": 350,
                "createdAt": "ISO", "updatedAt": "ISO", "deleted": false }],
  "entries": [{ "id": "uuid", "bookId": "uuid", "date": "YYYY-MM-DD", "pages": 25,
                "createdAt": "ISO", "updatedAt": "ISO", "deleted": false }]
}
```
- `updatedAt` and `deleted` are there so sync can merge changes from several devices. Deletes are soft (`deleted: true`). The UI filters deleted records out, so a deletion also reaches other devices.
- Deleting a book asks for confirmation, then marks the book and all its entries as deleted.
- Book progress = sum of that book's non-deleted entries' pages / totalPages. Show "Finished" at 100% or more.
- Separate local key `readingHabitTracker.sync` holds `{ driveFileId, lastSyncedAt, email, signedInBefore }`.
- Call `navigator.storage.persist()` on startup so Chrome doesn't evict the data when storage runs low.

## Google Drive sync design
- **Auth:** Google Identity Services token client (`https://accounts.google.com/gsi/client`, `google.accounts.oauth2.initTokenClient`) with scope `https://www.googleapis.com/auth/drive.file`. `drive.file` is non-sensitive and only covers files this app created. The access token is kept in memory only and lasts about 1 hour.
- **Account label:** after sign-in, call `GET drive/v3/about?fields=user(emailAddress,displayName)` to show "Signed in as …". This needs no extra scopes.
- **Finding the file:** use the stored `driveFileId`. If there isn't one, search `name='reading-habit-tracker.json' and trashed=false` ordered by `modifiedTime desc`; with `drive.file`, a second device signed into the same Google account can see files this app created. If nothing is found, create the file in My Drive root (multipart upload). If the file returns 404 or is trashed, clear the id and search or create again.
- **Sync algorithm** (`sync()`):
  1. Download the remote file (`files/{id}?alt=media`).
  2. `merge(local, remote)`: combine records by `id` and keep the one with the later `updatedAt`, soft deletes included.
  3. Save the merged data locally and re-render.
  4. Upload the merged data if it differs from the remote copy (`PATCH upload/drive/v3/files/{id}?uploadType=media`).
  5. Update `lastSyncedAt`.
- **Triggers:** after sign-in, on app open, when the app comes back to the foreground (`visibilitychange`), when the phone reconnects (`online` event), 3 seconds after each change (debounced), and the "Sync now" button. Sync is skipped when signed out or offline.
- **Expired token:** a background sync never opens a popup, because browsers block popups without a tap. Instead it shows a "Tap to reconnect Google Drive" banner. Tapping calls `requestAccessToken({ prompt: '', login_hint: email })`, which is usually one tap.
- **Sign out:** revoke the token, clear the sync state, and keep the local data.
- **Config:** `js/config.js` exports `GOOGLE_CLIENT_ID`. It's committed on purpose, since it's public by design, and there is no client secret.
- **Offline or blocked script:** if the Google Identity Services script fails to load, hide the sign-in UI and keep the rest of the app working.

## File structure
```
Reading Tracker/
├── index.html           # app shell, 3 tabs: Heatmap | Log | Books (+ Settings/sync area)
├── styles.css           # mobile-first styling
├── js/
│   ├── config.js        # GOOGLE_CLIENT_ID
│   ├── storage.js       # local state, CRUD, soft delete, export/import, merge()
│   ├── drive.js         # GIS token client, Drive REST calls (find/create/download/upload)
│   ├── sync.js          # sync orchestration, triggers, debounce, status UI
│   ├── heatmap.js       # monthly calendar (port of Fishodoro render_monthly_calendar)
│   ├── books.js         # add/edit/delete books, progress bars
│   ├── log.js           # log pages form + entries list with edit/delete
│   └── app.js           # tab navigation, wiring, SW registration, persist()
├── manifest.webmanifest # relative start_url/scope, icons, theme color, standalone
├── sw.js                # cache-first for app shell; network-only for Google domains
├── icons/               # icon-192.png, icon-512.png
├── .gitignore
├── PLAN.md
├── README.md            # features, run, deploy, install, Google Cloud setup
└── AGENTS.md            # dev commands / conventions
```
Plain ES modules with no framework or bundler.

## Screens
1. **Heatmap tab** (default)
   - Summary line: pages this month, days read this month, current streak
   - Month header with ◀ / ▶ buttons
   - Sun–Sat grid. Today's cell gets a highlighted border.
   - Color buckets for pages per day: 0, 1–10, 11–25, 26–50, 51+ (legend below the grid)
   - Tap a day to open a panel listing that day's entries, with a "Log for this day" shortcut
2. **Log tab**
   - Form: book dropdown (only books already added; if there are none, show "Add a book first" with a link to the Books tab), date (defaults to local today), pages (a positive integer)
   - Recent entries list with Edit and Delete
3. **Books tab**
   - "Add book" form: title (required), author, total pages (required, positive integer)
   - Book cards: title, author, progress bar (read/total, %), Edit and Delete
4. **Settings / Data** (header gear icon or a section at the bottom of the Books tab)
   - Google Drive: Sign in button, or when signed in: "Signed in as X", sync status (Synced 2 min ago / Syncing… / Offline / Reconnect needed), Sync now, Sign out
   - Local backup: Export JSON (`reading-tracker-YYYY-MM-DD.json`) and Import JSON (validate, then confirm, then replace; if signed in, the next sync uploads it)

## Implementation steps
1. Add `.gitignore`, rewrite `README.md` as UTF-8, and create the skeleton files.
2. `storage.js`: state load/save, `crypto.randomUUID` ids, CRUD with `updatedAt` and soft delete, helpers (`pagesByDate()`, `bookProgress(id)`, `activeBooks()`), export/import with validation, `merge(a, b)`, and a change-event hook for sync.
3. `index.html` + `styles.css`: responsive layout, bottom tab bar, touch-friendly sizes.
4. `books.js`, then `log.js`, then `heatmap.js` (local dates built as local `YYYY-MM-DD`, never with `toISOString()`).
5. `drive.js`: token client, `getUser()`, `findOrCreateFile()`, `download()`, `upload()`, and handling for 401/404.
6. `sync.js`: `sync()` flow, triggers, debounce, status display, reconnect banner.
7. `manifest.webmanifest`, icons, and `sw.js` (versioned cache; let requests to `googleapis.com` and `accounts.google.com` go straight to the network).
8. README: features, local run, the Google Cloud setup below, GitHub Pages deploy, Android install. AGENTS.md: dev commands.

## One-time Google Cloud setup (done by you, documented in README)
1. In console.cloud.google.com, create a project, e.g. "Reading Habit Tracker".
2. APIs & Services, then Library, then enable **Google Drive API**.
3. OAuth consent screen (Google Auth Platform): choose External, fill in the app name and your email, add scope `.../auth/drive.file`, leave the publishing status on **Testing**, and add your Gmail as a test user.
4. Credentials, then Create OAuth client ID, type **Web application**. Authorized JavaScript origins: `https://joeylim0328.github.io` and `http://localhost:8000`. No redirect URIs are needed for the token popup flow.
5. Paste the Client ID into `js/config.js`.
- In Testing mode, Google shows a "Google hasn't verified this app" screen; tap Continue. Up to 100 manually added test users are allowed.

## Running and deploying
- Local: run `python -m http.server 8000` and open `http://localhost:8000`. Sign-in works because localhost is an authorized origin.
- Deploy: push to `main`, then GitHub Settings → Pages → deploy from `main` / root, giving `https://joeylim0328.github.io/Reading-Habit-Tracker/`. On Android Chrome, open it, then ⋮ → Install app.
- Use relative paths everywhere, because the site is served from the `/Reading-Habit-Tracker/` subpath.
- Committing and pushing only happens after you approve it.

## Verification
- [ ] Local run in desktop Chrome with DevTools device emulation (Pixel size)
- [ ] Add book, then log pages; the Log tab is blocked when no books exist
- [ ] Heatmap bucket colors; multiple books on the same day add up; Dec → Jan navigation
- [ ] Edit/delete an entry, and the heatmap and progress update; deleting a book hides its entries
- [ ] Export, clear storage, import, and the data is restored; a malformed file is rejected
- [ ] Without signing in, the app works fully, including with the Google script blocked or offline
- [ ] Sign in, and `reading-habit-tracker.json` appears in My Drive with the correct contents
- [ ] Two browser profiles on the same Google account: add different records in each, sync both, and both end up with the union; a delete on one reaches the other
- [ ] Token expiry (simulate by clearing the in-memory token): the reconnect banner appears and a tap restores sync
- [ ] Trash the Drive file, sync, and it's recreated from local data
- [ ] DevTools → Application: manifest is valid, service worker is active, the app works offline; Lighthouse installability check passes
- [ ] After deploying: install on Android, sign in, confirm sync with the PC

## Risks and considerations
- **The Google session lasts about 1 hour.** This is a limit of browser-only apps. Expect an occasional one-tap reconnect; permanent sign-in would need a backend.
- **The Drive file is visible**, so it can be moved, renamed or trashed. Moving or renaming is fine because the app uses the file ID. If the file is trashed, the app recreates it from local data. Editing it by hand could break the JSON; if it can't be parsed, the app skips it and shows an error rather than overwriting it.
- **Conflicts:** if the same record is edited on two devices, the later `updatedAt` wins. Device clocks that are far off could pick the wrong version; that's acceptable for personal use.
- Deleted records are kept in the file permanently. They're tiny, so that's fine for years of use.
- Service worker updates: bump the cache version on each deploy.
- Possible later additions: GitHub-style year view, per-book filter, daily goal, reminders.
