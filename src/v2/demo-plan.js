/**
 * DemoPlan - Intelligent demo planning system
 * 
 * Creates optimized demo plans from exploration results, including
 * page ordering, timeline creation, and narrative generation.
 * 
 * @module demo-plan
 */

/**
 * @typedef {Object} PageEntry
 * @property {string} id - Page identifier
 * @property {string} url - Page URL
 * @property {string} title - Page title
 * @property {number} duration - Allocated time in ms
 * @property {number} priority - Page priority (higher = more important)
 * @property {TransitionMethod} transitionMethod - How to navigate here
 * @property {TimelineEntry[]} timeline - Actions for this page
 * @property {Object} [analysis] - Content analysis for this page
 */

/**
 * @typedef {'navigate' | 'scroll' | 'scroll-to' | 'click' | 'hover' | 'wait' | 'transition' | 'pan' | 'type'} ActionType
 */

/**
 * @typedef {Object} TimelineEntry
 * @property {number} startTime - When to start (ms from page entry)
 * @property {number} duration - How long (ms)
 * @property {ActionType} type - Action type
 * @property {string} [target] - What to interact with
 * @property {number} [x] - X coordinate
 * @property {number} [y] - Y coordinate
 * @property {Object} [params] - Additional parameters
 * @property {string} [narrative] - What to say during this action
 * @property {Object} [fallback] - What to do if this fails
 * @property {number} [priority] - Action priority (0-100)
 * @property {boolean} [skippable] - Whether action can be skipped
 */

/**
 * Creates an optimized demo plan from exploration results
 */
export class DemoPlan {
  /**
   * Create a DemoPlan
   * @param {Object} graph - Navigation graph
   * @param {Map<string, Object>} contentAnalyses - Content analyses by page ID
   * @param {Object} [options={}] - Planning options
   */
  constructor(graph, contentAnalyses, options = {}) {
    /** @type {Object} */
    this.graph = graph;
    
    /** @type {Map<string, Object>} */
    this.contentAnalyses = contentAnalyses || new Map();
    
    /** @type {Object} */
    this.options = {
      duration: options.duration || 60, // seconds
      maxPages: options.maxPages || 5,
      style: options.style || 'professional',
      focus: options.focus || 'features',
      includeNarrative: options.includeNarrative !== false,
      minPageDuration: options.minPageDuration || 8000, // ms
      maxPageDuration: options.maxPageDuration || 20000, // ms
      transitionTime: options.transitionTime || 1500, // ms between pages
      ...options
    };
    
    /** @type {PageEntry[]} */
    this.pages = [];
    
    /** @type {string} */
    this.narrative = '';
    
    /** @type {number} */
    this.totalDuration = this.options.duration * 1000;
    
    /** @type {number} */
    this.currentTimeOffset = 0;
  }
  
  /**
   * Factory method to create a complete plan
   * @param {Object} graph - Navigation graph
   * @param {Map<string, Object>} analyses - Content analyses
   * @param {Object} [options={}] - Options
   * @returns {Promise<DemoPlan>} Complete plan
   */
  static async create(graph, analyses, options = {}) {
    const plan = new DemoPlan(graph, analyses, options);
    
    await plan.selectPages();
    plan.optimizeOrder();
    plan.allocateTime();
    plan.planTransitions();
    plan.createTimelines();
    
    if (plan.options.includeNarrative) {
      plan.generateNarrative();
    }
    
    return plan;
  }
  
