/**
 * L👀K Editor - Main Application
 */

import { PreviewRenderer } from './preview-renderer.js';
import { API } from './api.js';
import { toast } from './toast.js';
import { KeyboardShortcuts } from './keyboard.js';
import { Timeline } from './timeline.js';
import { AutoSave } from './autosave.js';
import { LivePreview } from './live-preview.js';
import { Onboarding } from './onboarding.js';
import { SettingsManager } from './settings.js';
import { handleError } from './error-boundary.js';

class LookEditor {
  constructor() {
    this.currentProject = null;
    this.previewRenderer = null;
    this.livePreview = null;
    this.liveSessionId = null;
    this.isLiveRecording = false;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.keyboard = null;
    this.timeline = null;
    this.autoSave = null;
    this.isFullscreen = false;
    this.wsReconnectAttempts = 0;
    this.wsMaxReconnectDelay = 30000; // 30 seconds max
    
    this.elements = {
      // Start screen
      startScreen: document.getElementById('start-screen'),
      analyzeForm: document.getElementById('analyze-form'),
      urlInput: document.getElementById('url-input'),
      importBtn: document.getElementById('import-btn'),
      importModal: document.getElementById('import-modal'),
      importUrlInput: document.getElementById('import-url'),
      importTypeSelect: document.getElementById('import-type'),
      importStartBtn: document.getElementById('import-start-btn'),
      importCancelBtn: document.getElementById('import-cancel-btn'),
      importCloseBtn: document.getElementById('import-close-btn'),
      importBranch: document.getElementById('import-branch'),
      importShallow: document.getElementById('import-shallow'),
      importGitOptions: document.getElementById('import-git-options'),
      importProgressSection: document.getElementById('import-progress-section'),
      importProgressBar: document.getElementById('import-progress-bar'),
      importStage: document.getElementById('import-stage'),
      importPercent: document.getElementById('import-percent'),
      projectsList: document.getElementById('projects-list'),
      dropZone: document.getElementById('drop-zone'),
      liveRecordBtn: document.getElementById('live-record-btn'),
      
      // Editor screen
      editorScreen: document.getElementById('editor-screen'),
      exportBtn: document.getElementById('export-btn'),
      backBtn: document.getElementById('back-btn'),
      
      // Live preview
      livePreviewPanel: document.getElementById('live-preview-panel'),
      livePreviewContainer: document.getElementById('live-preview-container'),
      
      // Video
      videoContainer: document.getElementById('video-container'),
      previewVideo: document.getElementById('preview-video'),
      cursorOverlay: document.getElementById('cursor-overlay'),
      playBtn: document.getElementById('play-btn'),
      seekBar: document.getElementById('seek-bar'),
      timeDisplay: document.getElementById('time-display'),
      fullscreenBtn: document.getElementById('fullscreen-btn'),
      volumeBtn: document.getElementById('volume-btn'),
      playbackSpeed: document.getElementById('playback-speed'),
      
      // Timeline
      timeline: document.getElementById('timeline'),
      timelineTrack: document.getElementById('timeline-track'),
      timelineProgress: document.getElementById('timeline-progress'),
      playhead: document.getElementById('playhead'),
      trimStart: document.getElementById('trim-start'),
      trimEnd: document.getElementById('trim-end'),
      timeMarkers: document.querySelectorAll('.time-marker'),
      timelineContainer: document.getElementById('timeline-container'),
      
      // Script
      scriptEditor: document.getElementById('script-editor'),
      voiceSelect: document.getElementById('voice-select'),
      regenerateVoiceBtn: document.getElementById('regenerate-voice-btn'),
      analysisDisplay: document.getElementById('analysis-display'),
      scriptWordCount: document.getElementById('script-word-count'),
      
      // Settings
      zoomMode: document.getElementById('zoom-mode'),
      zoomIntensity: document.getElementById('zoom-intensity'),
      zoomSpeed: document.getElementById('zoom-speed'),
      cursorStyle: document.getElementById('cursor-style'),
      cursorSize: document.getElementById('cursor-size'),
      cursorColor: document.getElementById('cursor-color'),
      clickEffect: document.getElementById('click-effect'),
      clickColor: document.getElementById('click-color'),
      exportPreset: document.getElementById('export-preset'),
      
      // Advanced Settings
      videoResolution: document.getElementById('video-resolution'),
      frameRate: document.getElementById('frame-rate'),
      demoDuration: document.getElementById('demo-duration'),
      
      // Intro/Outro
      enableIntro: document.getElementById('enable-intro'),
      introTitle: document.getElementById('intro-title'),
      introTheme: document.getElementById('intro-theme'),
      enableOutro: document.getElementById('enable-outro'),
      outroCta: document.getElementById('outro-cta'),
      
      // Branding
      enableWatermark: document.getElementById('enable-watermark'),
      watermarkText: document.getElementById('watermark-text'),
      watermarkPosition: document.getElementById('watermark-position'),
      watermarkOpacity: document.getElementById('watermark-opacity'),
      enableProgressBar: document.getElementById('enable-progress-bar'),
      progressBarStyle: document.getElementById('progress-bar-style'),
      
      // Device Frame
      enableDeviceFrame: document.getElementById('enable-device-frame'),
      deviceType: document.getElementById('device-type'),
      deviceShadow: document.getElementById('device-shadow'),
      
      // Subtitles
      enableSubtitles: document.getElementById('enable-subtitles'),
      subtitleStyle: document.getElementById('subtitle-style'),
      subtitlePosition: document.getElementById('subtitle-position'),
      
      // Tabs
      tabBtns: document.querySelectorAll('.tab-btn'),
      scriptTab: document.getElementById('script-tab'),
      settingsTab: document.getElementById('settings-tab'),
      markersTab: document.getElementById('markers-tab'),
      
      // Markers panel
      markersList: document.getElementById('markers-list'),
      addMarkerBtn: document.getElementById('add-marker-btn'),
      generateMarkersBtn: document.getElementById('generate-markers-btn'),
      clearMarkersBtn: document.getElementById('clear-markers-btn'),
      
      // Status
      statusMessage: document.getElementById('status-message'),
      progressContainer: document.getElementById('progress-container'),
      progressBar: document.getElementById('progress-bar'),
      autoSaveIndicator: document.getElementById('autosave-indicator'),
      
      // Export modal
      exportModal: document.getElementById('export-modal'),
      exportFormat: document.getElementById('export-format'),
      exportProgress: document.getElementById('export-progress'),
      exportProgressBar: document.getElementById('export-progress-bar'),
      exportStatus: document.getElementById('export-status'),
      cancelExport: document.getElementById('cancel-export'),
      startExport: document.getElementById('start-export'),
      exportCloseBtn: document.getElementById('export-close-btn'),
      
      // Export tabs
      exportTabs: document.querySelectorAll('.export-tab'),
      exportVideoOptions: document.getElementById('export-video-options'),
      exportGifOptions: document.getElementById('export-gif-options'),
      exportThumbnailOptions: document.getElementById('export-thumbnail-options'),
      
      // GIF export
      gifQuality: document.getElementById('gif-quality'),
      gifFps: document.getElementById('gif-fps'),
      gifWidth: document.getElementById('gif-width'),
      gifStart: document.getElementById('gif-start'),
      gifEnd: document.getElementById('gif-end'),
      gifLoop: document.getElementById('gif-loop'),
      gifPreview: document.getElementById('gif-preview'),
      
      // Thumbnail export
      thumbnailPreview: document.getElementById('thumbnail-preview'),
      thumbnailSeek: document.getElementById('thumbnail-seek'),
      thumbnailPreset: document.getElementById('thumbnail-preset'),
      thumbnailFormat: document.getElementById('thumbnail-format'),
      thumbnailAddTitle: document.getElementById('thumbnail-add-title'),
      thumbnailTitleText: document.getElementById('thumbnail-title-text'),
      thumbnailAddLogo: document.getElementById('thumbnail-add-logo'),
      thumbnailPrev: document.getElementById('thumbnail-prev'),
      thumbnailNext: document.getElementById('thumbnail-next'),
      
      // Overlay settings
      enableLowerThirds: document.getElementById('enable-lower-thirds'),
      lowerThirdsName: document.getElementById('lower-thirds-name'),
      lowerThirdsTitle: document.getElementById('lower-thirds-title'),
      lowerThirdsStyle: document.getElementById('lower-thirds-style'),
      lowerThirdsPosition: document.getElementById('lower-thirds-position'),
      enableKeyboardVisual: document.getElementById('enable-keyboard-visual'),
      keyboardStyle: document.getElementById('keyboard-style'),
      keyboardPosition: document.getElementById('keyboard-position'),
      keyboardSize: document.getElementById('keyboard-size'),
      enableCallouts: document.getElementById('enable-callouts'),
      calloutTools: document.querySelectorAll('.callout-tool'),
      calloutColor: document.getElementById('callout-color'),
      calloutAnimation: document.getElementById('callout-animation'),
      transitionStyle: document.getElementById('transition-style'),
      transitionDuration: document.getElementById('transition-duration')
    };
    
    this.init();
  }
  
