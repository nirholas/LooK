/**
 * Site Explorer - Intelligent multi-page website navigation for demos
 * 
 * Uses AI to understand site structure, prioritize pages to visit,
 * and create a coherent walkthrough of an entire product.
 * 
 * Features:
 * - Graph-based navigation structure for tracking page relationships
 * - SPA detection and handling (React, Vue, Angular, etc.)
 * - Multiple exploration strategies (breadth-first, depth-first, priority, AI-guided)
 * - Sub-flow exploration with back navigation support
 */

import OpenAI from 'openai';
import { chromium } from 'playwright';
import { URL } from 'url';
import { ContentAnalyzer, ContentDeduplicator } from './content-analyzer.js';
import { NavigationGraph, NavigationNode, createNodeId } from './navigation-graph.js';
import { SPADetector, generateStateHash, waitForSPAReady } from './spa-detector.js';
import { 
  ExplorationStrategy, 
  ExplorationStrategyType, 
  ExplorationAction,
  createDemoStrategy 
} from './exploration-strategy.js';

let openai = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY required for site exploration');
    }
    openai = new OpenAI();
  }
  return openai;
}

/**
 * Site map entry representing a discovered page
 */
class SitePage {
  constructor(url, metadata = {}) {
    this.url = url;
    this.path = new URL(url).pathname;
    this.title = metadata.title || '';
    this.description = metadata.description || '';
    this.links = metadata.links || [];
    this.priority = metadata.priority || 0;
    this.category = metadata.category || 'other';
    this.visited = false;
    this.screenshot = null;
    this.analysis = null;
    /** @type {import('./content-analyzer.js').PageContent|null} */
    this.contentAnalysis = null;
  }
}

/**
 * SiteExplorer - Crawl and understand a website structure
 */
export class SiteExplorer {
  constructor(options = {}) {
    this.maxPages = options.maxPages || 8;
    this.maxDepth = options.maxDepth || 2;
    this.timeout = options.timeout || 10000;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.baseUrl = null;
    this.baseDomain = null;
    this.pages = new Map();
    this.browser = null;
    this.page = null;
    
    /** @type {ContentDeduplicator} */
    this.deduplicator = new ContentDeduplicator();
    
    /** @type {ContentAnalyzer|null} */
    this.contentAnalyzer = null;
    
    // New graph-based navigation system
    /** @type {NavigationGraph} Navigation graph for tracking site structure */
    this.graph = new NavigationGraph();
    
    /** @type {SPADetector|null} SPA detection and handling */
    this.spaDetector = null;
    
    /** @type {ExplorationStrategy|null} Exploration strategy */
    this.strategy = null;
    
    /** @type {string} Exploration strategy type */
    this.strategyType = options.strategy || ExplorationStrategyType.PRIORITY;
    
    /** @type {string} Focus area for exploration */
    this.focus = options.focus || 'features';
    
    /** @type {boolean} Whether the site is a SPA */
    this.isSPA = false;
    
    /** @type {Array<string>} Navigation history for back navigation */
    this.navigationHistory = [];
    
    /** @type {boolean} Enable graph-based exploration (new mode) */
    this.useGraphExploration = options.useGraphExploration ?? false;
  }

  /**
   * Initialize browser
   */
  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage({
      viewport: { width: this.width, height: this.height }
    });
    
    // Initialize SPA detector
    this.spaDetector = new SPADetector(this.page, {
      stateChangeTimeout: this.timeout,
      navigationTimeout: this.timeout
    });
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Explore a website and build a prioritized sitemap
   * @param {string} startUrl - URL to start exploration from
   * @returns {Promise<Object>} Site map with explored pages
   */
  async explore(startUrl) {
    this.baseUrl = startUrl;
    this.baseDomain = new URL(startUrl).hostname;
    
    // Set up graph metadata
    this.graph.metadata.baseUrl = this.baseUrl;
    this.graph.metadata.baseDomain = this.baseDomain;

    // Use new graph-based exploration if enabled
    if (this.useGraphExploration) {
      return this.exploreWithGraph(startUrl);
    }

    // Legacy linear exploration
    // Start with the homepage
    await this.visitPage(startUrl, 0);

    // Use AI to prioritize which pages to visit next
    const prioritizedLinks = await this.prioritizeLinks();

    // Visit prioritized pages (up to maxPages)
    for (const link of prioritizedLinks.slice(0, this.maxPages - 1)) {
      if (this.pages.size >= this.maxPages) break;
      if (!this.pages.has(link.url)) {
        await this.visitPage(link.url, 1);
      }
    }

    return this.getSiteMap();
  }

