/**
 * Visual Moments - Find and highlight impressive visual moments
 * 
 * Detects elements that create "wow" moments in demos:
 * - CSS animations and transitions
 * - Hover effects and micro-interactions
 * - Scroll-triggered animations
 * - Video and media elements
 * - Dynamic content loading
 * - Interactive charts and graphs
 * 
 * @module visual-moments
 */

import OpenAI from 'openai';
import sharp from 'sharp';

// ============================================================================
// Client Management
// ============================================================================

let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI();
  }
  return openai;
}

// ============================================================================
// Visual Moment Types
// ============================================================================

/**
 * @typedef {Object} VisualMoment
 * @property {string} id - Unique moment ID
 * @property {string} type - Moment type
 * @property {string} name - Human-readable name
 * @property {string} selector - CSS selector
 * @property {Object} position - Element position
 * @property {string} trigger - How to trigger (hover, click, scroll, auto)
 * @property {number} duration - Animation duration in ms
 * @property {number} demoScore - 0-100 how good for demos
 * @property {string} description - What happens
 * @property {Object} metadata - Additional info
 */

/**
 * Categories of visual moments
 */
export const MOMENT_TYPES = {
  ANIMATION: {
    name: 'Animation',
    triggers: ['auto', 'scroll'],
    demoValue: 80,
    patterns: [
      '[class*="animate"]',
      '[class*="fade"]',
      '[class*="slide"]',
      '[class*="zoom"]',
      '[class*="bounce"]',
      '[data-aos]',
      '.animate__animated',
      '.gsap'
    ]
  },
  HOVER_EFFECT: {
    name: 'Hover Effect',
    triggers: ['hover'],
    demoValue: 85,
    patterns: [
      '.card',
      '.btn',
      'button',
      '[class*="hover"]',
      '[class*="interactive"]'
    ]
  },
  TRANSITION: {
    name: 'Transition',
    triggers: ['click', 'hover'],
    demoValue: 75,
    patterns: [
      '[class*="transition"]',
      '[class*="transform"]',
      '.accordion',
      '.collapse',
      '.dropdown'
    ]
  },
  CAROUSEL: {
    name: 'Carousel/Slider',
    triggers: ['click', 'auto'],
    demoValue: 90,
    patterns: [
      '.carousel',
      '.slider',
      '.swiper',
      '.slick',
      '[class*="carousel"]',
      '[class*="slider"]'
    ]
  },
  VIDEO: {
    name: 'Video',
    triggers: ['click', 'auto'],
    demoValue: 95,
    patterns: [
      'video',
      '[class*="video"]',
      '.youtube',
      '.vimeo',
      'iframe[src*="youtube"]',
      'iframe[src*="vimeo"]'
    ]
  },
  CHART: {
    name: 'Chart/Graph',
    triggers: ['scroll', 'auto'],
    demoValue: 90,
    patterns: [
      'canvas',
      'svg',
      '[class*="chart"]',
      '[class*="graph"]',
      '.recharts',
      '.highcharts',
      '.chartjs'
    ]
  },
  PARALLAX: {
    name: 'Parallax Effect',
    triggers: ['scroll'],
    demoValue: 85,
    patterns: [
      '[class*="parallax"]',
      '[data-parallax]',
      '.rellax'
    ]
  },
  MODAL: {
    name: 'Modal/Dialog',
    triggers: ['click'],
    demoValue: 70,
    patterns: [
      '[data-modal]',
      '[data-toggle="modal"]',
      '[class*="modal-trigger"]'
    ]
  },
  TABS: {
    name: 'Tab Interface',
    triggers: ['click'],
    demoValue: 85,
    patterns: [
      '[role="tablist"]',
      '.tabs',
      '.nav-tabs',
      '[class*="tab-"]'
    ]
  },
  TOOLTIP: {
    name: 'Tooltip',
    triggers: ['hover'],
    demoValue: 60,
    patterns: [
      '[data-tooltip]',
      '[data-tippy]',
      '[title]',
      '[class*="tooltip"]'
    ]
  },
  LOADING: {
    name: 'Loading Animation',
    triggers: ['auto'],
    demoValue: 50,
    patterns: [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="skeleton"]',
      '.loader'
    ]
  },
  SCROLL_REVEAL: {
    name: 'Scroll Reveal',
    triggers: ['scroll'],
    demoValue: 85,
    patterns: [
      '[data-aos]',
      '[data-scroll]',
      '.reveal',
      '.scroll-reveal',
      '[class*="fade-up"]'
    ]
  },
  COUNTER: {
    name: 'Animated Counter',
    triggers: ['scroll', 'auto'],
    demoValue: 80,
    patterns: [
      '[class*="counter"]',
      '[class*="count"]',
      '[class*="number"]',
      '[data-count]'
    ]
  },
  STICKY: {
    name: 'Sticky Element',
    triggers: ['scroll'],
    demoValue: 65,
    patterns: [
      '.sticky',
      '[class*="sticky"]',
      'header.fixed',
      '.fixed-top'
    ]
  },
  MEGA_MENU: {
    name: 'Mega Menu',
    triggers: ['hover', 'click'],
    demoValue: 75,
    patterns: [
      '[class*="mega-menu"]',
      '.dropdown-mega',
      '[class*="megamenu"]'
    ]
  }
};

