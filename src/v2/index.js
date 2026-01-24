import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import ora from 'ora';
import chalk from 'chalk';

import { recordBrowser } from './recorder.js';
import { AutoZoom } from './auto-zoom.js';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { analyzeWebsite, generateScript, generateVoiceover } from './ai.js';
import { DemoEngine, checkDependencies } from './demo-engine.js';
import { getCursorPreset, CURSOR_PRESETS } from './cursor-renderer.js';
// Enhanced AI module with advanced capabilities
import * as aiEnhanced from './ai-enhanced.js';
// Multi-page and mobile imports are lazy-loaded to avoid requiring dependencies when not used
// import { generateMultiPageDemo } from './multi-page-recorder.js';
// import { MobileRecorder } from './mobile-recorder.js';
// import { TouchTracker } from './touch-tracker.js';
// import { autoDemo as mobileAutoDemo } from './mobile-auto-demo.js';
// import { TouchEffectRenderer } from './touch-effects.js';

/**
 * @typedef {import('../types/options.js').DemoOptions} DemoOptions
 * @typedef {import('../types/options.js').DemoResult} DemoResult
 * @typedef {import('../types/options.js').MobileDemoOptions} MobileDemoOptions
 * @typedef {import('../types/ai.js').WebsiteAnalysis} WebsiteAnalysis
 * @typedef {import('../types/project.js').CursorData} CursorData
 * @typedef {import('../types/project.js').ZoomKeyframe} ZoomKeyframe
 */

/**
 * Main entry point - generate a professional demo video from a URL.
 * 
 * This function performs the complete workflow:
 * 1. Captures screenshot and analyzes website with AI vision
 * 2. Generates voiceover script based on analysis
 * 3. Records browser with cursor tracking
 * 4. Applies zoom effects (smart, basic, or follow cursor)
 * 5. Overlays cursor with click effects
 * 6. Generates AI voiceover
 * 7. Exports final video with preset encoding
 * 
 * @param {string} url - The URL to record a demo of
 * @param {DemoOptions} [options={}] - Configuration options
 * @param {string} [options.output='./output/demo.mp4'] - Output file path
 * @param {number} [options.duration=25] - Target duration in seconds
 * @param {'alloy'|'echo'|'fable'|'onyx'|'nova'|'shimmer'} [options.voice='nova'] - Voice for TTS
 * @param {'professional'|'casual'|'energetic'|'minimal'} [options.style='professional'] - Script style
 * @param {'youtube'|'twitter'|'instagram'|'tiktok'|'gif'} [options.preset='youtube'] - Export preset
 * @param {boolean} [options.skipVoice=false] - Skip voiceover generation
 * @param {boolean} [options.skipAnalysis=false] - Skip AI analysis (no voiceover)
 * @param {boolean} [options.dryRun=false] - Only analyze, don't generate video
 * @param {number} [options.width=1920] - Video width in pixels
 * @param {number} [options.height=1080] - Video height in pixels
 * @param {'none'|'basic'|'smart'|'follow'} [options.zoomMode='smart'] - Zoom mode
 * @param {number} [options.followIntensity=0.5] - Camera follow intensity (0-1)
 * @param {number} [options.maxZoom=2.0] - Maximum zoom level
 * @param {number} [options.minZoom=1.0] - Minimum zoom level
 * @param {boolean} [options.zoomOnClicks=true] - Zoom in on click events
 * @param {boolean} [options.zoomOnHover=true] - Zoom in on hover pauses
 * @param {'slow'|'medium'|'fast'} [options.zoomSpeed='medium'] - Zoom animation speed
 * @param {string} [options.cursorStyle='default'] - Cursor visual style
 * @param {number} [options.cursorSize=32] - Cursor size in pixels
 * @param {string} [options.cursorColor='#000000'] - Cursor color (hex)
 * @param {string|null} [options.cursorPreset=null] - Cursor preset name
 * @param {boolean} [options.cursorGlow=false] - Add glow effect to cursor
 * @param {'ripple'|'pulse'|'ring'|'spotlight'|'none'} [options.clickEffect='ripple'] - Click effect type
 * @param {string} [options.clickEffectColor='#3B82F6'] - Click effect color
 * @param {number} [options.clickEffectSize=60] - Click effect size in pixels
 * @param {number} [options.clickEffectDuration=400] - Click effect duration in ms
 * @returns {Promise<DemoResult>} The result containing output path, script, analysis, and tracking data
 * @throws {Error} If FFmpeg is not installed or other critical errors occur
 * 
 * @example
 * // Basic usage
 * await generateDemo('https://example.com');
 * 
 * @example
 * // With options
 * await generateDemo('https://myapp.com', {
 *   duration: 30,
 *   voice: 'alloy',
 *   style: 'casual',
 *   preset: 'twitter',
 *   zoomMode: 'follow',
 *   maxZoom: 2.5
 * });
 */
