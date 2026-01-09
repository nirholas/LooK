import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { CursorTracker } from './cursor-tracker.js';

/**
 * Record browser with 60fps cursor tracking
 */
export async function recordBrowser(url, options = {}) {
  const {
    width = 1920,
    height = 1080,
    fps = 60,
    duration = 20000, // ms
    actions = null // Optional scripted actions
  } = options;

  const tempDir = join(tmpdir(), `repovideo-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const cursorTracker = new CursorTracker({ fps });
  let mouseX = width / 2;
  let mouseY = height / 2;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: tempDir,
      size: { width, height }
    }
  });

  const page = await context.newPage();

  // Track mouse movements via CDP
  const client = await page.context().newCDPSession(page);
  
  // Inject mouse tracking
  await page.addInitScript(() => {
    window.__cursorPositions = [];
    window.__clicks = [];
    
    document.addEventListener('mousemove', (e) => {
      window.__cursorPositions.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now()
      });
    });
    
    document.addEventListener('click', (e) => {
      window.__clicks.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now()
      });
    });
  });

  try {
    // Navigate
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1000);

    const startTime = Date.now();

    if (actions && actions.length > 0) {
      // Execute scripted actions
      for (const action of actions) {
        await executeAction(page, action, cursorTracker);
      }
    } else {
      // Auto-demo: smart scroll through the page
      await autoDemo(page, cursorTracker, duration, width, height);
    }

    // Collect cursor data from page
    const pageData = await page.evaluate(() => ({
      positions: window.__cursorPositions || [],
      clicks: window.__clicks || []
    }));

    // Merge with our tracker
    for (const pos of pageData.positions) {
      cursorTracker.record(pos.x, pos.y, startTime + pos.t);
    }
    for (const click of pageData.clicks) {
      cursorTracker.recordClick(click.x, click.y, startTime + click.t);
    }

    await sleep(1000); // Final pause

  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  // Find the recorded video
  const files = await readdir(tempDir);
  const videoFile = files.find(f => f.endsWith('.webm'));

  return {
    videoPath: join(tempDir, videoFile),
    cursorData: cursorTracker.toJSON(),
    tempDir
  };
}

/**
 * Auto-demo: intelligently navigate the page with full scroll
 */
async function autoDemo(page, cursorTracker, duration, width, height) {
  const startTime = Date.now();
  
  // Get page dimensions
  const pageInfo = await page.evaluate(() => {
    return {
      pageHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight
    };
  });

  const maxScroll = Math.max(0, pageInfo.pageHeight - pageInfo.viewportHeight);
  
  // Initial pause at top - show hero section
  await sleep(2000);
  cursorTracker.record(width / 2, height / 3, Date.now());
  
  // Move cursor around hero area
  await smoothMoveCursor(page, cursorTracker, width * 0.3, height * 0.4, 600);
  await sleep(500);
  await smoothMoveCursor(page, cursorTracker, width * 0.7, height * 0.3, 600);
  await sleep(1000);

  // Calculate scroll segments - divide page into 4-5 sections
  const numSections = Math.min(5, Math.max(2, Math.ceil(maxScroll / height)));
  const scrollPerSection = maxScroll / numSections;
  const timePerSection = (duration - 6000) / numSections; // Reserve 6s for intro/outro

  // Scroll through each section
  for (let i = 1; i <= numSections && Date.now() - startTime < duration - 3000; i++) {
    const targetScroll = Math.min(scrollPerSection * i, maxScroll);
    
    // Smooth scroll
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, targetScroll);
    
    await sleep(1200); // Wait for scroll animation

    // Move cursor to different areas to show content
    const cursorY = height * (0.3 + Math.random() * 0.4);
    const cursorX = width * (0.3 + Math.random() * 0.4);
    await smoothMoveCursor(page, cursorTracker, cursorX, cursorY, 500);
    
    // Look for interactive elements in current viewport
    const clickTarget = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a.btn, [class*="button"], [class*="cta"]');
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.top > 100 && rect.top < window.innerHeight - 100 && rect.width > 50) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      return null;
    });

    if (clickTarget) {
      await smoothMoveCursor(page, cursorTracker, clickTarget.x, clickTarget.y, 400);
      await sleep(300);
      cursorTracker.recordClick(clickTarget.x, clickTarget.y, Date.now());
      await sleep(200);
    }

    // Pause to show content
    await sleep(Math.max(500, timePerSection - 2500));
  }

  // Scroll back to top smoothly
  await sleep(500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1500);
  
  // Final cursor position
  await smoothMoveCursor(page, cursorTracker, width / 2, height / 2, 500);
}

/**
 * Smooth cursor movement simulation
 */
async function smoothMoveCursor(page, cursorTracker, targetX, targetY, duration) {
  const steps = 30;
  const startX = cursorTracker.positions[cursorTracker.positions.length - 1]?.x || 0;
  const startY = cursorTracker.positions[cursorTracker.positions.length - 1]?.y || 0;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    
    const x = startX + (targetX - startX) * eased;
    const y = startY + (targetY - startY) * eased;
    
    cursorTracker.record(x, y, Date.now());
    
    await page.mouse.move(x, y);
    await sleep(duration / steps);
  }
}

/**
 * Execute a scripted action
 */
async function executeAction(page, action, cursorTracker) {
  switch (action.type) {
    case 'click':
      const clickEl = await page.$(action.selector);
      if (clickEl) {
        const box = await clickEl.boundingBox();
        if (box) {
          await smoothMoveCursor(page, cursorTracker, 
            box.x + box.width / 2, 
            box.y + box.height / 2, 
            300
          );
          cursorTracker.recordClick(box.x + box.width / 2, box.y + box.height / 2, Date.now());
          await clickEl.click();
        }
      }
      await sleep(action.wait || 1000);
      break;

    case 'scroll':
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), action.y);
      await sleep(action.wait || 800);
      break;

    case 'hover':
      const hoverEl = await page.$(action.selector);
      if (hoverEl) {
        const box = await hoverEl.boundingBox();
        if (box) {
          await smoothMoveCursor(page, cursorTracker,
            box.x + box.width / 2,
            box.y + box.height / 2,
            300
          );
          await hoverEl.hover();
        }
      }
      await sleep(action.wait || 500);
      break;

    case 'type':
      const typeEl = await page.$(action.selector);
      if (typeEl) {
        await typeEl.type(action.text, { delay: 50 });
      }
      await sleep(action.wait || 500);
      break;

    case 'wait':
      await sleep(action.duration || 1000);
      break;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
