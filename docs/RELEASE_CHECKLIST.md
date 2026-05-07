# Daily Haiku Release Checklist

Use this checklist before cutting a Windows release.

## Setup

- [ ] Run `npm install`.
- [ ] Confirm `package.json` metadata is correct: `name`, `productName`, `appId`, `description`, and `author`.
- [ ] Confirm `build/icon.ico` and `build/icon.png` are present and render clearly at small sizes.

## Automated Checks

- [ ] Run `npm test`.
- [ ] Run `npm start` and confirm the app window opens.
- [ ] Run `npm run build`.

## Manual Smoke Tests

- [ ] Scheduler smoke test: set a short interval, keep the laptop active, and confirm one haiku appears when due.
- [ ] Lock/unlock behavior test: lock the screen, wait, unlock, and confirm there is no burst of missed haikus.
- [ ] Sleep/resume behavior test: suspend or sleep the laptop, resume, and confirm the app continues calmly.
- [ ] Quiet hours test: enable quiet hours for the current time and confirm active time pauses and notifications do not appear.
- [ ] Floating card test: choose Floating haiku card, trigger a haiku, then verify Save, Copy, Close, and auto-dismiss.
- [ ] Native notification test: choose Native notification, trigger a haiku, and confirm the notification opens the app when clicked.
- [ ] Favorites/archive test: save a haiku, search the archive, add a reflection, restart the app, and confirm data persists.
- [ ] Share card test: export the current haiku as PNG and confirm the saved image opens correctly.
- [ ] Reduced-motion test: enable OS reduced motion and confirm animations are subdued.
- [ ] Keyboard shortcut test: verify N, F, 1-4, and Esc behave as documented in Settings.

## Installer

- [ ] Install from `dist/Daily Haiku Setup 1.0.0.exe`.
- [ ] Launch Daily Haiku from the Start Menu shortcut.
- [ ] Confirm the app icon appears in the title bar, taskbar, tray, and installer where Windows supports it.
- [ ] Confirm close-to-tray, tray Show Haiku, Next Haiku Now, Settings, and Quit all work.
- [ ] Uninstall from Windows Apps and confirm the uninstall completes cleanly.
