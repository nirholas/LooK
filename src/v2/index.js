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
// Mobile imports are lazy-loaded to avoid requiring webdriverio when not used
// import { MobileRecorder } from './mobile-recorder.js';
// import { TouchTracker } from './touch-tracker.js';
// import { autoDemo as mobileAutoDemo } from './mobile-auto-demo.js';
// import { TouchEffectRenderer } from './touch-effects.js';

/**
 * Main entry point - generate a professional demo video
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
 * Quick demo - minimal options
 */
export async function quickDemo(url) {
  return generateDemo(url, {
    duration: 20,
    preset: 'twitter',
    style: 'casual'
  });
}

/**
 * GitHub repo demo
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
 * Generate a professional demo video of a mobile app using Appium
 * Note: Requires webdriverio and Appium to be installed separately
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
 * Reliable demo generation using new DemoEngine
 * This is a more robust alternative that handles edge cases better
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
