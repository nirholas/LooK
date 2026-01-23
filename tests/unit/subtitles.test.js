import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined)
}));

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      opts(null, '30.0', '');
    } else if (cb) {
      cb(null, '30.0', '');
    }
  })
}));

import { SubtitleGenerator, addSubtitlesToVideo } from '../../src/v2/subtitles.js';

describe('SubtitleGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new SubtitleGenerator();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(generator.wordsPerMinute).toBe(150);
      expect(generator.maxWordsPerLine).toBe(10);
      expect(generator.maxCharsPerLine).toBe(42);
      expect(generator.minDuration).toBe(1.5);
      expect(generator.maxDuration).toBe(5);
      expect(generator.fontSize).toBe(24);
      expect(generator.fontColor).toBe('white');
      expect(generator.position).toBe('bottom');
    });

    it('should accept custom options', () => {
      const customGenerator = new SubtitleGenerator({
        wordsPerMinute: 180,
        maxWordsPerLine: 8,
        maxCharsPerLine: 50,
        minDuration: 2,
        maxDuration: 6,
        fontSize: 32,
        fontColor: 'yellow',
        position: 'top'
      });

      expect(customGenerator.wordsPerMinute).toBe(180);
      expect(customGenerator.maxWordsPerLine).toBe(8);
      expect(customGenerator.maxCharsPerLine).toBe(50);
      expect(customGenerator.minDuration).toBe(2);
      expect(customGenerator.maxDuration).toBe(6);
      expect(customGenerator.fontSize).toBe(32);
      expect(customGenerator.fontColor).toBe('yellow');
      expect(customGenerator.position).toBe('top');
    });
  });

  describe('secondsToSRT', () => {
    it('should format 0 seconds correctly', () => {
      const result = generator.secondsToSRT(0);
      expect(result).toBe('00:00:00,000');
    });

    it('should format seconds with milliseconds', () => {
      const result = generator.secondsToSRT(1.5);
      expect(result).toBe('00:00:01,500');
    });

    it('should format minutes correctly', () => {
      const result = generator.secondsToSRT(65.25);
      expect(result).toBe('00:01:05,250');
    });

    it('should format hours correctly', () => {
      const result = generator.secondsToSRT(3661.123);
      expect(result).toBe('01:01:01,123');
    });

    it('should pad single digits', () => {
      const result = generator.secondsToSRT(5.05);
      expect(result).toBe('00:00:05,050');
    });

    it('should handle large durations', () => {
      const result = generator.secondsToSRT(36000); // 10 hours
      expect(result).toBe('10:00:00,000');
    });
  });

  describe('secondsToVTT', () => {
    it('should use dot instead of comma', () => {
      const result = generator.secondsToVTT(1.5);
      expect(result).toBe('00:00:01.500');
    });

    it('should match SRT format except for separator', () => {
      const srt = generator.secondsToSRT(65.25);
      const vtt = generator.secondsToVTT(65.25);
      expect(vtt).toBe(srt.replace(',', '.'));
    });
  });

  describe('splitIntoSegments', () => {
    it('should return empty array for empty script', () => {
      const segments = generator.splitIntoSegments('', 30);
      expect(segments).toEqual([]);
    });

    it('should return empty array for whitespace only', () => {
      const segments = generator.splitIntoSegments('   \n\t  ', 30);
      expect(segments).toEqual([]);
    });

    it('should split script into segments', () => {
      const script = 'This is the first sentence. This is the second sentence.';
      const segments = generator.splitIntoSegments(script, 10);
      
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0]).toHaveProperty('text');
      expect(segments[0]).toHaveProperty('start');
      expect(segments[0]).toHaveProperty('end');
    });

    it('should have non-overlapping time ranges', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const segments = generator.splitIntoSegments(script, 15);
      
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i].start).toBeGreaterThanOrEqual(segments[i - 1].end);
      }
    });

    it('should respect minimum duration', () => {
      const script = 'Hi.';
      const segments = generator.splitIntoSegments(script, 30);
      
      if (segments.length > 0) {
        const duration = segments[0].end - segments[0].start;
        expect(duration).toBeGreaterThanOrEqual(generator.minDuration - 0.2); // Allow small tolerance
      }
    });

    it('should respect maximum duration', () => {
      const longSentence = 'This is a very long sentence that goes on and on and on for quite a while without stopping at all.';
      const segments = generator.splitIntoSegments(longSentence, 30);
      
      for (const segment of segments) {
        const duration = segment.end - segment.start;
        expect(duration).toBeLessThanOrEqual(generator.maxDuration + 0.2);
      }
    });

    it('should not exceed total duration', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const totalDuration = 10;
      const segments = generator.splitIntoSegments(script, totalDuration);
      
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        expect(lastSegment.end).toBeLessThanOrEqual(totalDuration);
      }
    });
  });

  describe('splitLongSentence', () => {
    it('should not split short sentences', () => {
      const sentence = 'Hello world.';
      const chunks = generator.splitLongSentence(sentence);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(sentence);
    });

    it('should split sentences exceeding max words', () => {
      const sentence = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen.';
      const chunks = generator.splitLongSentence(sentence);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        const wordCount = chunk.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(generator.maxWordsPerLine);
      });
    });

    it('should split sentences exceeding max characters', () => {
      const sentence = 'Supercalifragilisticexpialidocious is a very long word that exceeds character limits.';
      const chunks = generator.splitLongSentence(sentence);
      
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should preserve all words after splitting', () => {
      const sentence = 'One two three four five six seven eight nine ten eleven twelve.';
      const chunks = generator.splitLongSentence(sentence);
      const rejoined = chunks.join(' ');
      
      expect(rejoined).toBe(sentence);
    });
  });

  describe('generateSRT', () => {
    it('should generate valid SRT format', () => {
      const script = 'This is a test script. With two sentences.';
      const srt = generator.generateSRT(script, 10);
      
      expect(srt).toContain('1\n');
      expect(srt).toContain(' --> ');
    });

    it('should number segments sequentially', () => {
      const script = 'First sentence. Second sentence. Third sentence.';
      const srt = generator.generateSRT(script, 15);
      
      expect(srt).toContain('1\n');
      expect(srt).toContain('2\n');
    });

    it('should use correct SRT timestamp format', () => {
      const script = 'Test sentence.';
      const srt = generator.generateSRT(script, 5);
      
      // SRT format: HH:MM:SS,mmm
      expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3}/);
    });

    it('should return empty string for empty script', () => {
      const srt = generator.generateSRT('', 10);
      expect(srt).toBe('');
    });
  });

  describe('generateVTT', () => {
    it('should start with WEBVTT header', () => {
      const script = 'Test sentence.';
      const vtt = generator.generateVTT(script, 5);
      
      expect(vtt.startsWith('WEBVTT')).toBe(true);
    });

    it('should use VTT timestamp format (dot separator)', () => {
      const script = 'Test sentence.';
      const vtt = generator.generateVTT(script, 5);
      
      // VTT format: HH:MM:SS.mmm
      expect(vtt).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('should number cues sequentially', () => {
      const script = 'First sentence. Second sentence.';
      const vtt = generator.generateVTT(script, 10);
      
      expect(vtt).toContain('1\n');
      expect(vtt).toContain('2\n');
    });
  });

  describe('saveSubtitles', () => {
    it('should save SRT file when path ends with .srt', async () => {
      const writeFile = (await import('fs/promises')).writeFile;
      const script = 'Test sentence.';
      
      await generator.saveSubtitles(script, 5, '/tmp/subtitles.srt');
      
      expect(writeFile).toHaveBeenCalled();
      const [path, content] = writeFile.mock.calls[0];
      expect(path).toBe('/tmp/subtitles.srt');
      expect(content).not.toContain('WEBVTT');
    });

    it('should save VTT file when path ends with .vtt', async () => {
      const writeFile = (await import('fs/promises')).writeFile;
      const script = 'Test sentence.';
      
      await generator.saveSubtitles(script, 5, '/tmp/subtitles.vtt');
      
      expect(writeFile).toHaveBeenCalled();
      const [path, content] = writeFile.mock.calls[0];
      expect(path).toBe('/tmp/subtitles.vtt');
      expect(content).toContain('WEBVTT');
    });

    it('should return the output path', async () => {
      const result = await generator.saveSubtitles('Test', 5, '/tmp/test.srt');
      
      expect(result).toBe('/tmp/test.srt');
    });
  });

  describe('timing calculations', () => {
    it('should calculate correct timing for speaking rate', () => {
      // 150 WPM = 2.5 words per second
      const script = 'One two three four five six seven eight nine ten.'; // 10 words = 4 seconds
      const segments = generator.splitIntoSegments(script, 10);
      
      const totalTextDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
      // Should be reasonable for the word count
      expect(totalTextDuration).toBeGreaterThan(0);
      expect(totalTextDuration).toBeLessThanOrEqual(10);
    });

    it('should scale timing when content exceeds duration', () => {
      // Very long script for short duration
      const script = 'This is a sentence. This is another sentence. And another one. And more. And even more.';
      const segments = generator.splitIntoSegments(script, 5);
      
      if (segments.length > 0) {
        const lastEnd = segments[segments.length - 1].end;
        expect(lastEnd).toBeLessThanOrEqual(5.5); // Small buffer
      }
    });
  });
});

describe('addSubtitlesToVideo', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate SRT when outputSRT is provided', async () => {
    const writeFile = (await import('fs/promises')).writeFile;
    
    await addSubtitlesToVideo('/input.mp4', 'Test script', '/output.mp4', {
      duration: 10,
      outputSRT: '/tmp/test.srt',
      burnIn: false
    });
    
    expect(writeFile).toHaveBeenCalled();
  });

  it('should generate VTT when outputVTT is provided', async () => {
    const writeFile = (await import('fs/promises')).writeFile;
    
    await addSubtitlesToVideo('/input.mp4', 'Test script', '/output.mp4', {
      duration: 10,
      outputVTT: '/tmp/test.vtt',
      burnIn: false
    });
    
    expect(writeFile).toHaveBeenCalled();
  });
});
