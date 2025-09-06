const path = require('path');
const fs = require('fs');

const relPath = process.argv[2];
if (!relPath) {
  console.error('Usage: node tools/buildAtlas.js <folder (e.g. public/qte/ninja) >');
  process.exit(1);
}
const srcDir = path.resolve(__dirname, '..', relPath);
if (!fs.existsSync(srcDir)) {
  console.error('Folder not found:', srcDir);
  process.exit(1);
}
const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.png') && !f.includes('atlas'));

// Simple grid-based packing
const frameSize = 256;
const padding = 4;
const atlasWidth = 2048;
const atlasHeight = 2048;
const framesPerRow = Math.floor(atlasWidth / (frameSize + padding));

// Parse sprite sheets and create frame data
const allFrames = [];
files.forEach(file => {
  const match = file.match(/^(.+)_(\d+)x(\d+)_(\d+)\.png$/);
  if (match) {
    const [, name, width, height, count] = match;
    const w = parseInt(width);
    const h = parseInt(height);
    const frameCount = parseInt(count);

    console.log(`Processing ${file}: ${name}, ${w}x${h}, ${frameCount} frames`);

    // For each frame in the sprite sheet
    for (let i = 0; i < frameCount; i++) {
      allFrames.push({
        name: `${name}_${i}`,
        width: w,
        height: h
      });
    }
  } else {
    console.log(`Skipping ${file} - doesn't match pattern`);
  }
});

// Create atlas JSON with simple grid layout
const atlasJson = {
  frames: {},
  meta: {
    app: "custom-atlas-builder",
    version: "1.0",
    image: "atlas.png",
    format: "RGBA8888",
    size: { w: atlasWidth, h: atlasHeight },
    scale: "1"
  }
};

// Place frames in grid
allFrames.forEach((frame, index) => {
  const row = Math.floor(index / framesPerRow);
  const col = index % framesPerRow;
  const x = col * (frameSize + padding);
  const y = row * (frameSize + padding);

  atlasJson.frames[frame.name] = {
    frame: {
      x: x,
      y: y,
      w: frame.width,
      h: frame.height
    },
    rotated: false,
    trimmed: false,
    spriteSourceSize: {
      x: 0,
      y: 0,
      w: frame.width,
      h: frame.height
    },
    sourceSize: {
      w: frame.width,
      h: frame.height
    }
  };
});

// Write atlas.json
fs.writeFileSync(path.join(srcDir, 'atlas.json'), JSON.stringify(atlasJson, null, 2));
console.log(`Written atlas.json with ${allFrames.length} frames`);

// Create atlas.png with actual sprite frames
const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;

(async () => {
  const atlasCanvas = createCanvas(atlasWidth, atlasHeight);
  const ctx = atlasCanvas.getContext('2d');

  // Fill with transparent background
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);

  let frameIndex = 0;

  // Process each sprite sheet file
  for (const file of files) {
    const match = file.match(/^(.+)_(\d+)x(\d+)_(\d+)\.png$/);
    if (match) {
      const [, name, width, height, count] = match;
      const w = parseInt(width);
      const h = parseInt(height);
      const frameCount = parseInt(count);

      try {
        // Load the sprite sheet image
        const imagePath = path.join(srcDir, file);
        const spriteSheet = await loadImage(imagePath);

        // Extract each frame from the sprite sheet
        for (let i = 0; i < frameCount; i++) {
          const row = Math.floor(frameIndex / framesPerRow);
          const col = frameIndex % framesPerRow;
          const x = col * (frameSize + padding);
          const y = row * (frameSize + padding);

          // Draw the frame from the sprite sheet to the atlas
          ctx.drawImage(
            spriteSheet,
            i * w, 0, w, h,  // source: frame i from sprite sheet
            x, y, w, h       // destination: position in atlas
          );

          frameIndex++;
        }

        console.log(`Composited ${file} (${frameCount} frames)`);
      } catch (error) {
        console.error(`Failed to load ${file}:`, error.message);
      }
    }
  }

  const buffer = atlasCanvas.toBuffer('image/png');
  fs.writeFileSync(path.join(srcDir, 'atlas.png'), buffer);
  console.log(`Written atlas.png with ${frameIndex} actual sprite frames`);
  console.log('Atlas generated in', srcDir);
})().catch(console.error);
