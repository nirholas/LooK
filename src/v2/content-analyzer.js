/**
 * Content Analyzer - Semantic content analysis for demo video generation
 * 
 * Uses AI vision to understand page content, identify product story,
 * detect unique selling points, and find demo-worthy visual moments.
 */

import { deepAnalyzeContent } from './ai.js';

/**
 * @typedef {Object} Bounds
 * @property {number} x - X position as percentage (0-100)
 * @property {number} y - Y position as percentage (0-100)
 * @property {number} width - Width as percentage (0-100)
 * @property {number} height - Height as percentage (0-100)
 */

/**
 * @typedef {'hero'|'features'|'pricing'|'testimonials'|'cta'|'footer'|'content'|'header'|'nav'} SectionType
 */

/**
 * @typedef {'critical'|'high'|'medium'|'low'|'skip'} Importance
 */

/**
 * @typedef {Object} ContentSectionData
 * @property {string} id - Unique section ID
 * @property {SectionType} type - Section type
 * @property {Bounds} bounds - Section bounds as percentages
 * @property {string} headline - Main headline text
 * @property {string} [subheadline] - Supporting text
 * @property {string[]} visualElements - Images, icons, animations
 * @property {string[]} interactives - Interactive elements
 * @property {number} demoScore - 0-100 score
 * @property {Importance} importance - Importance level
 * @property {string|null} skipReason - Why to skip (null if don't skip)
 * @property {number} suggestedDuration - Suggested time in seconds
 */

/**
 * @typedef {Object} ProductStoryData
 * @property {string} problem - What problem does this solve
 * @property {string} solution - How it solves it
 * @property {string[]} features - Key features
 * @property {string[]} proof - Testimonials, stats, social proof
 * @property {string} cta - Call to action
 * @property {string} keyBenefit - Main value proposition
 */

/**
 * @typedef {Object} DemoMomentData
 * @property {'animation'|'interaction'|'visual'} type - Moment type
 * @property {{x: number, y: number}} location - Position as percentages
 * @property {string} description - What to show
 * @property {string} trigger - How to trigger it
 */

/**
 * @typedef {Object} SkipRegionData
 * @property {string} reason - Why to skip
 * @property {Bounds} bounds - Region bounds
 */

/**
 * Represents a content section on the page
 */
