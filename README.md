# Worship App

A browser-based worship lyrics library and presenter view. This version is split from the original single-file HTML into conventional website/app folders so HTML, CSS, and JavaScript can be maintained by multiple developers.

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
        ├── transliterator.js      # reserved, not loaded yet
        └── main.js
```

## Run locally

Open `index.html` in a browser. No build step is required.

## Add or edit songs

Use `Ctrl + Shift + D` in the app to open the dev panel. Songs are saved to browser `localStorage` under the key `worship_songs_v1`.

For starter data committed with the app, edit `src/js/data.js` and add song objects to `DEFAULT_SONGS`. The object shape should match the JSON exported from the dev panel.

## Developer notes

- `main.js` wires events and starts the app.
- `render.js` owns DOM rendering and the song management panel.
- `search.js` contains pure matching helpers.
- `projection.js` owns the second-screen popup and screen detection helpers.
- `slideshow.js` owns the presenter overlay state and navigation.
- `transliterator.js` is reserved for future Arabic-to-Arabizi conversion and is intentionally not loaded by `index.html` yet.

