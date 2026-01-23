/**
 * Timeline Component - Enhanced timeline with waveform, markers, and drag handles
 */

export class Timeline {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      height: 80,
      waveformColor: '#3B82F6',
      markerColor: '#F59E0B',
      clickMarkerColor: '#EF4444',
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

    this.onSeek = options.onSeek || (() => {});
    this.onTrimChange = options.onTrimChange || (() => {});
    this.onMarkerAdd = options.onMarkerAdd || (() => {});
    this.onMarkerEdit = options.onMarkerEdit || (() => {});
    this.onMarkerDelete = options.onMarkerDelete || (() => {});

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="timeline-wrapper">
        <canvas class="timeline-canvas"></canvas>
        <div class="timeline-overlay">
          <div class="trim-region">
            <div class="trim-handle trim-handle-start" data-handle="start"></div>
            <div class="trim-handle trim-handle-end" data-handle="end"></div>
          </div>
          <div class="playhead">
            <div class="playhead-line"></div>
            <div class="playhead-head"></div>
          </div>
          <div class="click-markers"></div>
          <div class="section-markers"></div>
        </div>
        <div class="timeline-time-labels">
          <span class="time-label time-label-start">0:00</span>
          <span class="time-label time-label-end">0:00</span>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('.timeline-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.overlay = this.container.querySelector('.timeline-overlay');
    this.playhead = this.container.querySelector('.playhead');
    this.trimRegion = this.container.querySelector('.trim-region');
    this.clickMarkersContainer = this.container.querySelector('.click-markers');
    this.sectionMarkersContainer = this.container.querySelector('.section-markers');
    this.startLabel = this.container.querySelector('.time-label-start');
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

    // Right-click context menu for markers
    this.sectionMarkersContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const markerEl = e.target.closest('.timeline-marker');
      if (markerEl) {
        const markerId = markerEl.dataset.markerId;
        this.showMarkerContextMenu(e, markerId);
      }
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
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.dragType = null;
        document.body.style.cursor = '';
      }
    });
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = this.options.height;
    this.render();
  }

  setDuration(duration) {
    this.duration = duration;
    this.updateLabels();
    this.render();
  }

  setCurrentTime(time) {
    this.currentTime = time;
    const percent = this.duration > 0 ? time / this.duration : 0;
    this.playhead.style.left = `${percent * 100}%`;
  }

  setClicks(clicks) {
    this.clicks = clicks || [];
    this.renderClickMarkers();
  }

  setWaveform(waveformData) {
    this.waveformData = waveformData;
    this.render();
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

  setMarkers(markers) {
    this.markers = markers || [];
    this.renderSectionMarkers();
  }

  renderSectionMarkers() {
    this.sectionMarkersContainer.innerHTML = '';
    
    if (!this.duration || !this.markers.length) return;

    this.markers.forEach((marker, index) => {
      const percent = marker.time / this.duration;
      if (percent < 0 || percent > 1) return;

      const markerEl = document.createElement('div');
      markerEl.className = 'timeline-marker';
      markerEl.style.left = `${percent * 100}%`;
      markerEl.dataset.markerId = index.toString();
      markerEl.title = `${marker.label} (${this.formatTime(marker.time)})`;

      const labelEl = document.createElement('div');
      labelEl.className = 'marker-label';
      labelEl.textContent = marker.label;
      markerEl.appendChild(labelEl);

      // Click to seek to marker
      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const seekPercent = marker.time / this.duration;
        this.onSeek(seekPercent);
      });

      this.sectionMarkersContainer.appendChild(markerEl);
    });
  }

  showMarkerContextMenu(e, markerId) {
    // Remove existing context menu
    this.hideMarkerContextMenu();

    const marker = this.markers[parseInt(markerId)];
    if (!marker) return;

    const menu = document.createElement('div');
    menu.className = 'marker-context-menu';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.innerHTML = `
      <button class="marker-menu-item" data-action="edit">✏️ Edit</button>
      <button class="marker-menu-item marker-menu-delete" data-action="delete">🗑️ Delete</button>
    `;

    menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
      this.hideMarkerContextMenu();
      this.onMarkerEdit(parseInt(markerId), marker);
    });

    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      this.hideMarkerContextMenu();
      this.onMarkerDelete(parseInt(markerId));
    });

    document.body.appendChild(menu);
    this.activeContextMenu = menu;

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', this.handleContextMenuClose = () => {
        this.hideMarkerContextMenu();
      }, { once: true });
    }, 0);
  }

  hideMarkerContextMenu() {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove();
      this.activeContextMenu = null;
    }
  }

  addMarkerAtTime(time, label = 'New Marker') {
    this.markers.push({ time, label });
    this.markers.sort((a, b) => a.time - b.time);
    this.renderSectionMarkers();
    return this.markers;
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

    // Time grid
    this.renderTimeGrid();
  }

  renderWaveform() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const data = this.waveformData;
    const barWidth = width / data.length;
    const centerY = height / 2;

    ctx.fillStyle = this.options.waveformColor;

    for (let i = 0; i < data.length; i++) {
      const amplitude = data[i] * (height / 2 - 4);
      const x = i * barWidth;
      ctx.fillRect(x, centerY - amplitude, barWidth - 1, amplitude * 2);
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

  renderTimeGrid() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    if (!this.duration) return;

    // Calculate interval (aim for ~5-10 markers)
    const intervals = [1, 2, 5, 10, 15, 30, 60, 120, 300];
    let interval = 5;
    for (const i of intervals) {
      if (this.duration / i <= 10) {
        interval = i;
        break;
      }
    }

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    ctx.font = '10px system-ui';

    for (let t = interval; t < this.duration; t += interval) {
      const x = (t / this.duration) * width;
      
      // Tick line
      ctx.beginPath();
      ctx.moveTo(x, height - 15);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Time label
      ctx.fillText(this.formatTime(t), x - 10, height - 3);
    }
  }

  getTrimTimes() {
    return {
      start: this.trimStart * this.duration,
      end: this.trimEnd * this.duration
    };
  }
}

export default Timeline;