export async function generateDemo(url, options = {}) {
  const {
    output = './output/demo.mp4',
    duration = 25, // seconds
    voice = 'nova',
    style = 'professional',
    preset = 'youtube', // youtube, twitter, instagram, tiktok, gif
    skipVoice = false,
    skipAnalysis = false,  // Skip AI analysis (no voiceover, just record)
    dryRun = false,
    width = 1920,
    height = 1080,
    // Zoom options
    zoomMode = 'smart',        // 'none', 'basic', 'smart', 'follow'
    followIntensity = 0.5,     // How closely camera follows cursor (0-1)
    maxZoom = 2.0,             // Maximum zoom level
    minZoom = 1.0,             // Minimum zoom level
    zoomOnClicks = true,       // Zoom in on click events
    zoomOnHover = true,        // Zoom in on hover pauses
    zoomSpeed = 'medium',      // 'slow', 'medium', 'fast'
    // Cursor options
    cursorStyle = 'default',   // 'default', 'arrow-modern', 'pointer', 'dot', 'circle', 'crosshair', 'spotlight', 'none'
    cursorSize = 32,           // Cursor size in pixels
    cursorColor = '#000000',   // Cursor color (hex)
    cursorPreset = null,       // 'light', 'dark', 'blue', 'green', 'red', 'purple', 'orange', 'github', 'figma', 'notion'
    cursorGlow = false,        // Add glow effect to cursor
    // Click effect options
    clickEffect = 'ripple',        // 'ripple', 'pulse', 'ring', 'spotlight', 'none'
    clickEffectColor = '#3B82F6',  // Click effect color (hex)
    clickEffectSize = 60,          // Click effect size in pixels
    clickEffectDuration = 400,     // Click effect duration in ms
  } = options;

  const spinner = ora();
  const durationMs = duration * 1000;

  try {
    // Check dependencies first
    spinner.start('Checking dependencies...');
    const deps = await checkDependencies();
    if (!deps.ffmpeg) {
      throw new Error('FFmpeg is required. Please install FFmpeg: https://ffmpeg.org/download.html');
    }
    spinner.succeed('Dependencies OK');

    // Ensure output directory exists
    const outputDir = dirname(output.startsWith('./') 
      ? join(process.cwd(), output.slice(2))
      : output);
    await mkdir(outputDir, { recursive: true });

    let analysis = null;
    let script = null;

    // Step 1: Capture screenshot and analyze (skip if --skip-analysis)
    if (!skipAnalysis) {
      spinner.start('Analyzing website with AI vision...');
      
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      const screenshot = await page.screenshot({ encoding: 'base64' });
      const metadata = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || ''
      }));
      metadata.url = url;
      
      await browser.close();

      analysis = await analyzeWebsite(screenshot, metadata);
      spinner.succeed('Analysis complete');
      
      console.log(chalk.dim(`  ${analysis.name || 'Website'}: ${analysis.tagline || analysis.description?.slice(0, 60) || 'No description'}...`));

      // Step 2: Generate script
      spinner.start('Generating voiceover script...');
      script = await generateScript(analysis, { duration, style });
      spinner.succeed('Script generated');

      if (dryRun) {
        console.log(chalk.yellow('\n📝 Script:\n'));
        console.log(script);
        console.log(chalk.yellow('\n🔍 Analysis:\n'));
        console.log(JSON.stringify(analysis, null, 2));
        return { script, analysis };
      }
    } else {
      spinner.info('Skipping AI analysis (--skip-analysis)');
      if (dryRun) {
        console.log(chalk.yellow('\n⚠️  Dry run with --skip-analysis has nothing to show.\n'));
        return { script: null, analysis: null };
      }
    }

    // Step 3: Record browser with cursor tracking
    spinner.start('Recording browser demo (this may take a moment)...');
    const { videoPath, cursorData, tempDir } = await recordBrowser(url, {
      width,
      height,
      duration: durationMs
    });
    spinner.succeed('Browser recorded');

    // Step 4: Generate zoom keyframes based on mode
    spinner.start(`Calculating ${zoomMode} zoom effects...`);
    
    // Map zoom speed to duration
    const zoomSpeedMap = {
      slow: 1200,
      medium: 800,
      fast: 400
    };
    const zoomDuration = zoomSpeedMap[zoomSpeed] || 800;
    
    const autoZoom = new AutoZoom({
      defaultZoom: 1.2 + (maxZoom - 1) * 0.3, // Scale default between min and max
      maxZoom: maxZoom,
      minZoom: minZoom,
      zoomDuration: zoomDuration,
      zoomMode: zoomMode,
      followIntensity: followIntensity
    });
    
    let zoomKeyframes = [];
    
    if (zoomMode !== 'none') {
      zoomKeyframes = autoZoom.generateZoom(cursorData, width, height, {
        zoomMode: zoomMode,
        followIntensity: followIntensity,
        zoomOnClicks: zoomOnClicks,
        zoomOnHover: zoomOnHover
      });
    }
    
    spinner.succeed(`Generated ${zoomKeyframes.length} zoom keyframes (${zoomMode} mode)`);

    // Step 5: Post-process video with cursor overlay, click effects and zoom
    spinner.start('Applying cursor overlay, click effects, and professional effects...');
    
    // Log click count for debugging
    const clickCount = cursorData?.clicks?.length || 0;
    if (clickCount > 0) {
      console.log(chalk.dim(`  Found ${clickCount} click event(s) to animate`));
    }

    // Apply cursor preset if specified
    let finalCursorColor = cursorColor;
    let finalCursorStyle = cursorStyle;
    let finalCursorGlow = cursorGlow;
    
    if (cursorPreset && CURSOR_PRESETS[cursorPreset]) {
      const presetConfig = getCursorPreset(cursorPreset);
      finalCursorColor = presetConfig.color || cursorColor;
      finalCursorStyle = presetConfig.style || cursorStyle;
      finalCursorGlow = presetConfig.glow || cursorGlow;
      console.log(chalk.dim(`  Using cursor preset: ${cursorPreset}`));
    }
    
    const processedVideo = await postProcess(videoPath, {
      cursorData,
      zoomKeyframes,
      width,
      height,
      fps: 60, // Match recording framerate
      addMotionBlur: true,
      addVignette: true,
      addColorGrade: true,
      // Cursor rendering
      renderCursor: finalCursorStyle !== 'none',
      cursorStyle: finalCursorStyle,
      cursorSize,
      cursorColor: finalCursorColor,
      cursorGlow: finalCursorGlow,
      cursorPreset,
      // Click effects
      clickEffect,
      clickEffectColor,
      clickEffectSize,
      clickEffectDuration
    });
    spinner.succeed('Effects applied');

    // Step 6: Generate voiceover (only if we have a script)
    let audioPath = null;
    if (!skipVoice && !skipAnalysis && script) {
      spinner.start('Generating AI voiceover...');
      audioPath = await generateVoiceover(script, { voice });
      spinner.succeed('Voiceover generated');
    } else if (skipAnalysis) {
      spinner.info('Skipping voiceover (no script generated)');
    }

    // Step 7: Combine and export
    spinner.start(`Exporting for ${preset}...`);
    
    const finalOutput = output.startsWith('./')
      ? join(process.cwd(), output.slice(2))
      : output;

    if (audioPath) {
      // Combine video + audio, then export with preset
      const tempCombined = join(tempDir, 'combined.mp4');
      await combineVideoAudio(processedVideo, audioPath, tempCombined);
      await exportWithPreset(tempCombined, preset, finalOutput);
    } else {
      await exportWithPreset(processedVideo, preset, finalOutput);
    }

    spinner.succeed(`Video saved to ${chalk.bold(finalOutput)}`);

    console.log(chalk.green('\n✅ Done!\n'));

    return {
      output: finalOutput,
      script,
      analysis,
      cursorData,
      zoomKeyframes
    };

  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
}

