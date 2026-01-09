# Jellyfin Auto Scroll Button

Tested only for Windows for Web (Chrome)

A lightweight client-side script that adds an Auto Scroll button to the Jellyfin UI.

It enables continuous vertical scrolling with adjustable speed and configurable pause delays.

Originally created as a complementary button for **Jellyfin Random Button Extended**,  
this script works fully independently and can be used on its own.

Designed for passive browsing, dashboards, or hands-free content discovery.

---

## Features

- Auto scroll toggle via header button
- Three adjustable scroll speed levels
- Five-step configurable delay at the top of the page (default: 0)
- Automatic pause at the bottom, then reset to top
- Smooth ~60fps scrolling
- Visual feedback using Material Symbols
- No external dependencies
- Fully client-side, no backend interaction

---

## Controls

The button reacts to single, double, and triple clicks:

- **Single click**  
  Start or pause auto scrolling

- **Double click**  
  Cycle through scroll speeds (3 levels)

- **Triple click**  
  Cycle through top delay options (0, 1, 3, 5, 10 seconds)

The current speed or delay value is briefly displayed next to the button icon.

---

## Temporary Settings (Important)

All speed and delay adjustments are **temporary**.

- Settings are stored in memory only
- A page reload restores all default values
- No values are saved to localStorage or backend

### Default Values

- **Default scroll speed:** level 1 (`0.03`)
- **Default top delay:** `0` seconds
- **Bottom delay:** fixed at `3` seconds

---

## Delay Button Explained

The **delay button (triple click)** controls how long the script waits at the **top of the page** before scrolling starts.

This is especially useful when:

- Jellyfin needs time to load posters, metadata, or lazy-loaded content
- The page layout shifts shortly after navigation
- Auto scrolling is combined with other scripts or UI animations
- You want a short pause to visually orient yourself before scrolling resumes

The delay is applied:
- Only when scrolling starts from the top
- Again after each full scroll cycle (bottom → top reset)
- After page navigation while auto scroll is active

---

## Behavior

- Scrolling starts from the current scroll position
- When the bottom is reached:
  - Scrolling pauses for 3 seconds
  - Page automatically jumps back to the top
  - Optional top delay is applied before scrolling resumes
- Page navigation resets the scroll cycle cleanly
- Uses `.main-content` as scroll container when available  
  Falls back to full page scrolling otherwise

---

## Relationship to Jellyfin Random Button Extended

This script was originally developed as a **complementary UI button** for  
**Jellyfin Random Button Extended**, allowing passive scrolling through large libraries while random browsing is active.

However:

- The Auto Scroll Button does **not** depend on the Random Button
- It can be used completely standalone
- No shared state or communication exists between the scripts

---

## Installation

1. Copy the script into your Jellyfin JavaScript injector  
   (userscript manager, custom JS loader, or similar).

2. Ensure the Jellyfin header contains the `.headerRight` container  
   (default Jellyfin UI layout).

3. Reload the page.

No configuration is required.

---

## Configuration (Optional)

You may adjust the following values directly in the script:

```
const speeds = [0.03, 0.06, 0.2];      // Scroll speed presets
const delayStates = [0, 1, 3, 5, 10];  // Top delay options in seconds
const bottomDelay = 3000;              // Bottom pause in milliseconds
```

---

## Tested On

Jellyfin 10.10.7
Windows 11
Chrome / Chromium-based browsers

---

## License

MIT — free to use, modify, and share.

---

## Notes and Limitations
This script modifies the UI at runtime only
No interaction with the Jellyfin backend or API
Designed to be minimal and non-intrusive
Best suited for large libraries, dashboards, or passive browsing
