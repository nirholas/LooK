import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Integration tests for CLI commands
 * These test the CLI interface without actually running the full video generation
 */

const CLI_PATH = join(process.cwd(), 'bin', 'repovideo.js');

// Helper to run CLI command and capture output
function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 5000
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    proc.on('error', reject);
    
    // Kill after timeout
    setTimeout(() => {
      proc.kill('SIGTERM');
    }, options.timeout || 5000);
  });
}

describe('CLI Integration', () => {
  describe('--version', () => {
    it('should display version number', async () => {
      const { stdout, code } = await runCli(['--version']);
      
      expect(stdout).toContain('2.0.0');
    });
  });

  describe('--help', () => {
    it('should display help text', async () => {
      const { stdout } = await runCli(['--help']);
      
      expect(stdout).toContain('repovideo');
      expect(stdout).toContain('AI-powered demo video generator');
    });

    it('should list available commands', async () => {
      const { stdout } = await runCli(['--help']);
      
      expect(stdout).toContain('demo');
      expect(stdout).toContain('repo');
      expect(stdout).toContain('quick');
      expect(stdout).toContain('mobile');
    });
  });

  describe('demo command', () => {
    it('should show help for demo command', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('demo');
      expect(stdout).toContain('<url>');
      expect(stdout).toContain('Generate polished website demo');
    });

    it('should list demo options', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('--output');
      expect(stdout).toContain('--duration');
      expect(stdout).toContain('--voice');
      expect(stdout).toContain('--style');
      expect(stdout).toContain('--preset');
      expect(stdout).toContain('--zoom-mode');
      expect(stdout).toContain('--cursor');
      expect(stdout).toContain('--click-effect');
    });

    it('should require URL argument', async () => {
      const { stderr, code } = await runCli(['demo']);
      
      expect(code).not.toBe(0);
      expect(stderr).toContain("missing required argument 'url'");
    });
  });

  describe('quick command', () => {
    it('should show help for quick command', async () => {
      const { stdout } = await runCli(['quick', '--help']);
      
      expect(stdout).toContain('quick');
      expect(stdout).toContain('<url>');
      expect(stdout).toContain('Quick demo with sensible defaults');
    });

    it('should have minimal options', async () => {
      const { stdout } = await runCli(['quick', '--help']);
      
      expect(stdout).toContain('--output');
      expect(stdout).toContain('--duration');
      expect(stdout).toContain('--no-voice');
    });
  });

  describe('repo command', () => {
    it('should show help for repo command', async () => {
      const { stdout } = await runCli(['repo', '--help']);
      
      expect(stdout).toContain('repo');
      expect(stdout).toContain('<url>');
      expect(stdout).toContain('terminal demo from GitHub');
    });
  });

  describe('mobile command', () => {
    it('should show help for mobile command', async () => {
      const { stdout } = await runCli(['mobile', '--help']);
      
      expect(stdout).toContain('mobile');
      expect(stdout).toContain('<app>');
      expect(stdout).toContain('mobile app demo');
    });

    it('should list mobile-specific options', async () => {
      const { stdout } = await runCli(['mobile', '--help']);
      
      expect(stdout).toContain('--platform');
      expect(stdout).toContain('--device');
      expect(stdout).toContain('--orientation');
    });
  });

  describe('serve command', () => {
    it('should show help for serve command', async () => {
      const { stdout } = await runCli(['serve', '--help']);
      
      expect(stdout).toContain('serve');
    });
  });

  describe('invalid commands', () => {
    it('should show error for unknown command', async () => {
      const { stderr } = await runCli(['unknown-command']);
      
      expect(stderr).toContain('error');
    });
  });

  describe('option defaults', () => {
    it('demo should have default output path', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('./demo.mp4');
    });

    it('demo should have default duration', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('25');
    });

    it('demo should have default voice', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('nova');
    });

    it('demo should have default preset', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('youtube');
    });

    it('demo should have default zoom-mode', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('smart');
    });
  });

  describe('preset options', () => {
    it('should list available export presets', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('youtube');
      expect(stdout).toContain('twitter');
      expect(stdout).toContain('instagram');
      expect(stdout).toContain('tiktok');
      expect(stdout).toContain('gif');
    });

    it('should list available voices', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('nova');
      expect(stdout).toContain('alloy');
      expect(stdout).toContain('echo');
      expect(stdout).toContain('fable');
      expect(stdout).toContain('onyx');
      expect(stdout).toContain('shimmer');
    });

    it('should list available cursor styles', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('default');
      expect(stdout).toContain('arrow-modern');
      expect(stdout).toContain('pointer');
      expect(stdout).toContain('dot');
      expect(stdout).toContain('circle');
      expect(stdout).toContain('crosshair');
      expect(stdout).toContain('spotlight');
    });

    it('should list available zoom modes', async () => {
      const { stdout } = await runCli(['demo', '--help']);
      
      expect(stdout).toContain('none');
      expect(stdout).toContain('basic');
      expect(stdout).toContain('smart');
      expect(stdout).toContain('follow');
    });
  });
});
