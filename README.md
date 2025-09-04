# Picture Diary (HTML/CSS/JS)

A tiny, static web app that turns your text into a diary-style entry and generates a high‑quality image prompt you can paste into your favorite text‑to‑image tool.

## Quick Start

- Serve the `src/` folder locally:
  - With Make: `make dev`
  - Or Python: `python3 -m http.server -d src 5173` then open http://localhost:5173

## Structure

- `src/` — static web app
  - `index.html` — page markup
  - `styles.css` — styles
  - `app/main.js` — UI glue code
  - `lib/prompt.js` — diary + image prompt generation logic
- `tests/` — simple browser-based tests
- `assets/` — placeholder for images or fonts

## Notes

- No build step; pure static assets.
- Prompts focus on clarity: subject, setting, mood, style, visual details, camera/lighting, quality tags.
- Language: UI is Japanese; generated prompt is bilingual (JP primary, EN helpers) to work well with many T2I models.

### Suno-style Music Prompts

- Added a simple music prompt generator with genre chips (J-POP, city pop, lo-fi, trap, R&B, rock, etc.).
- Generates a structured prompt plus small lyric ideas for singing or rap in Japanese/English.

## Roadmap

- Add presets for style (watercolor, manga, oil paint, photo)
- Provide seed control and negative prompt suggestions
- Optional API integration for on‑page image generation
