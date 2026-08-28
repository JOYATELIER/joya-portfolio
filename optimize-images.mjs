// ============================================================
// Sean Harrison — image optimizer
//
// Converts full-res source photos (any format, any size) into
// web-ready JPEGs: capped at 2400px on the long edge, mozjpeg
// quality 82. Typically cuts a 3MB PNG down to 200-500KB with
// no visible quality loss at web viewing sizes.
//
// Usage:
//   node optimize-images.mjs <source-dir> <dest-dir>
//
// Every file in <source-dir> is written to <dest-dir> with the
// same basename and a .jpg extension. Filenames (including the
// NN-description-c convention build-gallery.mjs reads) pass
// through untouched — only the pixels and file size change.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [, , srcDir, destDir] = process.argv;
if (!srcDir || !destDir){
  console.log('Usage: node optimize-images.mjs <source-dir> <dest-dir>');
  process.exit(1);
}

const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 82;

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter(f => /\.(png|jpe?g|webp|tiff?)$/i.test(f));
if (!files.length){
  console.log(`No images found in ${srcDir}`);
  process.exit(0);
}

let totalBefore = 0, totalAfter = 0;

for (const file of files){
  const srcPath = path.join(srcDir, file);
  const destName = file.replace(/\.(png|jpe?g|webp|tiff?)$/i, '.jpg');
  const destPath = path.join(destDir, destName);

  const before = fs.statSync(srcPath).size;
  await sharp(srcPath)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(destPath);
  const after = fs.statSync(destPath).size;

  totalBefore += before;
  totalAfter += after;
  console.log(`${file} -> ${destName}  ${(before/1024/1024).toFixed(1)}MB -> ${(after/1024).toFixed(0)}KB`);
}

console.log(`\n${files.length} images: ${(totalBefore/1024/1024).toFixed(1)}MB -> ${(totalAfter/1024/1024).toFixed(1)}MB (${Math.round((1 - totalAfter/totalBefore)*100)}% smaller)`);
