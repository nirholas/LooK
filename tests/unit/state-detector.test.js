/**
 * StateDetector Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateDetector } from '../../src/v2/state-detector.js';

// Mock page
function createMockPage(options = {}) {
  const visibleSelectors = new Set(options.visibleSelectors || []);
  
  return {
    locator: vi.fn((selector) => ({
      first: () => ({
        isVisible: vi.fn(async () => {
          for (const pattern of visibleSelectors) {
            if (selector.includes(pattern) || pattern.includes(selector)) {
              return true;
            }
          }
          return false;
        }),
        click: vi.fn(async () => {}),
        getAttribute: vi.fn(async () => null)
      }),
      all: vi.fn(async () => [])
    })),
    keyboard: {
      press: vi.fn(async () => {})
    },
    waitForTimeout: vi.fn(async () => {})
  };
}

describe('StateDetector', () => {
  let detector;
  
  beforeEach(() => {
    detector = new StateDetector();
  });
  
  describe('constructor', () => {
    it('should initialize with idle state', () => {
      expect(detector.currentState.type).toBe('normal');
      expect(detector.currentState.hasModal).toBe(false);
      expect(detector.currentState.hasConsent).toBe(false);
      expect(detector.currentState.isLoading).toBe(false);
    });
    
    it('should have null page before init', () => {
      expect(detector.page).toBeNull();
    });
  });
  
  describe('init', () => {
    it('should set page and detect state', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      expect(detector.page).toBe(mockPage);
    });
  });
  
  describe('detectCurrentState', () => {
    it('should detect normal state when no blocking elements', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const state = await detector.detectCurrentState();
      
      expect(state.type).toBe('normal');
      expect(state.blockingElements).toHaveLength(0);
    });
    
    it('should detect modal state', async () => {
      const mockPage = createMockPage({
        visibleSelectors: ['[role="dialog"]']
      });
      await detector.init(mockPage);
      
      const state = await detector.detectCurrentState();
      
      expect(state.hasModal).toBe(true);
      expect(state.type).toBe('modal');
    });
    
    it('should detect consent state', async () => {
      const mockPage = createMockPage({
        visibleSelectors: ['cookie-consent']
      });
      await detector.init(mockPage);
      
      const state = await detector.detectCurrentState();
      
      expect(state.hasConsent).toBe(true);
    });
    
    it('should detect loading state', async () => {
      const mockPage = createMockPage({
        visibleSelectors: ['spinner']
      });
      await detector.init(mockPage);
      
      const state = await detector.detectCurrentState();
      
      expect(state.isLoading).toBe(true);
      expect(state.type).toBe('loading');
    });
  });
  
  describe('getCurrentState', () => {
    it('should return cached state', () => {
      detector.currentState = {
        type: 'modal',
        hasModal: true,
        hasConsent: false,
        isLoading: false,
        hasError: false,
        blockingElements: ['[role="dialog"]']
      };
      
      const state = detector.getCurrentState();
      
      expect(state.type).toBe('modal');
      expect(state.hasModal).toBe(true);
    });
  });
  
  describe('isPageStable', () => {
    it('should return true when page is normal', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const isStable = await detector.isPageStable();
      
      expect(isStable).toBe(true);
    });
    
    it('should return false when loading', async () => {
      const mockPage = createMockPage({
        visibleSelectors: ['loading']
      });
      await detector.init(mockPage);
      
      const isStable = await detector.isPageStable();
      
      expect(isStable).toBe(false);
    });
  });
  
  describe('waitForContentReady', () => {
    it('should return true immediately when not loading', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const result = await detector.waitForContentReady(1000);
      
      expect(result).toBe(true);
    });
  });
  
  describe('dismissBlockingElements', () => {
    it('should return 0 when no blocking elements', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const dismissed = await detector.dismissBlockingElements();
      
      expect(dismissed).toBe(0);
    });
  });
  
  describe('acceptCookies', () => {
    it('should return found false when no consent banner', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const result = await detector.acceptCookies();
      
      expect(result.found).toBe(false);
      expect(result.accepted).toBe(false);
    });
  });
  
  describe('detectCookieConsent', () => {
    it('should detect cookie consent banner', async () => {
      const mockPage = createMockPage({
        visibleSelectors: ['cookie-banner']
      });
      await detector.init(mockPage);
      
      const result = await detector.detectCookieConsent();
      
      expect(result.found).toBe(true);
    });
    
    it('should return found false when no banner', async () => {
      const mockPage = createMockPage();
      await detector.init(mockPage);
      
      const result = await detector.detectCookieConsent();
      
      expect(result.found).toBe(false);
    });
  });
});
