/**
 * ElementDiscovery - Discovers and categorizes interactive elements
 * 
 * Finds tabs, accordions, dropdowns, carousels, and other interactive
 * elements that would make good demo moments.
 */

/**
 * @typedef {'tab'|'accordion'|'dropdown'|'carousel'|'tooltip'|'button'|'link'|'input'|'toggle'} ElementType
 */

/**
 * @typedef {'navigation'|'content'|'form'|'action'|'feedback'} ElementCategory
 */

/**
 * @typedef {Object} Position
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} width - Width
 * @property {number} height - Height
 */

/**
 * @typedef {Object} DiscoveredElement
 * @property {ElementType} type - Element type
 * @property {string} selector - CSS selector
 * @property {string} text - Visible text
 * @property {Position} position - Element position and size
 * @property {boolean} isVisible - Currently visible
 * @property {number} demoScore - 0-100 demo value score
 * @property {ElementCategory} category - Element category
 * @property {DiscoveredElement[]} [children] - Child elements
 * @property {boolean} [isExpanded] - For accordions/dropdowns
 * @property {number} [index] - For tab/carousel items
 */

// Tab detection patterns
const TAB_PATTERNS = [
  { container: '[role="tablist"]', tab: '[role="tab"]', panel: '[role="tabpanel"]' },
  { container: '.tabs', tab: '.tab', panel: '.tab-content' },
  { container: '.nav-tabs', tab: '.nav-link', panel: '.tab-pane' },
  { container: '[data-tabs]', tab: '[data-tab]', panel: '[data-tab-content]' },
  { container: '.tab-list', tab: '.tab-item', panel: '.tab-panel' }
];

// Accordion detection patterns
const ACCORDION_PATTERNS = [
  { trigger: '[aria-expanded]', content: '[aria-hidden]' },
  { trigger: '.accordion-header', content: '.accordion-content' },
  { trigger: '.accordion-button', content: '.accordion-collapse' },
  { trigger: 'summary', content: 'details > *:not(summary)' },
  { trigger: '[data-toggle="collapse"]', content: '.collapse' },
  { trigger: '.faq-question', content: '.faq-answer' },
  { trigger: '.collapsible-header', content: '.collapsible-body' }
];

// Carousel detection patterns
const CAROUSEL_PATTERNS = [
  { container: '.carousel', prev: '.carousel-control-prev', next: '.carousel-control-next', dots: '.carousel-indicators' },
  { container: '.slider', prev: '.slick-prev', next: '.slick-next', dots: '.slick-dots' },
  { container: '.swiper', prev: '.swiper-button-prev', next: '.swiper-button-next', dots: '.swiper-pagination' },
  { container: '[data-carousel]', prev: '[data-carousel-prev]', next: '[data-carousel-next]', dots: '[data-carousel-dots]' },
  { container: '.glide', prev: '.glide__arrow--left', next: '.glide__arrow--right', dots: '.glide__bullets' }
];

// Dropdown detection patterns
const DROPDOWN_PATTERNS = [
  { trigger: '[aria-haspopup="menu"]', menu: '[role="menu"]' },
  { trigger: '.dropdown-toggle', menu: '.dropdown-menu' },
  { trigger: '[data-toggle="dropdown"]', menu: '.dropdown-menu' },
  { trigger: '[data-dropdown-trigger]', menu: '[data-dropdown-menu]' },
  { trigger: '.select-trigger', menu: '.select-options' }
];

// Tooltip patterns
const TOOLTIP_PATTERNS = [
  '[data-tooltip]',
  '[data-tippy]',
  '[title]',
  '.tooltip-trigger',
  '[aria-describedby]'
];

export class ElementDiscovery {
  /**
   * Create a new ElementDiscovery instance
   * @param {import('playwright').Page} page - Playwright page
   */
  constructor(page) {
    /** @type {import('playwright').Page} */
    this.page = page;
    
    /** @type {DiscoveredElement[]} */
    this.elements = [];
  }
  
  /**
   * Discover all interactive elements on the page
   * @returns {Promise<DiscoveredElement[]>}
   */
  async discoverAll() {
    this.elements = [];
    
    // Discover each type
    const tabs = await this.findTabs();
    const accordions = await this.findAccordions();
    const carousels = await this.findCarousels();
    const dropdowns = await this.findDropdowns();
    const tooltips = await this.findTooltips();
    const buttons = await this.findButtons();
    const links = await this.findLinks();
    
    this.elements = [
      ...tabs,
      ...accordions,
      ...carousels,
      ...dropdowns,
      ...tooltips,
      ...buttons,
      ...links
    ];
    
    return this.elements;
  }
  
