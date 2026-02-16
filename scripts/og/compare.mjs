import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT_DIR = process.cwd();
const BASELINE_PATH = path.join(ROOT_DIR, 'public', 'og-ocr-arcade.png');
const CANDIDATE_PATH = path.join(ROOT_DIR, 'public', 'og-ocr-arcade-v2.png');
const DIFF_DIR = path.join(ROOT_DIR, 'temp_frames');
const DIFF_PATH = path.join(DIFF_DIR, 'og-diff.png');
const PASS_THRESHOLD = 0.05;

function loadPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function toPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function main() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Baseline not found: ${BASELINE_PATH}`);
  }
  if (!fs.existsSync(CANDIDATE_PATH)) {
    throw new Error(`Candidate not found: ${CANDIDATE_PATH}. Run npm run og:build first.`);
  }

  const baseline = loadPng(BASELINE_PATH);
  const candidate = loadPng(CANDIDATE_PATH);

  if (baseline.width !== candidate.width || baseline.height !== candidate.height) {
    throw new Error(
      `Dimension mismatch: baseline ${baseline.width}x${baseline.height}, candidate ${candidate.width}x${candidate.height}`
    );
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const differentPixels = pixelmatch(
    baseline.data,
    candidate.data,
    diff.data,
    baseline.width,
    baseline.height,
    {
      threshold: 0.1,
      includeAA: true,
      alpha: 0.6,
      diffColor: [255, 59, 48],
    }
  );

  fs.mkdirSync(DIFF_DIR, { recursive: true });
  fs.writeFileSync(DIFF_PATH, PNG.sync.write(diff));

  const totalPixels = baseline.width * baseline.height;
  const ratio = differentPixels / totalPixels;
  const pass = ratio <= PASS_THRESHOLD;

  console.log(`Baseline:  ${BASELINE_PATH}`);
  console.log(`Candidate: ${CANDIDATE_PATH}`);
  console.log(`Diff map:  ${DIFF_PATH}`);
  console.log(`Different pixels: ${differentPixels}/${totalPixels} (${toPercent(ratio)})`);
  console.log(`Threshold (<=): ${toPercent(PASS_THRESHOLD)}`);
  console.log(pass ? 'Result: PASS' : 'Result: FAIL');

  if (!pass) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
