/**
 * Tests for smart-actions.js - Predefined action sequences for demos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SmartActionExecutor,
  ActionType,
  TimingPresets,
  ActionTemplates
} from '../../src/v2/smart-actions.js';

describe('ActionType', () => {
  it('should define all action types', () => {
    expect(ActionType.CLICK).toBe('click');
    expect(ActionType.HOVER).toBe('hover');
    expect(ActionType.SCROLL).toBe('scroll');
    expect(ActionType.TYPE).toBe('type');
    expect(ActionType.WAIT).toBe('wait');
    expect(ActionType.HIGHLIGHT).toBe('highlight');
  });
});

describe('TimingPresets', () => {
  it('should define timing presets', () => {
    expect(TimingPresets.FAST).toBeDefined();
    expect(TimingPresets.NORMAL).toBeDefined();
    expect(TimingPresets.SLOW).toBeDefined();
    expect(TimingPresets.DRAMATIC).toBeDefined();
  });

  it('should have increasing durations', () => {
    expect(TimingPresets.FAST.click).toBeLessThan(TimingPresets.NORMAL.click);
    expect(TimingPresets.NORMAL.click).toBeLessThan(TimingPresets.SLOW.click);
  });

  it('should include all timing properties', () => {
    const preset = TimingPresets.NORMAL;
    expect(preset).toHaveProperty('click');
    expect(preset).toHaveProperty('hover');
    expect(preset).toHaveProperty('scroll');
    expect(preset).toHaveProperty('type');
    expect(preset).toHaveProperty('wait');
  });
});

describe('ActionTemplates', () => {
  describe('featureTour', () => {
    it('should generate a feature tour action sequence', () => {
      const elements = [
        { selector: '.feature-1', name: 'Feature 1' },
        { selector: '.feature-2', name: 'Feature 2' }
      ];

      const actions = ActionTemplates.featureTour(elements);

      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThan(0);
      
      // Should include scrolling to features
      expect(actions.some(a => a.type === ActionType.SCROLL)).toBe(true);
    });
  });

  describe('formFill', () => {
    it('should generate form filling actions', () => {
      const fields = [
        { selector: '#name', value: 'John Doe' },
        { selector: '#email', value: 'john@example.com' }
      ];

      const actions = ActionTemplates.formFill(fields);

      expect(actions).toBeInstanceOf(Array);
      // Should have click and type actions for each field
      expect(actions.some(a => a.type === ActionType.CLICK)).toBe(true);
      expect(actions.some(a => a.type === ActionType.TYPE)).toBe(true);
    });

    it('should include submit button click if provided', () => {
      const fields = [{ selector: '#email', value: 'test@test.com' }];
      const actions = ActionTemplates.formFill(fields, { submitSelector: '#submit' });

      const lastAction = actions[actions.length - 1];
      expect(lastAction.selector).toBe('#submit');
    });
  });

  describe('beforeAfterComparison', () => {
    it('should generate comparison actions', () => {
      const actions = ActionTemplates.beforeAfterComparison({
        beforeSelector: '.before',
        afterSelector: '.after',
        toggleSelector: '.toggle'
      });

      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThan(2);
    });
  });

  describe('menuNavigation', () => {
    it('should generate menu navigation actions', () => {
      const items = [
        { selector: '.menu-item-1', name: 'Home' },
        { selector: '.menu-item-2', name: 'About' }
      ];

      const actions = ActionTemplates.menuNavigation(items);

      expect(actions).toBeInstanceOf(Array);
      // Should hover and click on menu items
      expect(actions.some(a => a.type === ActionType.HOVER)).toBe(true);
    });
  });
});

describe('SmartActionExecutor', () => {
  let executor;
  let mockPage;

  beforeEach(() => {
    mockPage = {
      click: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue({ boundingBox: () => ({ x: 100, y: 100, width: 50, height: 20 }) })
    };

    executor = new SmartActionExecutor({
      timing: TimingPresets.NORMAL
    });
  });

  describe('constructor', () => {
    it('should initialize with default timing', () => {
      const e = new SmartActionExecutor();
      expect(e.timing).toBeDefined();
    });

    it('should accept custom timing preset', () => {
      const e = new SmartActionExecutor({ timing: TimingPresets.FAST });
      expect(e.timing).toEqual(TimingPresets.FAST);
    });
  });

  describe('execute', () => {
    it('should execute click action', async () => {
      const action = { type: ActionType.CLICK, selector: '.button' };
      
      await executor.execute(mockPage, action);
      
      expect(mockPage.click).toHaveBeenCalledWith('.button');
    });

    it('should execute hover action', async () => {
      const action = { type: ActionType.HOVER, selector: '.menu' };
      
      await executor.execute(mockPage, action);
      
      expect(mockPage.hover).toHaveBeenCalledWith('.menu');
    });

    it('should execute type action', async () => {
      const action = { type: ActionType.TYPE, selector: '#input', text: 'Hello' };
      
      await executor.execute(mockPage, action);
      
      expect(mockPage.type).toHaveBeenCalledWith('#input', 'Hello', expect.any(Object));
    });

    it('should execute wait action', async () => {
      const action = { type: ActionType.WAIT, duration: 1000 };
      
      await executor.execute(mockPage, action);
      
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should execute scroll action', async () => {
      const action = { type: ActionType.SCROLL, selector: '.section' };
      
      await executor.execute(mockPage, action);
      
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('executeSequence', () => {
    it('should execute multiple actions in sequence', async () => {
      const actions = [
        { type: ActionType.CLICK, selector: '.btn1' },
        { type: ActionType.WAIT, duration: 500 },
        { type: ActionType.CLICK, selector: '.btn2' }
      ];

      await executor.executeSequence(mockPage, actions);

      expect(mockPage.click).toHaveBeenCalledTimes(2);
      expect(mockPage.waitForTimeout).toHaveBeenCalled();
    });

    it('should call onAction callback for each action', async () => {
      const onAction = vi.fn();
      const actions = [
        { type: ActionType.CLICK, selector: '.btn1' },
        { type: ActionType.CLICK, selector: '.btn2' }
      ];

      await executor.executeSequence(mockPage, actions, { onAction });

      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      mockPage.click.mockRejectedValueOnce(new Error('Element not found'));
      
      const actions = [{ type: ActionType.CLICK, selector: '.missing' }];
      
      // Should not throw by default with skipOnError
      await expect(executor.executeSequence(mockPage, actions, { skipOnError: true }))
        .resolves.not.toThrow();
    });
  });

  describe('getActionDuration', () => {
    it('should return timing based on action type', () => {
      expect(executor.getActionDuration(ActionType.CLICK)).toBe(TimingPresets.NORMAL.click);
      expect(executor.getActionDuration(ActionType.HOVER)).toBe(TimingPresets.NORMAL.hover);
      expect(executor.getActionDuration(ActionType.SCROLL)).toBe(TimingPresets.NORMAL.scroll);
    });
  });
});
