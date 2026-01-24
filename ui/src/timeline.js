/**
 * Timeline Component - Enhanced timeline with waveform, markers, and drag handles
 * v2.1 - Added multi-track marker support with chapter/zoom/highlight types
 */

/**
 * Marker type constants (mirrored from src/v2/markers.js for UI use)
 */
export const MarkerType = {
  CHAPTER: 'chapter',
  ZOOM: 'zoom',
  HIGHLIGHT: 'highlight',
  CUT: 'cut',
  CUSTOM: 'custom'
};

export class Timeline {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      height: 120,
      waveformColor: '#3B82F6',
      markerColor: '#F59E0B',
      clickMarkerColor: '#EF4444',
      chapterColor: '#10B981',
      zoomColor: '#8B5CF6',
      highlightColor: '#F59E0B',
      cutColor: '#EF4444',
      customColor: '#6B7280',
      ...options
    };

    this.duration = 0;
    this.currentTime = 0;
    this.trimStart = 0;
    this.trimEnd = 1;
    this.clicks = [];
    this.markers = [];
    this.waveformData = null;
    this.isDragging = false;
    this.dragType = null;
    this.dragMarkerIndex = null;
    this.activeContextMenu = null;

    this.onSeek = options.onSeek || (() => {});
    this.onTrimChange = options.onTrimChange || (() => {});
    this.onMarkerAdd = options.onMarkerAdd || (() => {});
    this.onMarkerEdit = options.onMarkerEdit || (() => {});
    this.onMarkerDelete = options.onMarkerDelete || (() => {});
    this.onZoomAtMarker = options.onZoomAtMarker || (() => {});

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="timeline-component">
        <div class="timeline-ruler">
          <canvas class="timeline-ruler-canvas"></canvas>
        </div>
        <div class="timeline-tracks">
          <div class="timeline-track timeline-video-track">
            <div class="track-label">Video</div>
            <div class="track-content">
              <canvas class="timeline-canvas"></canvas>
              <div class="timeline-overlay">
                <div class="trim-region">
                  <div class="trim-handle trim-handle-start" data-handle="start"></div>
                  <div class="trim-handle trim-handle-end" data-handle="end"></div>
                </div>
                <div class="timeline-progress"></div>
                <div class="timeline-playhead"></div>
              </div>
            </div>
          </div>
          <div class="timeline-track timeline-marker-track">
            <div class="track-label">Markers</div>
            <div class="track-content marker-container"></div>
          </div>
          <div class="timeline-track timeline-audio-track">
            <div class="track-label">Audio</div>
            <div class="track-content audio-waveform">
              <div class="click-markers"></div>
            </div>
          </div>
        </div>
        <div class="timeline-time-labels">
          <span class="time-label time-label-start">0:00</span>
          <span class="time-label time-label-current">0:00</span>
          <span class="time-label time-label-end">0:00</span>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('.timeline-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.rulerCanvas = this.container.querySelector('.timeline-ruler-canvas');
    this.rulerCtx = this.rulerCanvas.getContext('2d');
    this.overlay = this.container.querySelector('.timeline-overlay');
    this.playhead = this.container.querySelector('.timeline-playhead');
    this.trimRegion = this.container.querySelector('.trim-region');
    this.markerContainer = this.container.querySelector('.marker-container');
    this.clickMarkersContainer = this.container.querySelector('.click-markers');
    this.startLabel = this.container.querySelector('.time-label-start');
    this.currentLabel = this.container.querySelector('.time-label-current');
    this.endLabel = this.container.querySelector('.time-label-end');

    this.setupEvents();
    this.resize();

    window.addEventListener('resize', () => this.resize());
  }

  setupEvents() {
    // Click to seek
    this.overlay.addEventListener('click', (e) => {
      if (this.isDragging) return;
      const rect = this.overlay.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.onSeek(Math.max(0, Math.min(1, percent)));
    });

    // Double-click to add marker
    this.overlay.addEventListener('dblclick', (e) => {
      const rect = this.overlay.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * this.duration;
      this.onMarkerAdd(time);
    });

    // Double-click on marker track to add marker
    this.markerContainer.addEventListener('dblclick', (e) => {
      if (e.target.closest('.timeline-marker')) return;
      const rect = this.markerContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * this.duration;
      this.onMarkerAdd(time);
    });

    // Trim handles
    const handles = this.container.querySelectorAll('.trim-handle');
    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.isDragging = true;
        this.dragType = handle.dataset.handle;
        document.body.style.cursor = 'ew-resize';
      });
    });

    // Playhead drag
    this.playhead.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isDragging = true;
      this.dragType = 'playhead';
      document.body.style.cursor = 'ew-resize';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const rect = this.overlay.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

      if (this.dragType === 'start') {
        this.trimStart = Math.min(percent, this.trimEnd - 0.01);
        this.updateTrimRegion();
        this.onTrimChange(this.trimStart, this.trimEnd);
      } else if (this.dragType === 'end') {
        this.trimEnd = Math.max(percent, this.trimStart + 0.01);
        this.updateTrimRegion();
        this.onTrimChange(this.trimStart, this.trimEnd);
      } else if (this.dragType === 'playhead') {
        this.onSeek(percent);
      } else if (this.dragType === 'marker' && this.dragMarkerIndex !== null) {
        // Dragging a marker to reposition
        const newTime = percent * this.duration;
        if (this.markers[this.dragMarkerIndex]) {
          this.markers[this.dragMarkerIndex].time = newTime;
          this.renderMarkers();
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        // If we were dragging a marker, notify about the edit
        if (this.dragType === 'marker' && this.dragMarkerIndex !== null) {
          this.onMarkerEdit(this.dragMarkerIndex, this.markers[this.dragMarkerIndex]);
        }
        this.isDragging = false;
        this.dragType = null;
        this.dragMarkerIndex = null;
        document.body.style.cursor = '';
      }
    });
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const trackHeight = 40;
    this.canvas.width = rect.width - 80; // Account for track labels
    this.canvas.height = trackHeight;
    this.rulerCanvas.width = rect.width;
    this.rulerCanvas.height = 24;
    this.render();
    this.renderRuler();
  }

  setDuration(duration) {
    this.duration = duration;
    this.updateLabels();
    this.render();
    this.renderRuler();
  }

  setCurrentTime(time) {
    this.currentTime = time;
    const percent = this.duration > 0 ? time / this.duration : 0;
    this.playhead.style.left = `${percent * 100}%`;
    if (this.currentLabel) {
      this.currentLabel.textContent = this.formatTime(time);
    }
  }

  setClicks(clicks) {
    this.clicks = clicks || [];
    this.renderClickMarkers();
  }

  setWaveform(waveformData) {
    this.waveformData = waveformData;
    this.render();
  }

  setMarkers(markers) {
    this.markers = markers || [];
    this.renderMarkers();
  }

  updateTrimRegion() {
    this.trimRegion.style.left = `${this.trimStart * 100}%`;
    this.trimRegion.style.right = `${(1 - this.trimEnd) * 100}%`;
  }

  updateLabels() {
    this.startLabel.textContent = this.formatTime(0);
    this.endLabel.textContent = this.formatTime(this.duration);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get marker color based on type
   */
  getMarkerColor(type) {
    switch (type) {
      case MarkerType.CHAPTER: return this.options.chapterColor;
      case MarkerType.ZOOM: return this.options.zoomColor;
      case MarkerType.HIGHLIGHT: return this.options.highlightColor;
      case MarkerType.CUT: return this.options.cutColor;
      case MarkerType.CUSTOM:
      default: return this.options.customColor;
    }
  }

  /**
   * Get marker icon based on type
   */
  getMarkerIcon(type) {
    switch (type) {
      case MarkerType.CHAPTER: return '📍';
      case MarkerType.ZOOM: return '🔍';
      case MarkerType.HIGHLIGHT: return '⭐';
      case MarkerType.CUT: return '✂️';
      case MarkerType.CUSTOM:
      default: return '🏷️';
    }
  }

  renderMarkers() {
    if (!this.markerContainer || !this.duration) return;
    
    this.markerContainer.innerHTML = this.markers.map((marker, i) => {
      const position = (marker.time / this.duration) * 100;
      const color = this.getMarkerColor(marker.type);
      const icon = this.getMarkerIcon(marker.type);
      const typeClass = `marker-${marker.type || 'custom'}`;
      
      return `
        <div class="timeline-marker ${typeClass}" 
             style="left: ${position}%; --marker-color: ${color}"
             data-index="${i}"
             draggable="false"
             title="${marker.label} (${this.formatTime(marker.time)})">
          <div class="marker-flag" style="background: ${color}">
            <span class="marker-icon">${icon}</span>
          </div>
          <div class="marker-label">${marker.label}</div>
        </div>
      `;
    }).join('');
    
    // Add event listeners to markers
    this.markerContainer.querySelectorAll('.timeline-marker').forEach(el => {
      // Click to seek
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(el.dataset.index);
        const marker = this.markers[index];
        if (marker) {
          this.onSeek(marker.time / this.duration);
        }
      });
      
      // Mousedown to start drag
      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        e.stopPropagation();
        this.isDragging = true;
        this.dragType = 'marker';
        this.dragMarkerIndex = parseInt(el.dataset.index);
        document.body.style.cursor = 'grabbing';
      });
      
      // Right-click context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(el.dataset.index);
        this.showMarkerContextMenu(e, index);
      });
    });
  }

  showMarkerContextMenu(event, index) {
    // Remove existing menu
    this.hideMarkerContextMenu();
    
    const marker = this.markers[index];
    if (!marker) return;
    
    const menu = document.createElement('div');
    menu.className = 'marker-context-menu';
    menu.innerHTML = `
      <div class="menu-header">${marker.label}</div>
      <button data-action="edit">✏️ Edit Marker</button>
      <button data-action="zoom">🔍 Add Zoom Here</button>
      <div class="menu-divider"></div>
      <button data-action="type-chapter">📍 Set as Chapter</button>
      <button data-action="type-highlight">⭐ Set as Highlight</button>
      <button data-action="type-cut">✂️ Set as Cut Point</button>
      <div class="menu-divider"></div>
      <button data-action="delete" class="danger">🗑️ Delete</button>
    `;
    
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    document.body.appendChild(menu);
    this.activeContextMenu = menu;
    
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      
      if (action === 'edit') {
        this.onMarkerEdit(index, marker);
      } else if (action === 'delete') {
        this.onMarkerDelete(index);
      } else if (action === 'zoom') {
        this.addZoomAtMarker(index);
      } else if (action.startsWith('type-')) {
        const newType = action.replace('type-', '');
        marker.type = newType;
        this.renderMarkers();
        this.onMarkerEdit(index, marker);
      }
      
      this.hideMarkerContextMenu();
    });
    
    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', () => this.hideMarkerContextMenu(), { once: true });
    }, 0);
  }

  hideMarkerContextMenu() {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove();
      this.activeContextMenu = null;
    }
  }

  addZoomAtMarker(index) {
    const marker = this.markers[index];
    if (!marker) return;
    
    // Add a zoom marker at this position
    const zoomMarker = {
      id: `zoom-${Date.now()}`,
      time: marker.time,
      label: `Zoom: ${marker.label}`,
      type: MarkerType.ZOOM,
      metadata: {
        zoom: 1.4,
        x: 0.5,
        y: 0.5
      }
    };
    
    this.onZoomAtMarker(zoomMarker);
  }

  addMarkerAtTime(time, label = 'New Marker', type = MarkerType.CHAPTER) {
    const marker = {
      id: `marker-${Date.now()}`,
      time,
      label,
      type
    };
    this.markers.push(marker);
    this.markers.sort((a, b) => a.time - b.time);
    this.renderMarkers();
    return marker;
  }

  renderClickMarkers() {
    this.clickMarkersContainer.innerHTML = '';
    
    if (!this.duration || !this.clicks.length) return;

    this.clicks.forEach((click, index) => {
      const percent = (click.t / 1000) / this.duration;
      if (percent < 0 || percent > 1) return;

      const marker = document.createElement('div');
      marker.className = 'click-marker';
      marker.style.left = `${percent * 100}%`;
      marker.title = `Click ${index + 1} at ${this.formatTime(click.t / 1000)}`;
      this.clickMarkersContainer.appendChild(marker);
    });
  }

  renderRuler() {
    const { width, height } = this.rulerCanvas;
    const ctx = this.rulerCtx;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (!this.duration) return;

    // Calculate interval (aim for ~10 markers)
    const intervals = [1, 2, 5, 10, 15, 30, 60, 120, 300];
    let interval = 5;
    for (const i of intervals) {
      if (this.duration / i <= 15) {
        interval = i;
        break;
      }
    }

    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#888';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';

    // Draw ticks and labels
    for (let t = 0; t <= this.duration; t += interval) {
      const x = (t / this.duration) * width;
      
      ctx.beginPath();
      ctx.moveTo(x, height - 8);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillText(this.formatTime(t), x, height - 10);
    }

    // Minor ticks
    const minorInterval = interval / 4;
    ctx.strokeStyle = '#222';
    for (let t = 0; t <= this.duration; t += minorInterval) {
      if (t % interval === 0) continue;
      const x = (t / this.duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, height - 4);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  render() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Waveform
    if (this.waveformData && this.waveformData.length > 0) {
      this.renderWaveform();
    } else {
      // Placeholder pattern
      this.renderPlaceholder();
    }

    // Trim overlay (darken trimmed regions)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width * this.trimStart, height);
    ctx.fillRect(width * this.trimEnd, 0, width * (1 - this.trimEnd), height);
  }

  renderWaveform() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const data = this.waveformData;
    const barWidth = width / data.length;
    const centerY = height / 2;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, this.options.waveformColor);
    gradient.addColorStop(0.5, this.options.waveformColor + '88');
    gradient.addColorStop(1, this.options.waveformColor);
    ctx.fillStyle = gradient;

    for (let i = 0; i < data.length; i++) {
      const amplitude = data[i] * (height / 2 - 4);
      const x = i * barWidth;
      ctx.fillRect(x, centerY - amplitude, Math.max(1, barWidth - 1), amplitude * 2);
    }
  }

  renderPlaceholder() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    
    // Draw subtle wave pattern
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = 0; x < width; x += 4) {
      const y = height / 2 + Math.sin(x * 0.05) * 10 + (Math.random() - 0.5) * 5;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
  }

  getTrimTimes() {
    return {
      start: this.trimStart * this.duration,
      end: this.trimEnd * this.duration
    };
  }

  /**
   * Get all markers for export
   */
  getMarkers() {
    return [...this.markers];
  }

  /**
   * Import markers from external source
   */
  importMarkers(markers) {
    this.markers = markers.map((m, i) => ({
      id: m.id || `marker-${i}`,
      time: m.time,
      label: m.label,
      type: m.type || MarkerType.CHAPTER,
      metadata: m.metadata || {}
    }));
    this.markers.sort((a, b) => a.time - b.time);
    this.renderMarkers();
  }

  /**
   * Generate YouTube chapters from current markers
   */
  generateYouTubeChapters() {
    const chapters = this.markers
      .filter(m => m.type === MarkerType.CHAPTER || m.type === MarkerType.HIGHLIGHT)
      .sort((a, b) => a.time - b.time);
    
    if (chapters.length === 0) return '';
    
    // YouTube requires first chapter at 0:00
    const result = [];
    if (chapters[0].time > 0) {
      result.push('0:00 Intro');
    }
    
    for (const m of chapters) {
      result.push(`${this.formatTime(m.time)} ${m.label}`);
    }
    
    return result.join('\n');
  }

  /**
   * Apply a marker template
   */
  applyTemplate(templateName) {
    const templates = {
      saas_demo: [
        { offset: 0, label: 'Introduction', type: MarkerType.CHAPTER },
        { offset: 0.1, label: 'Dashboard Overview', type: MarkerType.CHAPTER },
        { offset: 0.3, label: 'Key Features', type: MarkerType.CHAPTER },
        { offset: 0.6, label: 'Workflow Demo', type: MarkerType.CHAPTER },
        { offset: 0.85, label: 'Pricing', type: MarkerType.CHAPTER },
        { offset: 0.95, label: 'Call to Action', type: MarkerType.CHAPTER }
      ],
      product_tour: [
        { offset: 0, label: 'Welcome', type: MarkerType.CHAPTER },
        { offset: 0.15, label: 'Getting Started', type: MarkerType.CHAPTER },
        { offset: 0.4, label: 'Main Features', type: MarkerType.CHAPTER },
        { offset: 0.7, label: 'Advanced Tips', type: MarkerType.CHAPTER },
        { offset: 0.9, label: 'Next Steps', type: MarkerType.CHAPTER }
      ],
      tutorial: [
        { offset: 0, label: 'Overview', type: MarkerType.CHAPTER },
        { offset: 0.1, label: 'Prerequisites', type: MarkerType.CHAPTER },
        { offset: 0.2, label: 'Step 1', type: MarkerType.CHAPTER },
        { offset: 0.4, label: 'Step 2', type: MarkerType.CHAPTER },
        { offset: 0.6, label: 'Step 3', type: MarkerType.CHAPTER },
        { offset: 0.8, label: 'Verification', type: MarkerType.CHAPTER },
        { offset: 0.95, label: 'Summary', type: MarkerType.CHAPTER }
      ]
    };

    const template = templates[templateName];
    if (!template || !this.duration) return;

    this.markers = template.map((t, i) => ({
      id: `marker-${i}`,
      time: t.offset * this.duration,
      label: t.label,
      type: t.type
    }));
    
    this.renderMarkers();
    return this.markers;
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this.markers = [];
    this.renderMarkers();
  }

  /**
   * Destroy the timeline and clean up
   */
  destroy() {
    window.removeEventListener('resize', this.resize);
    this.hideMarkerContextMenu();
    this.container.innerHTML = '';
  }
}

export default Timeline;
