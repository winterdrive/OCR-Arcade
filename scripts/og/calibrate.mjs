import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_ROI,
  detectPanelGeometry,
  readPng,
} from './og-panel-geometry.mjs';

const ROOT = process.cwd();
const BASELINE_IMAGE = path.join(ROOT, 'public', 'og-ocr-arcade.png');
const BASELINE_JSON = path.join(ROOT, 'scripts', 'og', 'templates', 'panel-geometry.baseline.json');
const TRANSFORM_JSON = path.join(ROOT, 'scripts', 'og', 'templates', 'panel-transform.json');
const TRANSFORM_CSS = path.join(ROOT, 'scripts', 'og', 'templates', 'panel-transform.css');

const SOURCE_RECT = {
  width: 640,
  height: 440,
};

function toFixedNumber(v, n = 8) {
  return Number(v.toFixed(n));
}

function deriveAffineFromCorners(corners, sourceRect) {
  const { tl, tr, bl } = corners;
  const w = sourceRect.width;
  const h = sourceRect.height;

  const a = (tr.x - tl.x) / w;
  const b = (tr.y - tl.y) / w;
  const c = (bl.x - tl.x) / h;
  const d = (bl.y - tl.y) / h;

  return {
    left: toFixedNumber(tl.x, 3),
    top: toFixedNumber(tl.y, 3),
    width: w,
    height: h,
    matrix: {
      a: toFixedNumber(a),
      b: toFixedNumber(b),
      c: toFixedNumber(c),
      d: toFixedNumber(d),
      tx: 0,
      ty: 0,
    },
  };
}

function deriveAffineTargetCorners(corners) {
  const tl = corners.tl;
  const tr = corners.tr;
  const bl = corners.bl;
  const br = {
    x: tr.x + bl.x - tl.x,
    y: tr.y + bl.y - tl.y,
  };
  return { tl, tr, br, bl };
}

function buildTransformCss(transform) {
  const p = transform.panel;
  const s = transform.shadow;
  return `:root {
  --panel-left: ${p.left};
  --panel-top: ${p.top};
  --panel-width: ${p.width};
  --panel-height: ${p.height};
  --panel-a: ${p.matrix.a};
  --panel-b: ${p.matrix.b};
  --panel-c: ${p.matrix.c};
  --panel-d: ${p.matrix.d};
  --panel-before-left: ${s.dx};
  --panel-before-top: ${s.dy};
  --panel-before-border-alpha: ${s.border_alpha};
  --panel-before-shadow-alpha: ${s.shadow_alpha};
}
`;
}

function main() {
  const png = readPng(BASELINE_IMAGE);
  const geometry = detectPanelGeometry(png, DEFAULT_ROI);
  const panelTransform = deriveAffineFromCorners(geometry.outer_corners, SOURCE_RECT);
  const affineTargetCorners = deriveAffineTargetCorners(geometry.outer_corners);
  const affineBrResidual = Math.hypot(
    geometry.outer_corners.br.x - affineTargetCorners.br.x,
    geometry.outer_corners.br.y - affineTargetCorners.br.y
  );

  const baseline = {
    version: 1,
    source: path.relative(ROOT, BASELINE_IMAGE).replace(/\\/g, '/'),
    roi: DEFAULT_ROI,
    source_rect: SOURCE_RECT,
    panel_bbox: geometry.panel_bbox,
    outer_corners: geometry.outer_corners,
    affine_target_corners: affineTargetCorners,
    inner_corners: geometry.inner_corners,
    shadow_offset: { dx: 8, dy: 6 },
    affine_residual_br_px: Number(affineBrResidual.toFixed(3)),
    fit: geometry.fit,
  };

  const transform = {
    version: 1,
    generated_from: path.relative(ROOT, BASELINE_JSON).replace(/\\/g, '/'),
    panel: panelTransform,
    shadow: {
      dx: 8,
      dy: 6,
      border_alpha: 0.16,
      shadow_alpha: 0.11,
    },
  };

  fs.mkdirSync(path.dirname(BASELINE_JSON), { recursive: true });
  fs.writeFileSync(BASELINE_JSON, `${JSON.stringify(baseline, null, 2)}\n`);
  fs.writeFileSync(TRANSFORM_JSON, `${JSON.stringify(transform, null, 2)}\n`);
  fs.writeFileSync(TRANSFORM_CSS, buildTransformCss(transform));

  console.log(`Wrote ${path.relative(ROOT, BASELINE_JSON)}`);
  console.log(`Wrote ${path.relative(ROOT, TRANSFORM_JSON)}`);
  console.log(`Wrote ${path.relative(ROOT, TRANSFORM_CSS)}`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
