# Daily Haiku Development Notes

This is a baseline audit of the current Electron desktop app. It documents the behavior as-is so future changes can be made deliberately.

## App Shape

- `package.json` declares the Electron entry point at `main.js`, starts the desktop app with `electron .`, and builds Windows output with `electron-builder`.
- `main.js` is the Electron main process. It owns the window, tray, native notifications, interval timer, single-instance behavior, and startup/autolaunch IPC.
- `preload.js` exposes a small `window.electronAPI` bridge to the renderer using `contextBridge`.
- `index.html` contains the complete renderer: markup, styles, haiku data, UI state, persistence, and browser-side behavior in one file.

## Current Behavior

- Tray behavior: the app creates a tray icon, using `icon.ico` if present and an in-memory fallback otherwise. The tray menu includes Show Haiku, Next Haiku Now, Settings, and Quit. Clicking the tray icon toggles window visibility. Closing the window hides it to the tray unless the Quit menu item is used.
- Native notifications: the renderer asks the main process to show a native notification through `show-native-notification`. Clicking the notification shows and focuses the main window. Notifications are gated by the renderer `S.popup` flag.
- Interval timer: the main process owns a `setInterval` timer. It starts at 60 minutes on app ready, can be updated by the renderer via `update-interval`, and sends `trigger-popup` to the renderer when elapsed. The renderer also resets the main timer after a manual new haiku.
- Favorites: favorites live in renderer state as `S.favs`. Saving toggles the current haiku by index, renders the Favorites tab, updates the Save button state, and persists to localStorage.
- History: history lives in `S.history`. Daily initialization and new popup/manual haiku events add entries, the UI shows the latest five, and saved state is limited before persistence.
- localStorage usage: `dhState` stores history, favorites, interval, notification and sound toggles, and the last countdown timestamp. `dhAccent` stores the selected accent color separately.
- Countdown UI: the renderer computes countdown progress from `cdStart`, `S.interval`, and `S.lastT`, updates a progress fill and remaining time once per second, and resets when Electron tells it a popup has fired.
- Startup/autolaunch toggle: the renderer reads startup state with `getAutolaunch`, then sends toggle changes through `toggle-autolaunch`. The main process uses Electron `app.setLoginItemSettings`.
- Chime: the renderer plays a short three-tone Web Audio chime when `S.sound` is enabled. Audio errors are swallowed.
- Design structure: the app uses a frameless custom title bar, tabbed panels for Haiku, Favorites, and Settings, inline CSS variables, generated symbol icons, local system fonts, and a browser guard when opened outside Electron.

## Known Risks

- Most renderer behavior is inline in `index.html`, which makes isolated unit tests and small refactors harder.
- Timer state is split between the main process timer and renderer countdown state, so future scheduler changes need care.
- Persistence has no schema version or migration path yet.
- Dynamic HTML is built with string templates. Current content is local/static, but this should be revisited before accepting user-provided text.
- Favorites identify haikus by index, so changing haiku ordering can affect saved favorites.
- The packaged app uses the default Electron icon unless `icon.ico` is added.
- Windows signing/resource editing is disabled in the current build config to avoid local symlink privilege issues during unsigned packaging.
