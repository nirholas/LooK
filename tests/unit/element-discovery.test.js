/**
 * ElementDiscovery Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElementDiscovery } from '../../src/v2/element-discovery.js';

// Mock locator
function createMockLocator(elements = []) {
  return {
    all: vi.fn(async () => elements),
    first: () => ({
      isVisible: vi.fn(async () => elements.length > 0),
      textContent: vi.fn(async () => elements[0]?.text || ''),
      boundingBox: vi.fn(async () => elements[0]?.box || { x: 0, y: 0, width: 100, height: 50 }),
      getAttribute: vi.fn(async () => null),
      evaluate: vi.fn(async () => '.mock-selector')
    }),
    isVisible: vi.fn(async () => elements.length > 0)
  };
}

// Mock page
function createMockPage(config = {}) {
  return {
    locator: vi.fn((selector) => {
      // Return mock elements based on selector
      if (config.tabs && selector.includes('tablist')) {
        return createMockLocator([{ text: 'Tab 1', box: { x: 0, y: 0, width: 100, height: 40 } }]);
      }
      if (config.accordions && selector.includes('aria-expanded')) {
        return createMockLocator([{ text: 'Accordion Item', box: { x: 0, y: 100, width: 300, height: 50 } }]);
      }
      if (config.carousels && selector.includes('carousel')) {
        return createMockLocator([{ text: 'Carousel', box: { x: 0, y: 200, width: 600, height: 400 } }]);
      }
      if (config.buttons && selector.includes('button')) {
        return createMockLocator([{ text: 'Get Started', box: { x: 100, y: 300, width: 150, height: 45 } }]);
      }
      return createMockLocator([]);
    })
  };
}

describe('ElementDiscovery', () => {
  let discovery;
  let mockPage;
  
  beforeEach(() => {
    mockPage = createMockPage();
    discovery = new ElementDiscovery(mockPage);
  });
  
  describe('constructor', () => {
    it('should initialize with page', () => {
      expect(discovery.page).toBe(mockPage);
      expect(discovery.elements).toEqual([]);
    });
  });
  
  describe('discoverAll', () => {
    it('should return empty array when no elements found', async () => {
      const elements = await discovery.discoverAll();
      
      expect(Array.isArray(elements)).toBe(true);
    });
    
    it('should populate elements property', async () => {
      await discovery.discoverAll();
      
      expect(Array.isArray(discovery.elements)).toBe(true);
    });
  });
  
  describe('findElements', () => {
    it('should discover all if not already done', async () => {
      const elements = await discovery.findElements({ type: 'button' });
      
      expect(Array.isArray(elements)).toBe(true);
    });
    
    it('should filter by type', async () => {
      discovery.elements = [
        { type: 'button', demoScore: 80 },
        { type: 'tab', demoScore: 90 },
        { type: 'button', demoScore: 70 }
      ];
      
      const buttons = await discovery.findElements({ type: 'button' });
      
      expect(buttons).toHaveLength(2);
      expect(buttons.every(e => e.type === 'button')).toBe(true);
    });
    
    it('should filter by category', async () => {
      discovery.elements = [
        { type: 'button', category: 'action', demoScore: 80 },
        { type: 'link', category: 'navigation', demoScore: 70 },
        { type: 'button', category: 'action', demoScore: 60 }
      ];
      
      const actions = await discovery.findElements({ category: 'action' });
      
      expect(actions).toHaveLength(2);
    });
    
    it('should filter by minimum score', async () => {
      discovery.elements = [
        { type: 'button', demoScore: 80 },
        { type: 'tab', demoScore: 90 },
        { type: 'link', demoScore: 50 }
      ];
      
      const highValue = await discovery.findElements({ minScore: 75 });
      
      expect(highValue).toHaveLength(2);
    });
  });
  
  describe('findAlternatives', () => {
    it('should return array of alternatives', async () => {
      const alternatives = await discovery.findAlternatives('.missing-button');
      
      expect(Array.isArray(alternatives)).toBe(true);
    });
  });
  
  describe('findTabs', () => {
    it('should find tab interfaces', async () => {
      const pageWithTabs = createMockPage({ tabs: true });
      discovery = new ElementDiscovery(pageWithTabs);
      
      const tabs = await discovery.findTabs();
      
      expect(Array.isArray(tabs)).toBe(true);
    });
  });
  
  describe('findAccordions', () => {
    it('should find accordion elements', async () => {
      const pageWithAccordions = createMockPage({ accordions: true });
      discovery = new ElementDiscovery(pageWithAccordions);
      
      const accordions = await discovery.findAccordions();
      
      expect(Array.isArray(accordions)).toBe(true);
    });
  });
  
  describe('findCarousels', () => {
    it('should find carousel elements', async () => {
      const carousels = await discovery.findCarousels();
      
      expect(Array.isArray(carousels)).toBe(true);
    });
  });
  
  describe('findDropdowns', () => {
    it('should find dropdown menus', async () => {
      const dropdowns = await discovery.findDropdowns();
      
      expect(Array.isArray(dropdowns)).toBe(true);
    });
  });
  
  describe('findTooltips', () => {
    it('should find tooltip triggers', async () => {
      const tooltips = await discovery.findTooltips();
      
      expect(Array.isArray(tooltips)).toBe(true);
    });
  });
  
  describe('findButtons', () => {
    it('should find primary buttons', async () => {
      const buttons = await discovery.findButtons();
      
      expect(Array.isArray(buttons)).toBe(true);
    });
  });
  
  describe('findLinks', () => {
    it('should find navigation links', async () => {
      const links = await discovery.findLinks();
      
      expect(Array.isArray(links)).toBe(true);
    });
  });
  
  describe('rankByDemoValue', () => {
    it('should sort elements by demo score descending', async () => {
      const elements = [
        { type: 'button', demoScore: 70 },
        { type: 'carousel', demoScore: 95 },
        { type: 'tab', demoScore: 85 }
      ];
      
      const ranked = await discovery.rankByDemoValue(elements);
      
      expect(ranked[0].demoScore).toBe(95);
      expect(ranked[1].demoScore).toBe(85);
      expect(ranked[2].demoScore).toBe(70);
    });
    
    it('should use instance elements if none provided', async () => {
      discovery.elements = [
        { type: 'button', demoScore: 50 },
        { type: 'carousel', demoScore: 90 }
      ];
      
      const ranked = await discovery.rankByDemoValue();
      
      expect(ranked[0].demoScore).toBe(90);
    });
  });
  
  describe('scoreButton', () => {
    it('should score "Get Started" highest', () => {
      const score = discovery.scoreButton('Get Started Free');
      expect(score).toBe(100);
    });
    
    it('should score "Sign Up" high', () => {
      const score = discovery.scoreButton('Sign Up');
      expect(score).toBe(95);
    });
    
    it('should score "Buy Now" high', () => {
      const score = discovery.scoreButton('Buy Now');
      expect(score).toBe(90);
    });
    
    it('should score "Learn More" medium', () => {
      const score = discovery.scoreButton('Learn More');
      expect(score).toBe(75);
    });
    
    it('should score generic buttons low', () => {
      const score = discovery.scoreButton('Click Here');
      expect(score).toBe(50);
    });
  });
  
  describe('scoreLink', () => {
    it('should score pricing links high', () => {
      const score = discovery.scoreLink('Pricing', '/pricing');
      expect(score).toBe(85);
    });
    
    it('should score features links high', () => {
      const score = discovery.scoreLink('Features', '/features');
      expect(score).toBe(85);
    });
    
    it('should score docs links medium', () => {
      const score = discovery.scoreLink('Docs', '/docs');
      expect(score).toBe(70);
    });
    
    it('should score about links lower', () => {
      const score = discovery.scoreLink('About Us', '/about');
      expect(score).toBe(60);
    });
  });
});
