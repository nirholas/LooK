/**
 * Unit tests for src/v2/content-analyzer.js
 * 
 * Tests content analysis, section scoring, product story extraction,
 * content deduplication, demo moment detection, and narrative generation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContentAnalyzer,
  PageContent,
  ContentSection,
  ProductStory,
  ContentDeduplicator,
  generateDemoNarrative
} from '../../src/v2/content-analyzer.js';

// ============================================================================
// ContentSection Tests
// ============================================================================

describe('ContentSection', () => {
  describe('constructor', () => {
    it('should create section with required properties', () => {
      const section = new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 }
      });

      expect(section.type).toBe('hero');
      expect(section.bounds.x).toBe(0);
      expect(section.demoScore).toBe(50); // default
    });

    it('should apply all optional properties', () => {
      const section = new ContentSection({
        type: 'feature',
        bounds: { x: 10, y: 20, width: 80, height: 40 },
        heading: 'Amazing Feature',
        description: 'This feature is great',
        demoScore: 85,
        interactives: ['button', 'input'],
        keywords: ['feature', 'amazing'],
        skipReason: null
      });

      expect(section.type).toBe('feature');
      expect(section.heading).toBe('Amazing Feature');
      expect(section.demoScore).toBe(85);
      expect(section.interactives).toHaveLength(2);
      expect(section.keywords).toContain('amazing');
    });
  });

  describe('getPixelBounds', () => {
    it('should convert percentage bounds to pixels', () => {
      const section = new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 50 }
      });

      const pixels = section.getPixelBounds(1920, 1080);

      expect(pixels.x).toBe(0);
      expect(pixels.y).toBe(0);
      expect(pixels.width).toBe(1920);
      expect(pixels.height).toBe(540);
    });

    it('should handle non-zero offsets', () => {
      const section = new ContentSection({
        type: 'sidebar',
        bounds: { x: 75, y: 10, width: 25, height: 80 }
      });

      const pixels = section.getPixelBounds(1000, 800);

      expect(pixels.x).toBe(750);
      expect(pixels.y).toBe(80);
      expect(pixels.width).toBe(250);
      expect(pixels.height).toBe(640);
    });
  });

  describe('getCenter', () => {
    it('should return center coordinates', () => {
      const section = new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 50 }
      });

      const center = section.getCenter(1920, 1080);

      expect(center.x).toBe(960);
      expect(center.y).toBe(270);
    });

    it('should handle offset sections', () => {
      const section = new ContentSection({
        type: 'feature',
        bounds: { x: 20, y: 30, width: 60, height: 40 }
      });

      const center = section.getCenter(100, 100);

      expect(center.x).toBe(50); // 20 + 60/2
      expect(center.y).toBe(50); // 30 + 40/2
    });
  });

  describe('shouldSkip', () => {
    it('should return false when no skip reason', () => {
      const section = new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        skipReason: null
      });

      expect(section.shouldSkip()).toBe(false);
    });

    it('should return true when skip reason is set', () => {
      const section = new ContentSection({
        type: 'cookie-banner',
        bounds: { x: 0, y: 90, width: 100, height: 10 },
        skipReason: 'Cookie consent banner'
      });

      expect(section.shouldSkip()).toBe(true);
    });
  });
});

// ============================================================================
// ProductStory Tests
// ============================================================================

describe('ProductStory', () => {
  describe('constructor', () => {
    it('should create story with required properties', () => {
      const story = new ProductStory({
        productName: 'Amazing App',
        tagline: 'The best app ever'
      });

      expect(story.productName).toBe('Amazing App');
      expect(story.tagline).toBe('The best app ever');
      expect(story.valueProps).toEqual([]); // default
    });

    it('should apply all optional properties', () => {
      const story = new ProductStory({
        productName: 'SaaS Tool',
        tagline: 'Work smarter',
        valueProps: ['Fast', 'Secure', 'Reliable'],
        targetAudience: 'Developers',
        callToAction: 'Start Free Trial',
        brandTone: 'Professional'
      });

      expect(story.valueProps).toHaveLength(3);
      expect(story.targetAudience).toBe('Developers');
      expect(story.callToAction).toBe('Start Free Trial');
      expect(story.brandTone).toBe('Professional');
    });
  });

  describe('generateNarrativeHook', () => {
    it('should generate a narrative hook from story', () => {
      const story = new ProductStory({
        productName: 'DataFlow',
        tagline: 'Automate your data pipelines',
        valueProps: ['No-code automation', 'Real-time sync']
      });

      const hook = story.generateNarrativeHook();

      expect(hook).toContain('DataFlow');
      expect(typeof hook).toBe('string');
      expect(hook.length).toBeGreaterThan(10);
    });

    it('should include value props in hook', () => {
      const story = new ProductStory({
        productName: 'SecureVault',
        tagline: 'Your data, protected',
        valueProps: ['End-to-end encryption']
      });

      const hook = story.generateNarrativeHook();

      expect(hook).toBeDefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize story to JSON', () => {
      const story = new ProductStory({
        productName: 'TestApp',
        tagline: 'For testing',
        valueProps: ['Easy', 'Fast'],
        targetAudience: 'Testers'
      });

      const json = story.toJSON();

      expect(json.productName).toBe('TestApp');
      expect(json.valueProps).toEqual(['Easy', 'Fast']);
      expect(json.targetAudience).toBe('Testers');
    });
  });
});

// ============================================================================
// PageContent Tests
// ============================================================================

describe('PageContent', () => {
  let pageContent;

  beforeEach(() => {
    pageContent = new PageContent({
      url: 'https://example.com',
      title: 'Example Page'
    });
  });

  describe('constructor', () => {
    it('should create page content with required properties', () => {
      expect(pageContent.url).toBe('https://example.com');
      expect(pageContent.title).toBe('Example Page');
      expect(pageContent.sections).toEqual([]);
      expect(pageContent.productStory).toBeNull();
    });
  });

  describe('addSection', () => {
    it('should add a section', () => {
      const section = new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 }
      });

      pageContent.addSection(section);

      expect(pageContent.sections).toHaveLength(1);
      expect(pageContent.sections[0].type).toBe('hero');
    });
  });

  describe('getSectionsByType', () => {
    it('should filter sections by type', () => {
      pageContent.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 }
      }));
      pageContent.addSection(new ContentSection({
        type: 'feature',
        bounds: { x: 0, y: 30, width: 100, height: 25 }
      }));
      pageContent.addSection(new ContentSection({
        type: 'feature',
        bounds: { x: 0, y: 55, width: 100, height: 25 }
      }));

      const features = pageContent.getSectionsByType('feature');

      expect(features).toHaveLength(2);
    });
  });

  describe('getTopSections', () => {
    it('should return sections sorted by demo score', () => {
      pageContent.addSection(new ContentSection({
        type: 'footer',
        bounds: { x: 0, y: 90, width: 100, height: 10 },
        demoScore: 20
      }));
      pageContent.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        demoScore: 95
      }));
      pageContent.addSection(new ContentSection({
        type: 'feature',
        bounds: { x: 0, y: 30, width: 100, height: 30 },
        demoScore: 75
      }));

      const top = pageContent.getTopSections(2);

      expect(top).toHaveLength(2);
      expect(top[0].demoScore).toBe(95);
      expect(top[1].demoScore).toBe(75);
    });
  });

  describe('getDemoMoments', () => {
    beforeEach(() => {
      pageContent.demoMoments = [
        { type: 'animation', priority: 'high' },
        { type: 'interaction', priority: 'medium' },
        { type: 'reveal', priority: 'low' }
      ];
    });

    it('should return all demo moments', () => {
      const moments = pageContent.getDemoMoments();
      expect(moments).toHaveLength(3);
    });

    it('should filter by priority', () => {
      const highPriority = pageContent.getDemoMoments('high');
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].type).toBe('animation');
    });
  });

  describe('getContentFingerprint', () => {
    it('should generate consistent fingerprint', () => {
      pageContent.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome'
      }));

      const fingerprint1 = pageContent.getContentFingerprint();
      const fingerprint2 = pageContent.getContentFingerprint();

      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should generate different fingerprints for different content', () => {
      const page1 = new PageContent({ url: 'https://a.com', title: 'A' });
      page1.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome A'
      }));

      const page2 = new PageContent({ url: 'https://b.com', title: 'B' });
      page2.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome B'
      }));

      expect(page1.getContentFingerprint()).not.toBe(page2.getContentFingerprint());
    });
  });
});

// ============================================================================
// ContentAnalyzer Tests
// ============================================================================

describe('ContentAnalyzer', () => {
  let analyzer;
  let mockAI;

  beforeEach(() => {
    mockAI = {
      deepAnalyzeContent: vi.fn().mockResolvedValue({
        sections: [
          {
            type: 'hero',
            bounds: { x: 0, y: 0, width: 100, height: 35 },
            heading: 'Build Faster',
            demoScore: 90
          }
        ],
        productStory: {
          productName: 'FastBuild',
          tagline: 'Build faster, deploy smarter'
        },
        demoMoments: [
          { type: 'hover', location: { x: 50, y: 20 } }
        ],
        skipRegions: []
      })
    };

    analyzer = new ContentAnalyzer(mockAI);
  });

  describe('analyzeStructure', () => {
    it('should analyze page structure from screenshot', async () => {
      const screenshot = Buffer.from('fake-screenshot');
      const result = await analyzer.analyzeStructure(screenshot, 'https://example.com');

      expect(mockAI.deepAnalyzeContent).toHaveBeenCalled();
      expect(result).toBeInstanceOf(PageContent);
      expect(result.sections.length).toBeGreaterThan(0);
    });

    it('should extract product story', async () => {
      const screenshot = Buffer.from('fake-screenshot');
      const result = await analyzer.analyzeStructure(screenshot, 'https://example.com');

      expect(result.productStory).toBeInstanceOf(ProductStory);
      expect(result.productStory.productName).toBe('FastBuild');
    });
  });

  describe('extractProductStory', () => {
    it('should create ProductStory from analysis data', () => {
      const storyData = {
        productName: 'CloudSync',
        tagline: 'Sync everywhere',
        valueProps: ['Fast', 'Secure']
      };

      const story = analyzer.extractProductStory(storyData);

      expect(story).toBeInstanceOf(ProductStory);
      expect(story.productName).toBe('CloudSync');
    });
  });

  describe('findDemoMoments', () => {
    it('should identify demo-worthy moments', async () => {
      const screenshot = Buffer.from('fake-screenshot');
      const result = await analyzer.analyzeStructure(screenshot, 'https://example.com');

      expect(result.demoMoments).toBeDefined();
      expect(Array.isArray(result.demoMoments)).toBe(true);
    });
  });

  describe('scoreContentSections', () => {
    it('should assign demo scores to sections', () => {
      const sections = [
        new ContentSection({
          type: 'hero',
          bounds: { x: 0, y: 0, width: 100, height: 30 },
          heading: 'Welcome'
        }),
        new ContentSection({
          type: 'footer',
          bounds: { x: 0, y: 90, width: 100, height: 10 }
        })
      ];

      const scored = analyzer.scoreContentSections(sections);

      // Hero should score higher than footer
      const hero = scored.find(s => s.type === 'hero');
      const footer = scored.find(s => s.type === 'footer');

      expect(hero.demoScore).toBeGreaterThan(footer.demoScore);
    });
  });
});

// ============================================================================
// ContentDeduplicator Tests
// ============================================================================

describe('ContentDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new ContentDeduplicator();
  });

  describe('isDuplicate', () => {
    it('should identify duplicate content', () => {
      const content1 = new PageContent({ url: 'https://a.com', title: 'Home' });
      content1.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome to our site',
        description: 'We offer great products'
      }));

      const content2 = new PageContent({ url: 'https://a.com/about', title: 'About' });
      content2.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome to our site',
        description: 'We offer great products'
      }));

      // First is not duplicate
      expect(deduplicator.isDuplicate(content1)).toBe(false);
      
      // Add first to seen
      deduplicator.markAsSeen(content1);
      
      // Second is duplicate
      expect(deduplicator.isDuplicate(content2)).toBe(true);
    });

    it('should not flag unique content as duplicate', () => {
      const content1 = new PageContent({ url: 'https://a.com', title: 'Home' });
      content1.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome Home'
      }));

      const content2 = new PageContent({ url: 'https://a.com/pricing', title: 'Pricing' });
      content2.addSection(new ContentSection({
        type: 'pricing',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        heading: 'Our Pricing Plans'
      }));

      deduplicator.markAsSeen(content1);

      expect(deduplicator.isDuplicate(content2)).toBe(false);
    });
  });

  describe('getSimilarity', () => {
    it('should return high similarity for identical content', () => {
      const content1 = new PageContent({ url: 'https://a.com', title: 'Home' });
      content1.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome',
        keywords: ['welcome', 'home', 'start']
      }));

      const content2 = new PageContent({ url: 'https://a.com/copy', title: 'Home Copy' });
      content2.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome',
        keywords: ['welcome', 'home', 'start']
      }));

      const similarity = deduplicator.getSimilarity(content1, content2);

      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return low similarity for different content', () => {
      const content1 = new PageContent({ url: 'https://a.com', title: 'Home' });
      content1.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome',
        keywords: ['home', 'welcome']
      }));

      const content2 = new PageContent({ url: 'https://a.com/docs', title: 'Documentation' });
      content2.addSection(new ContentSection({
        type: 'documentation',
        bounds: { x: 0, y: 0, width: 100, height: 80 },
        heading: 'API Reference',
        keywords: ['api', 'documentation', 'reference']
      }));

      const similarity = deduplicator.getSimilarity(content1, content2);

      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('getUniqueContent', () => {
    it('should filter out duplicate sections from new content', () => {
      const existing = new PageContent({ url: 'https://a.com', title: 'Home' });
      existing.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Welcome'
      }));
      existing.addSection(new ContentSection({
        type: 'nav',
        bounds: { x: 0, y: 0, width: 100, height: 5 },
        heading: 'Navigation'
      }));

      const newPage = new PageContent({ url: 'https://a.com/about', title: 'About' });
      newPage.addSection(new ContentSection({
        type: 'nav',
        bounds: { x: 0, y: 0, width: 100, height: 5 },
        heading: 'Navigation'
      }));
      newPage.addSection(new ContentSection({
        type: 'about',
        bounds: { x: 0, y: 10, width: 100, height: 50 },
        heading: 'About Us'
      }));

      deduplicator.markAsSeen(existing);
      const unique = deduplicator.getUniqueContent(newPage);

      // Should only have the 'about' section, nav is duplicate
      expect(unique.sections).toHaveLength(1);
      expect(unique.sections[0].type).toBe('about');
    });
  });

  describe('reset', () => {
    it('should clear seen content', () => {
      const content = new PageContent({ url: 'https://a.com', title: 'Home' });
      content.addSection(new ContentSection({
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 30 },
        heading: 'Test'
      }));

      deduplicator.markAsSeen(content);
      expect(deduplicator.isDuplicate(content)).toBe(true);

      deduplicator.reset();
      expect(deduplicator.isDuplicate(content)).toBe(false);
    });
  });
});

// ============================================================================
// generateDemoNarrative Tests
// ============================================================================

describe('generateDemoNarrative', () => {
  it('should generate narrative from multiple page contents', () => {
    const pages = [
      createMockPageContent('Home', [
        { type: 'hero', heading: 'Welcome to ProductX' }
      ]),
      createMockPageContent('Features', [
        { type: 'feature', heading: 'Feature 1' },
        { type: 'feature', heading: 'Feature 2' }
      ]),
      createMockPageContent('Pricing', [
        { type: 'pricing', heading: 'Simple Pricing' }
      ])
    ];

    const narrative = generateDemoNarrative(pages);

    expect(narrative).toBeDefined();
    expect(typeof narrative).toBe('object');
    expect(narrative.segments).toBeDefined();
    expect(Array.isArray(narrative.segments)).toBe(true);
  });

  it('should order narrative segments logically', () => {
    const pages = [
      createMockPageContent('Pricing', [
        { type: 'pricing', heading: 'Pricing', demoScore: 70 }
      ]),
      createMockPageContent('Home', [
        { type: 'hero', heading: 'Welcome', demoScore: 95 }
      ])
    ];

    const narrative = generateDemoNarrative(pages);

    // Hero/home should come first
    expect(narrative.segments[0].pageTitle).toBe('Home');
  });

  it('should deduplicate across pages', () => {
    const pages = [
      createMockPageContent('Home', [
        { type: 'nav', heading: 'Navigation' },
        { type: 'hero', heading: 'Welcome' }
      ]),
      createMockPageContent('About', [
        { type: 'nav', heading: 'Navigation' },
        { type: 'about', heading: 'About Us' }
      ])
    ];

    const narrative = generateDemoNarrative(pages, { deduplicate: true });

    // Nav should only appear once across all segments
    const navCount = narrative.segments.reduce((count, seg) => {
      return count + seg.sections.filter(s => s.type === 'nav').length;
    }, 0);

    expect(navCount).toBeLessThanOrEqual(1);
  });

  it('should include product story in narrative', () => {
    const page = createMockPageContent('Home', [
      { type: 'hero', heading: 'Welcome' }
    ]);
    page.productStory = new ProductStory({
      productName: 'TestProduct',
      tagline: 'Testing made easy'
    });

    const narrative = generateDemoNarrative([page]);

    expect(narrative.productStory).toBeDefined();
    expect(narrative.productStory.productName).toBe('TestProduct');
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock PageContent for testing
 */
function createMockPageContent(title, sectionConfigs) {
  const page = new PageContent({
    url: `https://example.com/${title.toLowerCase()}`,
    title
  });

  for (const config of sectionConfigs) {
    page.addSection(new ContentSection({
      type: config.type,
      bounds: { x: 0, y: 0, width: 100, height: 30 },
      heading: config.heading,
      demoScore: config.demoScore || 50
    }));
  }

  return page;
}