  /**
   * Graph-based exploration - builds a navigation graph with sub-flow support
   * @param {string} startUrl - URL to start exploration from
   * @returns {Promise<Object>} Site map with navigation graph
   */
  async exploreWithGraph(startUrl) {
    // Detect if site is a SPA
    await this.page.goto(startUrl, { 
      waitUntil: 'networkidle', 
      timeout: this.timeout 
    });
    
    this.isSPA = await this.spaDetector.isSPA();
    
    if (this.isSPA) {
      const framework = await this.spaDetector.detectFramework();
      console.log(`Detected SPA: ${framework.name}${framework.version ? ` v${framework.version}` : ''}`);
    }
    
    // Create root node
    const stateHash = this.isSPA ? await this.spaDetector.getStateHash() : null;
    const rootNode = await this.createNavigationNode(startUrl, null, 0, stateHash);
    
    this.graph.addNode(rootNode);
    this.graph.setRoot(rootNode.id);
    
    // Initialize exploration strategy
    this.strategy = createDemoStrategy(this.graph, {
      maxDepth: this.maxDepth,
      maxTotalNodes: this.maxPages,
      focus: this.focus,
      baseDomain: this.baseDomain
    });
    this.strategy.setStrategy(this.strategyType);
    
    // Start graph exploration from root
    await this.exploreFromNode(rootNode);
    
    // Return combined sitemap
    return {
      ...this.getSiteMap(),
      graph: this.graph,
      isSPA: this.isSPA,
      explorationStats: this.strategy.getStats()
    };
  }

  /**
   * Recursively explore from a node using the configured strategy
   * @param {NavigationNode} node - Current node to explore from
   */
  async exploreFromNode(node) {
    // Visit and analyze the current page
    node.recordVisit();
    this.navigationHistory.push(node.id);
    
    // Capture page data for the legacy sitemap
    const sitePage = await this.capturePageData(node.url, node.depth);
    if (sitePage) {
      node.unexploredLinks = sitePage.links.map(link => ({
        text: link.text,
        href: link.url,
        selector: `a[href="${link.url}"]`,
        isNav: link.isNav
      }));
    }
    
    // Explore using strategy
    let safetyCounter = 0;
    const maxIterations = this.maxPages * 2; // Prevent infinite loops
    
    while (node.hasUnexploredLinks() && safetyCounter < maxIterations) {
      safetyCounter++;
      
      // Check global limits
      if (this.graph.size >= this.maxPages) break;
      
      // Ask strategy for next action
      const action = await this.strategy.selectNextAction(node, node.unexploredLinks);
      
      if (action.action === ExplorationAction.DONE) {
        break;
      }
      
      if (action.action === ExplorationAction.BACK) {
        // Navigate back to parent and continue from there
        if (node.parent) {
          await this.navigateBackToNode(node.parent);
        }
        break;
      }
      
      if (action.action === ExplorationAction.CLICK && action.link) {
        // Click the selected link and explore
        const childNode = await this.clickAndCapture(node, action.link);
        
        if (childNode) {
          // Successfully navigated to new page/state
          this.graph.addNode(childNode);
          this.graph.addEdge(node.id, childNode.id, { 
            via: action.link,
            type: this.isSPA ? 'spa' : 'click'
          });
          
          // Mark link as explored
          node.markLinkExplored(action.link);
          this.strategy.markProcessed(action.link.href);
          
          // Recursively explore child if not too deep
          if (childNode.depth < this.maxDepth) {
            await this.exploreFromNode(childNode);
          }
          
          // Navigate back to current node to continue exploration
          if (node.hasUnexploredLinks() && this.graph.size < this.maxPages) {
            await this.navigateBackToNode(node.id);
          }
        } else {
          // Failed to navigate, mark as explored anyway
          node.markLinkExplored(action.link);
        }
      }
    }
    
    // Mark as leaf if no more exploration possible
    if (!node.hasUnexploredLinks()) {
      node.isLeaf = true;
    }
  }

