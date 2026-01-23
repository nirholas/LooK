/**
 * ErrorRecovery - Robust error handling and recovery for demo generation
 * 
 * Provides strategies to recover from common errors during demo recording,
 * including navigation failures, missing elements, modal interruptions, and timeouts.
 * 
 * @module error-recovery
 */

/**
 * @typedef {'navigation-failed' | 'element-not-found' | 'modal-blocked' | 'timeout' | 'screenshot-failed' | 'unknown'} ErrorType
 */

/**
 * @typedef {'retry' | 'skip' | 'fallback' | 'abort'} RecoveryAction
 */

/**
 * @typedef {Object} RecoveryResult
 * @property {RecoveryAction} action - The action to take
 * @property {string} [message] - Optional message describing the recovery
 * @property {*} [data] - Optional data from recovery attempt
 */

/**
 * @typedef {Object} RecoveryContext
 * @property {import('playwright').Page} page - Playwright page instance
 * @property {Object} [action] - The action that failed
 * @property {Object} [stateDetector] - StateDetector instance if available
 * @property {Object} [elementDiscovery] - ElementDiscovery instance if available
 * @property {string} [selector] - Selector that failed (for element errors)
 * @property {*} [currentTarget] - Current target element
 */

/**
 * @typedef {Object} ErrorLogEntry
 * @property {Error} error - The original error
 * @property {ErrorType} type - Classified error type
 * @property {RecoveryContext} context - Context at time of error
 * @property {number} time - Timestamp of error
 * @property {RecoveryAction} resolution - How it was resolved
 */

/**
 * Handles errors during demo generation with intelligent recovery strategies
 */
export class ErrorRecovery {
  /**
   * Create an ErrorRecovery instance
   * @param {Object} [orchestrator] - Parent orchestrator for context
   */
  constructor(orchestrator = null) {
    /** @type {Object|null} */
    this.orchestrator = orchestrator;
    
    /** @type {number} */
    this.maxRetries = 3;
    
    /** @type {ErrorLogEntry[]} */
    this.errorLog = [];
    
    /** @type {Map<string, number>} */
    this.errorCounts = new Map();
    
    /** @type {number} */
    this.totalErrors = 0;
    
    /** @type {number} */
    this.maxTotalErrors = 10;
    
    this.setupStrategies();
  }
  
  /**
   * Setup recovery strategies for different error types
   * @private
   */
  setupStrategies() {
    /**
     * @type {Object.<ErrorType, function(Error, RecoveryContext): Promise<RecoveryAction>>}
     */
    this.strategies = {
      /**
       * Handle navigation failures - try refresh or wait
       */
      'navigation-failed': async (error, context) => {
        try {
          // Wait a moment for network to stabilize
          await this.sleep(1000);
          
          // Try refreshing the page
          await context.page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
          
          // Wait for content to be ready
          if (context.stateDetector?.waitForContentReady) {
            await context.stateDetector.waitForContentReady();
          } else {
            await this.sleep(2000);
          }
          
          return 'retry';
        } catch {
          return 'skip';
        }
      },
      
      /**
       * Handle missing elements - find alternatives or skip
       */
      'element-not-found': async (error, context) => {
        // Try to find alternative elements
        if (context.elementDiscovery?.findAlternatives && context.selector) {
          try {
            const alternatives = await context.elementDiscovery.findAlternatives(context.selector);
            if (alternatives && alternatives.length > 0) {
              context.currentTarget = alternatives[0];
              return 'retry';
            }
          } catch {
            // Ignore and skip
          }
        }
        
        // Can't find alternatives, skip this action
        return 'skip';
      },
      
      /**
       * Handle modal/popup blocking - dismiss and continue
       */
      'modal-blocked': async (error, context) => {
        try {
          // Try using state detector to dismiss
          if (context.stateDetector?.dismissBlockingElements) {
            await context.stateDetector.dismissBlockingElements();
            await this.sleep(500);
            return 'retry';
          }
          
          // Manual dismissal attempt
          await this.dismissModalsManually(context.page);
          return 'retry';
        } catch {
          return 'skip';
        }
      },
      
      /**
       * Handle timeouts - usually skip and move on
       */
      'timeout': async (error, context) => {
        // Timeouts are usually recoverable by skipping
        return 'skip';
      },
      
      /**
       * Handle screenshot failures - retry once then skip
       */
      'screenshot-failed': async (error, context) => {
        try {
          // Wait for any transitions to complete
          await this.sleep(500);
          return 'retry';
        } catch {
          return 'skip';
        }
      },
      
      /**
       * Handle unknown errors - log and try to continue
       */
      'unknown': async (error, context) => {
        // Log the error for debugging
        console.warn('Unknown error during demo:', error.message);
        return 'skip';
      }
    };
  }
  
