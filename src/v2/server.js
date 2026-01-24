import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, copyFile, access, readFile, stat } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import chalk from 'chalk';

import { Project } from './project.js';
import { analyzeWebsite, generateScript, generateVoiceover } from './ai.js';
import { recordBrowser } from './recorder.js';
import { LiveRecorder } from './live-recorder.js';
import { AutoZoom } from './auto-zoom.js';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { detectImportType, validateUrl, processImport } from './import.js';
import { openApiSpec, generateSwaggerHtml } from './openapi.js';
import { createLogger, httpLogger } from './logger.js';
import { errorHandler, ValidationError, NotFoundError, asyncHandler } from './errors.js';

// Auth and billing (lazy loaded to avoid startup errors if deps not installed)
let authRoutes, billingRoutes, initDatabase;
try {
  authRoutes = (await import('../auth/routes.js')).default;
  billingRoutes = (await import('../billing/stripe.js')).default;
  const db = await import('../db/index.js');
  initDatabase = db.initDatabase;
} catch (err) {
  console.warn('Auth/billing modules not loaded:', err.message);
}

// Create server logger
const log = createLogger('server');

// Active live recording sessions
const liveSessions = new Map();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Active WebSocket connections
const clients = new Set();

/**
 * Format seconds as HH:MM:SS for FFmpeg
 */
function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

/**
 * Send message to specific client
 */
function sendToClient(ws, type, data) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
  }
}

/**
 * Start the web UI server
 */
