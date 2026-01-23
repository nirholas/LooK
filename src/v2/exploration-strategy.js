/**
 * Exploration Strategy - Intelligent website exploration decisions
 * 
 * Provides multiple strategies for exploring websites: breadth-first, depth-first,
 * priority-based, and AI-guided. Includes filters for skipping unwanted pages
 * and depth/breadth controls.
 */

import OpenAI from 'openai';

let openai = null;

/**
 * Get OpenAI client instance
 * @returns {OpenAI}
 */
function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for AI-guided exploration');
    }
    openai = new OpenAI();
  }
  return openai;
}

/**
 * Available exploration strategies
 * @enum {string}
 */
export const ExplorationStrategyType = {
  BREADTH_FIRST: 'breadth-first',
  DEPTH_FIRST: 'depth-first',
  PRIORITY: 'priority',
  AI_GUIDED: 'ai-guided'
};

/**
 * Action types that can be taken during exploration
 * @enum {string}
 */
export const ExplorationAction = {
  CLICK: 'click',
  BACK: 'back',
  DONE: 'done',
  SKIP: 'skip'
};

/**
 * Strategies for exploring a website
 */
export class ExplorationStrategy {
  /**
   * Create an exploration strategy
   * @param {import('./navigation-graph.js').NavigationGraph} graph - Navigation graph
   * @param {Object} [options] - Configuration options
   * @param {string} [options.strategy] - Initial strategy type
   * @param {number} [options.maxDepth] - Maximum exploration depth
   * @param {number} [options.maxNodesPerLevel] - Maximum nodes at each depth level
   * @param {number} [options.maxTotalNodes] - Maximum total nodes to explore
   * @param {string} [options.focus] - Focus area: 'features', 'overview', 'technical', 'pricing'
   */
  constructor(graph, options = {}) {
    /** @type {import('./navigation-graph.js').NavigationGraph} */
    this.graph = graph;
    
    /** @type {string} Current exploration strategy */
    this.strategy = options.strategy || ExplorationStrategyType.PRIORITY;
    
    /** @type {number} Maximum exploration depth */
    this.maxDepth = options.maxDepth ?? 3;
    
    /** @type {number} Maximum nodes per depth level */
    this.maxNodesPerLevel = options.maxNodesPerLevel ?? 5;
    
    /** @type {number} Maximum total nodes to explore */
    this.maxTotalNodes = options.maxTotalNodes ?? 20;
    
    /** @type {string} Focus area for exploration */
    this.focus = options.focus || 'features';
    
    /** @type {Array<Function>} Link filters */
    this.linkFilters = [];
    
    /** @type {Array<Function>} Node filters */
    this.nodeFilters = [];
    
    /** @type {Set<string>} URLs that have been processed */
    this.processedUrls = new Set();
    
    /** @type {Object} Statistics about exploration */
    this.stats = {
      linksEvaluated: 0,
      linksSkipped: 0,
      nodesCreated: 0,
      backNavigations: 0,
      aiDecisions: 0
    };
    
    // Apply default filters
    this.addLinkFilter(ExplorationStrategy.skipExternalLinks);
    this.addLinkFilter(ExplorationStrategy.skipAssets);
  }

  // ==================== Strategy Selection ====================

  /**
   * Set the exploration strategy
   * @param {string} name - Strategy name
   */
  setStrategy(name) {
    if (!Object.values(ExplorationStrategyType).includes(name)) {
      throw new Error(`Unknown strategy: ${name}. Valid strategies: ${Object.values(ExplorationStrategyType).join(', ')}`);
    }
    this.strategy = name;
  }

  /**
   * Get current strategy
   * @returns {string}
   */
  getStrategy() {
    return this.strategy;
  }

  // ==================== Exploration Decisions ====================

  /**
   * Decide if a link is worth clicking
   * @param {Object} link - Link object with text, href, selector
   * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
   * @returns {Promise<boolean>}
   */
  async shouldExploreLink(link, currentNode) {
    this.stats.linksEvaluated++;
    
    // Check if already processed
    if (link.href && this.processedUrls.has(link.href)) {
      this.stats.linksSkipped++;
      return false;
    }
    
    // Apply all link filters
    for (const filter of this.linkFilters) {
      if (!filter(link, currentNode)) {
        this.stats.linksSkipped++;
        return false;
      }
    }
    
    // Check depth constraint
    if (currentNode.depth >= this.maxDepth) {
      this.stats.linksSkipped++;
      return false;
    }
    
    // Check nodes per level constraint
    const nodesAtNextLevel = this.graph.getNodesAtDepth(currentNode.depth + 1);
    if (nodesAtNextLevel.length >= this.maxNodesPerLevel) {
      this.stats.linksSkipped++;
      return false;
    }
    
    // Check total nodes constraint
    if (this.graph.size >= this.maxTotalNodes) {
      this.stats.linksSkipped++;
      return false;
    }
    
    return true;
  }

