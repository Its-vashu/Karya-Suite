const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = './assets/images/icon.png';
const resDir = './android/app/src/main/res';

const sizes = {
  'mipmap-mdpi': { size: 48, foreground: 108 },
  'mipmap-hdpi': { size: 72, foreground: 162 },
  'mipmap-xhdpi': { size: 96, foreground: 216 },
  'mipmap-xxhdpi': { size: 144, foreground: 324 },
  'mipmap-xxxhdpi': { size: 192, foreground: 432 }
};

async function generateIcons() {
  console.log('Generating launcher icons...');
  
  for (const [folder, { size, foreground }] of Object.entries(sizes)) {
    const dir = path.join(resDir, folder);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Generate ic_launcher.png
    await sharp(inputImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    
    // Generate ic_launcher_round.png
    await sharp(inputImage)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
    
    // Generate ic_launcher_foreground.png (adaptive icon)
    await sharp(inputImage)
      .resize(foreground, foreground, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    
    console.log(`✓ Generated icons for ${folder}`);
  }
  
  console.log('\n✅ All launcher icons generated successfully!');
}

generateIcons().catch(console.error);
