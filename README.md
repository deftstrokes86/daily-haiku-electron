# Daily Haiku

Daily Haiku is a calm Electron desktop app for mindful pauses during active computer time. It runs quietly in the Windows system tray, tracks active laptop time, and offers a short haiku when your chosen rhythm completes.

The app is designed as a small ritual: a gentle interruption, a moment to breathe, and a personal archive of the poems that have met you during the day.

## What It Does

- Shows a new haiku after a configurable amount of active time.
- Pauses while the computer is idle, locked, suspended, outside work hours, or inside quiet hours.
- Supports native notifications, a floating haiku card, or both.
- Keeps a personal archive of seen haikus.
- Lets you save favorites and add short reflections.
- Exports share cards as PNG images.
- Runs from the system tray so closing the window keeps the app available in the background.
- Includes a large local haiku library inspired by Khalil Gibran, Rumi, Mikhail Naimy, Mary Oliver, Paulo Coelho, and Rabindranath Tagore.

All haikus are stored locally in `src/data/haikus.json`.

## App Features

### Haiku Rhythm

Choose how often a haiku appears based on active laptop time:

- Every 15 minutes
- Every 30 minutes
- Every hour
- Every 2 hours
- Every 4 hours

The scheduler counts active time only. It avoids catch-up bursts after sleep, lock, idle time, or long pauses.

### Quiet Hours And Work Hours

Daily Haiku can pause during rest time and optionally count only selected workday windows. These settings are useful if you want the app to feel present during focused hours and absent when you are off the clock.

### Archive, Favorites, And Reflections

Seen haikus are saved to an archive with search and filters for mood, theme, and tags. You can favorite haikus, revisit recent entries, and attach a short one-line reflection.

### Notifications

The app can show:

- A native system notification
- A floating haiku card
- Both notification styles together

The floating card includes quick actions for saving, copying, and closing.

### Share Cards

Current, archived, and favorite haikus can be exported as styled PNG share cards.

## Keyboard Shortcuts

- `N`: Show a new haiku
- `F`: Save or unsave the current haiku
- `1` to `4`: Switch between Haiku, Archive, Favorites, and Settings
- `Esc`: Close the share card modal

## Getting Started

Install dependencies:

```sh
npm install
```

Start the app in development:

```sh
npm start
```

On Windows PowerShell, if script execution blocks `npm`, use:

```sh
npm.cmd start
```

## Testing

Run the test suite:

```sh
npm test
```

Or, on Windows PowerShell:

```sh
npm.cmd test
```

## Building

Create an unpacked build:

```sh
npm run pack
```

Build the Windows installer and portable target:

```sh
npm run build
```

Build only the Windows portable target:

```sh
npm run build:portable
```

Build output is written to `dist/`.

## Project Structure

- `src/main/`: Electron main process, app lifecycle, tray, notifications, scheduler loop, persistence IPC, and share-card save/copy handlers.
- `src/preload/`: Safe `contextBridge` APIs exposed to renderer windows.
- `src/renderer/`: App markup, styles, and renderer-side UI logic.
- `src/scheduler/`: Active-time and time-window scheduling rules.
- `src/data/haikus.json`: Local haiku corpus.
- `tests/`: Vitest coverage for scheduler, archive, migration, and haiku selection logic.
- `docs/`: Development notes and release checklist.

## Data And Privacy

Daily Haiku stores app state locally through Electron's user data directory. Favorites, archive entries, reflections, settings, onboarding state, and scheduler state are persisted on the user's machine.

The app does not require a network connection to show haikus.

## Release Notes

Before packaging a release, see `docs/RELEASE_CHECKLIST.md` for automated checks and manual smoke tests.
