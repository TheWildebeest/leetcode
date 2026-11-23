#!/usr/bin/env node
// Modified portrait script that handles large images better
// Resizes image before processing to avoid Vision framework issues

import { $ } from "execa";
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import sharp from 'sharp';

import { dither } from './lib/dither.js';

const SIZE = 192;
const SCALE = 3;
const FACE_SCALE = 2.9;
const HEAD_SCALE = 1.3;
const HEADROOM = 0.08;

const VISION = `
ObjC.import('Vision');
ObjC.import('CoreImage');
ObjC.import('AppKit');

function run([input, output]) {
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(input), $());
  const subject = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;
  const faces = $.VNDetectFaceRectanglesRequest.alloc.init;
  const error = $();
  handler.performRequestsError($([subject, faces]), error);

  const observation = subject.results.firstObject;
  if (observation.isNil()) throw new Error('No person found in the photo');
  const mask = observation.generateScaledMaskForImageForInstancesFromRequestHandlerError(observation.allInstances, handler, error);
  $.NSBitmapImageRep.alloc.initWithCIImage($.CIImage.imageWithCVPixelBuffer(mask))
    .representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
    .writeToFileAtomically(output, true);

  const face = faces.results.firstObject;
  if (face.isNil()) return 'null';
  const { origin, size } = face.boundingBox;
  return JSON.stringify({ x: origin.x, y: origin.y, width: size.width, height: size.height });
}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function cutOut(photo, mask) {
  if (!(await sharp(photo).stats()).isOpaque) {
    await sharp(photo).extractChannel('alpha').toFile(mask);
    return null;
  }
  if (process.platform !== 'darwin') {
    throw new Error('Removing the background needs macOS. Use a PNG with a transparent background instead.');
  }
  let result;
  try {
    result = await $`osascript -l JavaScript -e ${VISION} ${photo} ${mask}`;
  } catch (error) {
    if (error.shortMessage && error.shortMessage.includes('No person found')) {
      throw new Error('No person found in the photo - the image must contain a visible person');
    }
    throw new Error(error.stderr.toString().replace(/^.*Error: /s, '').trim() || error.message);
  }
  if (result.exitCode !== 0) throw new Error(result.stderr.toString().replace(/^.*Error: /s, '').trim());
  return JSON.parse(result.stdout.toString());
}

async function frame(mask, face) {
  const { data, info: { width, height } } = await sharp(mask).grayscale().raw().toBuffer({ resolveWithObject: true });
  const chin = face ? Math.round((1 - face.y) * height) : height;
  const head = { top: height, left: width, right: 0 };
  for (let y = 0; y < chin; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] < 128) continue;
      head.top = Math.min(head.top, y);
      head.left = Math.min(head.left, x);
      head.right = Math.max(head.right, x);
    }
  }

  const faceSize = face ? Math.max(face.width * width, face.height * height) * FACE_SCALE : Infinity;
  const size = Math.round(Math.min(width, height, Math.max(faceSize, (head.right - head.left) * HEAD_SCALE)));
  return {
    left: Math.round(clamp((head.left + head.right - size) / 2, 0, width - size)),
    top: Math.round(clamp(head.top - size * HEADROOM, 0, height - size)),
    width: size,
    height: size,
  };
}

async function createPortrait(input, dir, noResize = false) {
  console.log(dir)
  const photo = join(dir, 'photo.png');
  const mask = join(dir, 'mask.png');
  const output = join(dir, 'output.png');

  // Resize large images to avoid Vision framework issues (unless --no-resize is specified)
  const stats = await sharp(input).stats();
  const maxDimension = 2048;
  let resizedInput = input;
  
  if (!noResize && (stats.width > maxDimension || stats.height > maxDimension)) {
    console.log(`Resizing large image (${stats.width}x${stats.height}) to max ${maxDimension}`);
    resizedInput = join(dir, 'resized.png');
    await sharp(input)
      .resize({ width: maxDimension, height: maxDimension, fit: 'inside' })
      .png()
      .toFile(resizedInput);
  }

  // Convert to PNG
  await sharp(resizedInput).png().toFile(photo);

  // Cut out the foreground
  const face = await cutOut(photo, mask);

  // Frame the portrait
  const frameInfo = await frame(mask, face);
  
  // Get gray and alpha buffers like the original script
  const gray = await sharp(photo)
    .rotate()
    .extract(frameInfo)
    .resize(SIZE, SIZE)
    .flatten({ background: '#fff' })
    .grayscale()
    .raw()
    .toBuffer();
  const alpha = await sharp(mask)
    .extract(frameInfo)
    .resize(SIZE, SIZE)
    .grayscale()
    .raw()
    .toBuffer();
  const inside = Uint8Array.from(alpha, (value) => (value >= 128 ? 1 : 0));

  // Dither the portrait - save to public folder
  const publicDir = join(process.cwd(), 'public');
  const paths = await dither({ gray, inside, width: SIZE, height: SIZE }, SCALE, (style) => join(publicDir, `portrait-${style}.webp`));
  console.log(`Created ${relative(process.cwd(), paths[0])}`);

  // Cleanup temp dir only
  await rm(dir, { recursive: true, force: true });

  return relative(process.cwd(), paths[0]);
}

const dir = await mkdtemp(join(tmpdir(), 'portrait-'));
const args = process.argv.slice(2);
const input = args[0];
const noResize = args.includes('--no-resize');

if (!input) {
  console.error('Usage: node scripts/create-portrait.js <input.jpg> [--no-resize]');
  console.error('  --no-resize  Skip automatic resizing of large images');
  process.exit(1);
}

createPortrait(input, dir, noResize).then(path => {
  console.log(path);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
