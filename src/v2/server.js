import express from 'express';
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

// Active live recording sessions
const liveSessions = new Map();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Active WebSocket connections
const clients = new Set();

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
  const {
    port = process.env.PORT || 3847,
    openBrowser = true,
    host = process.env.HOST || '0.0.0.0'
  } = options;

  const actualPort = parseInt(port, 10);

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json({ limit: '50mb' }));

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
  // REST API Routes
  // ============================================================

  /**
   * GET /api/health - Health check
   */
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.0.0' });
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

  /**
   * POST /api/analyze - Analyze a URL and return analysis + script
   */
  app.post('/api/analyze', async (req, res) => {
    const { url, duration = 25, style = 'professional' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    broadcast('status', { stage: 'analyzing', message: 'Analyzing website...' });

    try {
      // Create a new project
      const project = new Project();
      project.url = url;
      project.settings.duration = duration;
      project.settings.style = style;

      // Capture screenshot and analyze
      const browser = await chromium.launch({ headless: true });
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
    const { projectId, url, options = {} } = req.body;

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

  /**
   * POST /api/render - Render final video with effects
   */
  app.post('/api/render', async (req, res) => {
    const { projectId, outputPath, preset } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

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

      res.json({ success: true, outputPath: finalPath });

    } catch (error) {
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
        import('child_process').then(({ exec }) => {
          const cmd = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
          exec(`${cmd} ${url}`);
        }).catch(() => {
          // Ignore open errors
        });
      }
      
      resolve({ server, app, wss, url });
    });
  });
}

export default startServer;
