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
 * Enhanced with:
 * - Section-aware navigation
 * - Priority-based element interaction
 * - Natural cursor movement with bezier curves
 * - Adaptive timing based on content
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
  const visitedElements = new Set();
  
  // Get comprehensive page analysis
  const pageInfo = await analyzePageForDemo(page);
  const maxScroll = Math.max(0, pageInfo.pageHeight - pageInfo.viewportHeight);
  
  // Calculate time budget
  const heroTime = Math.min(5000, duration * 0.2);          // 20% for hero
  const contentTime = duration * 0.65;                       // 65% for content
  const outroTime = Math.min(3000, duration * 0.15);        // 15% for outro
  
  // ===== PHASE 1: Hero Section =====
  await sleep(800);
  
  // Scan hero area naturally
  await scanArea(page, cursorTracker, {
    startX: width * 0.15,
    startY: height * 0.25,
    endX: width * 0.75,
    endY: height * 0.35,
    duration: heroTime * 0.4
  });
  
  // Find and interact with hero CTA
  const heroCTA = pageInfo.cta || pageInfo.buttons[0];
  if (heroCTA && heroCTA.y < height * 0.7) {
    await naturalMoveCursor(page, cursorTracker, heroCTA.x, heroCTA.y, 450);
    await sleep(300);
    await page.mouse.click(heroCTA.x, heroCTA.y);
    cursorTracker.recordClick(heroCTA.x, heroCTA.y, Date.now(), heroCTA.element);
    visitedElements.add(elementKey(heroCTA));
    await sleep(600);
  }
  
  await sleep(heroTime * 0.3);

  // ===== PHASE 2: Content Exploration =====
  const sections = identifySections(pageInfo, height);
  const timePerSection = contentTime / Math.max(1, sections.length);
  
  for (let i = 0; i < sections.length; i++) {
    if (Date.now() - startTime >= duration - outroTime) break;
    
    const section = sections[i];
    
    // Smooth scroll to section
    await smoothScrollTo(page, section.scrollY, 900);
    await sleep(500);
    
    // Find interesting elements in this section
    const sectionElements = prioritizeElements(
      section.elements,
      visitedElements,
      section.type
    );
    
    // Explore 2-4 elements per section
    const elementsToVisit = sectionElements.slice(0, Math.min(4, Math.ceil(timePerSection / 1500)));
    
    for (const el of elementsToVisit) {
      if (Date.now() - startTime >= duration - outroTime) break;
      
      // Natural movement to element
      await naturalMoveCursor(page, cursorTracker, el.x, el.y, 350);
      await sleep(200);
      
      // Interact with high-value elements
      if (el.importance === 'high' && Math.random() > 0.3) {
        await page.mouse.click(el.x, el.y);
        cursorTracker.recordClick(el.x, el.y, Date.now(), el.element);
        await sleep(400);
      } else {
        // Just hover and show
        await sleep(600);
      }
      
      visitedElements.add(elementKey(el));
    }
    
    // Brief pause at end of section
    await sleep(Math.max(300, timePerSection - (elementsToVisit.length * 1200)));
  }

  // ===== PHASE 3: Outro =====
  await sleep(300);
  await smoothScrollTo(page, 0, 1000);
  await sleep(600);
  
  // Final cursor position on main CTA
  if (heroCTA) {
    await naturalMoveCursor(page, cursorTracker, heroCTA.x, heroCTA.y, 500);
  } else {
    await naturalMoveCursor(page, cursorTracker, width * 0.5, height * 0.4, 400);
  }
  await sleep(outroTime - 1500);
}

/**
 * Analyze page for demo with enhanced element detection
 */