  /**
   * Create a NavigationNode from current page state
   * @param {string} url - Page URL
   * @param {string|null} parentId - Parent node ID
   * @param {number} depth - Depth from root
   * @param {string|null} [stateHash] - SPA state hash
   * @returns {Promise<NavigationNode>}
   */
  async createNavigationNode(url, parentId, depth, stateHash = null) {
    const title = await this.page.title();
    const nodeId = createNodeId(url, stateHash);
    
    const node = new NavigationNode(nodeId, {
      url,
      stateHash,
      title,
      parent: parentId,
      depth,
      metadata: {
        isNavigation: false,
        capturedAt: Date.now()
      }
    });
    
    return node;
  }

  /**
   * Click a link and capture the resulting page/state
   * @param {NavigationNode} currentNode - Current node
   * @param {Object} link - Link to click
   * @returns {Promise<NavigationNode|null>} New node or null if navigation failed
   */
  async clickAndCapture(currentNode, link) {
    const previousUrl = this.page.url();
    const previousHash = this.isSPA ? await this.spaDetector.getStateHash() : null;
    
    try {
      // Try to click the link
      if (link.selector) {
        await this.page.click(link.selector, { timeout: 3000 }).catch(() => null);
      } else if (link.href) {
        await this.page.goto(link.href, { 
          waitUntil: 'networkidle',
          timeout: this.timeout 
        });
      } else {
        return null;
      }
      
      // Wait for navigation/state change
      if (this.isSPA) {
        await waitForSPAReady(this.page, { timeout: 3000 });
        await this.page.waitForTimeout(500);
      } else {
        await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      }
      
      // Check if we actually navigated somewhere new
      const newUrl = this.page.url();
      const newHash = this.isSPA ? await this.spaDetector.getStateHash() : null;
      
      // For SPAs, check both URL and state hash
      const isNewState = this.isSPA 
        ? (newUrl !== previousUrl || newHash !== previousHash)
        : (newUrl !== previousUrl);
      
      if (!isNewState) {
        // No navigation occurred
        return null;
      }
      
      // Check if this node already exists
      const nodeId = createNodeId(newUrl, newHash);
      if (this.graph.getNode(nodeId)) {
        // Already visited this state
        return null;
      }
      
      // Create new node
      const newNode = await this.createNavigationNode(
        newUrl, 
        currentNode.id, 
        currentNode.depth + 1,
        newHash
      );
      
      return newNode;
    } catch (error) {
      console.warn(`Failed to click "${link.text || link.href}":`, error.message);
      return null;
    }
  }

  /**
   * Navigate back to a specific node
   * @param {string} targetNodeId - Node ID to navigate back to
   */
  async navigateBackToNode(targetNodeId) {
    const targetNode = this.graph.getNode(targetNodeId);
    if (!targetNode) return;
    
    // Try SPA back navigation first
    if (this.isSPA && this.spaDetector) {
      const success = await this.spaDetector.navigateBack();
      if (success) {
        // Verify we reached the right state
        const currentHash = await this.spaDetector.getStateHash();
        const currentUrl = this.page.url();
        const currentId = createNodeId(currentUrl, currentHash);
        
        if (currentId === targetNodeId) {
          return;
        }
      }
    }
    
    // Fallback: direct navigation to URL
    try {
      await this.page.goto(targetNode.url, {
        waitUntil: 'networkidle',
        timeout: this.timeout
      });
      
      if (this.isSPA) {
        await waitForSPAReady(this.page, { timeout: 3000 });
      }
    } catch (error) {
      console.warn(`Failed to navigate back to ${targetNode.url}:`, error.message);
    }
  }

