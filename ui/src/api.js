/**
 * API client for L👀K Editor
 * Enterprise-grade with authentication and error handling
 */

const BASE_URL = '';

// Store API keys (kept in memory, loaded from settings)
let apiKeys = {
  openai: '',
  groq: ''
};

/**
 * Set API keys for requests
 */
function setApiKeys(keys) {
  if (keys.openai !== undefined) apiKeys.openai = keys.openai;
  if (keys.groq !== undefined) apiKeys.groq = keys.groq;
}

/**
 * Get current API keys
 */
function getApiKeys() {
  return { ...apiKeys };
}

async function request(method, path, data = null, options = {}) {
  const fetchOptions = {
    method,
    headers: {
      'X-OpenAI-Key': apiKeys.openai || '',
      'X-Groq-Key': apiKeys.groq || ''
    }
  };
  
  if (data) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(data);
  }

  // Add timeout support
  const controller = new AbortController();
  const timeout = options.timeout || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, fetchOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        // Response wasn't JSON
      }
      
      const err = new Error(errorMessage);
      err.status = response.status;
      err.statusText = response.statusText;
      throw err;
    }
    
    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return { success: true };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

export const API = {
  // Configuration methods
  setApiKeys,
  getApiKeys,
  
  /**
   * Health check - returns service statuses
   */
  health() {
    return request('GET', '/api/health');
  },

  /**
   * Get server statistics (for enterprise dashboards)
   */
  getStats() {
    return request('GET', '/api/stats');
  },
  
  /**
   * List all projects
   */
  getProjects() {
    return request('GET', '/api/projects');
  },
  
  /**
   * Get project details
   */
  getProject(id) {
    return request('GET', `/api/project/${id}`);
  },
  
  /**
   * Delete a project
   */
  deleteProject(id) {
    return request('DELETE', `/api/project/${id}`);
  },
  
  /**
   * Analyze a URL
   */
  analyze(url, options = {}) {
    return request('POST', '/api/analyze', {
      url,
      duration: options.duration || 25,
      style: options.style || 'professional'
    });
  },
  
  /**
   * Start recording
   */
  record(projectId, options = {}) {
    return request('POST', '/api/record', {
      projectId,
      options
    });
  },
  
  /**
   * Generate voiceover
   */
  generateVoice(projectId, script, voice = 'nova') {
    return request('POST', '/api/voice', {
      projectId,
      script,
      voice
    });
  },
  
  /**
   * Update project settings
   */
  updateProject(id, data) {
    return request('PUT', `/api/project/${id}/settings`, data);
  },
  
  /**
   * Render final video
   */
  render(projectId, preset = 'youtube') {
    return request('POST', '/api/render', {
      projectId,
      preset
    }, { timeout: 300000 }); // 5 min timeout for rendering
  },
  
  /**
   * Get cursor data for preview
   */
  getCursorData(projectId) {
    return request('GET', `/api/preview/${projectId}/cursor`);
  },
  
  /**
   * Get thumbnail URL for a project
   * @param {string} projectId - Project ID
   * @param {Object} options - Thumbnail options
   * @returns {string} Thumbnail URL
   */
  getThumbnailUrl(projectId, options = {}) {
    const params = new URLSearchParams();
    if (options.timestamp) params.set('timestamp', options.timestamp);
    if (options.preset) params.set('preset', options.preset);
    const query = params.toString();
    return `/api/project/${projectId}/thumbnail${query ? '?' + query : ''}`;
  },
  
  // ============================================================
  // Import API
  // ============================================================

  /**
   * Import a project from URL or Git repository
   * @param {string} url - Website URL or Git repo URL
   * @param {Object} options - Import options
   * @returns {Promise<{projectId: string, status: string, importType: string}>}
   */
  importProject(url, options = {}) {
    return request('POST', '/api/import', { url, ...options });
  },

  /**
   * Get import status
   * @param {string} projectId - Project ID
   * @returns {Promise<{status: string, progress: number, error?: string}>}
   */
  getImportStatus(projectId) {
    return request('GET', `/api/import/${projectId}/status`);
  },

  // ============================================================
  // Live Recording API
  // ============================================================

  /**
   * Start a live recording session with real-time preview
   * @param {string} projectIdOrUrl - Project ID or URL to record
   * @param {Object} options - Recording options
   * @returns {Promise<{sessionId: string, projectId: string}>}
   */
  startLiveRecording(projectIdOrUrl, options = {}) {
    // If the first argument looks like a URL, send it as `url`, otherwise as `projectId`.
    const looksLikeUrl = typeof projectIdOrUrl === 'string' && /^(https?:)?\/\//i.test(projectIdOrUrl);
    const body = looksLikeUrl
      ? { url: projectIdOrUrl, options }
      : { projectId: projectIdOrUrl, options };
    return request('POST', '/api/live/start', body);
  },
  
  /**
   * Pause live recording
   * @param {string} sessionId - Session ID
   */
  pauseLiveRecording(sessionId) {
    return request('POST', `/api/live/${sessionId}/pause`);
  },
  
  /**
   * Resume live recording
   * @param {string} sessionId - Session ID
   */
  resumeLiveRecording(sessionId) {
    return request('POST', `/api/live/${sessionId}/resume`);
  },
  
  /**
   * Stop live recording
   * @param {string} sessionId - Session ID
   */
  stopLiveRecording(sessionId) {
    return request('POST', `/api/live/${sessionId}/stop`);
  },
  
  /**
   * Enable manual control mode
   * @param {string} sessionId - Session ID
   */
  enableManualMode(sessionId) {
    return request('POST', `/api/live/${sessionId}/manual`);
  },
  
  /**
   * Perform action during live recording
   * @param {string} sessionId - Session ID
   * @param {Object} action - Action to perform (type, x, y, etc.)
   */
  liveAction(sessionId, action) {
    return request('POST', `/api/live/${sessionId}/action`, action);
  },
  
  /**
   * Get live session status
   * @param {string} sessionId - Session ID
   */
  getLiveStatus(sessionId) {
    return request('GET', `/api/live/${sessionId}/status`);
  },
  
  /**
   * List all active live sessions
   */
  listLiveSessions() {
    return request('GET', '/api/live/sessions');
  },

  // ============================================================
  // Markers API
  // ============================================================

  /**
   * Get project markers
   * @param {string} projectId - Project ID
   * @returns {Promise<{markers: Array, duration: number}>}
   */
  getMarkers(projectId) {
    return request('GET', `/api/project/${projectId}/markers`);
  },

  /**
   * Update project markers
   * @param {string} projectId - Project ID
   * @param {Array} markers - Array of markers
   * @returns {Promise<{success: boolean, markers: Array}>}
   */
  updateMarkers(projectId, markers) {
    return request('PUT', `/api/project/${projectId}/markers`, { markers });
  },

  /**
   * Export markers as YouTube chapters format
   * @param {string} projectId - Project ID
   * @returns {Promise<{chapters: string, markers: number, format: string}>}
   */
  getYouTubeChapters(projectId) {
    return request('GET', `/api/project/${projectId}/chapters`);
  },

  // ============================================================
  // Enterprise / Batch API
  // ============================================================

  /**
   * Batch export multiple projects
   * @param {Array<{projectId: string, presets: string[]}>} jobs - Export jobs
   * @returns {Promise<{status: string, totalJobs: number, results: Array}>}
   */
  batchExport(jobs) {
    return request('POST', '/api/batch/export', { jobs }, { timeout: 600000 }); // 10 min timeout
  },

  /**
   * Get download URL for a project's final video
   * @param {string} projectId - Project ID
   * @returns {string} Download URL
   */
  getDownloadUrl(projectId) {
    return `/api/download/${projectId}`;
  }
};

export default API;
