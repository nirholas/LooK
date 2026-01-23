import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';

// Mock fs/promises
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockRm = vi.fn();
const mockAccess = vi.fn();
const mockReaddir = vi.fn();
const mockStat = vi.fn();

vi.mock('fs/promises', () => ({
  readFile: (...args) => mockReadFile(...args),
  writeFile: (...args) => mockWriteFile(...args),
  mkdir: (...args) => mockMkdir(...args),
  rm: (...args) => mockRm(...args),
  access: (...args) => mockAccess(...args),
  readdir: (...args) => mockReaddir(...args),
  stat: (...args) => mockStat(...args)
}));

// Mock post-process
vi.mock('../../src/v2/post-process.js', () => ({
  postProcess: vi.fn().mockResolvedValue('/tmp/processed.mp4'),
  combineVideoAudio: vi.fn().mockResolvedValue('/tmp/with-audio.mp4'),
  exportWithPreset: vi.fn().mockResolvedValue('/output/final.mp4')
}));

// Mock ai
vi.mock('../../src/v2/ai.js', () => ({
  generateVoiceover: vi.fn().mockResolvedValue('/tmp/voiceover.mp3')
}));

import { Project } from '../../src/v2/project.js';

describe('Project', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should generate UUID when no id provided', () => {
      const project = new Project();
      
      expect(project.id).toBeDefined();
      expect(project.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should use provided id', () => {
      const project = new Project('custom-id-123');
      
      expect(project.id).toBe('custom-id-123');
    });

    it('should initialize with null values', () => {
      const project = new Project();
      
      expect(project.url).toBeNull();
      expect(project.analysis).toBeNull();
      expect(project.script).toBeNull();
      expect(project.rawVideo).toBeNull();
      expect(project.voiceover).toBeNull();
      expect(project.cursorData).toBeNull();
      expect(project.zoomKeyframes).toBeNull();
    });

    it('should set creation timestamp', () => {
      const before = new Date().toISOString();
      const project = new Project();
      const after = new Date().toISOString();
      
      expect(project.createdAt).toBeDefined();
      expect(project.createdAt >= before).toBe(true);
      expect(project.createdAt <= after).toBe(true);
    });

    it('should initialize with default settings', () => {
      const project = new Project();
      
      expect(project.settings.duration).toBe(25);
      expect(project.settings.voice).toBe('nova');
      expect(project.settings.style).toBe('professional');
      expect(project.settings.preset).toBe('youtube');
      expect(project.settings.width).toBe(1920);
      expect(project.settings.height).toBe(1080);
      expect(project.settings.fps).toBe(60);
    });

    it('should initialize zoom settings', () => {
      const project = new Project();
      
      expect(project.settings.zoom.mode).toBe('smart');
      expect(project.settings.zoom.intensity).toBe(0.5);
      expect(project.settings.zoom.maxZoom).toBe(2.0);
      expect(project.settings.zoom.minZoom).toBe(1.0);
      expect(project.settings.zoom.onClicks).toBe(true);
      expect(project.settings.zoom.onHover).toBe(true);
    });

    it('should initialize cursor settings', () => {
      const project = new Project();
      
      expect(project.settings.cursor.style).toBe('default');
      expect(project.settings.cursor.size).toBe(24);
      expect(project.settings.cursor.color).toBe('#000000');
    });

    it('should initialize click effect settings', () => {
      const project = new Project();
      
      expect(project.settings.clickEffect.type).toBe('ripple');
      expect(project.settings.clickEffect.color).toBe('#3B82F6');
      expect(project.settings.clickEffect.size).toBe(60);
      expect(project.settings.clickEffect.duration).toBe(400);
      expect(project.settings.clickEffect.opacity).toBe(0.6);
    });

    it('should initialize timeline settings', () => {
      const project = new Project();
      
      expect(project.timeline.trimStart).toBe(0);
      expect(project.timeline.trimEnd).toBeNull();
      expect(project.timeline.markers).toEqual([]);
      expect(project.timeline.duration).toBe(0);
    });
  });

  describe('getProjectsDir', () => {
    it('should return path in home directory', () => {
      const dir = Project.getProjectsDir();
      
      expect(dir).toBe(join(homedir(), '.repovideo', 'projects'));
    });
  });

  describe('getProjectDir', () => {
    it('should return path with project id', () => {
      const project = new Project('test-id');
      const dir = project.getProjectDir();
      
      expect(dir).toBe(join(homedir(), '.repovideo', 'projects', 'test-id'));
    });
  });

  describe('save', () => {
    it('should create project directory', async () => {
      const project = new Project('test-save');
      
      await project.save();
      
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('test-save'),
        { recursive: true }
      );
    });

    it('should update timestamp on save', async () => {
      const project = new Project();
      const originalUpdated = project.updatedAt;
      
      // Wait a tiny bit to ensure time difference
      await new Promise(r => setTimeout(r, 10));
      await project.save();
      
      expect(project.updatedAt >= originalUpdated).toBe(true);
    });

    it('should save project metadata as JSON', async () => {
      const project = new Project('test-meta');
      project.url = 'https://example.com';
      project.analysis = { name: 'Test' };
      project.script = 'Test script';
      
      await project.save();
      
      expect(mockWriteFile).toHaveBeenCalled();
      const [path, content] = mockWriteFile.mock.calls[0];
      expect(path).toContain('project.json');
      
      const parsed = JSON.parse(content);
      expect(parsed.id).toBe('test-meta');
      expect(parsed.url).toBe('https://example.com');
      expect(parsed.analysis).toEqual({ name: 'Test' });
      expect(parsed.script).toBe('Test script');
    });

    it('should save cursor data separately', async () => {
      const project = new Project('test-cursor');
      project.cursorData = { clicks: [], positions: [] };
      
      await project.save();
      
      const cursorCall = mockWriteFile.mock.calls.find(
        call => call[0].includes('cursor-data.json')
      );
      expect(cursorCall).toBeDefined();
    });

    it('should save zoom keyframes separately', async () => {
      const project = new Project('test-zoom');
      project.zoomKeyframes = [{ time: 0, zoom: 1.0 }];
      
      await project.save();
      
      const zoomCall = mockWriteFile.mock.calls.find(
        call => call[0].includes('zoom-keyframes.json')
      );
      expect(zoomCall).toBeDefined();
    });

    it('should store relative paths in metadata', async () => {
      const project = new Project('test-paths');
      project.rawVideo = '/full/path/to/video.mp4';
      project.voiceover = '/full/path/to/voice.mp3';
      
      await project.save();
      
      const [, content] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content);
      
      expect(parsed.rawVideo).toBe('video.mp4');
      expect(parsed.voiceover).toBe('voice.mp3');
    });

    it('should return project directory path', async () => {
      const project = new Project('test-return');
      
      const result = await project.save();
      
      expect(result).toContain('test-return');
    });
  });

  describe('load', () => {
    it('should load project by id', async () => {
      mockAccess.mockRejectedValue(new Error('Not a path'));
      mockReadFile.mockImplementation((path) => {
        if (path.includes('project.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'loaded-id',
            url: 'https://loaded.com',
            analysis: { name: 'Loaded' },
            script: 'Loaded script',
            settings: { duration: 30 },
            timeline: { trimStart: 5 },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z'
          }));
        }
        throw new Error('Not found');
      });
      
      const project = await Project.load('loaded-id');
      
      expect(project.id).toBe('loaded-id');
      expect(project.url).toBe('https://loaded.com');
      expect(project.analysis).toEqual({ name: 'Loaded' });
      expect(project.script).toBe('Loaded script');
      expect(project.settings.duration).toBe(30);
      expect(project.timeline.trimStart).toBe(5);
    });

    it('should load project by path', async () => {
      mockAccess.mockResolvedValue(undefined); // Path exists
      mockReadFile.mockImplementation((path) => {
        if (path.includes('project.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'path-id',
            url: 'https://path.com'
          }));
        }
        throw new Error('Not found');
      });
      
      const project = await Project.load('/custom/path/to/project');
      
      expect(project.id).toBe('path-id');
    });

    it('should resolve relative file paths', async () => {
      mockAccess.mockRejectedValue(new Error());
      mockReadFile.mockImplementation((path) => {
        if (path.includes('project.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'files-id',
            rawVideo: 'video.mp4',
            voiceover: 'voice.mp3'
          }));
        }
        throw new Error('Not found');
      });
      
      const project = await Project.load('files-id');
      
      expect(project.rawVideo).toContain('files-id');
      expect(project.rawVideo).toContain('video.mp4');
      expect(project.voiceover).toContain('voice.mp3');
    });

    it('should load cursor data if available', async () => {
      mockAccess.mockRejectedValue(new Error());
      mockReadFile.mockImplementation((path) => {
        if (path.includes('project.json')) {
          return Promise.resolve(JSON.stringify({
            id: 'cursor-id',
            cursorData: 'cursor-data.json'
          }));
        }
        if (path.includes('cursor-data.json')) {
          return Promise.resolve(JSON.stringify({
            clicks: [{ t: 100, x: 50, y: 50 }],
            positions: []
          }));
        }
        throw new Error('Not found');
      });
      
      const project = await Project.load('cursor-id');
      
      expect(project.cursorData).toBeDefined();
      expect(project.cursorData.clicks).toHaveLength(1);
    });
  });

  describe('list', () => {
    it('should return empty array when projects dir does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('Not found'));
      
      const projects = await Project.list();
      
      expect(projects).toEqual([]);
    });

    it('should list all valid projects', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['project1', 'project2']);
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockReadFile.mockImplementation((path) => {
        if (path.includes('project1')) {
          return Promise.resolve(JSON.stringify({
            id: 'project1',
            url: 'https://one.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            analysis: { name: 'Project One' }
          }));
        }
        if (path.includes('project2')) {
          return Promise.resolve(JSON.stringify({
            id: 'project2',
            url: 'https://two.com',
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            analysis: { name: 'Project Two' }
          }));
        }
        throw new Error('Not found');
      });
      
      const projects = await Project.list();
      
      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe('project2'); // Sorted by updatedAt desc
      expect(projects[1].id).toBe('project1');
    });

    it('should skip invalid project directories', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue(['valid', 'invalid']);
      mockStat.mockResolvedValue({ isDirectory: () => true });
      mockReadFile.mockImplementation((path) => {
        if (path.includes('valid')) {
          return Promise.resolve(JSON.stringify({
            id: 'valid',
            url: 'https://valid.com',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }));
        }
        throw new Error('Invalid JSON');
      });
      
      const projects = await Project.list();
      
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('valid');
    });
  });

  describe('delete', () => {
    it('should remove project directory', async () => {
      const project = new Project('to-delete');
      
      await project.delete();
      
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('to-delete'),
        { recursive: true, force: true }
      );
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const project = new Project('json-test');
      project.url = 'https://test.com';
      project.analysis = { name: 'Test' };
      project.script = 'Test script';
      project.rawVideo = '/path/video.mp4';
      project.voiceover = '/path/voice.mp3';
      project.cursorData = { clicks: [] };
      
      const json = project.toJSON();
      
      expect(json.id).toBe('json-test');
      expect(json.url).toBe('https://test.com');
      expect(json.analysis).toEqual({ name: 'Test' });
      expect(json.script).toBe('Test script');
      expect(json.hasRawVideo).toBe(true);
      expect(json.hasVoiceover).toBe(true);
      expect(json.hasCursorData).toBe(true);
    });

    it('should indicate missing assets', () => {
      const project = new Project();
      const json = project.toJSON();
      
      expect(json.hasRawVideo).toBe(false);
      expect(json.hasVoiceover).toBe(false);
      expect(json.hasCursorData).toBe(false);
    });
  });
});