  /**
   * Decide if we should go deeper from current node
   * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
   * @returns {Promise<boolean>}
   */
  async shouldGoDeeper(currentNode) {
    // Check depth limit
    if (currentNode.depth >= this.maxDepth) {
      return false;
    }
    
    // Check if there are unexplored links
    if (!currentNode.hasUnexploredLinks()) {
      return false;
    }
    
    // Apply node filters
    for (const filter of this.nodeFilters) {
      if (!filter(currentNode)) {
        return false;
      }
    }
    
    // Strategy-specific decisions
    switch (this.strategy) {
      case ExplorationStrategyType.DEPTH_FIRST:
        // Always go deeper if possible
        return true;
        
      case ExplorationStrategyType.BREADTH_FIRST:
        // Only go deeper if all siblings are explored
        const siblings = this.graph.getSiblings(currentNode.id);
        const unexploredSiblings = siblings.filter(s => s.hasUnexploredLinks());
        return unexploredSiblings.length === 0;
        
      case ExplorationStrategyType.PRIORITY:
        // Go deeper if node seems high-value
        return this.isHighValueNode(currentNode);
        
      case ExplorationStrategyType.AI_GUIDED:
        // AI will decide in selectNextAction
        return true;
        
      default:
        return true;
    }
  }

  /**
   * Decide if we should go back to parent
   * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
   * @returns {Promise<boolean>}
   */
  async shouldGoBack(currentNode) {
    // Can't go back from root
    if (!currentNode.parent) {
      return false;
    }
    
    // No unexplored links left
    if (!currentNode.hasUnexploredLinks()) {
      return true;
    }
    
    // Hit depth limit
    if (currentNode.depth >= this.maxDepth) {
      return true;
    }
    
    // Strategy-specific decisions
    switch (this.strategy) {
      case ExplorationStrategyType.BREADTH_FIRST:
        // Go back to explore siblings first
        const parent = this.graph.getParent(currentNode.id);
        if (parent && parent.hasUnexploredLinks()) {
          return true;
        }
        break;
        
      case ExplorationStrategyType.DEPTH_FIRST:
        // Only go back when fully explored
        return !currentNode.hasUnexploredLinks();
        
      default:
        break;
    }
    
    return false;
  }

  /**
   * Select the next action to take
   * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
   * @param {Array<Object>} availableLinks - Available links to click
   * @returns {Promise<Object>} Action object { action, target, reason }
   */
  async selectNextAction(currentNode, availableLinks) {
    // Filter available links
    const validLinks = [];
    for (const link of availableLinks) {
      if (await this.shouldExploreLink(link, currentNode)) {
        validLinks.push(link);
      }
    }
    
    // No valid links - go back or finish
    if (validLinks.length === 0) {
      if (currentNode.parent) {
        this.stats.backNavigations++;
        return {
          action: ExplorationAction.BACK,
          target: null,
          reason: 'No more valid links to explore'
        };
      }
      return {
        action: ExplorationAction.DONE,
        target: null,
        reason: 'Exploration complete - no more links'
      };
    }
    
    // Check if we should go back before exploring more
    if (await this.shouldGoBack(currentNode)) {
      this.stats.backNavigations++;
      return {
        action: ExplorationAction.BACK,
        target: null,
        reason: 'Strategy suggests returning to parent'
      };
    }
    
    // Check total nodes limit
    if (this.graph.size >= this.maxTotalNodes) {
      return {
        action: ExplorationAction.DONE,
        target: null,
        reason: 'Maximum nodes limit reached'
      };
    }
    
    // Select next link based on strategy
    let selectedLink;
    let reason;
    
    switch (this.strategy) {
      case ExplorationStrategyType.AI_GUIDED:
        const aiDecision = await this.aiSelectNextAction(currentNode, validLinks);
        this.stats.aiDecisions++;
        return aiDecision;
        
      case ExplorationStrategyType.PRIORITY:
        selectedLink = this.selectByPriority(validLinks);
        reason = 'Selected highest priority link';
        break;
        
      case ExplorationStrategyType.DEPTH_FIRST:
        selectedLink = validLinks[0];
        reason = 'Depth-first: taking first available link';
        break;
        
      case ExplorationStrategyType.BREADTH_FIRST:
        selectedLink = validLinks[0];
        reason = 'Breadth-first: taking first available link';
        break;
        
      default:
        selectedLink = validLinks[0];
        reason = 'Default selection';
    }
    
    if (!selectedLink) {
      return {
        action: ExplorationAction.DONE,
        target: null,
        reason: 'No suitable link found'
      };
    }
    
    return {
      action: ExplorationAction.CLICK,
      target: selectedLink.text || selectedLink.selector,
      link: selectedLink,
      reason
    };
  }

