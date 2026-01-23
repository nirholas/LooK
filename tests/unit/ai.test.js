import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock OpenAI before importing the module
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn()
        }
      },
      audio: {
        speech: {
          create: vi.fn()
        }
      }
    }))
  };
});

// Mock sharp
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('compressed-image'))
    }))
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined)
}));

// Mock fs
vi.mock('fs', () => ({
  createWriteStream: vi.fn().mockImplementation(() => ({
    write: vi.fn((data, cb) => cb && cb()),
    end: vi.fn()
  }))
}));

describe('AI Module', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.GROQ_API_KEY = 'test-groq-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  describe('getAvailableProviders', () => {
    it('should return true for openai when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      delete process.env.GROQ_API_KEY;
      
      const { getAvailableProviders } = await import('../../src/v2/ai.js');
      const providers = getAvailableProviders();
      
      expect(providers.openai).toBe(true);
      expect(providers.groq).toBe(false);
    });

    it('should return true for groq when GROQ_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.GROQ_API_KEY = 'gsk-test';
      
      const { getAvailableProviders } = await import('../../src/v2/ai.js');
      const providers = getAvailableProviders();
      
      expect(providers.openai).toBe(true);
      expect(providers.groq).toBe(true);
    });

    it('should return false for both when no keys are set', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.GROQ_API_KEY;
      
      const { getAvailableProviders } = await import('../../src/v2/ai.js');
      const providers = getAvailableProviders();
      
      expect(providers.openai).toBe(false);
      expect(providers.groq).toBe(false);
    });
  });

  describe('analyzeWebsite', () => {
    it('should call OpenAI with correct parameters', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Test Product',
              tagline: 'Test tagline',
              keyFeatures: ['feature1', 'feature2'],
              focusPoints: [],
              suggestedActions: [],
              tone: 'professional'
            })
          }
        }]
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { analyzeWebsite } = await import('../../src/v2/ai.js');
      
      const result = await analyzeWebsite('base64-screenshot', { url: 'https://example.com', title: 'Example' });
      
      expect(result.name).toBe('Test Product');
      expect(result.tagline).toBe('Test tagline');
      expect(result.keyFeatures).toContain('feature1');
    });

    it('should handle non-JSON responses gracefully', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'This is just plain text without JSON'
          }
        }]
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { analyzeWebsite } = await import('../../src/v2/ai.js');
      
      const result = await analyzeWebsite('base64-screenshot', {});
      
      expect(result.description).toBe('This is just plain text without JSON');
      expect(result.keyFeatures).toEqual([]);
    });

    it('should include metadata in the request', async () => {
      const OpenAI = (await import('openai')).default;
      let capturedMessages;
      const mockCreate = vi.fn().mockImplementation((params) => {
        capturedMessages = params.messages;
        return Promise.resolve({
          choices: [{ message: { content: '{"name":"Test"}' } }]
        });
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { analyzeWebsite } = await import('../../src/v2/ai.js');
      
      await analyzeWebsite('base64-screenshot', { 
        url: 'https://test.com', 
        title: 'Test Title' 
      });
      
      const userMessage = capturedMessages.find(m => m.role === 'user');
      expect(userMessage.content).toContainEqual(
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('https://test.com')
        })
      );
    });
  });

  describe('generateScript', () => {
    it('should generate script with correct word count for duration', async () => {
      const OpenAI = (await import('openai')).default;
      let capturedParams;
      const mockCreate = vi.fn().mockImplementation((params) => {
        capturedParams = params;
        return Promise.resolve({
          choices: [{ message: { content: 'Generated voiceover script' } }]
        });
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { generateScript } = await import('../../src/v2/ai.js');
      
      const analysis = {
        name: 'Test App',
        tagline: 'Best app ever',
        description: 'An amazing application',
        keyFeatures: ['Fast', 'Secure'],
        targetAudience: 'developers'
      };
      
      const result = await generateScript(analysis, { duration: 30, style: 'professional' });
      
      expect(result).toBe('Generated voiceover script');
      expect(capturedParams.messages[0].content).toContain('professional');
    });

    it('should support different script styles', async () => {
      const OpenAI = (await import('openai')).default;
      let capturedContent;
      const mockCreate = vi.fn().mockImplementation((params) => {
        capturedContent = params.messages[0].content;
        return Promise.resolve({
          choices: [{ message: { content: 'Casual script' } }]
        });
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { generateScript } = await import('../../src/v2/ai.js');
      
      await generateScript({ name: 'Test' }, { style: 'casual' });
      
      expect(capturedContent).toContain('casual');
    });

    it('should include call to action when requested', async () => {
      const OpenAI = (await import('openai')).default;
      let capturedContent;
      const mockCreate = vi.fn().mockImplementation((params) => {
        capturedContent = params.messages[1].content;
        return Promise.resolve({
          choices: [{ message: { content: 'Script with CTA' } }]
        });
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
        audio: { speech: { create: vi.fn() } }
      }));

      const { generateScript } = await import('../../src/v2/ai.js');
      
      await generateScript({ name: 'Test' }, { includeCallToAction: true });
      
      expect(capturedContent).toContain('Call to action');
    });
  });

  describe('generateVoiceover', () => {
    it('should call TTS API with correct voice parameter', async () => {
      const OpenAI = (await import('openai')).default;
      let capturedParams;
      const mockCreate = vi.fn().mockImplementation((params) => {
        capturedParams = params;
        return Promise.resolve({
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
        });
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: vi.fn() } },
        audio: { speech: { create: mockCreate } }
      }));

      const { generateVoiceover } = await import('../../src/v2/ai.js');
      
      await generateVoiceover('Test script', { voice: 'nova' });
      
      expect(capturedParams.voice).toBe('nova');
      expect(capturedParams.model).toBe('tts-1-hd');
    });

    it('should return the output path', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100))
      });
      
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: vi.fn() } },
        audio: { speech: { create: mockCreate } }
      }));

      const { generateVoiceover } = await import('../../src/v2/ai.js');
      
      const result = await generateVoiceover('Test script', { 
        outputPath: '/tmp/test-voiceover.mp3' 
      });
      
      expect(result).toBe('/tmp/test-voiceover.mp3');
    });
  });

  describe('suggestDemoActions', () => {
    it('should generate actions from focus points', async () => {
      const { suggestDemoActions } = await import('../../src/v2/ai.js');
      
      const analysis = {
        focusPoints: [
          { x: 50, y: 30, importance: 'high', element: 'header' },
          { x: 50, y: 70, importance: 'medium', element: 'features' }
        ]
      };
      
      const actions = suggestDemoActions(analysis, 1920, 1080);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].type).toBe('wait');
    });

    it('should handle empty focus points', async () => {
      const { suggestDemoActions } = await import('../../src/v2/ai.js');
      
      const analysis = { focusPoints: [] };
      const actions = suggestDemoActions(analysis, 1920, 1080);
      
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('wait');
    });

    it('should add hover actions for high importance points', async () => {
      const { suggestDemoActions } = await import('../../src/v2/ai.js');
      
      const analysis = {
        focusPoints: [
          { x: 50, y: 30, importance: 'high', element: 'cta-button' }
        ]
      };
      
      const actions = suggestDemoActions(analysis, 1920, 1080);
      const hoverAction = actions.find(a => a.type === 'hover');
      
      expect(hoverAction).toBeDefined();
    });
  });
});
