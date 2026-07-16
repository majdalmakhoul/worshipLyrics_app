# Worship App

A browser-based worship lyrics library and fullscreen slideshow view. This version is split from the original single-file HTML into conventional website/app folders so HTML, CSS, and JavaScript can be maintained by multiple developers.

## Structure

```text
worship-app/
├── index.html
├── .env.example
├── .gitignore
├── azure-app-settings.example.json
├── README.md
├── package.json
├── deploy/
│   └── azure-app-service.ps1
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

## Deploy on Azure App Service

Azure App Service is the recommended Azure target for this app. The Free F1 tier can run a small Node app and provides a persistent home directory, which this app uses for the shared song JSON file.

The app is already Azure-compatible because `server.js` listens on `process.env.PORT` and stores songs at the `SONGS_FILE` path.

### Azure CLI deployment

Install the Azure CLI, sign in, then run:

```powershell
az login
.\deploy\azure-app-service.ps1 -AppName <unique-app-name> -ResourceGroup <resource-group-name> -Location eastus
```

The script creates or updates a Linux App Service app, configures `npm start`, prompts for the private admin password, and sets these App Service application settings:

```env
NODE_ENV=production
SONGS_FILE=/home/data/worship-songs.json
ADMIN_TOKEN=<long private admin password>
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

Azure's `/home` directory is shared storage for App Service apps and persists across restarts. The song library is created at `/home/data/worship-songs.json` on first run.

Free F1 is good for testing and light use. It has CPU, bandwidth, and filesystem quotas and can sleep when idle. If the church depends on this during services every week, Basic B1 or higher is safer.

### Azure portal deployment

If creating the app manually in the Azure portal:

1. Create an App Service Web App.
2. Choose Code, Linux, Node.js LTS, and the Free F1 pricing tier.
3. Deploy this repo from GitHub or VS Code.
4. Set Startup Command to `npm start`.
5. Add the app settings shown above under Configuration.

## Deployment security

No API keys or private secrets should be committed to this repo. Keep real values in Azure App Service application settings or in a local `.env` file that stays ignored by Git. `.env.example` and `azure-app-settings.example.json` are placeholder templates only.

Shared songs are publicly readable by the app, but adding, editing, and deleting songs requires the `ADMIN_TOKEN` when `NODE_ENV=production`. The app asks for that admin password only when saving shared songs and keeps it in browser session storage, not in the source code. If the password is ever exposed, replace it in Azure immediately.

## Add or edit songs

Use ------ in the app to open the dev panel. When the app is served by `server.js`, songs are saved through `/api/songs`, so every device using the same hosted app sees the same library. In production, set `SONGS_FILE` to a persistent path, such as `/home/data/worship-songs.json` on Azure App Service.

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