  /**
   * Select link by priority scoring
   * @param {Array<Object>} links - Available links
   * @returns {Object|null} Selected link
   */
  selectByPriority(links) {
    if (links.length === 0) return null;
    
    const scored = links.map(link => ({
      link,
      score: this.scoreLinkForDemo(link)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0].link;
  }

  /**
   * Score a link based on demo value
   * @param {Object} link - Link object
   * @returns {number} Score
   */
  scoreLinkForDemo(link) {
    let score = 0;
    const text = (link.text || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    // High-value keywords
    const highValue = {
      'feature': 30,
      'product': 25,
      'pricing': 20,
      'how it works': 25,
      'tour': 25,
      'demo': 30,
      'explore': 20,
      'discover': 15,
      'see': 10,
      'learn more': 15,
      'get started': 20,
      'dashboard': 15,
      'overview': 15
    };
    
    for (const [keyword, value] of Object.entries(highValue)) {
      if (text.includes(keyword) || href.includes(keyword.replace(/\s+/g, '-'))) {
        score += value;
      }
    }
    
    // Focus-specific boosts
    switch (this.focus) {
      case 'features':
        if (text.includes('feature') || href.includes('feature')) score += 20;
        break;
      case 'pricing':
        if (text.includes('pricing') || text.includes('plan')) score += 20;
        break;
      case 'technical':
        if (text.includes('doc') || text.includes('api') || text.includes('developer')) score += 20;
        break;
      case 'overview':
        if (text.includes('about') || text.includes('overview')) score += 20;
        break;
    }
    
    // Low-value penalties
    const lowValue = {
      'blog': -20,
      'news': -15,
      'login': -40,
      'sign in': -40,
      'sign up': -30,
      'register': -30,
      'terms': -50,
      'privacy': -50,
      'cookie': -50,
      'legal': -50,
      'careers': -40,
      'jobs': -40,
      'contact': -10,
      'support': -10
    };
    
    for (const [keyword, value] of Object.entries(lowValue)) {
      if (text.includes(keyword) || href.includes(keyword.replace(/\s+/g, '-'))) {
        score += value;
      }
    }
    
    // Navigation links get a boost
    if (link.isNav || link.isNavigation) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Check if a node is high-value for demos
   * @param {import('./navigation-graph.js').NavigationNode} node - Node to check
   * @returns {boolean}
   */
  isHighValueNode(node) {
    const title = (node.title || '').toLowerCase();
    const url = (node.url || '').toLowerCase();
    
    const highValuePatterns = [
      'feature', 'product', 'pricing', 'tour', 'demo',
      'how-it-works', 'overview', 'dashboard', 'explore'
    ];
    
    for (const pattern of highValuePatterns) {
      if (title.includes(pattern) || url.includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }

  // ==================== AI-Guided Exploration ====================

  /**
   * Use AI to select the next action
   * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
   * @param {Array<Object>} availableLinks - Available links
   * @returns {Promise<Object>} Action object
   */
  async aiSelectNextAction(currentNode, availableLinks) {
    try {
      const response = await aiSelectNextAction(
        this.graph,
        currentNode,
        availableLinks,
        { focus: this.focus, maxDepth: this.maxDepth }
      );
      
      // Validate AI response
      if (response.action === ExplorationAction.CLICK) {
        const link = availableLinks.find(l => 
          l.text === response.target || 
          l.text?.toLowerCase().includes(response.target?.toLowerCase())
        );
        
        if (link) {
          return {
            action: ExplorationAction.CLICK,
            target: link.text,
            link,
            reason: response.reason || 'AI-selected link'
          };
        }
        
        // Fallback to priority selection if AI target not found
        const fallbackLink = this.selectByPriority(availableLinks);
        return {
          action: ExplorationAction.CLICK,
          target: fallbackLink?.text,
          link: fallbackLink,
          reason: 'AI target not found, using priority fallback'
        };
      }
      
      return {
        action: response.action,
        target: response.target,
        reason: response.reason
      };
    } catch (error) {
      console.warn('AI exploration decision failed, using priority fallback:', error.message);
      
      // Fallback to priority strategy
      const link = this.selectByPriority(availableLinks);
      if (link) {
        return {
          action: ExplorationAction.CLICK,
          target: link.text,
          link,
          reason: 'Fallback: AI unavailable'
        };
      }
      
      return {
        action: ExplorationAction.DONE,
        target: null,
        reason: 'AI failed and no valid links'
      };
    }
  }

  // ==================== Depth Control ====================

  /**
   * Set maximum exploration depth
   * @param {number} depth - Maximum depth
   */
  setMaxDepth(depth) {
    if (depth < 1) {
      throw new Error('Max depth must be at least 1');
    }
    this.maxDepth = depth;
  }

  /**
   * Set maximum nodes per level
   * @param {number} count - Maximum nodes at each depth
   */
  setMaxNodesPerLevel(count) {
    if (count < 1) {
      throw new Error('Max nodes per level must be at least 1');
    }
    this.maxNodesPerLevel = count;
  }

  /**
   * Set maximum total nodes
   * @param {number} count - Maximum total nodes
   */
  setMaxTotalNodes(count) {
    if (count < 1) {
      throw new Error('Max total nodes must be at least 1');
    }
    this.maxTotalNodes = count;
  }

  // ==================== Filters ====================

  /**
   * Add a filter function for links
   * Filter should return true to include the link, false to skip
   * @param {Function} fn - Filter function(link, currentNode) => boolean
   */
  addLinkFilter(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Link filter must be a function');
    }
    this.linkFilters.push(fn);
  }

  /**
   * Add a filter function for nodes
   * Filter should return true to include the node, false to skip
   * @param {Function} fn - Filter function(node) => boolean
   */
  addNodeFilter(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Node filter must be a function');
    }
    this.nodeFilters.push(fn);
  }

  /**
   * Remove all link filters
   */
  clearLinkFilters() {
    this.linkFilters = [];
  }

  /**
   * Remove all node filters
   */
  clearNodeFilters() {
    this.nodeFilters = [];
  }

  /**
   * Mark a URL as processed
   * @param {string} url - URL to mark
   */
  markProcessed(url) {
    if (url) {
      this.processedUrls.add(url);
    }
  }

  /**
   * Get exploration statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      linksEvaluated: 0,
      linksSkipped: 0,
      nodesCreated: 0,
      backNavigations: 0,
      aiDecisions: 0
    };
    this.processedUrls.clear();
  }

  // ==================== Built-in Filters ====================

  /**
   * Filter that skips external links
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipExternalLinks(link) {
    if (!link.href) return true;
    
    try {
      const url = new URL(link.href);
      // Skip if it's a different domain (external)
      // This will be checked against the base domain during exploration
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }
      return true;
    } catch {
      // Invalid URL, skip it
      return false;
    }
  }

  /**
   * Filter that skips authentication pages
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipAuthPages(link) {
    const text = (link.text || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    const authKeywords = [
      'login', 'log in', 'signin', 'sign in', 'signup', 'sign up',
      'register', 'auth', 'oauth', 'sso', 'password', 'forgot',
      'reset-password', 'verify', 'confirmation'
    ];
    
    for (const keyword of authKeywords) {
      if (text.includes(keyword) || href.includes(keyword.replace(/\s+/g, '-'))) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Filter that skips legal pages
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipLegalPages(link) {
    const text = (link.text || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    const legalKeywords = [
      'terms', 'privacy', 'policy', 'legal', 'disclaimer',
      'cookie', 'gdpr', 'ccpa', 'compliance', 'tos'
    ];
    
    for (const keyword of legalKeywords) {
      if (text.includes(keyword) || href.includes(keyword)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Filter that skips asset files
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipAssets(link) {
    if (!link.href) return true;
    
    try {
      const url = new URL(link.href);
      const assetExtensions = [
        '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
        '.mp4', '.webm', '.mp3', '.wav', '.zip', '.tar', '.gz',
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'
      ];
      
      for (const ext of assetExtensions) {
        if (url.pathname.toLowerCase().endsWith(ext)) {
          return false;
        }
      }
      
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Filter that skips social media links
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipSocialLinks(link) {
    if (!link.href) return true;
    
    const socialDomains = [
      'twitter.com', 'x.com', 'facebook.com', 'linkedin.com',
      'instagram.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
      'reddit.com', 'discord.com', 'discord.gg', 'github.com',
      'medium.com', 'substack.com'
    ];
    
    try {
      const url = new URL(link.href);
      for (const domain of socialDomains) {
        if (url.hostname.includes(domain)) {
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Filter that skips blog/news pages
   * @param {Object} link - Link object
   * @returns {boolean}
   */
  static skipBlogPages(link) {
    const text = (link.text || '').toLowerCase();
    const href = (link.href || '').toLowerCase();
    
    const blogKeywords = [
      'blog', 'news', 'press', 'article', 'post',
      '/blog/', '/news/', '/press/', '/articles/'
    ];
    
    for (const keyword of blogKeywords) {
      if (text.includes(keyword) || href.includes(keyword)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create a filter for a specific domain (internal links only)
   * @param {string} baseDomain - Base domain to allow
   * @returns {Function} Filter function
   */
  static createDomainFilter(baseDomain) {
    return (link) => {
      if (!link.href) return false;
      
      try {
        const url = new URL(link.href);
        return url.hostname === baseDomain || url.hostname.endsWith('.' + baseDomain);
      } catch {
        return false;
      }
    };
  }
}

/**
 * AI-guided exploration using GPT-4
 * @param {import('./navigation-graph.js').NavigationGraph} graph - Navigation graph
 * @param {import('./navigation-graph.js').NavigationNode} currentNode - Current node
 * @param {Array<Object>} availableLinks - Available links
 * @param {Object} context - Exploration context
 * @returns {Promise<Object>} Action decision { action, target, reason }
 */
export async function aiSelectNextAction(graph, currentNode, availableLinks, context = {}) {
  const { focus = 'features', maxDepth = 3 } = context;
  
  const visitedTitles = graph.getVisitedTitles().slice(-10); // Last 10 visited
  const linkTexts = availableLinks.map(l => l.text || l.href || 'Unknown').slice(0, 15);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are helping create a product demo video. Given the current page and available links, decide the best next action for an engaging demo.

Consider:
- Feature pages are high value for demos
- Going too deep (> ${maxDepth} levels) loses context
- Variety is better than depth - show different aspects
- Skip login/signup/external links
- Return to main flow if on a tangent
- Focus area is: ${focus}

Return JSON only, no markdown:
{ "action": "click|back|done", "target": "link text or null", "reason": "brief reason" }

Actions:
- click: Navigate to a new page via the target link
- back: Return to parent page to explore other paths
- done: Stop exploration (enough pages visited)`
      },
      {
        role: 'user',
        content: `Current page: "${currentNode.title || 'Unknown'}" (depth: ${currentNode.depth}/${maxDepth})
URL: ${currentNode.url}
Already visited: ${visitedTitles.join(', ') || 'None'}
Total nodes explored: ${graph.size}

Available links to click:
${linkTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

What should we do next for the best demo?`
      }
    ],
    temperature: 0.3,
    max_tokens: 200
  });
  
  const content = response.choices[0].message.content;
  
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      
      // Validate action
      if (!['click', 'back', 'done'].includes(decision.action)) {
        decision.action = 'click';
      }
      
      return {
        action: decision.action,
        target: decision.target,
        reason: decision.reason || 'AI decision'
      };
    }
  } catch (e) {
    console.warn('Failed to parse AI decision:', e.message);
  }
  
  // Default fallback
  return {
    action: 'click',
    target: linkTexts[0] || null,
    reason: 'AI parsing failed, selecting first link'
  };
}

/**
 * Create a demo-optimized exploration strategy
 * @param {import('./navigation-graph.js').NavigationGraph} graph - Navigation graph
 * @param {Object} [options] - Options
 * @returns {ExplorationStrategy}
 */
export function createDemoStrategy(graph, options = {}) {
  const strategy = new ExplorationStrategy(graph, {
    strategy: ExplorationStrategyType.PRIORITY,
    maxDepth: options.maxDepth ?? 2,
    maxNodesPerLevel: options.maxNodesPerLevel ?? 4,
    maxTotalNodes: options.maxTotalNodes ?? 12,
    focus: options.focus || 'features',
    ...options
  });
  
  // Add recommended filters for demos
  strategy.addLinkFilter(ExplorationStrategy.skipAuthPages);
  strategy.addLinkFilter(ExplorationStrategy.skipLegalPages);
  strategy.addLinkFilter(ExplorationStrategy.skipSocialLinks);
  
  if (options.skipBlog !== false) {
    strategy.addLinkFilter(ExplorationStrategy.skipBlogPages);
  }
  
  if (options.baseDomain) {
    strategy.addLinkFilter(ExplorationStrategy.createDomainFilter(options.baseDomain));
  }
  
  return strategy;
}

export default ExplorationStrategy;
