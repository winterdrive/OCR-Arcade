import fs from 'node:fs';
import { PNG } from 'pngjs';

export const DEFAULT_ROI = {
  x0: 430,
  y0: 70,
  x1: 1190,
  y1: 620,
};

export function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

export function writePng(filePath, png) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

export function getPixel(png, x, y) {
  const xi = Math.max(0, Math.min(png.width - 1, x));
  const yi = Math.max(0, Math.min(png.height - 1, y));
  const i = (yi * png.width + xi) * 4;
  return {
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}

function luma(pixel) {
  return 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
}

function isNearWhite(pixel) {
  const max = Math.max(pixel.r, pixel.g, pixel.b);
  const min = Math.min(pixel.r, pixel.g, pixel.b);
  return min >= 228 && max - min <= 35;
}

function isLikelyEdge(png, x, y) {
  const p = getPixel(png, x, y);
  if (!isNearWhite(p)) return false;

  const neighbors = [
    getPixel(png, x, y - 1),
    getPixel(png, x, y + 1),
    getPixel(png, x - 1, y),
    getPixel(png, x + 1, y),
  ];
  const edgeContrast = neighbors.some((n) => Math.abs(luma(p) - luma(n)) > 14);
  return edgeContrast;
}

function fitLineYX(points) {
  // y = m*x + b
  let filtered = points.slice();
  for (let i = 0; i < 2; i += 1) {
    const n = filtered.length;
    if (n < 8) break;
    let sumX = 0;
    let sumY = 0;
    let sumXX = 0;
    let sumXY = 0;
    for (const p of filtered) {
      sumX += p.x;
      sumY += p.y;
      sumXX += p.x * p.x;
      sumXY += p.x * p.y;
    }
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-8) break;
    const m = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - m * sumX) / n;
    const residuals = filtered.map((p) => Math.abs(p.y - (m * p.x + b)));
    const median = residuals.slice().sort((a, b2) => a - b2)[Math.floor(residuals.length / 2)] || 0;
    const threshold = Math.max(2.4, median * 2.8);
    filtered = filtered.filter((p) => Math.abs(p.y - (m * p.x + b)) <= threshold);
    if (filtered.length < 8) break;
  }

  const n = filtered.length;
  if (n < 4) throw new Error('Insufficient points for y=f(x) fit');
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const p of filtered) {
    sumX += p.x;
    sumY += p.y;
    sumXX += p.x * p.x;
    sumXY += p.x * p.y;
  }
  const denom = n * sumXX - sumX * sumX;
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b, pointsUsed: filtered.length };
}

function fitLineXY(points) {
  // x = m*y + b
  const swapped = points.map((p) => ({ x: p.y, y: p.x }));
  const line = fitLineYX(swapped);
  return { m: line.m, b: line.b, pointsUsed: line.pointsUsed };
}

function intersectYxWithXy(lineYx, lineXy) {
  // y = m1*x + b1
  // x = m2*y + b2
  const { m: m1, b: b1 } = lineYx;
  const { m: m2, b: b2 } = lineXy;
  const y = (m1 * b2 + b1) / (1 - m1 * m2);
  const x = m2 * y + b2;
  return { x, y };
}

function collectTopPoints(png, roi) {
  const points = [];
  for (let x = roi.x0; x <= roi.x1; x += 1) {
    for (let y = roi.y0; y <= roi.y0 + 180; y += 1) {
      if (isLikelyEdge(png, x, y)) {
        points.push({ x, y });
        break;
      }
    }
  }
  return points;
}

function collectBottomPoints(png, roi) {
  const points = [];
  for (let x = roi.x0; x <= roi.x1; x += 1) {
    for (let y = roi.y1; y >= roi.y1 - 180; y -= 1) {
      if (isLikelyEdge(png, x, y)) {
        points.push({ x, y });
        break;
      }
    }
  }
  return points;
}

function collectLeftPoints(png, roi) {
  const points = [];
  for (let y = roi.y0; y <= roi.y1; y += 1) {
    for (let x = roi.x0; x <= roi.x0 + 220; x += 1) {
      if (isLikelyEdge(png, x, y)) {
        points.push({ x, y });
        break;
      }
    }
  }
  return points;
}

