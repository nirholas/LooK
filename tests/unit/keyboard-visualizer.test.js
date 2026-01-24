/**
 * Tests for keyboard-visualizer.js - On-screen keyboard shortcut display
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  KeyboardVisualizer,
  KeyStyle,
  KeyPresets,
  KeyboardLayouts
} from '../../src/v2/keyboard-visualizer.js';

describe('KeyStyle', () => {
  it('should define all key styles', () => {
    expect(KeyStyle.MAC).toBe('mac');
    expect(KeyStyle.WINDOWS).toBe('windows');
    expect(KeyStyle.MINIMAL).toBe('minimal');
    expect(KeyStyle.DARK).toBe('dark');
  });
});

describe('KeyPresets', () => {
  it('should define presets for each style', () => {
    expect(KeyPresets[KeyStyle.MAC]).toBeDefined();
    expect(KeyPresets[KeyStyle.WINDOWS]).toBeDefined();
    expect(KeyPresets[KeyStyle.MINIMAL]).toBeDefined();
    expect(KeyPresets[KeyStyle.DARK]).toBeDefined();
  });

  it('should have required styling properties', () => {
    Object.values(KeyPresets).forEach(preset => {
      expect(preset).toHaveProperty('backgroundColor');
      expect(preset).toHaveProperty('textColor');
      expect(preset).toHaveProperty('borderRadius');
      expect(preset).toHaveProperty('fontSize');
    });
  });

  it('should have Mac-specific symbol mappings', () => {
    const mac = KeyPresets[KeyStyle.MAC];
    expect(mac.symbols).toBeDefined();
    expect(mac.symbols.cmd).toBe('⌘');
    expect(mac.symbols.alt).toBe('⌥');
    expect(mac.symbols.ctrl).toBe('⌃');
    expect(mac.symbols.shift).toBe('⇧');
  });
});

describe('KeyboardLayouts', () => {
  it('should define layouts for mac and windows', () => {
    expect(KeyboardLayouts.mac).toBeDefined();
    expect(KeyboardLayouts.windows).toBeDefined();
  });

  it('should have modifier key mappings', () => {
    expect(KeyboardLayouts.mac.modifiers).toContain('cmd');
    expect(KeyboardLayouts.mac.modifiers).toContain('alt');
    expect(KeyboardLayouts.mac.modifiers).toContain('shift');
    expect(KeyboardLayouts.mac.modifiers).toContain('ctrl');

    expect(KeyboardLayouts.windows.modifiers).toContain('ctrl');
    expect(KeyboardLayouts.windows.modifiers).toContain('alt');
    expect(KeyboardLayouts.windows.modifiers).toContain('shift');
    expect(KeyboardLayouts.windows.modifiers).toContain('win');
  });
});

describe('KeyboardVisualizer', () => {
  let visualizer;

  beforeEach(() => {
    visualizer = new KeyboardVisualizer({
      style: KeyStyle.MAC,
      position: 'bottom-center',
      size: 'medium'
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const v = new KeyboardVisualizer();
      expect(v.options.style).toBe(KeyStyle.MAC);
      expect(v.options.position).toBe('bottom-center');
      expect(v.options.size).toBe('medium');
    });

    it('should accept custom options', () => {
      const v = new KeyboardVisualizer({
        style: KeyStyle.WINDOWS,
        position: 'top-right',
        size: 'large'
      });
      expect(v.options.style).toBe(KeyStyle.WINDOWS);
      expect(v.options.position).toBe('top-right');
      expect(v.options.size).toBe('large');
    });
  });

  describe('parseShortcut', () => {
    it('should parse simple key', () => {
      const keys = visualizer.parseShortcut('a');
      expect(keys).toEqual(['a']);
    });

    it('should parse modifier + key', () => {
      const keys = visualizer.parseShortcut('cmd+c');
      expect(keys).toEqual(['cmd', 'c']);
    });

    it('should parse multiple modifiers', () => {
      const keys = visualizer.parseShortcut('cmd+shift+s');
      expect(keys).toEqual(['cmd', 'shift', 's']);
    });

    it('should handle case-insensitive input', () => {
      const keys = visualizer.parseShortcut('CMD+C');
      expect(keys).toEqual(['cmd', 'c']);
    });
  });

  describe('formatKey', () => {
    it('should format key with Mac symbols', () => {
      const formatted = visualizer.formatKey('cmd');
      expect(formatted).toBe('⌘');
    });

    it('should format shift key', () => {
      const formatted = visualizer.formatKey('shift');
      expect(formatted).toBe('⇧');
    });

    it('should format alt/option key', () => {
      const formatted = visualizer.formatKey('alt');
      expect(formatted).toBe('⌥');
    });

    it('should capitalize regular keys', () => {
      const formatted = visualizer.formatKey('s');
      expect(formatted).toBe('S');
    });
  });

  describe('renderSVG', () => {
    it('should generate SVG for shortcut', () => {
      const svg = visualizer.renderSVG('cmd+s');

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('⌘');
      expect(svg).toContain('S');
    });

    it('should apply correct styling', () => {
      const svg = visualizer.renderSVG('cmd+c');

      expect(svg).toContain('fill');
      expect(svg).toContain('rx'); // border radius
    });

    it('should render multiple keys', () => {
      const svg = visualizer.renderSVG('cmd+shift+p');

      expect(svg).toContain('⌘');
      expect(svg).toContain('⇧');
      expect(svg).toContain('P');
    });
  });

  describe('getPosition', () => {
    it('should calculate position for bottom-center', () => {
      const pos = visualizer.getPosition(1920, 1080);

      expect(pos.x).toBeCloseTo(960, -1);
      expect(pos.y).toBeGreaterThan(900);
    });

    it('should calculate position for top-right', () => {
      const v = new KeyboardVisualizer({ position: 'top-right' });
      const pos = v.getPosition(1920, 1080);

      expect(pos.x).toBeGreaterThan(1400);
      expect(pos.y).toBeLessThan(200);
    });

    it('should calculate position for bottom-right', () => {
      const v = new KeyboardVisualizer({ position: 'bottom-right' });
      const pos = v.getPosition(1920, 1080);

      expect(pos.x).toBeGreaterThan(1400);
      expect(pos.y).toBeGreaterThan(900);
    });
  });

  describe('getSizeMultiplier', () => {
    it('should return smaller multiplier for small size', () => {
      const v = new KeyboardVisualizer({ size: 'small' });
      expect(v.getSizeMultiplier()).toBeLessThan(1);
    });

    it('should return 1 for medium size', () => {
      expect(visualizer.getSizeMultiplier()).toBe(1);
    });

    it('should return larger multiplier for large size', () => {
      const v = new KeyboardVisualizer({ size: 'large' });
      expect(v.getSizeMultiplier()).toBeGreaterThan(1);
    });
  });

  describe('recordKeyPress', () => {
    it('should record key press with timestamp', () => {
      visualizer.recordKeyPress('cmd+s', 5000);

      const keyPresses = visualizer.getKeyPresses();
      expect(keyPresses).toHaveLength(1);
      expect(keyPresses[0].shortcut).toBe('cmd+s');
      expect(keyPresses[0].timestamp).toBe(5000);
    });

    it('should record multiple key presses', () => {
      visualizer.recordKeyPress('cmd+s', 5000);
      visualizer.recordKeyPress('cmd+c', 7000);
      visualizer.recordKeyPress('cmd+v', 8000);

      expect(visualizer.getKeyPresses()).toHaveLength(3);
    });
  });

  describe('clearKeyPresses', () => {
    it('should clear all recorded key presses', () => {
      visualizer.recordKeyPress('cmd+s', 5000);
      visualizer.recordKeyPress('cmd+c', 7000);
      visualizer.clearKeyPresses();

      expect(visualizer.getKeyPresses()).toHaveLength(0);
    });
  });
});
