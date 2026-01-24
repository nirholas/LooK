/**
 * Demo Templates - Pre-built configurations for common website types
 * 
 * Templates provide optimized settings for different product categories:
 * - SaaS applications
 * - E-commerce stores
 * - Portfolio/Agency sites
 * - Documentation sites
 * - Landing pages
 * - Dashboards
 * 
 * @module templates
 */

/**
 * @typedef {Object} DemoTemplate
 * @property {string} id - Unique template identifier
 * @property {string} name - Human-readable name
 * @property {string} description - What this template is best for
 * @property {string} category - Template category
 * @property {string[]} tags - Searchable tags
 * @property {Object} settings - Demo generation settings
 * @property {Object} script - Script generation settings
 * @property {Object} zoom - Zoom behavior settings
 * @property {Object} cursor - Cursor appearance settings
 * @property {Object} markers - Default marker templates
 * @property {Object} intro - Intro card settings
 * @property {Object} outro - Outro/CTA settings
 */

/**
 * Template Categories
 */
export const TemplateCategory = {
  SAAS: 'saas',
  ECOMMERCE: 'ecommerce',
  PORTFOLIO: 'portfolio',
  DOCUMENTATION: 'documentation',
  LANDING: 'landing',
  DASHBOARD: 'dashboard',
  MOBILE_APP: 'mobile-app',
  DEVELOPER_TOOL: 'developer-tool'
};

/**
 * Built-in Demo Templates
 */
