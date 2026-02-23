# AUDIO FORENSICS PRO

Advanced AI-powered audio analysis and deconstruction suite. Drop in an audio file, connect a Bytez API key, and get deep psychological, narrative, technical, cultural, gaming, and genre breakdowns of your track in real time.

---

## Repo Structure

This project lives inside the `audo/` folder of the `aud0` repo. The HTML file in the root of the repo is an old standalone prototype and is not part of this app. Use the files inside `audo/` only.

```
aud0/
  index.html          <-- OLD, ignore this
  audo/
    index.html
    css/
      style.css
    js/
      main.js
      ui-builder.js
      ui.js
      audio-context.js
      ai-service.js
      state.js
      storage.js
      utils.js
```

---

## Getting Started

No build step required. This is a plain ES module app served as static files.

1. Clone the repo and navigate into the `audo/` folder.
2. Serve it with any static file server. For example:

```bash
npx serve .
# or
python3 -m http.server 8080
```

3. Open the app in your browser, enter a Bytez API key, select an audio file, and hit GO.

> Note: the app uses ES modules so it will not work if you just double-click `index.html` directly due to browser CORS restrictions on `file://`. You need to serve it over HTTP.

---

## AI Setup

This app uses the [Bytez](https://bytez.com) API for audio understanding.

- **Classification model:** `aaraki/wav2vec2-base-finetuned-ks`
- **Chat model:** `Qwen/Qwen2-Audio-7B-Instruct`

Enter your Bytez API key in the key box on the upload screen or in the chat sidebar. The key is saved to localStorage so you only have to enter it once.

### Audio Window Setting

The "Audio window" dropdown controls how much audio gets sent to the AI per request:

| Setting | Behavior |
|---------|----------|
| 10-60 seconds | Captures a live clip of that length from the playing audio |
| Full file | Sends the entire file as base64 (max 6 MB) or uploads to a temp host if larger |

If your file is over 6 MB and clip mode is off, the app will attempt to upload the file to a temporary public host and pass the URL to the API instead.

---

## Module Overview

| File | Purpose |
|------|---------|
| `main.js` | Entry point, event wiring, orchestrates everything |
| `ui-builder.js` | Builds the entire DOM from scratch, exports the `ui` element reference object |
| `ui.js` | Display helpers: toast messages, metadata rendering, AI card rendering |
| `audio-context.js` | Web Audio API setup, real-time visualisation animation loops |
| `ai-service.js` | Bytez API calls, audio capture/encoding, key management |
| `state.js` | Shared mutable state object passed between modules |
| `storage.js` | Thin localStorage wrapper with error handling |
| `utils.js` | JSON extraction, file download, and audio utility functions |

---

## Analysis Sections

Each section is collapsible and AI-populated when you load a file:

- **Psychological** -- emotional tone, cognitive load, listener affect
- **Narrative Structure** -- story arc, tension, resolution patterns
- **Technical** -- frequency composition, dynamics, production quality
- **Cultural Context** -- genre genealogy, regional influences, zeitgeist
- **Gaming Applications** -- sync opportunities, gameplay mood matching
- **Genre and Mood** -- genre tags, similar artists, playlist placement

Each section has a Refresh button to re-query the AI independently.

---

## Power-Ups

Located below the visualisations. Currently stubbed, ready for implementation:

| Power-Up | Description |
|----------|-------------|
| MIDI Export | Convert detected melody to MIDI |
| Isolate Elements | Stem separation |
| Beat Detective | BPM, grid, and swing detection |
| Key and Chords | Key, chord, and harmony identification |
| Genre Analysis | Deep genre and cultural mapping |

---

## Visualisations

Four real-time canvas visualisers, each with multiple display modes:

- **Frequency Waterfall** -- Spectrum, Waterfall, Bars
- **Neural Network** -- Network, Nodes, Flow
- **Particle Field** -- Cloud, Orbit, Explosion
- **Stereo Field** -- Lissajous, Phase, Spread

---

## Browser Requirements

- A modern browser with ES module support (Chrome, Firefox, Edge, Safari 14+)
- Web Audio API support (all modern browsers)
- `MediaRecorder` API support for live clip capture (Chrome/Firefox; Safari has partial support)

---

## Notes

- No framework, no bundler, no dependencies beyond Google Fonts loaded via CDN.
- All state lives in `state.js` as a single shared object. Do not import state circularly.
- The `ui` object from `ui-builder.js` is the single source of truth for DOM element references. Do not use `document.getElementById` outside of `ui-builder.js`.
- AI responses are expected as JSON with a `cards` array. The app retries once with a stricter prompt if the first response does not parse correctly.
