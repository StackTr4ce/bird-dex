// This script uses sharp to generate transparent PNG icons for PWA from bird.svg
// Usage: node scripts/generate-pwa-icons.cjs

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/bird.svg');
const out192 = path.join(__dirname, '../public/icon-192x192.png');
const out512 = path.join(__dirname, '../public/icon-512x512.png');

async function generateIcon(size, outPath) {
  const svg = fs.readFileSync(svgPath, 'utf8');
  // Remove any <rect ...> background for transparency
  const svgNoBg = svg.replace(/<rect[^>]*>/g, '');
  await sharp(Buffer.from(svgNoBg))
    .resize(size, size)
    .png({ quality: 100, compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outPath);
  console.log(`Generated ${outPath}`);
}

(async () => {
  await generateIcon(192, out192);
  await generateIcon(512, out512);
})();
