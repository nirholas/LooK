/**
 * L👀K Editor - Template Selector Component
 * Pre-built demo configurations for common website types
 */

import { API } from './api.js';
import { toast } from './toast.js';

export class TemplateSelector {
  constructor(options = {}) {
    this.onTemplateSelect = options.onTemplateSelect || (() => {});
    this.container = null;
    this.modal = null;
    this.templates = [];
    this.categories = [];
    this.selectedCategory = null;
    this.searchQuery = '';
    this.initialized = false;
  }

  /**
   * Initialize the template selector
   */
  async init(container) {
    this.container = container;
    await this.loadTemplates();
    this.render();
    this.bindEvents();
    this.initialized = true;
  }

  /**
   * Load templates from API
   */
  async loadTemplates() {
    try {
      const [templatesResponse, categoriesResponse] = await Promise.all([
        API.getTemplates(),
        API.getTemplateCategories()
      ]);
      
      this.templates = templatesResponse.templates || [];
      this.categories = categoriesResponse.categories || [];
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast('Failed to load templates', 'error');
      this.templates = [];
      this.categories = [];
    }
  }

  /**
   * Render the template selector button and modal
   */
  render() {
    // Create browse templates button
    const browseBtn = document.createElement('button');
    browseBtn.type = 'button';
    browseBtn.id = 'browse-templates-btn';
    browseBtn.className = 'btn btn-outline btn-large';
    browseBtn.innerHTML = '<span class="icon">📋</span> Browse Templates';
    
    // Insert button after the form buttons
    const formButtons = this.container.querySelector('.form-buttons');
    if (formButtons) {
      formButtons.appendChild(browseBtn);
    }

    // Create modal
    this.createModal();
  }

  /**
   * Create the template selection modal
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.id = 'template-modal';
    this.modal.className = 'modal template-modal hidden';
    this.modal.innerHTML = `
      <div class="modal-content template-modal-content">
        <div class="modal-header">
          <h2>Choose a Template</h2>
          <button class="modal-close" id="template-close-btn">&times;</button>
        </div>
        
        <div class="template-search">
          <input 
            type="text" 
            id="template-search-input" 
            placeholder="Search templates..." 
            class="search-input"
          >
        </div>
        
        <div class="template-layout">
          <div class="template-categories">
            <button class="category-btn active" data-category="">All Templates</button>
            ${this.categories.map(cat => `
              <button class="category-btn" data-category="${cat.id}">
                ${this.getCategoryIcon(cat.id)} ${cat.name}
                <span class="category-count">${cat.count}</span>
              </button>
            `).join('')}
          </div>
          
          <div class="template-grid" id="template-grid">
            ${this.renderTemplateCards()}
          </div>
        </div>
        
        <div class="template-footer">
          <p class="template-hint">Select a template to pre-configure your demo settings</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
  }

  /**
   * Get icon for category
   */
  getCategoryIcon(category) {
    const icons = {
      'saas': '💼',
      'ecommerce': '🛒',
      'portfolio': '🎨',
      'documentation': '📚',
      'landing': '🚀',
      'dashboard': '📊',
      'mobile_app': '📱',
      'developer_tool': '⚙️'
    };
    return icons[category] || '📋';
  }

  /**
   * Render template cards
   */
  renderTemplateCards(templates = this.templates) {
    if (!templates.length) {
      return '<p class="no-templates">No templates found</p>';
    }

    return templates.map(template => `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <span class="template-icon">${this.getCategoryIcon(template.category)}</span>
          <span class="template-badge ${template.category}">${this.formatCategory(template.category)}</span>
        </div>
        <h3 class="template-name">${template.name}</h3>
        <p class="template-description">${template.description}</p>
        <div class="template-tags">
          ${template.tags.slice(0, 3).map(tag => `<span class="template-tag">${tag}</span>`).join('')}
        </div>
        <div class="template-meta">
          <span class="template-duration">⏱️ ~${template.estimatedDuration}s</span>
        </div>
        <button class="btn btn-primary btn-small template-use-btn">Use Template</button>
      </div>
    `).join('');
  }

