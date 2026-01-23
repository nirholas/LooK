import { join, dirname } from 'path';
import { mkdir, writeFile, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execAsync = promisify(exec);

/**
 * DeviceFrameRenderer - Add device frames around mobile recordings
 * Creates professional App Store / Play Store ready videos
 */
export class DeviceFrameRenderer {
  constructor(options = {}) {
    this.frameStyle = options.frameStyle || 'modern';  // modern, minimal, none
    this.backgroundColor = options.backgroundColor || '#1a1a2e';
    this.shadowEnabled = options.shadowEnabled !== false;
    this.reflectionEnabled = options.reflectionEnabled || false;
  }

  // Device specifications for frame rendering
  static DEVICES = {
    // iOS Devices
    'iPhone 15 Pro': {
      screenWidth: 1179,
      screenHeight: 2556,
      frameWidth: 1290,
      frameHeight: 2796,
      cornerRadius: 55,
      notchWidth: 126,
      notchHeight: 37,
      bezelColor: '#1c1c1e',
      islandStyle: 'dynamic-island'
    },
    'iPhone 15 Pro Max': {
      screenWidth: 1290,
      screenHeight: 2796,
      frameWidth: 1404,
      frameHeight: 3048,
      cornerRadius: 60,
      notchWidth: 126,
      notchHeight: 37,
      bezelColor: '#1c1c1e',
      islandStyle: 'dynamic-island'
    },
    'iPhone 15': {
      screenWidth: 1179,
      screenHeight: 2556,
      frameWidth: 1284,
      frameHeight: 2778,
      cornerRadius: 50,
      notchWidth: 210,
      notchHeight: 30,
      bezelColor: '#f5f5f7',
      islandStyle: 'notch'
    },
    'iPhone 14': {
      screenWidth: 1170,
      screenHeight: 2532,
      frameWidth: 1284,
      frameHeight: 2778,
      cornerRadius: 47,
      notchWidth: 210,
      notchHeight: 30,
      bezelColor: '#1c1c1e',
      islandStyle: 'notch'
    },
    'iPhone SE': {
      screenWidth: 750,
      screenHeight: 1334,
      frameWidth: 850,
      frameHeight: 1700,
      cornerRadius: 0,
      bezelColor: '#1c1c1e',
      islandStyle: 'none',
      homeButton: true
    },
    'iPad Pro 12.9': {
      screenWidth: 2048,
      screenHeight: 2732,
      frameWidth: 2200,
      frameHeight: 2932,
      cornerRadius: 40,
      bezelColor: '#1c1c1e',
      islandStyle: 'none'
    },
    'iPad Pro 11': {
      screenWidth: 1668,
      screenHeight: 2388,
      frameWidth: 1820,
      frameHeight: 2588,
      cornerRadius: 35,
      bezelColor: '#1c1c1e',
      islandStyle: 'none'
    },
    
    // Android Devices
    'Pixel 8 Pro': {
      screenWidth: 1344,
      screenHeight: 2992,
      frameWidth: 1440,
      frameHeight: 3200,
      cornerRadius: 45,
      bezelColor: '#202124',
      islandStyle: 'punch-hole',
      punchHoleX: 672,
      punchHoleY: 80,
      punchHoleRadius: 20
    },
    'Pixel 8': {
      screenWidth: 1080,
      screenHeight: 2400,
      frameWidth: 1170,
      frameHeight: 2600,
      cornerRadius: 40,
      bezelColor: '#202124',
      islandStyle: 'punch-hole',
      punchHoleX: 540,
      punchHoleY: 70,
      punchHoleRadius: 18
    },
    'Pixel 7': {
      screenWidth: 1080,
      screenHeight: 2400,
      frameWidth: 1170,
      frameHeight: 2600,
      cornerRadius: 38,
      bezelColor: '#202124',
      islandStyle: 'punch-hole'
    },
    'Samsung Galaxy S24': {
      screenWidth: 1080,
      screenHeight: 2340,
      frameWidth: 1170,
      frameHeight: 2540,
      cornerRadius: 42,
      bezelColor: '#1a1a1a',
      islandStyle: 'punch-hole'
    },
    'Samsung Galaxy S24 Ultra': {
      screenWidth: 1440,
      screenHeight: 3120,
      frameWidth: 1550,
      frameHeight: 3340,
      cornerRadius: 48,
      bezelColor: '#1a1a1a',
      islandStyle: 'punch-hole'
    },
    
    // Generic fallbacks
    'Generic Phone': {
      screenWidth: 1080,
      screenHeight: 1920,
      frameWidth: 1170,
      frameHeight: 2120,
      cornerRadius: 30,
      bezelColor: '#2d2d2d',
      islandStyle: 'none'
    },
    'Generic Tablet': {
      screenWidth: 1600,
      screenHeight: 2560,
      frameWidth: 1750,
      frameHeight: 2760,
      cornerRadius: 25,
      bezelColor: '#2d2d2d',
      islandStyle: 'none'
    }
  };

  /**
   * Get device specs, with fallback to generic
   */
  getDeviceSpecs(deviceName) {
    // Try exact match first
    if (DeviceFrameRenderer.DEVICES[deviceName]) {
      return DeviceFrameRenderer.DEVICES[deviceName];
    }
    
    // Try partial match
    const lowerName = deviceName.toLowerCase();
    for (const [name, specs] of Object.entries(DeviceFrameRenderer.DEVICES)) {
      if (lowerName.includes(name.toLowerCase()) || name.toLowerCase().includes(lowerName)) {
        return specs;
      }
    }
    
    // Fallback based on device type
    if (lowerName.includes('ipad') || lowerName.includes('tablet')) {
      return DeviceFrameRenderer.DEVICES['Generic Tablet'];
    }
    
    return DeviceFrameRenderer.DEVICES['Generic Phone'];
  }

  /**
   * Generate a device frame SVG
   */
  generateFrameSVG(deviceName, width, height) {
    const specs = this.getDeviceSpecs(deviceName);
    const scale = Math.min(width / specs.frameWidth, height / specs.frameHeight);
    
    const frameW = specs.frameWidth * scale;
    const frameH = specs.frameHeight * scale;
    const screenW = specs.screenWidth * scale;
    const screenH = specs.screenHeight * scale;
    const cornerR = specs.cornerRadius * scale;
    
    const offsetX = (frameW - screenW) / 2;
    const offsetY = (frameH - screenH) / 2;
    
    let svg = `<svg width="${frameW}" height="${frameH}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svg += `<rect width="100%" height="100%" fill="${this.backgroundColor}"/>`;
    
    // Device shadow
    if (this.shadowEnabled) {
      svg += `
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="15" stdDeviation="25" flood-color="rgba(0,0,0,0.4)"/>
          </filter>
        </defs>
      `;
    }
    
    // Device bezel (outer frame)
    svg += `
      <rect x="${offsetX - 10}" y="${offsetY - 10}" 
            width="${screenW + 20}" height="${screenH + 20}"
            rx="${cornerR + 5}" ry="${cornerR + 5}"
            fill="${specs.bezelColor}"
            ${this.shadowEnabled ? 'filter="url(#shadow)"' : ''}/>
    `;
    
    // Screen cutout (will be replaced with video)
    svg += `
      <rect id="screen" x="${offsetX}" y="${offsetY}" 
            width="${screenW}" height="${screenH}"
            rx="${cornerR}" ry="${cornerR}"
            fill="#000"/>
    `;
    
    // Dynamic Island / Notch / Punch Hole
    if (specs.islandStyle === 'dynamic-island') {
      const islandW = specs.notchWidth * scale;
      const islandH = specs.notchHeight * scale;
      const islandX = offsetX + (screenW - islandW) / 2;
      const islandY = offsetY + 15 * scale;
      
      svg += `
        <rect x="${islandX}" y="${islandY}" 
              width="${islandW}" height="${islandH}"
              rx="${islandH / 2}" ry="${islandH / 2}"
              fill="#000"/>
      `;
    } else if (specs.islandStyle === 'notch') {
      const notchW = specs.notchWidth * scale;
      const notchH = specs.notchHeight * scale;
      const notchX = offsetX + (screenW - notchW) / 2;
      
      svg += `
        <path d="M ${notchX} ${offsetY} 
                 Q ${notchX} ${offsetY + notchH} ${notchX + notchH} ${offsetY + notchH}
                 L ${notchX + notchW - notchH} ${offsetY + notchH}
                 Q ${notchX + notchW} ${offsetY + notchH} ${notchX + notchW} ${offsetY}
                 Z"
              fill="${specs.bezelColor}"/>
      `;
    } else if (specs.islandStyle === 'punch-hole' && specs.punchHoleX) {
      const holeX = specs.punchHoleX * scale + offsetX;
      const holeY = specs.punchHoleY * scale + offsetY;
      const holeR = (specs.punchHoleRadius || 15) * scale;
      
      svg += `<circle cx="${holeX}" cy="${holeY}" r="${holeR}" fill="#000"/>`;
    }
    
    // Home button for older devices
    if (specs.homeButton) {
      const btnSize = 60 * scale;
      const btnX = offsetX + (screenW - btnSize) / 2;
      const btnY = offsetY + screenH + 25 * scale;
      
      svg += `
        <circle cx="${btnX + btnSize/2}" cy="${btnY + btnSize/2}" r="${btnSize/2}"
                fill="none" stroke="#666" stroke-width="2"/>
      `;
    }
    
    svg += '</svg>';
    
    return {
      svg,
      screenOffset: { x: offsetX, y: offsetY },
      screenSize: { width: screenW, height: screenH },
      frameSize: { width: frameW, height: frameH }
    };
  }

  /**
   * Add device frame to a video
   */
  async addFrameToVideo(videoPath, deviceName, outputPath, options = {}) {
    const {
      outputWidth = 1920,
      outputHeight = 1080,
      padding = 50
    } = options;

    const specs = this.getDeviceSpecs(deviceName);
    
    // Calculate scaling to fit device in output with padding
    const availableWidth = outputWidth - (padding * 2);
    const availableHeight = outputHeight - (padding * 2);
    const deviceAspect = specs.frameWidth / specs.frameHeight;
    const availableAspect = availableWidth / availableHeight;
    
    let deviceWidth, deviceHeight;
    if (deviceAspect > availableAspect) {
      deviceWidth = availableWidth;
      deviceHeight = availableWidth / deviceAspect;
    } else {
      deviceHeight = availableHeight;
      deviceWidth = availableHeight * deviceAspect;
    }
    
    const offsetX = (outputWidth - deviceWidth) / 2;
    const offsetY = (outputHeight - deviceHeight) / 2;
    
    // Calculate screen position within device
    const bezelRatio = (specs.frameWidth - specs.screenWidth) / (2 * specs.frameWidth);
    const screenX = offsetX + deviceWidth * bezelRatio;
    const screenY = offsetY + deviceHeight * bezelRatio;
    const screenWidth = deviceWidth * (specs.screenWidth / specs.frameWidth);
    const screenHeight = deviceHeight * (specs.screenHeight / specs.frameHeight);

    // Generate device frame image
    const { svg } = this.generateFrameSVG(deviceName, deviceWidth, deviceHeight);
    const framePath = outputPath.replace(/\.[^.]+$/, '_frame.png');
    
    await sharp(Buffer.from(svg))
      .resize(Math.round(deviceWidth), Math.round(deviceHeight))
      .png()
      .toFile(framePath);

    // Create FFmpeg filter to composite video into frame
    const filterComplex = `
      [0:v]scale=${Math.round(screenWidth)}:${Math.round(screenHeight)}:force_original_aspect_ratio=decrease,pad=${Math.round(screenWidth)}:${Math.round(screenHeight)}:(ow-iw)/2:(oh-ih)/2[scaled];
      color=c=${this.backgroundColor}:s=${outputWidth}x${outputHeight}:d=1[bg];
      [bg][1:v]overlay=${Math.round(offsetX)}:${Math.round(offsetY)}[frame];
      [frame][scaled]overlay=${Math.round(screenX)}:${Math.round(screenY)}
    `.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

    const cmd = `ffmpeg -y -i "${videoPath}" -i "${framePath}" \
      -filter_complex "${filterComplex}" \
      -c:v libx264 -preset fast -crf 18 \
      -c:a copy \
      "${outputPath}"`;

    await execAsync(cmd, { timeout: 300000 });
    
    // Clean up frame image
    try {
      await execAsync(`rm "${framePath}"`);
    } catch (e) {
      // Ignore cleanup errors
    }

    return outputPath;
  }

  /**
   * Generate a static device mockup image
   */
  async generateMockup(screenshotPath, deviceName, outputPath, options = {}) {
    const {
      width = 1200,
      height = 800,
      backgroundColor = this.backgroundColor
    } = options;

    const specs = this.getDeviceSpecs(deviceName);
    const { svg, screenOffset, screenSize, frameSize } = this.generateFrameSVG(deviceName, width * 0.8, height * 0.9);
    
    // Create base with device frame
    const frameBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();
    
    // Load and resize screenshot
    const screenshot = await sharp(screenshotPath)
      .resize(Math.round(screenSize.width), Math.round(screenSize.height), {
        fit: 'cover'
      })
      .png()
      .toBuffer();
    
    // Composite screenshot into frame
    const offsetX = Math.round((width - frameSize.width) / 2);
    const offsetY = Math.round((height - frameSize.height) / 2);
    
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: backgroundColor
      }
    })
      .composite([
        {
          input: frameBuffer,
          left: offsetX,
          top: offsetY
        },
        {
          input: screenshot,
          left: offsetX + Math.round(screenOffset.x),
          top: offsetY + Math.round(screenOffset.y)
        }
      ])
      .png()
      .toFile(outputPath);

    return outputPath;
  }
}

/**
 * Get list of supported devices
 */
export function getSupportedDevices() {
  return Object.keys(DeviceFrameRenderer.DEVICES);
}

export default DeviceFrameRenderer;
