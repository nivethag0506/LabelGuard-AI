import sharp from 'sharp';
import fs from 'fs';

/**
 * Image Quality Assessment Service for LegalScan
 * Analyzes resolution, lighting (darkness), glare (overexposure), and blur (edge gradient)
 */
export const checkImageQuality = async (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return {
      isAcceptable: false,
      qualityLevel: 'LOW QUALITY',
      score: 0,
      reasons: ['Image file not found or corrupted'],
      details: {}
    };
  }

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const stats = await image.stats();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const reasons = [];

    // 1. Resolution Check
    if (width < 400 || height < 400) {
      reasons.push('Resolution too low (text will be difficult to resolve)');
    }

    // 2. Brightness Check
    const channelMeans = stats.channels.map(c => c.mean);
    const avgBrightness = channelMeans.reduce((a, b) => a + b, 0) / (channelMeans.length || 1);

    if (avgBrightness < 32) {
      reasons.push('Too dark (insufficient lighting on packaging declarations)');
    }

    // 3. Glare Check (Reflections & Highlight Clipping)
    const isOverexposed = avgBrightness > 235;
    const clippedChannels = stats.channels.filter(c => c.max >= 254).length;
    if (isOverexposed || (clippedChannels >= 2 && avgBrightness > 205)) {
      reasons.push('Too much glare (surface reflection or foil shine obscuring text)');
    }

    // 4. Blur / Sharpness Estimation
    const buffer = await sharp(filePath)
      .resize(256, 256, { fit: 'inside' })
      .greyscale()
      .raw()
      .toBuffer();

    let edgeSum = 0;
    const len = buffer.length;
    for (let i = 0; i < len - 1; i++) {
      const diff = Math.abs(buffer[i] - buffer[i + 1]);
      edgeSum += diff;
    }
    const avgGradient = edgeSum / (len || 1);

    if (avgGradient < 3.8) {
      reasons.push('Too blurry (camera out of focus or motion blur detected)');
    }

    const isAcceptable = reasons.length === 0;
    const qualityLevel = isAcceptable ? 'GOOD' : 'LOW QUALITY';
    const score = Math.max(25, Math.round(100 - reasons.length * 25));

    return {
      isAcceptable,
      qualityLevel,
      score,
      reasons,
      details: {
        width,
        height,
        avgBrightness: Math.round(avgBrightness),
        avgGradient: Number(avgGradient.toFixed(2)),
        format: metadata.format
      }
    };
  } catch (err) {
    console.warn('[ImageQuality Error]:', err.message);
    return {
      isAcceptable: false,
      qualityLevel: 'LOW QUALITY',
      score: 25,
      reasons: ['Image could not be processed (file may be corrupt, too small, or unsupported format)'],
      details: { error: err.message }
    };
  }
};
