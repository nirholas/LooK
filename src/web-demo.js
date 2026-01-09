import { screenshotPage, recordBrowser } from './browser.js';
import { analyzeScreenshot, generateBrowserScript } from './vision.js';
import { generateVoiceover } from './voice.js';
import { composeVideo } from './compose.js';
import ora from 'ora';
import chalk from 'chalk';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export async function generateWebDemo(url, options = {}) {
  const {
    output = './output/demo.mp4',
    duration = 20,
    voice = 'alloy',
    skipVoice = false,
    dryRun = false
  } = options;

  const spinner = ora();

  try {
    // Step 1: Screenshot and analyze
    spinner.start('Capturing screenshot...');
    const { screenshot, metadata } = await screenshotPage(url);
    spinner.succeed('Screenshot captured');

    console.log(chalk.dim(`  Title: ${metadata.title || 'N/A'}`));

    // Step 2: Analyze with vision
    spinner.start('Analyzing with AI vision...');
    const analysis = await analyzeScreenshot(screenshot, metadata);
    spinner.succeed('Analysis complete');

    console.log(chalk.dim(`  ${analysis.description?.slice(0, 80)}...`));

    // Step 3: Generate script
    spinner.start('Generating script...');
    const script = await generateBrowserScript(analysis, url, duration);
    spinner.succeed('Script generated');

    if (dryRun) {
      console.log(chalk.yellow('\n📝 Generated Script:\n'));
      console.log(script);
      console.log(chalk.yellow('\n🔍 Analysis:\n'));
      console.log(JSON.stringify(analysis, null, 2));
      return;
    }

    // Step 4: Record browser
    spinner.start('Recording browser demo...');
    const { videoPath } = await recordBrowser(url, { duration });
    spinner.succeed('Browser recorded');

    // Step 5: Generate voiceover
    let audioFile = null;
    if (!skipVoice) {
      spinner.start('Generating voiceover...');
      audioFile = await generateVoiceover(script, voice);
      spinner.succeed('Voiceover generated');
    }

    // Step 6: Compose final video
    spinner.start('Composing final video...');
    await mkdir(dirname(output), { recursive: true });
    await composeVideo(videoPath, audioFile, output);
    spinner.succeed(`Video saved to ${chalk.bold(output)}`);

    console.log(chalk.green('\n✅ Done!\n'));

    return { output, script, analysis };

  } catch (error) {
    spinner.fail(error.message);
    throw error;
  }
}
