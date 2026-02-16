# OCR Arcade

I use NotebookLM a lot for organizing information, and its visual summaries are incredibly useful. However, these AI tools often output **static images (PNG)** or PDFs, which creates a practical problem: **the content is locked.**

If there's a typo in the generated image, or if I want to tweak the layout for a presentation, my only option is usually to re-run the prompt and hope for the best.

I built **OCR Arcade** to solve this specific frustration.

[![Version](https://img.shields.io/badge/version-0.0.1-blue?style=flat-square)](CHANGELOG.md) [![License](https://img.shields.io/badge/license-AGPL%2BCommercial-orange?style=flat-square)](LICENSE) [![AI-Ready Context](https://img.shields.io/badge/AI--Ready-LLMS.txt-blue?style=flat-square)](llms.txt)

[![OCR Arcade Hero](./public/og-ocr-arcade.png)](https://winterdrive.github.io/OCR-Arcade/)

[Run locally in 2 minutes](#quick-start-developer) · [Website](https://winterdrive.github.io/OCR-Arcade/) · [GitHub Repo](https://github.com/winterdrive/OCR-Arcade) · [繁體中文版 README](README.zh-TW.md) · [Changelog](CHANGELOG.md)

---

## What does this tool do?

Simply put, it adds an "Edit Mode" to those static images.

You drag in a screenshot from NotebookLM or a PDF handout, and it analyzes the layout to reconstruct text blocks and layers. Even if the OCR isn't perfect, you gain the ability to click and edit text directly in your browser, then export the result as a standard PPTX file.

I mainly use it to:

1. **Fix AI-generated content**: Correct typos or data errors in visual notes.
2. **Extract locked data**: Grab tables or paragraphs from PDFs and turn them into editable objects.

---

## Why build another wheel?

There are existing tools for this, but most of them are **Closed Source**.

This means you can't be sure if your files are strictly processed locally, and you can't modify the tool if it doesn't quite fit your workflow.

I wanted a fully **Open Source** alternative:

1. **Transparency**: You can audit the code to ensure your data never leaves your machine.
2. **Freedom**: If you don't like how a feature works, you have the code to change it.

This side project is an experiment in building a privacy-focused tool that tries to replicate the editing feel of PowerPoint using web technologies.

* **OCR**: Tesseract.js (WASM version).
* **Layout**: onnxruntime-web for structure analysis.

---

## Features

This is an active side project. Current features include:

* **Multi-format**: Supports PDF, PNG, JPG, and clipboard pasting.
* **Visual Editor**: Page navigation on the left, canvas in the middle, properties on the right. I tried to keep the UX familiar to presentation software users.
* **PPTX Export**: Powered by `PptxGenJS`, outputs are compatible with Keynote and Google Slides.
* **i18n**: Fully localized interface (currently includes Traditional Chinese).

---

## Screenshots

### 1. Upload & Analyze

Drag and drop an image, and the system automatically segments text blocks.

![Upload Flow](./public/readme/upload.png)

### 2. Edit Content

My most used feature: double-click any text box to fix typos immediately.

![OCR + Editor](./public/readme/editor.png)

### 3. Export

Once tweaked, download as PPTX to continue your work.

![Export Result](./public/readme/export.png)

---

## Feature Demos

### Advanced Editor Interactions

![Advanced Editor Interactions](./public/readme/advanced-editor.webp)

### PDF Workflow

![PDF Workflow](./public/readme/pdf-workflow.webp)

### Localization

![Localization](./public/readme/localization.webp)

---

## Quick Start (Developer)

If you want to run this locally:

### Requirements

* Node.js >= 18
* npm >= 9

### Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Tech Notes

This is a pure frontend app (React 19 + Vite + TypeScript) with no backend database.
The canvas interaction layer is built with Fabric.js—I spent a fair bit of time tuning the selection and scaling behaviors.

If you're interested in Image-to-Slide algorithms or find a bug, feel free to open an Issue or PR.

---

## Special Thanks

Big thanks to [**JBB-GAARA**](https://github.com/JBB-GAARA) for acting as the PM and Designer, helping to shape the product direction and UI design.

---

## License

This project is licensed under **AGPL-3.0**.
Feel free to use it for personal or open-source projects. For commercial/closed-source integration, please refer to `COMMERCIAL-LICENSE.md`.
