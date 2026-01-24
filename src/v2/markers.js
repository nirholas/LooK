/**
 * Marker types for different purposes
 */
export const MarkerType = {
  CHAPTER: 'chapter',      // YouTube chapter markers
  ZOOM: 'zoom',            // Trigger zoom at this point
  HIGHLIGHT: 'highlight',  // Important moment
  CUT: 'cut',             // Edit point
  CUSTOM: 'custom'
};

/**
 * @typedef {Object} Marker
 * @property {string} id - Unique identifier
 * @property {number} time - Time in seconds
 * @property {string} label - Display label
 * @property {MarkerType} type - Marker type
 * @property {Object} [metadata] - Additional data (zoom level, etc.)
 */

/**
 * Generate YouTube chapter format from markers
 * @param {Marker[]} markers
 * @returns {string}
 */
export function generateYouTubeChapters(markers) {
  const chapters = markers
    .filter(m => m.type === MarkerType.CHAPTER || m.type === MarkerType.HIGHLIGHT)
    .sort((a, b) => a.time - b.time);
  
  if (chapters.length === 0) return '';
  
  // YouTube requires first chapter at 0:00
  if (chapters[0].time > 0) {
    chapters.unshift({ time: 0, label: 'Intro' });
  }
  
  return chapters
    .map(m => `${formatTimestamp(m.time)} ${m.label}`)
    .join('\n');
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Generate zoom keyframes from zoom markers
 * @param {Marker[]} markers
 * @param {Object} options
 * @returns {Array}
 */
export function generateZoomFromMarkers(markers, options = {}) {
  const { defaultZoom = 1.4, duration = 1000 } = options;
  
  return markers
    .filter(m => m.type === MarkerType.ZOOM)
    .map(m => ({
      time: m.time * 1000,
      zoom: m.metadata?.zoom || defaultZoom,
      x: m.metadata?.x || 0.5,
      y: m.metadata?.y || 0.5,
      duration
    }));
}

/**
 * Marker templates for common patterns
 */
export const MarkerTemplates = {
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

/**
 * Apply template to duration
 * @param {string} templateName
 * @param {number} duration - Total duration in seconds
 * @returns {Marker[]}
 */
export function applyMarkerTemplate(templateName, duration) {
  const template = MarkerTemplates[templateName];
  if (!template) return [];
  
  return template.map((t, i) => ({
    id: `marker-${i}`,
    time: t.offset * duration,
    label: t.label,
    type: t.type
  }));
}