export class ContentSection {
  /**
   * @param {ContentSectionData} data - Section data
   */
  constructor(data) {
    this.id = data.id || `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.type = data.type || 'content';
    this.bounds = data.bounds || { x: 0, y: 0, width: 100, height: 20 };
    this.headline = data.headline || '';
    this.subheadline = data.subheadline || '';
    this.visualElements = data.visualElements || [];
    this.interactives = data.interactives || [];
    this.demoScore = data.demoScore ?? 50;
    this.importance = data.importance || 'medium';
    this.skipReason = data.skipReason || null;
    this.suggestedDuration = data.suggestedDuration || 3;
  }

  /**
   * Check if this section should be included in demo
   * @returns {boolean}
   */
  shouldInclude() {
    return this.skipReason === null && this.demoScore >= 30;
  }

  /**
   * Get absolute pixel bounds from viewport dimensions
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getPixelBounds(viewportWidth, viewportHeight) {
    return {
      x: (this.bounds.x / 100) * viewportWidth,
      y: (this.bounds.y / 100) * viewportHeight,
      width: (this.bounds.width / 100) * viewportWidth,
      height: (this.bounds.height / 100) * viewportHeight
    };
  }

  /**
   * Get the center point of this section
   * @param {number} viewportWidth
   * @param {number} viewportHeight
   * @returns {{x: number, y: number}}
   */
  getCenter(viewportWidth, viewportHeight) {
    const bounds = this.getPixelBounds(viewportWidth, viewportHeight);
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }
}

/**
 * Represents the product story extracted from page content
 */
export class ProductStory {
  /**
   * @param {ProductStoryData} [data] - Story data
   */
  constructor(data = {}) {
    this.problem = data.problem || '';
    this.solution = data.solution || '';
    this.features = data.features || [];
    this.proof = data.proof || [];
    this.cta = data.cta || '';
    this.keyBenefit = data.keyBenefit || '';
  }

  /**
   * Check if the story is complete enough for narration
   * @returns {boolean}
   */
  isComplete() {
    return !!(this.problem && this.solution && this.features.length > 0);
  }

  /**
   * Generate a brief narrative from the story
   * @returns {string}
   */
  toNarrative() {
    const parts = [];
    
    if (this.problem) {
      parts.push(this.problem);
    }
    if (this.solution) {
      parts.push(this.solution);
    }
    if (this.keyBenefit) {
      parts.push(this.keyBenefit);
    }
    if (this.cta) {
      parts.push(this.cta);
    }
    
    return parts.join(' ');
  }
}

/**
 * Represents analyzed page content
 */
export class PageContent {
  constructor() {
    /** @type {ContentSection[]} */
    this.sections = [];
    
    /** @type {ProductStory} */
    this.productStory = new ProductStory();
    
    /** @type {string[]} */
    this.usps = [];
    
    /** @type {DemoMomentData[]} */
    this.demoMoments = [];
    
    /** @type {SkipRegionData[]} */
    this.skipRegions = [];
    
    /** @type {string[]} */
    this.narrativeFlow = [];
    
    /** @type {string} */
    this.suggestedNarrative = '';
    
    /** @type {string|null} */
    this.transitionHint = null;
    
    /** @type {number} */
    this.timestamp = Date.now();
  }

  /**
   * Get sections sorted by demo score (highest first)
   * @returns {ContentSection[]}
   */
  getRankedSections() {
    return [...this.sections]
      .filter(s => s.shouldInclude())
      .sort((a, b) => b.demoScore - a.demoScore);
  }

  /**
   * Get sections of a specific type
   * @param {SectionType} type
   * @returns {ContentSection[]}
   */
  getSectionsByType(type) {
    return this.sections.filter(s => s.type === type);
  }

  /**
   * Get the hero section if present
   * @returns {ContentSection|null}
   */
  getHeroSection() {
    return this.sections.find(s => s.type === 'hero') || null;
  }

  /**
   * Get total suggested duration for all includable sections
   * @returns {number} Duration in seconds
   */
  getTotalSuggestedDuration() {
    return this.getRankedSections()
      .reduce((sum, s) => sum + s.suggestedDuration, 0);
  }

  /**
   * Convert to JSON for caching/serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      sections: this.sections.map(s => ({ ...s })),
      productStory: { ...this.productStory },
      usps: this.usps,
      demoMoments: this.demoMoments,
      skipRegions: this.skipRegions,
      narrativeFlow: this.narrativeFlow,
      suggestedNarrative: this.suggestedNarrative,
      transitionHint: this.transitionHint,
      timestamp: this.timestamp
    };
  }

  /**
   * Create PageContent from cached JSON
   * @param {Object} json
   * @returns {PageContent}
   */
  static fromJSON(json) {
    const content = new PageContent();
    content.sections = (json.sections || []).map(s => new ContentSection(s));
    content.productStory = new ProductStory(json.productStory);
    content.usps = json.usps || [];
    content.demoMoments = json.demoMoments || [];
    content.skipRegions = json.skipRegions || [];
    content.narrativeFlow = json.narrativeFlow || [];
    content.suggestedNarrative = json.suggestedNarrative || '';
    content.transitionHint = json.transitionHint || null;
    content.timestamp = json.timestamp || Date.now();
    return content;
  }
}

/**
 * Content deduplication - detects repetitive content across pages
 */
export class ContentDeduplicator {
  constructor() {
    /** @type {Map<string, {count: number, firstSeen: string, metadata: Object}>} */
    this.seenContent = new Map();
  }

  /**
   * Create a fingerprint for a section of the page
   * @param {import('playwright').Page} page - Playwright page
   * @param {Bounds} bounds - Section bounds as percentages
   * @returns {Promise<string>} Fingerprint hash
   */
  async fingerprintSection(page, bounds) {
    const viewport = page.viewportSize();
    const pixelBounds = {
      x: (bounds.x / 100) * viewport.width,
      y: (bounds.y / 100) * viewport.height,
      width: (bounds.width / 100) * viewport.width,
      height: (bounds.height / 100) * viewport.height
    };

    const fingerprint = await page.evaluate((b) => {
      // Get elements in the center of the bounds
      const centerX = b.x + b.width / 2;
      const centerY = b.y + b.height / 2;
      const elements = document.elementsFromPoint(centerX, centerY);
      
      // Create fingerprint from structure and text
      const fp = {
        structure: elements.slice(0, 5).map(e => e.tagName).join('>'),
        textSample: elements.slice(0, 3).map(e => (e.textContent || '').slice(0, 30).trim()).filter(Boolean).join('|'),
        linkCount: elements.filter(e => e.tagName === 'A').length,
        hasLogo: elements.some(e => e.matches('img[alt*="logo" i], [class*="logo" i], svg[class*="logo" i]')),
        hasNav: elements.some(e => e.matches('nav, [role="navigation"], header nav')),
        hasFooter: elements.some(e => e.matches('footer, [role="contentinfo"]')),
        hasSocial: elements.some(e => e.matches('[class*="social"], [href*="twitter"], [href*="facebook"], [href*="linkedin"]'))
      };
      
      return JSON.stringify(fp);
    }, pixelBounds);

    return fingerprint;
  }

  /**
   * Compare two fingerprints for similarity
   * @param {string} fp1 - First fingerprint
   * @param {string} fp2 - Second fingerprint
   * @returns {number} Similarity score 0-1
   */
  compareFingerprints(fp1, fp2) {
    try {
      const a = JSON.parse(fp1);
      const b = JSON.parse(fp2);
      
      let matches = 0;
      let total = 0;
      
      // Compare structure
      if (a.structure === b.structure) matches += 2;
      total += 2;
      
      // Compare boolean flags
      const flags = ['hasLogo', 'hasNav', 'hasFooter', 'hasSocial'];
      for (const flag of flags) {
        if (a[flag] === b[flag]) matches++;
        total++;
      }
      
      // Compare link counts (within threshold)
      if (Math.abs(a.linkCount - b.linkCount) <= 2) matches++;
      total++;
      
      // Text sample similarity (simple check)
      if (a.textSample && b.textSample) {
        const aWords = a.textSample.toLowerCase().split(/\W+/).filter(Boolean);
        const bWords = new Set(b.textSample.toLowerCase().split(/\W+/).filter(Boolean));
        const overlap = aWords.filter(w => bWords.has(w)).length;
        if (overlap >= Math.min(aWords.length, bWords.size) * 0.5) matches++;
        total++;
      }
      
      return matches / total;
    } catch {
      return 0;
    }
  }

  /**
   * Mark a fingerprint as seen
   * @param {string} fingerprint
   * @param {Object} metadata - Additional info about where it was seen
   */
  markAsSeen(fingerprint, metadata = {}) {
    const existing = this.seenContent.get(fingerprint);
    if (existing) {
      existing.count++;
    } else {
      this.seenContent.set(fingerprint, {
        count: 1,
        firstSeen: metadata.url || 'unknown',
        metadata
      });
    }
  }

  /**
   * Check if a fingerprint represents repetitive content
   * @param {string} fingerprint
   * @returns {boolean}
   */
  isRepetitive(fingerprint) {
    // Check for exact match
    const existing = this.seenContent.get(fingerprint);
    if (existing && existing.count > 1) return true;
    
    // Check for similar content
    for (const [seenFp] of this.seenContent) {
      if (this.compareFingerprints(fingerprint, seenFp) > 0.8) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Filter sections to only unique content
   * @param {ContentSection[]} sections
   * @param {import('playwright').Page} page
   * @returns {Promise<ContentSection[]>}
   */
  async getUniqueContent(sections, page) {
    const uniqueSections = [];
    
    for (const section of sections) {
      const fingerprint = await this.fingerprintSection(page, section.bounds);
      
      if (!this.isRepetitive(fingerprint)) {
        uniqueSections.push(section);
      }
      
      this.markAsSeen(fingerprint, { type: section.type });
    }
    
    return uniqueSections;
  }

  /**
   * Check if a section is likely a header
   * @param {ContentSection} section
   * @returns {boolean}
   */
  isLikelyHeader(section) {
    return (
      section.type === 'header' ||
      section.type === 'nav' ||
      (section.bounds.y < 10 && section.bounds.height < 15)
    );
  }

  /**
   * Check if a section is likely a footer
   * @param {ContentSection} section
   * @returns {boolean}
   */
  isLikelyFooter(section) {
    return (
      section.type === 'footer' ||
      (section.bounds.y > 80 && section.headline.toLowerCase().includes('©'))
    );
  }

  /**
   * Clear seen content cache
   */
  reset() {
    this.seenContent.clear();
  }
}

/**
 * Content Analyzer - Main class for semantic page analysis
 */
export class ContentAnalyzer {
  /**
   * @param {import('playwright').Page} page - Playwright page instance
   * @param {Object} [options]
   * @param {number} [options.cacheTtl=300000] - Cache TTL in ms (5 min default)
   */
  constructor(page, options = {}) {
    this.page = page;
    this.cacheTtl = options.cacheTtl ?? 300000;
    
    /** @type {Map<string, {content: PageContent, timestamp: number}>} */
    this.cache = new Map();
    
    /** @type {ContentDeduplicator} */
    this.deduplicator = new ContentDeduplicator();
  }

  /**
   * Get cached analysis if still valid
   * @param {string} url
   * @returns {PageContent|null}
   */
  getCached(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.content;
    }
    return null;
  }

  /**
   * Cache analysis result
   * @param {string} url
   * @param {PageContent} content
   */
  setCache(url, content) {
    this.cache.set(url, { content, timestamp: Date.now() });
  }

  /**
   * Analyze page structure and content
   * @param {Object} [options]
   * @param {number} [options.duration=30] - Target demo duration
   * @param {string} [options.focus='features'] - Analysis focus
   * @param {boolean} [options.useCache=true] - Use cached results
   * @returns {Promise<PageContent>}
   */
  async analyzeStructure(options = {}) {
    const { duration = 30, focus = 'features', useCache = true } = options;
    const url = this.page.url();
    
    // Check cache
    if (useCache) {
      const cached = this.getCached(url);
      if (cached) return cached;
    }

    try {
      // Take screenshot for AI analysis
      const screenshot = await this.page.screenshot({ 
        encoding: 'base64',
        fullPage: false // Just viewport for efficiency
      });

      // Get deep content analysis from AI
      const analysis = await deepAnalyzeContent(screenshot, { duration, focus });
      
      // Build PageContent from analysis
      const content = this.buildPageContent(analysis);
      
      // Cache result
      this.setCache(url, content);
      
      return content;
    } catch (error) {
      console.warn('Content analysis failed, using fallback:', error.message);
      return this.fallbackAnalysis();
    }
  }

  /**
   * Build PageContent from AI analysis response
   * @param {Object} analysis - Raw AI analysis
   * @returns {PageContent}
   * @private
   */
  buildPageContent(analysis) {
    const content = new PageContent();
    
    // Process sections
    if (analysis.sections && Array.isArray(analysis.sections)) {
      content.sections = analysis.sections.map((s, i) => new ContentSection({
        id: `section-${i}`,
        type: s.type || 'content',
        bounds: s.bounds || { x: 0, y: i * 20, width: 100, height: 20 },
        headline: s.headline || '',
        importance: s.importance || 'medium',
        demoScore: s.demoValue ?? 50,
        suggestedDuration: s.suggestedDuration ?? 3,
        visualElements: s.visualInterest ? [s.visualInterest] : []
      }));
    }
    
    // Process product story
    if (analysis.productStory) {
      content.productStory = new ProductStory({
        problem: analysis.productStory.problem || '',
        solution: analysis.productStory.solution || '',
        keyBenefit: analysis.productStory.keyBenefit || '',
        proof: analysis.productStory.proofPoints || [],
        features: [],
        cta: ''
      });
    }
    
    // Process demo moments
    if (analysis.demoMoments && Array.isArray(analysis.demoMoments)) {
      content.demoMoments = analysis.demoMoments;
    }
    
    // Process skip regions
    if (analysis.skipRegions && Array.isArray(analysis.skipRegions)) {
      content.skipRegions = analysis.skipRegions;
    }
    
    // Set narrative
    content.suggestedNarrative = analysis.suggestedNarrative || '';
    content.transitionHint = analysis.transitionHint || null;
    
    // Build narrative flow from sections
    content.narrativeFlow = content.getRankedSections()
      .slice(0, 5)
      .map(s => s.headline)
      .filter(Boolean);
    
    return content;
  }

  /**
   * Fallback analysis using DOM inspection (no AI)
   * @returns {Promise<PageContent>}
   * @private
   */
  async fallbackAnalysis() {
    const content = new PageContent();
    
    // Extract basic structure from DOM
    const domAnalysis = await this.page.evaluate(() => {
      const sections = [];
      const vh = window.innerHeight;
      
      // Find major sections
      const sectionEls = document.querySelectorAll('section, [class*="section"], main > div, article');
      
      for (const el of sectionEls) {
        const rect = el.getBoundingClientRect();
        if (rect.height < 50) continue;
        
        const h = el.querySelector('h1, h2, h3');
        const className = el.className.toLowerCase();
        
        let type = 'content';
        if (className.includes('hero') || rect.top < vh * 0.3) type = 'hero';
        else if (className.includes('feature')) type = 'features';
        else if (className.includes('pricing')) type = 'pricing';
        else if (className.includes('testimonial')) type = 'testimonials';
        else if (className.includes('footer') || el.tagName === 'FOOTER') type = 'footer';
        else if (className.includes('cta')) type = 'cta';
        
        sections.push({
          type,
          bounds: {
            x: (rect.left / window.innerWidth) * 100,
            y: ((rect.top + window.scrollY) / document.body.scrollHeight) * 100,
            width: (rect.width / window.innerWidth) * 100,
            height: (rect.height / document.body.scrollHeight) * 100
          },
          headline: h?.textContent?.trim().slice(0, 100) || '',
          demoScore: type === 'hero' ? 90 : type === 'features' ? 80 : 50
        });
      }
      
      return { sections: sections.slice(0, 10) };
    });
    
    content.sections = (domAnalysis.sections || []).map((s, i) => new ContentSection({
      id: `fallback-${i}`,
      ...s
    }));
    
    return content;
  }

  /**
   * Identify page sections by type
   * @returns {Promise<ContentSection[]>}
   */
  async identifySections() {
    const content = await this.analyzeStructure();
    return content.sections;
  }

  /**
   * Find the content flow (reading order)
   * @returns {Promise<ContentSection[]>}
   */
  async findContentFlow() {
    const content = await this.analyzeStructure();
    return [...content.sections].sort((a, b) => a.bounds.y - b.bounds.y);
  }

  /**
   * Extract the product story
   * @returns {Promise<ProductStory>}
   */
  async extractProductStory() {
    const content = await this.analyzeStructure();
    return content.productStory;
  }

  /**
   * Identify unique selling points
   * @returns {Promise<string[]>}
   */
  async identifyUSPs() {
    const content = await this.analyzeStructure();
    
    // Build USPs from story and features sections
    const usps = [];
    
    if (content.productStory.keyBenefit) {
      usps.push(content.productStory.keyBenefit);
    }
    
    const featureSections = content.getSectionsByType('features');
    for (const section of featureSections) {
      if (section.headline) usps.push(section.headline);
    }
    
    return usps.slice(0, 5);
  }

  /**
   * Find key messages (headlines)
   * @returns {Promise<string[]>}
   */
  async findKeyMessages() {
    const content = await this.analyzeStructure();
    return content.sections
      .filter(s => s.headline && s.demoScore >= 50)
      .map(s => s.headline);
  }

  /**
   * Find demo-worthy moments (animations, interactions)
   * @returns {Promise<DemoMomentData[]>}
   */
  async findDemoMoments() {
    const content = await this.analyzeStructure();
    return content.demoMoments;
  }

  /**
   * Identify visual highlights
   * @returns {Promise<ContentSection[]>}
   */
  async identifyVisualHighlights() {
    const content = await this.analyzeStructure();
    return content.sections.filter(s => 
      s.visualElements.length > 0 && s.demoScore >= 60
    );
  }

  /**
   * Score and rank content sections by demo value
   * @param {ContentSection[]} [sections] - Sections to score (uses analyzed if not provided)
   * @returns {Promise<ContentSection[]>}
   */
  async scoreContentSections(sections) {
    if (!sections) {
      const content = await this.analyzeStructure();
      sections = content.sections;
    }
    return [...sections].sort((a, b) => b.demoScore - a.demoScore);
  }

  /**
   * Detect repetitive content (headers, footers, nav)
   * @returns {Promise<ContentSection[]>}
   */
  async detectRepetitiveContent() {
    const content = await this.analyzeStructure();
    return content.sections.filter(s => 
      this.deduplicator.isLikelyHeader(s) || 
      this.deduplicator.isLikelyFooter(s)
    );
  }

  /**
   * Find skippable content (legal, social links, etc)
   * @returns {Promise<SkipRegionData[]>}
   */
  async findSkippableContent() {
    const content = await this.analyzeStructure();
    return content.skipRegions;
  }

  /**
   * Compare to previous analysis for new content
   * @param {PageContent} previousAnalysis
   * @returns {Promise<ContentSection[]>}
   */
  async compareToExisting(previousAnalysis) {
    const currentContent = await this.analyzeStructure({ useCache: false });
    
    const previousHeadlines = new Set(
      previousAnalysis.sections.map(s => s.headline.toLowerCase())
    );
    
    return currentContent.sections.filter(s => 
      !previousHeadlines.has(s.headline.toLowerCase())
    );
  }

  /**
   * Clear the analysis cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reset the deduplicator
   */
  resetDeduplicator() {
    this.deduplicator.reset();
  }
}

/**
 * Generate a narrative for the demo based on content analysis
 * 
 * @param {PageContent[]} pageAnalyses - Array of page analyses
 * @param {Object} [options]
 * @param {number} [options.totalDuration=60] - Total duration in seconds
 * @param {'professional'|'casual'|'energetic'|'minimal'} [options.style='professional']
 * @param {'features'|'pricing'|'overview'|'technical'} [options.focus='features']
 * @returns {Promise<{narrative: string, storyArc: Object}>}
 */
export async function generateDemoNarrative(pageAnalyses, options = {}) {
  const {
    totalDuration = 60,
    style = 'professional',
    focus = 'features'
  } = options;

  // Build story arc from all pages
  const storyElements = {
    hook: null,
    problem: null,
    solution: null,
    features: [],
    proof: [],
    cta: null
  };

  for (const analysis of pageAnalyses) {
    if (analysis.productStory) {
      storyElements.problem = storyElements.problem || analysis.productStory.problem;
      storyElements.solution = storyElements.solution || analysis.productStory.solution;
      storyElements.cta = storyElements.cta || analysis.productStory.cta;
      
      if (analysis.productStory.proof) {
        storyElements.proof.push(...analysis.productStory.proof);
      }
      if (analysis.productStory.features) {
        storyElements.features.push(...analysis.productStory.features);
      }
    }

    // Collect features from high-value sections
    const featureSections = analysis.sections.filter(s =>
      s.type === 'features' && s.demoScore > 60
    );
    
    for (const section of featureSections) {
      if (section.headline && !storyElements.features.includes(section.headline)) {
        storyElements.features.push(section.headline);
      }
    }

    // Use suggested narratives
    if (analysis.suggestedNarrative && !storyElements.hook) {
      storyElements.hook = analysis.suggestedNarrative;
    }
  }

  // Build narrative
  const parts = [];
  const wordsPerSecond = 2.5;
  const targetWords = Math.floor(totalDuration * wordsPerSecond);

  if (storyElements.hook) {
    parts.push(storyElements.hook);
  }
  
  if (storyElements.problem) {
    parts.push(storyElements.problem);
  }
  
  if (storyElements.solution) {
    parts.push(storyElements.solution);
  }
  
  if (storyElements.features.length > 0 && focus === 'features') {
    const topFeatures = storyElements.features.slice(0, 3);
    parts.push(`Key features include: ${topFeatures.join(', ')}.`);
  }
  
  if (storyElements.proof.length > 0) {
    parts.push(storyElements.proof[0]);
  }
  
  if (storyElements.cta) {
    parts.push(storyElements.cta);
  }

  const narrative = parts.join(' ').slice(0, targetWords * 6); // Rough char estimate

  return {
    narrative,
    storyArc: storyElements
  };
}

export default ContentAnalyzer;
