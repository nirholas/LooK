/**
 * StateDetector - Detects page state and handles blocking elements
 * 
 * Recognizes modals, cookie consent banners, loading states,
 * and other UI elements that might block demo recording.
 */

/**
 * @typedef {'normal'|'modal'|'loading'|'error'|'consent'} PageStateType
 */

/**
 * @typedef {Object} PageState
 * @property {PageStateType} type - Current page state type
 * @property {boolean} hasModal - Whether a modal is open
 * @property {boolean} hasConsent - Whether a consent banner is showing
 * @property {boolean} isLoading - Whether page is still loading
 * @property {boolean} hasError - Whether an error state is detected
 * @property {string[]} blockingElements - Selectors of blocking elements
 */

/**
 * @typedef {Object} ConsentResult
 * @property {boolean} found - Whether a consent banner was found
 * @property {boolean} accepted - Whether it was successfully accepted
 * @property {string|null} selector - The selector that was used
 */

// Common modal selectors
const MODAL_SELECTORS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  '.modal.show',
  '.modal.visible',
  '.modal.open',
  '[class*="modal"]:not([class*="modal-"]):not([style*="display: none"])',
  '[class*="popup"]:not([style*="display: none"])',
  '[class*="overlay"]:not([class*="overlay-"])',
  '.lightbox',
  '[data-modal]',
  '[data-popup]'
];

// Modal close button selectors
const CLOSE_BUTTON_SELECTORS = [
  '[aria-label*="close" i]',
  '[aria-label*="dismiss" i]',
  'button[class*="close"]',
  '.close-button',
  '.modal-close',
  '.popup-close',
  '[data-dismiss="modal"]',
  '.modal button:has(svg)',
  '[class*="modal"] [class*="close"]'
];

// Cookie consent selectors
const CONSENT_BANNER_SELECTORS = [
  '#onetrust-banner-sdk',
  '#cookie-consent',
  '[class*="cookie-banner"]',
  '[class*="cookie-consent"]',
  '[class*="gdpr"]',
  '[id*="cookie"]',
  '[class*="CookieConsent"]',
  '.cc-banner',
  '#cookiebanner',
  '[data-testid*="cookie"]'
];

// Accept cookie button selectors
const ACCEPT_COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '[class*="accept-cookie"]',
  '[class*="accept-all"]',
  '[class*="accept-btn"]',
  'button:has-text("Accept")',
  'button:has-text("Accept All")',
  'button:has-text("Got it")',
  'button:has-text("OK")',
  'button:has-text("I agree")',
  '[data-testid*="accept"]',
  '.cc-accept',
  '.cc-allow'
];

// Loading state selectors
const LOADING_SELECTORS = [
  '[class*="spinner"]',
  '[class*="loading"]',
  '[class*="skeleton"]',
  '[aria-busy="true"]',
  '.loader',
  '[class*="progress"]',
  '.shimmer'
];

export class StateDetector {
  /**
   * Create a new StateDetector
   */
  constructor() {
    /** @type {import('playwright').Page|null} */
    this.page = null;
    
    /** @type {PageState} */
    this.currentState = {
      type: 'normal',
      hasModal: false,
      hasConsent: false,
      isLoading: false,
      hasError: false,
      blockingElements: []
    };
  }
  
  /**
   * Initialize with a page instance
   * @param {import('playwright').Page} page
   */
  async init(page) {
    this.page = page;
    await this.detectCurrentState();
  }
  
  /**
   * Detect the current page state
   * @returns {Promise<PageState>}
   */
  async detectCurrentState() {
    if (!this.page) {
      return this.currentState;
    }
    
    const blockingElements = [];
    
    // Check for modals
    const hasModal = await this.checkForModal();
    if (hasModal.found) {
      blockingElements.push(...hasModal.selectors);
    }
    
    // Check for consent banners
    const hasConsent = await this.checkForConsent();
    if (hasConsent.found) {
      blockingElements.push(...hasConsent.selectors);
    }
    
    // Check for loading states
    const isLoading = await this.checkForLoading();
    
    // Check for error states
    const hasError = await this.checkForError();
    
    // Determine primary state type
    let type = 'normal';
    if (isLoading) type = 'loading';
    else if (hasError) type = 'error';
    else if (hasModal.found) type = 'modal';
    else if (hasConsent.found) type = 'consent';
    
    this.currentState = {
      type,
      hasModal: hasModal.found,
      hasConsent: hasConsent.found,
      isLoading,
      hasError,
      blockingElements
    };
    
    return this.currentState;
  }
  
  /**
   * Get current state without re-detecting
   * @returns {PageState}
   */
  getCurrentState() {
    return this.currentState;
  }
  
  /**
   * Check if a modal is visible
   * @returns {Promise<{found: boolean, selectors: string[]}>}
   * @private
   */
  async checkForModal() {
    const found = [];
    
    for (const selector of MODAL_SELECTORS) {
      try {
        const visible = await this.page.locator(selector).first().isVisible({ timeout: 100 });
        if (visible) {
          found.push(selector);
        }
      } catch {
        // Selector didn't match
      }
    }
    
    return { found: found.length > 0, selectors: found };
  }
  
