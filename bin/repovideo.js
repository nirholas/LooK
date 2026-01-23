#!/usr/bin/env node
import { program } from 'commander';
import { generateVideo } from '../src/index.js';
import { generateDemo, generateDemoV2, generateMobileDemo } from '../src/v2/index.js';
import { Project } from '../src/v2/project.js';
import chalk from 'chalk';

const banner = `
╔═══════════════════════════════════════╗
║  🎬 LooK v2.0 - AI Demo Videos        ║
║  One command. Professional demos.     ║
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
  .option('--zoom-mode <mode>', 'Zoom mode (none, basic, smart, follow)', 'smart')
  .option('--zoom-intensity <intensity>', 'How closely camera follows cursor (0-1)', '0.5')
  .option('--max-zoom <level>', 'Maximum zoom level', '1.8')
  .option('--min-zoom <level>', 'Minimum zoom level', '1.0')
  .option('--cursor <style>', 'Cursor style: default, arrow-modern, pointer, dot, circle, crosshair, spotlight, none', 'default')
  .option('--cursor-size <px>', 'Cursor size in pixels', '32')
  .option('--cursor-color <hex>', 'Cursor color (hex)', '#000000')
  .option('--cursor-preset <name>', 'Cursor color preset: light, dark, blue, green, red, purple, orange, github, figma, notion')
  .option('--cursor-glow', 'Add glow effect to cursor')
  .option('--click-effect <type>', 'Click effect style: ripple, pulse, ring, spotlight, none', 'ripple')
  .option('--click-color <hex>', 'Click effect color (hex)', '#3B82F6')
  .option('--click-size <px>', 'Click effect size in pixels', '60')
  .option('--click-duration <ms>', 'Click effect duration in ms', '400')
  .option('--skip-voice', 'Skip voiceover generation')
  .option('--skip-analysis', 'Skip AI analysis (faster but no voiceover)')
  .option('--reliable', 'Use more reliable V2 engine (recommended)')
  .option('--dry-run', 'Analyze and show script without recording')
  .action(async (url, options) => {
    console.log(chalk.magenta(banner));
    try {
      // Use V2 engine if --reliable flag is set
      const demoFn = options.reliable ? generateDemoV2 : generateDemo;
      
      await demoFn(url, {
        output: options.output,
        duration: parseInt(options.duration),
        voice: options.voice,
        style: options.style,
        preset: options.preset,
        width: parseInt(options.width),
        height: parseInt(options.height),
        zoomMode: options.zoomMode,
        followIntensity: parseFloat(options.zoomIntensity),
        maxZoom: parseFloat(options.maxZoom),
        minZoom: parseFloat(options.minZoom),
        cursorStyle: options.cursor,
        cursorSize: parseInt(options.cursorSize),
        cursorColor: options.cursorColor,
        cursorPreset: options.cursorPreset,
        cursorGlow: options.cursorGlow || false,
        clickEffect: options.clickEffect,
        clickEffectColor: options.clickColor,
        clickEffectSize: parseInt(options.clickSize),
        clickEffectDuration: parseInt(options.clickDuration),
        skipVoice: options.skipVoice,
        skipAnalysis: options.skipAnalysis,
        dryRun: options.dryRun
      });
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      if (process.env.DEBUG) {
        console.error(e.stack);
      }
      process.exit(1);
    }
  });

// Quick: Fast demo with minimal options
program
  .command('quick <url>')
  .description('Quick demo with sensible defaults - just works!')
  .option('-o, --output <path>', 'Output file', './demo.mp4')
  .option('-d, --duration <seconds>', 'Duration', '20')
  .option('--no-voice', 'Skip voiceover')
  .action(async (url, options) => {
    console.log(chalk.magenta(banner));
    console.log(chalk.cyan('🚀 Quick mode: generating demo with smart defaults...\n'));
    try {
      await generateDemoV2(url, {
        output: options.output,
        duration: parseInt(options.duration),
        preset: 'youtube',
        skipVoice: !options.voice,
        zoomMode: 'smart',
        maxZoom: 1.6,
        style: 'professional'
      });
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

// Mobile: Mobile app demos with Appium
program
  .command('mobile <app>')
  .description('Generate polished mobile app demo with AI (requires Appium)')
  .option('-o, --output <path>', 'Output file', './mobile-demo.mp4')
  .option('-d, --duration <seconds>', 'Duration', '25')
  .option('-v, --voice <voice>', 'TTS voice (nova, alloy, echo, fable, onyx, shimmer)', 'nova')
  .option('-s, --style <style>', 'Script style (professional, casual, energetic)', 'professional')
  .option('-p, --preset <preset>', 'Export preset (youtube, twitter, instagram, tiktok, gif)', 'youtube')
  .option('--platform <platform>', 'Platform: ios, android (auto-detected from file extension)', '')
  .option('--device <device>', 'Device name (e.g., "iPhone 15 Pro", "Pixel 7")', 'iPhone 15 Pro')
  .option('--orientation <orientation>', 'Orientation: portrait, landscape', 'portrait')
  .option('--touch-indicator <style>', 'Touch indicator: circle, finger, ripple, dot', 'circle')
  .option('--touch-color <color>', 'Touch indicator color', 'rgba(255,255,255,0.8)')
  .option('--touch-size <px>', 'Touch indicator size in pixels', '80')
  .option('--show-swipe-trail', 'Show swipe gesture trails', true)
  .option('--device-frame', 'Add device frame overlay around video')
  .option('--frame-style <style>', 'Device frame style: modern, minimal', 'modern')
  .option('--actions <path>', 'Path to actions script JSON file')
  .option('--skip-voice', 'Skip voiceover generation')
  .option('--dry-run', 'Analyze and show script without recording')
  .action(async (app, options) => {
    console.log(chalk.magenta(banner));
    console.log(chalk.cyan('📱 Mobile App Recording Mode\n'));
    
    // Auto-detect platform if not specified
    let platform = options.platform;
    if (!platform) {
      const { detectPlatform } = await import('../src/v2/mobile-utils.js');
      platform = detectPlatform(app);
      if (!platform) {
        console.error(chalk.red('Could not detect platform. Use --platform ios or --platform android'));
        process.exit(1);
      }
      console.log(chalk.dim(`  Auto-detected platform: ${platform}\n`));
    }
    
    console.log(chalk.dim('Prerequisites:'));
    console.log(chalk.dim('  • Appium server running: appium --port 4723'));
    console.log(chalk.dim(`  • ${platform === 'ios' ? 'Xcode with iOS Simulator' : 'Android Studio with Emulator'}`));
    console.log(chalk.dim(`  • Driver installed: appium driver install ${platform === 'ios' ? 'xcuitest' : 'uiautomator2'}\n`));
    
    try {
      await generateMobileDemo(app, {
        output: options.output,
        duration: parseInt(options.duration),
        voice: options.voice,
        style: options.style,
        preset: options.preset,
        platform,
        device: options.device,
        orientation: options.orientation,
        touchIndicator: options.touchIndicator,
        touchColor: options.touchColor,
        touchSize: parseInt(options.touchSize),
        showSwipeTrail: options.showSwipeTrail,
        addDeviceFrame: options.deviceFrame,
        frameStyle: options.frameStyle,
        actionsScript: options.actions,
        skipVoice: options.skipVoice,
        dryRun: options.dryRun
      });
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      if (e.message.includes('ECONNREFUSED')) {
        console.error(chalk.yellow('\n💡 Make sure Appium server is running:'));
        console.error(chalk.dim('   npm install -g appium'));
        console.error(chalk.dim('   appium --port 4723'));
      }
      process.exit(1);
    }
  });

// Serve: Start the web UI editor
program
  .command('serve')
  .description('Start the L👀K web editor UI')
  .option('-p, --port <port>', 'Server port', '3847')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    console.log(chalk.magenta(banner));
    try {
      const { startServer } = await import('../src/v2/server.js');
      await startServer({
        port: parseInt(options.port),
        openBrowser: options.open !== false
      });
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

// Edit: Open an existing project in the editor
program
  .command('edit [projectId]')
  .description('Open a project in the web editor')
  .option('-p, --port <port>', 'Server port', '3847')
  .action(async (projectId, options) => {
    console.log(chalk.magenta(banner));
    
    try {
      // If a project ID is provided, verify it exists
      if (projectId) {
        try {
          await Project.load(projectId);
          console.log(chalk.dim(`Opening project ${projectId}...\n`));
        } catch (e) {
          console.error(chalk.red('Project not found:'), projectId);
          process.exit(1);
        }
      }
      
      // Start server and open to project
      const { startServer } = await import('../src/v2/server.js');
      const { url } = await startServer({
        port: parseInt(options.port),
        openBrowser: true
      });
      
      if (projectId) {
        // The UI will load this project via URL hash or query param
        console.log(chalk.dim(`Project: ${projectId}`));
      }
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

// Projects: List all projects
program
  .command('projects')
  .description('List all saved projects')
  .action(async () => {
    try {
      const projects = await Project.list();
      
      if (projects.length === 0) {
        console.log(chalk.dim('No projects found.'));
        return;
      }
      
      console.log(chalk.white('\nSaved Projects:\n'));
      for (const p of projects) {
        const name = p.name || new URL(p.url).hostname;
        const date = new Date(p.updatedAt).toLocaleDateString();
        console.log(chalk.cyan(`  ${p.id.slice(0, 8)}`), '-', chalk.white(name), chalk.dim(`(${date})`));
      }
      console.log();
    } catch (e) {
      console.error(chalk.red('Error:'), e.message);
      process.exit(1);
    }
  });

// Test: Verify the pipeline works with a quick test
program
  .command('test')
  .description('Run a quick test to verify the video generation pipeline')
  .option('--click-effects', 'Test click effects generation')
  .option('--full', 'Run full pipeline test with a sample site')
  .action(async (options) => {
    console.log(chalk.magenta(banner));
    console.log(chalk.cyan('🧪 Running pipeline tests...\n'));
    
    try {
      // Test 1: Check FFmpeg
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      process.stdout.write('  FFmpeg installed: ');
      try {
        await execAsync('ffmpeg -version');
        console.log(chalk.green('✓'));
      } catch {
        console.log(chalk.red('✗ (Install with: apt install ffmpeg)'));
        process.exit(1);
      }
      
      // Test 2: Check Sharp
      process.stdout.write('  Sharp working: ');
      try {
        const sharp = (await import('sharp')).default;
        const svg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
        await sharp(Buffer.from(svg)).png().toBuffer();
        console.log(chalk.green('✓'));
      } catch (e) {
        console.log(chalk.red('✗'), chalk.dim(e.message));
      }
      
      // Test 3: Check Playwright
      process.stdout.write('  Playwright browser: ');
      try {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        console.log(chalk.green('✓'));
      } catch (e) {
        console.log(chalk.red('✗'), chalk.dim('Run: npx playwright install chromium'));
      }
      
      // Test 4: Check OpenAI
      process.stdout.write('  OpenAI API key: ');
      if (process.env.OPENAI_API_KEY) {
        console.log(chalk.green('✓'));
      } else {
        console.log(chalk.yellow('⚠ Not set (voiceover disabled)'));
      }
      
      // Test 5: Click effects
      if (options.clickEffects) {
        process.stdout.write('  Click effects: ');
        try {
          const { testClickEffects } = await import('../src/v2/click-effects.js');
          await testClickEffects();
          console.log(chalk.green('✓'));
        } catch (e) {
          console.log(chalk.red('✗'), chalk.dim(e.message));
        }
      }
      
      // Test 6: Full pipeline
      if (options.full) {
        console.log(chalk.cyan('\n  Running full pipeline test...'));
        try {
          const result = await generateDemo('https://example.com', {
            duration: 10,
            skipVoice: true,
            output: '/tmp/repovideo-test.mp4'
          });
          console.log(chalk.green('  ✓ Full pipeline test passed!'));
          console.log(chalk.dim(`    Output: ${result.output}`));
        } catch (e) {
          console.log(chalk.red('  ✗ Full pipeline failed:'), e.message);
        }
      }
      
      console.log(chalk.green('\n✅ All basic tests passed!\n'));
      
      if (!options.full) {
        console.log(chalk.dim('Run with --full for complete pipeline test'));
      }
      
    } catch (e) {
      console.error(chalk.red('\n❌ Test failed:'), e.message);
      process.exit(1);
    }
  });

// Mobile test: Check mobile recording prerequisites
program
  .command('mobile-test')
  .description('Check prerequisites for mobile app recording')
  .option('--platform <platform>', 'Platform to check: ios, android, or both', 'both')
  .option('--list-devices', 'List available simulators/emulators')
  .action(async (options) => {
    console.log(chalk.magenta(banner));
    console.log(chalk.cyan('📱 Mobile Recording Prerequisites Check\n'));
    
    try {
      const { checkPrerequisites, getIOSSimulators, getAndroidEmulators } = await import('../src/v2/mobile-utils.js');
      
      const platforms = options.platform === 'both' ? ['ios', 'android'] : [options.platform];
      
      for (const platform of platforms) {
        console.log(chalk.white(`\n${platform === 'ios' ? '🍎 iOS' : '🤖 Android'} Prerequisites:\n`));
        
        const results = await checkPrerequisites(platform);
        
        for (const check of results.checks) {
          const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
          console.log(`  ${icon} ${check.name}: ${check.passed ? chalk.dim(check.message) : chalk.yellow(check.message)}`);
          if (!check.passed && check.fix) {
            console.log(chalk.dim(`      Fix: ${check.fix}`));
          }
        }
        
        if (results.allPassed) {
          console.log(chalk.green(`\n  ✅ All ${platform} prerequisites met!`));
        } else {
          console.log(chalk.yellow(`\n  ⚠ Some ${platform} prerequisites missing`));
        }
      }
      
      // List devices if requested
      if (options.listDevices) {
        console.log(chalk.white('\n📱 Available Devices:\n'));
        
        if (platforms.includes('ios')) {
          const simulators = await getIOSSimulators();
          if (simulators.length > 0) {
            console.log(chalk.cyan('  iOS Simulators:'));
            for (const sim of simulators.slice(0, 10)) {
              const stateIcon = sim.state === 'Booted' ? '🟢' : '⚪';
              console.log(`    ${stateIcon} ${sim.name} (${sim.runtime})`);
            }
            if (simulators.length > 10) {
              console.log(chalk.dim(`    ... and ${simulators.length - 10} more`));
            }
          } else {
            console.log(chalk.dim('  No iOS simulators found'));
          }
        }
        
        if (platforms.includes('android')) {
          const emulators = await getAndroidEmulators();
          if (emulators.length > 0) {
            console.log(chalk.cyan('\n  Android Emulators:'));
            for (const emu of emulators) {
              console.log(`    📱 ${emu.name}`);
            }
          } else {
            console.log(chalk.dim('  No Android emulators found'));
          }
        }
      }
      
      console.log();
      
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

// Devices: List supported device frames
program
  .command('devices')
  .description('List supported device frames for mobile demos')
  .action(async () => {
    console.log(chalk.magenta(banner));
    console.log(chalk.cyan('📱 Supported Device Frames:\n'));
    
    try {
      const { getSupportedDevices } = await import('../src/v2/device-frames.js');
      const devices = getSupportedDevices();
      
      const ios = devices.filter(d => d.includes('iPhone') || d.includes('iPad'));
      const android = devices.filter(d => d.includes('Pixel') || d.includes('Samsung') || d.includes('Galaxy'));
      const generic = devices.filter(d => d.includes('Generic'));
      
      console.log(chalk.white('  🍎 iOS Devices:'));
      for (const device of ios) {
        console.log(chalk.dim(`    • ${device}`));
      }
      
      console.log(chalk.white('\n  🤖 Android Devices:'));
      for (const device of android) {
        console.log(chalk.dim(`    • ${device}`));
      }
      
      console.log(chalk.white('\n  📱 Generic:'));
      for (const device of generic) {
        console.log(chalk.dim(`    • ${device}`));
      }
      
      console.log(chalk.dim('\n  Use with: repovideo mobile ./app.app --device "iPhone 15 Pro"\n'));
      
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
  .option('--edit', 'Open in web editor after recording')
  .action(async (url, options) => {
    if (!url) {
      console.log(chalk.magenta(banner));
      console.log(chalk.white('Usage:\n'));
      console.log(chalk.cyan('  repovideo demo <url>'), '    - Website demo with AI (recommended)');
      console.log(chalk.cyan('  repovideo mobile <app>'), '  - Mobile app demo with Appium');
      console.log(chalk.cyan('  repovideo repo <url>'), '    - GitHub repo terminal demo');
      console.log(chalk.cyan('  repovideo serve'), '         - Start web editor UI');
      console.log(chalk.cyan('  repovideo edit [id]'), '     - Edit existing project');
      console.log(chalk.cyan('  repovideo projects'), '      - List saved projects');
      console.log(chalk.dim('\nExamples:\n'));
      console.log(chalk.dim('  repovideo demo https://myapp.com'));
      console.log(chalk.dim('  repovideo demo https://myapp.com -o output.mp4 --voice alloy'));
      console.log(chalk.dim('  repovideo mobile ./MyApp.app --platform ios'));
      console.log(chalk.dim('  repovideo mobile ./app.apk --platform android'));
      console.log(chalk.dim('  repovideo serve'));
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
      
      // Open editor if requested
      if (options.edit) {
        console.log(chalk.dim('\nStarting web editor...\n'));
        const { startServer } = await import('../src/v2/server.js');
        await startServer({ port: 3847, openBrowser: true });
      }
    } catch (e) {
      console.error(chalk.red('\n❌ Error:'), e.message);
      process.exit(1);
    }
  });

program.parse();