export async function startServer(options = {}) {
  log.info('Starting server', { options });
  
  const {
    port = process.env.PORT || 3847,
    openBrowser = true,
    host = process.env.HOST || '0.0.0.0'
  } = options;

  const actualPort = parseInt(port, 10);
  log.debug('Server configuration', { host, port: actualPort });

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());
  
  // Initialize database if available
  if (initDatabase) {
    try {
      initDatabase();
      log.info('Database initialized');
    } catch (err) {
      log.warn('Database init failed:', err.message);
    }
  }
  
  // HTTP request logging
  app.use(httpLogger({ logger: log }));

  // ============================================================
  // API Documentation (OpenAPI/Swagger)
  // ============================================================
  
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(generateSwaggerHtml('/api/openapi.json'));
  });
  
  app.get('/api/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  // Middleware to allow API keys via headers (for web UI Settings)
  // This allows users to set API keys in the browser without server restart
  app.use((req, res, next) => {
    const openaiKey = req.headers['x-openai-key'];
    const groqKey = req.headers['x-groq-key'];
    
    // Store original env values to restore after request
    req._originalEnv = {};
    
    // Validate and set OpenAI key (must start with sk- and be real, not placeholder)
    if (openaiKey && openaiKey.startsWith('sk-') && openaiKey.length >= 20 && 
        !openaiKey.includes('your-key') && !openaiKey.includes('your_key')) {
      req._originalEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = openaiKey;
    }
    
    // Validate and set Groq key (must start with gsk_ and be real)
    if (groqKey && groqKey.startsWith('gsk_') && groqKey.length >= 20 &&
        !groqKey.includes('your-key') && !groqKey.includes('your_key')) {
      req._originalEnv.GROQ_API_KEY = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = groqKey;
    }
    
    // Restore env after response
    res.on('finish', () => {
      if (req._originalEnv.OPENAI_API_KEY !== undefined) {
        if (req._originalEnv.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = req._originalEnv.OPENAI_API_KEY;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
      if (req._originalEnv.GROQ_API_KEY !== undefined) {
        if (req._originalEnv.GROQ_API_KEY) {
          process.env.GROQ_API_KEY = req._originalEnv.GROQ_API_KEY;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }
    });
    
    next();
  });

  // Serve static UI files
  const uiDistPath = join(__dirname, '../../ui/dist');
  const uiSrcPath = join(__dirname, '../../ui');
  
  // Try serving built UI first, fallback to src for development
  if (existsSync(uiDistPath)) {
    app.use(express.static(uiDistPath));
  } else if (existsSync(uiSrcPath)) {
    app.use(express.static(uiSrcPath));
  }

  // ============================================================
  // Usage Metrics (in-memory for now)
  // ============================================================
  const metrics = {
    startTime: Date.now(),
    requests: 0,
    projectsCreated: 0,
    recordingsStarted: 0,
    exportsCompleted: 0,
    errors: 0,
    apiCalls: {
      analyze: 0,
      record: 0,
      render: 0,
      import: 0
    }
  };

  // Middleware to track requests
  app.use((req, res, next) => {
    metrics.requests++;
    next();
  });

  // ============================================================
  // Auth & Billing Routes
  // ============================================================
  if (authRoutes) {
    app.use('/auth', authRoutes);
    log.info('Auth routes enabled at /auth');
  }
  
  if (billingRoutes) {
    app.use('/billing', billingRoutes);
    log.info('Billing routes enabled at /billing');
  }

  // ============================================================
  // REST API Routes
  // ============================================================

  /**
   * GET /api/health - Health check with diagnostics
   */
  app.get('/api/health', async (req, res) => {
    // Determine service status based on whether keys are set
    // The middleware above may have temporarily set keys from headers
    const openaiConfigured = !!process.env.OPENAI_API_KEY;
    const groqConfigured = !!process.env.GROQ_API_KEY;
    
    const checks = {
      status: 'ok',
      version: '2.1.0',
      services: {
        // Return 'connected' if configured so UI shows green
        openai: openaiConfigured ? 'connected' : 'not-configured',
        groq: groqConfigured ? 'connected' : 'not-configured',
        playwright: 'ready' // Assume ready since we're running
      },
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      timestamp: new Date().toISOString()
    };
    
    // Quick Playwright check (only if requested)
    if (req.query.full === 'true') {
      try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
        await browser.close();
        checks.services.playwright = 'ready';
      } catch (e) {
        checks.services.playwright = 'error';
        checks.playwrightError = e.message;
      }
    }
    
    res.json(checks);
  });

  /**
   * GET /api/stats - Get usage statistics (for enterprise dashboards)
   */
  app.get('/api/stats', (req, res) => {
    res.json({
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      requests: metrics.requests,
      projectsCreated: metrics.projectsCreated,
      recordingsStarted: metrics.recordingsStarted,
      exportsCompleted: metrics.exportsCompleted,
      errors: metrics.errors,
      apiCalls: { ...metrics.apiCalls },
      activeConnections: clients.size,
      activeLiveSessions: liveSessions.size
    });
  });

  /**
   * GET /api/projects - List all projects
   */
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await Project.list();
      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/project/:id - Get project details
   */
  app.get('/api/project/:id', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      res.json(project.toJSON());
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  /**
   * DELETE /api/project/:id - Delete a project
   */
  app.delete('/api/project/:id', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      await project.delete();
      res.json({ success: true });
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  // ============================================================
  // Import API - Import projects from URL or Git repository
  // ============================================================

  /**
   * POST /api/import - Import a project from URL or Git repository
   * 
   * Body:
   * - url: string (required) - Website URL or Git repo URL
   * - type: 'website' | 'git' | 'auto' (default: 'auto')
   * - options: object - Additional options
   */
  app.post('/api/import', async (req, res) => {
    const { url, type = 'auto', options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    metrics.apiCalls.import++;
    
    // Validate URL
    try {
      validateUrl(url);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Auto-detect type
    let importType = type;
    if (type === 'auto') {
      importType = detectImportType(url);
    }
    
    try {
      // Create project
      const project = new Project();
      project.url = url;
      project.importType = importType;
      project.importStatus = 'pending';
      await project.save();
      
      // Start async import (don't await)
      processImport(project.id, url, importType, options, broadcast).catch(err => {
        console.error('Import failed:', err);
      });
      
      res.json({
        projectId: project.id,
        status: 'pending',
        importType,
        message: `Importing ${importType} project...`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/import/:projectId/status - Get import status
   */
  app.get('/api/import/:projectId/status', async (req, res) => {
    try {
      const project = await Project.load(req.params.projectId);
      res.json({
        projectId: project.id,
        status: project.importStatus || 'unknown',
        progress: project.importProgress || 0,
        error: project.importError,
        analysis: project.analysis,
        hasScript: !!project.script
      });
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  /**
   * POST /api/analyze - Analyze a URL and return analysis + script
   */
  app.post('/api/analyze', async (req, res) => {
    const { url, duration = 25, style = 'professional' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    metrics.apiCalls.analyze++;
    metrics.projectsCreated++;
    broadcast('status', { stage: 'analyzing', message: 'Analyzing website...' });

    try {
      // Create a new project
      const project = new Project();
      project.url = url;
      project.settings.duration = duration;
      project.settings.style = style;

      // Capture screenshot and analyze
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      const page = await browser.newPage({ 
        viewport: { width: project.settings.width, height: project.settings.height } 
      });
      
      broadcast('status', { stage: 'analyzing', message: 'Loading page...' });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const screenshot = await page.screenshot({ encoding: 'base64' });
      const metadata = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || ''
      }));
      metadata.url = url;

      await browser.close();

      broadcast('status', { stage: 'analyzing', message: 'AI analyzing screenshot...' });
      const analysis = await analyzeWebsite(screenshot, metadata);
      project.analysis = analysis;

      broadcast('status', { stage: 'scripting', message: 'Generating script...' });
      const script = await generateScript(analysis, { duration, style });
      project.script = script;

      // Save the project
      await project.save();

      broadcast('status', { stage: 'complete', message: 'Analysis complete' });
      res.json({
        projectId: project.id,
        analysis,
        script,
        settings: project.settings
      });

    } catch (error) {
      broadcast('error', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/record - Start recording a URL
   */
  app.post('/api/record', async (req, res) => {
    const { projectId, url, options = {} } = req.body;

    metrics.apiCalls.record++;
    metrics.recordingsStarted++;
    let project;
    
    try {
      if (projectId) {
        project = await Project.load(projectId);
      } else if (url) {
        project = new Project();
        project.url = url;
      } else {
        return res.status(400).json({ error: 'projectId or url is required' });
      }

      // Merge options into settings
      Object.assign(project.settings, options);

      broadcast('status', { stage: 'recording', message: 'Starting browser recording...', progress: 0 });

      // Record the browser
      const { videoPath, cursorData, tempDir } = await recordBrowser(project.url, {
        width: project.settings.width,
        height: project.settings.height,
        duration: project.settings.duration * 1000
      });

      broadcast('status', { stage: 'recording', message: 'Recording complete', progress: 50 });

      // Copy video to project directory
      const projectDir = project.getProjectDir();
      await mkdir(projectDir, { recursive: true });
      
      const destVideoPath = join(projectDir, 'raw-video.webm');
      await copyFile(videoPath, destVideoPath);
      project.rawVideo = destVideoPath;
      project.cursorData = cursorData;

      // Calculate zoom keyframes
      broadcast('status', { stage: 'processing', message: 'Calculating zoom effects...', progress: 60 });
      
      const autoZoom = new AutoZoom({
        defaultZoom: 1.2 + (project.settings.zoom.maxZoom - 1) * 0.3,
        maxZoom: project.settings.zoom.maxZoom,
        minZoom: project.settings.zoom.minZoom,
        zoomDuration: project.settings.zoom.speed === 'slow' ? 1200 : 
                      project.settings.zoom.speed === 'fast' ? 400 : 800,
        holdDuration: 2000,
        width: project.settings.width,
        height: project.settings.height
      });

      let zoomKeyframes = [];
      if (project.settings.zoom.mode !== 'none') {
        if (project.settings.zoom.mode === 'follow') {
          zoomKeyframes = autoZoom.generateFollowZoom(
            cursorData.frames,
            project.settings.duration * 1000,
            project.settings.zoom.intensity
          );
        } else if (project.settings.zoom.mode === 'smart') {
          zoomKeyframes = autoZoom.generateSmartZoom({
            clicks: cursorData.clicks,
            hovers: cursorData.hovers || [],
            focusPoints: project.analysis?.focusPoints || [],
            duration: project.settings.duration * 1000
          });
        } else {
          zoomKeyframes = autoZoom.generateBasicZoom(
            project.analysis?.focusPoints || [],
            project.settings.duration * 1000
          );
        }
      }
      project.zoomKeyframes = zoomKeyframes;

      // Get video duration
      project.timeline.duration = project.settings.duration;

      await project.save();

      broadcast('status', { stage: 'complete', message: 'Recording saved', progress: 100 });

      res.json({
        projectId: project.id,
        success: true
      });

    } catch (error) {
      broadcast('error', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // Live Recording API - Real-time preview with pause/resume
  // ============================================================

  /**
   * POST /api/live/start - Start a live recording session with real-time preview
   * 
   * Creates a new recording session where you can:
   * - Watch the recording in real-time via WebSocket frames
   * - Pause and resume at any time
   * - Take manual control of the cursor
   * - Stop early or let it run for the full duration
   */
  app.post('/api/live/start', async (req, res) => {
    let { projectId, url, options = {} } = req.body;

    // Smart detection: if projectId looks like a URL, treat it as url
    if (projectId && !url && /^https?:\/\//i.test(projectId)) {
      url = projectId;
      projectId = null;
    }

    let project;
    
    try {
      if (projectId) {
        project = await Project.load(projectId);
      } else if (url) {
        project = new Project();
        project.url = url;
      } else {
        return res.status(400).json({ error: 'projectId or url is required' });
      }

      // Generate session ID
      const sessionId = `live-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Create live recorder
      const recorder = new LiveRecorder({
        width: options.width || project.settings.width,
        height: options.height || project.settings.height,
        duration: (options.duration || project.settings.duration) * 1000,
        headless: options.headless ?? false, // Default to visible browser
        previewFps: options.previewFps || 10,
        autoDemo: options.autoDemo ?? true
      });
      
      // Set up event handlers
      recorder.on('frame', (frame) => {
        // Broadcast frame to subscribed WebSocket clients
        for (const client of clients) {
          if (client.liveSessionId === sessionId && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'live-frame',
              sessionId,
              data: frame,
              timestamp: Date.now()
            }));
          }
        }
      });
      
      recorder.on('stateChange', (state) => {
        broadcast('live-state', { sessionId, ...state });
      });
      
      recorder.on('click', (click) => {
        broadcast('live-click', { sessionId, ...click });
      });
      
      recorder.on('complete', async (result) => {
        // Save recording to project
        if (result.videoPath && project) {
          const projectDir = project.getProjectDir();
          await mkdir(projectDir, { recursive: true });
          
          const destVideoPath = join(projectDir, 'raw-video.webm');
          await copyFile(result.videoPath, destVideoPath);
          project.rawVideo = destVideoPath;
          project.cursorData = result.cursorData;
          project.timeline.duration = result.duration / 1000;
          
          await project.save();
        }
        
        broadcast('live-complete', { 
          sessionId, 
          projectId: project?.id,
          duration: result.duration 
        });
        
        // Clean up session
        liveSessions.delete(sessionId);
      });
      
      recorder.on('error', (error) => {
        broadcast('live-error', { sessionId, error: error.message });
        liveSessions.delete(sessionId);
      });
      
      // Store session
      liveSessions.set(sessionId, { recorder, project });
      
      // Start recording
      await recorder.start(project.url);
      
      res.json({
        sessionId,
        projectId: project.id,
        state: recorder.state,
        message: 'Live recording started. Connect via WebSocket to receive frames.'
      });

    } catch (error) {
      broadcast('error', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/live/:sessionId/pause - Pause the live recording
   */
  app.post('/api/live/:sessionId/pause', async (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
      await session.recorder.pause();
      res.json({ 
        state: session.recorder.state, 
        elapsed: session.recorder.getElapsedTime() 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /api/live/:sessionId/resume - Resume the live recording
   */
  app.post('/api/live/:sessionId/resume', async (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
      await session.recorder.resume();
      res.json({ 
        state: session.recorder.state, 
        elapsed: session.recorder.getElapsedTime() 
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /api/live/:sessionId/stop - Stop the live recording
   */
  app.post('/api/live/:sessionId/stop', async (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    try {
      const result = await session.recorder.stop();
      res.json({ 
        success: true,
        projectId: session.project?.id,
        duration: result.duration
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /api/live/:sessionId/manual - Enable manual control mode
   */
  app.post('/api/live/:sessionId/manual', async (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.recorder.enableManualMode();
    res.json({ manualMode: true });
  });

  /**
   * POST /api/live/:sessionId/action - Perform an action during live recording
   * 
   * Body: { type: 'move' | 'click' | 'scroll' | 'type', ... }
   */
  app.post('/api/live/:sessionId/action', async (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { type, x, y, duration, amount, text } = req.body;
    
    try {
      switch (type) {
        case 'move':
          await session.recorder.moveCursor(x, y, duration || 300);
          break;
        case 'click':
          if (x !== undefined && y !== undefined) {
            await session.recorder.moveCursor(x, y, 200);
          }
          await session.recorder.click();
          break;
        case 'scroll':
          await session.recorder.scroll(amount || 300);
          break;
        case 'type':
          await session.recorder.type(text || '');
          break;
        default:
          return res.status(400).json({ error: `Unknown action type: ${type}` });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * GET /api/live/:sessionId/status - Get current session status
   */
  app.get('/api/live/:sessionId/status', (req, res) => {
    const session = liveSessions.get(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId: req.params.sessionId,
      state: session.recorder.state,
      elapsed: session.recorder.getElapsedTime(),
      manualMode: session.recorder.manualMode,
      projectId: session.project?.id
    });
  });

  /**
   * GET /api/live/sessions - List all active live sessions
   */
  app.get('/api/live/sessions', (req, res) => {
    const sessions = [];
    for (const [sessionId, session] of liveSessions) {
      sessions.push({
        sessionId,
        state: session.recorder.state,
        elapsed: session.recorder.getElapsedTime(),
        projectId: session.project?.id
      });
    }
    res.json({ sessions });
  });

  /**
   * POST /api/voice - Generate voiceover for a project
   */
  app.post('/api/voice', async (req, res) => {
    const { projectId, script, voice = 'nova' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    try {
      const project = await Project.load(projectId);
      
      if (script) {
        project.script = script;
      }

      if (!project.script) {
        return res.status(400).json({ error: 'No script available' });
      }

      project.settings.voice = voice;

      broadcast('status', { stage: 'voice', message: 'Generating voiceover...' });

      const projectDir = project.getProjectDir();
      const voicePath = join(projectDir, 'voiceover.mp3');
      
      await generateVoiceover(project.script, {
        voice,
        outputPath: voicePath
      });

      project.voiceover = voicePath;
      await project.save();

      broadcast('status', { stage: 'complete', message: 'Voiceover generated' });

      res.json({ success: true, voicePath });

    } catch (error) {
      broadcast('error', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/project/:id/settings - Update project settings
   */
  app.put('/api/project/:id/settings', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      
      // Deep merge settings
      const mergeDeep = (target, source) => {
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {};
            mergeDeep(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      };

      mergeDeep(project.settings, req.body.settings || {});
      
      if (req.body.script) {
        project.script = req.body.script;
      }
      
      if (req.body.timeline) {
        Object.assign(project.timeline, req.body.timeline);
      }

      await project.save();

      res.json(project.toJSON());

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // Markers API - Timeline markers and YouTube chapters
  // ============================================================

  /**
   * GET /api/project/:id/markers - Get project markers
   */
  app.get('/api/project/:id/markers', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      res.json({
        markers: project.timeline?.markers || [],
        duration: project.timeline?.duration || 0
      });
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  /**
   * PUT /api/project/:id/markers - Update project markers
   */
  app.put('/api/project/:id/markers', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      project.timeline = project.timeline || {};
      project.timeline.markers = req.body.markers || [];
      await project.save();
      res.json({ success: true, markers: project.timeline.markers });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/project/:id/chapters - Export markers as YouTube chapters format
   */
  app.get('/api/project/:id/chapters', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      const { generateYouTubeChapters, MarkerType } = await import('./markers.js');
      
      const markers = (project.timeline?.markers || []).map(m => ({
        time: m.time,
        label: m.label,
        type: m.type || MarkerType.CHAPTER
      }));
      
      const chapters = generateYouTubeChapters(markers);
      
      // Return as plain text or JSON based on Accept header
      if (req.accepts('text/plain')) {
        res.type('text/plain').send(chapters);
      } else {
        res.json({ 
          chapters,
          markers: markers.length,
          format: 'youtube'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/render - Render final video with effects
   */
  app.post('/api/render', async (req, res) => {
    const { projectId, outputPath, preset } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    metrics.apiCalls.render++;

    try {
      const project = await Project.load(projectId);

      if (!project.rawVideo) {
        return res.status(400).json({ error: 'No video to render' });
      }

      if (preset) {
        project.settings.preset = preset;
      }

      const finalPath = outputPath || join(project.getProjectDir(), `final-${Date.now()}.mp4`);

      await project.exportFinal(finalPath, {
        onProgress: (progress) => {
          broadcast('render-progress', progress);
        }
      });

      metrics.exportsCompleted++;
      res.json({ success: true, outputPath: finalPath });

    } catch (error) {
      metrics.errors++;
      broadcast('error', { message: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/preview/:id/video - Stream raw video for preview
   */
  app.get('/api/preview/:id/video', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);

      if (!project.rawVideo) {
        return res.status(404).json({ error: 'No video available' });
      }

      const videoStat = await stat(project.rawVideo);
      const fileSize = videoStat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/webm'
        });

        createReadStream(project.rawVideo, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/webm'
        });
        createReadStream(project.rawVideo).pipe(res);
      }

    } catch (error) {
      res.status(404).json({ error: 'Video not found' });
    }
  });

  /**
   * GET /api/preview/:id/audio - Stream voiceover audio
   */
  app.get('/api/preview/:id/audio', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);

      if (!project.voiceover) {
        return res.status(404).json({ error: 'No audio available' });
      }

      const audioStat = await stat(project.voiceover);
      res.writeHead(200, {
        'Content-Length': audioStat.size,
        'Content-Type': 'audio/mpeg'
      });
      createReadStream(project.voiceover).pipe(res);

    } catch (error) {
      res.status(404).json({ error: 'Audio not found' });
    }
  });

  /**
   * GET /api/preview/:id/cursor - Get cursor data for overlay
   */
  app.get('/api/preview/:id/cursor', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      res.json({
        cursorData: project.cursorData,
        zoomKeyframes: project.zoomKeyframes,
        settings: project.settings
      });
    } catch (error) {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  /**
   * GET /api/download/:id - Download final rendered video
   */
  app.get('/api/download/:id', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      const projectDir = project.getProjectDir();
      
      // Find the most recent final video
      const { readdir } = await import('fs/promises');
      const files = await readdir(projectDir);
      const finalFiles = files.filter(f => f.startsWith('final-') && f.endsWith('.mp4'));
      
      if (finalFiles.length === 0) {
        return res.status(404).json({ error: 'No rendered video available' });
      }

      // Sort by name (which includes timestamp) and get most recent
      finalFiles.sort().reverse();
      const latestFinal = join(projectDir, finalFiles[0]);

      const videoStat = await stat(latestFinal);
      res.writeHead(200, {
        'Content-Length': videoStat.size,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="demo-${project.id.slice(0, 8)}.mp4"`
      });
      createReadStream(latestFinal).pipe(res);

    } catch (error) {
      res.status(404).json({ error: 'Video not found' });
    }
  });

  /**
   * GET /api/project/:id/thumbnail - Generate and return a thumbnail from the video
   * Query params:
   * - timestamp: time in seconds (default: 2)
   * - preset: youtube, twitter, instagram, og, square (default: youtube)
   */
  app.get('/api/project/:id/thumbnail', async (req, res) => {
    try {
      const project = await Project.load(req.params.id);
      
      if (!project.rawVideo) {
        return res.status(404).json({ error: 'No video available for thumbnail' });
      }
      
      const { extractFrame, THUMBNAIL_PRESETS } = await import('./thumbnail.js');
      
      const timestamp = req.query.timestamp || '2';
      const preset = req.query.preset || 'youtube';
      const dimensions = THUMBNAIL_PRESETS[preset] || THUMBNAIL_PRESETS.youtube;
      
      const projectDir = project.getProjectDir();
      const thumbnailPath = join(projectDir, `thumbnail-${preset}-${Date.now()}.jpg`);
      
      await extractFrame(project.rawVideo, thumbnailPath, {
        timestamp: typeof timestamp === 'number' ? formatTimestamp(timestamp) : timestamp,
        width: dimensions.width,
        height: dimensions.height,
        quality: 2
      });
      
      const thumbStat = await stat(thumbnailPath);
      res.writeHead(200, {
        'Content-Length': thumbStat.size,
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `inline; filename="thumbnail-${project.id.slice(0, 8)}.jpg"`
      });
      createReadStream(thumbnailPath).pipe(res);
      
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      res.status(500).json({ error: 'Failed to generate thumbnail: ' + error.message });
    }
  });

  /**
   * POST /api/batch/export - Export multiple projects to different presets
   * Enterprise feature for bulk exports
   * 
   * Body:
   * - jobs: Array of { projectId, presets: ['youtube', 'twitter', ...] }
   */
  app.post('/api/batch/export', async (req, res) => {
    const { jobs } = req.body;
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'jobs array is required' });
    }
    
    if (jobs.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 jobs per batch' });
    }
    
    const results = [];
    let completed = 0;
    
    // Process jobs sequentially to avoid overwhelming the system
    for (const job of jobs) {
      const { projectId, presets = ['youtube'] } = job;
      
      try {
        const project = await Project.load(projectId);
        
        if (!project.rawVideo) {
          results.push({
            projectId,
            status: 'error',
            error: 'No video to render'
          });
          continue;
        }
        
        const exports = [];
        
        for (const preset of presets) {
          const projectDir = project.getProjectDir();
          const outputPath = join(projectDir, `export-${preset}-${Date.now()}.mp4`);
          
          await project.exportFinal(outputPath, {
            preset,
            onProgress: (progress) => {
              broadcast('batch-progress', {
                projectId,
                preset,
                progress,
                completedJobs: completed,
                totalJobs: jobs.length
              });
            }
          });
          
          exports.push({ preset, outputPath });
          metrics.exportsCompleted++;
        }
        
        results.push({
          projectId,
          status: 'success',
          exports
        });
        
      } catch (error) {
        metrics.errors++;
        results.push({
          projectId,
          status: 'error',
          error: error.message
        });
      }
      
      completed++;
      broadcast('batch-progress', {
        completedJobs: completed,
        totalJobs: jobs.length
      });
    }
    
    res.json({
      status: 'complete',
      totalJobs: jobs.length,
      successfulJobs: results.filter(r => r.status === 'success').length,
      failedJobs: results.filter(r => r.status === 'error').length,
      results
    });
  });

  // ============================================================
  // WebSocket handling
  // ============================================================

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(chalk.dim('  WebSocket client connected'));

    sendToClient(ws, 'connected', { message: 'Connected to L👀K server' });

    ws.on('message', async (data) => {
      try {
        const { action, payload } = JSON.parse(data);
        
        switch (action) {
          case 'ping':
            sendToClient(ws, 'pong', { time: Date.now() });
            break;
            
          case 'subscribe':
            // Client wants to subscribe to project updates
            ws.projectId = payload.projectId;
            break;
          
          // Live recording subscription
          case 'subscribe-live':
            // Subscribe to live recording frame stream
            ws.liveSessionId = payload.sessionId;
            const session = liveSessions.get(payload.sessionId);
            if (session) {
              sendToClient(ws, 'live-subscribed', { 
                sessionId: payload.sessionId,
                state: session.recorder.state,
                elapsed: session.recorder.getElapsedTime()
              });
            } else {
              sendToClient(ws, 'error', { message: 'Session not found' });
            }
            break;
            
          case 'unsubscribe-live':
            // Unsubscribe from live recording
            ws.liveSessionId = null;
            sendToClient(ws, 'live-unsubscribed', { sessionId: payload.sessionId });
            break;
          
          // Live recording controls via WebSocket (low latency)
          case 'live-pause':
            {
              const sess = liveSessions.get(payload.sessionId);
              if (sess) {
                await sess.recorder.pause();
                sendToClient(ws, 'live-state', { 
                  sessionId: payload.sessionId,
                  state: sess.recorder.state 
                });
              }
            }
            break;
            
          case 'live-resume':
            {
              const sess = liveSessions.get(payload.sessionId);
              if (sess) {
                await sess.recorder.resume();
                sendToClient(ws, 'live-state', { 
                  sessionId: payload.sessionId,
                  state: sess.recorder.state 
                });
              }
            }
            break;
            
          case 'live-stop':
            {
              const sess = liveSessions.get(payload.sessionId);
              if (sess) {
                await sess.recorder.stop();
              }
            }
            break;
            
          case 'live-action':
            // Perform action during live recording
            {
              const sess = liveSessions.get(payload.sessionId);
              if (sess) {
                const { type, x, y, duration, amount, text } = payload;
                switch (type) {
                  case 'move':
                    await sess.recorder.moveCursor(x, y, duration || 300);
                    break;
                  case 'click':
                    if (x !== undefined && y !== undefined) {
                      await sess.recorder.moveCursor(x, y, 200);
                    }
                    await sess.recorder.click();
                    break;
                  case 'scroll':
                    await sess.recorder.scroll(amount || 300);
                    break;
                  case 'type':
                    await sess.recorder.type(text || '');
                    break;
                }
              }
            }
            break;
            
          default:
            sendToClient(ws, 'error', { message: `Unknown action: ${action}` });
        }
      } catch (error) {
        sendToClient(ws, 'error', { message: error.message });
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(chalk.dim('  WebSocket client disconnected'));
    });
  });

  // ============================================================
  // Error Handler (must be after all routes)
  // ============================================================
  
  app.use(errorHandler);

  // ============================================================
  // Fallback route for SPA
  // ============================================================

  app.get('*', (req, res) => {
    const indexPath = existsSync(uiDistPath) 
      ? join(uiDistPath, 'index.html')
      : join(uiSrcPath, 'index.html');
    
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('UI not found. Run `npm run build:ui` first.');
    }
  });

  // ============================================================
  // Start server
  // ============================================================

  return new Promise((resolve) => {
    // Bind to 0.0.0.0 to allow external connections (required for Docker/Railway)
    server.listen(actualPort, host, () => {
      const url = `http://localhost:${actualPort}`;
      console.log(chalk.green(`\n✨ L👀K Editor running at ${chalk.bold(url)}`));
      console.log(chalk.dim(`   Listening on ${host}:${actualPort}\n`));
      
      // Don't try to open browser in production/container environments
      if (openBrowser && !process.env.PORT) {
        import('child_process').then(({ execFile }) => {
          const cmd = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
          // Use execFile with args array for safety (even though url is internal)
          execFile(cmd, [url], (err) => {
            // Ignore open errors silently
          });
        }).catch(() => {
          // Ignore open errors
        });
      }
      
      resolve({ server, app, wss, url });
    });
  });
}

export default startServer;
