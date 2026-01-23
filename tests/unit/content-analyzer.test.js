import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ContentSection,
  ProductStory,
  PageContent,
  ContentDeduplicator,
  ContentAnalyzer
} from '../../src/v2/content-analyzer.js';

describe('ContentSection', () => {
  describe('constructor', () => {
    it('should create section with required properties', () => {
      const section = new ContentSection({
        id: 'section-1',
        type: 'hero',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
        headline: 'Welcome to our product',
        importance: 'high',
        demoScore: 80
      });

      expect(section.id).toBe('section-1');
      expect(section.type).toBe('hero');
      expect(section.bounds).toEqual({ x: 0, y: 0, width: 100, height: 50 });
      expect(section.headline).toBe('Welcome to our product');
      expect(section.importance).toBe('high');
      expect(section.demoScore).toBe(80);
    });

    it('should provide default values for optional properties', () => {
      const section = new ContentSection({
        id: 'section-2',
        type: 'content'
      });

      expect(section.id).toBe('section-2');
      expect(section.type).toBe('content');
      expect(section.bounds).toEqual({ x: 0, y: 0, width: 100, height: 20 });
      expect(section.headline).toBe('');
      expect(section.importance).toBe('medium');
      expect(section.demoScore).toBe(50);
      expect(section.visualElements).toEqual([]);
      expect(section.interactives).toEqual([]);
    });
  });

  describe('shouldInclude', () => {
    it('should include sections with high demoScore', () => {
      const section = new ContentSection({
        id: 'section-1',
        type: 'features',
        demoScore: 80
      });

      expect(section.shouldInclude()).toBe(true);
    });

    it('should include sections with medium importance', () => {
      const section = new ContentSection({
        id: 'section-2',
        type: 'content',
        demoScore: 50,
        importance: 'high'
      });

      expect(section.shouldInclude()).toBe(true);
    });

    it('should exclude sections with low scores', () => {
      const section = new ContentSection({
        id: 'section-3',
        type: 'footer',
        demoScore: 10,
        importance: 'low'
      });

      expect(section.shouldInclude()).toBe(false);
    });
  });

});

describe('ProductStory', () => {
  describe('constructor', () => {
    it('should create story with all fields', () => {
      const story = new ProductStory({
        problem: 'Users struggle with complex workflows',
        solution: 'Our intuitive interface simplifies everything',
        features: ['Drag and drop', 'Real-time sync', 'AI assistance'],
        proof: ['10,000 happy users', '5-star ratings'],
        cta: 'Start free trial',
        keyBenefit: 'Save 10 hours per week'
      });

      expect(story.problem).toBe('Users struggle with complex workflows');
      expect(story.solution).toBe('Our intuitive interface simplifies everything');
      expect(story.features).toEqual(['Drag and drop', 'Real-time sync', 'AI assistance']);
      expect(story.proof).toEqual(['10,000 happy users', '5-star ratings']);
      expect(story.cta).toBe('Start free trial');
      expect(story.keyBenefit).toBe('Save 10 hours per week');
    });

    it('should provide empty defaults', () => {
      const story = new ProductStory({});

      expect(story.problem).toBe('');
      expect(story.solution).toBe('');
      expect(story.features).toEqual([]);
      expect(story.proof).toEqual([]);
      expect(story.cta).toBe('');
      expect(story.keyBenefit).toBe('');
    });
  });

  describe('isComplete', () => {
    it('should return true when all required fields are present', () => {
      const story = new ProductStory({
        problem: 'Problem here',
        solution: 'Solution here',
        features: ['Feature 1', 'Feature 2'],
        keyBenefit: 'Key benefit here'
      });

      expect(story.isComplete()).toBe(true);
    });

    it('should return false when missing fields', () => {
      const story = new ProductStory({
        problem: 'Problem here'
      });

      expect(story.isComplete()).toBe(false);
    });
  });

  describe('toNarrative', () => {
    it('should generate narrative hook from story', () => {
      const story = new ProductStory({
        problem: 'Users struggle with time management',
        solution: 'Our AI scheduler automates your day',
        keyBenefit: 'Get back 2 hours daily',
        features: ['Smart scheduling', 'Calendar sync'],
        proof: ['Used by Fortune 500 companies']
      });

      const narrative = story.toNarrative();

      expect(typeof narrative).toBe('string');
      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should return empty string for incomplete story', () => {
      const story = new ProductStory({});
      
      expect(story.toNarrative()).toBe('');
    });
  });
});

