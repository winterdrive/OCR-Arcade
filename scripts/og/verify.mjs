import fs from 'node:fs';
import path from 'node:path';
import {
  cornerDistance,
  createDiffPng,
  readPng,
  writePng,
} from './og-panel-geometry.mjs';

const ROOT = process.cwd();
const BASELINE_JSON_PATH = path.join(ROOT, 'scripts', 'og', 'templates', 'panel-geometry.baseline.json');
const TRANSFORM_JSON_PATH = path.join(ROOT, 'scripts', 'og', 'templates', 'panel-transform.json');
const BASELINE_IMAGE_PATH = path.join(ROOT, 'public', 'og-ocr-arcade.png');
const CANDIDATE_IMAGE_PATH = path.join(ROOT, 'public', 'og-ocr-arcade-v2.png');
const DIFF_PATH = path.join(ROOT, 'temp_frames', 'og-panel-diff.png');

const CORNER_MAX_ERROR = 2.0;
const ROI_DIFF_MAX_RATIO = 0.03;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function cropImage(png, bbox) {
  const x0 = clamp(Math.floor(bbox.x0), 0, png.width - 1);
  const y0 = clamp(Math.floor(bbox.y0), 0, png.height - 1);
  const x1 = clamp(Math.ceil(bbox.x1), 1, png.width);
  const y1 = clamp(Math.ceil(bbox.y1), 1, png.height);
  const width = x1 - x0;
  const height = y1 - y0;
  const out = createDiffPng(width, height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcI = ((y0 + y) * png.width + (x0 + x)) * 4;
      const dstI = (y * width + x) * 4;
      out.data[dstI] = png.data[srcI];
      out.data[dstI + 1] = png.data[srcI + 1];
      out.data[dstI + 2] = png.data[srcI + 2];
      out.data[dstI + 3] = png.data[srcI + 3];
    }
  }

  return out;
}

function deriveCornersFromTransform(transform) {
  const { left, top, width, height, matrix } = transform.panel;
  const tl = { x: left, y: top };
  const tr = { x: left + matrix.a * width, y: top + matrix.b * width };
  const bl = { x: left + matrix.c * height, y: top + matrix.d * height };
  const br = { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y };
  return { tl, tr, br, bl };
}

function colorDistanceAt(dataA, dataB, index) {
  const dr = dataA[index] - dataB[index];
  const dg = dataA[index + 1] - dataB[index + 1];
  const db = dataA[index + 2] - dataB[index + 2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isNearWhite(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 228 && max - min <= 35;
}

function readRgbAt(png, x, y) {
  const xi = clamp(Math.round(x), 0, png.width - 1);
  const yi = clamp(Math.round(y), 0, png.height - 1);
  const i = (yi * png.width + xi) * 4;
  return { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
}

function hasNearWhiteAround(png, x, y, radius = 1) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      const p = readRgbAt(png, xx, yy);
      if (isNearWhite(p.r, p.g, p.b)) return true;
    }
  }
  return false;
}

function nearestWhiteDistance(png, x, y, radius = 8) {
  let best = Number.POSITIVE_INFINITY;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      const p = readRgbAt(png, xx, yy);
      if (!isNearWhite(p.r, p.g, p.b)) continue;
      const d = Math.hypot(xx - x, yy - y);
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? best : radius + 1;
}

function interpolateLine(a, b, step = 2) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const n = Math.max(2, Math.ceil(length / step));
  const points = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    points.push({ x: a.x + dx * t, y: a.y + dy * t });
  }
  return points;
}