  /**
   * Select which pages to include in the demo
   * @private
   */
  async selectPages() {
    // Get all visited nodes from graph
    let nodes = [];
    
    if (this.graph?.getVisitedNodes) {
      nodes = this.graph.getVisitedNodes();
    } else if (this.graph?.nodes) {
      nodes = Array.from(this.graph.nodes.values());
    } else if (Array.isArray(this.graph)) {
      nodes = this.graph;
    }
    
    if (nodes.length === 0) {
      // Create a minimal default page entry
      this.pages = [{
        id: 'home',
        url: '/',
        title: 'Home',
        duration: this.totalDuration,
        priority: 100,
        transitionMethod: 'navigate',
        timeline: [],
        analysis: null
      }];
      return;
    }
    
    // Score each page for demo suitability
    const scoredPages = nodes.map(node => {
      const analysis = this.contentAnalyses.get(node.id);
      const score = this.calculatePageScore(node, analysis);
      
      return {
        node,
        analysis,
        score,
        id: node.id,
        url: node.url,
        title: node.title || analysis?.title || 'Page'
      };
    });
    
    // Sort by score
    scoredPages.sort((a, b) => b.score - a.score);
    
    // Take top pages up to maxPages
    const selected = scoredPages.slice(0, this.options.maxPages);
    
    // Ensure home page is first if it exists
    const homeIndex = selected.findIndex(p => 
      p.url === '/' || 
      p.url.endsWith('/') || 
      p.id === 'home' ||
      p.title?.toLowerCase().includes('home')
    );
    
    if (homeIndex > 0) {
      const home = selected.splice(homeIndex, 1)[0];
      selected.unshift(home);
    }
    
    // Convert to PageEntry format
    this.pages = selected.map((p, index) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      duration: 0, // Will be allocated
      priority: p.score,
      transitionMethod: index === 0 ? 'navigate' : 'click',
      timeline: [],
      analysis: p.analysis,
      node: p.node
    }));
  }
  
  /**
   * Calculate how suitable a page is for the demo
   * @param {Object} node - Graph node
   * @param {Object} [analysis] - Content analysis
   * @returns {number} Score 0-100
   * @private
   */
  calculatePageScore(node, analysis) {
    let score = 50; // Base score
    
    // Boost for home/landing page
    if (node.url === '/' || node.isHome) {
      score += 20;
    }
    
    // Boost for important pages based on title
    const title = (node.title || '').toLowerCase();
    const importantKeywords = ['feature', 'pricing', 'product', 'service', 'solution', 'demo', 'about'];
    for (const keyword of importantKeywords) {
      if (title.includes(keyword)) {
        score += 10;
        break;
      }
    }
    
    // Boost based on content analysis
    if (analysis) {
      // More sections = more content to show
      const sectionCount = analysis.sections?.length || 0;
      score += Math.min(15, sectionCount * 3);
      
      // High demo scores from content analyzer
      const avgDemoScore = analysis.sections?.reduce((sum, s) => sum + (s.demoScore || 0), 0) / (sectionCount || 1);
      score += avgDemoScore * 0.2;
      
      // Has interactive elements
      const interactiveCount = analysis.interactiveElements?.length || 0;
      score += Math.min(10, interactiveCount);
    }
    
    // Boost for pages reachable from home
    if (node.depth === 1) {
      score += 5;
    }
    
    // Penalize deep pages
    if (node.depth > 2) {
      score -= (node.depth - 2) * 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Optimize the order of pages for best flow
   */
  optimizeOrder() {
    if (this.pages.length <= 2) return;
    
    // Keep first page (home) fixed, optimize the rest
    const [first, ...rest] = this.pages;
    
    // Sort by logical flow:
    // 1. Features/Products early
    // 2. Pricing in middle
    // 3. About/Contact last
    const orderScore = (page) => {
      const title = (page.title || '').toLowerCase();
      const url = (page.url || '').toLowerCase();
      
      if (title.includes('feature') || url.includes('feature')) return 10;
      if (title.includes('product') || url.includes('product')) return 20;
      if (title.includes('solution') || url.includes('solution')) return 25;
      if (title.includes('service') || url.includes('service')) return 30;
      if (title.includes('pricing') || url.includes('pricing')) return 50;
      if (title.includes('demo') || url.includes('demo')) return 60;
      if (title.includes('about') || url.includes('about')) return 80;
      if (title.includes('contact') || url.includes('contact')) return 90;
      return 40; // Default middle
    };
    
    rest.sort((a, b) => orderScore(a) - orderScore(b));
    this.pages = [first, ...rest];
    
    // Update transition methods
    for (let i = 1; i < this.pages.length; i++) {
      this.pages[i].transitionMethod = this.determineTransitionMethod(
        this.pages[i - 1],
        this.pages[i]
      );
    }
  }
  
  /**
   * Determine best transition method between pages
   * @param {PageEntry} from - Source page
   * @param {PageEntry} to - Target page
   * @returns {string} Transition method
   * @private
   */
  determineTransitionMethod(from, to) {
    // Check if there's a direct link
    if (from.node?.edges?.some(e => e.target === to.id)) {
      return 'click';
    }
    
    // Check if going back
    if (to.node?.edges?.some(e => e.target === from.id)) {
      return 'back';
    }
    
    // Default to navigation
    return 'navigate';
  }
  
  /**
   * Allocate time across pages
   */
  allocateTime() {
    // Reserve time for transitions
    const transitionTotal = (this.pages.length - 1) * this.options.transitionTime;
    const availableTime = this.totalDuration - transitionTotal;
    
    // Calculate total priority
    const totalPriority = this.pages.reduce((sum, p) => sum + p.priority, 0);
    
    // Allocate proportionally to priority
    let allocated = 0;
    for (const page of this.pages) {
      const proportion = page.priority / totalPriority;
      let duration = Math.round(availableTime * proportion);
      
      // Clamp to min/max
      duration = Math.max(this.options.minPageDuration, 
        Math.min(this.options.maxPageDuration, duration));
      
      page.duration = duration;
      allocated += duration;
    }
    
    // Adjust if over/under allocated
    const diff = availableTime - allocated;
    if (diff !== 0 && this.pages.length > 0) {
      // Add/remove from highest priority page
      this.pages[0].duration += diff;
      this.pages[0].duration = Math.max(this.options.minPageDuration, this.pages[0].duration);
    }
  }
  
  /**
   * Plan transitions between pages
   */
  planTransitions() {
    this.currentTimeOffset = 0;
    
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i];
      page.startTime = this.currentTimeOffset;
      
      // Add transition time after each page (except last)
      this.currentTimeOffset += page.duration;
      if (i < this.pages.length - 1) {
        this.currentTimeOffset += this.options.transitionTime;
      }
    }
  }
  
  /**
   * Create detailed timelines for each page
   */
  createTimelines() {
    for (const page of this.pages) {
      page.timeline = this.createPageTimeline(page);
    }
  }
  
  /**
   * Create timeline for a single page
   * @param {PageEntry} page - The page
   * @returns {TimelineEntry[]} Timeline entries
   * @private
   */
  createPageTimeline(page) {
    const timeline = [];
    let currentTime = 0;
    const duration = page.duration;
    const analysis = page.analysis;
    
    // Initial wait for page load
    timeline.push({
      startTime: currentTime,
      duration: 1000,
      type: 'wait',
      narrative: this.getNarrativeForPage(page, 'intro'),
      priority: 100,
      skippable: false
    });
    currentTime += 1000;
    
    // If we have content analysis, plan based on sections
    if (analysis?.sections && analysis.sections.length > 0) {
      const sections = analysis.sections
        .filter(s => (s.demoScore || 50) > 30)
        .slice(0, 5); // Max 5 sections per page
      
      if (sections.length > 0) {
        const timePerSection = (duration - 2000) / sections.length;
        
        for (const section of sections) {
          const sectionActions = this.planSectionActions(section, timePerSection);
          for (const action of sectionActions) {
            action.startTime = currentTime + (action.startTime || 0);
            timeline.push(action);
          }
          currentTime += timePerSection;
        }
      }
    } else {
      // No analysis, create a generic scroll-through
      const scrollDuration = Math.max(1000, duration - 3000);
      
      // Pan across hero/top
      timeline.push({
        startTime: currentTime,
        duration: scrollDuration * 0.3,
        type: 'pan',
        params: { startX: 0.2, startY: 0.3, endX: 0.8, endY: 0.4 },
        priority: 60
      });
      currentTime += scrollDuration * 0.3;
      
      // Scroll through page
      timeline.push({
        startTime: currentTime,
        duration: scrollDuration * 0.5,
        type: 'scroll',
        params: { distance: 1500 },
        priority: 50
      });
      currentTime += scrollDuration * 0.5;
      
      // Scroll back to top
      timeline.push({
        startTime: currentTime,
        duration: scrollDuration * 0.2,
        type: 'scroll-to',
        params: { y: 0 },
        priority: 40
      });
    }
    
    // Final pause
    timeline.push({
      startTime: duration - 500,
      duration: 500,
      type: 'wait',
      priority: 90
    });
    
    return timeline;
  }
  
  /**
   * Plan actions for a content section
   * @param {Object} section - Section data
   * @param {number} duration - Available time
   * @returns {TimelineEntry[]} Actions
   * @private
   */
  planSectionActions(section, duration) {
    const actions = [];
    let offset = 0;
    
    // Scroll to section if needed
    if (section.bounds && section.bounds.y > 100) {
      actions.push({
        startTime: offset,
        duration: 800,
        type: 'scroll-to',
        y: section.bounds.y - 100,
        priority: 90
      });
      offset += 800;
    }
    
    // Hover over key elements
    const keyElements = (section.keyElements || []).slice(0, 3);
    if (keyElements.length > 0) {
      const timePerElement = (duration - offset - 500) / keyElements.length;
      
      for (const element of keyElements) {
        actions.push({
          startTime: offset,
          duration: timePerElement * 0.7,
          type: 'hover',
          target: element.selector,
          x: element.x,
          y: element.y,
          priority: element.priority || 50,
          skippable: true
        });
        offset += timePerElement;
      }
    } else {
      // Just pan across section
      actions.push({
        startTime: offset,
        duration: duration - offset - 300,
        type: 'pan',
        params: { bounds: section.bounds },
        priority: 40
      });
    }
    
    return actions;
  }
  
  /**
   * Generate narrative script
   */
  generateNarrative() {
    const parts = [];
    
    for (const page of this.pages) {
      const intro = this.getNarrativeForPage(page, 'intro');
      const content = this.getNarrativeForPage(page, 'content');
      
      if (intro) parts.push(intro);
      if (content) parts.push(content);
    }
    
    this.narrative = parts.join(' ');
  }
  
  /**
   * Get narrative text for a page
   * @param {PageEntry} page - The page
   * @param {'intro' | 'content' | 'outro'} section - Section of page
   * @returns {string} Narrative text
   * @private
   */
  getNarrativeForPage(page, section) {
    const style = this.options.style;
    const title = page.title || 'this page';
    const analysis = page.analysis;
    
    // Generate based on style
    if (style === 'professional') {
      if (section === 'intro') {
        if (page.id === 'home' || page.url === '/') {
          return `Welcome to ${title}. Let me show you what this platform offers.`;
        }
        return `Let's explore the ${title} section.`;
      }
      if (section === 'content' && analysis?.summary) {
        return analysis.summary;
      }
    } else if (style === 'casual') {
      if (section === 'intro') {
        if (page.id === 'home' || page.url === '/') {
          return `Hey! Check out ${title} - pretty cool stuff here.`;
        }
        return `Now let's check out ${title}.`;
      }
    } else if (style === 'energetic') {
      if (section === 'intro') {
        if (page.id === 'home' || page.url === '/') {
          return `Welcome to ${title}! Get ready to see some amazing features!`;
        }
        return `And here's the awesome ${title} page!`;
      }
    }
    
    return '';
  }
  
  // ============================================================
  // Query Methods
  // ============================================================
  
  /**
   * Get timeline for a specific page
   * @param {string} pageId - Page ID
   * @returns {TimelineEntry[]} Timeline entries
   */
  getTimelineForPage(pageId) {
    const page = this.pages.find(p => p.id === pageId);
    return page?.timeline || [];
  }
  
  /**
   * Get action at a specific time
   * @param {number} globalTime - Time in ms from start
   * @returns {TimelineEntry | null} Action at that time
   */
  getActionAtTime(globalTime) {
    for (const page of this.pages) {
      if (globalTime >= page.startTime && globalTime < page.startTime + page.duration) {
        const localTime = globalTime - page.startTime;
        
        for (const action of page.timeline) {
          if (localTime >= action.startTime && localTime < action.startTime + action.duration) {
            return action;
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Get next action after current time
   * @param {number} globalTime - Current time
   * @returns {{page: PageEntry, action: TimelineEntry} | null}
   */
  getNextAction(globalTime) {
    for (const page of this.pages) {
      if (globalTime < page.startTime) {
        // Next page starts after current time
        return { page, action: page.timeline[0] };
      }
      
      if (globalTime >= page.startTime && globalTime < page.startTime + page.duration) {
        const localTime = globalTime - page.startTime;
        
        for (const action of page.timeline) {
          if (action.startTime > localTime) {
            return { page, action };
          }
        }
      }
    }
    return null;
  }
  
  /**
   * Adjust timeline by shifting times
   * @param {number} delta - Time shift in ms
   */
  adjustTimeline(delta) {
    this.totalDuration += delta;
    
    for (const page of this.pages) {
      page.startTime += delta;
    }
  }
  
  /**
   * Convert plan to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      pages: this.pages.map(p => ({
        id: p.id,
        url: p.url,
        title: p.title,
        duration: p.duration,
        priority: p.priority,
        startTime: p.startTime,
        transitionMethod: p.transitionMethod,
        timeline: p.timeline
      })),
      narrative: this.narrative,
      totalDuration: this.totalDuration,
      options: this.options
    };
  }
}

export default DemoPlan;
