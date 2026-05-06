# Daily Haiku Development Notes

This is a baseline audit of the current Electron desktop app. It documents the behavior as-is so future changes can be made deliberately.

## App Shape

- `package.json` declares the Electron entry point at `src/main/main.js`, starts the desktop app with `electron .`, and builds Windows output with `electron-builder`.
- `src/main/main.js` is the Electron main process. It owns the app window, scheduler loop, IPC registration, startup/autolaunch IPC, share-card save/copy IPC, and app lifecycle.
- `src/main/tray.js`, `src/main/notifications.js`, and `src/main/floatingCard.js` isolate tray behavior, native/custom notification behavior, and the floating haiku card window.
- `src/main/store.js` owns JSON persistence in Electron `userData` and handles legacy localStorage migration.
- `src/preload/preload.js` and `src/preload/floatingCardPreload.js` expose narrow `contextBridge` APIs. `contextIsolation` remains enabled and `nodeIntegration` remains disabled.
- `src/renderer/index.html` is now markup only. Styles live under `src/renderer/styles`, and renderer JavaScript starts at `src/renderer/js/app.js`.
- `src/renderer/js/stateClient.js` handles renderer-side store hydration/saving. The haiku/archive engines live under `src/renderer/js`, with old import-path shims retained for tests.
- `src/scheduler/activeTimeScheduler.js` contains active-time scheduling logic. `src/scheduler/scheduleRules.js` contains quiet-hours/work-hours rules; `timeWindows.js` is a compatibility shim.

## Current Behavior

- Tray behavior: the app creates a tray icon, using `icon.ico` if present and an in-memory fallback otherwise. The tray menu includes Show Haiku, Next Haiku Now, Settings, and Quit. Clicking the tray icon toggles window visibility. Closing the window hides it to the tray unless Quit is used.
- Native notifications: the renderer asks the main process to show notification UI through `haiku:notify`. The main process can show native notifications, a floating haiku card, or both.
- Scheduler: the main process owns the active-time scheduler and sends countdown snapshots to the renderer. The renderer displays scheduler state but is not the timing source of truth.
- Favorites and archive: favorites, archive/history, reflections, no-repeat queue, settings, onboarding state, selected theme, and scheduler settings persist through the main-process store.
- localStorage usage: legacy `dhState`/`dhAccent` are read only for one-time migration into the main-process store. New renderer state is saved through safe IPC.
- Countdown UI: the renderer updates progress, remaining time, and paused status from main-process scheduler snapshots.
- Startup/autolaunch toggle: the renderer reads startup state with `getAutolaunch`, then sends toggle changes through `toggle-autolaunch`. The main process uses Electron `app.setLoginItemSettings`.
- Chime: the renderer plays a short three-tone Web Audio chime when `S.sound` is enabled. Audio errors are swallowed.
- Design structure: the app uses a frameless custom title bar, tabbed panels for Haiku, Archive, Favorites, and Settings, linked CSS files, generated symbol icons, local system fonts, and a browser guard when opened outside Electron.

## Known Risks

- `src/renderer/js/app.js` is still the largest renderer file. State persistence has been extracted, but archive/settings/onboarding/share-card controllers can be split further over time.
- Dynamic HTML is built with string templates. Current content is local/static and escaped in the main archive/favorite paths, but this should be revisited before accepting broader user-provided rich text.
- Favorites now prefer haiku IDs, with legacy index fallback retained for old saved data.
- The packaged app uses the default Electron icon unless `icon.ico` is added.
- Windows signing/resource editing is disabled in the current build config to avoid local symlink privilege issues during unsigned packaging.
