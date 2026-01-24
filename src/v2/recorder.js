import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { CursorTracker } from './cursor-tracker.js';

/**
 * @typedef {import('../types/options.js').RecordingOptions} RecordingOptions
 * @typedef {import('../types/options.js').ScriptedAction} ScriptedAction
 * @typedef {import('../types/project.js').CursorData} CursorData
 */

/**
 * @typedef {Object} RecordingResult
 * @property {string} videoPath - Path to the recorded video file
 * @property {CursorData} cursorData - Cursor tracking data for overlay
 * @property {string} tempDir - Temporary directory containing recordings
 */

/**
 * Record browser with 60fps cursor tracking.
 * 
 * Opens a headless browser, navigates to the URL, and records the viewport
 * while tracking mouse movements and clicks for cursor overlay.
 * 
 * @param {string} url - The URL to record
 * @param {RecordingOptions} [options={}] - Recording options
 * @param {number} [options.width=1920] - Viewport width in pixels
 * @param {number} [options.height=1080] - Viewport height in pixels
 * @param {number} [options.fps=60] - Frames per second for cursor tracking
 * @param {number} [options.duration=20000] - Recording duration in milliseconds
 * @param {ScriptedAction[]|null} [options.actions=null] - Optional scripted actions
 * @returns {Promise<RecordingResult>} Recording result with video path and cursor data
 * 
 * @example
 * const { videoPath, cursorData, tempDir } = await recordBrowser('https://example.com', {
 *   width: 1920,
 *   height: 1080,
 *   duration: 25000
 * });
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
  
  // Initialize cursor at center
  cursorTracker.record(width / 2, height / 2, Date.now());

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process'
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

  // Track mouse movements via injected script
  await page.addInitScript(() => {
    window.__cursorPositions = [];
    window.__clicks = [];
    window.__startTime = performance.now();
    
    document.addEventListener('mousemove', (e) => {
      window.__cursorPositions.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now() - window.__startTime
      });
    });
    
    document.addEventListener('click', (e) => {
      // Get element context for smart marker generation
      const target = e.target;
      const rect = target.getBoundingClientRect();
      
      // Extract meaningful text from the element
      const getText = (el) => {
        // Try common patterns
        const text = el.innerText || el.textContent || '';
        const trimmed = text.trim().substring(0, 50);
        // If it's a multi-line text, just take first line
        return trimmed.split('\n')[0].trim();
      };
      
      // Get element type/role for context
      const getElementType = (el) => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const type = el.getAttribute('type');
        const className = el.className || '';
        
        if (tag === 'button' || role === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (tag === 'input') return type || 'input';
        if (tag === 'select') return 'dropdown';
        if (className.includes('card')) return 'card';
        if (className.includes('menu') || className.includes('nav')) return 'menu';
        if (className.includes('tab')) return 'tab';
        if (className.includes('modal') || className.includes('dialog')) return 'modal';
        return tag;
      };
      
      // Get section context (what part of page)
      const getSectionContext = (el) => {
        let current = el;
        while (current && current !== document.body) {
          const tag = current.tagName.toLowerCase();
          const className = (current.className || '').toLowerCase();
          const id = (current.id || '').toLowerCase();
          
          // Check for common section patterns
          if (tag === 'header' || className.includes('header') || id.includes('header')) return 'header';
          if (tag === 'footer' || className.includes('footer') || id.includes('footer')) return 'footer';
          if (tag === 'nav' || className.includes('nav')) return 'navigation';
          if (className.includes('hero') || id.includes('hero')) return 'hero';
          if (className.includes('pricing') || id.includes('pricing')) return 'pricing';
          if (className.includes('feature') || id.includes('feature')) return 'features';
          if (className.includes('testimonial') || id.includes('testimonial')) return 'testimonials';
          if (className.includes('contact') || id.includes('contact')) return 'contact';
          if (className.includes('faq') || id.includes('faq')) return 'faq';
          if (className.includes('about') || id.includes('about')) return 'about';
          
          current = current.parentElement;
        }
        return 'content';
      };
      
      window.__clicks.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        element: {
          text: getText(target),
          type: getElementType(target),
          tag: target.tagName.toLowerCase(),
          section: getSectionContext(target),
          ariaLabel: target.getAttribute('aria-label') || '',
          placeholder: target.getAttribute('placeholder') || ''
        }
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
      cursorTracker.recordClick(click.x, click.y, startTime + click.t, click.element);
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
 * Auto-demo: intelligently navigate the page with engaging interactions.
 * 
 * Performs an automated walkthrough of the page with natural-looking
 * mouse movements, scrolling, and clicks on interactive elements.
 * 
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {CursorTracker} cursorTracker - Cursor tracker for recording positions
 * @param {number} duration - Total demo duration in milliseconds
 * @param {number} width - Viewport width in pixels
 * @param {number} height - Viewport height in pixels
 * @returns {Promise<void>}
 * @private
 */
