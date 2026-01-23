/**
 * L👀K Editor - Main Application
 */

import { PreviewRenderer } from './preview-renderer.js';
import { API } from './api.js';
import { toast } from './toast.js';
import { KeyboardShortcuts } from './keyboard.js';
import { Timeline } from './timeline.js';
import { AutoSave } from './autosave.js';

class LookEditor {
  constructor() {
    this.currentProject = null;
    this.previewRenderer = null;
    this.ws = null;
    this.keyboard = null;
    this.timeline = null;
    this.autoSave = null;
    this.isFullscreen = false;
    
    this.elements = {
      // Start screen
      startScreen: document.getElementById('start-screen'),
      analyzeForm: document.getElementById('analyze-form'),
      urlInput: document.getElementById('url-input'),
      projectsList: document.getElementById('projects-list'),
      dropZone: document.getElementById('drop-zone'),
      
      // Editor screen
      editorScreen: document.getElementById('editor-screen'),
      exportBtn: document.getElementById('export-btn'),
      backBtn: document.getElementById('back-btn'),
      
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
      
      // Tabs
      tabBtns: document.querySelectorAll('.tab-btn'),
      scriptTab: document.getElementById('script-tab'),
      settingsTab: document.getElementById('settings-tab'),
      
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
      startExport: document.getElementById('start-export')
    };
    
    this.init();
  }
  
  async init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupKeyboardShortcuts();
    this.setupAutoSave();
    this.connectWebSocket();
    await this.loadRecentProjects();
    
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
    
    // Back button
    this.elements.backBtn?.addEventListener('click', () => this.showStartScreen());
    
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
    
    // Settings changes
    const settingsInputs = [
      'zoomMode', 'zoomIntensity', 'zoomSpeed',
      'cursorStyle', 'cursorSize', 'cursorColor',
      'clickEffect', 'clickColor', 'exportPreset'
    ];
    
    settingsInputs.forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => {
          this.onSettingsChange();
          this.autoSave?.markDirty();
        });
      }
    });
    
    // Tabs
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Export
    this.elements.exportBtn?.addEventListener('click', () => this.showExportModal());
    this.elements.cancelExport?.addEventListener('click', () => this.hideExportModal());
    this.elements.startExport?.addEventListener('click', () => this.startExport());
    
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
  }
    this.elements.timelineTrack.addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.seekToPercent(percent);
    });
    
    // Script editing
    this.elements.regenerateVoiceBtn.addEventListener('click', () => this.regenerateVoice());
    
    // Settings changes
    const settingsInputs = [
      'zoomMode', 'zoomIntensity', 'zoomSpeed',
      'cursorStyle', 'cursorSize', 'cursorColor',
      'clickEffect', 'clickColor', 'exportPreset'
    ];
    
    settingsInputs.forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => {
          this.onSettingsChange();
          this.autoSave?.markDirty();
        });
      }
    });
    
    // Tabs - handled in switchTab method now
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Export
    this.elements.exportBtn?.addEventListener('click', () => this.showExportModal());
    this.elements.cancelExport?.addEventListener('click', () => this.hideExportModal());
    this.elements.startExport?.addEventListener('click', () => this.startExport());
    
    // Close modal on backdrop click
    this.elements.exportModal?.addEventListener('click', (e) => {
      if (e.target === this.elements.exportModal) {
        this.hideExportModal();
      }
    });
  }
  
  // Tab switching
  switchTab(tabName) {
    this.elements.tabBtns.forEach(b => b.classList.remove('active'));
    const activeBtn = [...this.elements.tabBtns].find(b => b.dataset.tab === tabName);
    if (activeBtn) activeBtn.classList.add('active');
    
    this.elements.scriptTab?.classList.toggle('hidden', tabName !== 'script');
    this.elements.settingsTab?.classList.toggle('hidden', tabName !== 'settings');
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
        script: this.elements.scriptEditor?.value
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
    const wsUrl = `ws://${window.location.host}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      toast.info('Connected to server');
    };
    
    this.ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this.handleWebSocketMessage(type, data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
    
    this.ws.onerror = () => {
      toast.warning('Connection lost, reconnecting...');
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
    
    try {
      const result = await API.analyze(url);
      this.currentProject = result;
      
      this.setStatus('Analysis complete! Starting recording...');
      
      // Start recording
      const recordResult = await API.record(result.projectId);
      
      // Load the full project
      await this.loadProject(result.projectId);
      
    } catch (error) {
      this.setStatus(`Error: ${error.message}`, 'error');
      this.hideProgress();
    }
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
    
    // Zoom
    if (settings.zoom) {
      this.elements.zoomMode.value = settings.zoom.mode || 'smart';
      this.elements.zoomIntensity.value = (settings.zoom.intensity || 0.5) * 100;
      this.elements.zoomSpeed.value = settings.zoom.speed || 'medium';
    }
    
    // Cursor
    if (settings.cursor) {
      this.elements.cursorStyle.value = settings.cursor.style || 'default';
      this.elements.cursorSize.value = settings.cursor.size || 24;
      this.elements.cursorColor.value = settings.cursor.color || '#000000';
    }
    
    // Click effect
    if (settings.clickEffect) {
      this.elements.clickEffect.value = settings.clickEffect.type || 'ripple';
      this.elements.clickColor.value = settings.clickEffect.color || '#3B82F6';
    }
    
    // Export
    this.elements.exportPreset.value = settings.preset || 'youtube';
    this.elements.voiceSelect.value = settings.voice || 'nova';
  }
  
  getSettings() {
    return {
      zoom: {
        mode: this.elements.zoomMode.value,
        intensity: parseInt(this.elements.zoomIntensity.value) / 100,
        speed: this.elements.zoomSpeed.value
      },
      cursor: {
        style: this.elements.cursorStyle.value,
        size: parseInt(this.elements.cursorSize.value),
        color: this.elements.cursorColor.value
      },
      clickEffect: {
        type: this.elements.clickEffect.value,
        color: this.elements.clickColor.value
      },
      preset: this.elements.exportPreset.value,
      voice: this.elements.voiceSelect.value
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
  }
  
  hideExportModal() {
    this.elements.exportModal.classList.add('hidden');
  }
  
  async startExport() {
    if (!this.currentProject?.id) return;
    
    const preset = this.elements.exportFormat.value;
    
    this.elements.exportProgress.classList.remove('hidden');
    this.elements.startExport.disabled = true;
    this.elements.exportProgressBar.style.width = '0%';
    this.elements.exportStatus.textContent = 'Starting render...';
    
    try {
      const result = await API.render(this.currentProject.id, preset);
      
      this.elements.exportStatus.textContent = 'Complete! Downloading...';
      
      // Trigger download
      window.location.href = `/api/download/${this.currentProject.id}`;
      
      setTimeout(() => this.hideExportModal(), 2000);
      
    } catch (error) {
      this.elements.exportStatus.textContent = `Error: ${error.message}`;
    }
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
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new LookEditor();
});