/**
 * Quick demo - minimal configuration for fast video generation.
 * 
 * Generates a short, casual demo optimized for Twitter/X with sensible defaults.
 * Useful for quickly testing a URL or generating a social media preview.
 * 
 * @param {string} url - The URL to record a demo of
 * @returns {Promise<DemoResult>} The generated demo result
 * 
 * @example
 * await quickDemo('https://myapp.com');
 */
export async function quickDemo(url) {
  return generateDemo(url, {
    duration: 20,
    preset: 'twitter',
    style: 'casual'
  });
}

/**
 * Generate a demo video for a GitHub repository page.
 * 
 * Records the GitHub repository page with technical-style narration.
 * Useful for showcasing open source projects and generating README videos.
 * 
 * @param {string} repoUrl - The GitHub repository URL (e.g., 'https://github.com/user/repo')
 * @param {DemoOptions} [options={}] - Additional options to override defaults
 * @returns {Promise<DemoResult>} The generated demo result
 * 
 * @example
 * await repoDemo('https://github.com/facebook/react');
 */
export async function repoDemo(repoUrl, options = {}) {
  // Convert github URL to actual site if deployed
  // Or use terminal recording mode
  // For now, just record the GitHub page
  return generateDemo(repoUrl, {
    duration: 30,
    style: 'technical',
    ...options
  });
}

