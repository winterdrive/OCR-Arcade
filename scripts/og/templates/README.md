# OG Template Calibration Notes

This template keeps the right preview panel geometry aligned with `public/og-ocr-arcade.png`.

## Files

- `panel-geometry.baseline.json`: detected baseline geometry (outer/inner corners, bbox).
- `panel-transform.json`: affine parameters derived from baseline corners.
- `panel-transform.css`: CSS variables consumed by `style.css`.

## Commands

- `npm run og:calibrate`: detect baseline geometry and regenerate transform files.
- `npm run og:build`: render `tools/og-template/index.html` into `public/og-ocr-arcade-v2.png`.
- `npm run og:verify-panel`: verify panel corner error and right-panel ROI diff.

## Edit Policy

- You may edit left text content and typography freely.
- Do not hand-edit right panel transform values in `style.css`; they are sourced from `panel-transform.css`.
- If right panel visuals are intentionally changed, rerun calibration and verification.