  /**
   * Check if a consent banner is visible
   * @returns {Promise<{found: boolean, selectors: string[]}>}
   * @private
   */
  async checkForConsent() {
    const found = [];
    
    for (const selector of CONSENT_BANNER_SELECTORS) {
      try {
        const visible = await this.page.locator(selector).first().isVisible({ timeout: 100 });
        if (visible) {
          found.push(selector);
        }
      } catch {
        // Selector didn't match
      }
    }
    
    return { found: found.length > 0, selectors: found };
  }
  
  /**
   * Check if page is in a loading state
   * @returns {Promise<boolean>}
   * @private
   */
  async checkForLoading() {
    for (const selector of LOADING_SELECTORS) {
      try {
        const visible = await this.page.locator(selector).first().isVisible({ timeout: 100 });
        if (visible) {
          return true;
        }
      } catch {
        // Selector didn't match
      }
    }
    return false;
  }
  
  /**
   * Check if page has an error state
   * @returns {Promise<boolean>}
   * @private
   */
  async checkForError() {
    // Check for common error indicators
    const errorPatterns = [
      'text=Error',
      'text=404',
      'text=500',
      '[class*="error"]',
      '[class*="Error"]',
      'text=Something went wrong',
      'text=Page not found'
    ];
    
    for (const pattern of errorPatterns) {
      try {
        const visible = await this.page.locator(pattern).first().isVisible({ timeout: 100 });
        if (visible) {
          return true;
        }
      } catch {
        // Pattern didn't match
      }
    }
    return false;
  }
  
  /**
   * Wait for page content to be ready (no loading states)
   * @param {number} [timeout=10000] - Maximum wait time in ms
   * @returns {Promise<boolean>} True if page became ready
   */
  async waitForContentReady(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await this.detectCurrentState();
      
      if (!this.currentState.isLoading) {
        return true;
      }
      
      await this.page.waitForTimeout(200);
    }
    
    return false;
  }
  
  /**
   * Check if page is stable (not loading, no blocking elements)
   * @returns {Promise<boolean>}
   */
  async isPageStable() {
    await this.detectCurrentState();
    return (
      !this.currentState.isLoading &&
      !this.currentState.hasError &&
      this.currentState.type === 'normal'
    );
  }
  
  /**
   * Dismiss all blocking elements (modals, consent banners)
   * @returns {Promise<number>} Number of elements dismissed
   */
  async dismissBlockingElements() {
    let dismissed = 0;
    
    // Handle consent banners first
    const consentResult = await this.acceptCookies();
    if (consentResult.accepted) {
      dismissed++;
    }
    
    // Then handle modals
    const modalResult = await this.dismissModals();
    dismissed += modalResult;
    
    // Update state
    await this.detectCurrentState();
    
    return dismissed;
  }
  
  /**
   * Attempt to accept cookie consent
   * @returns {Promise<ConsentResult>}
   */
  async acceptCookies() {
    // First check if there's a consent banner
    const hasConsent = await this.checkForConsent();
    if (!hasConsent.found) {
      return { found: false, accepted: false, selector: null };
    }
    
    // Try to click accept buttons
    for (const selector of ACCEPT_COOKIE_SELECTORS) {
      try {
        const button = this.page.locator(selector).first();
        const visible = await button.isVisible({ timeout: 100 });
        
        if (visible) {
          await button.click({ timeout: 2000 });
          await this.page.waitForTimeout(500);
          
          // Verify it was dismissed
          const stillVisible = await this.checkForConsent();
          if (!stillVisible.found) {
            return { found: true, accepted: true, selector };
          }
        }
      } catch {
        // Button not clickable, try next
      }
    }
    
    return { found: true, accepted: false, selector: null };
  }
  
  /**
   * Detect cookie consent banner
   * @returns {Promise<{found: boolean, element: string|null}>}
   */
  async detectCookieConsent() {
    const result = await this.checkForConsent();
    return {
      found: result.found,
      element: result.selectors[0] || null
    };
  }
  
  /**
   * Dismiss visible modals
   * @returns {Promise<number>} Number of modals dismissed
   * @private
   */
  async dismissModals() {
    let dismissed = 0;
    const maxAttempts = 5;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const hasModal = await this.checkForModal();
      if (!hasModal.found) {
        break;
      }
      
      // Try close buttons first
      let closed = false;
      for (const selector of CLOSE_BUTTON_SELECTORS) {
        try {
          const button = this.page.locator(selector).first();
          const visible = await button.isVisible({ timeout: 100 });
          
          if (visible) {
            await button.click({ timeout: 2000 });
            await this.page.waitForTimeout(300);
            closed = true;
            dismissed++;
            break;
          }
        } catch {
          // Button not clickable
        }
      }
      
      // If no close button worked, try Escape key
      if (!closed) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
        
        const stillHasModal = await this.checkForModal();
        if (!stillHasModal.found) {
          dismissed++;
        }
      }
    }
    
    return dismissed;
  }
}

export default StateDetector;
