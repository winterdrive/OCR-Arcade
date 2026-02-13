# OCR Arcade

Turn scanned images and PDFs into editable slides in minutes.

If this project is useful, please **⭐ star this repo first**.

[⭐ Star this repo](../../stargazers) · [Run locally in 2 minutes](#quick-start) · [繁體中文版 README](README.zh-TW.md)

---

## Why It Matters

Most OCR workflows still break at the same point: editing and export.

- You can extract text, but still spend time retyping and reformatting.
- Multi-page PDFs are painful to convert into clean, editable slides.
- Final output quality often drops when moving to presentation tools.

**OCR Arcade** focuses on the full flow:
upload -> OCR -> visual editing -> exportable slides.

---

## Key Features

- PDF/image upload (PNG, JPG, PDF)
- OCR extraction (Tesseract.js + ONNX runtime pipeline)
- Canvas-based visual editor (with alignment/distribution tools)
- Multi-language UI (10 locales)
- Export to PPTX and PNG
- Local-first processing statement (files stay in your browser workflow)
- Theme + immersive UI layers (including Upside-down atmosphere effects)

---

## Demo & Screenshots

### Demo

- Live demo: **Coming soon**
- In the meantime, run locally with the Quick Start below.

### Screenshots

> Place screenshots in `docs/screenshots/` with the names below.

![Upload Flow](docs/screenshots/upload.png)
Upload a PDF/image and start instantly.

![OCR + Editor](docs/screenshots/editor.png)
Inspect OCR output and refine text directly on canvas.

![Export Result](docs/screenshots/export.png)
Export as editable PPTX or PNG.

![Dark Mode](docs/screenshots/dark-mode.png)
Dark mode workspace with ambient visual layers.

---

## Quick Start

### Requirements

- Node.js `>= 18`
- npm `>= 9`

### Install & Run

```bash
npm install
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

## Tech Stack

- React 19 + Vite + TypeScript
- Fabric.js (canvas editing)
- Tesseract.js + onnxruntime-web (OCR pipeline)
- pdfjs-dist (PDF rendering)
- PptxGenJS (PPTX export)
- i18next + react-i18next (i18n)
- Zustand (state management)
- Tailwind CSS + Radix UI primitives

---

## Project Structure

```text
src/
  app/                # App shell and routes
  domains/            # Feature domains (canvas, export, ocr, toolbar, layout)
  shared/             # Shared UI, store, i18n, hooks, styles
scripts/
  pets/               # Pet sprite slicing and asset utility scripts
public/
  assets/             # Demo files and runtime static assets
```

---

## Notes for Contributors

- This repo currently has known TypeScript issues unrelated to quick local dev flow.
- Run tests with:

```bash
npm run test
```

E2E:

```bash
npm run test:e2e
```

---

## Support the Project

If OCR Arcade helps your workflow:

1. **⭐ Star this repository**
2. Share your use case in Issues/Discussions
3. Open a PR for improvements

[⭐ Star this repo](../../stargazers)

