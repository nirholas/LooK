import { cloneRepo, cleanupRepo } from './clone.js';
import { analyzeRepo } from './analyze.js';
import { generateScript } from './script.js';
import { recordTerminal } from './record.js';
import { generateVoiceover } from './voice.js';
import { composeVideo } from './compose.js';
import ora from 'ora';
import chalk from 'chalk';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export async function generateVideo(repoUrl, options) {
  const spinner = ora();
  let tempDir = null;

  try {
    // Step 1: Clone repository
    spinner.start('Cloning repository...');
    tempDir = await cloneRepo(repoUrl);
    spinner.succeed('Repository cloned');

    // Step 2: Analyze repository
    spinner.start('Analyzing repository...');
    const analysis = await analyzeRepo(tempDir);
    spinner.succeed(`Analyzed: ${chalk.bold(analysis.name)}`);
    
    console.log(chalk.dim(`  Description: ${analysis.description || 'N/A'}`));
    console.log(chalk.dim(`  Commands found: ${analysis.commands.length}`));

    // Step 3: Generate script
    spinner.start('Generating script with AI...');
    const script = await generateScript(analysis, options.duration);
    spinner.succeed('Script generated');

    if (options.dryRun) {
      console.log(chalk.yellow('\n📝 Generated Script:\n'));
      console.log(script);
      console.log(chalk.yellow('\n🎯 Commands to demo:\n'));
      analysis.commands.forEach((cmd, i) => {
        console.log(chalk.dim(`  ${i + 1}. ${cmd}`));
      });
      return;
    }

    // Step 4: Record terminal
    spinner.start('Recording terminal demo...');
    const terminalVideo = await recordTerminal(analysis, tempDir);
    spinner.succeed('Terminal recorded');

    // Step 5: Generate voiceover
    let audioFile = null;
    if (!options.skipVoice) {
      spinner.start('Generating voiceover...');
      audioFile = await generateVoiceover(script, options.voice);
      spinner.succeed('Voiceover generated');
    }

    // Step 6: Compose final video
    spinner.start('Composing final video...');
    await mkdir(dirname(options.output), { recursive: true });
    await composeVideo(terminalVideo, audioFile, options.output);
    spinner.succeed(`Video saved to ${chalk.bold(options.output)}`);

    console.log(chalk.green('\n✅ Done!\n'));

  } finally {
    // Cleanup
    if (tempDir) {
      await cleanupRepo(tempDir);
    }
  }
}