  /**
   * Format category name
   */
  formatCategory(category) {
    return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Browse templates button
    const browseBtn = document.getElementById('browse-templates-btn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => this.openModal());
    }

    // Close button
    const closeBtn = document.getElementById('template-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Category buttons
    this.modal.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectCategory(e.target.dataset.category);
      });
    });

    // Search input
    const searchInput = document.getElementById('template-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTemplates(e.target.value);
      });
    }

    // Template cards
    this.modal.addEventListener('click', (e) => {
      const useBtn = e.target.closest('.template-use-btn');
      const card = e.target.closest('.template-card');
      
      if (useBtn && card) {
        const templateId = card.dataset.templateId;
        this.selectTemplate(templateId);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
  }

  /**
   * Open the template modal
   */
  openModal() {
    this.modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    
    // Focus search input
    const searchInput = document.getElementById('template-search-input');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }

  /**
   * Close the template modal
   */
  closeModal() {
    this.modal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  /**
   * Select a category
   */
  selectCategory(category) {
    this.selectedCategory = category || null;
    
    // Update active button
    this.modal.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Filter templates
    this.filterTemplates();
  }

  /**
   * Search templates
   */
  searchTemplates(query) {
    this.searchQuery = query.toLowerCase();
    this.filterTemplates();
  }

  /**
   * Filter and re-render templates
   */
  filterTemplates() {
    let filtered = this.templates;

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(this.searchQuery) ||
        t.description.toLowerCase().includes(this.searchQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
      );
    }

    // Re-render grid
    const grid = document.getElementById('template-grid');
    if (grid) {
      grid.innerHTML = this.renderTemplateCards(filtered);
    }
  }

  /**
   * Select a template
   */
  async selectTemplate(templateId) {
    try {
      const template = await API.getTemplate(templateId);
      
      if (template) {
        this.closeModal();
        toast(`Applied "${template.name}" template`, 'success');
        this.onTemplateSelect(template);
      }
    } catch (error) {
      console.error('Failed to select template:', error);
      toast('Failed to load template', 'error');
    }
  }

  /**
   * Get suggested templates based on URL analysis
   */
  async suggestTemplates(url, analysis = null) {
    try {
      const response = await API.suggestTemplates(url, analysis);
      return response.suggested || [];
    } catch (error) {
      console.error('Failed to get template suggestions:', error);
      return [];
    }
  }

  /**
   * Show template suggestions in a dropdown
   */
  showSuggestions(suggestions, anchorElement) {
    // Remove existing dropdown
    const existing = document.getElementById('template-suggestions');
    if (existing) {
      existing.remove();
    }

    if (!suggestions.length) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'template-suggestions';
    dropdown.className = 'template-suggestions';
    dropdown.innerHTML = `
      <div class="suggestions-header">
        <span class="icon">💡</span> Suggested Templates
      </div>
      <div class="suggestions-list">
        ${suggestions.map(s => `
          <button class="suggestion-item" data-template-id="${s.template.id}">
            <span class="suggestion-icon">${this.getCategoryIcon(s.template.category)}</span>
            <div class="suggestion-info">
              <span class="suggestion-name">${s.template.name}</span>
              <span class="suggestion-match">${Math.round(s.confidence * 100)}% match</span>
            </div>
          </button>
        `).join('')}
      </div>
      <button class="btn btn-text browse-more">Browse all templates →</button>
    `;

    // Position dropdown
    const rect = anchorElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${Math.max(rect.width, 300)}px`;

    document.body.appendChild(dropdown);

    // Bind events
    dropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectTemplate(item.dataset.templateId);
        dropdown.remove();
      });
    });

    dropdown.querySelector('.browse-more').addEventListener('click', () => {
      dropdown.remove();
      this.openModal();
    });

    // Close on outside click
    const closeHandler = (e) => {
      if (!dropdown.contains(e.target) && e.target !== anchorElement) {
        dropdown.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.modal) {
      this.modal.remove();
    }
    const browseBtn = document.getElementById('browse-templates-btn');
    if (browseBtn) {
      browseBtn.remove();
    }
  }
}

// CSS styles for the template selector
export const templateSelectorStyles = `
  /* Template Modal */
  .template-modal .modal-content {
    max-width: 900px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .template-modal .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .template-modal .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .template-search {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .template-search .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .template-search .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .template-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Categories sidebar */
  .template-categories {
    width: 200px;
    padding: 1rem;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .category-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .category-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .category-btn.active {
    background: var(--primary-color);
    color: white;
  }

  .category-count {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* Template grid */
  .template-grid {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    align-content: start;
  }

  .template-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .template-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .template-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .template-icon {
    font-size: 1.5rem;
  }

  .template-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .template-badge.saas { background: #dbeafe; color: #1e40af; }
  .template-badge.ecommerce { background: #dcfce7; color: #166534; }
  .template-badge.portfolio { background: #fce7f3; color: #9d174d; }
  .template-badge.documentation { background: #fef3c7; color: #92400e; }
  .template-badge.landing { background: #e0e7ff; color: #3730a3; }
  .template-badge.dashboard { background: #cffafe; color: #0e7490; }
  .template-badge.mobile_app { background: #f3e8ff; color: #7c3aed; }
  .template-badge.developer_tool { background: #f1f5f9; color: #475569; }

  .template-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .template-description {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
    flex: 1;
  }

  .template-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .template-tag {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }

  .template-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .template-use-btn {
    width: 100%;
    margin-top: 0.5rem;
  }

  .template-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
    text-align: center;
  }

  .template-hint {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .no-templates {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--text-secondary);
    padding: 2rem;
  }

  /* Template suggestions dropdown */
  .template-suggestions {
    position: fixed;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
  }

  .suggestions-header {
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .suggestions-list {
    display: flex;
    flex-direction: column;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .suggestion-item:hover {
    background: var(--bg-secondary);
  }

  .suggestion-icon {
    font-size: 1.25rem;
  }

  .suggestion-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .suggestion-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .suggestion-match {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .browse-more {
    width: 100%;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--border-color);
    font-size: 0.875rem;
  }

  /* Button outline style */
  .btn-outline {
    background: transparent;
    border: 2px solid var(--border-color);
    color: var(--text-primary);
  }

  .btn-outline:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
    background: rgba(99, 102, 241, 0.05);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .template-layout {
      flex-direction: column;
    }

    .template-categories {
      width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
    }

    .category-btn {
      flex: 0 0 auto;
    }

    .template-grid {
      grid-template-columns: 1fr;
    }
  }
`;
