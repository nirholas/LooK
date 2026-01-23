/**
 * SPA Detector - Detect and handle Single Page Application navigation
 * 
 * Handles SPAs where URL may not change on navigation. Tracks page state,
 * detects framework, intercepts navigation, and enables proper back navigation.
 */

/**
 * Detects and handles SPA navigation
 */
export class SPADetector {
  /**
   * Create an SPA detector
   * @param {import('playwright').Page} page - Playwright page instance
   * @param {Object} [options] - Configuration options
   * @param {number} [options.stateChangeTimeout] - Timeout for state change detection (ms)
   * @param {number} [options.navigationTimeout] - Timeout for navigation (ms)
   */
  constructor(page, options = {}) {
    /** @type {import('playwright').Page} */
    this.page = page;
    
    /** @type {number} Timeout for state change detection */
    this.stateChangeTimeout = options.stateChangeTimeout || 5000;
    
    /** @type {number} Timeout for navigation */
    this.navigationTimeout = options.navigationTimeout || 10000;
    
    /** @type {string|null} Detected framework name */
    this.detectedFramework = null;
    
    /** @type {boolean} Whether the site has been confirmed as SPA */
    this.confirmedSPA = false;
    
    /** @type {Array<Object>} History of state changes */
    this.stateHistory = [];
    
    /** @type {string|null} Current state hash */
    this.currentStateHash = null;
    
    /** @type {Function|null} Navigation interception callback */
    this.navigationCallback = null;
    
    /** @type {boolean} Whether navigation interception is active */
    this.intercepting = false;
  }

  // ==================== SPA Detection ====================

  /**
   * Detect if the current site is a SPA
   * Checks for common SPA indicators and frameworks
   * @returns {Promise<boolean>}
   */
  async isSPA() {
    if (this.confirmedSPA) return true;
    
    const indicators = await this.page.evaluate(() => {
      const indicators = {
        hasReact: false,
        hasVue: false,
        hasAngular: false,
        hasSvelte: false,
        hasNextjs: false,
        hasNuxt: false,
        hasRouter: false,
        hasHistoryApi: false,
        hasSPARoot: false,
        hasServiceWorker: false,
        linkHandlers: 0,
        score: 0
      };
      
      // Check for React
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || 
          document.querySelector('[data-reactroot]') ||
          document.querySelector('[data-reactid]') ||
          document.querySelector('#__next')) {
        indicators.hasReact = true;
        indicators.score += 30;
      }
      
      // Check for Vue
      if (window.__VUE__ || 
          document.querySelector('[data-v-]') ||
          document.querySelector('#__nuxt') ||
          document.querySelector('[data-server-rendered]')) {
        indicators.hasVue = true;
        indicators.score += 30;
      }
      
      // Check for Angular
      if (window.ng || 
          document.querySelector('[ng-version]') ||
          document.querySelector('[_ngcontent]') ||
          document.querySelector('app-root')) {
        indicators.hasAngular = true;
        indicators.score += 30;
      }
      
      // Check for Svelte
      if (document.querySelector('[class*="svelte-"]')) {
        indicators.hasSvelte = true;
        indicators.score += 30;
      }
      
      // Check for Next.js
      if (window.__NEXT_DATA__ || document.querySelector('#__next')) {
        indicators.hasNextjs = true;
        indicators.score += 25;
      }
      
      // Check for Nuxt
      if (window.__NUXT__ || document.querySelector('#__nuxt')) {
        indicators.hasNuxt = true;
        indicators.score += 25;
      }
      
      // Check for client-side routing indicators
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        const src = script.src || '';
        if (src.includes('react-router') || 
            src.includes('vue-router') ||
            src.includes('@angular/router') ||
            src.includes('page.js') ||
            src.includes('director.js')) {
          indicators.hasRouter = true;
          indicators.score += 20;
          break;
        }
      }
      
      // Check for history API usage
      if (typeof history.pushState === 'function') {
        indicators.hasHistoryApi = true;
        indicators.score += 5;
      }
      
      // Check for SPA root element
      const root = document.querySelector('#root, #app, #__next, #__nuxt, [data-reactroot], app-root');
      if (root) {
        indicators.hasSPARoot = true;
        indicators.score += 15;
      }
      
      // Check for service worker (common in PWAs/SPAs)
      if ('serviceWorker' in navigator) {
        indicators.hasServiceWorker = true;
        indicators.score += 5;
      }
      
      // Check for links with click handlers (SPA routing)
      const links = document.querySelectorAll('a[href]');
      let handlersFound = 0;
      for (const link of links) {
        // Check if link might be handled by SPA router
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
          // Internal link - might be SPA routed
          const events = window.getEventListeners?.(link) || {};
          if (events.click && events.click.length > 0) {
            handlersFound++;
          }
        }
      }
      indicators.linkHandlers = handlersFound;
      if (handlersFound > 3) {
        indicators.score += 15;
      }
      