describe('PageContent', () => {
  describe('constructor', () => {
    it('should initialize with empty collections', () => {
      const content = new PageContent();

      expect(content.sections).toEqual([]);
      expect(content.productStory).toBeDefined();
      expect(content.usps).toEqual([]);
      expect(content.demoMoments).toEqual([]);
      expect(content.skipRegions).toEqual([]);
      expect(content.narrativeFlow).toEqual([]);
      expect(content.suggestedNarrative).toBe('');
      expect(content.transitionHint).toBeNull();
    });
  });

  describe('getRankedSections', () => {
    it('should return sections sorted by demoScore descending', () => {
      const content = new PageContent();
      content.sections = [
        new ContentSection({ id: '1', type: 'content', demoScore: 50 }),
        new ContentSection({ id: '2', type: 'hero', demoScore: 90 }),
        new ContentSection({ id: '3', type: 'features', demoScore: 75 })
      ];

      const ranked = content.getRankedSections();

      expect(ranked[0].id).toBe('2'); // demoScore 90
      expect(ranked[1].id).toBe('3'); // demoScore 75
      expect(ranked[2].id).toBe('1'); // demoScore 50
    });
  });

  describe('getSectionsByType', () => {
    it('should filter sections by type', () => {
      const content = new PageContent();
      content.sections = [
        new ContentSection({ id: '1', type: 'hero' }),
        new ContentSection({ id: '2', type: 'features' }),
        new ContentSection({ id: '3', type: 'features' }),
        new ContentSection({ id: '4', type: 'cta' })
      ];

      const features = content.getSectionsByType('features');

      expect(features).toHaveLength(2);
      expect(features[0].id).toBe('2');
      expect(features[1].id).toBe('3');
    });

    it('should return empty array for non-existent type', () => {
      const content = new PageContent();
      content.sections = [
        new ContentSection({ id: '1', type: 'hero' })
      ];

      const pricing = content.getSectionsByType('pricing');

      expect(pricing).toHaveLength(0);
    });
  });

  describe('getHeroSection', () => {
    it('should return the hero section', () => {
      const content = new PageContent();
      content.sections = [
        new ContentSection({ id: '1', type: 'features' }),
        new ContentSection({ id: '2', type: 'hero', headline: 'Welcome!' }),
        new ContentSection({ id: '3', type: 'cta' })
      ];

      const hero = content.getHeroSection();

      expect(hero).toBeDefined();
      expect(hero.id).toBe('2');
      expect(hero.headline).toBe('Welcome!');
    });

    it('should return null if no hero section', () => {
      const content = new PageContent();
      content.sections = [
        new ContentSection({ id: '1', type: 'features' })
      ];

      const hero = content.getHeroSection();

      expect(hero).toBeNull();
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      const original = new PageContent();
      original.sections = [
        new ContentSection({ id: '1', type: 'hero', headline: 'Test', demoScore: 85 })
      ];
      original.productStory = new ProductStory({
        problem: 'Test problem',
        solution: 'Test solution',
        keyBenefit: 'Test benefit'
      });
      original.usps = ['Fast', 'Reliable'];
      original.demoMoments = [{ time: 5, action: 'click' }];
      original.suggestedNarrative = 'Test narrative';

      const json = original.toJSON();
      const restored = PageContent.fromJSON(json);

      expect(restored.sections).toHaveLength(1);
      expect(restored.sections[0].id).toBe('1');
      expect(restored.sections[0].headline).toBe('Test');
      expect(restored.productStory.problem).toBe('Test problem');
      expect(restored.usps).toEqual(['Fast', 'Reliable']);
      expect(restored.demoMoments).toEqual([{ time: 5, action: 'click' }]);
      expect(restored.suggestedNarrative).toBe('Test narrative');
    });
  });
});

