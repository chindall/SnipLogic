/**
 * make-icons.cjs — generates SnipLogic logo PNG icons for the browser extension.
 * Replicates the SVG logo mark from Sidebar.tsx: 4 rounded squares, 2×2 grid,
 * blue (#3b82f6) at fading opacities on dark (#0f172a) background.
 * Pure Node.js (fs + zlib only — no npm deps).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'icons');

// Brand colors from design system
const COLOR = { r: 59,  g: 130, b: 246 }; // #3b82f6 (blue-500)
const BG    = { r: 15,  g: 23,  b: 42  }; // #0f172a (sidebar-bg)

// SVG rect definitions (24×24 viewBox, matching Sidebar.tsx exactly)
const SVG_RECTS = [
  { x: 3,  y: 3,  w: 7, h: 7, r: 1.5, opacity: 1.0 }, // top-left    — full
  { x: 14, y: 3,  w: 7, h: 7, r: 1.5, opacity: 0.6 }, // top-right   — 60%
  { x: 3,  y: 14, w: 7, h: 7, r: 1.5, opacity: 0.6 }, // bottom-left — 60%
  { x: 14, y: 14, w: 7, h: 7, r: 1.5, opacity: 0.3 }, // bottom-right— 30%
];

// ── PNG helpers ──────────────────────────────────────────────────────────────

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  return Buffer.concat([
    uint32be(data.length),
    typeBuf,
    data,
    uint32be(crc32(Buffer.concat([typeBuf, data]))),
  ]);
}

// ── Rounded-rect hit test with 4× supersampling for anti-aliasing ────────────

function inRect(px, py, rx, ry, rw, rh, rr) {
  if (px < rx || px > rx + rw || py < ry || py > ry + rh) return false;
  // Corner zones
  const nearLeft  = px < rx + rr;
  const nearRight = px > rx + rw - rr;
  const nearTop   = py < ry + rr;
  const nearBot   = py > ry + rh - rr;
  if ((nearLeft || nearRight) && (nearTop || nearBot)) {
    const cx = nearLeft  ? rx + rr       : rx + rw - rr;
    const cy = nearTop   ? ry + rr       : ry + rh - rr;
    return (px - cx) ** 2 + (py - cy) ** 2 <= rr * rr;
  }
  return true;
}

/** Returns coverage [0..1] of a pixel center (px+0.5, py+0.5) via 4×4 supersampling. */
function coverage(px, py, rx, ry, rw, rh, rr) {
  let hits = 0;
  const N = 4;
  for (let sy = 0; sy < N; sy++) {
    for (let sx = 0; sx < N; sx++) {
      const spx = px + (sx + 0.5) / N;
      const spy = py + (sy + 0.5) / N;
      if (inRect(spx, spy, rx, ry, rw, rh, rr)) hits++;
    }
  }
  return hits / (N * N);
}

// ── PNG generator ─────────────────────────────────────────────────────────────

function makePng(size) {
  const scale = size / 24;
  const rects = SVG_RECTS.map(r => ({
    x: r.x * scale, y: r.y * scale,
    w: r.w * scale, h: r.h * scale,
    r: r.r * scale, opacity: r.opacity,
  }));

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB (dark bg fills transparent areas)

  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);

  for (let py = 0; py < size; py++) {
    const rowOff = py * rowSize;
    raw[rowOff] = 0; // filter: None
    for (let px = 0; px < size; px++) {
      // Start with background
      let fr = BG.r, fg = BG.g, fb = BG.b;

      for (const rect of rects) {
        const cov = coverage(px, py, rect.x, rect.y, rect.w, rect.h, rect.r);
        if (cov === 0) continue;
        // Alpha-composite: rect colour over current pixel
        const alpha = rect.opacity * cov;
        fr = Math.round(COLOR.r * alpha + fr * (1 - alpha));
        fg = Math.round(COLOR.g * alpha + fg * (1 - alpha));
        fb = Math.round(COLOR.b * alpha + fb * (1 - alpha));
      }

      const off = rowOff + 1 + px * 3;
      raw[off]     = fr;
      raw[off + 1] = fg;
      raw[off + 2] = fb;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdrData), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Generate ──────────────────────────────────────────────────────────────────

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of [16, 48, 128]) {
  const filePath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(filePath, makePng(size));
  console.log(`Generated ${filePath} (${size}×${size})`);
}