  /**
   * Capture page data and add to legacy sitemap
   * @param {string} url - Page URL
   * @param {number} depth - Current depth
   * @returns {Promise<SitePage|null>}
   */
  async capturePageData(url, depth) {
    try {
      // This reuses existing visitPage logic for data capture
      const metadata = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({
            href: a.href,
            text: a.textContent?.trim() || '',
            ariaLabel: a.getAttribute('aria-label') || ''
          }))
          .filter(l => l.href && !l.href.startsWith('javascript:') && !l.href.startsWith('#'));

        const navLinks = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a'))
          .map(a => a.href)
          .filter(Boolean);

        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          h1: document.querySelector('h1')?.textContent?.trim() || '',
          links,
          navLinks,
          hasForm: !!document.querySelector('form'),
          hasPricing: document.body.innerText.toLowerCase().includes('pricing'),
          hasFeatures: document.body.innerText.toLowerCase().includes('features'),
          hasDocs: document.body.innerText.toLowerCase().includes('documentation') || 
                   document.body.innerText.toLowerCase().includes('docs')
        };
      });

      const screenshot = await this.page.screenshot({ encoding: 'base64' });

      const sitePage = new SitePage(url, {
        title: metadata.title,
        description: metadata.description,
        links: this.filterLinks(metadata.links, metadata.navLinks),
        priority: depth === 0 ? 100 : 50
      });
      sitePage.visited = true;
      sitePage.screenshot = screenshot;
      sitePage.metadata = metadata;

      this.pages.set(url, sitePage);
      return sitePage;
    } catch (error) {
      console.warn(`Failed to capture page data for ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Visit a page and extract information
   * @param {string} url - URL to visit
   * @param {number} depth - Current depth in crawl
   * @param {Object} [options] - Visit options
   * @param {boolean} [options.analyzeContent=false] - Perform deep content analysis
   */
  async visitPage(url, depth, options = {}) {
    const { analyzeContent = false } = options;
    
    if (this.pages.has(url) || depth > this.maxDepth) return;

    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout: this.timeout 
      });

      // Wait for dynamic content
      await this.page.waitForTimeout(1000);

      // Extract page metadata
      const metadata = await this.page.evaluate(() => {
        // Get all internal links
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map(a => {
            const href = a.href;
            const text = a.textContent?.trim() || '';
            const ariaLabel = a.getAttribute('aria-label') || '';
            return { href, text, ariaLabel };
          })
          .filter(l => l.href && !l.href.startsWith('javascript:') && !l.href.startsWith('#'));

        // Get navigation links (higher priority)
        const navLinks = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a'))
          .map(a => a.href)
          .filter(Boolean);

        // Get page info
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          h1: document.querySelector('h1')?.textContent?.trim() || '',
          links,
          navLinks,
          hasForm: !!document.querySelector('form'),
          hasPricing: document.body.innerText.toLowerCase().includes('pricing'),
          hasFeatures: document.body.innerText.toLowerCase().includes('features'),
          hasDocs: document.body.innerText.toLowerCase().includes('documentation') || 
                   document.body.innerText.toLowerCase().includes('docs'),
        };
      });

      // Take screenshot for AI analysis
      const screenshot = await this.page.screenshot({ encoding: 'base64' });

      // Create page entry
      const sitePage = new SitePage(url, {
        title: metadata.title,
        description: metadata.description,
        links: this.filterLinks(metadata.links, metadata.navLinks),
        priority: depth === 0 ? 100 : 50
      });
      sitePage.visited = true;
      sitePage.screenshot = screenshot;
      sitePage.metadata = metadata;

      // Perform deep content analysis if requested
      if (analyzeContent) {
        try {
          const contentAnalysis = await this.analyzePageContent();
          sitePage.contentAnalysis = contentAnalysis;
          
          // Filter to unique content using deduplicator
          const uniqueSections = await this.deduplicator.getUniqueContent(
            contentAnalysis.sections,
            this.page
          );
          
          // Update priority based on content score
          const avgScore = uniqueSections.length > 0
            ? uniqueSections.reduce((sum, s) => sum + s.demoScore, 0) / uniqueSections.length
            : 50;
          sitePage.priority = Math.max(sitePage.priority, avgScore);
        } catch (e) {
          console.warn(`Content analysis failed for ${url}:`, e.message);
        }
      }

      this.pages.set(url, sitePage);

      return sitePage;
    } catch (error) {
      console.warn(`Failed to visit ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Analyze content of the current page
   * @returns {Promise<import('./content-analyzer.js').PageContent>}
   */
  async analyzePageContent() {
    if (!this.contentAnalyzer) {
      this.contentAnalyzer = new ContentAnalyzer(this.page);
    }
    return this.contentAnalyzer.analyzeStructure();
  }

  /**
   * Get ranked sections across all visited pages
   * @returns {Array<{url: string, section: import('./content-analyzer.js').ContentSection}>}
   */
  getRankedContentSections() {
    const allSections = [];
    
    for (const [url, sitePage] of this.pages) {
      if (sitePage.contentAnalysis) {
        for (const section of sitePage.contentAnalysis.getRankedSections()) {
          allSections.push({ url, section });
        }
      }
    }
    
    return allSections.sort((a, b) => b.section.demoScore - a.section.demoScore);
  }

  /**
   * Filter and dedupe links, keeping only internal ones
   */
  filterLinks(allLinks, navLinks) {
    const seen = new Set();
    const navSet = new Set(navLinks);

    return allLinks
      .filter(link => {
        try {
          const linkUrl = new URL(link.href);
          // Only internal links
          if (linkUrl.hostname !== this.baseDomain) return false;
          // Skip assets, anchors, etc
          if (/\.(js|css|png|jpg|svg|gif|ico|woff|pdf)$/i.test(linkUrl.pathname)) return false;
          // Skip duplicate paths
          if (seen.has(linkUrl.pathname)) return false;
          seen.add(linkUrl.pathname);
          return true;
        } catch {
          return false;
        }
      })
      .map(link => ({
        url: link.href,
        text: link.text || link.ariaLabel,
        isNav: navSet.has(link.href),
        path: new URL(link.href).pathname
      }))
      .slice(0, 50); // Limit to prevent overwhelm
  }

  /**
   * Use AI to prioritize which pages are most important for a demo
   */
  async prioritizeLinks() {
    const homepage = this.pages.get(this.baseUrl);
    if (!homepage) return [];

    const links = homepage.links;
    if (links.length === 0) return [];

    // Build context for AI
    const linkDescriptions = links.map(l => 
      `${l.path} - "${l.text}"${l.isNav ? ' [NAV]' : ''}`
    ).join('\n');

    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are helping create a product demo video. Given a list of pages on a website, 
rank them by importance for showcasing the product. Consider:
- Features pages are usually important
- Pricing pages show value proposition
- "How it works" or "About" pages explain the product
- Documentation or API pages are technical but valuable
- Blog posts are usually low priority for demos
- Login/signup pages are low priority
- Terms/privacy pages should be skipped

Return JSON array of the top 8 most important paths for a demo, in order:
["path1", "path2", ...]`
          },
          {
            role: 'user',
            content: `Website: ${homepage.title || this.baseUrl}
Description: ${homepage.description}

Available pages:
${linkDescriptions}

Which pages should we visit for an engaging product demo?`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content;
      const match = content.match(/\[[\s\S]*\]/);
      
      if (match) {
        const prioritizedPaths = JSON.parse(match[0]);
        return links.filter(l => prioritizedPaths.includes(l.path))
          .sort((a, b) => prioritizedPaths.indexOf(a.path) - prioritizedPaths.indexOf(b.path));
      }
    } catch (error) {
      console.warn('AI prioritization failed, using heuristics:', error.message);
    }

    // Fallback: use heuristics
    return this.heuristicPrioritize(links);
  }

  /**
   * Fallback heuristic prioritization
   */
  heuristicPrioritize(links) {
    const scores = links.map(link => {
      let score = link.isNav ? 20 : 0;
      const text = link.text.toLowerCase();
      const path = link.path.toLowerCase();

      // High priority keywords
      if (text.includes('feature') || path.includes('feature')) score += 30;
      if (text.includes('pricing') || path.includes('pricing')) score += 25;
      if (text.includes('how it works') || path.includes('how')) score += 20;
      if (text.includes('product') || path.includes('product')) score += 20;
      if (text.includes('demo') || path.includes('demo')) score += 25;
      if (text.includes('tour') || path.includes('tour')) score += 25;
      if (text.includes('about') || path.includes('about')) score += 15;
      if (text.includes('docs') || path.includes('docs')) score += 15;

      // Low priority
      if (text.includes('blog') || path.includes('blog')) score -= 20;
      if (text.includes('login') || path.includes('login')) score -= 30;
      if (text.includes('sign') || path.includes('sign')) score -= 20;
      if (text.includes('terms') || path.includes('terms')) score -= 50;
      if (text.includes('privacy') || path.includes('privacy')) score -= 50;
      if (text.includes('careers') || path.includes('careers')) score -= 40;

      return { ...link, score };
    });

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Get the explored sitemap
   * @returns {Object} Site map with pages and graph
   */
  getSiteMap() {
    return {
      baseUrl: this.baseUrl,
      pages: Array.from(this.pages.values()),
      totalDiscovered: this.pages.size,
      graph: this.graph,
      graphSummary: this.graph.getSummary(),
      isSPA: this.isSPA
    };
  }

  /**
   * Get the navigation graph
   * @returns {NavigationGraph}
   */
  getGraph() {
    return this.graph;
  }

  /**
   * Export the navigation graph as a Mermaid diagram
   * @param {Object} [options] - Mermaid options
   * @returns {string} Mermaid diagram code
   */
  getGraphDiagram(options = {}) {
    return this.graph.toMermaid(options);
  }

  /**
   * Get exploration statistics
   * @returns {Object|null}
   */
  getExplorationStats() {
    return this.strategy?.getStats() || null;
  }
}

/**
 * Generate a multi-page demo journey using AI
 */
export async function generateDemoJourney(siteMap, options = {}) {
  const {
    duration = 60,
    style = 'professional',
    focus = 'features' // 'features', 'pricing', 'overview', 'technical'
  } = options;

  // Collect page analyses
  const pageAnalyses = siteMap.pages
    .filter(p => p.visited && p.screenshot)
    .map(p => ({
      url: p.url,
      path: p.path,
      title: p.title,
      description: p.description,
      metadata: p.metadata
    }));

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a product demo expert creating a multi-page website walkthrough.
Create a journey that:
1. Starts with the homepage hook
2. Visits 3-5 key pages in a logical order
3. Highlights the most important elements on each page
4. Creates a narrative flow between pages
5. Ends with a call to action

Return JSON:
{
  "journey": [
    {
      "url": "page url",
      "duration": seconds to spend on this page,
      "narrative": "what to say about this page",
      "actions": [
        {"type": "scroll|click|hover|wait", "target": "selector or description", "duration": ms}
      ],
      "transition": "how to introduce the next page (or null for last)"
    }
  ],
  "totalNarrative": "full voiceover script for the entire demo"
}`
      },
      {
        role: 'user',
        content: `Create a ${duration}-second demo journey for this website.

Focus: ${focus}
Style: ${style}

Pages available:
${JSON.stringify(pageAnalyses, null, 2)}

Create an engaging walkthrough that showcases this product effectively.`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const content = response.choices[0].message.content;
  
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    console.warn('Failed to parse journey:', e.message);
  }

  // Fallback: simple journey
  return createFallbackJourney(siteMap, duration);
}

/**
 * Create a simple fallback journey
 */
function createFallbackJourney(siteMap, duration) {
  const pages = siteMap.pages.filter(p => p.visited);
  const timePerPage = duration / pages.length;

  return {
    journey: pages.map((page, i) => ({
      url: page.url,
      duration: timePerPage,
      narrative: i === 0 
        ? `Welcome to ${page.title}. Let me show you what this product can do.`
        : `Now let's look at ${page.title.replace(/ \|.*/, '')}.`,
      actions: [
        { type: 'wait', duration: 2000 },
        { type: 'scroll', target: 'bottom', duration: timePerPage * 500 },
        { type: 'scroll', target: 'top', duration: 1000 }
      ],
      transition: i < pages.length - 1 ? 'Next, let me show you...' : null
    })),
    totalNarrative: pages.map((p, i) => 
      i === 0 
        ? `Welcome to ${p.title}. Let me give you a quick tour.`
        : `Here's ${p.title.replace(/ \|.*/, '')}.`
    ).join(' ')
  };
}

/**
 * Analyze page and find interactive elements with AI
 */
export async function analyzePageForDemo(page, screenshot) {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Analyze this webpage for a demo video. Identify:
1. The most important interactive elements (buttons, links, forms)
2. Key content sections to highlight
3. The best scroll path to showcase content
4. Any animations or interactive features worth demonstrating

Return JSON:
{
  "mainCTA": {"text": "button text", "approximate_position": "top-right|center|etc"},
  "keyElements": [
    {"type": "button|link|section|feature", "description": "what it is", "position": "approximate position", "importance": "high|medium|low"}
  ],
  "suggestedPath": [
    {"action": "scroll|click|hover", "target": "description", "reason": "why"}
  ],
  "interactiveFeatures": ["list of interactive things to demo"],
  "skipElements": ["things to avoid clicking like login, external links"]
}`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this page for an engaging demo:' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshot}`, detail: 'low' } }
        ]
      }
    ],
    max_tokens: 1000
  });

  try {
    const content = response.choices[0].message.content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.warn('Page analysis parsing failed');
  }

  return { keyElements: [], suggestedPath: [], interactiveFeatures: [] };
}