export const DEMO_TEMPLATES = {
  // ============================================================
  // SaaS Templates
  // ============================================================
  
  saas_product_tour: {
    id: 'saas_product_tour',
    name: 'SaaS Product Tour',
    description: 'Comprehensive walkthrough of a SaaS application highlighting key features',
    category: TemplateCategory.SAAS,
    tags: ['saas', 'product', 'tour', 'features', 'software'],
    settings: {
      duration: 45,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'professional',
      voice: 'nova',
      tone: 'enthusiastic',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Start your free trial today'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 1.8,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'medium'
    },
    cursor: {
      style: 'default',
      size: 32,
      color: '#000000',
      glow: false,
      clickEffect: 'ripple',
      clickColor: '#3B82F6'
    },
    markers: {
      template: 'saas_demo',
      chapters: ['Introduction', 'Dashboard Overview', 'Key Features', 'Workflow Demo', 'Getting Started']
    },
    intro: {
      enabled: true,
      duration: 3,
      theme: 'dark',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 4,
      showCTA: true,
      ctaText: 'Start Free Trial',
      showSocial: false
    },
    focusAreas: ['dashboard', 'features', 'settings', 'integrations'],
    avoidAreas: ['login', 'pricing', 'support']
  },

  saas_quick_demo: {
    id: 'saas_quick_demo',
    name: 'SaaS Quick Demo',
    description: 'Fast-paced 30-second highlight reel for social media',
    category: TemplateCategory.SAAS,
    tags: ['saas', 'quick', 'social', 'twitter', 'short'],
    settings: {
      duration: 30,
      width: 1920,
      height: 1080,
      preset: 'twitter'
    },
    script: {
      style: 'energetic',
      voice: 'alloy',
      tone: 'exciting',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Try it free!'
    },
    zoom: {
      mode: 'follow',
      maxZoom: 2.0,
      minZoom: 1.2,
      zoomOnClicks: true,
      zoomOnHover: false,
      speed: 'fast'
    },
    cursor: {
      style: 'pointer',
      size: 36,
      color: '#3B82F6',
      glow: true,
      clickEffect: 'pulse',
      clickColor: '#3B82F6'
    },
    markers: {
      template: 'quick_highlights',
      chapters: ['Hook', 'Feature 1', 'Feature 2', 'CTA']
    },
    intro: {
      enabled: false
    },
    outro: {
      enabled: true,
      duration: 2,
      showCTA: true,
      ctaText: 'Link in bio',
      showSocial: true
    },
    focusAreas: ['hero', 'main-feature', 'cta'],
    avoidAreas: ['footer', 'login', 'terms']
  },

  saas_onboarding: {
    id: 'saas_onboarding',
    name: 'SaaS Onboarding Guide',
    description: 'Step-by-step onboarding tutorial for new users',
    category: TemplateCategory.SAAS,
    tags: ['saas', 'onboarding', 'tutorial', 'guide', 'help'],
    settings: {
      duration: 90,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'casual',
      voice: 'nova',
      tone: 'helpful',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'You\'re all set! Start creating'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 2.2,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'slow'
    },
    cursor: {
      style: 'arrow-modern',
      size: 40,
      color: '#10B981',
      glow: true,
      clickEffect: 'spotlight',
      clickColor: '#10B981'
    },
    markers: {
      template: 'tutorial',
      chapters: ['Welcome', 'Account Setup', 'First Project', 'Key Features', 'Tips & Tricks', 'Next Steps']
    },
    intro: {
      enabled: true,
      duration: 4,
      theme: 'gradient',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 5,
      showCTA: true,
      ctaText: 'Need help? Contact support',
      showSocial: false
    },
    focusAreas: ['signup', 'onboarding', 'setup', 'first-run'],
    avoidAreas: ['pricing', 'billing']
  },

  // ============================================================
  // E-commerce Templates
  // ============================================================

  ecommerce_product_showcase: {
    id: 'ecommerce_product_showcase',
    name: 'E-commerce Product Showcase',
    description: 'Highlight products with smooth browsing and cart flow',
    category: TemplateCategory.ECOMMERCE,
    tags: ['ecommerce', 'shop', 'products', 'retail', 'store'],
    settings: {
      duration: 40,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'professional',
      voice: 'shimmer',
      tone: 'luxurious',
      includeFeatures: false,
      includePricing: true,
      callToAction: 'Shop now and get free shipping'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 2.0,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'medium'
    },
    cursor: {
      style: 'pointer',
      size: 32,
      color: '#000000',
      glow: false,
      clickEffect: 'ring',
      clickColor: '#F59E0B'
    },
    markers: {
      template: 'ecommerce',
      chapters: ['Welcome', 'Browse Products', 'Product Details', 'Add to Cart', 'Checkout']
    },
    intro: {
      enabled: true,
      duration: 3,
      theme: 'light',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 4,
      showCTA: true,
      ctaText: 'Shop Now',
      showSocial: true
    },
    focusAreas: ['products', 'categories', 'cart', 'product-detail'],
    avoidAreas: ['login', 'account', 'support']
  },

  ecommerce_instagram_reel: {
    id: 'ecommerce_instagram_reel',
    name: 'E-commerce Instagram Reel',
    description: 'Vertical product showcase optimized for Instagram/TikTok',
    category: TemplateCategory.ECOMMERCE,
    tags: ['ecommerce', 'instagram', 'tiktok', 'reel', 'vertical'],
    settings: {
      duration: 15,
      width: 1080,
      height: 1920,
      preset: 'instagram'
    },
    script: {
      style: 'energetic',
      voice: 'alloy',
      tone: 'trendy',
      includeFeatures: false,
      includePricing: true,
      callToAction: 'Link in bio!'
    },
    zoom: {
      mode: 'follow',
      maxZoom: 1.6,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: false,
      speed: 'fast'
    },
    cursor: {
      style: 'dot',
      size: 24,
      color: '#EC4899',
      glow: true,
      clickEffect: 'pulse',
      clickColor: '#EC4899'
    },
    markers: {
      template: 'quick_highlights',
      chapters: ['Hook', 'Product', 'Price', 'CTA']
    },
    intro: {
      enabled: false
    },
    outro: {
      enabled: true,
      duration: 2,
      showCTA: true,
      ctaText: '🛒 Link in bio',
      showSocial: true
    },
    focusAreas: ['hero-product', 'price', 'buy-button'],
    avoidAreas: ['navigation', 'footer', 'reviews']
  },

  // ============================================================
  // Portfolio Templates
  // ============================================================

  portfolio_showcase: {
    id: 'portfolio_showcase',
    name: 'Portfolio Showcase',
    description: 'Elegant walkthrough of creative work and projects',
    category: TemplateCategory.PORTFOLIO,
    tags: ['portfolio', 'creative', 'agency', 'design', 'work'],
    settings: {
      duration: 60,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'casual',
      voice: 'onyx',
      tone: 'creative',
      includeFeatures: false,
      includePricing: false,
      callToAction: 'Let\'s work together'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 1.6,
      minZoom: 1.0,
      zoomOnClicks: false,
      zoomOnHover: true,
      speed: 'slow'
    },
    cursor: {
      style: 'circle',
      size: 28,
      color: '#8B5CF6',
      glow: true,
      clickEffect: 'ripple',
      clickColor: '#8B5CF6'
    },
    markers: {
      template: 'portfolio',
      chapters: ['Introduction', 'Featured Work', 'Case Study', 'About', 'Contact']
    },
    intro: {
      enabled: true,
      duration: 4,
      theme: 'minimal',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 5,
      showCTA: true,
      ctaText: 'Get in touch',
      showSocial: true
    },
    focusAreas: ['work', 'projects', 'case-studies', 'about'],
    avoidAreas: ['blog', 'terms']
  },

  // ============================================================
  // Documentation Templates
  // ============================================================

  documentation_walkthrough: {
    id: 'documentation_walkthrough',
    name: 'Documentation Walkthrough',
    description: 'Technical documentation tour with code examples',
    category: TemplateCategory.DOCUMENTATION,
    tags: ['docs', 'documentation', 'api', 'technical', 'developer'],
    settings: {
      duration: 120,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'professional',
      voice: 'echo',
      tone: 'technical',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Check out the full documentation'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 2.5,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'slow'
    },
    cursor: {
      style: 'crosshair',
      size: 24,
      color: '#059669',
      glow: false,
      clickEffect: 'ring',
      clickColor: '#059669'
    },
    markers: {
      template: 'documentation',
      chapters: ['Overview', 'Installation', 'Quick Start', 'API Reference', 'Examples', 'FAQ']
    },
    intro: {
      enabled: true,
      duration: 3,
      theme: 'dark',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 4,
      showCTA: true,
      ctaText: 'Star us on GitHub',
      showSocial: false
    },
    focusAreas: ['getting-started', 'api', 'examples', 'code'],
    avoidAreas: ['changelog', 'contributors']
  },

  // ============================================================
  // Landing Page Templates
  // ============================================================

  landing_page_hero: {
    id: 'landing_page_hero',
    name: 'Landing Page Hero',
    description: 'Captivating landing page showcase with strong CTA',
    category: TemplateCategory.LANDING,
    tags: ['landing', 'marketing', 'hero', 'conversion', 'startup'],
    settings: {
      duration: 25,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'energetic',
      voice: 'nova',
      tone: 'persuasive',
      includeFeatures: true,
      includePricing: true,
      callToAction: 'Sign up free today'
    },
    zoom: {
      mode: 'follow',
      maxZoom: 1.8,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'medium'
    },
    cursor: {
      style: 'pointer',
      size: 36,
      color: '#EF4444',
      glow: true,
      clickEffect: 'spotlight',
      clickColor: '#EF4444'
    },
    markers: {
      template: 'landing_page',
      chapters: ['Hook', 'Value Proposition', 'Features', 'Social Proof', 'CTA']
    },
    intro: {
      enabled: false
    },
    outro: {
      enabled: true,
      duration: 3,
      showCTA: true,
      ctaText: 'Get Started Free',
      showSocial: false
    },
    focusAreas: ['hero', 'features', 'pricing', 'testimonials', 'cta'],
    avoidAreas: ['footer', 'terms', 'privacy']
  },

  // ============================================================
  // Dashboard Templates
  // ============================================================

  dashboard_analytics: {
    id: 'dashboard_analytics',
    name: 'Analytics Dashboard',
    description: 'Data visualization and analytics dashboard demo',
    category: TemplateCategory.DASHBOARD,
    tags: ['dashboard', 'analytics', 'data', 'charts', 'metrics'],
    settings: {
      duration: 50,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'professional',
      voice: 'onyx',
      tone: 'informative',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Start tracking your metrics'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 2.2,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'medium'
    },
    cursor: {
      style: 'default',
      size: 32,
      color: '#0EA5E9',
      glow: false,
      clickEffect: 'ripple',
      clickColor: '#0EA5E9'
    },
    markers: {
      template: 'dashboard',
      chapters: ['Overview', 'Key Metrics', 'Charts & Graphs', 'Reports', 'Settings']
    },
    intro: {
      enabled: true,
      duration: 3,
      theme: 'dark',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 4,
      showCTA: true,
      ctaText: 'Start your analytics journey',
      showSocial: false
    },
    focusAreas: ['charts', 'metrics', 'reports', 'filters'],
    avoidAreas: ['settings', 'billing', 'admin']
  },

  // ============================================================
  // Mobile App Templates
  // ============================================================

  mobile_app_showcase: {
    id: 'mobile_app_showcase',
    name: 'Mobile App Showcase',
    description: 'App store-ready demo with device frame',
    category: TemplateCategory.MOBILE_APP,
    tags: ['mobile', 'app', 'ios', 'android', 'smartphone'],
    settings: {
      duration: 30,
      width: 1080,
      height: 1920,
      preset: 'tiktok'
    },
    script: {
      style: 'casual',
      voice: 'nova',
      tone: 'friendly',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Download now on the App Store'
    },
    zoom: {
      mode: 'basic',
      maxZoom: 1.4,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: false,
      speed: 'medium'
    },
    cursor: {
      style: 'none', // Touch indicator instead
      touchIndicator: 'circle',
      touchColor: 'rgba(255,255,255,0.8)',
      touchSize: 60
    },
    markers: {
      template: 'mobile_app',
      chapters: ['Splash', 'Onboarding', 'Main Screen', 'Key Feature', 'Download CTA']
    },
    intro: {
      enabled: true,
      duration: 2,
      theme: 'gradient',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 3,
      showCTA: true,
      ctaText: 'Download Free',
      showSocial: false
    },
    deviceFrame: {
      enabled: true,
      device: 'iphone-15-pro',
      color: 'titanium'
    },
    focusAreas: ['home', 'main-feature', 'navigation'],
    avoidAreas: ['settings', 'profile']
  },

  // ============================================================
  // Developer Tool Templates
  // ============================================================

  developer_tool_demo: {
    id: 'developer_tool_demo',
    name: 'Developer Tool Demo',
    description: 'CLI/IDE/Dev tool demonstration with code highlights',
    category: TemplateCategory.DEVELOPER_TOOL,
    tags: ['developer', 'cli', 'tool', 'code', 'terminal'],
    settings: {
      duration: 60,
      width: 1920,
      height: 1080,
      preset: 'youtube'
    },
    script: {
      style: 'professional',
      voice: 'echo',
      tone: 'technical',
      includeFeatures: true,
      includePricing: false,
      callToAction: 'Install with npm install'
    },
    zoom: {
      mode: 'smart',
      maxZoom: 2.5,
      minZoom: 1.0,
      zoomOnClicks: true,
      zoomOnHover: true,
      speed: 'slow'
    },
    cursor: {
      style: 'crosshair',
      size: 24,
      color: '#22C55E',
      glow: true,
      clickEffect: 'ring',
      clickColor: '#22C55E'
    },
    markers: {
      template: 'developer_tool',
      chapters: ['Introduction', 'Installation', 'Basic Usage', 'Advanced Features', 'Integration']
    },
    intro: {
      enabled: true,
      duration: 3,
      theme: 'dark',
      showTagline: true
    },
    outro: {
      enabled: true,
      duration: 4,
      showCTA: true,
      ctaText: 'npm install && start building',
      showSocial: false
    },
    keyboardOverlay: {
      enabled: true,
      style: 'minimal',
      position: 'bottom-right'
    },
    focusAreas: ['terminal', 'code', 'output', 'config'],
    avoidAreas: ['ads', 'unrelated']
  }
};