      return indicators;
    });
    
    // Consider it a SPA if score is high enough
    this.confirmedSPA = indicators.score >= 30;
    
    return this.confirmedSPA;
  }

  /**
   * Detect which SPA framework is being used
   * @returns {Promise<Object>} Framework info
   */
  async detectFramework() {
    const framework = await this.page.evaluate(() => {
      const result = {
        name: 'unknown',
        version: null,
        meta: {}
      };
      
      // React
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        result.name = 'react';
        try {
          result.version = window.React?.version || null;
        } catch {}
      }
      
      // Next.js
      if (window.__NEXT_DATA__) {
        result.name = 'nextjs';
        try {
          result.meta.buildId = window.__NEXT_DATA__.buildId;
          result.meta.page = window.__NEXT_DATA__.page;
        } catch {}
      }
      
      // Vue
      if (window.__VUE__) {
        result.name = 'vue';
        try {
          result.version = window.Vue?.version || null;
        } catch {}
      }
      
      // Nuxt
      if (window.__NUXT__) {
        result.name = 'nuxt';
        try {
          result.meta.serverRendered = window.__NUXT__.serverRendered;
        } catch {}
      }
      
      // Angular
      if (window.ng) {
        result.name = 'angular';
        const versionEl = document.querySelector('[ng-version]');
        if (versionEl) {
          result.version = versionEl.getAttribute('ng-version');
        }
      }
      
      // Svelte
      if (document.querySelector('[class*="svelte-"]')) {
        result.name = 'svelte';
      }
      
      // Gatsby
      if (window.___gatsby) {
        result.name = 'gatsby';
      }
      
      // Remix
      if (window.__remixContext) {
        result.name = 'remix';
      }
      
      return result;
    });
    
    this.detectedFramework = framework.name;
    return framework;
  }

  // ==================== State Tracking ====================

  /**
   * Capture the current application state
   * @returns {Promise<Object>} State snapshot
   */
  async captureState() {
    const state = await this.page.evaluate(() => {
      const snapshot = {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        title: document.title,
        timestamp: Date.now(),
        dom: {}
      };
      
      // Capture key DOM state
      const mainContent = document.querySelector('main, [role="main"], #app, #root, #__next');
      if (mainContent) {
        // Get a representative sample of content
        snapshot.dom.mainContentLength = mainContent.innerHTML.length;
        snapshot.dom.mainContentSample = mainContent.textContent?.slice(0, 500) || '';
      }
      
      // Active navigation state
      const activeNav = document.querySelector('nav .active, nav [aria-current], [class*="active"][href]');
      if (activeNav) {
        snapshot.dom.activeNavText = activeNav.textContent?.trim();
        snapshot.dom.activeNavHref = activeNav.getAttribute('href');
      }
      
      // Modal/dialog state
      const modal = document.querySelector('[role="dialog"]:not([hidden]), .modal:not(.hidden), [class*="modal"][class*="open"]');
      snapshot.dom.hasModal = !!modal;
      if (modal) {
        snapshot.dom.modalTitle = modal.querySelector('h1, h2, [class*="title"]')?.textContent?.trim();
      }
      
      // Sidebar/drawer state
      const sidebar = document.querySelector('[class*="sidebar"], [class*="drawer"], aside');
      if (sidebar) {
        snapshot.dom.sidebarOpen = !sidebar.classList.contains('hidden') && 
                                    !sidebar.classList.contains('closed') &&
                                    sidebar.offsetWidth > 0;
      }
      
      // Form state
      const forms = document.querySelectorAll('form');
      snapshot.dom.formCount = forms.length;
      snapshot.dom.formData = [];
      forms.forEach((form, i) => {
        if (i < 3) { // Limit to first 3 forms
          const inputs = form.querySelectorAll('input, select, textarea');
          snapshot.dom.formData.push({
            id: form.id || `form-${i}`,
            inputCount: inputs.length,
            hasValues: Array.from(inputs).some(inp => inp.value)
          });
        }
      });
      
      // Tab/accordion state
      const activeTabs = document.querySelectorAll('[role="tab"][aria-selected="true"], .tab.active');
      snapshot.dom.activeTabsCount = activeTabs.length;
      snapshot.dom.activeTabs = Array.from(activeTabs).map(t => t.textContent?.trim()).slice(0, 5);
      
      // Scroll position
      snapshot.dom.scrollY = window.scrollY;
      snapshot.dom.scrollX = window.scrollX;
      
      return snapshot;
    });
    
    // Store in history
    this.stateHistory.push(state);
    
    // Limit history size
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift();
    }
    
    return state;
  }

  /**
   * Generate a hash of the current page state
   * @returns {Promise<string>} State hash
   */
  async getStateHash() {
    const hash = await this.page.evaluate(() => {
      const state = {
        url: window.location.href,
        title: document.title,
        // Capture key DOM elements
        mainContent: document.querySelector('main, [role="main"], #app, #root')?.innerHTML?.slice(0, 1000),
        // Active navigation
        activeNav: document.querySelector('nav .active, nav [aria-current]')?.textContent,
        // Modal state
        hasModal: !!document.querySelector('[role="dialog"]:not([hidden])'),
        // Form count
        formCount: document.querySelectorAll('form').length,
        // Visible headings
        headings: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.trim()).slice(0, 5).join('|')
      };
      
      // Simple hash function
      const str = JSON.stringify(state);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash.toString(16);
    });
    
    this.currentStateHash = hash;
    return hash;
  }

  /**
   * Check if the page state has changed since a previous hash
   * @param {string} previousHash - Previous state hash to compare against
   * @returns {Promise<boolean>}
   */
  async detectStateChange(previousHash) {
    const currentHash = await this.getStateHash();
    return currentHash !== previousHash;
  }

  /**
   * Wait for a state change to occur
   * @param {number} [timeout] - Maximum time to wait in ms
   * @returns {Promise<boolean>} True if state changed, false if timeout
   */
  async waitForStateChange(timeout = null) {
    const waitTime = timeout || this.stateChangeTimeout;
    const initialHash = await this.getStateHash();
    const startTime = Date.now();
    
    while (Date.now() - startTime < waitTime) {
      await this.page.waitForTimeout(100);
      const currentHash = await this.getStateHash();
      if (currentHash !== initialHash) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get the difference between two states
   * @param {Object} oldState - Previous state
   * @param {Object} newState - Current state
   * @returns {Object} Difference description
   */
  getStateDiff(oldState, newState) {
    const diff = {
      urlChanged: oldState.url !== newState.url,
      titleChanged: oldState.title !== newState.title,
      contentChanged: false,
      modalOpened: !oldState.dom?.hasModal && newState.dom?.hasModal,
      modalClosed: oldState.dom?.hasModal && !newState.dom?.hasModal,
      navigationChanged: oldState.dom?.activeNavText !== newState.dom?.activeNavText,
      scrollChanged: oldState.dom?.scrollY !== newState.dom?.scrollY,
      changes: []
    };
    
    if (diff.urlChanged) {
      diff.changes.push(`URL: ${oldState.url} → ${newState.url}`);
    }
    if (diff.titleChanged) {
      diff.changes.push(`Title: "${oldState.title}" → "${newState.title}"`);
    }
    if (diff.modalOpened) {
      diff.changes.push('Modal opened');
    }
    if (diff.modalClosed) {
      diff.changes.push('Modal closed');
    }
    if (diff.navigationChanged) {
      diff.changes.push(`Navigation: ${oldState.dom?.activeNavText} → ${newState.dom?.activeNavText}`);
    }
    
    // Check if main content changed significantly
    if (oldState.dom?.mainContentLength && newState.dom?.mainContentLength) {
      const lengthDiff = Math.abs(oldState.dom.mainContentLength - newState.dom.mainContentLength);
      if (lengthDiff > 500) {
        diff.contentChanged = true;
        diff.changes.push('Significant content change');
      }
    }
    
    return diff;
  }

  // ==================== Navigation Interception ====================

  /**
   * Intercept navigation events and call callback
   * @param {Function} callback - Callback function(navigationInfo) => void
   * @returns {Promise<void>}
   */
  async interceptNavigation(callback) {
    if (this.intercepting) {
      throw new Error('Navigation interception already active');
    }
    
    this.navigationCallback = callback;
    this.intercepting = true;
    
    // Listen for various navigation events
    await this.page.evaluate(() => {
      // Store original methods
      window.__originalPushState = history.pushState.bind(history);
      window.__originalReplaceState = history.replaceState.bind(history);
      
      // Override pushState
      history.pushState = function(state, title, url) {
        window.__originalPushState(state, title, url);
        window.dispatchEvent(new CustomEvent('spa:navigation', {
          detail: { type: 'pushState', url, title, state }
        }));
      };
      
      // Override replaceState
      history.replaceState = function(state, title, url) {
        window.__originalReplaceState(state, title, url);
        window.dispatchEvent(new CustomEvent('spa:navigation', {
          detail: { type: 'replaceState', url, title, state }
        }));
      };
      
      // Listen for popstate (back/forward)
      window.addEventListener('popstate', (event) => {
        window.dispatchEvent(new CustomEvent('spa:navigation', {
          detail: { type: 'popstate', url: window.location.href, state: event.state }
        }));
      });
      
      // Listen for hashchange
      window.addEventListener('hashchange', (event) => {
        window.dispatchEvent(new CustomEvent('spa:navigation', {
          detail: { type: 'hashchange', oldUrl: event.oldURL, newUrl: event.newURL }
        }));
      });
    });
    
    // Expose handler function
    await this.page.exposeFunction('__handleSPANavigation', (detail) => {
      if (this.navigationCallback) {
        this.navigationCallback(detail);
      }
    });
    
    // Listen for the custom events
    await this.page.evaluate(() => {
      window.addEventListener('spa:navigation', async (event) => {
        await window.__handleSPANavigation(event.detail);
      });
    });
  }

  /**
   * Stop navigation interception
   * @returns {Promise<void>}
   */
  async stopInterception() {
    if (!this.intercepting) return;
    
    await this.page.evaluate(() => {
      // Restore original methods
      if (window.__originalPushState) {
        history.pushState = window.__originalPushState;
      }
      if (window.__originalReplaceState) {
        history.replaceState = window.__originalReplaceState;
      }
    });
    
    this.intercepting = false;
    this.navigationCallback = null;
  }

  /**
   * Wait for a route change in SPA
   * @param {number} [timeout] - Maximum time to wait in ms
   * @returns {Promise<Object|null>} Navigation info or null if timeout
   */
  async waitForRouteChange(timeout = null) {
    const waitTime = timeout || this.navigationTimeout;
    
    const initialUrl = this.page.url();
    const initialHash = await this.getStateHash();
    
    try {
      // Wait for URL change or significant DOM change
      const result = await Promise.race([
        // URL-based navigation
        this.page.waitForURL((url) => url.href !== initialUrl, { 
          timeout: waitTime 
        }).then(() => ({ type: 'url', newUrl: this.page.url() })),
        
        // State-based change (for SPAs that don't change URL)
        (async () => {
          const changed = await this.waitForStateChange(waitTime);
          if (changed) {
            return { type: 'state', previousHash: initialHash, newHash: this.currentStateHash };
          }
          throw new Error('No state change');
        })(),
        
        // Timeout
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), waitTime)
        )
      ]);
      
      return result;
    } catch (error) {
      if (error.message === 'Timeout' || error.message === 'No state change') {
        return null;
      }
      throw error;
    }
  }

  // ==================== History Management ====================

  /**
   * Check if the SPA history allows back navigation
   * @returns {Promise<boolean>}
   */
  async canNavigateBack() {
    return await this.page.evaluate(() => {
      // Check history length
      if (history.length <= 1) return false;
      
      // Check for SPA router's back capability
      // React Router
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        return true;
      }
      
      // Vue Router
      if (window.__VUE_ROUTER__) {
        return true;
      }
      
      // Default: assume we can go back if history > 1
      return history.length > 1;
    });
  }

  /**
   * Navigate back in SPA
   * @param {Object} [options] - Navigation options
   * @param {boolean} [options.waitForState] - Wait for state change after navigation
   * @returns {Promise<boolean>} True if navigation successful
   */
  async navigateBack(options = {}) {
    const { waitForState = true } = options;
    
    const canGoBack = await this.canNavigateBack();
    if (!canGoBack) {
      return false;
    }
    
    const previousHash = await this.getStateHash();
    
    await this.page.evaluate(() => {
      history.back();
    });
    
    if (waitForState) {
      // Wait for the back navigation to complete
      try {
        await Promise.race([
          this.page.waitForTimeout(500),
          this.waitForStateChange(2000)
        ]);
      } catch {}
    }
    
    // Verify state changed
    const currentHash = await this.getStateHash();
    return currentHash !== previousHash;
  }

  /**
   * Navigate forward in SPA
   * @returns {Promise<boolean>} True if navigation successful
   */
  async navigateForward() {
    const previousHash = await this.getStateHash();
    
    await this.page.evaluate(() => {
      history.forward();
    });
    
    await this.page.waitForTimeout(500);
    
    const currentHash = await this.getStateHash();
    return currentHash !== previousHash;
  }

  /**
   * Get the state history
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.stateHistory];
  }

  /**
   * Clear state history
   */
  clearHistory() {
    this.stateHistory = [];
    this.currentStateHash = null;
  }

  /**
   * Check if currently on a different state than initial
   * @returns {boolean}
   */
  hasNavigatedAway() {
    return this.stateHistory.length > 1;
  }
}

