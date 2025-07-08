const sharp = require('sharp');
const fs = require('fs');

const inputSvg = './public/bird.svg';
const output192 = './public/icon-192x192.png';
const output512 = './public/icon-512x512.png';

async function convert() {
  try {
    const svgBuffer = fs.readFileSync(inputSvg);
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(output192);
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(output512);
    console.log('PNG icons generated successfully.');
  } catch (err) {
    console.error('Error generating PNGs:', err);
  }
}

convert();