/**
 * Get all available templates
 * @returns {DemoTemplate[]}
 */
export function getAllTemplates() {
  return Object.values(DEMO_TEMPLATES);
}

/**
 * Get template by ID
 * @param {string} templateId 
 * @returns {DemoTemplate|null}
 */
export function getTemplate(templateId) {
  return DEMO_TEMPLATES[templateId] || null;
}

/**
 * Get templates by category
 * @param {string} category 
 * @returns {DemoTemplate[]}
 */
export function getTemplatesByCategory(category) {
  return Object.values(DEMO_TEMPLATES).filter(t => t.category === category);
}

/**
 * Search templates by tags or name
 * @param {string} query 
 * @returns {DemoTemplate[]}
 */
export function searchTemplates(query) {
  const q = query.toLowerCase();
  return Object.values(DEMO_TEMPLATES).filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  );
}

/**
 * Get template categories with counts
 * @returns {Object[]}
 */
export function getCategories() {
  const counts = {};
  for (const template of Object.values(DEMO_TEMPLATES)) {
    counts[template.category] = (counts[template.category] || 0) + 1;
  }
  
  return Object.entries(counts).map(([category, count]) => ({
    id: category,
    name: formatCategoryName(category),
    count
  }));
}

/**
 * Format category name for display
 */
