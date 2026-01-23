#!/usr/bin/env node

/**
 * LooK Mobile Docker Helper
 * 
 * Manages the Docker-based Android emulator and Appium server
 * for mobile app recording without complex local setup.
 * 
 * Commands:
 *   look mobile-start   - Start the Docker container
 *   look mobile-stop    - Stop the container
 *   look mobile-status  - Check if ready for recording
 *   look mobile-logs    - View container logs
 *   look mobile-install - Install APK to emulator
 */

import { spawn, execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCKER_DIR = join(__dirname, '..', 'docker');
const CONTAINER_NAME = 'look-appium-android';
const APPIUM_PORT = 4723;

/**
 * Check if Docker is available
 */
function checkDocker() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker Compose is available
 */
function checkDockerCompose() {
  try {
    // Try docker compose (v2) first
    execSync('docker compose version', { stdio: 'pipe' });
    return 'docker compose';
  } catch {
    try {
      // Fall back to docker-compose (v1)
      execSync('docker-compose --version', { stdio: 'pipe' });
      return 'docker-compose';
    } catch {
      return null;
    }
  }
}

/**
 * Check if the container is running
 */
function isContainerRunning() {
  try {
    const result = execSync(
      `docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Status}}"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    return result.includes('Up');
  } catch {
    return false;
  }
}

/**
 * Check if Appium is ready to accept connections
 */
async function isAppiumReady() {
  try {
    const response = await fetch(`http://localhost:${APPIUM_PORT}/status`);
    const data = await response.json();
    return data?.value?.ready === true;
  } catch {
    return false;
  }
}

/**
 * Get container health status
 */
function getContainerHealth() {
  try {
    const result = execSync(
      `docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    return result;
  } catch {
    return 'unknown';
  }
}

/**
 * Start the mobile Docker environment
 */
export async function startMobileDocker(options = {}) {
  console.log(chalk.cyan('\n📱 LooK Mobile Docker Setup\n'));

  // Check prerequisites
  if (!checkDocker()) {
    console.error(chalk.red('❌ Docker is not installed or not running.'));
    console.log(chalk.dim('   Install Docker: https://docs.docker.com/get-docker/'));
    process.exit(1);
  }

  const composeCommand = checkDockerCompose();
  if (!composeCommand) {
    console.error(chalk.red('❌ Docker Compose is not installed.'));
    console.log(chalk.dim('   It should come with Docker Desktop.'));
    process.exit(1);
  }

  // Check if already running
  if (isContainerRunning()) {
    console.log(chalk.yellow('⚠️  Container is already running.'));
    const ready = await isAppiumReady();
    if (ready) {
      console.log(chalk.green('✅ Appium is ready at http://localhost:4723'));
    } else {
      console.log(chalk.dim('   Appium is still starting up. Check with: look mobile-status'));
    }
    return;
  }

  // Create APKs directory if needed
  const apksDir = join(DOCKER_DIR, 'apks');
  if (!existsSync(apksDir)) {
    mkdirSync(apksDir, { recursive: true });
  }

  // Start with docker compose
  console.log(chalk.dim('Starting Docker container...\n'));
  
  const spinner = ora('Building and starting container (this may take a few minutes on first run)...').start();
  
  try {
    const args = composeCommand === 'docker compose' 
      ? ['compose', '-f', join(DOCKER_DIR, 'docker-compose.yml'), 'up', '-d', '--build']
      : ['-f', join(DOCKER_DIR, 'docker-compose.yml'), 'up', '-d', '--build'];
    
    const cmd = composeCommand === 'docker compose' ? 'docker' : 'docker-compose';
    
    execSync(`${cmd} ${args.join(' ')}`, { 
      cwd: DOCKER_DIR,
      stdio: 'pipe'
    });
    
    spinner.succeed('Container started');
  } catch (error) {
    spinner.fail('Failed to start container');
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }

  // Wait for Appium to be ready
  console.log('');
  const readySpinner = ora('Waiting for Android emulator and Appium to be ready...').start();
  
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
    
    const ready = await isAppiumReady();
    if (ready) {
      readySpinner.succeed('Appium is ready!');
      console.log(chalk.green(`\n✅ Mobile recording environment ready!`));
      console.log(chalk.dim(`   Appium server: http://localhost:${APPIUM_PORT}`));
      console.log(chalk.dim(`   Container: ${CONTAINER_NAME}`));
      console.log(chalk.cyan(`\n   Start recording with: look mobile ./your-app.apk\n`));
      return;
    }
    
    readySpinner.text = `Waiting for Appium... (${attempts * 5}s)`;
  }
  
  readySpinner.warn('Appium is taking longer than expected');
  console.log(chalk.yellow('\n⚠️  Container started but Appium may still be initializing.'));
  console.log(chalk.dim('   Check status with: look mobile-status'));
  console.log(chalk.dim('   View logs with: look mobile-logs'));
}

/**
 * Stop the mobile Docker environment
 */
export function stopMobileDocker() {
  console.log(chalk.cyan('\n📱 Stopping Mobile Docker...\n'));

  if (!isContainerRunning()) {
    console.log(chalk.dim('Container is not running.'));
    return;
  }

  const composeCommand = checkDockerCompose();
  if (!composeCommand) {
    // Fallback to direct docker stop
    execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'inherit' });
    execSync(`docker rm ${CONTAINER_NAME}`, { stdio: 'inherit' });
  } else {
    const cmd = composeCommand === 'docker compose' ? 'docker' : 'docker-compose';
    const args = composeCommand === 'docker compose'
      ? ['compose', '-f', join(DOCKER_DIR, 'docker-compose.yml'), 'down']
      : ['-f', join(DOCKER_DIR, 'docker-compose.yml'), 'down'];
    
    execSync(`${cmd} ${args.join(' ')}`, { 
      cwd: DOCKER_DIR,
      stdio: 'inherit' 
    });
  }

  console.log(chalk.green('\n✅ Mobile Docker stopped.\n'));
}