/**
 * Find clickable elements and determine which ones are demo-worthy
 */
export async function findDemoWorthyElements(page) {
  return await page.evaluate(() => {
    const elements = [];
    
    // Find all interactive elements
    const interactives = document.querySelectorAll(
      'button, a, [role="button"], input[type="submit"], [onclick], .btn, [class*="button"]'
    );

    for (const el of interactives) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.top < 0 || rect.top > window.innerHeight) continue;

      const text = el.textContent?.trim() || el.getAttribute('aria-label') || '';
      const href = el.getAttribute('href') || '';
      
      // Skip unwanted elements
      if (text.toLowerCase().includes('login')) continue;
      if (text.toLowerCase().includes('sign in')) continue;
      if (text.toLowerCase().includes('sign up')) continue;
      if (href.startsWith('http') && !href.includes(window.location.hostname)) continue;

      // Score the element
      let score = 0;
      if (text.toLowerCase().includes('try')) score += 10;
      if (text.toLowerCase().includes('start')) score += 10;
      if (text.toLowerCase().includes('demo')) score += 15;
      if (text.toLowerCase().includes('explore')) score += 8;
      if (text.toLowerCase().includes('learn')) score += 5;
      if (text.toLowerCase().includes('feature')) score += 8;
      if (text.toLowerCase().includes('see')) score += 5;
      if (el.tagName === 'BUTTON') score += 3;
      if (el.classList.contains('primary') || el.classList.contains('cta')) score += 10;

      elements.push({
        text,
        href,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        score,
        tagName: el.tagName,
        isNavigation: !!el.closest('nav, header')
      });
    }

    // Sort by score and return top elements
    return elements
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  });
}

