import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export async function recordWithPlaywright(url, actions = [], options = {}) {
  const {
    width = 1280,
    height = 720,
    timeout = 30000
  } = options;

  const tempDir = join(tmpdir(), `repovideo-pw-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const videoPath = join(tempDir, 'recording.webm');
  const clickLog = []; // Track clicks for zoom post-processing

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: tempDir,
      size: { width, height }
    }
  });

  const page = await context.newPage();

  // Track all clicks for zoom effects
  page.on('click', () => {
    // This doesn't give us coordinates, we'll track in actions
  });

  try {
    // Navigate
    await page.goto(url, { waitUntil: 'networkidle', timeout });
    await sleep(1000);

    // Execute actions and log positions
    for (const action of actions) {
      const timestamp = Date.now();
      
      if (action.type === 'click') {
        const element = await page.$(action.selector);
        if (element) {
          const box = await element.boundingBox();
          if (box) {
            clickLog.push({
              timestamp,
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
              action: 'click'
            });
          }
          await element.click();
          await sleep(action.wait || 1000);
        }
      } else if (action.type === 'scroll') {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), action.y || 500);
        await sleep(action.wait || 1000);
      } else if (action.type === 'hover') {
        const element = await page.$(action.selector);
        if (element) {
          const box = await element.boundingBox();
          if (box) {
            clickLog.push({
              timestamp,
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
              action: 'hover'
            });
          }
          await element.hover();
          await sleep(action.wait || 500);
        }
      } else if (action.type === 'wait') {
        await sleep(action.duration || 2000);
      } else if (action.type === 'type') {
        await page.type(action.selector, action.text, { delay: 50 });
        await sleep(action.wait || 500);
      }
    }

    // Final pause
    await sleep(2000);

  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  // Find the recorded video file
  const { readdir } = await import('fs/promises');
  const files = await readdir(tempDir);
  const videoFile = files.find(f => f.endsWith('.webm'));
  
  return {
    videoPath: join(tempDir, videoFile),
    clickLog,
    tempDir
  };
}

export async function smartScroll(url, options = {}) {
  const {
    width = 1280,
    height = 720,
    duration = 15, // seconds
    pauseAtSections = true
  } = options;

  const tempDir = join(tmpdir(), `repovideo-scroll-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tempDir, size: { width, height } }
  });

  const page = await context.newPage();
  const clickLog = [];

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000); // Initial pause

    // Get page info
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = height;

    // Find interesting sections to pause at
    const sections = await page.evaluate(() => {
      const elements = [];
      // Look for headings, buttons, important sections
      document.querySelectorAll('h1, h2, h3, button, [class*="hero"], [class*="feature"], [class*="cta"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        elements.push({
          y: rect.top + window.scrollY,
          text: el.textContent?.slice(0, 50),
          tag: el.tagName
        });
      });
      return elements.filter(e => e.y > 100).slice(0, 8); // Top 8 sections
    });

    // Calculate scroll plan
    const scrollDuration = duration * 1000; // ms
    const scrollDistance = pageHeight - viewportHeight;
    
    if (pauseAtSections && sections.length > 0) {
      // Scroll to each section, pause, continue
      for (const section of sections) {
        clickLog.push({
          timestamp: Date.now(),
          x: width / 2,
          y: Math.min(section.y, viewportHeight / 2),
          action: 'focus'
        });
        
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), 
          Math.max(0, section.y - viewportHeight / 3));
        await sleep(2000); // Pause at each section
      }
    } else {
      // Smooth continuous scroll
      const steps = 30;
      const stepDistance = scrollDistance / steps;
      const stepDelay = scrollDuration / steps;

      for (let i = 0; i <= steps; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), i * stepDistance);
        await sleep(stepDelay);
      }
    }

    await sleep(2000); // Final pause

  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  const { readdir } = await import('fs/promises');
  const files = await readdir(tempDir);
  const videoFile = files.find(f => f.endsWith('.webm'));

  return {
    videoPath: join(tempDir, videoFile),
    clickLog,
    tempDir
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
