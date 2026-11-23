#!/usr/bin/env node
// Helper script to create a transparent PNG from your image
// This script will:
// 1. Convert your JPEG to PNG with transparency
// 2. Optionally remove the background (requires macOS Vision framework)
// 3. Output a transparent PNG ready for portrait:create

import { $ } from "execa";
import sharp from "sharp";

const input = process.argv[2];
const output = process.argv[3] || 'transparent-output.png';

if (!input) {
  console.error('Usage: node scripts/remove-background.js <input.jpg> [output.png]');
  process.exit(1);
}

async function removeBackground(input, output) {
  if (process.platform !== 'darwin') {
    console.log('Not on macOS - creating simple transparent PNG');
    // Just convert to PNG with transparency support
    await sharp(input)
      .ensureAlpha()
      .png()
      .toFile(output);
    console.log(`Created: ${output}`);
    return;
  }

  // On macOS, try to remove background using Vision framework
  console.log('Removing background using macOS Vision framework...');
  
  const tempDir = await $`mktemp -d`.quiet().then(r => r.stdout.trim());
  const tempInput = `${tempDir}/input.png`;
  const tempOutput = `${tempDir}/output.png`;
  
  // Convert input to PNG first
  await sharp(input).png().toFile(tempInput);
  
  // Use Vision framework to create mask
  const VISION = `
ObjC.import('Vision');
ObjC.import('CoreImage');
ObjC.import('AppKit');

function run([input, output]) {
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(input), $());
  const subject = $.VNGenerateForegroundInstanceMaskRequest.alloc.init;
  const error = $();
  handler.performRequestError(subject, error);

  const observation = subject.results.firstObject;
  if (observation.isNil()) {
    // No person found - return full image as mask
    const ciImage = $.CIImage.imageWithCVPixelBuffer(handler.results.firstObject.image.CVPixelBuffer);
    const mask = $.CVPixelBufferCreateWithCIImage($(), ciImage);
    $.NSBitmapImageRep.alloc.initWithCIImage($.CIImage.imageWithCVPixelBuffer(mask))
      .representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
      .writeToFileAtomically(output, true);
    return;
  }
  
  const mask = observation.generateScaledMaskForImageForInstancesFromRequestHandlerError(observation.allInstances, handler, error);
  $.NSBitmapImageRep.alloc.initWithCIImage($.CIImage.imageWithCVPixelBuffer(mask))
    .representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $())
    .writeToFileAtomically(output, true);
}`;

  try {
    await $`osascript -l JavaScript -e ${VISION} ${tempInput} ${tempOutput}`.quiet();
    
    // Apply the mask to create transparent image
    const mask = await sharp(tempOutput).raw().toBuffer({ resolveWithObject: true });
    const original = await sharp(tempInput).raw().toBuffer({ resolveWithObject: true });
    
    // Combine original with mask for transparency
    const result = await sharp({
      create: {
        width: original.info.width,
        height: original.info.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: original.data,
        top: 0,
        left: 0
      },
      {
        input: mask.data,
        applyAlpha: 'blue',
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(output);
    
    console.log(`Created: ${output}`);
    
    // Cleanup
    await $`rm -rf ${tempDir}`.quiet();
  } catch (error) {
    console.log('Background removal failed, creating simple transparent PNG');
    await sharp(input).ensureAlpha().png().toFile(output);
    console.log(`Created: ${output}`);
  }
}

removeBackground(input, output).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