function formatCategoryName(category) {
  const names = {
    [TemplateCategory.SAAS]: 'SaaS Applications',
    [TemplateCategory.ECOMMERCE]: 'E-commerce',
    [TemplateCategory.PORTFOLIO]: 'Portfolio & Agency',
    [TemplateCategory.DOCUMENTATION]: 'Documentation',
    [TemplateCategory.LANDING]: 'Landing Pages',
    [TemplateCategory.DASHBOARD]: 'Dashboards',
    [TemplateCategory.MOBILE_APP]: 'Mobile Apps',
    [TemplateCategory.DEVELOPER_TOOL]: 'Developer Tools'
  };
  return names[category] || category;
}

/**
 * Apply template settings to demo options
 * @param {string} templateId - Template ID
 * @param {Object} overrides - User overrides
 * @returns {Object} Merged demo options
 */
export function applyTemplate(templateId, overrides = {}) {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  // Deep merge template with overrides
  return {
    // Base settings
    duration: overrides.duration || template.settings.duration,
    width: overrides.width || template.settings.width,
    height: overrides.height || template.settings.height,
    preset: overrides.preset || template.settings.preset,
    
    // Script settings
    style: overrides.style || template.script.style,
    voice: overrides.voice || template.script.voice,
    
    // Zoom settings
    zoomMode: overrides.zoomMode || template.zoom.mode,
    maxZoom: overrides.maxZoom || template.zoom.maxZoom,
    minZoom: overrides.minZoom || template.zoom.minZoom,
    zoomOnClicks: overrides.zoomOnClicks ?? template.zoom.zoomOnClicks,
    zoomOnHover: overrides.zoomOnHover ?? template.zoom.zoomOnHover,
    zoomSpeed: overrides.zoomSpeed || template.zoom.speed,
    
    // Cursor settings
    cursorStyle: overrides.cursorStyle || template.cursor.style,
    cursorSize: overrides.cursorSize || template.cursor.size,
    cursorColor: overrides.cursorColor || template.cursor.color,
    cursorGlow: overrides.cursorGlow ?? template.cursor.glow,
    clickEffect: overrides.clickEffect || template.cursor.clickEffect,
    clickEffectColor: overrides.clickEffectColor || template.cursor.clickColor,
    
    // Intro/Outro
    addIntro: overrides.addIntro ?? template.intro?.enabled,
    introDuration: overrides.introDuration || template.intro?.duration,
    introTheme: overrides.introTheme || template.intro?.theme,
    addOutro: overrides.addOutro ?? template.outro?.enabled,
    outroDuration: overrides.outroDuration || template.outro?.duration,
    ctaText: overrides.ctaText || template.outro?.ctaText,
    
    // Touch settings (for mobile)
    touchIndicator: overrides.touchIndicator || template.cursor?.touchIndicator,
    touchColor: overrides.touchColor || template.cursor?.touchColor,
    touchSize: overrides.touchSize || template.cursor?.touchSize,
    
    // Device frame (for mobile)
    addDeviceFrame: overrides.addDeviceFrame ?? template.deviceFrame?.enabled,
    deviceName: overrides.deviceName || template.deviceFrame?.device,
    
    // Keyboard overlay (for dev tools)
    showKeyboard: overrides.showKeyboard ?? template.keyboardOverlay?.enabled,
    keyboardStyle: overrides.keyboardStyle || template.keyboardOverlay?.style,
    
    // Focus/avoid areas
    focusAreas: overrides.focusAreas || template.focusAreas,
    avoidAreas: overrides.avoidAreas || template.avoidAreas,
    
    // Markers
    markerTemplate: overrides.markerTemplate || template.markers?.template,
    
    // Template metadata
    _templateId: templateId,
    _templateName: template.name
  };
}