/**
 * Smart navigation - click on element and handle the result
 */
export async function smartNavigate(page, element, options = {}) {
  const { waitForNavigation = true, timeout = 5000 } = options;

  const currentUrl = page.url();

  try {
    if (waitForNavigation && element.href && !element.href.startsWith('#')) {
      // This might navigate to a new page
      await Promise.all([
        page.waitForNavigation({ timeout, waitUntil: 'networkidle' }).catch(() => {}),
        page.click(`text="${element.text}"`, { timeout: 2000 }).catch(() => {
          // Fallback to coordinates
          return page.mouse.click(element.x, element.y);
        })
      ]);
    } else {
      // Just click without waiting for navigation
      await page.mouse.click(element.x, element.y);
      await page.waitForTimeout(500);
    }

    const newUrl = page.url();
    return {
      navigated: newUrl !== currentUrl,
      newUrl,
      success: true
    };
  } catch (error) {
    return {
      navigated: false,
      newUrl: currentUrl,
      success: false,
      error: error.message
    };
  }
}

// Re-export navigation graph components for external use
export { 
  NavigationGraph, 
  NavigationNode, 
  NavigationEdge, 
  createNodeId 
} from './navigation-graph.js';

// Re-export SPA detector components
export { 
  SPADetector, 
  generateStateHash, 
  detectSPAFramework, 
  waitForSPAReady 
} from './spa-detector.js';

// Re-export exploration strategy components
export { 
  ExplorationStrategy, 
  ExplorationStrategyType, 
  ExplorationAction, 
  createDemoStrategy,
  aiSelectNextAction 
} from './exploration-strategy.js';

export default SiteExplorer;
