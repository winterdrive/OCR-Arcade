import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = 41731;
const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function resolvePath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0]);
  const safeRelative = normalized.startsWith('/') ? normalized.slice(1) : normalized;
  const filePath = path.resolve(ROOT_DIR, safeRelative || 'index.html');
  if (!filePath.startsWith(ROOT_DIR)) return null;
  return filePath;
}

function createServer() {
  return http.createServer((req, res) => {
    const filePath = resolvePath(req.url || '/');
    if (!filePath) {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    let targetPath = filePath;
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) targetPath = path.join(targetPath, 'index.html');
    } catch {
      // Keep path as-is and fail below.
    }

    if (!fs.existsSync(targetPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(targetPath).pipe(res);
  });
}

async function render(templatePath, outputPath) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, resolve);
  });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const url = `http://${HOST}:${PORT}${templatePath}`;
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    await context.close();
    console.log(`Generated ${outputPath}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const templatePath = args[0];
    const outputPath = path.resolve(ROOT_DIR, args[1]);
    await render(templatePath, outputPath);
  } else {
    // Default loop for OCR Arcade banners if no args
    const templates = [
      { id: 'official', output: 'og-ocr-arcade.png' },
      { id: 'backup', output: 'og-ocr-arcade-backup.png' }
    ];

    for (const item of templates) {
      const tPath = `/scripts/og/templates/${item.id}.html`;
      const oPath = path.join(ROOT_DIR, 'public', item.output);
      await render(tPath, oPath);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
