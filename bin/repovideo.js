#!/usr/bin/env node
import { program } from 'commander';
import { generateVideo } from '../src/index.js';
import { generateDemo } from '../src/v2/index.js';
import chalk from 'chalk';

const banner = `
╔═══════════════════════════════════════╗
║  🎬 RepoVideo v2.0 - AI Demo Videos   ║
╚═══════════════════════════════════════╝
`;

program
  .name('repovideo')
  .description('AI-powered demo video generator')
  .version('2.0.0');

// v1: Terminal-based GitHub repo demos (uses VHS)
program
  .command('repo <url>')
  .description('Generate terminal demo from GitHub repo (requires VHS)')
  .option('-o, --output <path>', 'Output file', './output/demo.mp4')
  .option('-d, --duration <seconds>', 'Duration', '30')
  .option('-v, --voice <voice>', 'TTS voice', 'alloy')
  .option('--skip-voice', 'Skip voiceover')
  .option('--dry-run', 'Show script only')
  .action(async (url, options) => {
    console.log(chalk.cyan('\n🎬 RepoVideo - Terminal Mode\n'));
    try {
      await generateVideo(url, {
        output: options.output,
        duration: parseInt(options.duration),
        voice: options.voice,
        skipVoice: options.skipVoice,
        dryRun: options.dryRun
      });
    } catch (e) {
      console.error(chalk.red('❌ Error:'), e.message);
      process.exit(1);
    }
  });

// v2: Browser-based website demos with cursor tracking & zoom
program
  .command('demo <url>')
  .description('Generate polished website demo with AI (recommended)')
  .option('-o, --output <path>', 'Output file', './demo.mp4')
  .option('-d, --duration <seconds>', 'Duration', '25')
  .option('-v, --voice <voice>', 'TTS voice (nova, alloy, echo, fable, onyx, shimmer)', 'nova')
  .option('-s, --style <style>', 'Script style (professional, casual, energetic)', 'professional')
  .option('-p, --preset <preset>', 'Export preset (youtube, twitter, instagram, tiktok, gif)', 'youtube')
  .option('--width <pixels>', 'Recording width', '1920')
  .option('--height <pixels>', 'Recording height', '1080')
  .option('--skip-voice', 'Skip voiceover generation')
  .option('--dry-run', 'Analyze and show script without recording')
  .action(async (url, options) => {
    console.log(chalk.magenta(banner));
    try {
      await generateDemo(url, {
        output: options.output,
        duration: parseInt(options.duration),
        voice: options.voice,
        style: options.style,
        preset: options.preset,
        width: parseInt(options.width),
        height: parseInt(options.height),
        skipVoice: options.skipVoice,
        dryRun: options.dryRun
      });
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

// Default: smart detection
program
  .argument('[url]', 'URL to record')
  .option('-o, --output <path>', 'Output file', './demo.mp4')
  .option('-d, --duration <seconds>', 'Duration', '25')
  .option('-v, --voice <voice>', 'TTS voice', 'nova')
  .option('--dry-run', 'Show script only')
  .action(async (url, options) => {
    if (!url) {
      console.log(chalk.magenta(banner));
      console.log(chalk.white('Usage:\n'));
      console.log(chalk.cyan('  repovideo demo <url>'), '    - Website demo with AI (recommended)');
      console.log(chalk.cyan('  repovideo repo <url>'), '    - GitHub repo terminal demo');
      console.log(chalk.dim('\nExamples:\n'));
      console.log(chalk.dim('  repovideo demo https://myapp.com'));
      console.log(chalk.dim('  repovideo demo https://myapp.com -o output.mp4 --voice alloy'));
      console.log(chalk.dim('  repovideo repo https://github.com/user/repo'));
      console.log();
      return;
    }

    // Smart detection
    const isGitHub = url.includes('github.com');
    
    console.log(chalk.magenta(banner));
    
    try {
      if (isGitHub) {
        console.log(chalk.dim('Detected GitHub URL, using terminal mode...\n'));
        await generateVideo(url, {
          output: options.output,
          duration: parseInt(options.duration),
          voice: options.voice,
          dryRun: options.dryRun
        });
      } else {
        console.log(chalk.dim('Using web demo mode...\n'));
        await generateDemo(url, {
          output: options.output,
          duration: parseInt(options.duration),
          voice: options.voice,
          dryRun: options.dryRun
        });
      }
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

program.parse();
