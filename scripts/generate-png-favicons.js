const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.resolve(__dirname, '..', 'public', 'icons');

async function generate() {
  if (!fs.existsSync(iconsDir)) {
    console.error('icons directory not found:', iconsDir);
    process.exit(1);
  }

  const svgPath = path.join(iconsDir, 'icon-512.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('512 SVG icon not found at', svgPath);
    process.exit(1);
  }

  for (const size of sizes) {
    const outName = size <= 32 ? `favicon-${size}x${size}.png` : `icon-${size}.png`;
    const outPath = path.join(iconsDir, outName);

    try {
      await sharp(svgPath)
        .resize(size, size, { fit: 'contain' })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Written', outPath);
    } catch (err) {
      console.error('Error generating', outPath, err);
    }
  }
}

generate();