/**
 * Generate a professional demo video of a mobile app using Appium.
 * 
 * Records iOS or Android apps with touch gesture visualization and tracking.
 * Requires WebDriverIO and Appium to be installed and configured separately.
 * Supports iPhone/iPad simulators and Android emulators.
 * 
 * @param {string} appPath - Path to the app bundle (.app/.ipa for iOS, .apk for Android)
 * @param {MobileDemoOptions} [options={}] - Mobile demo options
 * @param {'ios'|'android'} [options.platform='ios'] - Mobile platform
 * @param {string} [options.device='iPhone 15 Pro'] - Device name
 * @param {string} [options.output='./output/mobile-demo.mp4'] - Output path
 * @param {number} [options.duration=25] - Duration in seconds
 * @param {'portrait'|'landscape'} [options.orientation='portrait'] - Screen orientation
 * @param {'circle'|'finger'|'ripple'|'dot'} [options.touchIndicator='circle'] - Touch indicator style
 * @param {string} [options.touchColor='rgba(255,255,255,0.8)'] - Touch indicator color
 * @param {boolean} [options.showSwipeTrail=true] - Show swipe gesture trails
 * @returns {Promise<DemoResult & { touchData: object }>} Demo result with touch tracking data
 * @throws {Error} If Appium is not running or device connection fails
 * 
 * @example
 * await generateMobileDemo('/path/to/MyApp.app', {
 *   platform: 'ios',
 *   device: 'iPhone 15',
 *   duration: 30
 * });
 */