function collectRightPoints(png, roi) {
  const points = [];
  for (let y = roi.y0; y <= roi.y1; y += 1) {
    for (let x = roi.x1; x >= roi.x1 - 220; x -= 1) {
      if (isLikelyEdge(png, x, y)) {
        points.push({ x, y });
        break;
      }
    }
  }
  return points;
}

function normalizeCorners(corners) {
  const rounded = {};
  for (const [k, v] of Object.entries(corners)) {
    rounded[k] = {
      x: Number(v.x.toFixed(3)),
      y: Number(v.y.toFixed(3)),
    };
  }
  return rounded;
}

function deriveInnerCorners(outerCorners, insetPx = 4) {
  const tl = outerCorners.tl;
  const tr = outerCorners.tr;
  const bl = outerCorners.bl;
  const br = outerCorners.br;
  const ux = tr.x - tl.x;
  const uy = tr.y - tl.y;
  const vx = bl.x - tl.x;
  const vy = bl.y - tl.y;
  const uLen = Math.hypot(ux, uy) || 1;
  const vLen = Math.hypot(vx, vy) || 1;
  const u = { x: ux / uLen, y: uy / uLen };
  const v = { x: vx / vLen, y: vy / vLen };

  const add = (p, k1, k2) => ({ x: p.x + k1.x + k2.x, y: p.y + k1.y + k2.y });
  const mul = (vec, s) => ({ x: vec.x * s, y: vec.y * s });

  return {
    tl: add(tl, mul(u, insetPx), mul(v, insetPx)),
    tr: add(tr, mul(u, -insetPx), mul(v, insetPx)),
    br: add(br, mul(u, -insetPx), mul(v, -insetPx)),
    bl: add(bl, mul(u, insetPx), mul(v, -insetPx)),
  };
}

export function detectPanelGeometry(png, roi = DEFAULT_ROI) {
  const topPoints = collectTopPoints(png, roi);
  const bottomPoints = collectBottomPoints(png, roi);
  const leftPoints = collectLeftPoints(png, roi);
  const rightPoints = collectRightPoints(png, roi);

  if (
    topPoints.length < 100 ||
    bottomPoints.length < 100 ||
    leftPoints.length < 100 ||
    rightPoints.length < 100
  ) {
    throw new Error('Failed to collect enough edge points for panel detection');
  }

  const topLine = fitLineYX(topPoints);
  const bottomLine = fitLineYX(bottomPoints);
  const leftLine = fitLineXY(leftPoints);
  const rightLine = fitLineXY(rightPoints);

  const outerCorners = normalizeCorners({
    tl: intersectYxWithXy(topLine, leftLine),
    tr: intersectYxWithXy(topLine, rightLine),
    br: intersectYxWithXy(bottomLine, rightLine),
    bl: intersectYxWithXy(bottomLine, leftLine),
  });

  const innerCorners = normalizeCorners(deriveInnerCorners(outerCorners, 4));
  const xs = Object.values(outerCorners).map((c) => c.x);
  const ys = Object.values(outerCorners).map((c) => c.y);
  const panelBbox = {
    x0: Number(Math.min(...xs).toFixed(3)),
    y0: Number(Math.min(...ys).toFixed(3)),
    x1: Number(Math.max(...xs).toFixed(3)),
    y1: Number(Math.max(...ys).toFixed(3)),
  };

  return {
    panel_bbox: panelBbox,
    outer_corners: outerCorners,
    inner_corners: innerCorners,
    fit: {
      top_points: topLine.pointsUsed,
      bottom_points: bottomLine.pointsUsed,
      left_points: leftLine.pointsUsed,
      right_points: rightLine.pointsUsed,
      lines: {
        top: { y_equals: `m*x+b`, m: Number(topLine.m.toFixed(7)), b: Number(topLine.b.toFixed(3)) },
        bottom: { y_equals: `m*x+b`, m: Number(bottomLine.m.toFixed(7)), b: Number(bottomLine.b.toFixed(3)) },
        left: { x_equals: `m*y+b`, m: Number(leftLine.m.toFixed(7)), b: Number(leftLine.b.toFixed(3)) },
        right: { x_equals: `m*y+b`, m: Number(rightLine.m.toFixed(7)), b: Number(rightLine.b.toFixed(3)) },
      },
    },
  };
}

export function cornerDistance(c1, c2) {
  return Math.hypot(c1.x - c2.x, c1.y - c2.y);
}

export function createDiffPng(width, height) {
  return new PNG({ width, height });
}