async function analyzePageForDemo(page) {
  return await page.evaluate(() => {
    // Helper to get section context
    const getSectionContext = (el) => {
      let current = el;
      while (current && current !== document.body) {
        const tag = current.tagName.toLowerCase();
        const className = (current.className || '').toLowerCase();
        const id = (current.id || '').toLowerCase();
        const text = (current.textContent || '').toLowerCase().slice(0, 200);
        
        if (tag === 'header' || className.includes('header') || id.includes('header')) return 'header';
        if (tag === 'footer' || className.includes('footer') || id.includes('footer')) return 'footer';
        if (tag === 'nav' || className.includes('nav')) return 'navigation';
        if (className.includes('hero') || id.includes('hero')) return 'hero';
        if (className.includes('pricing') || id.includes('pricing') || text.includes('pricing')) return 'pricing';
        if (className.includes('feature') || id.includes('feature') || text.includes('feature')) return 'features';
        if (className.includes('testimonial') || text.includes('customer') || text.includes('review')) return 'testimonials';
        if (className.includes('faq') || text.includes('frequently')) return 'faq';
        if (className.includes('how') || text.includes('how it works')) return 'how-it-works';
        
        current = current.parentElement;
      }
      return 'content';
    };
    
    // Helper to determine element importance
    const getImportance = (el) => {
      const text = (el.textContent || '').toLowerCase();
      const className = (el.className || '').toLowerCase();
      
      // High importance triggers
      if (/get started|try free|sign up|start|demo|buy now|subscribe/i.test(text)) return 'high';
      if (/cta|primary|hero|main/i.test(className)) return 'high';
      
      // Medium importance
      if (/learn more|see|view|explore|read/i.test(text)) return 'medium';
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return 'medium';
      
      return 'low';
    };
    
    // Find all interactive elements with rich metadata
    const findElements = (selectors) => {
      const results = [];
      const seen = new Set();
      
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          const key = `${Math.round(rect.x)},${Math.round(rect.y)}`;
          
          // Skip tiny, hidden, or duplicate elements
          if (rect.width < 30 || rect.height < 20 || seen.has(key)) return;
          if (rect.top < -100 || rect.left < 0) return;
          
          seen.add(key);
          
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 50);
          
          results.push({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2 + window.scrollY,
            viewportY: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height,
            type: el.tagName.toLowerCase(),
            text: text.split('\n')[0].trim(),
            section: getSectionContext(el),
            importance: getImportance(el),
            isButton: el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
            element: {
              text: text.slice(0, 30),
              type: el.tagName.toLowerCase(),
              tag: el.tagName.toLowerCase(),
              section: getSectionContext(el),
              ariaLabel: el.getAttribute('aria-label') || ''
            }
          });
        });
      }
      return results;
    };
    
    const buttons = findElements([
      'button:not([disabled])', 
      'a.btn', '.btn', 
      '[class*="button"]:not([disabled])', 
      '[class*="cta"]',
      'a[href]:not([href^="#"]):not([href^="javascript"])', 
      '[role="button"]'
    ]);
    
    const cards = findElements([
      '[class*="card"]',
      '[class*="feature"]',
      '[class*="benefit"]',
      '[class*="pricing"]',
      'article'
    ]);
    
    // Find main CTA
    const cta = buttons.find(b => 
      b.importance === 'high' && 
      b.viewportY < window.innerHeight * 0.8
    );
    
    return {
      pageHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      buttons: buttons.slice(0, 25),
      cards: cards.slice(0, 15),
      cta,
      title: document.title
    };
  });
}

/**
 * Identify logical sections of the page
 */
function identifySections(pageInfo, viewportHeight) {
  const allElements = [...pageInfo.buttons, ...pageInfo.cards];
  const sections = [];
  const sectionHeight = viewportHeight * 0.9;
  const numSections = Math.ceil(pageInfo.pageHeight / sectionHeight);
  
  for (let i = 0; i < Math.min(numSections, 6); i++) {
    const top = i * sectionHeight;
    const bottom = top + sectionHeight;
    
    const sectionElements = allElements.filter(el => 
      el.y >= top && el.y < bottom
    );
    
    if (sectionElements.length === 0 && i > 0) continue;
    
    // Determine section type from elements
    const sectionTypes = sectionElements.map(e => e.section);
    const dominantType = sectionTypes.sort((a, b) =>
      sectionTypes.filter(t => t === b).length - sectionTypes.filter(t => t === a).length
    )[0] || 'content';
    
    sections.push({
      index: i,
      scrollY: Math.max(0, top - 50),
      type: dominantType,
      elements: sectionElements
    });
  }
  
  return sections;
}

