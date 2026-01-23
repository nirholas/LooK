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
    
    // Add marker button
    this.elements.addMarkerBtn?.addEventListener('click', () => this.addMarkerAtCurrentTime());
    this.elements.generateMarkersBtn?.addEventListener('click', () => this.generateMarkersFromClicks());
    this.elements.clearMarkersBtn?.addEventListener('click', () => this.clearAllMarkers());
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