function compareFrameEdges(baseImage, candImage, corners) {
  const diff = createDiffPng(baseImage.width, baseImage.height);
  const edges = [
    interpolateLine(corners.tl, corners.tr, 2),
    interpolateLine(corners.tr, corners.br, 2),
    interpolateLine(corners.br, corners.bl, 2),
    interpolateLine(corners.bl, corners.tl, 2),
  ];

  let framePixels = 0;
  let diffPixels = 0;
  let totalDistance = 0;

  for (const edge of edges) {
    for (const p of edge) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const baseHasFrame = hasNearWhiteAround(baseImage, x, y, 2);
      if (!baseHasFrame) continue;
      framePixels += 1;
      const nearest = nearestWhiteDistance(candImage, x, y, 8);
      totalDistance += nearest;
      const i = (clamp(y, 0, diff.height - 1) * diff.width + clamp(x, 0, diff.width - 1)) * 4;
      if (nearest > 3) {
        diffPixels += 1;
        diff.data[i] = 255;
        diff.data[i + 1] = 59;
        diff.data[i + 2] = 48;
        diff.data[i + 3] = 255;
      } else {
        diff.data[i] = 46;
        diff.data[i + 1] = 204;
        diff.data[i + 2] = 113;
        diff.data[i + 3] = 255;
      }
    }
  }

  return {
    diff,
    diffPixels,
    framePixels,
    avgDistance: framePixels > 0 ? totalDistance / framePixels : Number.POSITIVE_INFINITY,
    ratio: framePixels > 0 ? (totalDistance / framePixels) / 100 : 1,
  };
}

function main() {
  if (!fs.existsSync(BASELINE_JSON_PATH)) {
    throw new Error(`Missing baseline geometry: ${BASELINE_JSON_PATH}. Run npm run og:calibrate first.`);
  }
  if (!fs.existsSync(TRANSFORM_JSON_PATH)) {
    throw new Error(`Missing transform spec: ${TRANSFORM_JSON_PATH}. Run npm run og:calibrate first.`);
  }
  if (!fs.existsSync(BASELINE_IMAGE_PATH) || !fs.existsSync(CANDIDATE_IMAGE_PATH)) {
    throw new Error('Missing baseline or candidate image.');
  }

  const baselineSpec = JSON.parse(fs.readFileSync(BASELINE_JSON_PATH, 'utf8'));
  const transformSpec = JSON.parse(fs.readFileSync(TRANSFORM_JSON_PATH, 'utf8'));
  const baselineImage = readPng(BASELINE_IMAGE_PATH);
  const candidateImage = readPng(CANDIDATE_IMAGE_PATH);

  const baselineCorners = baselineSpec.affine_target_corners || baselineSpec.outer_corners;
  const candidateCorners = deriveCornersFromTransform(transformSpec);

  const cornerErrors = {
    tl: cornerDistance(candidateCorners.tl, baselineCorners.tl),
    tr: cornerDistance(candidateCorners.tr, baselineCorners.tr),
    br: cornerDistance(candidateCorners.br, baselineCorners.br),
    bl: cornerDistance(candidateCorners.bl, baselineCorners.bl),
  };
  const maxCornerError = Math.max(...Object.values(cornerErrors));

  const borderCompare = compareFrameEdges(baselineImage, candidateImage, baselineCorners);
  const roiDiffRatio = borderCompare.ratio;

  fs.mkdirSync(path.dirname(DIFF_PATH), { recursive: true });
  writePng(DIFF_PATH, borderCompare.diff);

  const cornerPass = maxCornerError <= CORNER_MAX_ERROR;
  const roiPass = roiDiffRatio <= ROI_DIFF_MAX_RATIO;
  const pass = cornerPass && roiPass;

  console.log(`Corners max error: ${maxCornerError.toFixed(3)} px (threshold <= ${CORNER_MAX_ERROR.toFixed(1)} px)`);
  console.log(`Corner errors: TL ${cornerErrors.tl.toFixed(3)}, TR ${cornerErrors.tr.toFixed(3)}, BR ${cornerErrors.br.toFixed(3)}, BL ${cornerErrors.bl.toFixed(3)}`);
  console.log(
    `Panel border diff ratio: ${(roiDiffRatio * 100).toFixed(2)}% (threshold <= ${(ROI_DIFF_MAX_RATIO * 100).toFixed(2)}%)`
  );
  console.log(`Panel border avg offset: ${borderCompare.avgDistance.toFixed(3)} px`);
  console.log(`Diff map: ${path.relative(ROOT, DIFF_PATH).replace(/\\/g, '/')}`);
  console.log(pass ? 'Result: PASS' : 'Result: FAIL');

  if (!pass) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