// ============================================================================
// Visual Moment Detector
// ============================================================================

/**
 * Detects visual moments on a page
 */
export class VisualMomentDetector {
  /**
   * @param {import('playwright').Page} page - Playwright page
   * @param {Object} options - Configuration
   */
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      minDemoScore: options.minDemoScore ?? 50,
      maxMoments: options.maxMoments ?? 20,
      testHoverEffects: options.testHoverEffects ?? true,
      detectScrollAnimations: options.detectScrollAnimations ?? true,
      ...options
    };
    
    /** @type {VisualMoment[]} */
    this.moments = [];
    
    /** @type {Object} */
    this.pageStyles = null;
  }
  
  /**
   * Detect all visual moments on the page
   * @returns {Promise<VisualMoment[]>}
   */
  async detectMoments() {
    this.moments = [];
    
    // Detect pattern-based moments
    const patternMoments = await this.detectByPatterns();
    this.moments.push(...patternMoments);
    
    // Detect CSS animation/transition moments
    const cssMoments = await this.detectCSSMoments();
    this.moments.push(...cssMoments);
    
    // Test hover effects
    if (this.options.testHoverEffects) {
      const hoverMoments = await this.detectHoverEffects();
      this.moments.push(...hoverMoments);
    }
    
    // Detect scroll-triggered animations
    if (this.options.detectScrollAnimations) {
      const scrollMoments = await this.detectScrollAnimations();
      this.moments.push(...scrollMoments);
    }
    
    // Deduplicate and rank
    this.moments = this.deduplicateMoments(this.moments);
    this.moments = this.rankMoments(this.moments);
    
    // Limit count
    return this.moments.slice(0, this.options.maxMoments);
  }
  
  /**
   * Detect moments by CSS selector patterns
   */
  async detectByPatterns() {
    const moments = [];
    
    for (const [typeKey, typeInfo] of Object.entries(MOMENT_TYPES)) {
      for (const pattern of typeInfo.patterns) {
        try {
          const elements = await this.page.locator(pattern).all();
          
          for (const el of elements.slice(0, 5)) { // Max 5 per pattern
            const isVisible = await el.isVisible().catch(() => false);
            if (!isVisible) continue;
            
            const box = await el.boundingBox().catch(() => null);
            if (!box || box.width < 50 || box.height < 30) continue;
            
            const text = await el.textContent().catch(() => '');
            const classes = await el.getAttribute('class').catch(() => '');
            
            moments.push({
              id: `${typeKey}_${moments.length}`,
              type: typeKey,
              name: typeInfo.name,
              selector: pattern,
              position: {
                x: Math.round(box.x + box.width / 2),
                y: Math.round(box.y + box.height / 2),
                width: Math.round(box.width),
                height: Math.round(box.height)
              },
              trigger: typeInfo.triggers[0],
              duration: this.estimateDuration(typeKey),
              demoScore: typeInfo.demoValue,
              description: `${typeInfo.name}: ${text?.slice(0, 50) || classes?.slice(0, 30) || pattern}`,
              metadata: {
                pattern,
                triggers: typeInfo.triggers,
                classes
              }
            });
          }
        } catch (e) {
          // Selector didn't match, continue
        }
      }
    }
    
    return moments;
  }
  
  /**
   * Detect elements with CSS animations or transitions
   */
  async detectCSSMoments() {
    const moments = await this.page.evaluate(() => {
      const results = [];
      const checked = new Set();
      
      // Get all elements
      const allElements = document.querySelectorAll('*');
      
      for (const el of allElements) {
        if (checked.has(el)) continue;
        
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Skip invisible or tiny elements
        if (rect.width < 30 || rect.height < 20) continue;
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        
        // Check for animations
        const hasAnimation = style.animationName && style.animationName !== 'none';
        const hasTransition = style.transitionProperty && style.transitionProperty !== 'none' && style.transitionProperty !== 'all 0s';
        
        if (hasAnimation) {
          results.push({
            type: 'css_animation',
            selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
            animation: style.animationName,
            duration: parseFloat(style.animationDuration) * 1000 || 1000,
            position: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            text: el.textContent?.trim()?.slice(0, 50) || ''
          });
        }
        
        if (hasTransition && style.transitionDuration !== '0s') {
          const duration = style.transitionDuration.split(',')[0];
          results.push({
            type: 'css_transition',
            selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
            property: style.transitionProperty,
            duration: parseFloat(duration) * 1000 || 300,
            position: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            text: el.textContent?.trim()?.slice(0, 50) || ''
          });
        }
        
        checked.add(el);
      }
      
      return results;
    });
    
    return moments.map((m, i) => ({
      id: `css_${m.type}_${i}`,
      type: m.type === 'css_animation' ? 'ANIMATION' : 'TRANSITION',
      name: m.type === 'css_animation' ? `Animation: ${m.animation}` : 'CSS Transition',
      selector: m.selector,
      position: {
        x: Math.round(m.position.x),
        y: Math.round(m.position.y),
        width: Math.round(m.position.width),
        height: Math.round(m.position.height)
      },
      trigger: m.type === 'css_animation' ? 'auto' : 'hover',
      duration: m.duration,
      demoScore: m.type === 'css_animation' ? 75 : 65,
      description: m.text || m.selector,
      metadata: {
        cssProperty: m.property || m.animation
      }
    }));
  }
  
  /**
   * Detect hover effects by testing elements
   */
  async detectHoverEffects() {
    const moments = [];
    
    // Get candidate elements
    const candidates = await this.page.evaluate(() => {
      const results = [];
      const selectors = ['button', 'a', '.card', '.btn', '[class*="hover"]', '[class*="interactive"]'];
      
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 50 || rect.height < 30) return;
          if (rect.y < 0 || rect.y > window.innerHeight * 2) return;
          
          results.push({
            selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : sel,
            position: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            text: el.textContent?.trim()?.slice(0, 50) || ''
          });
        });
      }
      
      return results.slice(0, 15); // Limit to avoid too many tests
    });
    
    // Test each candidate for hover effect
    for (const candidate of candidates) {
      try {
        // Get element before hover
        const beforeStyles = await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return {
            transform: style.transform,
            boxShadow: style.boxShadow,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            scale: style.scale,
            opacity: style.opacity
          };
        }, candidate.selector);
        
        if (!beforeStyles) continue;
        
        // Hover
        await this.page.hover(candidate.selector, { timeout: 1000 }).catch(() => {});
        await this.page.waitForTimeout(200);
        
        // Get element after hover
        const afterStyles = await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return {
            transform: style.transform,
            boxShadow: style.boxShadow,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            scale: style.scale,
            opacity: style.opacity
          };
        }, candidate.selector);
        
        if (!afterStyles) continue;
        
        // Check if styles changed
        const changed = Object.keys(beforeStyles).some(
          key => beforeStyles[key] !== afterStyles[key]
        );
        
        if (changed) {
          const changedProps = Object.keys(beforeStyles).filter(
            key => beforeStyles[key] !== afterStyles[key]
          );
          
          moments.push({
            id: `hover_${moments.length}`,
            type: 'HOVER_EFFECT',
            name: 'Hover Effect',
            selector: candidate.selector,
            position: {
              x: Math.round(candidate.position.x),
              y: Math.round(candidate.position.y),
              width: Math.round(candidate.position.width),
              height: Math.round(candidate.position.height)
            },
            trigger: 'hover',
            duration: 300,
            demoScore: 70 + changedProps.length * 5,
            description: `${candidate.text || candidate.selector} (${changedProps.join(', ')})`,
            metadata: {
              changedProperties: changedProps,
              before: beforeStyles,
              after: afterStyles
            }
          });
        }
        
        // Move away to reset
        await this.page.mouse.move(0, 0);
      } catch (e) {
        // Element not hoverable, skip
      }
    }
    
    return moments;
  }
  
  /**
   * Detect scroll-triggered animations
   */
  async detectScrollAnimations() {
    const moments = [];
    
    // Check for common scroll animation libraries
    const scrollElements = await this.page.evaluate(() => {
      const results = [];
      
      // AOS library
      document.querySelectorAll('[data-aos]').forEach(el => {
        const rect = el.getBoundingClientRect();
        results.push({
          type: 'aos',
          animation: el.getAttribute('data-aos'),
          delay: el.getAttribute('data-aos-delay') || 0,
          position: {
            x: rect.x + rect.width / 2,
            y: rect.y + window.scrollY + rect.height / 2,
            width: rect.width,
            height: rect.height
          },
          selector: el.id ? `#${el.id}` : '[data-aos]'
        });
      });
      
      // Scroll reveal classes
      const scrollSelectors = ['.reveal', '.scroll-reveal', '[data-scroll]', '.fade-up', '.slide-in'];
      for (const sel of scrollSelectors) {
        document.querySelectorAll(sel).forEach(el => {
          const rect = el.getBoundingClientRect();
          results.push({
            type: 'scroll-reveal',
            animation: sel,
            position: {
              x: rect.x + rect.width / 2,
              y: rect.y + window.scrollY + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            selector: sel
          });
        });
      }
      
      return results;
    });
    
    for (const el of scrollElements) {
      moments.push({
        id: `scroll_${moments.length}`,
        type: 'SCROLL_REVEAL',
        name: `Scroll Animation: ${el.animation || 'reveal'}`,
        selector: el.selector,
        position: {
          x: Math.round(el.position.x),
          y: Math.round(el.position.y),
          width: Math.round(el.position.width),
          height: Math.round(el.position.height)
        },
        trigger: 'scroll',
        duration: 600 + parseInt(el.delay || 0),
        demoScore: 85,
        description: `Reveals on scroll: ${el.animation || el.selector}`,
        metadata: {
          library: el.type,
          animationType: el.animation
        }
      });
    }
    
    return moments;
  }
  
  /**
   * Deduplicate moments by position
   */
  deduplicateMoments(moments) {
    const unique = [];
    const positions = new Set();
    
    for (const m of moments) {
      const posKey = `${Math.round(m.position.x / 50)}_${Math.round(m.position.y / 50)}`;
      if (!positions.has(posKey)) {
        positions.add(posKey);
        unique.push(m);
      }
    }
    
    return unique;
  }
  
  /**
   * Rank moments by demo value
   */
  rankMoments(moments) {
    return moments
      .filter(m => m.demoScore >= this.options.minDemoScore)
      .sort((a, b) => b.demoScore - a.demoScore);
  }
  
  /**
   * Estimate animation duration by type
   */
  estimateDuration(type) {
    const durations = {
      ANIMATION: 1000,
      HOVER_EFFECT: 300,
      TRANSITION: 300,
      CAROUSEL: 2000,
      VIDEO: 5000,
      CHART: 1500,
      PARALLAX: 500,
      MODAL: 300,
      TABS: 300,
      TOOLTIP: 200,
      LOADING: 1000,
      SCROLL_REVEAL: 600,
      COUNTER: 2000,
      STICKY: 0,
      MEGA_MENU: 300
    };
    return durations[type] || 500;
  }
  
  /**
   * Get top moments for demo
   * @param {number} count - Number of moments to return
   * @returns {VisualMoment[]}
   */
  getTopMoments(count = 5) {
    return this.moments.slice(0, count);
  }
  
  /**
   * Get moments by trigger type
   * @param {string} trigger - hover, click, scroll, auto
   * @returns {VisualMoment[]}
   */
  getMomentsByTrigger(trigger) {
    return this.moments.filter(m => 
      m.trigger === trigger || m.metadata?.triggers?.includes(trigger)
    );
  }
  
  /**
   * Generate demo actions from moments
   * @returns {Object[]}
   */
  generateDemoActions() {
    const actions = [];
    const topMoments = this.getTopMoments(5);
    let time = 0;
    
    for (const moment of topMoments) {
      // Move to element
      actions.push({
        time,
        action: 'moveTo',
        x: moment.position.x,
        y: moment.position.y,
        duration: 800,
        description: `Navigate to ${moment.name}`
      });
      time += 800;
      
      // Trigger the moment
      if (moment.trigger === 'hover') {
        actions.push({
          time,
          action: 'hover',
          selector: moment.selector,
          duration: moment.duration + 500,
          description: moment.description
        });
      } else if (moment.trigger === 'click') {
        actions.push({
          time,
          action: 'click',
          selector: moment.selector,
          duration: moment.duration + 500,
          description: moment.description
        });
      } else if (moment.trigger === 'scroll') {
        actions.push({
          time,
          action: 'scroll',
          y: moment.position.y,
          duration: 1000,
          description: moment.description
        });
      }
      
      time += moment.duration + 1000;
    }
    
    return actions;
  }
  
  /**
   * Get summary of detected moments
   * @returns {Object}
   */
  getSummary() {
    const byType = {};
    for (const m of this.moments) {
      if (!byType[m.type]) byType[m.type] = 0;
      byType[m.type]++;
    }
    
    const byTrigger = {};
    for (const m of this.moments) {
      if (!byTrigger[m.trigger]) byTrigger[m.trigger] = 0;
      byTrigger[m.trigger]++;
    }
    
    return {
      total: this.moments.length,
      avgScore: Math.round(this.moments.reduce((sum, m) => sum + m.demoScore, 0) / this.moments.length) || 0,
      byType,
      byTrigger,
      topMoments: this.getTopMoments(3).map(m => ({ name: m.name, score: m.demoScore, trigger: m.trigger }))
    };
  }
}

