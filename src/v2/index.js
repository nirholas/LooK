import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import ora from 'ora';
import chalk from 'chalk';

import { recordBrowser } from './recorder.js';
import { AutoZoom } from './auto-zoom.js';
import { postProcess, combineVideoAudio, exportWithPreset } from './post-process.js';
import { analyzeWebsite, generateScript, generateVoiceover } from './ai.js';

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
    dryRun = false,
    width = 1920,
    height = 1080
  } = options;

  const spinner = ora();
  const durationMs = duration * 1000;

  try {
    // Step 1: Capture screenshot and analyze
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

    const analysis = await analyzeWebsite(screenshot, metadata);
    spinner.succeed('Analysis complete');
    
    console.log(chalk.dim(`  ${analysis.name || 'Website'}: ${analysis.tagline || analysis.description?.slice(0, 60) || 'No description'}...`));

    // Step 2: Generate script
    spinner.start('Generating voiceover script...');
    const script = await generateScript(analysis, { duration, style });
    spinner.succeed('Script generated');

    if (dryRun) {
      console.log(chalk.yellow('\n📝 Script:\n'));
      console.log(script);
      console.log(chalk.yellow('\n🔍 Analysis:\n'));
      console.log(JSON.stringify(analysis, null, 2));
      return { script, analysis };
    }

    // Step 3: Record browser with cursor tracking
    spinner.start('Recording browser demo (this may take a moment)...');
    const { videoPath, cursorData, tempDir } = await recordBrowser(url, {
      width,
      height,
      duration: durationMs
    });
    spinner.succeed('Browser recorded');

    // Step 4: Generate zoom keyframes
    spinner.start('Calculating zoom effects...');
    const autoZoom = new AutoZoom({
      defaultZoom: 1.2,
      maxZoom: 1.5,
      zoomDuration: 600
    });
    const zoomKeyframes = autoZoom.generateFromCursor(cursorData, width, height);
    spinner.succeed(`Generated ${zoomKeyframes.length} zoom keyframes`);

    // Step 5: Post-process video
    spinner.start('Applying professional effects...');
    const processedVideo = await postProcess(videoPath, {
      cursorData,
      zoomKeyframes,
      width,
      height,
      addMotionBlur: true,
      addVignette: true,
      addColorGrade: true
    });
    spinner.succeed('Effects applied');

    // Step 6: Generate voiceover
    let audioPath = null;
    if (!skipVoice) {
      spinner.start('Generating AI voiceover...');
      audioPath = await generateVoiceover(script, { voice });
      spinner.succeed('Voiceover generated');
    }

    // Step 7: Combine and export
    spinner.start(`Exporting for ${preset}...`);
    
    // Ensure output directory exists
    const outputDir = join(process.cwd(), 'output');
    await mkdir(outputDir, { recursive: true });
    
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
