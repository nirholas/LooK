import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock sharp
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockImplementation((buffer) => ({
      png: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
      metadata: vi.fn().mockResolvedValue({ width: 32, height: 32 })
    }))
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('test')),
  unlink: vi.fn().mockResolvedValue(undefined)
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      opts(null, '', '');
    } else if (cb) {
      cb(null, '', '');
    }
  })
}));

import { CursorRenderer } from '../../src/v2/cursor-renderer.js';

describe('CursorRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new CursorRenderer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(renderer.style).toBe('default');
      expect(renderer.size).toBe(32);
      expect(renderer.color).toBe('#000000');
      expect(renderer.outlineColor).toBe('#FFFFFF');
      expect(renderer.outlineWidth).toBe(2);
      expect(renderer.shadowBlur).toBe(6);
      expect(renderer.shadowOpacity).toBe(0.4);
      expect(renderer.clickScale).toBe(0.85);
    });

    it('should accept custom options', () => {
      const customRenderer = new CursorRenderer({
        style: 'pointer',
        size: 48,
        color: '#FF0000',
        outlineColor: '#0000FF',
        outlineWidth: 3,
        shadowBlur: 10,
        shadowOpacity: 0.6,
        clickScale: 0.9
      });

      expect(customRenderer.style).toBe('pointer');
      expect(customRenderer.size).toBe(48);
      expect(customRenderer.color).toBe('#FF0000');
      expect(customRenderer.outlineColor).toBe('#0000FF');
      expect(customRenderer.outlineWidth).toBe(3);
      expect(customRenderer.shadowBlur).toBe(10);
      expect(customRenderer.shadowOpacity).toBe(0.6);
      expect(customRenderer.clickScale).toBe(0.9);
    });

    it('should initialize enhanced options', () => {
      const glowRenderer = new CursorRenderer({
        glow: true,
        glowColor: '#00FF00',
        glowIntensity: 0.8,
        trail: true,
        trailLength: 10,
        trailOpacity: 0.5
      });

      expect(glowRenderer.glow).toBe(true);
      expect(glowRenderer.glowColor).toBe('#00FF00');
      expect(glowRenderer.glowIntensity).toBe(0.8);
      expect(glowRenderer.trail).toBe(true);
      expect(glowRenderer.trailLength).toBe(10);
      expect(glowRenderer.trailOpacity).toBe(0.5);
    });
  });

  describe('getCursorSVG', () => {
    it('should return valid SVG string for default style', () => {
      const svg = renderer.getCursorSVG(false);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('</svg>');
    });

    it('should include filter definitions', () => {
      const svg = renderer.getCursorSVG(false);
      
      expect(svg).toContain('<defs>');
      expect(svg).toContain('<filter id="shadow"');
      expect(svg).toContain('</defs>');
    });

    it('should apply click scale when isClick is true', () => {
      const normalSvg = renderer.getCursorSVG(false);
      const clickSvg = renderer.getCursorSVG(true);
      
      // Click SVG should have different dimensions due to scale
      expect(normalSvg).not.toBe(clickSvg);
    });

    it('should include glow filter when glow is enabled', () => {
      const glowRenderer = new CursorRenderer({ glow: true });
      const svg = glowRenderer.getCursorSVG(false);
      
      expect(svg).toContain('filter id="glow"');
    });
  });

  describe('getArrowSVG', () => {
    it('should generate arrow cursor path', () => {
      const svg = renderer.getArrowSVG(50, 32, 8, '<defs></defs>');
      
      expect(svg).toContain('<path');
      expect(svg).toContain('fill="#000000"');
      expect(svg).toContain('stroke="#FFFFFF"');
    });

    it('should apply correct transformations', () => {
      const svg = renderer.getArrowSVG(50, 32, 8, '<defs></defs>');
      
      expect(svg).toContain('transform="translate(8, 8)"');
    });
  });

  describe('getPointerSVG', () => {
    it('should generate pointer/hand cursor', () => {
      const pointerRenderer = new CursorRenderer({ style: 'pointer' });
      const svg = pointerRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<path');
      expect(svg).toContain('</svg>');
    });
  });

  describe('getDotSVG', () => {
    it('should generate circular dot cursor', () => {
      const dotRenderer = new CursorRenderer({ style: 'dot' });
      const svg = dotRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<circle');
      expect(svg).toContain('fill="#000000"');
    });
  });

  describe('getCircleSVG', () => {
    it('should generate hollow circle cursor', () => {
      const circleRenderer = new CursorRenderer({ style: 'circle' });
      const svg = circleRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<circle');
      expect(svg).toContain('fill="none"');
    });
  });

  describe('getCrosshairSVG', () => {
    it('should generate crosshair with lines', () => {
      const crosshairRenderer = new CursorRenderer({ style: 'crosshair' });
      const svg = crosshairRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<line');
      // Should have 4 lines (top, bottom, left, right)
      expect((svg.match(/<line/g) || []).length).toBe(4);
    });

    it('should include center dot', () => {
      const crosshairRenderer = new CursorRenderer({ style: 'crosshair' });
      const svg = crosshairRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<circle');
    });
  });

  describe('getSpotlightSVG', () => {
    it('should generate spotlight with gradient', () => {
      const spotlightRenderer = new CursorRenderer({ style: 'spotlight' });
      const svg = spotlightRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<radialGradient');
      expect(svg).toContain('url(#spotGradient)');
    });
  });

  describe('getModernArrowSVG', () => {
    it('should generate modern arrow with gradient', () => {
      const modernRenderer = new CursorRenderer({ style: 'arrow-modern' });
      const svg = modernRenderer.getCursorSVG(false);
      
      expect(svg).toContain('<linearGradient');
      expect(svg).toContain('url(#arrowGradient)');
    });
  });

  describe('adjustColor', () => {
    it('should brighten color with positive amount', () => {
      const result = renderer.adjustColor('#808080', 32);
      
      // Should be brighter
      expect(result).not.toBe('#808080');
    });

    it('should darken color with negative amount', () => {
      const result = renderer.adjustColor('#808080', -32);
      
      // Should be darker
      expect(result).not.toBe('#808080');
    });

    it('should clamp to valid RGB range', () => {
      const result = renderer.adjustColor('#FFFFFF', 100);
      
      // Should still be valid hex
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should handle black color', () => {
      const result = renderer.adjustColor('#000000', -50);
      
      // Should be clamped to black
      expect(result).toBe('#000000');
    });
  });

  describe('generateCursorImage', () => {
    it('should create output directory', async () => {
      const mkdir = (await import('fs/promises')).mkdir;
      
      await renderer.generateCursorImage('/tmp/test-cursors', false);
      
      expect(mkdir).toHaveBeenCalledWith('/tmp/test-cursors', { recursive: true });
    });

    it('should generate normal cursor file', async () => {
      const result = await renderer.generateCursorImage('/tmp/test-cursors', false);
      
      expect(result).toBe('/tmp/test-cursors/cursor-default.png');
    });

    it('should generate click cursor file', async () => {
      const result = await renderer.generateCursorImage('/tmp/test-cursors', true);
      
      expect(result).toBe('/tmp/test-cursors/cursor-default-click.png');
    });

    it('should use style name in filename', async () => {
      const dotRenderer = new CursorRenderer({ style: 'dot' });
      const result = await dotRenderer.generateCursorImage('/tmp/test-cursors', false);
      
      expect(result).toBe('/tmp/test-cursors/cursor-dot.png');
    });
  });

  describe('style switching', () => {
    const styles = ['default', 'dot', 'circle', 'pointer', 'crosshair', 'spotlight', 'arrow-modern'];
    
    styles.forEach(style => {
      it(`should generate valid SVG for ${style} style`, () => {
        const styledRenderer = new CursorRenderer({ style });
        const svg = styledRenderer.getCursorSVG(false);
        
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
      });
    });
  });

  describe('color customization', () => {
    it('should use custom color in SVG', () => {
      const customRenderer = new CursorRenderer({ color: '#FF5500' });
      const svg = customRenderer.getCursorSVG(false);
      
      expect(svg).toContain('#FF5500');
    });

    it('should use custom outline color in SVG', () => {
      const customRenderer = new CursorRenderer({ outlineColor: '#00FF00' });
      const svg = customRenderer.getCursorSVG(false);
      
      expect(svg).toContain('#00FF00');
    });
  });
});