describe('ContentDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new ContentDeduplicator();
  });

  describe('markAsSeen', () => {
    it('should track new fingerprints', () => {
      const fingerprint = JSON.stringify({ structure: 'NAV>A>A', hasNav: true });
      
      deduplicator.markAsSeen(fingerprint, { url: 'https://example.com' });
      
      expect(deduplicator.seenContent.has(fingerprint)).toBe(true);
      expect(deduplicator.seenContent.get(fingerprint).count).toBe(1);
    });

    it('should increment count for existing fingerprints', () => {
      const fingerprint = JSON.stringify({ structure: 'NAV>A>A', hasNav: true });
      
      deduplicator.markAsSeen(fingerprint, { url: 'page1.com' });
      deduplicator.markAsSeen(fingerprint, { url: 'page2.com' });
      
      expect(deduplicator.seenContent.get(fingerprint).count).toBe(2);
    });
  });

  describe('isRepetitive', () => {
    it('should detect exact repeated fingerprints', () => {
      const fingerprint = JSON.stringify({ structure: 'HEADER>NAV', hasNav: true });
      
      deduplicator.markAsSeen(fingerprint);
      deduplicator.markAsSeen(fingerprint);
      
      expect(deduplicator.isRepetitive(fingerprint)).toBe(true);
    });

    it('should not flag first occurrence as repetitive', () => {
      const fingerprint = JSON.stringify({ structure: 'UNIQUE>DIV', hasNav: false });
      
      // First occurrence (count=1) should not be flagged as repetitive
      // isRepetitive only returns true when count > 1
      const isRep = deduplicator.isRepetitive(fingerprint);
      
      // Before marking as seen, there's no record
      expect(isRep).toBe(false);
    });
  });

  describe('compareFingerprints', () => {
    it('should return high similarity for identical fingerprints', () => {
      const fp = JSON.stringify({ 
        structure: 'NAV>A', 
        hasLogo: true, 
        hasNav: true, 
        hasFooter: false,
        hasSocial: false,
        linkCount: 5,
        textSample: 'home about contact'
      });
      
      const similarity = deduplicator.compareFingerprints(fp, fp);
      
      expect(similarity).toBe(1);
    });

    it('should return low similarity for different fingerprints', () => {
      const fp1 = JSON.stringify({ 
        structure: 'NAV>A', 
        hasLogo: true, 
        hasNav: true, 
        hasFooter: false,
        hasSocial: false,
        linkCount: 10,
        textSample: 'header nav menu'
      });
      
      const fp2 = JSON.stringify({ 
        structure: 'FOOTER>DIV', 
        hasLogo: false, 
        hasNav: false, 
        hasFooter: true,
        hasSocial: true,
        linkCount: 3,
        textSample: 'copyright privacy terms'
      });
      
      const similarity = deduplicator.compareFingerprints(fp1, fp2);
      
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle invalid JSON gracefully', () => {
      const similarity = deduplicator.compareFingerprints('invalid', 'also invalid');
      
      expect(similarity).toBe(0);
    });
  });

  describe('isLikelyHeader', () => {
    it('should detect header sections', () => {
      const headerSection = new ContentSection({
        id: '1',
        type: 'header',
        bounds: { x: 0, y: 0, width: 100, height: 10 }
      });

      expect(deduplicator.isLikelyHeader(headerSection)).toBe(true);
    });

    it('should detect nav sections', () => {
      const navSection = new ContentSection({
        id: '2',
        type: 'nav',
        bounds: { x: 0, y: 5, width: 100, height: 8 }
      });

      expect(deduplicator.isLikelyHeader(navSection)).toBe(true);
    });

    it('should detect sections at top of page', () => {
      const topSection = new ContentSection({
        id: '3',
        type: 'content',
        bounds: { x: 0, y: 5, width: 100, height: 10 }
      });

      expect(deduplicator.isLikelyHeader(topSection)).toBe(true);
    });

    it('should not flag mid-page sections as header', () => {
      const midSection = new ContentSection({
        id: '4',
        type: 'content',
        bounds: { x: 0, y: 40, width: 100, height: 20 }
      });

      expect(deduplicator.isLikelyHeader(midSection)).toBe(false);
    });
  });

  describe('isLikelyFooter', () => {
    it('should detect footer sections by type', () => {
      const footerSection = new ContentSection({
        id: '1',
        type: 'footer',
        bounds: { x: 0, y: 90, width: 100, height: 10 }
      });

      expect(deduplicator.isLikelyFooter(footerSection)).toBe(true);
    });
  });
});

describe('ContentAnalyzer', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      url: vi.fn().mockReturnValue('https://example.com/page'),
      viewportSize: vi.fn().mockReturnValue({ width: 1920, height: 1080 }),
      screenshot: vi.fn().mockResolvedValue('base64screenshot'),
      evaluate: vi.fn().mockResolvedValue([])
    };
  });

  describe('constructor', () => {
    it('should initialize with page and default options', () => {
      const analyzer = new ContentAnalyzer(mockPage);

      expect(analyzer.page).toBe(mockPage);
      expect(analyzer.cacheTtl).toBe(300000); // 5 minutes default
      expect(analyzer.cache).toBeDefined();
      expect(analyzer.deduplicator).toBeDefined();
    });

    it('should accept custom cache TTL', () => {
      const analyzer = new ContentAnalyzer(mockPage, { cacheTtl: 60000 });

      expect(analyzer.cacheTtl).toBe(60000);
    });
  });

  describe('getCached', () => {
    it('should return null for uncached URLs', () => {
      const analyzer = new ContentAnalyzer(mockPage);
      
      const result = analyzer.getCached('https://example.com/new');
      
      expect(result).toBeNull();
    });

    it('should return cached content if fresh', () => {
      const analyzer = new ContentAnalyzer(mockPage);
      const content = new PageContent();
      content.suggestedNarrative = 'Test narrative';
      
      analyzer.setCache('https://example.com/page', content);
      const result = analyzer.getCached('https://example.com/page');
      
      expect(result).toBeDefined();
      expect(result.suggestedNarrative).toBe('Test narrative');
    });
  });

  describe('setCache', () => {
    it('should store content with timestamp', () => {
      const analyzer = new ContentAnalyzer(mockPage);
      const content = new PageContent();
      
      analyzer.setCache('https://example.com/test', content);
      
      const cached = analyzer.cache.get('https://example.com/test');
      expect(cached).toBeDefined();
      expect(cached.content).toBe(content);
      expect(typeof cached.timestamp).toBe('number');
    });
  });
});