// ============================================================================
// AI-Enhanced Visual Analysis
// ============================================================================

/**
 * Use AI vision to find additional visual moments
 * @param {import('playwright').Page} page
 * @returns {Promise<VisualMoment[]>}
 */
export async function detectMomentsWithAI(page) {
  const client = getOpenAI();
  if (!client) return [];
  
  // Take screenshot
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  // Compress for vision API
  let imageData;
  try {
    const buffer = Buffer.from(screenshot, 'base64');
    const compressed = await sharp(buffer)
      .resize(1536, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    imageData = {
      base64: compressed.toString('base64'),
      mimeType: 'image/jpeg'
    };
  } catch {
    imageData = { base64: screenshot, mimeType: 'image/png' };
  }
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a UX expert identifying visually interesting moments for product demos.

Analyze the screenshot and identify elements that would create "wow" moments in a demo video.

Return JSON:
{
  "moments": [
    {
      "name": "Human readable name",
      "type": "animation|hover|interaction|visual",
      "x": 0-100 (% from left),
      "y": 0-100 (% from top),
      "trigger": "hover|click|scroll|auto",
      "demoScore": 0-100,
      "description": "What makes this visually interesting",
      "suggestedAction": "What to do in the demo"
    }
  ]
}

Look for:
- Hero sections with striking visuals
- Interactive elements with likely hover effects
- Cards that probably have animations
- Buttons that stand out
- Charts or data visualizations
- Videos or media elements
- Carousels or sliders
- Anything that looks interactive or animated`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify visual moments in this webpage that would make a great demo:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageData.mimeType};base64,${imageData.base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.5
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    
    // Get viewport dimensions
    const viewport = await page.viewportSize();
    
    return (result.moments || []).map((m, i) => ({
      id: `ai_moment_${i}`,
      type: m.type?.toUpperCase() || 'VISUAL',
      name: m.name,
      selector: null, // AI can't provide selectors
      position: {
        x: Math.round((m.x / 100) * (viewport?.width || 1920)),
        y: Math.round((m.y / 100) * (viewport?.height || 1080)),
        width: 100,
        height: 100
      },
      trigger: m.trigger,
      duration: 500,
      demoScore: m.demoScore,
      description: m.description,
      metadata: {
        source: 'ai',
        suggestedAction: m.suggestedAction
      }
    }));
  } catch (e) {
    console.warn('AI visual moment detection failed:', e.message);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick visual moment detection
 * @param {import('playwright').Page} page
 * @returns {Promise<VisualMoment[]>}
 */
export async function detectVisualMoments(page, options = {}) {
  const detector = new VisualMomentDetector(page, options);
  return detector.detectMoments();
}

/**
 * Get best moments for demo
 * @param {import('playwright').Page} page
 * @param {number} count
 * @returns {Promise<VisualMoment[]>}
 */
export async function getBestVisualMoments(page, count = 5, options = {}) {
  const detector = new VisualMomentDetector(page, options);
  await detector.detectMoments();
  return detector.getTopMoments(count);
}

export default VisualMomentDetector;
