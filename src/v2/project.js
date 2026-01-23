import { mkdir, readFile, writeFile, rm, access, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { tmpdir, homedir } from 'os';
import { randomUUID } from 'crypto';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { generateVoiceover } from './ai.js';

/**
 * Project state management for the web UI editor
 * Handles saving/loading project state and exporting final videos
 */
export class Project {
  constructor(id = null) {
    this.id = id || randomUUID();
    this.url = null;
    this.analysis = null;
    this.script = null;
    this.rawVideo = null;        // Path to unprocessed recording
    this.voiceover = null;       // Path to voiceover audio
    this.cursorData = null;      // Cursor tracking data
    this.zoomKeyframes = null;   // Calculated zoom keyframes
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    
    this.settings = {
      duration: 25,
      voice: 'nova',
      style: 'professional',
      preset: 'youtube',
      width: 1920,
      height: 1080,
      fps: 60,
      zoom: {
        mode: 'smart',
        intensity: 0.5,
        maxZoom: 2.0,
        minZoom: 1.0,
        onClicks: true,
        onHover: true,
        speed: 'medium'
      },
      cursor: {
        style: 'default',
        size: 24,
        color: '#000000'
      },
      clickEffect: {
        type: 'ripple',
        color: '#3B82F6',
        size: 60,
        duration: 400,
        opacity: 0.6
      }
    };
    
    this.timeline = {
      trimStart: 0,        // Start trim point in seconds
      trimEnd: null,       // End trim point (null = full length)
      markers: [],         // Section markers [{time: 5, label: 'Feature 1'}]
      duration: 0          // Actual video duration
    };
  }

  /**
   * Get the project directory path
   */
  static getProjectsDir() {
    return join(homedir(), '.repovideo', 'projects');
  }

  /**
   * Get the path for this project
   */
  getProjectDir() {
    return join(Project.getProjectsDir(), this.id);
  }

  /**
   * Save project to disk
   */
  async save() {
    const projectDir = this.getProjectDir();
    await mkdir(projectDir, { recursive: true });
    
    this.updatedAt = new Date().toISOString();
    
    // Save project metadata
    const metadata = {
      id: this.id,
      url: this.url,
      analysis: this.analysis,
      script: this.script,
      settings: this.settings,
      timeline: this.timeline,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Store relative paths for portability
      rawVideo: this.rawVideo ? basename(this.rawVideo) : null,
      voiceover: this.voiceover ? basename(this.voiceover) : null,
      cursorData: this.cursorData ? 'cursor-data.json' : null,
      zoomKeyframes: this.zoomKeyframes ? 'zoom-keyframes.json' : null
    };
    
    await writeFile(
      join(projectDir, 'project.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Save cursor data separately (can be large)
    if (this.cursorData) {
      await writeFile(
        join(projectDir, 'cursor-data.json'),
        JSON.stringify(this.cursorData, null, 2)
      );
    }
    
    // Save zoom keyframes
    if (this.zoomKeyframes) {
      await writeFile(
        join(projectDir, 'zoom-keyframes.json'),
        JSON.stringify(this.zoomKeyframes, null, 2)
      );
    }
    
    return projectDir;
  }

  /**
   * Load project from disk
   */
  static async load(projectIdOrDir) {
    let projectDir;
    
    // Check if it's a path or an ID
    try {
      await access(projectIdOrDir);
      projectDir = projectIdOrDir;
    } catch {
      projectDir = join(Project.getProjectsDir(), projectIdOrDir);
    }
    
    const metadataPath = join(projectDir, 'project.json');
    const metadataJson = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataJson);
    
    const project = new Project(metadata.id);
    project.url = metadata.url;
    project.analysis = metadata.analysis;
    project.script = metadata.script;
    project.settings = { ...project.settings, ...metadata.settings };
    project.timeline = { ...project.timeline, ...metadata.timeline };
    project.createdAt = metadata.createdAt;
    project.updatedAt = metadata.updatedAt;
    
    // Resolve paths
    if (metadata.rawVideo) {
      project.rawVideo = join(projectDir, metadata.rawVideo);
    }
    if (metadata.voiceover) {
      project.voiceover = join(projectDir, metadata.voiceover);
    }
    
    // Load cursor data
    if (metadata.cursorData) {
      try {
        const cursorJson = await readFile(join(projectDir, 'cursor-data.json'), 'utf-8');
        project.cursorData = JSON.parse(cursorJson);
      } catch (e) {
        console.warn('Could not load cursor data:', e.message);
      }
    }
    
    // Load zoom keyframes
    if (metadata.zoomKeyframes) {
      try {
        const zoomJson = await readFile(join(projectDir, 'zoom-keyframes.json'), 'utf-8');
        project.zoomKeyframes = JSON.parse(zoomJson);
      } catch (e) {
        console.warn('Could not load zoom keyframes:', e.message);
      }
    }
    
    return project;
  }

  /**
   * List all projects
   */
  static async list() {
    const projectsDir = Project.getProjectsDir();
    
    try {
      await access(projectsDir);
    } catch {
      return [];
    }
    
    const entries = await readdir(projectsDir);
    const projects = [];
    
    for (const entry of entries) {
      const projectPath = join(projectsDir, entry);
      const s = await stat(projectPath);
      
      if (s.isDirectory()) {
        try {
          const metadataPath = join(projectPath, 'project.json');
          const metadataJson = await readFile(metadataPath, 'utf-8');
          const metadata = JSON.parse(metadataJson);
          projects.push({
            id: metadata.id,
            url: metadata.url,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
            name: metadata.analysis?.name || new URL(metadata.url).hostname
          });
        } catch (e) {
          // Skip invalid projects
        }
      }
    }
    
    return projects.sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  /**
   * Delete a project
   */
  async delete() {
    const projectDir = this.getProjectDir();
    await rm(projectDir, { recursive: true, force: true });
  }

  /**
   * Copy a file into the project directory
   */
  async copyFile(sourcePath, filename) {
    const projectDir = this.getProjectDir();
    await mkdir(projectDir, { recursive: true });
    
    const destPath = join(projectDir, filename);
    const content = await readFile(sourcePath);
    await writeFile(destPath, content);
    
    return destPath;
  }

  /**
   * Regenerate voiceover with updated script
   */
  async regenerateVoiceover(newScript = null) {
    if (newScript) {
      this.script = newScript;
    }
    
    if (!this.script) {
      throw new Error('No script to generate voiceover from');
    }
    
    const projectDir = this.getProjectDir();
    await mkdir(projectDir, { recursive: true });
    
    const voicePath = join(projectDir, 'voiceover.mp3');
    await generateVoiceover(this.script, {
      voice: this.settings.voice,
      outputPath: voicePath
    });
    
    this.voiceover = voicePath;
    await this.save();
    
    return voicePath;
  }

  /**
   * Export final video with all effects applied
   */
  async exportFinal(outputPath, options = {}) {
    const {
      onProgress = null
    } = options;

    if (!this.rawVideo) {
      throw new Error('No raw video to export');
    }

    const projectDir = this.getProjectDir();
    const tempDir = join(tmpdir(), `repovideo-export-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    if (onProgress) onProgress({ stage: 'processing', progress: 0 });

    // Apply post-processing effects
    const processedPath = await postProcess(this.rawVideo, {
      cursorData: this.cursorData,
      zoomKeyframes: this.zoomKeyframes,
      width: this.settings.width,
      height: this.settings.height,
      fps: this.settings.fps,
      renderCursor: this.settings.cursor.style !== 'none',
      cursorStyle: this.settings.cursor.style,
      cursorSize: this.settings.cursor.size,
      cursorColor: this.settings.cursor.color,
      clickEffect: this.settings.clickEffect.type,
      clickEffectColor: this.settings.clickEffect.color,
      clickEffectSize: this.settings.clickEffect.size,
      clickEffectDuration: this.settings.clickEffect.duration,
      clickEffectOpacity: this.settings.clickEffect.opacity,
      outputPath: join(tempDir, 'processed.mp4')
    });

    if (onProgress) onProgress({ stage: 'processing', progress: 50 });

    // Combine with voiceover if available
    let finalPath = processedPath;
    if (this.voiceover) {
      finalPath = await combineVideoAudio(processedPath, this.voiceover, {
        outputPath: join(tempDir, 'with-audio.mp4')
      });
    }

    if (onProgress) onProgress({ stage: 'exporting', progress: 75 });

    // Export with preset
    await exportWithPreset(finalPath, outputPath, this.settings.preset);

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    // Cleanup temp files
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

    return outputPath;
  }

  /**
   * Get project info for API response
   */
  toJSON() {
    return {
      id: this.id,
      url: this.url,
      analysis: this.analysis,
      script: this.script,
      settings: this.settings,
      timeline: this.timeline,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      hasRawVideo: !!this.rawVideo,
      hasVoiceover: !!this.voiceover,
      hasCursorData: !!this.cursorData
    };
  }
}

export default Project;