  /**
   * Find elements matching specific criteria
   * @param {Object} criteria - Search criteria
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findElements(criteria = {}) {
    if (this.elements.length === 0) {
      await this.discoverAll();
    }
    
    return this.elements.filter(el => {
      if (criteria.type && el.type !== criteria.type) return false;
      if (criteria.category && el.category !== criteria.category) return false;
      if (criteria.minScore && el.demoScore < criteria.minScore) return false;
      if (criteria.isVisible !== undefined && el.isVisible !== criteria.isVisible) return false;
      return true;
    });
  }
  
  /**
   * Find alternative elements for a failed action
   * @param {string} selector - Original selector that failed
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findAlternatives(selector) {
    // Try to understand what type of element was targeted
    const alternatives = [];
    
    // Find elements with similar text
    const originalText = await this.getTextFromSelector(selector);
    if (originalText) {
      const textMatches = await this.findByText(originalText);
      alternatives.push(...textMatches);
    }
    
    // Find similar elements by class pattern
    const classPattern = this.extractClassPattern(selector);
    if (classPattern) {
      const classMatches = await this.findByClassPattern(classPattern);
      alternatives.push(...classMatches);
    }
    
    return alternatives;
  }
  
  /**
   * Find tab interfaces
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findTabs() {
    const tabs = [];
    
    for (const pattern of TAB_PATTERNS) {
      try {
        const containers = await this.page.locator(pattern.container).all();
        
        for (const container of containers) {
          const isVisible = await container.isVisible();
          if (!isVisible) continue;
          
          const tabElements = await container.locator(pattern.tab).all();
          const position = await container.boundingBox();
          
          const children = [];
          for (let i = 0; i < tabElements.length; i++) {
            const tab = tabElements[i];
            const tabText = await tab.textContent();
            const tabPos = await tab.boundingBox();
            const isSelected = await tab.getAttribute('aria-selected') === 'true';
            
            children.push({
              type: 'tab',
              selector: `${pattern.container} ${pattern.tab}:nth-child(${i + 1})`,
              text: tabText?.trim() || '',
              position: tabPos || { x: 0, y: 0, width: 0, height: 0 },
              isVisible: true,
              demoScore: isSelected ? 60 : 80, // Unselected tabs are more demo-worthy
              category: 'navigation',
              index: i
            });
          }
          
          if (children.length > 1) {
            tabs.push({
              type: 'tab',
              selector: pattern.container,
              text: 'Tab Interface',
              position: position || { x: 0, y: 0, width: 0, height: 0 },
              isVisible: true,
              demoScore: 90,
              category: 'navigation',
              children
            });
          }
        }
      } catch {
        // Pattern didn't match
      }
    }
    
    return tabs;
  }
  
  /**
   * Find accordion/collapsible elements
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findAccordions() {
    const accordions = [];
    
    for (const pattern of ACCORDION_PATTERNS) {
      try {
        const triggers = await this.page.locator(pattern.trigger).all();
        
        for (const trigger of triggers) {
          const isVisible = await trigger.isVisible();
          if (!isVisible) continue;
          
          const text = await trigger.textContent();
          const position = await trigger.boundingBox();
          const isExpanded = await trigger.getAttribute('aria-expanded') === 'true';
          
          // Generate unique selector
          const selector = await this.generateSelector(trigger);
          
          accordions.push({
            type: 'accordion',
            selector,
            text: text?.trim() || '',
            position: position || { x: 0, y: 0, width: 0, height: 0 },
            isVisible: true,
            demoScore: isExpanded ? 60 : 85, // Collapsed items are more demo-worthy
            category: 'content',
            isExpanded
          });
        }
      } catch {
        // Pattern didn't match
      }
    }
    
    return accordions;
  }
  
  /**
   * Find carousel/slider elements
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findCarousels() {
    const carousels = [];
    
    for (const pattern of CAROUSEL_PATTERNS) {
      try {
        const containers = await this.page.locator(pattern.container).all();
        
        for (const container of containers) {
          const isVisible = await container.isVisible();
          if (!isVisible) continue;
          
          const position = await container.boundingBox();
          const hasNext = await container.locator(pattern.next).isVisible().catch(() => false);
          const hasPrev = await container.locator(pattern.prev).isVisible().catch(() => false);
          
          if (hasNext || hasPrev) {
            const selector = await this.generateSelector(container);
            
            carousels.push({
              type: 'carousel',
              selector,
              text: 'Carousel/Slider',
              position: position || { x: 0, y: 0, width: 0, height: 0 },
              isVisible: true,
              demoScore: 95, // Carousels are very demo-worthy
              category: 'content',
              children: [
                hasNext ? { type: 'button', selector: `${selector} ${pattern.next}`, text: 'Next', demoScore: 90 } : null,
                hasPrev ? { type: 'button', selector: `${selector} ${pattern.prev}`, text: 'Previous', demoScore: 70 } : null
              ].filter(Boolean)
            });
          }
        }
      } catch {
        // Pattern didn't match
      }
    }
    
    return carousels;
  }
  
  /**
   * Find dropdown menus
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findDropdowns() {
    const dropdowns = [];
    
    for (const pattern of DROPDOWN_PATTERNS) {
      try {
        const triggers = await this.page.locator(pattern.trigger).all();
        
        for (const trigger of triggers) {
          const isVisible = await trigger.isVisible();
          if (!isVisible) continue;
          
          const text = await trigger.textContent();
          const position = await trigger.boundingBox();
          const selector = await this.generateSelector(trigger);
          
          dropdowns.push({
            type: 'dropdown',
            selector,
            text: text?.trim() || '',
            position: position || { x: 0, y: 0, width: 0, height: 0 },
            isVisible: true,
            demoScore: 75,
            category: 'navigation'
          });
        }
      } catch {
        // Pattern didn't match
      }
    }
    
    return dropdowns;
  }
  
  /**
   * Find tooltip triggers
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findTooltips() {
    const tooltips = [];
    
    for (const pattern of TOOLTIP_PATTERNS) {
      try {
        const elements = await this.page.locator(pattern).all();
        
        for (const element of elements.slice(0, 10)) { // Limit to avoid too many
          const isVisible = await element.isVisible();
          if (!isVisible) continue;
          
          const text = await element.textContent() || await element.getAttribute('title') || '';
          const position = await element.boundingBox();
          const selector = await this.generateSelector(element);
          
          tooltips.push({
            type: 'tooltip',
            selector,
            text: text.trim().slice(0, 50),
            position: position || { x: 0, y: 0, width: 0, height: 0 },
            isVisible: true,
            demoScore: 65,
            category: 'feedback'
          });
        }
      } catch {
        // Pattern didn't match
      }
    }
    
    return tooltips;
  }
  
  /**
   * Find primary buttons (CTAs)
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findButtons() {
    const buttons = [];
    
    const buttonSelectors = [
      'button[class*="primary"]',
      'button[class*="cta"]',
      'a[class*="button"][class*="primary"]',
      '[class*="btn-primary"]',
      'button:has-text("Get Started")',
      'button:has-text("Sign Up")',
      'button:has-text("Try")',
      'button:has-text("Start")',
      'a:has-text("Get Started")',
      'a:has-text("Sign Up")'
    ];
    
    for (const selector of buttonSelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        
        for (const element of elements.slice(0, 5)) {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;
          
          const text = await element.textContent();
          const position = await element.boundingBox();
          const uniqueSelector = await this.generateSelector(element);
          
          // Check if already added
          if (buttons.some(b => b.text === text?.trim())) continue;
          
          buttons.push({
            type: 'button',
            selector: uniqueSelector,
            text: text?.trim() || '',
            position: position || { x: 0, y: 0, width: 0, height: 0 },
            isVisible: true,
            demoScore: this.scoreButton(text || ''),
            category: 'action'
          });
        }
      } catch {
        // Selector didn't match
      }
    }
    
    return buttons;
  }
  
  /**
   * Find important links
   * @returns {Promise<DiscoveredElement[]>}
   */
  async findLinks() {
    const links = [];
    
    try {
      const navLinks = await this.page.locator('nav a, header a').all();
      
      for (const link of navLinks.slice(0, 10)) {
        const isVisible = await link.isVisible();
        if (!isVisible) continue;
        
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        const position = await link.boundingBox();
        
        if (!text?.trim() || href?.startsWith('#')) continue;
        
        links.push({
          type: 'link',
          selector: await this.generateSelector(link),
          text: text.trim(),
          position: position || { x: 0, y: 0, width: 0, height: 0 },
          isVisible: true,
          demoScore: this.scoreLink(text, href || ''),
          category: 'navigation'
        });
      }
    } catch {
      // Navigation not found
    }
    
    return links;
  }
  
