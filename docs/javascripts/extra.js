// LooK Documentation - Custom JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Add copy feedback enhancement
  addCopyFeedback();
  
  // Initialize keyboard shortcut hints
  initKeyboardHints();
  
  // Add external link icons
  markExternalLinks();
  
  // Initialize version selector if present
  initVersionSelector();
});

/**
 * Enhanced copy button feedback
 */
function addCopyFeedback() {
  document.querySelectorAll('.md-clipboard').forEach(button => {
    button.addEventListener('click', function() {
      const originalTitle = this.getAttribute('title');
      this.setAttribute('title', 'Copied!');
      this.classList.add('copied');
      
      setTimeout(() => {
        this.setAttribute('title', originalTitle);
        this.classList.remove('copied');
      }, 2000);
    });
  });
}

/**
 * Show keyboard shortcut hints on hover
 */
function initKeyboardHints() {
  // Add tooltip for search shortcut
  const searchInput = document.querySelector('.md-search__input');
  if (searchInput) {
    searchInput.setAttribute('placeholder', 'Search (Press / to focus)');
  }
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Press 'h' to go home (when not in input)
    if (e.key === 'h' && !isInputFocused()) {
      window.location.href = '/';
    }
    
    // Press 'g' then 's' for getting started
    if (e.key === 'g' && !isInputFocused()) {
      window.__pendingNav = true;
      setTimeout(() => { window.__pendingNav = false; }, 500);
    }
    
    if (e.key === 's' && window.__pendingNav && !isInputFocused()) {
      window.location.href = '/getting-started/';
      window.__pendingNav = false;
    }
  });
}

/**
 * Check if an input element is focused
 */
function isInputFocused() {
  const activeEl = document.activeElement;
  return activeEl && (
    activeEl.tagName === 'INPUT' || 
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.isContentEditable
  );
}

/**
 * Mark external links with icon and target blank
 */
function markExternalLinks() {
  const links = document.querySelectorAll('.md-content a[href^="http"]');
  links.forEach(link => {
    // Skip if already processed or is internal
    if (link.classList.contains('external-processed')) return;
    if (link.hostname === window.location.hostname) return;
    
    // Add external link attributes
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.classList.add('external-processed');
    
    // Add external icon (optional - Material theme may handle this)
    if (!link.querySelector('.external-icon')) {
      const icon = document.createElement('span');
      icon.className = 'external-icon';
      icon.innerHTML = ' ↗';
      icon.style.fontSize = '0.8em';
      link.appendChild(icon);
    }
  });
}

/**
 * Initialize version selector functionality
 */
function initVersionSelector() {
  const versionSelector = document.querySelector('.md-version');
  if (versionSelector) {
    versionSelector.addEventListener('change', function(e) {
      const version = e.target.value;
      // Handle version switching logic here
      console.log('Switching to version:', version);
    });
  }
}

/**
 * Analytics event tracking (if analytics enabled)
 */
function trackEvent(category, action, label) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

// Track code copy events
document.addEventListener('click', function(e) {
  if (e.target.closest('.md-clipboard')) {
    trackEvent('Code', 'copy', window.location.pathname);
  }
});

// Track search queries
let searchTimeout;
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('md-search__input')) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      trackEvent('Search', 'query', e.target.value);
    }, 1000);
  }
});

/**
 * Smooth scroll for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href').slice(1);
    const targetEl = document.getElementById(targetId);
    
    if (targetEl) {
      e.preventDefault();
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Update URL without jumping
      history.pushState(null, null, '#' + targetId);
    }
  });
});

/**
 * Add reading progress indicator
 */
function initReadingProgress() {
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--md-primary-fg-color, #2196f3);
    z-index: 1000;
    transition: width 0.1s ease;
  `;
  document.body.appendChild(progressBar);
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = progress + '%';
  });
}

// Initialize reading progress on article pages
if (document.querySelector('.md-content article')) {
  initReadingProgress();
}

/**
 * Table of contents highlight on scroll
 */
function initTocHighlight() {
  const toc = document.querySelector('.md-sidebar--secondary .md-nav__list');
  if (!toc) return;
  
  const headings = document.querySelectorAll('.md-content h2, .md-content h3');
  
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const link = toc.querySelector(`a[href="#${id}"]`);
        
        toc.querySelectorAll('a').forEach(a => a.classList.remove('md-nav__link--active'));
        if (link) link.classList.add('md-nav__link--active');
      }
    });
  }, { rootMargin: '-20% 0% -80% 0%' });
  
  headings.forEach(h => observer.observe(h));
}

initTocHighlight();
