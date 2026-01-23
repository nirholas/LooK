/**
 * TransitionManager - Smooth transitions between pages and sections
 * 
 * Manages visual transitions, cursor choreography, and navigation
 * to create seamless, professional-looking demo videos.
 * 
 * @module transition-manager
 */

import { CursorTracker } from './cursor-tracker.js';

/**
 * @typedef {'click' | 'navigate' | 'back' | 'forward'} TransitionMethod
 */

/**
 * @typedef {'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'zoom' | 'none'} TransitionEffect
 */

/**
 * @typedef {Object} TransitionOptions
 * @property {TransitionEffect} [effect='fade'] - Visual effect for transition
 * @property {number} [duration=500] - Transition duration in ms
 * @property {boolean} [showCursor=true] - Show cursor during transition
 */

/**
 * Manages smooth transitions between pages and sections
 */
export class TransitionManager {
  /**
   * Create a TransitionManager
   * @param {import('playwright').Page} page - Playwright page instance
   * @param {CursorTracker} [cursorTracker] - Cursor tracker for recording
   */
  constructor(page, cursorTracker = null) {
    /** @type {import('playwright').Page} */
    this.page = page;
    
    /** @type {CursorTracker} */
    this.cursorTracker = cursorTracker || new CursorTracker();
    
    /** @type {{x: number, y: number}} */
    this.currentPosition = { x: 0, y: 0 };
    
    /** @type {number} */
    this.defaultScrollDuration = 800;
    
    /** @type {number} */
    this.defaultMoveDuration = 400;
    
    /** @type {TransitionEffect} */
    this.defaultEffect = 'fade';
  }
  
  /**
   * Set current cursor position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  setPosition(x, y) {
    this.currentPosition = { x, y };
  }
  
  // ============================================================
  // Page Transitions
  // ============================================================
  
  /**
   * Transition to a new page
   * @param {string} fromUrl - Current URL
   * @param {string} toUrl - Target URL
   * @param {TransitionMethod} method - How to navigate
   * @param {TransitionOptions} [options={}] - Transition options
   */
  async transitionToPage(fromUrl, toUrl, method, options = {}) {
    const { effect = this.defaultEffect, duration = 500 } = options;
    
    switch (method) {
      case 'click':
        await this.transitionViaClick(toUrl, options);
        break;
        
      case 'back':
        await this.transitionBack(options);
        break;
        
      case 'forward':
        await this.transitionForward(options);
        break;
        
      case 'navigate':
      default:
        await this.transitionViaNavigation(toUrl, options);
        break;
    }
    
    // Wait for page to be ready
    await this.waitForPageReady();
    
    // Optional transition effect overlay (would require injecting CSS)
    if (effect !== 'none') {
      await this.applyTransitionEffect(effect, duration);
    }
  }
  
