/**
 * Interactions - Smart page interactions for realistic demos
 * Typing, form filling, dropdown selection, etc.
 */

/**
 * Interaction types and their execution logic
 */
export const INTERACTION_TYPES = {
  click: 'click',
  type: 'type',
  scroll: 'scroll',
  hover: 'hover',
  select: 'select',
  wait: 'wait',
  highlight: 'highlight'
};

/**
 * InteractionEngine - Execute page interactions with realistic timing
 */
export class InteractionEngine {
  constructor(page, cursorTracker) {
    this.page = page;
    this.tracker = cursorTracker;
    this.defaultTypingSpeed = 80; // ms per character
    this.defaultPauseBetweenActions = 500;
  }

  /**
   * Execute a sequence of interactions
   */
  async executeSequence(interactions) {
    for (const interaction of interactions) {
      await this.execute(interaction);
      await this.sleep(interaction.pauseAfter || this.defaultPauseBetweenActions);
    }
  }

  /**
   * Execute a single interaction
   */
  async execute(interaction) {
    switch (interaction.type) {
      case 'click':
        await this.click(interaction);
        break;
      case 'type':
        await this.type(interaction);
        break;
      case 'scroll':
        await this.scroll(interaction);
        break;
      case 'hover':
        await this.hover(interaction);
        break;
      case 'select':
        await this.select(interaction);
        break;
      case 'wait':
        await this.sleep(interaction.duration || 1000);
        break;
      case 'highlight':
        await this.highlight(interaction);
        break;
      default:
        console.warn(`Unknown interaction type: ${interaction.type}`);
    }
  }