  async init() {
    this.setupEventListeners();
    this.setupAccessibility();
    this.setupDragAndDrop();
    this.setupKeyboardShortcuts();
    this.setupAutoSave();
    this.connectWebSocket();
    await this.loadRecentProjects();
    // Initialize settings manager and onboarding experience
    try {
      this.settingsManager = new SettingsManager(this);
      this.settingsManager.init();
    } catch (e) {
      console.warn('Settings manager failed to initialize', e);
    }

    try {
      this.onboarding = new Onboarding();
      this.onboarding.start();
    } catch (e) {
      console.warn('Onboarding failed to start', e);
    }
    
    // Check for project ID in URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      this.loadProject(hash);
    }
  }
  
  setupKeyboardShortcuts() {
    this.keyboard = new KeyboardShortcuts(this);
  }
  
  setupAutoSave() {
    this.autoSave = new AutoSave({
      interval: 30000,
      onSave: async () => {
        if (this.currentProject?.id) {
          await this.saveProject(true); // silent save
        }
      },
      onError: (error) => {
        console.error('Auto-save failed:', error);
      }
    });
  }
  
  setupDragAndDrop() {
    const startScreen = this.elements.startScreen;
    if (!startScreen) return;
    
    startScreen.addEventListener('dragover', (e) => {
      e.preventDefault();
      startScreen.classList.add('drag-over');
    });
    
    startScreen.addEventListener('dragleave', () => {
      startScreen.classList.remove('drag-over');
    });
    
    startScreen.addEventListener('drop', (e) => {
      e.preventDefault();
      startScreen.classList.remove('drag-over');
      
      // Check for URL in dropped data
      const text = e.dataTransfer.getData('text/plain');
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        this.elements.urlInput.value = text;
        this.analyzeUrl(text);
      }
    });
  }
  
  setupEventListeners() {
    // Analyze form
    this.elements.analyzeForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.analyzeUrl(this.elements.urlInput.value);
    });
    
    // Live record button
    this.elements.liveRecordBtn?.addEventListener('click', () => {
      const url = this.elements.urlInput.value;
      if (url) {
        this.startLiveRecording(url);
      } else {
        toast.error('Please enter a URL first');
      }
    });
    
    // Back button
    this.elements.backBtn?.addEventListener('click', () => {
      if (this.isLiveRecording) {
        if (confirm('Stop live recording and go back?')) {
          this.stopLiveRecording();
          this.showStartScreen();
        }
      } else {
        this.showStartScreen();
      }
    });

    // Import button / modal
    this.elements.importBtn?.addEventListener('click', () => this.showImportModal());
    this.elements.importStartBtn?.addEventListener('click', () => this.startImport());
    this.elements.importCancelBtn?.addEventListener('click', () => this.hideImportModal());
    this.elements.importCloseBtn?.addEventListener('click', () => this.hideImportModal());
    
    // Show/hide git options based on import type
    this.elements.importTypeSelect?.addEventListener('change', (e) => {
      const isGit = e.target.value === 'git';
      this.elements.importGitOptions?.classList.toggle('hidden', !isGit);
    });
    
    // Close import modal on backdrop click
    this.elements.importModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.importModal) {
        this.hideImportModal();
      }
    });
    
    // Video controls
    this.elements.playBtn?.addEventListener('click', () => this.togglePlayback());
    this.elements.seekBar?.addEventListener('input', (e) => this.seekTo(e.target.value));
    this.elements.previewVideo?.addEventListener('timeupdate', () => this.updateTimeDisplay());
    this.elements.previewVideo?.addEventListener('loadedmetadata', () => this.onVideoLoaded());
    this.elements.previewVideo?.addEventListener('ended', () => this.onVideoEnded());
    this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    this.elements.volumeBtn?.addEventListener('click', () => this.toggleMute());
    this.elements.playbackSpeed?.addEventListener('change', (e) => this.setPlaybackSpeed(e.target.value));
    
    // Timeline click to seek
    this.elements.timelineTrack?.addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.seekToPercent(percent);
    });
    
    // Script editing
    this.elements.regenerateVoiceBtn?.addEventListener('click', () => this.regenerateVoice());
    this.elements.scriptEditor?.addEventListener('input', () => {
      this.updateWordCount();
      this.autoSave?.markDirty();
    });
    
    // Settings changes - all form controls that affect project settings
    const settingsInputs = [
      // Basic settings
      'zoomMode', 'zoomIntensity', 'zoomSpeed',
      'cursorStyle', 'cursorSize', 'cursorColor',
      'clickEffect', 'clickColor', 'exportPreset',
      // Advanced settings
      'videoResolution', 'frameRate', 'demoDuration',
      // Intro/Outro
      'enableIntro', 'introTitle', 'introTheme',
      'enableOutro', 'outroCta',
      // Branding
      'enableWatermark', 'watermarkText', 'watermarkPosition', 'watermarkOpacity',
      'enableProgressBar', 'progressBarStyle',
      // Device Frame
      'enableDeviceFrame', 'deviceType', 'deviceShadow',
      // Subtitles
      'enableSubtitles', 'subtitleStyle', 'subtitlePosition'
    ];
    
    settingsInputs.forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => {
          this.onSettingsChange();
          this.autoSave?.markDirty();
        });
        // Also listen for input on text fields
        if (el.type === 'text' || el.type === 'number') {
          el.addEventListener('input', () => {
            this.autoSave?.markDirty();
          });
        }
      }
    });
    
    // Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Export
    this.elements.exportBtn?.addEventListener('click', () => this.showExportModal());
    this.elements.cancelExport?.addEventListener('click', () => this.cancelExport());
    this.elements.startExport?.addEventListener('click', () => this.startExport());
    this.elements.exportCloseBtn?.addEventListener('click', () => this.hideExportModal());
    
    // Export tabs
    this.elements.exportTabs?.forEach(tab => {
      tab.addEventListener('click', () => this.switchExportTab(tab.dataset.type));
    });
    
    // Thumbnail controls
    this.elements.thumbnailSeek?.addEventListener('input', (e) => this.updateThumbnailPreview(e.target.value));
    this.elements.thumbnailPrev?.addEventListener('click', () => this.seekThumbnail(-1));
    this.elements.thumbnailNext?.addEventListener('click', () => this.seekThumbnail(1));
    this.elements.thumbnailPreset?.addEventListener('change', (e) => this.onThumbnailPresetChange(e.target.value));
    this.elements.thumbnailAddTitle?.addEventListener('change', (e) => {
      document.getElementById('thumbnail-title-input').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Callout tools
    this.elements.calloutTools?.forEach(tool => {
      tool.addEventListener('click', () => this.selectCalloutTool(tool.dataset.tool));
    });
    
    // Overlay settings
    const overlayInputs = [
      'enableLowerThirds', 'lowerThirdsName', 'lowerThirdsTitle', 'lowerThirdsStyle', 'lowerThirdsPosition',
      'enableKeyboardVisual', 'keyboardStyle', 'keyboardPosition', 'keyboardSize',
      'enableCallouts', 'calloutColor', 'calloutAnimation',
      'transitionStyle', 'transitionDuration'
    ];
    overlayInputs.forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => {
          this.onOverlaySettingsChange();
          this.autoSave?.markDirty();
        });
      }
    });
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const text = link.textContent.trim().toLowerCase();
        if (text === 'templates') this.showTemplatesPage();
        else if (text === 'docs') this.showDocsPage();
        else this.showEditorPage();
      });
    });
    
    // Close modal on backdrop click
    this.elements.exportModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.exportModal) {
        this.hideExportModal();
      }
    });
    
    // Fullscreen change detection
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.elements.videoContainer?.classList.toggle('is-fullscreen', this.isFullscreen);
    });
    
    // Add marker button
    this.elements.addMarkerBtn?.addEventListener('click', () => this.addMarkerAtCurrentTime());
    this.elements.generateMarkersBtn?.addEventListener('click', () => this.generateMarkersFromClicks());
    this.elements.clearMarkersBtn?.addEventListener('click', () => this.clearAllMarkers());
    
    // Copy YouTube chapters button
    this.elements.copyChaptersBtn = document.getElementById('copy-chapters-btn');
    this.elements.copyChaptersBtn?.addEventListener('click', () => this.copyYouTubeChapters());
    
    // Collapsible advanced settings sections
    document.querySelectorAll('.settings-section.collapsible .section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.settings-section');
        section.classList.toggle('collapsed');
        const content = section.querySelector('.section-content');
        const toggle = section.querySelector('.toggle-icon');
        if (section.classList.contains('collapsed')) {
          content.style.maxHeight = '0';
          if (toggle) toggle.textContent = '▶';
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
          if (toggle) toggle.textContent = '▼';
        }
      });
    });
  }

  setupAccessibility() {
    // Skip link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.prepend(skipLink);

    // Role and aria attributes
    document.querySelector('.header')?.setAttribute('role', 'banner');
    document.querySelector('.main')?.setAttribute('role', 'main');
    document.querySelector('.main')?.setAttribute('id', 'main-content');
    document.querySelector('.sidebar')?.setAttribute('role', 'complementary');

    // Make buttons accessible
    document.querySelectorAll('button').forEach(btn => {
      if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
        btn.setAttribute('aria-label', btn.title || 'Button');
      }
    });

    // Announce region
    this.statusRegion = document.createElement('div');
    this.statusRegion.setAttribute('role', 'status');
    this.statusRegion.setAttribute('aria-live', 'polite');
    this.statusRegion.className = 'sr-only';
    document.body.appendChild(this.statusRegion);
  }
  
  // Tab switching
  switchTab(tabName) {
    this.elements.tabBtns.forEach(b => b.classList.remove('active'));
    const activeBtn = [...this.elements.tabBtns].find(b => b.dataset.tab === tabName);
    if (activeBtn) activeBtn.classList.add('active');
    
    this.elements.scriptTab?.classList.toggle('hidden', tabName !== 'script');
    this.elements.settingsTab?.classList.toggle('hidden', tabName !== 'settings');
    this.elements.markersTab?.classList.toggle('hidden', tabName !== 'markers');
  }
  
  // New project
  newProject() {
    if (this.autoSave?.isDirty()) {
      if (!confirm('You have unsaved changes. Start a new project anyway?')) {
        return;
      }
    }
    this.showStartScreen();
    this.elements.urlInput.value = '';
    this.elements.urlInput.focus();
  }
  
  // Save project
  async saveProject(silent = false) {
    if (!this.currentProject?.id) return;
    
    try {
      await API.updateProject(this.currentProject.id, {
        settings: this.getSettings(),
        script: this.elements.scriptEditor?.value,
        timeline: {
          markers: this.currentProject.markers || []
        }
      });
      
      this.autoSave?.markClean();
      
      if (!silent) {
        toast.success('Project saved');
      }
      
      // Update autosave indicator
      if (this.elements.autoSaveIndicator) {
        this.elements.autoSaveIndicator.textContent = 'Saved';
        this.elements.autoSaveIndicator.classList.add('saved');
        setTimeout(() => {
          this.elements.autoSaveIndicator.classList.remove('saved');
        }, 2000);
      }
    } catch (error) {
      if (!silent) {
        toast.error(`Failed to save: ${error.message}`);
      }
    }
  }
  
  // Fullscreen
  toggleFullscreen() {
    const container = this.elements.videoContainer;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || 
      container.webkitRequestFullscreen?.() ||
      container.mozRequestFullScreen?.();
    } else {
      document.exitFullscreen?.() ||
      document.webkitExitFullscreen?.() ||
      document.mozCancelFullScreen?.();
    }
  }
  
  handleEscape() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (!this.elements.exportModal?.classList.contains('hidden')) {
      this.hideExportModal();
    } else if (this.keyboard?.helpVisible) {
      this.keyboard.hideHelp();
    }
  }
  
  // Page navigation
  showEditorPage() {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[href="#editor"]')?.classList.add('active');
    
    document.getElementById('templates-page')?.classList.add('hidden');
    document.getElementById('docs-page')?.classList.add('hidden');
    document.querySelector('.main')?.classList.remove('hidden');
    document.querySelector('.sidebar')?.classList.remove('hidden');
  }
  
  showTemplatesPage() {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[href="#templates"]')?.classList.add('active');
    
    document.querySelector('.main')?.classList.add('hidden');
    document.querySelector('.sidebar')?.classList.add('hidden');
    document.getElementById('docs-page')?.classList.add('hidden');
    
    const templatesPage = document.getElementById('templates-page');
    if (templatesPage) {
      templatesPage.classList.remove('hidden');
      this.setupTemplateCards();
    }
  }
  
  showDocsPage() {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[href="#docs"]')?.classList.add('active');
    
    document.querySelector('.main')?.classList.add('hidden');
    document.querySelector('.sidebar')?.classList.add('hidden');
    document.getElementById('templates-page')?.classList.add('hidden');
    
    const docsPage = document.getElementById('docs-page');
    if (docsPage) {
      docsPage.classList.remove('hidden');
      this.setupDocsNavigation();
    }
  }
  
  setupTemplateCards() {
    const templateCards = document.querySelectorAll('.template-card');
    templateCards.forEach(card => {
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';
      
      card.addEventListener('click', () => {
        const templateName = card.dataset.template;
        this.loadTemplate(templateName);
      });
    });
  }
  
  async loadTemplate(templateName) {
    const templateConfigs = {
      'saas-landing': { 
        preset: 'saas',
        settings: {
          zoom: { mode: 'smart', intensity: 60, speed: 'medium' },
          cursor: { style: 'pointer', size: 28 },
          click: { effect: 'ripple', color: '#3B82F6' },
          duration: 30
        },
        description: 'Optimized for product pages with feature highlights and CTAs'
      },
      'ecommerce': { 
        preset: 'ecommerce',
        settings: {
          zoom: { mode: 'follow', intensity: 50, speed: 'medium' },
          cursor: { style: 'pointer', size: 24 },
          click: { effect: 'pulse', color: '#10B981' },
          duration: 40
        },
        description: 'Perfect for showcasing products and cart experiences'
      },
      'portfolio': { 
        preset: 'portfolio',
        settings: {
          zoom: { mode: 'basic', intensity: 40, speed: 'slow' },
          cursor: { style: 'dot', size: 20 },
          click: { effect: 'ring', color: '#8B5CF6' },
          duration: 50
        },
        description: 'Elegant scrolling through creative work'
      },
      'documentation': { 
        preset: 'docs',
        settings: {
          zoom: { mode: 'smart', intensity: 70, speed: 'medium' },
          cursor: { style: 'default', size: 24 },
          click: { effect: 'spotlight', color: '#F59E0B' },
          duration: 60
        },
        description: 'Clear navigation of code examples and references'
      },
      'mobile-app': { 
        preset: 'mobile',
        settings: {
          zoom: { mode: 'follow', intensity: 80, speed: 'fast' },
          cursor: { style: 'circle', size: 32 },
          click: { effect: 'ripple', color: '#EC4899' },
          duration: 20,
          deviceFrame: true
        },
        description: 'Mobile experiences with touch-friendly interactions'
      },
      'dashboard': { 
        preset: 'dashboard',
        settings: {
          zoom: { mode: 'smart', intensity: 55, speed: 'medium' },
          cursor: { style: 'pointer', size: 24 },
          click: { effect: 'pulse', color: '#06B6D4' },
          duration: 45
        },
        description: 'Highlight analytics and data visualizations'
      }
    };
    
    const config = templateConfigs[templateName];
    if (!config) {
      toast.error('Template not found');
      return;
    }
    
    // Apply template settings to UI
    const { settings } = config;
    
    // Zoom settings
    if (this.elements.zoomMode && settings.zoom) {
      this.elements.zoomMode.value = settings.zoom.mode;
    }
    if (this.elements.zoomIntensity && settings.zoom) {
      this.elements.zoomIntensity.value = settings.zoom.intensity;
    }
    if (this.elements.zoomSpeed && settings.zoom) {
      this.elements.zoomSpeed.value = settings.zoom.speed;
    }
    
    // Cursor settings
    if (this.elements.cursorStyle && settings.cursor) {
      this.elements.cursorStyle.value = settings.cursor.style;
    }
    if (this.elements.cursorSize && settings.cursor) {
      this.elements.cursorSize.value = settings.cursor.size;
    }
    
    // Click effect settings
    if (this.elements.clickEffect && settings.click) {
      this.elements.clickEffect.value = settings.click.effect;
    }
    if (this.elements.clickColor && settings.click) {
      this.elements.clickColor.value = settings.click.color;
    }
    
    // Store template for later use
    this.currentTemplate = { name: templateName, ...config };
    
    // Switch to editor
    this.showEditorPage();
    
    // Show detailed toast
    toast.success(`${templateName.replace('-', ' ')} template applied!`);
    toast.info(config.description, 5000);
    this.elements.urlInput?.focus();
  }
  
  setupDocsNavigation() {
    // Support both .docs-nav-item and .docs-link selectors
    const navItems = document.querySelectorAll('.docs-nav-item, .docs-link');
    navItems.forEach(item => {
      if (item.dataset.bound) return;
      item.dataset.bound = 'true';
      
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        // Support both data-doc and href attributes
        const docId = item.dataset.doc || item.getAttribute('href')?.replace('#', '');
        if (docId) this.loadDocContent(docId);
      });
    });
  }
  
  loadDocContent(docId) {
    const docsContent = {
      'quickstart': this.getQuickStartDoc(),
      'installation': this.getInstallationDoc(),
      'api-keys': this.getApiKeysDoc(),
      'recording': this.getRecordingDoc(),
      'live-recording': this.getLiveRecordingDoc(),
      'voiceover': this.getVoiceoverDoc(),
      'export': this.getExportDoc(),
      'cli': this.getCliDoc(),
      'api': this.getApiDoc(),
      'customization': this.getCustomizationDoc()
    };
    
    const content = docsContent[docId] || '<h1>Document not found</h1>';
    const docsContentEl = document.getElementById('docs-content');
    if (docsContentEl) {
      docsContentEl.innerHTML = content;
    }
  }
  
  getQuickStartDoc() {
    return `
      <h1>Quick Start</h1>
      <p>Get started with L👀K in just a few minutes.</p>
      <h2>1. Enter a URL</h2>
      <p>Paste any website URL in the input field. L👀K will analyze the page structure.</p>
      <h2>2. Generate or Record</h2>
      <p><strong>Generate Demo</strong> - Let AI automatically create a professional demo.</p>
      <p><strong>Live Record</strong> - Take manual control and record your own demo.</p>
      <h2>3. Edit & Customize</h2>
      <p>Edit voiceover, add markers, adjust zoom and cursor style.</p>
      <h2>4. Export</h2>
      <p>Export optimized for YouTube, Twitter, Instagram, or TikTok.</p>
    `;
  }
  
  getInstallationDoc() {
    return `
      <h1>Installation</h1>
      <h2>Docker (Recommended)</h2>
      <pre><code>docker run -p 3000:3000 ghcr.io/nirholas/look:latest</code></pre>
      <h2>NPM</h2>
      <pre><code>npm install -g @nirholas/look
look serve</code></pre>
      <h2>From Source</h2>
      <pre><code>git clone https://github.com/nirholas/LooK
cd LooK && npm install
npm run start</code></pre>
    `;
  }
  
  getApiKeysDoc() {
    return `
      <h1>API Keys Setup</h1>
      <p>L👀K uses AI for intelligent analysis and voiceover generation.</p>
      <h2>OpenAI API Key</h2>
      <p>Required for GPT-4 Vision analysis and voiceover script generation.</p>
      <ol>
        <li>Go to <a href="https://platform.openai.com" target="_blank">OpenAI Platform</a></li>
        <li>Create an API key</li>
        <li>Add it in Settings → API Keys</li>
      </ol>
      <h2>Groq API Key (Optional)</h2>
      <p>Alternative for faster inference with Llama models.</p>
    `;
  }
  
  getRecordingDoc() {
    return `
      <h1>Recording</h1>
      <p>L👀K offers two recording modes:</p>
      <h2>AI-Generated Demo</h2>
      <p>Click "Generate Demo" to let AI analyze your site and create an optimized demo automatically.</p>
      <h2>Manual Recording</h2>
      <p>Use "Live Record" for full control over every interaction.</p>
      <h2>Recording Settings</h2>
      <ul>
        <li><strong>Resolution</strong> - 1080p or 4K output</li>
        <li><strong>Framerate</strong> - 30 or 60 FPS</li>
        <li><strong>Duration</strong> - Auto or custom length</li>
      </ul>
    `;
  }
  
  getLiveRecordingDoc() {
    return `
      <h1>Live Recording</h1>
      <p>Live recording gives you complete control over your demo.</p>
      <h2>Controls</h2>
      <ul>
        <li><strong>Start/Stop</strong> - Begin and end recording</li>
        <li><strong>Pause</strong> - Temporarily pause without stopping</li>
        <li><strong>Screenshot</strong> - Capture current frame</li>
      </ul>
      <h2>Tips</h2>
      <ul>
        <li>Use smooth, deliberate mouse movements</li>
        <li>Pause between actions for clarity</li>
        <li>Add markers for chapter points</li>
      </ul>
    `;
  }
  
  getVoiceoverDoc() {
    return `
      <h1>AI Voiceover</h1>
      <p>Automatically generate professional voiceovers for your demos.</p>
      <h2>Script Generation</h2>
      <p>AI analyzes your recording and generates a natural script that explains each action.</p>
      <h2>Voice Options</h2>
      <ul>
        <li><strong>alloy</strong> - Neutral, professional</li>
        <li><strong>echo</strong> - Warm, conversational</li>
        <li><strong>fable</strong> - Expressive, dynamic</li>
        <li><strong>onyx</strong> - Deep, authoritative</li>
        <li><strong>nova</strong> - Bright, energetic</li>
        <li><strong>shimmer</strong> - Soft, calming</li>
      </ul>
    `;
  }
  
  getExportDoc() {
    return `
      <h1>Exporting</h1>
      <h2>Export Formats</h2>
      <table>
        <tr><th>Platform</th><th>Resolution</th><th>Format</th></tr>
        <tr><td>YouTube</td><td>1920×1080</td><td>MP4 H.264</td></tr>
        <tr><td>Twitter</td><td>1280×720</td><td>MP4 H.264</td></tr>
        <tr><td>Instagram</td><td>1080×1080</td><td>MP4 H.264</td></tr>
        <tr><td>TikTok</td><td>1080×1920</td><td>MP4 H.264</td></tr>
      </table>
      <h2>Quality Settings</h2>
      <p>Choose between speed and quality for your export.</p>
    `;
  }
  
  getCliDoc() {
    return `
      <h1>CLI Reference</h1>
      <h2>Commands</h2>
      <pre><code>look record &lt;url&gt;       # Record a demo
look analyze &lt;url&gt;      # Analyze a website
look render &lt;project&gt;   # Render a project
look serve              # Start the web UI</code></pre>
      <h2>Options</h2>
      <pre><code>--output, -o    Output file path
--format, -f    Output format (mp4, webm, gif)
--quality, -q   Quality preset (draft, normal, high)
--voice, -v     Voice for narration</code></pre>
    `;
  }
  
  getApiDoc() {
    return `
      <h1>REST API</h1>
      <h2>Endpoints</h2>
      <h3>POST /api/analyze</h3>
      <p>Analyze a website URL</p>
      <pre><code>{ "url": "https://example.com" }</code></pre>
      <h3>POST /api/record</h3>
      <p>Start recording a demo</p>
      <h3>POST /api/render</h3>
      <p>Render a recorded project</p>
      <h3>GET /api/projects</h3>
      <p>List all projects</p>
    `;
  }
  
  getCustomizationDoc() {
    return `
      <h1>Customization</h1>
      <h2>Cursor Styles</h2>
      <ul>
        <li>Default system cursor</li>
        <li>Custom pointer with trail</li>
        <li>Highlight ring on click</li>
      </ul>
      <h2>Click Effects</h2>
      <ul>
        <li>Ripple animation</li>
        <li>Pulse effect</li>
        <li>None</li>
      </ul>
      <h2>Zoom</h2>
      <p>Auto-zoom focuses on interactive elements during the demo.</p>
    `;
  }
  
  // Volume
  toggleMute() {
    const video = this.elements.previewVideo;
    if (!video) return;
    
    video.muted = !video.muted;
    if (this.elements.volumeBtn) {
      this.elements.volumeBtn.textContent = video.muted ? '🔇' : '🔊';
    }
  }
  
  // Playback speed
  setPlaybackSpeed(speed) {
    const video = this.elements.previewVideo;
    if (video) {
      video.playbackRate = parseFloat(speed);
    }
  }
  
  // Seeking helpers for keyboard shortcuts
  seekRelative(seconds) {
    const video = this.elements.previewVideo;
    if (!video) return;
    
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    video.currentTime = newTime;
  }
  
  stepFrame(direction) {
    const video = this.elements.previewVideo;
    if (!video || !video.paused) return;
    
    // Assume 30fps
    const frameTime = 1 / 30;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + direction * frameTime));
  }
  
  // Word count for script
  updateWordCount() {
    const script = this.elements.scriptEditor?.value || '';
    const words = script.trim().split(/\s+/).filter(w => w.length > 0).length;
    const estimatedDuration = Math.ceil(words / 2.5); // ~150 wpm
    
    if (this.elements.scriptWordCount) {
      this.elements.scriptWordCount.textContent = `${words} words • ~${estimatedDuration}s`;
    }
  }
  
  // Video ended
  onVideoEnded() {
    if (this.elements.playBtn) {
      this.elements.playBtn.textContent = '▶️';
    }
    this.stopPreviewLoop();
  }
  
  connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      toast.success('Connected to server');
    };

    this.ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this.handleWebSocketMessage(type, data);
    };

    this.ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts || 0), 30000);
      this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
      console.log(`WebSocket disconnected, reconnecting in ${delay}ms...`);
      setTimeout(() => this.connectWebSocket(), delay);
    };

    this.ws.onerror = (e) => {
      console.warn('WebSocket error', e);
      toast.warning('Connection lost, attempting to reconnect...');
    };
  }
  
  handleWebSocketMessage(type, data) {
    switch (type) {
      case 'status':
        this.setStatus(data.message);
        if (data.progress !== undefined) {
          this.setProgress(data.progress);
        }
        break;
        
      case 'error':
        this.setStatus(`Error: ${data.message}`, 'error');
        toast.error(data.message);
        break;
        
      case 'render-progress':
        if (this.elements.exportProgress) {
          this.elements.exportProgressBar.style.width = `${data.progress}%`;
          this.elements.exportStatus.textContent = data.stage === 'complete' 
            ? 'Complete!' 
            : `${data.stage}... ${data.progress}%`;
        }
        if (data.stage === 'complete') {
          toast.success('Video rendered successfully!');
        }
        break;
    }
  }
  
  async loadRecentProjects() {
    try {
      const { projects } = await API.getProjects();
      this.renderProjectsList(projects);
      
      // Also load dashboard stats
      this.loadDashboardStats();
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }
  
  async loadDashboardStats() {
    try {
      const stats = await API.getStats();
      
      const projectsEl = document.getElementById('stat-projects');
      const recordingsEl = document.getElementById('stat-recordings');
      const exportsEl = document.getElementById('stat-exports');
      const uptimeEl = document.getElementById('stat-uptime');
      
      if (projectsEl) projectsEl.textContent = stats.projectsCreated || 0;
      if (recordingsEl) recordingsEl.textContent = stats.recordingsStarted || 0;
      if (exportsEl) exportsEl.textContent = stats.exportsCompleted || 0;
      if (uptimeEl) uptimeEl.textContent = this.formatUptime(stats.uptime || 0);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }
  
  formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }
  
  renderProjectsList(projects) {
    if (!this.elements.projectsList) return;
    
    this.elements.projectsList.innerHTML = projects.length === 0
      ? '<li class="empty">No recent projects. Enter a URL above to get started!</li>'
      : projects.slice(0, 5).map(p => `
          <li data-id="${p.id}" class="project-item">
            <div class="project-thumbnail">
              ${p.thumbnail 
                ? `<img src="${p.thumbnail}" alt="Project thumbnail" loading="lazy">`
                : `<div class="thumbnail-placeholder">📹</div>`
              }
            </div>
            <div class="project-info">
              <span class="project-name">${this.escapeHtml(p.name || p.url)}</span>
              <span class="project-url">${this.escapeHtml(p.url)}</span>
            </div>
            <div class="project-meta">
              <span class="project-date">${this.formatDate(p.updatedAt)}</span>
              <button class="project-delete" data-id="${p.id}" title="Delete project">🗑️</button>
            </div>
          </li>
        `).join('');
    
    // Add click handlers
    this.elements.projectsList.querySelectorAll('li[data-id]').forEach(li => {
      li.addEventListener('click', (e) => {
        if (!e.target.classList.contains('project-delete')) {
          this.loadProject(li.dataset.id);
        }
      });
    });
    
    // Delete handlers
    this.elements.projectsList.querySelectorAll('.project-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Delete this project?')) {
          await this.deleteProject(btn.dataset.id);
        }
      });
    });
  }
  
  async deleteProject(projectId) {
    try {
      await API.deleteProject(projectId);
      toast.success('Project deleted');
      await this.loadRecentProjects();
    } catch (error) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
  
  async analyzeUrl(url) {
    this.setStatus('Analyzing website...', 'loading');
    this.showProgress();
    this.showLoading('Analyzing website...');
    this.announce('Analyzing website, please wait');
    
    try {
      this.updateLoadingMessage('Running AI analysis...');
      const result = await API.analyze(url);
      this.currentProject = result;
      
      this.setStatus('Analysis complete! Starting recording...');
      this.updateLoadingMessage('Starting recording...');
      
      // Start recording
      const recordResult = await API.record(result.projectId);
      
      // Load the full project
      this.updateLoadingMessage('Loading project...');
      await this.loadProject(result.projectId);
      
      this.hideLoading();
      this.announce('Recording complete');
      
    } catch (error) {
      const userMessage = handleError(error, 'Analyze URL');
      this.setStatus(`Error: ${userMessage}`, 'error');
      toast.error(userMessage);
      this.hideProgress();
      this.hideLoading();
      this.announce(`Error: ${userMessage}`);
    }
  }

  // ================= Importing Projects =================

  showImportModal() {
    const modal = this.elements.importModal;
    if (!modal) return;
    modal.classList.remove('hidden');
    // Reset form state
    if (this.elements.importUrlInput) {
      this.elements.importUrlInput.value = '';
      this.elements.importUrlInput.focus();
    }
    if (this.elements.importTypeSelect) {
      this.elements.importTypeSelect.value = 'auto';
    }
    this.elements.importProgressSection?.classList.add('hidden');
    this.elements.importGitOptions?.classList.add('hidden');
    if (this.elements.importStartBtn) {
      this.elements.importStartBtn.disabled = false;
    }
  }

  hideImportModal() {
    const modal = this.elements.importModal;
    if (!modal) return;
    modal.classList.add('hidden');
    this.elements.importProgressSection?.classList.add('hidden');
  }

  updateImportProgress(progress, stage) {
    if (this.elements.importProgressBar) {
      this.elements.importProgressBar.style.width = `${progress}%`;
    }
    if (this.elements.importPercent) {
      this.elements.importPercent.textContent = `${progress}%`;
    }
    if (this.elements.importStage) {
      const stageLabels = {
        'cloning': 'Cloning repository...',
        'analyzing': 'Analyzing project...',
        'generating': 'Generating analysis...',
        'scripting': 'Creating demo script...',
        'loading': 'Loading website...',
        'capturing': 'Capturing screenshot...',
        'processing': 'Processing...'
      };
      this.elements.importStage.textContent = stageLabels[stage] || stage || 'Processing...';
    }
  }

  async startImport() {
    const url = this.elements.importUrlInput?.value?.trim();
    const type = this.elements.importTypeSelect?.value || 'auto';

    if (!url) { 
      toast.error('Please enter a URL'); 
      return; 
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    // Show progress section
    this.elements.importProgressSection?.classList.remove('hidden');
    this.updateImportProgress(0, 'processing');
    
    // Disable start button
    if (this.elements.importStartBtn) {
      this.elements.importStartBtn.disabled = true;
    }

    this.setStatus('Starting import...');
    this.showProgress();

    try {
      // Build options
      const options = { type };
      if (type === 'git') {
        options.branch = this.elements.importBranch?.value || undefined;
        options.shallow = this.elements.importShallow?.checked !== false;
      }

      const result = await API.importProject(url, options);
      this.currentProjectId = result.projectId;
      
      // Start polling for status
      this.pollImportStatus(result.projectId);
    } catch (error) {
      const userMessage = handleError(error, 'Import');
      toast.error(userMessage);
      this.hideProgress();
      this.elements.importProgressSection?.classList.add('hidden');
      if (this.elements.importStartBtn) {
        this.elements.importStartBtn.disabled = false;
      }
    }
  }

  pollImportStatus(projectId) {
    const poll = async () => {
      try {
        const status = await API.getImportStatus(projectId);

        // Update modal progress
        this.updateImportProgress(status.progress || 0, status.stage);
        
        // Update main progress bar
        this.setProgress(status.progress || 0);
        this.setStatus(`Importing: ${status.stage || 'processing'}...`);

        if (status.status === 'complete') {
          toast.success('Import complete!');
          this.hideImportModal();
          this.loadProject(projectId);
          this.hideProgress();
          return;
        }

        if (status.status === 'error') {
          toast.error(`Import failed: ${status.error || 'Unknown error'}`);
          this.hideProgress();
          this.elements.importProgressSection?.classList.add('hidden');
          if (this.elements.importStartBtn) {
            this.elements.importStartBtn.disabled = false;
          }
          return;
        }

        // Continue polling
        setTimeout(poll, 1000);
      } catch (err) {
        toast.error('Lost connection to import process');
        this.hideProgress();
        this.elements.importProgressSection?.classList.add('hidden');
        if (this.elements.importStartBtn) {
          this.elements.importStartBtn.disabled = false;
        }
      }
    };

    poll();
  }
  
  async loadProject(projectId) {
    this.setStatus('Loading project...');
    
    try {
      const project = await API.getProject(projectId);
      this.currentProject = project;
      
      // Switch to editor view
      this.showEditor();
      
      // Load video
      if (project.hasRawVideo) {
        this.elements.previewVideo.src = `/api/preview/${projectId}/video`;
      }
      
      // Load script
      this.elements.scriptEditor.value = project.script || '';
      
      // Load analysis
      this.renderAnalysis(project.analysis);
      
      // Load settings
      this.loadSettings(project.settings);
      
      // Load markers
      this.currentProject.markers = project.timeline?.markers || [];
      this.renderMarkersPanel();
      
      // Setup preview renderer
      const cursorData = await API.getCursorData(projectId);
      this.previewRenderer = new PreviewRenderer(
        this.elements.previewVideo,
        this.elements.cursorOverlay,
        cursorData
      );
      
      // Enable export
      this.elements.exportBtn.disabled = !project.hasRawVideo;
      
      this.setStatus('Ready');
      this.hideProgress();
      
    } catch (error) {
      this.setStatus(`Error loading project: ${error.message}`, 'error');
    }
  }
  
  showEditor() {
    this.elements.startScreen.classList.add('hidden');
    this.elements.editorScreen.classList.remove('hidden');
  }
  
  showStartScreen() {
    this.elements.editorScreen.classList.add('hidden');
    this.elements.startScreen.classList.remove('hidden');
  }
  
  // Loading overlay management
  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const messageEl = document.getElementById('loading-message');
    if (overlay) {
      if (messageEl) messageEl.textContent = message;
      overlay.classList.remove('hidden');
    }
  }
  
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
  
  updateLoadingMessage(message) {
    const messageEl = document.getElementById('loading-message');
    if (messageEl) messageEl.textContent = message;
  }
  
  // Announce for screen readers
  announce(message) {
    if (this.statusRegion) {
      this.statusRegion.textContent = message;
    }
  }
  
  renderAnalysis(analysis) {
    if (!analysis) {
      this.elements.analysisDisplay.innerHTML = '<em>No analysis available</em>';
      return;
    }
    
    const items = [];
    
    if (analysis.name) {
      items.push(`<div class="analysis-item"><span class="label">Name</span><br>${analysis.name}</div>`);
    }
    if (analysis.tagline) {
      items.push(`<div class="analysis-item"><span class="label">Tagline</span><br>${analysis.tagline}</div>`);
    }
    if (analysis.targetAudience) {
      items.push(`<div class="analysis-item"><span class="label">Audience</span><br>${analysis.targetAudience}</div>`);
    }
    if (analysis.keyFeatures?.length) {
      items.push(`<div class="analysis-item"><span class="label">Key Features</span><br>• ${analysis.keyFeatures.join('<br>• ')}</div>`);
    }
    
    this.elements.analysisDisplay.innerHTML = items.join('') || '<em>No analysis available</em>';
  }
  
  loadSettings(settings) {
    if (!settings) return;
    
    // Video resolution
    if (settings.width && settings.height) {
      const resolution = `${settings.width}x${settings.height}`;
      if (this.elements.videoResolution) this.elements.videoResolution.value = resolution;
    }
    if (this.elements.frameRate && settings.fps) this.elements.frameRate.value = settings.fps;
    if (this.elements.demoDuration && settings.duration) this.elements.demoDuration.value = settings.duration;
    
    // Zoom
    if (settings.zoom) {
      if (this.elements.zoomMode) this.elements.zoomMode.value = settings.zoom.mode || 'smart';
      if (this.elements.zoomIntensity) this.elements.zoomIntensity.value = (settings.zoom.intensity || 0.5) * 100;
      if (this.elements.zoomSpeed) this.elements.zoomSpeed.value = settings.zoom.speed || 'medium';
    }
    
    // Cursor
    if (settings.cursor) {
      if (this.elements.cursorStyle) this.elements.cursorStyle.value = settings.cursor.style || 'default';
      if (this.elements.cursorSize) this.elements.cursorSize.value = settings.cursor.size || 24;
      if (this.elements.cursorColor) this.elements.cursorColor.value = settings.cursor.color || '#000000';
    }
    
    // Click effect
    if (settings.clickEffect) {
      if (this.elements.clickEffect) this.elements.clickEffect.value = settings.clickEffect.type || 'ripple';
      if (this.elements.clickColor) this.elements.clickColor.value = settings.clickEffect.color || '#3B82F6';
    }
    
    // Intro/Outro
    if (settings.intro) {
      if (this.elements.enableIntro) this.elements.enableIntro.checked = settings.intro.enabled || false;
      if (this.elements.introTitle) this.elements.introTitle.value = settings.intro.title || '';
      if (this.elements.introTheme) this.elements.introTheme.value = settings.intro.theme || 'dark';
    }
    if (settings.outro) {
      if (this.elements.enableOutro) this.elements.enableOutro.checked = settings.outro.enabled || false;
      if (this.elements.outroCta) this.elements.outroCta.value = settings.outro.cta || '';
    }
    
    // Branding
    if (settings.watermark) {
      if (this.elements.enableWatermark) this.elements.enableWatermark.checked = settings.watermark.enabled || false;
      if (this.elements.watermarkText) this.elements.watermarkText.value = settings.watermark.text || '';
      if (this.elements.watermarkPosition) this.elements.watermarkPosition.value = settings.watermark.position || 'bottom-right';
      if (this.elements.watermarkOpacity) this.elements.watermarkOpacity.value = (settings.watermark.opacity || 0.5) * 100;
    }
    if (settings.progressBar) {
      if (this.elements.enableProgressBar) this.elements.enableProgressBar.checked = settings.progressBar.enabled || false;
      if (this.elements.progressBarStyle) this.elements.progressBarStyle.value = settings.progressBar.style || 'bar';
    }
    
    // Device Frame
    if (settings.deviceFrame) {
      if (this.elements.enableDeviceFrame) this.elements.enableDeviceFrame.checked = settings.deviceFrame.enabled || false;
      if (this.elements.deviceType) this.elements.deviceType.value = settings.deviceFrame.device || 'none';
      if (this.elements.deviceShadow) this.elements.deviceShadow.checked = settings.deviceFrame.shadow !== false;
    }
    
    // Subtitles
    if (settings.subtitles) {
      if (this.elements.enableSubtitles) this.elements.enableSubtitles.checked = settings.subtitles.enabled || false;
      if (this.elements.subtitleStyle) this.elements.subtitleStyle.value = settings.subtitles.style || 'standard';
      if (this.elements.subtitlePosition) this.elements.subtitlePosition.value = settings.subtitles.position || 'bottom';
    }
    
    // Export
    if (this.elements.exportPreset) this.elements.exportPreset.value = settings.preset || 'youtube';
    if (this.elements.voiceSelect) this.elements.voiceSelect.value = settings.voice || 'nova';
  }
  
  getSettings() {
    // Parse resolution
    const resolutionParts = (this.elements.videoResolution?.value || '1920x1080').split('x');
    const width = parseInt(resolutionParts[0]) || 1920;
    const height = parseInt(resolutionParts[1]) || 1080;
    
    return {
      // Video settings
      width,
      height,
      fps: parseInt(this.elements.frameRate?.value) || 60,
      duration: parseInt(this.elements.demoDuration?.value) || 25,
      
      // Zoom
      zoom: {
        mode: this.elements.zoomMode?.value || 'smart',
        intensity: parseInt(this.elements.zoomIntensity?.value || 50) / 100,
        speed: this.elements.zoomSpeed?.value || 'medium'
      },
      
      // Cursor
      cursor: {
        style: this.elements.cursorStyle?.value || 'default',
        size: parseInt(this.elements.cursorSize?.value) || 24,
        color: this.elements.cursorColor?.value || '#000000'
      },
      
      // Click effects
      clickEffect: {
        type: this.elements.clickEffect?.value || 'ripple',
        color: this.elements.clickColor?.value || '#3B82F6'
      },
      
      // Intro/Outro
      intro: {
        enabled: this.elements.enableIntro?.checked || false,
        title: this.elements.introTitle?.value || '',
        theme: this.elements.introTheme?.value || 'dark'
      },
      outro: {
        enabled: this.elements.enableOutro?.checked || false,
        cta: this.elements.outroCta?.value || ''
      },
      
      // Branding
      watermark: {
        enabled: this.elements.enableWatermark?.checked || false,
        text: this.elements.watermarkText?.value || '',
        position: this.elements.watermarkPosition?.value || 'bottom-right',
        opacity: parseInt(this.elements.watermarkOpacity?.value || 50) / 100
      },
      progressBar: {
        enabled: this.elements.enableProgressBar?.checked || false,
        style: this.elements.progressBarStyle?.value || 'bar'
      },
      
      // Device Frame
      deviceFrame: {
        enabled: this.elements.enableDeviceFrame?.checked || false,
        device: this.elements.deviceType?.value || 'none',
        shadow: this.elements.deviceShadow?.checked !== false
      },
      
      // Subtitles
      subtitles: {
        enabled: this.elements.enableSubtitles?.checked || false,
        style: this.elements.subtitleStyle?.value || 'standard',
        position: this.elements.subtitlePosition?.value || 'bottom'
      },
      
      // Export
      preset: this.elements.exportPreset?.value || 'youtube',
      voice: this.elements.voiceSelect?.value || 'nova',
      
      // Template
      template: this.currentTemplate?.name || null
    };
  }
  
  async onSettingsChange() {
    if (!this.currentProject?.id) return;
    
    try {
      await API.updateProject(this.currentProject.id, {
        settings: this.getSettings()
      });
      
      // Update preview renderer with new settings
      if (this.previewRenderer) {
        this.previewRenderer.updateSettings(this.getSettings());
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  async regenerateVoice() {
    if (!this.currentProject?.id) return;
    
    const script = this.elements.scriptEditor.value;
    const voice = this.elements.voiceSelect.value;
    
    this.setStatus('Generating voiceover...');
    this.elements.regenerateVoiceBtn.disabled = true;
    
    try {
      await API.generateVoice(this.currentProject.id, script, voice);
      this.setStatus('Voiceover generated');
      
      // Reload project to get updated audio
      await this.loadProject(this.currentProject.id);
      
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, 'error');
    } finally {
      this.elements.regenerateVoiceBtn.disabled = false;
    }
  }
  
  // ===== Markers Management =====
  
  addMarkerAtCurrentTime() {
    const video = this.elements.previewVideo;
    if (!video || !video.duration) return;
    
    const time = video.currentTime;
    this.promptAddMarker(time);
  }
  
  promptAddMarker(time) {
    const label = prompt('Enter marker label:', `Section ${(this.currentProject.markers?.length || 0) + 1}`);
    if (label === null) return; // User cancelled
    
    this.addMarker(time, label || 'Marker');
  }
  
  addMarker(time, label) {
    if (!this.currentProject) return;
    
    if (!this.currentProject.markers) {
      this.currentProject.markers = [];
    }
    
    this.currentProject.markers.push({ time, label });
    this.currentProject.markers.sort((a, b) => a.time - b.time);
    
    this.renderMarkersPanel();
    this.updateTimelineMarkers();
    this.autoSave?.markDirty();
    
    toast.success(`Marker "${label}" added`);
  }
  
  editMarker(index) {
    const marker = this.currentProject?.markers?.[index];
    if (!marker) return;
    
    const label = prompt('Edit marker label:', marker.label);
    if (label === null) return; // User cancelled
    
    const timeStr = prompt('Edit marker time (seconds):', marker.time.toFixed(2));
    if (timeStr === null) return;
    
    const newTime = parseFloat(timeStr);
    if (isNaN(newTime) || newTime < 0) {
      toast.error('Invalid time value');
      return;
    }
    
    this.currentProject.markers[index] = {
      time: newTime,
      label: label || 'Marker'
    };
    this.currentProject.markers.sort((a, b) => a.time - b.time);
    
    this.renderMarkersPanel();
    this.updateTimelineMarkers();
    this.autoSave?.markDirty();
    
    toast.success('Marker updated');
  }
  
  deleteMarker(index) {
    if (!this.currentProject?.markers?.[index]) return;
    
    const marker = this.currentProject.markers[index];
    if (!confirm(`Delete marker "${marker.label}"?`)) return;
    
    this.currentProject.markers.splice(index, 1);
    
    this.renderMarkersPanel();
    this.updateTimelineMarkers();
    this.autoSave?.markDirty();
    
    toast.success('Marker deleted');
  }
  
  jumpToMarker(index) {
    const marker = this.currentProject?.markers?.[index];
    if (!marker) return;
    
    const video = this.elements.previewVideo;
    if (video && video.duration) {
      video.currentTime = marker.time;
      this.updateTimeDisplay();
    }
  }
  
  jumpToPreviousMarker() {
    const markers = this.currentProject?.markers || [];
    if (markers.length === 0) return;
    
    const video = this.elements.previewVideo;
    if (!video) return;
    
    const currentTime = video.currentTime;
    
    // Find the last marker before current time (with 0.5s buffer)
    for (let i = markers.length - 1; i >= 0; i--) {
      if (markers[i].time < currentTime - 0.5) {
        this.jumpToMarker(i);
        toast.info(`⏮️ ${markers[i].label}`);
        return;
      }
    }
    
    // If no previous marker, jump to last one
    this.jumpToMarker(markers.length - 1);
    toast.info(`⏮️ ${markers[markers.length - 1].label}`);
  }
  
  jumpToNextMarker() {
    const markers = this.currentProject?.markers || [];
    if (markers.length === 0) return;
    
    const video = this.elements.previewVideo;
    if (!video) return;
    
    const currentTime = video.currentTime;
    
    // Find the first marker after current time
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].time > currentTime + 0.1) {
        this.jumpToMarker(i);
        toast.info(`⏭️ ${markers[i].label}`);
        return;
      }
    }
    
    // If no next marker, jump to first one
    this.jumpToMarker(0);
    toast.info(`⏭️ ${markers[0].label}`);
  }
  
  generateMarkersFromClicks() {
    if (!this.previewRenderer?.cursorData?.clicks?.length) {
      toast.warning('No click data available');
      return;
    }
    
    const clicks = this.previewRenderer.cursorData.clicks;
    const video = this.elements.previewVideo;
    const duration = video?.duration || 0;
    
    if (!duration) {
      toast.warning('Video not loaded');
      return;
    }
    
    // Group clicks that are close together (within 2 seconds)
    // Keep track of element context for each group
    const groupedClicks = [];
    let currentGroup = null;
    
    for (const click of clicks) {
      const timeSeconds = click.t / 1000;
      
      if (!currentGroup || timeSeconds - currentGroup.endTime > 2) {
        // Start a new group
        currentGroup = {
          startTime: timeSeconds,
          endTime: timeSeconds,
          count: 1,
          clicks: [click]
        };
        groupedClicks.push(currentGroup);
      } else {
        // Add to current group
        currentGroup.endTime = timeSeconds;
        currentGroup.count++;
        currentGroup.clicks.push(click);
      }
    }
    
    // Generate smart labels based on element context
    const generateSmartLabel = (group, index) => {
      // Look for the most meaningful click in the group
      for (const click of group.clicks) {
        const el = click.element;
        if (!el) continue;
        
        // Priority 1: Use aria-label or text content
        if (el.ariaLabel) {
          return this.capitalizeFirst(el.ariaLabel.substring(0, 30));
        }
        
        if (el.text && el.text.length > 2) {
          // Clean up the text
          let label = el.text.substring(0, 30);
          // Combine section + action for context
          if (el.section && el.section !== 'content') {
            const sectionName = this.capitalizeFirst(el.section);
            if (el.type === 'button' || el.type === 'cta') {
              return `${sectionName}: ${label}`;
            }
            return `${sectionName} - ${label}`;
          }
          return label;
        }
        
        // Priority 2: Use section + element type
        if (el.section && el.section !== 'content') {
          const sectionName = this.capitalizeFirst(el.section);
          const typeName = this.capitalizeFirst(el.type || 'click');
          return `${sectionName} ${typeName}`;
        }
        
        // Priority 3: Just element type
        if (el.type) {
          return `Click ${this.capitalizeFirst(el.type)}`;
        }
      }
      
      // Fallback
      return `Action ${index + 1}`;
    };
    
    // Create markers for each group with smart labels
    const newMarkers = groupedClicks.map((group, index) => ({
      time: group.startTime,
      label: generateSmartLabel(group, index)
    }));
    
    if (newMarkers.length === 0) {
      toast.info('No markers generated');
      return;
    }
    
    // Ask user if they want to replace or append
    const existingCount = this.currentProject?.markers?.length || 0;
    if (existingCount > 0) {
      const action = confirm(`Found ${newMarkers.length} click groups. Replace existing ${existingCount} markers?\n\nOK = Replace, Cancel = Append`);
      if (action) {
        this.currentProject.markers = newMarkers;
      } else {
        this.currentProject.markers = [...(this.currentProject.markers || []), ...newMarkers];
        this.currentProject.markers.sort((a, b) => a.time - b.time);
      }
    } else {
      this.currentProject.markers = newMarkers;
    }
    
    this.renderMarkersPanel();
    this.updateTimelineMarkers();
    this.autoSave?.markDirty();
    
    toast.success(`Generated ${newMarkers.length} markers from clicks`);
  }
  
  clearAllMarkers() {
    const count = this.currentProject?.markers?.length || 0;
    if (count === 0) {
      toast.info('No markers to clear');
      return;
    }
    
    if (!confirm(`Delete all ${count} markers?`)) return;
    
    this.currentProject.markers = [];
    
    this.renderMarkersPanel();
    this.updateTimelineMarkers();
    this.autoSave?.markDirty();
    
    toast.success('All markers cleared');
  }
  
  /**
   * Copy YouTube chapters format to clipboard
   */
  async copyYouTubeChapters() {
    const markers = this.currentProject?.markers || [];
    
    if (markers.length === 0) {
      toast.warning('No markers to export. Add markers first.');
      return;
    }
    
    try {
      // If we have a project ID, fetch from server (formatted)
      if (this.currentProject?.id) {
        const result = await API.getYouTubeChapters(this.currentProject.id);
        await navigator.clipboard.writeText(result.chapters);
        toast.success(`Copied ${markers.length} chapters to clipboard!`);
        return;
      }
      
      // Fallback: format locally
      const chapters = this.formatYouTubeChapters(markers);
      await navigator.clipboard.writeText(chapters);
      toast.success(`Copied ${markers.length} chapters to clipboard!`);
      
    } catch (error) {
      toast.error(`Failed to copy chapters: ${error.message}`);
    }
  }
  
  /**
   * Format markers as YouTube chapters (local fallback)
   * @param {Array} markers - Array of marker objects
   * @returns {string} YouTube chapters format
   */
  formatYouTubeChapters(markers) {
    const sorted = [...markers].sort((a, b) => a.time - b.time);
    
    // YouTube requires first chapter at 0:00
    if (sorted.length === 0 || sorted[0].time > 0) {
      sorted.unshift({ time: 0, label: 'Intro' });
    }
    
    return sorted.map(m => {
      const mins = Math.floor(m.time / 60);
      const secs = Math.floor(m.time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')} ${m.label}`;
    }).join('\n');
  }
  
  renderMarkersPanel() {
    if (!this.elements.markersList) return;
    
    const markers = this.currentProject?.markers || [];
    
    if (markers.length === 0) {
      this.elements.markersList.innerHTML = `
        <div class="markers-empty">
          No markers yet. Double-click on the timeline or press <kbd>M</kbd> to add a marker.
        </div>
      `;
      return;
    }
    
    this.elements.markersList.innerHTML = markers.map((marker, index) => `
      <div class="marker-item" data-index="${index}">
        <div class="marker-item-info" title="Click to jump">
          <span class="marker-item-time">${this.formatTime(marker.time)}</span>
          <span class="marker-item-label">${this.escapeHtml(marker.label)}</span>
        </div>
        <div class="marker-item-actions">
          <button class="marker-edit-btn" data-index="${index}" title="Edit">✏️</button>
          <button class="marker-delete-btn" data-index="${index}" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
    
    // Add event listeners
    this.elements.markersList.querySelectorAll('.marker-item-info').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.closest('.marker-item').dataset.index);
        this.jumpToMarker(index);
      });
    });
    
    this.elements.markersList.querySelectorAll('.marker-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editMarker(parseInt(btn.dataset.index));
      });
    });
    
    this.elements.markersList.querySelectorAll('.marker-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMarker(parseInt(btn.dataset.index));
      });
    });
  }
  
  updateTimelineMarkers() {
    if (this.enhancedTimeline) {
      this.enhancedTimeline.setMarkers(this.currentProject?.markers || []);
    }
  }
  
  setupEnhancedTimeline() {
    const container = this.elements.timelineContainer;
    if (!container) return;
    
    this.enhancedTimeline = new Timeline(container, {
      onSeek: (percent) => this.seekToPercent(percent),
      onTrimChange: (start, end) => this.onTrimChange(start, end),
      onMarkerAdd: (time) => this.promptAddMarker(time),
      onMarkerEdit: (index, marker) => this.editMarker(index),
      onMarkerDelete: (index) => this.deleteMarker(index)
    });
  }
  
  onTrimChange(start, end) {
    // Handle trim region changes if needed
    console.log('Trim changed:', start, end);
  }
  
  // Video playback controls
  togglePlayback() {
    const video = this.elements.previewVideo;
    if (video.paused) {
      video.play();
      this.elements.playBtn.textContent = '⏸️';
      this.startPreviewLoop();
    } else {
      video.pause();
      this.elements.playBtn.textContent = '▶️';
      this.stopPreviewLoop();
    }
  }
  
  seekTo(value) {
    const video = this.elements.previewVideo;
    const time = (value / 100) * video.duration;
    video.currentTime = time;
    this.updatePlayhead(value / 100);
  }
  
  seekToPercent(percent) {
    const video = this.elements.previewVideo;
    video.currentTime = percent * video.duration;
    this.elements.seekBar.value = percent * 100;
    this.updatePlayhead(percent);
  }
  
  updateTimeDisplay() {
    const video = this.elements.previewVideo;
    const current = this.formatTime(video.currentTime);
    const total = this.formatTime(video.duration || 0);
    this.elements.timeDisplay.textContent = `${current} / ${total}`;
    
    // Update seek bar
    const percent = (video.currentTime / video.duration) * 100;
    this.elements.seekBar.value = percent;
    this.updatePlayhead(percent / 100);
  }
  
  updatePlayhead(percent) {
    this.elements.playhead.style.left = `${percent * 100}%`;
    this.elements.timelineProgress.style.width = `${percent * 100}%`;
  }
  
  onVideoLoaded() {
    const duration = this.elements.previewVideo.duration;
    const markers = this.elements.timeMarkers;
    
    for (let i = 0; i < markers.length; i++) {
      const time = (duration / (markers.length - 1)) * i;
      markers[i].textContent = this.formatTime(time);
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  startPreviewLoop() {
    this.previewLoopId = requestAnimationFrame(() => this.previewLoop());
  }
  
  stopPreviewLoop() {
    if (this.previewLoopId) {
      cancelAnimationFrame(this.previewLoopId);
      this.previewLoopId = null;
    }
  }
  
  previewLoop() {
    if (this.previewRenderer) {
      this.previewRenderer.render(this.elements.previewVideo.currentTime);
    }
    
    if (!this.elements.previewVideo.paused) {
      this.previewLoopId = requestAnimationFrame(() => this.previewLoop());
    }
  }
  
  // Export
  showExportModal() {
    this.elements.exportModal.classList.remove('hidden');
    this.elements.exportProgress.classList.add('hidden');
    this.elements.startExport.disabled = false;
    this._currentExportType = 'video';
    this.switchExportTab('video');
    
    // Initialize thumbnail preview
    if (this.currentProject?.id) {
      this.updateThumbnailPreview(50);
    }
  }
  
  hideExportModal() {
    this.elements.exportModal.classList.add('hidden');
  }
  
  switchExportTab(type) {
    this._currentExportType = type;
    
    // Update tab styles
    this.elements.exportTabs?.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    // Show/hide sections
    this.elements.exportVideoOptions?.classList.toggle('hidden', type !== 'video');
    this.elements.exportGifOptions?.classList.toggle('hidden', type !== 'gif');
    this.elements.exportThumbnailOptions?.classList.toggle('hidden', type !== 'thumbnail');
    
    // Update export button text
    const buttonTexts = {
      video: '🎬 Export Video',
      gif: '🎞️ Export GIF',
      thumbnail: '🖼️ Save Thumbnail'
    };
    this.elements.startExport.innerHTML = `<span class="icon">${buttonTexts[type].split(' ')[0]}</span> ${buttonTexts[type].split(' ').slice(1).join(' ')}`;
  }
  
  updateThumbnailPreview(percent) {
    if (!this.currentProject?.id) return;
    
    const timestamp = (percent / 100) * (this.currentProject.duration || 25);
    const url = API.getThumbnailUrl(this.currentProject.id, { timestamp });
    
    if (this.elements.thumbnailPreview) {
      this.elements.thumbnailPreview.src = url;
    }
  }
  
  seekThumbnail(direction) {
    const current = parseInt(this.elements.thumbnailSeek?.value || 50);
    const newValue = Math.max(0, Math.min(100, current + direction * 5));
    if (this.elements.thumbnailSeek) {
      this.elements.thumbnailSeek.value = newValue;
    }
    this.updateThumbnailPreview(newValue);
  }
  
  onThumbnailPresetChange(preset) {
    const customSize = document.getElementById('thumbnail-custom-size');
    if (customSize) {
      customSize.style.display = preset === 'custom' ? 'flex' : 'none';
    }
  }
  
  selectCalloutTool(toolType) {
    this.elements.calloutTools?.forEach(tool => {
      tool.classList.toggle('active', tool.dataset.tool === toolType);
    });
    this._selectedCalloutTool = toolType;
    toast.info(`Selected ${toolType} tool. Click on the video to add.`);
  }
  
  onOverlaySettingsChange() {
    if (!this.currentProject) return;
    
    // Collect overlay settings
    const overlays = {
      lowerThirds: {
        enabled: this.elements.enableLowerThirds?.checked || false,
        name: this.elements.lowerThirdsName?.value || '',
        title: this.elements.lowerThirdsTitle?.value || '',
        style: this.elements.lowerThirdsStyle?.value || 'modern',
        position: this.elements.lowerThirdsPosition?.value || 'bottom-left'
      },
      keyboard: {
        enabled: this.elements.enableKeyboardVisual?.checked || false,
        style: this.elements.keyboardStyle?.value || 'mac',
        position: this.elements.keyboardPosition?.value || 'bottom-center',
        size: this.elements.keyboardSize?.value || 'medium'
      },
      callouts: {
        enabled: this.elements.enableCallouts?.checked || false,
        color: this.elements.calloutColor?.value || '#EF4444',
        animation: this.elements.calloutAnimation?.value || 'fade'
      },
      transitions: {
        style: this.elements.transitionStyle?.value || 'none',
        duration: parseFloat(this.elements.transitionDuration?.value || '0.5')
      }
    };
    
    this.currentProject.overlays = overlays;
  }
  
  async startExport() {
    if (!this.currentProject?.id) {
      toast.error('No project loaded');
      return;
    }
    
    // Route to appropriate export method based on type
    switch (this._currentExportType) {
      case 'gif':
        return this.exportGif();
      case 'thumbnail':
        return this.exportThumbnail();
      default:
        return this.exportVideo();
    }
  }
  
  async exportVideo() {
    const preset = this.elements.exportFormat.value;
    
    this.elements.exportProgress.classList.remove('hidden');
    this.elements.startExport.disabled = true;
    this.elements.cancelExport.disabled = true;
    this.elements.exportProgressBar.style.width = '0%';
    this.elements.exportStatus.textContent = 'Preparing render...';
    this._exportCancelled = false;
    
    try {
      // Start render process
      this.elements.exportStatus.textContent = 'Rendering video...';
      
      // Poll for progress via WebSocket or use the result
      const result = await API.render(this.currentProject.id, preset);
      
      if (this._exportCancelled) return;
      
      // Animate progress to 100%
      this.elements.exportProgressBar.style.width = '100%';
      this.elements.exportStatus.textContent = 'Complete! Starting download...';
      toast.success('Video rendered successfully!');
      
      // Trigger download
      const downloadUrl = `/api/download/${this.currentProject.id}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${this.currentProject.name || 'demo'}-${preset}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        this.hideExportModal();
        this.elements.cancelExport.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('Export failed:', error);
      this.elements.exportStatus.textContent = `Error: ${error.message}`;
      this.elements.exportProgressBar.style.width = '0%';
      this.elements.exportProgressBar.style.background = 'var(--error)';
      toast.error(`Export failed: ${error.message}`);
      this.elements.cancelExport.disabled = false;
      
      // Reset progress bar color after delay
      setTimeout(() => {
        this.elements.exportProgressBar.style.background = '';
      }, 3000);
    }
  }
  
  async exportGif() {
    this.elements.exportProgress.classList.remove('hidden');
    this.elements.startExport.disabled = true;
    this.elements.cancelExport.disabled = true;
    this.elements.exportProgressBar.style.width = '0%';
    this.elements.exportStatus.textContent = 'Generating GIF...';
    this._exportCancelled = false;
    
    try {
      const options = {
        quality: this.elements.gifQuality?.value || 'medium',
        fps: parseInt(this.elements.gifFps?.value || '15'),
        width: parseInt(this.elements.gifWidth?.value || '640'),
        startTime: parseFloat(this.elements.gifStart?.value) || undefined,
        endTime: parseFloat(this.elements.gifEnd?.value) || undefined,
        loop: this.elements.gifLoop?.checked !== false
      };
      
      // Animate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 5, 90);
        this.elements.exportProgressBar.style.width = `${progress}%`;
      }, 500);
      
      const result = await API.exportGif(this.currentProject.id, options);
      
      clearInterval(progressInterval);
      
      if (this._exportCancelled) return;
      
      this.elements.exportProgressBar.style.width = '100%';
      this.elements.exportStatus.textContent = 'GIF created! Starting download...';
      toast.success('GIF exported successfully!');
      
      // Trigger download
      const downloadUrl = API.getGifUrl(this.currentProject.id);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${this.currentProject.name || 'demo'}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => {
        this.hideExportModal();
        this.elements.cancelExport.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('GIF export failed:', error);
      this.elements.exportStatus.textContent = `Error: ${error.message}`;
      this.elements.exportProgressBar.style.width = '0%';
      toast.error(`GIF export failed: ${error.message}`);
      this.elements.cancelExport.disabled = false;
    }
  }
  
  async exportThumbnail() {
    this.elements.exportProgress.classList.remove('hidden');
    this.elements.startExport.disabled = true;
    this.elements.cancelExport.disabled = true;
    this.elements.exportProgressBar.style.width = '50%';
    this.elements.exportStatus.textContent = 'Generating thumbnail...';
    
    try {
      const timestamp = (parseInt(this.elements.thumbnailSeek?.value || 50) / 100) * (this.currentProject.duration || 25);
      
      const options = {
        timestamp,
        preset: this.elements.thumbnailPreset?.value || 'youtube',
        format: this.elements.thumbnailFormat?.value || 'png',
        addTitle: this.elements.thumbnailAddTitle?.checked,
        titleText: this.elements.thumbnailTitleText?.value,
        addLogo: this.elements.thumbnailAddLogo?.checked
      };
      
      const result = await API.generateThumbnail(this.currentProject.id, options);
      
      this.elements.exportProgressBar.style.width = '100%';
      this.elements.exportStatus.textContent = 'Thumbnail saved!';
      toast.success('Thumbnail generated!');
      
      // Trigger download
      if (result.thumbnailUrl) {
        const a = document.createElement('a');
        a.href = result.thumbnailUrl;
        a.download = `${this.currentProject.name || 'demo'}-thumbnail.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      setTimeout(() => {
        this.hideExportModal();
        this.elements.cancelExport.disabled = false;
      }, 1500);
      
    } catch (error) {
      console.error('Thumbnail export failed:', error);
      this.elements.exportStatus.textContent = `Error: ${error.message}`;
      this.elements.exportProgressBar.style.width = '0%';
      toast.error(`Thumbnail export failed: ${error.message}`);
      this.elements.cancelExport.disabled = false;
    }
  }
  
  cancelExport() {
    this._exportCancelled = true;
    this.hideExportModal();
    toast.info('Export cancelled');
  }
  
  // Status
  setStatus(message, type = 'info') {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
  }
  
  showProgress() {
    this.elements.progressContainer.classList.remove('hidden');
  }
  
  hideProgress() {
    this.elements.progressContainer.classList.add('hidden');
  }
  
  setProgress(percent) {
    this.elements.progressBar.style.width = `${percent}%`;
  }
  
  // ============================================================
  // Live Recording Methods
  // ============================================================
  
  /**
   * Start a live recording session with real-time preview
   * @param {string} url - URL to record
   */
  async startLiveRecording(url) {
    try {
      this.setStatus('Starting live recording...');
      this.showProgress();
      
      // Call API to start live recording
      const response = await API.startLiveRecording(url, {
        width: 1920,
        height: 1080,
        fps: 30,
        previewFps: 15
      });
      
      this.liveSessionId = response.sessionId;
      this.isLiveRecording = true;
      
      // Show editor screen with live preview
      this.showEditorScreen();
      this.showLivePreviewPanel();
      
      // Initialize LivePreview component
      this.initLivePreview(response.sessionId);
      
      this.setStatus('🔴 Live recording in progress');
      this.hideProgress();
      toast.success('Live recording started');
      
    } catch (error) {
      console.error('Failed to start live recording:', error);
      this.hideProgress();
      toast.error(`Failed to start live recording: ${error.message}`);
    }
  }
  
  /**
   * Initialize the LivePreview component
   * @param {string} sessionId - Live recording session ID
   */
  initLivePreview(sessionId) {
    // Create LivePreview instance
    this.livePreview = new LivePreview({
      container: this.elements.livePreviewContainer,
      ws: this.ws,
      onStateChange: ({ state, elapsed, projectId, duration }) => {
        this.handleLiveStateChange(state, elapsed, projectId, duration);
      },
      onClick: ({ x, y }) => {
        console.log(`Manual click at ${x}, ${y}`);
      }
    });
    
    // Subscribe to the live session
    this.livePreview.subscribe(sessionId);
  }
  
  /**
   * Handle live recording state changes
   */
  handleLiveStateChange(state, elapsed, projectId, duration) {
    switch (state) {
      case 'recording':
        this.setStatus(`🔴 Recording - ${this.formatTime(elapsed)}`);
        // Dim the sidebar when recording
        this.setLiveEditMode(false);
        break;
        
      case 'paused':
        this.setStatus(`⏸️ Paused - ${this.formatTime(elapsed)}`);
        toast.info('Recording paused - you can now take manual control or edit the timeline');
        // Enable editing when paused
        this.setLiveEditMode(true);
        break;
        
      case 'complete':
        this.isLiveRecording = false;
        this.liveSessionId = null;
        this.hideLivePreviewPanel();
        this.setStatus('Recording complete');
        toast.success(`Recording complete! Duration: ${this.formatTime(duration)}`);
        
        // Load the completed project for final editing
        if (projectId) {
          this.loadProject(projectId);
        }
        break;
    }
  }
  
  /**
   * Enable/disable editing during live recording
   * @param {boolean} enabled - Whether to enable editing
   */
  setLiveEditMode(enabled) {
    const editorLayout = this.elements.editorScreen?.querySelector('.editor-layout');
    if (!editorLayout) return;
    
    if (enabled) {
      // Show sidebar for editing while paused
      editorLayout.classList.remove('live-mode');
      editorLayout.classList.add('live-paused-mode');
    } else {
      // Hide sidebar during recording
      editorLayout.classList.add('live-mode');
      editorLayout.classList.remove('live-paused-mode');
    }
  }
  
  /**
   * Format milliseconds as mm:ss
   */
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Stop the live recording
   */
  async stopLiveRecording() {
    if (!this.liveSessionId) return;
    
    try {
      if (this.livePreview) {
        this.livePreview.stop();
        this.livePreview.destroy();
        this.livePreview = null;
      }
      
      this.isLiveRecording = false;
      this.liveSessionId = null;
      this.hideLivePreviewPanel();
      
    } catch (error) {
      console.error('Failed to stop live recording:', error);
    }
  }
  
  /**
   * Show the live preview panel
   */
  showLivePreviewPanel() {
    this.elements.livePreviewPanel?.classList.remove('hidden');
    // Get the editor layout and add live mode class
    const editorLayout = this.elements.editorScreen?.querySelector('.editor-layout');
    editorLayout?.classList.add('live-mode');
  }
  
  /**
   * Hide the live preview panel
   */
  hideLivePreviewPanel() {
    this.elements.livePreviewPanel?.classList.add('hidden');
    const editorLayout = this.elements.editorScreen?.querySelector('.editor-layout');
    editorLayout?.classList.remove('live-mode');
  }
  
  /**
   * Show editor screen
   */
  showEditorScreen() {
    this.elements.startScreen.classList.add('hidden');
    this.elements.editorScreen.classList.remove('hidden');
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LookEditor();
});