  /**
   * Transition by clicking a link
   * @param {string} targetUrl - URL to navigate to
   * @param {TransitionOptions} options - Options
   * @private
   */
  async transitionViaClick(targetUrl, options = {}) {
    // Find the link to click
    const link = await this.findLinkTo(targetUrl);
    
    if (link) {
      // Animate cursor to the link
      await this.smoothMoveTo(link.x, link.y, options.moveDuration || this.defaultMoveDuration);
      
      // Hover effect
      await this.sleep(200);
      
      // Show click effect
      await this.showClickEffect(link.x, link.y);
      
      // Click
      try {
        await this.page.click(link.selector, { timeout: 5000 });
      } catch {
        // Fallback to navigation
        await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      }
    } else {
      // Couldn't find link, just navigate
      await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
  }
  
  /**
   * Transition via direct navigation
   * @param {string} targetUrl - URL to navigate to
   * @param {TransitionOptions} options - Options
   * @private
   */
  async transitionViaNavigation(targetUrl, options = {}) {
    await this.page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
  }
  
  /**
   * Transition back in history
   * @param {TransitionOptions} options - Options
   * @private
   */
  async transitionBack(options = {}) {
    // Visual hint that we're going back
    await this.showBackIndicator();
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }
  
  /**
   * Transition forward in history
   * @param {TransitionOptions} options - Options
   * @private
   */
  async transitionForward(options = {}) {
    await this.page.goForward({ waitUntil: 'domcontentloaded' });
  }
  
  /**
   * Find a link element pointing to a URL
   * @param {string} targetUrl - Target URL
   * @returns {Promise<{x: number, y: number, selector: string} | null>}
   * @private
   */
  async findLinkTo(targetUrl) {
    try {
      // Try exact match first
      const result = await this.page.evaluate((url) => {
        // Normalize URL
        const normalizeUrl = (u) => {
          try {
            const parsed = new URL(u, window.location.origin);
            return parsed.pathname + parsed.search;
          } catch {
            return u;
          }
        };
        
        const targetNormalized = normalizeUrl(url);
        
        // Find matching links
        const links = document.querySelectorAll('a[href]');
        for (const link of links) {
          const href = link.getAttribute('href');
          if (!href) continue;
          
          const linkNormalized = normalizeUrl(href);
          
          if (
            linkNormalized === targetNormalized ||
            href === url ||
            href.endsWith(url) ||
            url.endsWith(href)
          ) {
            const rect = link.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                selector: `a[href="${href}"]`
              };
            }
          }
        }
        
        return null;
      }, targetUrl);
      
      return result;
    } catch {
      return null;
    }
  }
  
  /**
   * Wait for page to be ready
   * @param {number} [timeout=10000] - Timeout in ms
   */
  async waitForPageReady(timeout = 10000) {
    try {
      // Wait for network idle
      await this.page.waitForLoadState('networkidle', { timeout: timeout / 2 });
    } catch {
      // Network didn't go idle, continue anyway
    }
    
    // Wait for document ready
    await this.page.evaluate(() => {
      return new Promise(resolve => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    });
    
    // Small delay for any JS animations
    await this.sleep(300);
  }
  
  /**
   * Apply a visual transition effect
   * @param {TransitionEffect} effect - Effect type
   * @param {number} duration - Effect duration
   * @private
   */
  async applyTransitionEffect(effect, duration) {
    // Effects are applied via injected CSS/JS
    // This is a visual enhancement that could be expanded
    await this.page.evaluate(({ effect, duration }) => {
      const overlay = document.createElement('div');
      overlay.id = '__look_transition_overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 999999;
        transition: opacity ${duration}ms ease-out;
      `;
      
      switch (effect) {
        case 'fade':
          overlay.style.background = 'white';
          overlay.style.opacity = '0.3';
          break;
        case 'slide-left':
        case 'slide-right':
          overlay.style.background = 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)';
          overlay.style.opacity = '0.2';
          break;
        default:
          overlay.style.opacity = '0';
      }
      
      document.body.appendChild(overlay);
      
      // Fade out
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
      
      // Remove after animation
      setTimeout(() => {
        overlay.remove();
      }, duration);
    }, { effect, duration });
    
    await this.sleep(duration * 0.5);
  }
  
  // ============================================================
  // Section Transitions
  // ============================================================
  
  /**
   * Transition to a section within the page
   * @param {Object} section - Section to transition to
   * @param {number} [scrollDuration=800] - Scroll duration in ms
   */
  async transitionToSection(section, scrollDuration = this.defaultScrollDuration) {
    if (!section || !section.bounds) return;
    
    const targetY = section.bounds.y - 100; // Offset for visual comfort
    
    // Smooth scroll to section
    await this.smoothScrollTo(targetY, scrollDuration);
    
    // Brief highlight effect
    await this.highlightArea(section.bounds, 400);
  }
  
  /**
   * Scroll smoothly to a Y position
   * @param {number} targetY - Target scroll position
   * @param {number} [duration=800] - Scroll duration in ms
   */
  async smoothScrollTo(targetY, duration = this.defaultScrollDuration) {
    await this.page.evaluate(({ y, dur }) => {
      return new Promise(resolve => {
        const start = window.scrollY;
        const distance = y - start;
        const startTime = performance.now();
        
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        
        function step(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / dur, 1);
          const eased = easeOutCubic(progress);
          
          window.scrollTo(0, start + distance * eased);
          
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        
        requestAnimationFrame(step);
      });
    }, { y: targetY, dur: duration });
    
    // Track scroll in cursor data
    this.cursorTracker.record(this.currentPosition.x, this.currentPosition.y, Date.now());
  }
  
  /**
   * Scroll by a relative amount
   * @param {number} deltaY - Amount to scroll (positive = down)
   * @param {number} [duration=500] - Scroll duration in ms
   */
  async scrollBy(deltaY, duration = 500) {
    const currentY = await this.page.evaluate(() => window.scrollY);
    await this.smoothScrollTo(currentY + deltaY, duration);
  }
  
  // ============================================================
  // Cursor Movement
  // ============================================================
  
  /**
   * Move cursor smoothly to a position
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @param {number} [duration=400] - Movement duration in ms
   */
  async smoothMoveTo(targetX, targetY, duration = this.defaultMoveDuration) {
    const steps = Math.max(10, Math.ceil(duration / 16)); // ~60fps
    const startX = this.currentPosition.x;
    const startY = this.currentPosition.y;
    const stepTime = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      this.currentPosition = { x, y };
      this.cursorTracker.record(x, y, Date.now());
      
      // Move mouse in browser
      await this.page.mouse.move(x, y);
      
      if (i < steps) {
        await this.sleep(stepTime);
      }
    }
  }
  
  /**
   * Move cursor along a bezier curve
   * @param {number} targetX - Target X
   * @param {number} targetY - Target Y
   * @param {number} controlX - Control point X
   * @param {number} controlY - Control point Y
   * @param {number} [duration=500] - Duration in ms
   */
  async bezierMoveTo(targetX, targetY, controlX, controlY, duration = 500) {
    const steps = Math.max(15, Math.ceil(duration / 16));
    const startX = this.currentPosition.x;
    const startY = this.currentPosition.y;
    const stepTime = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Quadratic bezier
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * controlX + t * t * targetX;
      const y = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * controlY + t * t * targetY;
      
      this.currentPosition = { x, y };
      this.cursorTracker.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      
      if (i < steps) {
        await this.sleep(stepTime);
      }
    }
  }
  
  // ============================================================
  // Transition Effects
  // ============================================================
  
  /**
   * Show a click effect at position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  async showClickEffect(x, y) {
    // Record the click
    this.cursorTracker.recordClick(x, y, Date.now());
    
    // Visual click effect
    await this.page.evaluate(({ x, y }) => {
      const effect = document.createElement('div');
      effect.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 30px;
        height: 30px;
        border: 3px solid rgba(74, 144, 226, 0.8);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        z-index: 999999;
        animation: __look_click_ripple 0.5s ease-out forwards;
      `;
      
      // Add keyframes if not exists
      if (!document.getElementById('__look_click_styles')) {
        const style = document.createElement('style');
        style.id = '__look_click_styles';
        style.textContent = `
          @keyframes __look_click_ripple {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(effect);
      setTimeout(() => effect.remove(), 500);
    }, { x, y });
    
    await this.sleep(200);
  }
  
  /**
   * Show a back navigation indicator
   * @private
   */
  async showBackIndicator() {
    await this.page.evaluate(() => {
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: fixed;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 40px;
        color: rgba(0, 0, 0, 0.3);
        pointer-events: none;
        z-index: 999999;
        animation: __look_back_arrow 0.4s ease-out forwards;
      `;
      indicator.textContent = '←';
      
      if (!document.getElementById('__look_back_styles')) {
        const style = document.createElement('style');
        style.id = '__look_back_styles';
        style.textContent = `
          @keyframes __look_back_arrow {
            0% { transform: translateY(-50%) translateX(-20px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-50%) translateX(0); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(indicator);
      setTimeout(() => indicator.remove(), 400);
    });
    
    await this.sleep(200);
  }
  
  /**
   * Highlight an area of the page
   * @param {Object} bounds - {x, y, width, height}
   * @param {number} [duration=500] - Duration in ms
   */
  async highlightArea(bounds, duration = 500) {
    if (!bounds) return;
    
    await this.page.evaluate(({ b, dur }) => {
      const highlight = document.createElement('div');
      highlight.style.cssText = `
        position: absolute;
        left: ${b.x - 5}px;
        top: ${b.y - 5}px;
        width: ${(b.width || 100) + 10}px;
        height: ${(b.height || 50) + 10}px;
        border: 2px solid rgba(74, 144, 226, 0.5);
        border-radius: 8px;
        background: rgba(74, 144, 226, 0.1);
        pointer-events: none;
        z-index: 999998;
        animation: __look_highlight ${dur}ms ease-out forwards;
      `;
      
      if (!document.getElementById('__look_highlight_styles')) {
        const style = document.createElement('style');
        style.id = '__look_highlight_styles';
        style.textContent = `
          @keyframes __look_highlight {
            0% { opacity: 0; transform: scale(0.95); }
            20% { opacity: 1; transform: scale(1); }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(highlight);
      setTimeout(() => highlight.remove(), dur);
    }, { b: bounds, dur: duration });
    
    await this.sleep(duration * 0.3);
  }
  
  // ============================================================
  // Cursor Choreography
  // ============================================================
  
  /**
   * Pause for dramatic effect
   * @param {number} [duration=500] - Pause duration in ms
   */
  async dramaticPause(duration = 500) {
    // Record position during pause
    const interval = setInterval(() => {
      this.cursorTracker.record(this.currentPosition.x, this.currentPosition.y, Date.now());
    }, 100);
    
    await this.sleep(duration);
    clearInterval(interval);
  }
  
  /**
   * Gesture toward an area (wave cursor)
   * @param {Object} bounds - Target area bounds
   * @param {number} [duration=600] - Gesture duration
   */
  async gestureToArea(bounds, duration = 600) {
    if (!bounds) return;
    
    const centerX = bounds.x + (bounds.width || 100) / 2;
    const centerY = bounds.y + (bounds.height || 50) / 2;
    
    // Quick movement toward center
    const midX = (this.currentPosition.x + centerX) / 2;
    const midY = (this.currentPosition.y + centerY) / 2;
    
    await this.smoothMoveTo(midX, midY, duration * 0.4);
    await this.smoothMoveTo(centerX - 20, centerY, duration * 0.3);
    await this.smoothMoveTo(centerX, centerY, duration * 0.3);
  }
  
  /**
   * Circle cursor around an area
   * @param {Object} bounds - Area to circle
   * @param {number} [duration=1000] - Circle duration
   */
  async circleArea(bounds, duration = 1000) {
    if (!bounds) return;
    
    const centerX = bounds.x + (bounds.width || 100) / 2;
    const centerY = bounds.y + (bounds.height || 50) / 2;
    const radiusX = (bounds.width || 100) / 2 + 20;
    const radiusY = (bounds.height || 50) / 2 + 15;
    
    const steps = 24;
    const stepTime = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      
      this.currentPosition = { x, y };
      this.cursorTracker.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      
      await this.sleep(stepTime);
    }
  }
  
  /**
   * Pan across a section
   * @param {Object} bounds - Section bounds
   * @param {number} [duration=1500] - Pan duration
   */
  async panAcross(bounds, duration = 1500) {
    if (!bounds) return;
    
    const startX = bounds.x + 50;
    const endX = bounds.x + (bounds.width || 200) - 50;
    const y = bounds.y + (bounds.height || 100) / 2;
    
    await this.smoothMoveTo(startX, y, duration * 0.3);
    await this.dramaticPause(200);
    await this.smoothMoveTo(endX, y, duration * 0.5);
  }
  
  // ============================================================
  // Utility Methods
  // ============================================================
  
  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current cursor position
   * @returns {{x: number, y: number}} Current position
   */
  getPosition() {
    return { ...this.currentPosition };
  }
  
  /**
   * Get cursor tracking data
   * @returns {Object} Cursor data
   */
  getCursorData() {
    return this.cursorTracker.toJSON();
  }
}

export default TransitionManager;
