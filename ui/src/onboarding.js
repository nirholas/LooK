/**
 * First-run onboarding experience
 */
export class Onboarding {
  constructor() {
    this.steps = [
      {
        target: '#url-input',
        title: 'Start with a URL',
        description: 'Paste any website URL to automatically generate a professional demo video.',
        position: 'bottom'
      },
      {
        target: '#live-record-btn',
        title: 'Or Record Live',
        description: 'Take control and record your demo manually with real-time preview.',
        position: 'bottom'
      },
      {
        target: '.sidebar',
        title: 'Customize Everything',
        description: 'Adjust zoom, cursor style, voiceover, and export settings.',
        position: 'left'
      },
      {
        target: '#export-btn',
        title: 'Export Anywhere',
        description: 'Export optimized for YouTube, Twitter, Instagram, or TikTok.',
        position: 'bottom'
      }
    ];

    this.currentStep = 0;
    this.overlay = null;
  }

  start() {
    if (localStorage.getItem('look-onboarding-complete')) return;

    // Wait for DOM to be fully rendered
    requestAnimationFrame(() => {
      this.showOverlay();
      this.showStep(0);
      document.addEventListener('keydown', this._onKeyDownBound = (e) => this._onKeyDown(e));
    });
  }

  showOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-tooltip">
        <div class="onboarding-content">
          <h3 class="onboarding-title"></h3>
          <p class="onboarding-desc"></p>
        </div>
        <div class="onboarding-footer">
          <span class="onboarding-progress"></span>
          <div class="onboarding-actions">
            <button class="btn btn-secondary onboarding-skip">Skip</button>
            <button class="btn btn-primary onboarding-next">Next</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    overlay.querySelector('.onboarding-skip').onclick = () => this.complete();
    overlay.querySelector('.onboarding-next').onclick = () => this.next();
  }

  showStep(index) {
    const step = this.steps[index];
    const target = document.querySelector(step.target);
    const tooltip = document.querySelector('.onboarding-tooltip');

    if (!tooltip) return;

    // Clear previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));

    if (!target) {
      // If target is missing, skip to next
      this.next();
      return;
    }

    // Scroll target into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Highlight target
    target.classList.add('onboarding-highlight');

    // Update content
    tooltip.querySelector('.onboarding-title').textContent = step.title;
    tooltip.querySelector('.onboarding-desc').textContent = step.description;
    tooltip.querySelector('.onboarding-progress').textContent = `${index + 1} of ${this.steps.length}`;

    // Position tooltip after scroll settles
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      this.positionTooltip(tooltip, rect, step.position);
    }, 100);

    const nextBtn = tooltip.querySelector('.onboarding-next');
    nextBtn.textContent = index === this.steps.length - 1 ? 'Get Started' : 'Next';
    nextBtn.focus();
  }

  positionTooltip(tooltip, targetRect, position) {
    const gap = 16;
    const padding = 16; // Edge padding
    
    // Reset positioning
    tooltip.style.left = '';
    tooltip.style.top = '';
    tooltip.style.right = '';
    tooltip.style.bottom = '';
    tooltip.style.transform = '';

    // Get tooltip dimensions
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top, left;

    switch (position) {
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left;
        break;
      case 'top':
        top = targetRect.top - tooltipRect.height - gap;
        left = targetRect.left;
        break;
      case 'left':
        top = targetRect.top;
        left = targetRect.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = targetRect.top;
        left = targetRect.right + gap;
        break;
      default:
        top = targetRect.bottom + gap;
        left = targetRect.left;
    }

    // Ensure tooltip stays within viewport
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }
    if (top < padding) {
      top = padding;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  next() {
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    this.currentStep++;

    if (this.currentStep >= this.steps.length) {
      this.complete();
    } else {
      this.showStep(this.currentStep);
    }
  }

  _onKeyDown(e) {
    if (!this.overlay) return;
    if (e.key === 'Escape') this.complete();
    if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
    if (e.key === 'ArrowLeft') {
      this.currentStep = Math.max(0, this.currentStep - 1);
      this.showStep(this.currentStep);
    }
  }

  complete() {
    localStorage.setItem('look-onboarding-complete', 'true');
    document.getElementById('onboarding-overlay')?.remove();
    document.querySelectorAll('.onboarding-highlight').forEach(el => el.classList.remove('onboarding-highlight'));
    document.removeEventListener('keydown', this._onKeyDownBound);
  }
}
