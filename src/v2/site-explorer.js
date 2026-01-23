/**
 * Site Explorer - Intelligent multi-page website navigation for demos
 * 
 * Uses AI to understand site structure, prioritize pages to visit,
 * and create a coherent walkthrough of an entire product.
 */

import OpenAI from 'openai';
import { chromium } from 'playwright';
import { URL } from 'url';

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
  }

  /**
   * Initialize browser
   */
  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage({
      viewport: { width: this.width, height: this.height }
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
   */
  async explore(startUrl) {
    this.baseUrl = startUrl;
    this.baseDomain = new URL(startUrl).hostname;

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
   * Visit a page and extract information
   */
  async visitPage(url, depth) {
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

      this.pages.set(url, sitePage);

      return sitePage;
    } catch (error) {
      console.warn(`Failed to visit ${url}:`, error.message);
      return null;
    }
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
   */
  getSiteMap() {
    return {
      baseUrl: this.baseUrl,
      pages: Array.from(this.pages.values()),
      totalDiscovered: this.pages.size
    };
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

export default SiteExplorer;