/**
 * Suggest best template based on URL analysis
 * @param {Object} analysis - Website analysis result
 * @returns {DemoTemplate[]} Top 3 recommended templates
 */
export function suggestTemplates(analysis) {
  const scores = {};
  
  for (const [id, template] of Object.entries(DEMO_TEMPLATES)) {
    let score = 0;
    
    // Match by detected type
    if (analysis.type) {
      const type = analysis.type.toLowerCase();
      if (type.includes('saas') && template.category === TemplateCategory.SAAS) score += 50;
      if (type.includes('ecommerce') && template.category === TemplateCategory.ECOMMERCE) score += 50;
      if (type.includes('portfolio') && template.category === TemplateCategory.PORTFOLIO) score += 50;
      if (type.includes('docs') && template.category === TemplateCategory.DOCUMENTATION) score += 50;
      if (type.includes('landing') && template.category === TemplateCategory.LANDING) score += 50;
      if (type.includes('dashboard') && template.category === TemplateCategory.DASHBOARD) score += 50;
    }
    
    // Match by keywords
    const keywords = (analysis.keywords || []).map(k => k.toLowerCase());
    for (const tag of template.tags) {
      if (keywords.includes(tag)) score += 10;
    }
    
    // Match by name/description
    const desc = (analysis.description || '').toLowerCase();
    for (const tag of template.tags) {
      if (desc.includes(tag)) score += 5;
    }
    
    // Match by features detected
    if (analysis.features) {
      if (analysis.features.hasLogin && template.focusAreas?.includes('dashboard')) score += 15;
      if (analysis.features.hasCart && template.category === TemplateCategory.ECOMMERCE) score += 30;
      if (analysis.features.hasPricing && template.script?.includePricing) score += 10;
    }
    
    scores[id] = score;
  }
  
  // Sort by score and return top 3
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => DEMO_TEMPLATES[id]);
}

