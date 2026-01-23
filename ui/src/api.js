/**
 * API client for L👀K Editor
 */

const BASE_URL = '';

async function request(method, path, data = null) {
  const options = {
    method,
    headers: {}
  };
  
  if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${BASE_URL}${path}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export const API = {
  /**
   * Health check
   */
  health() {
    return request('GET', '/api/health');
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
    });
  },
  
  /**
   * Get cursor data for preview
   */
  getCursorData(projectId) {
    return request('GET', `/api/preview/${projectId}/cursor`);
  }
};

export default API;