  /**
   * Click on an element
   */
  async click(interaction) {
    const { selector, x, y, button = 'left' } = interaction;
    
    let targetX, targetY;
    
    if (selector) {
      const element = await this.page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          targetX = box.x + box.width / 2;
          targetY = box.y + box.height / 2;
        }
      }
    } else if (x !== undefined && y !== undefined) {
      targetX = x;
      targetY = y;
    }

    if (targetX !== undefined && targetY !== undefined) {
      await this.smoothMoveTo(targetX, targetY, 400);
      this.tracker?.recordClick(targetX, targetY, Date.now());
      await this.page.mouse.click(targetX, targetY, { button });
      await this.sleep(200);
    }
  }

  /**
   * Type text into an element with realistic timing
   */
  async type(interaction) {
    const { selector, text, speed = this.defaultTypingSpeed, clearFirst = false } = interaction;
    
    if (!selector || !text) return;

    const element = await this.page.$(selector);
    if (!element) return;

    // Click to focus
    const box = await element.boundingBox();
    if (box) {
      await this.smoothMoveTo(box.x + box.width / 2, box.y + box.height / 2, 300);
      this.tracker?.recordClick(box.x + box.width / 2, box.y + box.height / 2, Date.now());
      await element.click();
      await this.sleep(200);
    }

    // Clear existing text if requested
    if (clearFirst) {
      await this.page.keyboard.press('Control+a');
      await this.sleep(100);
    }

    // Type with realistic timing and occasional pauses
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await this.page.keyboard.type(char);
      
      // Variable delay based on character
      let delay = speed;
      if (char === ' ') delay *= 0.5; // Faster on spaces
      if (char === '.' || char === ',') delay *= 2; // Pause on punctuation
      if (Math.random() < 0.1) delay *= 1.5; // Occasional hesitation
      
      await this.sleep(delay);
    }
  }

  /**
   * Scroll the page
   */
  async scroll(interaction) {
    const { y = 0, x = 0, smooth = true, duration = 800 } = interaction;

    if (smooth) {
      await this.page.evaluate(async (args) => {
        const { targetY, duration } = args;
        const startY = window.scrollY;
        const startTime = performance.now();

        return new Promise((resolve) => {
          const scroll = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo(0, startY + (targetY - startY) * eased);

            if (progress < 1) {
              requestAnimationFrame(scroll);
            } else {
              resolve();
            }
          };
          scroll();
        });
      }, { targetY: y, duration });
    } else {
      await this.page.evaluate((y) => window.scrollTo(0, y), y);
    }

    await this.sleep(duration + 100);
  }

  /**
   * Hover over an element
   */
  async hover(interaction) {
    const { selector, x, y, duration = 1000 } = interaction;
    
    let targetX, targetY;
    
    if (selector) {
      const element = await this.page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        if (box) {
          targetX = box.x + box.width / 2;
          targetY = box.y + box.height / 2;
        }
      }
    } else if (x !== undefined && y !== undefined) {
      targetX = x;
      targetY = y;
    }

    if (targetX !== undefined && targetY !== undefined) {
      await this.smoothMoveTo(targetX, targetY, 400);
      await this.sleep(duration);
    }
  }

  /**
   * Select an option from a dropdown
   */
  async select(interaction) {
    const { selector, value, label } = interaction;
    
    if (!selector) return;

    const element = await this.page.$(selector);
    if (!element) return;

    // Click to open
    const box = await element.boundingBox();
    if (box) {
      await this.smoothMoveTo(box.x + box.width / 2, box.y + box.height / 2, 300);
      await element.click();
      await this.sleep(300);
    }

    // Select option
    if (value) {
      await this.page.selectOption(selector, value);
    } else if (label) {
      await this.page.selectOption(selector, { label });
    }

    await this.sleep(200);
  }

  /**
   * Highlight an element (for emphasis)
   */
  async highlight(interaction) {
    const { selector, duration = 2000, color = 'rgba(59, 130, 246, 0.3)' } = interaction;
    
    if (!selector) return;

    // Add highlight overlay via page injection
    await this.page.evaluate((args) => {
      const { selector, color, duration } = args;
      const element = document.querySelector(selector);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: ${color};
        border: 2px solid rgba(59, 130, 246, 0.8);
        border-radius: 4px;
        pointer-events: none;
        z-index: 99999;
        animation: pulse 0.5s ease-in-out infinite alternate;
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          from { opacity: 0.5; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.remove();
        style.remove();
      }, duration);
    }, { selector, color, duration });

    await this.sleep(duration);
  }

  /**
   * Smooth cursor movement
   */
  async smoothMoveTo(targetX, targetY, duration = 500) {
    const positions = this.tracker?.positions || [];
    const startX = positions.length > 0 ? positions[positions.length - 1].x : targetX;
    const startY = positions.length > 0 ? positions[positions.length - 1].y : targetY;

    const steps = Math.max(10, Math.floor(duration / 16));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic
      
      const x = startX + (targetX - startX) * eased;
      const y = startY + (targetY - startY) * eased;
      
      this.tracker?.record(x, y, Date.now());
      await this.page.mouse.move(x, y);
      await this.sleep(duration / steps);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Generate smart interactions based on page analysis
 */
export function generateSmartInteractions(pageInfo, duration) {
  const interactions = [];
  const { interactiveElements, pageHeight, viewportHeight } = pageInfo;
  
  let currentTime = 0;
  const timePerAction = duration / Math.max(5, interactiveElements.length);

  // Start with initial wait
  interactions.push({ type: 'wait', duration: 1500 });
  currentTime += 1500;

  // Find primary CTA
  const cta = interactiveElements.find(el => 
    el.visible && 
    (el.text?.toLowerCase().includes('start') ||
     el.text?.toLowerCase().includes('try') ||
     el.text?.toLowerCase().includes('sign') ||
     el.text?.toLowerCase().includes('get'))
  );

  if (cta) {
    interactions.push({
      type: 'hover',
      x: cta.x,
      y: cta.y,
      duration: 1200
    });
    currentTime += 1500;
  }

  // Find form inputs
  const inputs = interactiveElements.filter(el => el.tag === 'INPUT');
  if (inputs.length > 0) {
    const emailInput = inputs.find(el => 
      el.text?.toLowerCase().includes('email') || 
      el.placeholder?.toLowerCase().includes('email')
    );
    
    if (emailInput) {
      interactions.push({
        type: 'type',
        selector: 'input[type="email"], input[placeholder*="email"]',
        text: 'demo@example.com',
        speed: 60
      });
      currentTime += 2000;
    }
  }

  // Scroll through page
  const maxScroll = Math.max(0, pageHeight - viewportHeight);
  if (maxScroll > 100) {
    const scrollSteps = Math.min(4, Math.ceil(maxScroll / viewportHeight));
    
    for (let i = 1; i <= scrollSteps; i++) {
      if (currentTime > duration - 3000) break;
      
      interactions.push({
        type: 'scroll',
        y: Math.min(maxScroll, (maxScroll / scrollSteps) * i),
        duration: 800
      });
      
      interactions.push({ type: 'wait', duration: 1500 });
      currentTime += 2500;
    }
  }

  // Return to top
  interactions.push({ type: 'scroll', y: 0, duration: 1000 });
  interactions.push({ type: 'wait', duration: 1000 });

  return interactions;
}

/**
 * Demo scenarios - predefined interaction sequences for common demo types
 */
export const DEMO_SCENARIOS = {
  landingPage: [
    { type: 'wait', duration: 2000 },
    { type: 'hover', selector: 'h1', duration: 1500 },
    { type: 'scroll', y: 500, duration: 800 },
    { type: 'wait', duration: 2000 },
    { type: 'scroll', y: 1000, duration: 800 },
    { type: 'wait', duration: 2000 },
    { type: 'scroll', y: 0, duration: 1000 }
  ],
  
  signupForm: [
    { type: 'wait', duration: 1500 },
    { type: 'click', selector: 'input[type="email"], input[name="email"]' },
    { type: 'type', selector: 'input[type="email"], input[name="email"]', text: 'john@example.com', speed: 50 },
    { type: 'wait', duration: 500 },
    { type: 'click', selector: 'input[type="password"], input[name="password"]' },
    { type: 'type', selector: 'input[type="password"], input[name="password"]', text: 'securepassword', speed: 40 },
    { type: 'wait', duration: 800 },
    { type: 'hover', selector: 'button[type="submit"], .btn-primary', duration: 1000 }
  ],
  
  dashboard: [
    { type: 'wait', duration: 1500 },
    { type: 'hover', selector: '[class*="sidebar"] a, nav a', duration: 800 },
    { type: 'click', selector: '[class*="sidebar"] a:nth-child(2), nav a:nth-child(2)' },
    { type: 'wait', duration: 2000 },
    { type: 'scroll', y: 300, duration: 600 },
    { type: 'wait', duration: 1500 },
    { type: 'scroll', y: 0, duration: 600 }
  ],
  
  ecommerce: [
    { type: 'wait', duration: 1500 },
    { type: 'scroll', y: 400, duration: 800 },
    { type: 'hover', selector: '.product-card, [class*="product"]', duration: 1200 },
    { type: 'click', selector: '.product-card, [class*="product"]' },
    { type: 'wait', duration: 2000 },
    { type: 'hover', selector: 'button[class*="cart"], .add-to-cart', duration: 1000 }
  ]
};