  /**
   * Main recovery method - attempt to recover from an error
   * @param {Error} error - The error that occurred
   * @param {RecoveryContext} context - Context for recovery
   * @returns {Promise<RecoveryResult>} Recovery result
   */
  async recover(error, context) {
    this.totalErrors++;
    
    // Check if we've hit too many errors
    if (this.totalErrors >= this.maxTotalErrors) {
      this.logError(error, 'unknown', context, 'fallback');
      return { 
        action: 'fallback', 
        message: 'Too many errors encountered, falling back to simple demo' 
      };
    }
    
    // Classify the error
    const errorType = this.classifyError(error);
    
    // Track error frequency by type
    const typeCount = (this.errorCounts.get(errorType) || 0) + 1;
    this.errorCounts.set(errorType, typeCount);
    
    // If same error type keeps happening, escalate to fallback
    if (typeCount >= this.maxRetries * 2) {
      this.logError(error, errorType, context, 'fallback');
      return { 
        action: 'fallback', 
        message: `Repeated ${errorType} errors, falling back` 
      };
    }
    
    // Get the appropriate strategy
    const strategy = this.strategies[errorType] || this.strategies['unknown'];
    
    // Try recovery with retries
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await strategy(error, context);
        
        if (result === 'retry') {
          this.logError(error, errorType, context, 'retry');
          return { action: 'retry', message: `Recovered from ${errorType}` };
        } else if (result === 'skip') {
          this.logError(error, errorType, context, 'skip');
          return { action: 'skip', message: `Skipping due to ${errorType}` };
        } else if (result === 'abort' || result === 'fallback') {
          this.logError(error, errorType, context, 'fallback');
          return { action: 'fallback', message: `Cannot recover from ${errorType}` };
        }
      } catch (recoveryError) {
        // Recovery itself failed, continue to next attempt
        console.warn(`Recovery attempt ${attempt + 1} failed:`, recoveryError.message);
      }
    }
    
    // All retries exhausted
    this.logError(error, errorType, context, 'fallback');
    return { 
      action: 'fallback', 
      message: 'Recovery attempts exhausted' 
    };
  }
  
  /**
   * Classify an error into a known type
   * @param {Error} error - The error to classify
   * @returns {ErrorType} The classified error type
   */
  classifyError(error) {
    const message = (error.message || '').toLowerCase();
    const name = (error.name || '').toLowerCase();
    
    // Navigation errors
    if (
      message.includes('navigation') ||
      message.includes('net::') ||
      message.includes('failed to load') ||
      message.includes('page.goto')
    ) {
      return 'navigation-failed';
    }
    
    // Element not found
    if (
      message.includes('selector') ||
      message.includes('element') ||
      message.includes('not found') ||
      message.includes('no element') ||
      message.includes('waiting for') ||
      message.includes('locator')
    ) {
      return 'element-not-found';
    }
    
    // Modal/dialog blocking
    if (
      message.includes('modal') ||
      message.includes('dialog') ||
      message.includes('popup') ||
      message.includes('overlay') ||
      message.includes('blocked')
    ) {
      return 'modal-blocked';
    }
    
    // Timeout errors
    if (
      message.includes('timeout') ||
      name.includes('timeout') ||
      message.includes('exceeded')
    ) {
      return 'timeout';
    }
    
    // Screenshot errors
    if (
      message.includes('screenshot') ||
      message.includes('capture')
    ) {
      return 'screenshot-failed';
    }
    
    return 'unknown';
  }
  
  /**
   * Log an error with context
   * @param {Error} error - The error
   * @param {ErrorType} type - Classified type
   * @param {RecoveryContext} context - Error context
   * @param {RecoveryAction} resolution - How it was resolved
   * @private
   */
  logError(error, type, context, resolution) {
    this.errorLog.push({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      type,
      context: {
        url: context.page?.url?.() || 'unknown',
        action: context.action?.type || 'unknown',
        selector: context.selector || null
      },
      time: Date.now(),
      resolution
    });
  }
  
  /**
   * Attempt to dismiss modals manually
   * @param {import('playwright').Page} page - The page
   * @private
   */
  async dismissModalsManually(page) {
    const dismissSelectors = [
      // Close buttons
      '[aria-label="Close"]',
      '[aria-label="Dismiss"]',
      'button[class*="close"]',
      'button[class*="dismiss"]',
      '.modal-close',
      '.popup-close',
      '.close-button',
      '[data-dismiss="modal"]',
      
      // X buttons
      'button:has-text("×")',
      'button:has-text("✕")',
      'button:has-text("X")',
      
      // Text buttons
      'button:has-text("No thanks")',
      'button:has-text("Maybe later")',
      'button:has-text("Not now")',
      'button:has-text("Skip")',
      'button:has-text("Cancel")',
      
      // Cookie banners
      '[id*="cookie"] button',
      '[class*="cookie"] button',
      '[id*="consent"] button',
      '[class*="consent"] button',
      '[id*="gdpr"] button'
    ];
    
    for (const selector of dismissSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click({ timeout: 1000 });
            await this.sleep(300);
            return; // Dismissed successfully
          }
        }
      } catch {
        // Continue trying other selectors
      }
    }
    
    // Try pressing Escape
    try {
      await page.keyboard.press('Escape');
      await this.sleep(300);
    } catch {
      // Ignore
    }
  }
  
  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    return {
      totalErrors: this.totalErrors,
      errorsByType: Object.fromEntries(this.errorCounts),
      errorLog: this.errorLog,
      successRate: this.totalErrors > 0 
        ? this.errorLog.filter(e => e.resolution === 'retry' || e.resolution === 'skip').length / this.totalErrors 
        : 1
    };
  }
  
  /**
   * Reset error tracking
   */
  reset() {
    this.errorLog = [];
    this.errorCounts.clear();
    this.totalErrors = 0;
  }
  
  /**
   * Check if we should abort due to errors
   * @returns {boolean} True if we should abort
   */
  shouldAbort() {
    return this.totalErrors >= this.maxTotalErrors;
  }
  
  /**
   * Sleep helper
   * @param {number} ms - Milliseconds to sleep
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ErrorRecovery;