  /**
   * Rank elements by demo value
   * @param {DiscoveredElement[]} [elements] - Elements to rank
   * @returns {Promise<DiscoveredElement[]>}
   */
  async rankByDemoValue(elements) {
    const toRank = elements || this.elements;
    return [...toRank].sort((a, b) => b.demoScore - a.demoScore);
  }
  
  /**
   * Generate a unique CSS selector for an element
   * @param {import('playwright').Locator} element
   * @returns {Promise<string>}
   * @private
   */
  async generateSelector(element) {
    try {
      return await element.evaluate((el) => {
        if (el.id) return `#${el.id}`;
        
        // Try data attributes
        for (const attr of ['data-testid', 'data-cy', 'data-qa']) {
          if (el.hasAttribute(attr)) {
            return `[${attr}="${el.getAttribute(attr)}"]`;
          }
        }
        
        // Try class combination
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes(':'));
          if (classes.length > 0) {
            return '.' + classes.slice(0, 2).join('.');
          }
        }
        
        // Fallback to tag + nth-child
        const tag = el.tagName.toLowerCase();
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
          if (siblings.length > 1) {
            return `${tag}:nth-of-type(${siblings.indexOf(el) + 1})`;
          }
        }
        return tag;
      });
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Get text content from a selector
   * @param {string} selector
   * @returns {Promise<string|null>}
   * @private
   */
  async getTextFromSelector(selector) {
    try {
      return await this.page.locator(selector).first().textContent();
    } catch {
      return null;
    }
  }
  
  /**
   * Extract class pattern from selector
   * @param {string} selector
   * @returns {string|null}
   * @private
   */
  extractClassPattern(selector) {
    const match = selector.match(/\.([a-zA-Z][\w-]*)/);
    return match ? match[1] : null;
  }
  
  /**
   * Find elements by text content
   * @param {string} text
   * @returns {Promise<DiscoveredElement[]>}
   * @private
   */
  async findByText(text) {
    const elements = [];
    try {
      const matches = await this.page.locator(`text="${text}"`).all();
      for (const match of matches.slice(0, 3)) {
        const position = await match.boundingBox();
        elements.push({
          type: 'button',
          selector: `text="${text}"`,
          text,
          position: position || { x: 0, y: 0, width: 0, height: 0 },
          isVisible: true,
          demoScore: 50,
          category: 'action'
        });
      }
    } catch {
      // No matches
    }
    return elements;
  }
  
  /**
   * Find elements by class pattern
   * @param {string} pattern
   * @returns {Promise<DiscoveredElement[]>}
   * @private
   */
  async findByClassPattern(pattern) {
    const elements = [];
    try {
      const matches = await this.page.locator(`[class*="${pattern}"]`).all();
      for (const match of matches.slice(0, 3)) {
        const isVisible = await match.isVisible();
        if (!isVisible) continue;
        
        const text = await match.textContent();
        const position = await match.boundingBox();
        
        elements.push({
          type: 'button',
          selector: `[class*="${pattern}"]`,
          text: text?.trim() || '',
          position: position || { x: 0, y: 0, width: 0, height: 0 },
          isVisible: true,
          demoScore: 50,
          category: 'action'
        });
      }
    } catch {
      // No matches
    }
    return elements;
  }
  
  /**
   * Score a button for demo value
   * @param {string} text
   * @returns {number}
   * @private
   */
  scoreButton(text) {
    const lower = text.toLowerCase();
    if (lower.includes('get started') || lower.includes('try free')) return 100;
    if (lower.includes('sign up') || lower.includes('start')) return 95;
    if (lower.includes('buy') || lower.includes('subscribe')) return 90;
    if (lower.includes('learn more') || lower.includes('explore')) return 75;
    if (lower.includes('submit') || lower.includes('send')) return 60;
    return 50;
  }
  
  /**
   * Score a link for demo value
   * @param {string} text
   * @param {string} href
   * @returns {number}
   * @private
   */
  scoreLink(text, href) {
    const lower = text.toLowerCase();
    if (lower.includes('pricing') || lower.includes('features')) return 85;
    if (lower.includes('demo') || lower.includes('product')) return 80;
    if (lower.includes('about') || lower.includes('contact')) return 60;
    if (href.includes('/docs') || href.includes('/api')) return 70;
    return 50;
  }
}

export default ElementDiscovery;