export async function generateMobileDemo(appPath, options = {}) {
  // Lazy load mobile-specific dependencies
  const { MobileRecorder } = await import('./mobile-recorder.js');
  const { TouchTracker } = await import('./touch-tracker.js');
  const { autoDemo: mobileAutoDemo } = await import('./mobile-auto-demo.js');
  const { TouchEffectRenderer } = await import('./touch-effects.js');

  const {
    platform = 'ios',
    device = 'iPhone 15 Pro',
    output = './output/mobile-demo.mp4',
    duration = 25,
    voice = 'nova',
    style = 'professional',
    preset = 'youtube',
    orientation = 'portrait',
    skipVoice = false,
    dryRun = false,
    // Touch visualization options
    touchIndicator = 'circle',     // circle, finger, ripple, dot
    touchColor = 'rgba(255,255,255,0.8)',
    touchSize = 80,
    showSwipeTrail = true,
    // Zoom options
    zoomMode = 'smart',
    maxZoom = 1.8,
    minZoom = 1.0
  } = options;

  const spinner = ora();
  const durationMs = duration * 1000;

  // Create temp directory
  const tempDir = join(tmpdir(), `repovideo-mobile-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Step 1: Connect to device/simulator
    spinner.start(`Connecting to ${platform === 'ios' ? 'iOS' : 'Android'} device...`);
    
    const recorder = new MobileRecorder({
      platform,
      device,
      app: appPath,
      orientation
    });
    
    await recorder.connect();
    spinner.succeed(`Connected to ${device}`);

    // Step 2: Capture screenshot for AI analysis
    spinner.start('Analyzing app with AI vision...');
    
    const screenshot = await recorder.screenshot();
    const { width, height } = await recorder.getWindowSize();
    
    const analysis = await analyzeWebsite(screenshot, {
      type: 'mobile-app',
      platform,
      orientation
    });
    
    spinner.succeed('Analysis complete');
    console.log(chalk.dim(`  ${analysis.name || 'App'}: ${analysis.tagline || analysis.description?.slice(0, 60) || 'Mobile application'}...`));

    // Step 3: Generate script
    spinner.start('Generating voiceover script...');
    const script = await generateScript(analysis, { duration, style });
    spinner.succeed('Script generated');

    if (dryRun) {
      await recorder.disconnect();
      console.log(chalk.yellow('\n📝 Script:\n'));
      console.log(script);
      console.log(chalk.yellow('\n🔍 Analysis:\n'));
      console.log(JSON.stringify(analysis, null, 2));
      return { script, analysis };
    }

    // Step 4: Record app demo with touch tracking
    spinner.start('Recording app demo (this may take a moment)...');
    
    const touchTracker = new TouchTracker({ fps: 60 });
    await recorder.startRecording({ fps: 60 });
    
    // Run automated demo
    await mobileAutoDemo(recorder.driver, touchTracker, durationMs, {
      platform,
      scrollPause: 1500,
      tapPause: 2000
    });
    
    const rawVideoPath = join(tempDir, 'raw.mp4');
    await recorder.stopRecording(rawVideoPath);
    await recorder.disconnect();
    
    spinner.succeed('Recording complete');

    // Step 5: Generate zoom keyframes
    spinner.start(`Calculating ${zoomMode} zoom effects...`);
    
    const autoZoom = new AutoZoom({
      defaultZoom: 1.2,
      maxZoom,
      minZoom,
      zoomDuration: 800,
      zoomMode
    });
    
    // Convert touch gestures to zoom targets
    const zoomTargets = touchTracker.getGesturesForZoom();
    let zoomKeyframes = [];
    
    if (zoomMode !== 'none' && zoomTargets.length > 0) {
      zoomKeyframes = zoomTargets.map(target => ({
        time: target.time,
        zoom: target.zoomLevel,
        x: target.x,
        y: target.y,
        duration: 800
      }));
    }
    
    spinner.succeed(`Generated ${zoomKeyframes.length} zoom keyframes`);

    // Step 6: Add touch visualization overlay
    spinner.start('Adding touch visualization effects...');
    
    const touchRenderer = new TouchEffectRenderer({
      indicator: touchIndicator,
      color: touchColor,
      size: touchSize,
      showSwipeTrail
    });
    
    const touchFrames = touchTracker.getFrames(durationMs);
    const touchOverlayPath = await touchRenderer.generateTouchOverlay(
      touchFrames, 60, width, height, tempDir
    );
    
    const videoWithTouch = join(tempDir, 'with-touch.mp4');
    await touchRenderer.applyOverlay(rawVideoPath, touchOverlayPath, videoWithTouch);
    
    spinner.succeed('Touch effects applied');

    // Step 7: Post-process video (color grade, vignette)
    spinner.start('Applying professional effects...');
    
    const processedVideo = await postProcess(videoWithTouch, {
      zoomKeyframes,
      width,
      height,
      addMotionBlur: false,  // Already have touch motion
      addVignette: true,
      addColorGrade: true,
      renderCursor: false    // Using touch indicator instead
    });
    
    spinner.succeed('Effects applied');

    // Step 8: Generate voiceover
    let audioPath = null;
    if (!skipVoice) {
      spinner.start('Generating AI voiceover...');
      audioPath = await generateVoiceover(script, { voice });
      spinner.succeed('Voiceover generated');
    }

    // Step 9: Combine and export
    spinner.start(`Exporting for ${preset}...`);
    
    const outputDir = join(process.cwd(), 'output');
    await mkdir(outputDir, { recursive: true });
    
    const finalOutput = output.startsWith('./')
      ? join(process.cwd(), output.slice(2))
      : output;

    if (audioPath) {
      const tempCombined = join(tempDir, 'combined.mp4');
      await combineVideoAudio(processedVideo, audioPath, tempCombined);
      await exportWithPreset(tempCombined, preset, finalOutput);
    } else {
      await exportWithPreset(processedVideo, preset, finalOutput);
    }

    spinner.succeed(`Video saved to ${chalk.bold(finalOutput)}`);
    console.log(chalk.green('\n✅ Done!\n'));

    return {
      output: finalOutput,
      script,
      analysis,
      touchData: touchTracker.toJSON(),
      zoomKeyframes
    };

  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
}

/**
 * Reliable demo generation using the new DemoEngine.
 * 
 * An improved implementation that handles edge cases better than generateDemo.
 * Uses a more robust recording and processing pipeline with better error handling.
 * Recommended for production use and automated pipelines.
 * 
 * @param {string} url - The URL to record a demo of
 * @param {DemoOptions} [options={}] - Configuration options (same as generateDemo)
 * @returns {Promise<{ success: boolean, output: string, script: string|null, analysis: WebsiteAnalysis|null }>}
 * @throws {Error} If FFmpeg is not installed or URL is inaccessible
 * 
 * @example
 * const result = await generateDemoV2('https://myapp.com', {
 *   duration: 30,
 *   preset: 'youtube'
 * });
 * console.log(`Video saved: ${result.output}`);
 */
export async function generateDemoV2(url, options = {}) {
  const {
    output = './output/demo.mp4',
    duration = 25,
    voice = 'nova',
    style = 'professional',
    preset = 'youtube',
    skipVoice = false,
    skipAnalysis = false,
    width = 1920,
    height = 1080,
    zoomMode = 'smart',
    followIntensity = 0.5,
    maxZoom = 1.8,
    minZoom = 1.0,
  } = options;

  const spinner = ora();

  try {
    // Check dependencies
    spinner.start('Checking system requirements...');
    const deps = await checkDependencies();
    if (!deps.ffmpeg) {
      throw new Error('FFmpeg is required. Install it with: brew install ffmpeg (Mac) or apt install ffmpeg (Linux)');
    }
    spinner.succeed('System ready');

    // Create output directory
    const finalOutput = output.startsWith('./')
      ? join(process.cwd(), output.slice(2))
      : output;
    await mkdir(dirname(finalOutput), { recursive: true });

    // Initialize demo engine
    const engine = new DemoEngine({
      width,
      height,
      duration: duration * 1000,
      fps: 60
    });

    await engine.init();

    // Step 1: Analyze (optional but recommended)
    let analysis = null;
    let script = null;

    if (!skipAnalysis) {
      spinner.start('Analyzing website with AI vision...');
      
      // Quick screenshot for analysis
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage({ viewport: { width, height } });
      
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const screenshot = await page.screenshot({ encoding: 'base64' });
        const metadata = await page.evaluate(() => ({
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || ''
        }));
        metadata.url = url;
        
        analysis = await analyzeWebsite(screenshot, metadata);
        spinner.succeed(`Analyzed: ${analysis.name || 'Website'}`);
        
        // Generate script
        spinner.start('Generating voiceover script...');
        script = await generateScript(analysis, { duration, style });
        spinner.succeed('Script ready');
        
        console.log(chalk.dim(`  "${script.slice(0, 80)}..."`));
      } finally {
        await browser.close();
      }
    }

    // Step 2: Record demo
    spinner.start('Recording browser demo...');
    await engine.launchBrowser(url);
    
    const pageInfo = await engine.getPageInfo();
    await engine.autoDemo(pageInfo);
    
    const { videoPath, cursorData, tempDir } = await engine.stopRecording();
    spinner.succeed('Demo recorded');

    // Step 3: Convert to MP4
    spinner.start('Processing video...');
    const mp4Path = await engine.convertToMp4(videoPath);

    // Step 4: Apply cursor overlay
    const withCursorPath = join(tempDir, 'with-cursor.mp4');
    await engine.applyCursorOverlay(mp4Path, cursorData, withCursorPath);

    // Step 5: Apply zoom effects
    let zoomedPath = withCursorPath;
    if (zoomMode !== 'none') {
      const autoZoom = new AutoZoom({
        maxZoom,
        minZoom,
        defaultZoom: 1.2 + (maxZoom - 1) * 0.3,
        zoomMode,
        followIntensity
      });
      
      const zoomKeyframes = autoZoom.generateZoom(cursorData, width, height, {
        zoomMode,
        followIntensity,
        zoomOnClicks: true,
        zoomOnHover: true
      });
      
      if (zoomKeyframes.length > 0) {
        zoomedPath = join(tempDir, 'zoomed.mp4');
        await engine.applyZoomEffects(withCursorPath, zoomKeyframes, zoomedPath);
      }
    }

    // Step 6: Apply post effects
    const effectsPath = join(tempDir, 'effects.mp4');
    await engine.applyPostEffects(zoomedPath, effectsPath);
    spinner.succeed('Effects applied');

    // Step 7: Generate voiceover
    let audioPath = null;
    if (!skipVoice && script) {
      spinner.start('Generating AI voiceover...');
      audioPath = await generateVoiceover(script, { voice });
      spinner.succeed('Voiceover generated');
    }

    // Step 8: Combine and export
    spinner.start(`Exporting for ${preset}...`);
    
    let finalVideoPath = effectsPath;
    if (audioPath) {
      const combinedPath = join(tempDir, 'combined.mp4');
      await engine.combineAudio(effectsPath, audioPath, combinedPath);
      finalVideoPath = combinedPath;
    }

    await engine.exportWithPreset(finalVideoPath, preset, finalOutput);
    spinner.succeed(`Video saved to ${chalk.bold(finalOutput)}`);

    // Cleanup
    await engine.cleanup();

    console.log(chalk.green('\n✅ Demo video created successfully!\n'));
    
    if (script) {
      console.log(chalk.dim('Script:'));
      console.log(chalk.dim(script));
      console.log();
    }

    return {
      success: true,
      output: finalOutput,
      script,
      analysis
    };

  } catch (error) {
    spinner.fail(error.message);
    console.error(chalk.red('\nTroubleshooting:'));
    console.error(chalk.dim('  - Make sure FFmpeg is installed'));
    console.error(chalk.dim('  - Check that the URL is accessible'));
    console.error(chalk.dim('  - Set OPENAI_API_KEY environment variable'));
    throw error;
  }
}

/**
 * Generate a multi-page walkthrough demo that explores an entire website
 * Lazily loads the multi-page recorder to avoid loading dependencies when not used
 */
export async function generateWalkthrough(url, options = {}) {
  const { generateMultiPageDemo } = await import('./multi-page-recorder.js');
  return generateMultiPageDemo(url, options);
}

// Re-export for direct access
export { SiteExplorer, generateDemoJourney } from './site-explorer.js';
export { LiveRecorder, createLiveRecorder } from './live-recorder.js';

// Demo Orchestrator - Intelligent multi-page demo generation
export { DemoOrchestrator, generateIntelligentDemo } from './demo-orchestrator.js';
export { DemoPlan } from './demo-plan.js';
export { PacingController, calculateAdaptiveTiming } from './pacing-controller.js';
export { ErrorRecovery } from './error-recovery.js';
export { TransitionManager } from './transition-manager.js';

// Page analysis components
export { StateDetector } from './state-detector.js';
export { ElementDiscovery } from './element-discovery.js';
export { ContentAnalyzer } from './content-analyzer.js';
export { NavigationGraph } from './navigation-graph.js';

// Export enhanced AI module for advanced usage
export {
  analyzeWebsiteEnhanced,
  extractPageElements,
  captureFullPage,
  planDemoWithCoT,
  generateScriptEnhanced,
  generateSmartActions,
  getAvailableProviders
} from './ai-enhanced.js';

// v2.1 Features - Batch Processing & Timeline Markers
export { BatchProcessor, loadBatchConfig, runBatch } from './batch.js';
export {
  MarkerType,
  generateYouTubeChapters,
  generateZoomFromMarkers,
  MarkerTemplates,
  applyMarkerTemplate
} from './markers.js';

// v2.1 Features - Professional Overlays & Effects
export {
  AnimatedCaptionRenderer,
  CaptionStyle,
  addAnimatedCaptions
} from './animated-captions.js';

export {
  SceneTransitionManager,
  TransitionType,
  TransitionPresets,
  applyTransition,
  chainWithTransitions
} from './scene-transitions.js';

export {
  KeyboardVisualizer,
  KeyStyle,
  addKeyboardOverlay
} from './keyboard-visualizer.js';

export {
  CalloutRenderer,
  CalloutType,
  ArrowStyle,
  addCallouts
} from './callout-annotations.js';

export {
  SpotlightRenderer,
  SpotlightShape,
  addSpotlight
} from './spotlight.js';

export {
  ThumbnailGenerator,
  ThumbnailStyle,
  generateThumbnail,
  generateYouTubeThumbnail,
  generateSocialThumbnails
} from './auto-thumbnail.js';

export {
  GifExporter,
  GifQuality,
  DitherMode,
  videoToGif,
  exportHighQualityGif,
  exportPreviewGif,
  exportClipAsGif,
  exportMultipleSizes
} from './gif-export.js';

export {
  LowerThirdRenderer,
  LowerThirdStyle,
  LowerThirdTheme,
  addLowerThirds,
  createSpeakerIntro,
  createChapterMarker,
  createSocialCTA
} from './lower-thirds.js';
