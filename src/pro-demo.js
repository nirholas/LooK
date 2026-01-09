import { smartScroll, recordWithPlaywright } from './playwright-recorder.js';
import { addZoomEffects, professionalPostProcess } from './post-process.js';
import { screenshotPage } from './browser.js';
import { analyzeScreenshot, generateBrowserScript } from './vision.js';
import { generateVoiceover } from './voice.js';
import { composeVideo } from './compose.js';
import ora from 'ora';
import chalk from 'chalk';
import { mkdir, rm } from 'fs/promises';
import { dirname } from 'path';

export async function generateProDemo(url, options = {}) {
  const {
    output = './output/demo.mp4',
    duration = 20,
    voice = 'nova', // Better voice for pro demos
    skipVoice = false,
    dryRun = false,
    style = 'scroll' // 'scroll' | 'interactive'
  } = options;

  const spinner = ora();
  const tempFiles = [];

  try {
    // Step 1: Screenshot and analyze
    spinner.start('Analyzing website with AI vision...');
    const { screenshot, metadata } = await screenshotPage(url);
    const analysis = await analyzeScreenshot(screenshot, metadata);
    spinner.succeed('Analysis complete');

    console.log(chalk.dim(`  ${analysis.description?.slice(0, 100)}...`));

    // Step 2: Generate script
    spinner.start('Generating voiceover script...');
    const script = await generateBrowserScript(analysis, url, duration);
    spinner.succeed('Script generated');

    if (dryRun) {
      console.log(chalk.yellow('\n📝 Generated Script:\n'));
      console.log(script);
      console.log(chalk.yellow('\n🔍 Analysis:\n'));
      console.log(JSON.stringify(analysis, null, 2));
      return { script, analysis };
    }

    // Step 3: Record browser with Playwright
    spinner.start('Recording browser demo...');
    let recording;
    
    if (style === 'interactive' && analysis.actions) {
      // Use AI-suggested actions
      recording = await recordWithPlaywright(url, analysis.actions, { 
        width: 1920, 
        height: 1080 
      });
    } else {
      // Smart scroll through page
      recording = await smartScroll(url, { 
        duration, 
        width: 1920, 
        height: 1080,
        pauseAtSections: true 
      });
    }
    tempFiles.push(recording.tempDir);
    spinner.succeed('Browser recorded');

    // Step 4: Post-process video
    spinner.start('Adding professional effects...');
    
    // Add zoom effects at click/focus points
    const zoomedVideo = await addZoomEffects(
      recording.videoPath, 
      recording.clickLog,
      { width: 1920, height: 1080 }
    );
    
    // Add vignette and color grading
    const processedVideo = await professionalPostProcess(zoomedVideo, {
      width: 1920,
      height: 1080,
      addVignette: true,
      addColorGrade: true
    });
    spinner.succeed('Effects applied');

    // Step 5: Generate voiceover
    let audioFile = null;
    if (!skipVoice) {
      spinner.start('Generating AI voiceover...');
      audioFile = await generateVoiceover(script, voice);
      spinner.succeed('Voiceover generated');
    }

    // Step 6: Compose final video
    spinner.start('Composing final video...');
    await mkdir(dirname(output), { recursive: true });
    await composeVideo(processedVideo, audioFile, output);
    spinner.succeed(`Video saved to ${chalk.bold(output)}`);

    console.log(chalk.green('\n✅ Done!\n'));

    return { output, script, analysis };

  } catch (error) {
    spinner.fail(error.message);
    throw error;
  } finally {
    // Cleanup temp files
    for (const dir of tempFiles) {
      try {
        await rm(dir, { recursive: true, force: true });
      } catch {}
    }
  }
}