async function autoDemo(page, cursorTracker, duration, width, height) {
  const startTime = Date.now();
  
  // Get page info and find key interactive elements
  const pageInfo = await page.evaluate(() => {
    const findElements = (selectors) => {
      const results = [];
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 30 && rect.height > 20 && rect.top >= 0 && rect.left >= 0) {
            results.push({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              scrollY: window.scrollY,
              type: el.tagName.toLowerCase(),
              text: (el.textContent || '').substring(0, 30).trim()
            });
          }
        });
      }
      return results;
    };

    return {
      pageHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      // Find clickable elements
      buttons: findElements([
        'button', 'a.btn', '.btn', '[class*="button"]', '[class*="Button"]',
        '[class*="cta"]', '[class*="CTA"]', 'a[href]', '[role="button"]'
      ]).slice(0, 20),
      // Find feature cards and sections
      features: findElements([
        '[class*="feature"]', '[class*="card"]', '[class*="benefit"]',
        '[class*="pricing"]', 'section', 'article'
      ]).slice(0, 10),
      // Find form inputs
      inputs: findElements(['input', 'textarea', 'select']).slice(0, 5)
    };
  });

  const maxScroll = Math.max(0, pageInfo.pageHeight - pageInfo.viewportHeight);
  
  // Helper to find visible clickable element at current scroll with element context
  const findVisibleClickable = async () => {
    return await page.evaluate(() => {
      const selectors = [
        'button:not([disabled])', 'a.btn', '.btn', '[class*="button"]:not([disabled])',
        '[class*="cta"]', 'a[href]:not([href^="#"])', '[role="button"]'
      ];
      
      // Helper to get section context
      const getSectionContext = (el) => {
        let current = el;
        while (current && current !== document.body) {
          const tag = current.tagName.toLowerCase();
          const className = (current.className || '').toLowerCase();
          const id = (current.id || '').toLowerCase();
          
          if (tag === 'header' || className.includes('header') || id.includes('header')) return 'header';
          if (tag === 'footer' || className.includes('footer') || id.includes('footer')) return 'footer';
          if (tag === 'nav' || className.includes('nav')) return 'navigation';
          if (className.includes('hero') || id.includes('hero')) return 'hero';
          if (className.includes('pricing') || id.includes('pricing')) return 'pricing';
          if (className.includes('feature') || id.includes('feature')) return 'features';
          if (className.includes('testimonial') || id.includes('testimonial')) return 'testimonials';
          if (className.includes('contact') || id.includes('contact')) return 'contact';
          if (className.includes('faq') || id.includes('faq')) return 'faq';
          if (className.includes('about') || id.includes('about')) return 'about';
          
          current = current.parentElement;
        }
        return 'content';
      };
      
      // Helper to get element type
      const getElementType = (el) => {
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const className = el.className || '';
        
        if (tag === 'button' || role === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (className.includes('cta') || className.includes('CTA')) return 'cta';
        if (className.includes('card')) return 'card';
        return tag;
      };
      
      for (const sel of selectors) {
        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          // Check if element is visible in viewport (not too close to edges)
          if (rect.top > 80 && rect.top < window.innerHeight - 80 &&
              rect.left > 50 && rect.left < window.innerWidth - 50 &&
              rect.width > 40 && rect.height > 25) {
            const text = (el.innerText || el.textContent || '').trim().substring(0, 50).split('\\n')[0].trim();
            return { 
              x: rect.left + rect.width / 2, 
              y: rect.top + rect.height / 2,
              text: text.substring(0, 30),
              element: {
                text: text,
                type: getElementType(el),
                tag: el.tagName.toLowerCase(),
                section: getSectionContext(el),
                ariaLabel: el.getAttribute('aria-label') || '',
                placeholder: el.getAttribute('placeholder') || ''
              }
            };
          }
        }
      }
      return null;
    });
  };

  // ===== PHASE 1: Hero Section (first 4 seconds) =====
  await sleep(1500);
  
  // Start from center-left and scan across hero
  await smoothMoveCursor(page, cursorTracker, width * 0.25, height * 0.35, 500);
  await sleep(600);
  await smoothMoveCursor(page, cursorTracker, width * 0.65, height * 0.35, 800);
  await sleep(400);
  
  // Find and click CTA button in hero
  let heroBtn = await findVisibleClickable();
  if (heroBtn) {
    await smoothMoveCursor(page, cursorTracker, heroBtn.x, heroBtn.y, 400);
    await sleep(200);
    // Perform actual click to trigger visual feedback
    await page.mouse.click(heroBtn.x, heroBtn.y);
    cursorTracker.recordClick(heroBtn.x, heroBtn.y, Date.now(), heroBtn.element);
    await sleep(600);
  }
  
  // ===== PHASE 2: Scroll Through Content =====
  const numSections = Math.min(4, Math.max(2, Math.ceil(maxScroll / height)));
  const scrollPerSection = maxScroll / numSections;
  const timePerSection = Math.max(2000, (duration - 8000) / numSections);

  for (let i = 1; i <= numSections && Date.now() - startTime < duration - 4000; i++) {
    const targetScroll = Math.min(scrollPerSection * i, maxScroll);
    
    // Smooth scroll
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, targetScroll);
    await sleep(1000);

    // Pan cursor across this section to show content
    await smoothMoveCursor(page, cursorTracker, width * 0.3, height * 0.4, 400);
    await sleep(400);
    await smoothMoveCursor(page, cursorTracker, width * 0.6, height * 0.5, 600);
    
    // Find something to click in this section
    const clickTarget = await findVisibleClickable();
    if (clickTarget && Math.random() > 0.3) { // Click 70% of found targets
      await smoothMoveCursor(page, cursorTracker, clickTarget.x, clickTarget.y, 350);
      await sleep(150);
      await page.mouse.click(clickTarget.x, clickTarget.y);
      cursorTracker.recordClick(clickTarget.x, clickTarget.y, Date.now(), clickTarget.element);
      await sleep(400);
    }
    
    // Dwell to show content
    await sleep(Math.max(300, timePerSection - 2200));
  }

  // ===== PHASE 3: Return to Top =====
  await sleep(400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(1200);
  
  // Final position at center with a subtle movement
  await smoothMoveCursor(page, cursorTracker, width * 0.5, height * 0.4, 400);
  await sleep(500);
}

/**
 * Smooth cursor movement simulation with easing.
 * 
 * Moves the cursor from its current position to the target coordinates
 * using cubic ease-out interpolation for natural-looking movement.
 * 
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {CursorTracker} cursorTracker - Cursor tracker for recording positions
 * @param {number} targetX - Target X coordinate
 * @param {number} targetY - Target Y coordinate
 * @param {number} duration - Movement duration in milliseconds
 * @returns {Promise<void>}
 * @private
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
 * Execute a scripted action during recording.
 * 
 * Performs click, scroll, hover, type, or wait actions as defined
 * in the scripted actions array.
 * 
 * @param {import('playwright').Page} page - Playwright page instance
 * @param {ScriptedAction} action - The action to execute
 * @param {CursorTracker} cursorTracker - Cursor tracker for recording positions
 * @returns {Promise<void>}
 * @private
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

/**
 * Promisified sleep utility.
 * 
 * @param {number} ms - Duration to sleep in milliseconds
 * @returns {Promise<void>}
 * @private
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