/**
 * Create a custom template from existing settings
 * @param {string} name - Template name
 * @param {Object} settings - Template settings
 * @returns {DemoTemplate}
 */
export function createCustomTemplate(name, settings) {
  const id = `custom_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  
  return {
    id,
    name,
    description: settings.description || `Custom template: ${name}`,
    category: settings.category || 'custom',
    tags: settings.tags || ['custom'],
    isCustom: true,
    ...settings
  };
}

/**
 * Export template to JSON
 * @param {string} templateId 
 * @returns {string} JSON string
 */
export function exportTemplate(templateId) {
  const template = getTemplate(templateId);
  if (!template) throw new Error(`Template not found: ${templateId}`);
  return JSON.stringify(template, null, 2);
}

/**
 * Import template from JSON
 * @param {string} json 
 * @returns {DemoTemplate}
 */
export function importTemplate(json) {
  const template = JSON.parse(json);
  
  // Validate required fields
  if (!template.id || !template.name || !template.settings) {
    throw new Error('Invalid template: missing required fields');
  }
  
  return template;
}

// Default export
export default {
  TemplateCategory,
  DEMO_TEMPLATES,
  getAllTemplates,
  getTemplate,
  getTemplatesByCategory,
  searchTemplates,
  getCategories,
  applyTemplate,
  suggestTemplates,
  createCustomTemplate,
  exportTemplate,
  importTemplate
};
