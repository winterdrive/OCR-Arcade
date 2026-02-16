# Changelog

All notable changes to the "OCR Arcade" project will be documented in this file.

---

## [0.0.1] - 2026-02-14

### 🎉 Initial Release

**OCR Arcade** is a browser-based tool that bridges the gap between OCR and final presentation. It allows users to convert scanned images and PDFs into editable PowerPoint (PPTX) slides directly in the browser, with a privacy-first, local processing approach.

### ✨ Core Features

- **Local-First Processing**: All files are processed locally in the browser using Tesseract.js and onnxruntime-web. No data leaves your device.
- **Visual Canvas Editor**: Built with Fabric.js, allowing users to select, move, resize, and edit recognized text blocks directly on the scanned image.
- **Direct PPTX Export**: Generates editable PowerPoint slides where text blocks are preserved as actual text boxes, not just images.
- **Multi-Format Support**: Handles PDF, PNG, and JPG inputs.
- **Localization**: Full support for English and Traditional Chinese (繁體中文).

### 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Core Libraries**:
  - `fabric.js`: Canvas manipulation
  - `tesseract.js` & `onnxruntime-web`: OCR engine
  - `pptxgenjs`: PowerPoint generation
  - `pdfjs-dist`: PDF rendering
  - `zustand`: State management

### 🚀 Getting Started

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`
