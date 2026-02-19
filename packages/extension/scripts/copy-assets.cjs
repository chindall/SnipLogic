/**
 * copy-assets.cjs — copies static extension assets into dist/ after tsc.
 * Run via: node scripts/copy-assets.cjs  (or as part of npm run build)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Skipped (missing): ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else copyFile(srcPath, destPath);
  }
}

// Static files to copy
copyFile(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));
copyFile(path.join(ROOT, 'popup.html'),    path.join(DIST, 'popup.html'));
copyFile(path.join(ROOT, 'popup.css'),     path.join(DIST, 'popup.css'));

// Icons directory
copyDir(path.join(ROOT, 'icons'), path.join(DIST, 'icons'));

console.log('Assets copied to dist/');