/**
 * Prioritize elements based on importance and context
 */
function prioritizeElements(elements, visited, sectionType) {
  return elements
    .filter(el => !visited.has(elementKey(el)))
    .sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      // High importance bonus
      if (a.importance === 'high') scoreA += 5;
      if (b.importance === 'high') scoreB += 5;
      if (a.importance === 'medium') scoreA += 2;
      if (b.importance === 'medium') scoreB += 2;
      
      // Button bonus
      if (a.isButton) scoreA += 2;
      if (b.isButton) scoreB += 2;
      
      // Size bonus (bigger = more visible)
      scoreA += Math.min(2, (a.width * a.height) / 10000);
      scoreB += Math.min(2, (b.width * b.height) / 10000);
      
      // Section relevance bonus
      if (sectionType === 'pricing' && a.text?.toLowerCase().includes('plan')) scoreA += 3;
      if (sectionType === 'pricing' && b.text?.toLowerCase().includes('plan')) scoreB += 3;
      
      return scoreB - scoreA;
    });
}

/**
 * Generate unique key for element
 */
function elementKey(el) {
  return `${Math.round(el.x)},${Math.round(el.y)}`;
}

/**
 * Scan an area with natural reading-like movement
 */
async function scanArea(page, cursorTracker, { startX, startY, endX, endY, duration }) {
  const steps = Math.ceil(duration / 150);
  const stepX = (endX - startX) / steps;
  const stepY = (endY - startY) / steps;
  
  let x = startX, y = startY;
  for (let i = 0; i <= steps; i++) {
    x = startX + stepX * i + (Math.random() - 0.5) * 30;
    y = startY + stepY * i + (Math.random() - 0.5) * 15;
    
    cursorTracker.record(x, y, Date.now());
    await page.mouse.move(x, y);
    await sleep(duration / steps);
  }
}

/**
 * Natural cursor movement with bezier easing
 */
async function naturalMoveCursor(page, cursorTracker, targetX, targetY, duration) {
  const positions = cursorTracker.positions;
  const startX = positions.length > 0 ? positions[positions.length - 1].x : 0;
  const startY = positions.length > 0 ? positions[positions.length - 1].y : 0;
  
  // Control point for curve
  const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 50;
  const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 30;
  
  const steps = Math.ceil(duration / 16);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    
    // Quadratic bezier
    const x = Math.pow(1 - eased, 2) * startX + 
              2 * (1 - eased) * eased * midX + 
              Math.pow(eased, 2) * targetX;
    const y = Math.pow(1 - eased, 2) * startY + 
              2 * (1 - eased) * eased * midY + 
              Math.pow(eased, 2) * targetY;
    
    cursorTracker.record(x, y, Date.now());
    await page.mouse.move(x, y);
    await sleep(duration / steps);
  }
}

/**
 * Smooth scroll to position
 */
async function smoothScrollTo(page, targetY, duration) {
  await page.evaluate(({ y, dur }) => {
    const start = window.scrollY;
    const startTime = performance.now();
    
    return new Promise(resolve => {
      function step() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / dur);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        window.scrollTo(0, start + (y - start) * eased);
        
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      step();
    });
  }, { y: targetY, dur: duration });
  
  await sleep(duration + 100);
}

// Keep the old section for backwards compatibility
const __legacyPageInfo = () => ({
  pageHeight: 0,
  viewportHeight: 0,
  buttons: [],
  features: [],
  inputs: []
});

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
          await naturalMoveCursor(page, cursorTracker, 
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
      await smoothScrollTo(page, action.y, action.wait || 800);
      break;

    case 'hover':
      const hoverEl = await page.$(action.selector);
      if (hoverEl) {
        const box = await hoverEl.boundingBox();
        if (box) {
          await naturalMoveCursor(page, cursorTracker,
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

