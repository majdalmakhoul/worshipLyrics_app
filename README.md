# Worship App

A browser-based worship lyrics library and fullscreen slideshow view. This version is split from the original single-file HTML into conventional website/app folders so HTML, CSS, and JavaScript can be maintained by multiple developers.

## Structure

```text
worship-app/
├── index.html
├── README.md
├── package.json
├── render.yaml
├── server.js
├── service-worker.js
├── manifest.webmanifest
├── worship-songs.json
└── src/
    ├── styles/
    │   ├── global.css
    │   ├── layout.css
    │   ├── components.css
    │   └── slideshow.css
    └── js/
        ├── data.js
        ├── search.js
        ├── render.js
        ├── slideshow.js
        ├── projection.js
        ├── pptx.js                # PowerPoint slide text importer
        ├── appearance.js          # theme, font, spacing, and card settings
        ├── pwa.js                 # install prompt and service-worker setup
        ├── transliterator.js      # reserved, not loaded yet
        └── main.js
```

## Run locally

Open `index.html` in a browser. No build step is required.

For installable web-app behavior, serve the folder over `http://localhost` or deploy it over HTTPS. Service workers and home-screen installation do not run from a direct `file://` open.

For shared songs across devices, run the included server:

```powershell
npm start
```

Then open `http://localhost:8080` on the host device, or use the host computer's network address from other phones/tablets on the same network. When deployed to a real server, everyone should use that same HTTPS URL.

Use `Customize` in the header to choose the app theme, font set, spacing, card style, and lyrics size. Choices are saved in browser `localStorage` under `worship_appearance_v1`. Fullscreen and projection lyrics use that size as a preference, then auto-fit each slide to preserve clear screen margins.

Use `Install` when it appears in supported browsers. On iPhone and iPad, use Safari's share menu and choose Add to Home Screen.

## Deploy on Render

This repo includes `render.yaml` so Render can create the web service and persistent disk from the repository.

1. Push the project to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Render will create a Node web service named `worship-lyrics-app`.
4. The service uses `npm start` and stores shared songs at `/var/data/worship-songs.json`.
5. The Blueprint attaches a 1 GB persistent disk named `song-library` at `/var/data`.

If creating the service manually instead of using the Blueprint, use:

```text
Build Command: npm install
Start Command: npm start
Environment Variable: SONGS_FILE=/var/data/worship-songs.json
Disk Mount Path: /var/data
Disk Size: 1 GB
```

Persistent disks require a paid Render web service. Start with 1 GB; Render lets you increase disk size later, but not decrease it.

## Add or edit songs

Use ------ in the app to open the dev panel. When the app is served by `server.js`, songs are saved through `/api/songs`, so every device using the same hosted app sees the same library. In production, set `SONGS_FILE` to a path on a persistent disk, such as `/var/data/worship-songs.json`.

If the shared API is unavailable, the app falls back to browser `localStorage` under the key `worship_songs_v1`.

In the Add / Edit tab, use `Import PowerPoint` to load a `.pptx` file. The app asks which lyrics language to write into, and each PowerPoint slide becomes one lyrics slide, so existing slide/page breaks are preserved.

For direct-file/local-only use, open the Manage Songs tab and click `Connect JSON`. Choose or create `worship-songs.json`. After that, every song add, edit, or delete writes the full library back to that local JSON file automatically.

Browsers require this one-time file permission before a website can write to a local file. If the browser does not support the File System Access API, use `Export JSON` as the fallback.

For starter data committed with the app, edit `src/js/data.js` and add song objects to `DEFAULT_SONGS`. The object shape should match the JSON exported from the dev panel.

## Developer notes

- `main.js` wires events and starts the app.
- `server.js` serves the app and exposes `/api/songs` for shared song storage. It writes to `SONGS_FILE` when set, otherwise it uses the local `worship-songs.json`.
- `render.js` owns DOM rendering and the song management panel.
- `search.js` contains pure matching helpers.
- `pptx.js` reads `.pptx` files and preserves PowerPoint slide breaks during import.
- `appearance.js` stores and applies user appearance choices.
- `pwa.js` owns install prompt behavior and service-worker registration.
- `projection.js` owns the second-screen popup and screen detection helpers.
- `slideshow.js` owns the slideshow overlay state and navigation.
- `transliterator.js` is reserved for future Arabic-to-Arabizi conversion and is intentionally not loaded by `index.html` yet.