/**
 * Check the status of the mobile Docker environment
 */
export async function getMobileDockerStatus() {
  console.log(chalk.cyan('\n📱 Mobile Docker Status\n'));

  // Docker check
  const dockerOk = checkDocker();
  console.log(`Docker:          ${dockerOk ? chalk.green('✓ Available') : chalk.red('✗ Not found')}`);

  // Docker Compose check
  const composeCmd = checkDockerCompose();
  console.log(`Docker Compose:  ${composeCmd ? chalk.green(`✓ ${composeCmd}`) : chalk.red('✗ Not found')}`);

  // Container status
  const running = isContainerRunning();
  console.log(`Container:       ${running ? chalk.green('✓ Running') : chalk.dim('○ Not running')}`);

  if (running) {
    // Health status
    const health = getContainerHealth();
    const healthColor = health === 'healthy' ? chalk.green : 
                       health === 'starting' ? chalk.yellow : chalk.red;
    console.log(`Health:          ${healthColor(health)}`);

    // Appium status
    const appiumReady = await isAppiumReady();
    console.log(`Appium Server:   ${appiumReady ? chalk.green('✓ Ready') : chalk.yellow('○ Starting...')}`);

    if (appiumReady) {
      console.log(`\n${chalk.green('✅ Ready for mobile recording!')}`);
      console.log(chalk.dim(`   Appium URL: http://localhost:${APPIUM_PORT}`));
      console.log(chalk.cyan(`\n   Start recording with: look mobile ./your-app.apk\n`));
    } else {
      console.log(chalk.yellow('\n⏳ Appium is still starting up...'));
      console.log(chalk.dim('   View logs: look mobile-logs'));
    }
  } else {
    console.log(chalk.dim('\n   Start with: look mobile-start'));
  }

  console.log('');
}

/**
 * Show container logs
 */
export function showMobileDockerLogs(follow = false) {
  if (!isContainerRunning()) {
    console.log(chalk.yellow('Container is not running.'));
    console.log(chalk.dim('Start with: look mobile-start'));
    return;
  }

  const args = ['logs'];
  if (follow) {
    args.push('-f');
  }
  args.push(CONTAINER_NAME);

  spawn('docker', args, { stdio: 'inherit' });
}

/**
 * Install an APK to the emulator
 */
export async function installApk(apkPath) {
  console.log(chalk.cyan('\n📦 Installing APK...\n'));

  if (!existsSync(apkPath)) {
    console.error(chalk.red(`File not found: ${apkPath}`));
    process.exit(1);
  }

  if (!isContainerRunning()) {
    console.error(chalk.red('Container is not running.'));
    console.log(chalk.dim('Start with: look mobile-start'));
    process.exit(1);
  }

  const ready = await isAppiumReady();
  if (!ready) {
    console.error(chalk.red('Appium is not ready yet.'));
    console.log(chalk.dim('Check status: look mobile-status'));
    process.exit(1);
  }

  // Copy APK to container and install
  const apkName = basename(apkPath);
  
  try {
    // Copy to container
    execSync(`docker cp "${apkPath}" ${CONTAINER_NAME}:/apks/${apkName}`, { stdio: 'pipe' });
    
    // Install via adb
    const result = execSync(
      `docker exec ${CONTAINER_NAME} adb install -r /apks/${apkName}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    if (result.includes('Success')) {
      console.log(chalk.green(`✅ APK installed: ${apkName}`));
    } else {
      console.log(chalk.yellow('Installation output:'), result);
    }
  } catch (error) {
    console.error(chalk.red('Failed to install APK:'), error.message);
    process.exit(1);
  }
}

// CLI handling if run directly
const args = process.argv.slice(2);
const command = args[0];

if (command === 'start') {
  await startMobileDocker();
} else if (command === 'stop') {
  stopMobileDocker();
} else if (command === 'status') {
  await getMobileDockerStatus();
} else if (command === 'logs') {
  showMobileDockerLogs(args.includes('-f') || args.includes('--follow'));
} else if (command === 'install' && args[1]) {
  await installApk(args[1]);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  // Show help if run directly without arguments
  console.log(chalk.cyan('\n📱 LooK Mobile Docker Helper\n'));
  console.log('Commands:');
  console.log('  start             Start Android emulator + Appium');
  console.log('  stop              Stop the container');
  console.log('  status            Check if ready for recording');
  console.log('  logs [-f]         View container logs');
  console.log('  install <apk>     Install APK to emulator');
  console.log('');
}
