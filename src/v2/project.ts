import { mkdir, readFile, writeFile, rm, access, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { tmpdir, homedir } from 'os';
import { randomUUID } from 'crypto';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { generateVoiceover } from './ai.js';

// Type imports
import type {
  ProjectSettings,
  Timeline,
  TimelineMarker,
  CursorData,
  ZoomKeyframe,
  ZoomSettings,
  CursorSettings,
  ClickEffectSettings,
  ProjectJSON,
  ProgressCallback,
  ProjectExportOptions,
  ProjectMetadata
} from '../types/project.js';
import type { WebsiteAnalysis } from '../types/ai.js';

/**
 * Default zoom settings
 */
const DEFAULT_ZOOM_SETTINGS: ZoomSettings = {
  mode: 'smart',
  intensity: 0.5,
  maxZoom: 2.0,
  minZoom: 1.0,
  onClicks: true,
  onHover: true,
  speed: 'medium'
};

/**
 * Default cursor settings
 */
const DEFAULT_CURSOR_SETTINGS: CursorSettings = {
  style: 'default',
  size: 24,
  color: '#000000'
};

/**
 * Default click effect settings
 */
const DEFAULT_CLICK_EFFECT_SETTINGS: ClickEffectSettings = {
  type: 'ripple',
  color: '#3B82F6',
  size: 60,
  duration: 400,
  opacity: 0.6
};

/**
 * Default project settings
 */
const DEFAULT_SETTINGS: ProjectSettings = {
  duration: 25,
  voice: 'nova',
  style: 'professional',
  preset: 'youtube',
  width: 1920,
  height: 1080,
  fps: 60,
  zoom: DEFAULT_ZOOM_SETTINGS,
  cursor: DEFAULT_CURSOR_SETTINGS,
  clickEffect: DEFAULT_CLICK_EFFECT_SETTINGS
};

/**
 * Default timeline state
 */
const DEFAULT_TIMELINE: Timeline = {
  trimStart: 0,
  trimEnd: null,
  markers: [],
  duration: 0
};

/**
 * Project metadata stored on disk
 */
interface ProjectDiskMetadata {
  id: string;
  url: string | null;
  analysis: WebsiteAnalysis | null;
  script: string | null;
  settings: Partial<ProjectSettings>;
  timeline: Partial<Timeline>;
  createdAt: string;
  updatedAt: string;
  rawVideo: string | null;
  voiceover: string | null;
  cursorData: string | null;
  zoomKeyframes: string | null;
}

/**
 * Project state management for the web UI editor
 * Handles saving/loading project state and exporting final videos
 */
export class Project {
  /** Unique project identifier */
  public readonly id: string;
  
  /** Source URL being recorded */
  public url: string | null = null;
  
  /** AI analysis results */
  public analysis: WebsiteAnalysis | null = null;
  
  /** Voiceover script */
  public script: string | null = null;
  
  /** Path to unprocessed recording */
  public rawVideo: string | null = null;
  
  /** Path to voiceover audio */
  public voiceover: string | null = null;
  
  /** Cursor tracking data */
  public cursorData: CursorData | null = null;
  
  /** Calculated zoom keyframes */
  public zoomKeyframes: ZoomKeyframe[] | null = null;
  
  /** Project creation timestamp */
  public readonly createdAt: string;
  
  /** Last update timestamp */
  public updatedAt: string;
  
  /** Project settings */
  public settings: ProjectSettings;
  
  /** Timeline editing state */
  public timeline: Timeline;

  /**
   * Create a new Project instance
   * @param id - Optional project ID (generated if not provided)
   */
  constructor(id: string | null = null) {
    this.id = id || randomUUID();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.settings = { ...DEFAULT_SETTINGS };
    this.timeline = { ...DEFAULT_TIMELINE };
  }

  /**
   * Get the projects directory path
   * @returns Absolute path to projects directory
   */
  static getProjectsDir(): string {
    return join(homedir(), '.repovideo', 'projects');
  }

  /**
   * Get the path for this project
   * @returns Absolute path to this project's directory
   */
  getProjectDir(): string {
    return join(Project.getProjectsDir(), this.id);
  }

  /**
   * Save project to disk
   * @returns Path to the saved project directory
   */
  async save(): Promise<string> {
    const projectDir = this.getProjectDir();
    await mkdir(projectDir, { recursive: true });
    
    this.updatedAt = new Date().toISOString();
    
    // Save project metadata
    const metadata: ProjectDiskMetadata = {
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
   * @param projectIdOrDir - Project ID or absolute path to project directory
   * @returns Loaded Project instance
   */
  static async load(projectIdOrDir: string): Promise<Project> {
    let projectDir: string;
    
    // Check if it's a path or an ID
    try {
      await access(projectIdOrDir);
      projectDir = projectIdOrDir;
    } catch {
      projectDir = join(Project.getProjectsDir(), projectIdOrDir);
    }
    
    const metadataPath = join(projectDir, 'project.json');
    const metadataJson = await readFile(metadataPath, 'utf-8');
    const metadata: ProjectDiskMetadata = JSON.parse(metadataJson);
    
    const project = new Project(metadata.id);
    project.url = metadata.url;
    project.analysis = metadata.analysis;
    project.script = metadata.script;
    project.settings = { ...DEFAULT_SETTINGS, ...metadata.settings };
    project.timeline = { ...DEFAULT_TIMELINE, ...metadata.timeline };
    // Note: createdAt is readonly, set via constructor - we need to handle this
    (project as { createdAt: string }).createdAt = metadata.createdAt;
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
        project.cursorData = JSON.parse(cursorJson) as CursorData;
      } catch (e) {
        const error = e as Error;
        console.warn('Could not load cursor data:', error.message);
      }
    }
    
    // Load zoom keyframes
    if (metadata.zoomKeyframes) {
      try {
        const zoomJson = await readFile(join(projectDir, 'zoom-keyframes.json'), 'utf-8');
        project.zoomKeyframes = JSON.parse(zoomJson) as ZoomKeyframe[];
      } catch (e) {
        const error = e as Error;
        console.warn('Could not load zoom keyframes:', error.message);
      }
    }
    
    return project;
  }

  /**
   * List all projects
   * @returns Array of project metadata, sorted by update time (newest first)
   */
  static async list(): Promise<ProjectMetadata[]> {
    const projectsDir = Project.getProjectsDir();
    
    try {
      await access(projectsDir);
    } catch {
      return [];
    }
    
    const entries = await readdir(projectsDir);
    const projects: ProjectMetadata[] = [];
    
    for (const entry of entries) {
      const projectPath = join(projectsDir, entry);
      const s = await stat(projectPath);
      
      if (s.isDirectory()) {
        try {
          const metadataPath = join(projectPath, 'project.json');
          const metadataJson = await readFile(metadataPath, 'utf-8');
          const metadata: ProjectDiskMetadata = JSON.parse(metadataJson);
          
          // Safely extract hostname from URL
          let name = 'Unknown';
          if (metadata.analysis?.name) {
            name = metadata.analysis.name;
          } else if (metadata.url) {
            try {
              name = new URL(metadata.url).hostname;
            } catch {
              name = metadata.url;
            }
          }
          
          projects.push({
            id: metadata.id,
            url: metadata.url ?? '',
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt,
            name
          });
        } catch {
          // Skip invalid projects
        }
      }
    }
    
    return projects.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Delete a project and all its files
   */
  async delete(): Promise<void> {
    const projectDir = this.getProjectDir();
    await rm(projectDir, { recursive: true, force: true });
  }

  /**
   * Copy a file into the project directory
   * @param sourcePath - Source file path
   * @param filename - Destination filename
   * @returns Path to the copied file
   */
  async copyFile(sourcePath: string, filename: string): Promise<string> {
    const projectDir = this.getProjectDir();
    await mkdir(projectDir, { recursive: true });
    
    const destPath = join(projectDir, filename);
    const content = await readFile(sourcePath);
    await writeFile(destPath, content);
    
    return destPath;
  }

  /**
   * Regenerate voiceover with updated script
   * @param newScript - Optional new script to use
   * @returns Path to the generated voiceover file
   */
  async regenerateVoiceover(newScript: string | null = null): Promise<string> {
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
   * @param outputPath - Destination path for the final video
   * @param options - Export options including progress callback
   * @returns Path to the exported video
   */
  async exportFinal(outputPath: string, options: ProjectExportOptions = {}): Promise<string> {
    const { onProgress = null } = options;

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
    } catch {
      // Ignore cleanup errors
    }

    return outputPath;
  }

  /**
   * Get project info for API response
   * @returns JSON-serializable project data
   */
  toJSON(): ProjectJSON {
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
