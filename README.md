# Worship App

A browser-based worship lyrics library and fullscreen slideshow view. This version is split from the original single-file HTML into conventional website/app folders so HTML, CSS, and JavaScript can be maintained by multiple developers.

## Structure

```text
worship-app/
├── index.html
├── README.md
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
        ├── transliterator.js      # reserved, not loaded yet
        └── main.js
```

## Run locally

Open `index.html` in a browser. No build step is required.

Use `Customize` in the header to choose the app theme, font set, spacing, and card style. Choices are saved in browser `localStorage` under `worship_appearance_v1`.

## Add or edit songs

Use `Ctrl + Shift + D` in the app to open the dev panel. Songs are saved to browser `localStorage` under the key `worship_songs_v1`.

In the Add / Edit tab, use `Import PowerPoint` to load a `.pptx` file. The app asks which lyrics language to write into, and each PowerPoint slide becomes one lyrics slide, so existing slide/page breaks are preserved.

To keep a real JSON file updated, open the Manage Songs tab and click `Connect JSON`. Choose or create `worship-songs.json`. After that, every song add, edit, or delete writes the full library back to that JSON file automatically.

Browsers require this one-time file permission before a website can write to a local file. If the browser does not support the File System Access API, use `Export JSON` as the fallback.

For starter data committed with the app, edit `src/js/data.js` and add song objects to `DEFAULT_SONGS`. The object shape should match the JSON exported from the dev panel.

## Developer notes

- `main.js` wires events and starts the app.
- `render.js` owns DOM rendering and the song management panel.
- `search.js` contains pure matching helpers.
- `pptx.js` reads `.pptx` files and preserves PowerPoint slide breaks during import.
- `appearance.js` stores and applies user appearance choices.
- `projection.js` owns the second-screen popup and screen detection helpers.
- `slideshow.js` owns the slideshow overlay state and navigation.
- `transliterator.js` is reserved for future Arabic-to-Arabizi conversion and is intentionally not loaded by `index.html` yet.

