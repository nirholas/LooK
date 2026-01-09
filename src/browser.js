import puppeteer from 'puppeteer';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

export async function recordBrowser(url, options = {}) {
  const {
    duration = 15,
    width = 1280,
    height = 720,
    scrollSpeed = 100
  } = options;

  // Create temp directory for frames
  const tempDir = join(tmpdir(), `repovideo-browser-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=${width},${height}`
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height });

  // Navigate to URL
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for page to settle
  await sleep(1000);

  // Get page height for scrolling
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = height;
  const scrollDistance = pageHeight - viewportHeight;

  // Calculate frames needed
  const fps = 30;
  const totalFrames = duration * fps;
  const scrollPerFrame = scrollDistance > 0 ? scrollDistance / (totalFrames * 0.7) : 0; // Use 70% of video for scrolling

  // Capture frames
  let currentScroll = 0;
  const frameFiles = [];

  for (let i = 0; i < totalFrames; i++) {
    const framePath = join(tempDir, `frame-${String(i).padStart(5, '0')}.png`);
    
    // Scroll if we haven't reached the bottom
    if (i > totalFrames * 0.15 && i < totalFrames * 0.85 && currentScroll < scrollDistance) {
      currentScroll = Math.min(currentScroll + scrollPerFrame, scrollDistance);
      await page.evaluate((y) => window.scrollTo(0, y), currentScroll);
      await sleep(10); // Small delay for scroll to render
    }

    await page.screenshot({ path: framePath });
    frameFiles.push(framePath);
  }

  await browser.close();

  // Combine frames into video using ffmpeg
  const outputPath = join(tempDir, 'browser-demo.mp4');
  
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', join(tempDir, 'frame-%05d.png'),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });

    ffmpeg.on('error', reject);
  });

  return {
    videoPath: outputPath,
    tempDir
  };
}

export async function screenshotPage(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Get full page screenshot as base64
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  // Get page title and meta description
  const metadata = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    h1: document.querySelector('h1')?.textContent || ''
  }));

  await browser.close();

  return {
    screenshot,
    metadata
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