/**
 * Generate a hash of the current page state
 * Standalone function for use outside SPADetector
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<string>}
 */
export async function generateStateHash(page) {
  return await page.evaluate(() => {
    const state = {
      url: window.location.href,
      title: document.title,
      // Capture key DOM elements
      mainContent: document.querySelector('main, [role="main"], #app, #root')?.innerHTML?.slice(0, 1000),
      // Active navigation
      activeNav: document.querySelector('nav .active, nav [aria-current]')?.textContent,
      // Modal state
      hasModal: !!document.querySelector('[role="dialog"]:not([hidden])'),
      // Form count
      formCount: document.querySelectorAll('form').length
    };
    
    // Simple hash function
    const str = JSON.stringify(state);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  });
}

/**
 * Detect SPA framework from page
 * Standalone function for quick detection
 * @param {import('playwright').Page} page - Playwright page
 * @returns {Promise<string>} Framework name or 'unknown'
 */
export async function detectSPAFramework(page) {
  const detector = new SPADetector(page);
  const framework = await detector.detectFramework();
  return framework.name;
}

/**
 * Wait for SPA content to be ready after navigation
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} [options] - Options
 * @param {number} [options.timeout] - Maximum wait time
 * @returns {Promise<void>}
 */
export async function waitForSPAReady(page, options = {}) {
  const { timeout = 5000 } = options;
  
  await page.evaluate(async (timeout) => {
    return new Promise((resolve) => {
      // Check if content is already loaded
      const checkReady = () => {
        const main = document.querySelector('main, [role="main"], #app, #root, #__next');
        if (main && main.children.length > 0) {
          return true;
        }
        return false;
      };
      
      if (checkReady()) {
        resolve();
        return;
      }
      
      // Wait for content to appear
      const observer = new MutationObserver(() => {
        if (checkReady()) {
          observer.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  }, timeout);
}

export default SPADetector;
