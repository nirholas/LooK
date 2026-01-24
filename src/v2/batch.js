import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { parse as parseYAML } from 'yaml';
import chalk from 'chalk';
import { generateDemoV2 } from './index.js';

/**
 * @typedef {Object} BatchJob
 * @property {string} url - URL to record
 * @property {string} [name] - Custom output name
 * @property {Object} [options] - Per-job options
 */

/**
 * @typedef {Object} BatchConfig
 * @property {BatchJob[]} jobs - List of jobs to process
 * @property {Object} [defaults] - Default options for all jobs
 * @property {string} [outputDir] - Output directory
 */

export class BatchProcessor {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 2;
    this.outputDir = options.outputDir || './batch-output';
    this.resume = options.resume || false;
    this.dryRun = options.dryRun || false;
    this.reportPath = options.reportPath;
    
    this.config = null;
    this.results = [];
    this.startTime = null;
  }
  
  /**
   * Load batch configuration from YAML or JSON file
   */
  async loadConfig(configPath) {
    const content = await readFile(configPath, 'utf-8');
    
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      this.config = parseYAML(content);
    } else {
      this.config = JSON.parse(content);
    }
    
    // Validate config
    if (!this.config.jobs || !Array.isArray(this.config.jobs)) {
      throw new Error('Config must contain a "jobs" array');
    }
    
    console.log(chalk.dim(`  Loaded ${this.config.jobs.length} jobs from ${configPath}`));
    
    // Check for resume state
    if (this.resume) {
      await this.loadResumeState();
    }
  }
  
  /**
   * Load resume state from previous run
   */
  async loadResumeState() {
    try {
      const statePath = join(this.outputDir, '.batch-state.json');
      const state = JSON.parse(await readFile(statePath, 'utf-8'));
      
      // Filter out completed jobs
      const completedUrls = new Set(state.completed.map(j => j.url));
      this.config.jobs = this.config.jobs.filter(j => !completedUrls.has(j.url));
      
      console.log(chalk.yellow(`  Resuming: ${this.config.jobs.length} remaining jobs`));
    } catch {
      // No state file, start fresh
    }
  }
  
  /**
   * Save current state for resume
   */
  async saveState() {
    const statePath = join(this.outputDir, '.batch-state.json');
    await writeFile(statePath, JSON.stringify({
      completed: this.results.filter(r => r.status === 'success'),
      failed: this.results.filter(r => r.status === 'error'),
      timestamp: new Date().toISOString()
    }, null, 2));
  }
  
  /**
   * Run batch processing
   */
  async run() {
    this.startTime = Date.now();
    await mkdir(this.outputDir, { recursive: true });
    
    const jobs = this.config.jobs;
    const defaults = this.config.defaults || {};
    
    console.log(chalk.white(`\n  Processing ${jobs.length} jobs (concurrency: ${this.concurrency})\n`));
    
    if (this.dryRun) {
      console.log(chalk.yellow('  DRY RUN - No videos will be generated\n'));
      for (const job of jobs) {
        console.log(chalk.dim(`  • ${job.url} → ${this.getOutputPath(job)}`));
      }
      return;
    }
    
    // Process in batches
    const chunks = this.chunkArray(jobs, this.concurrency);
    let processed = 0;
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (job) => {
        const result = await this.processJob(job, defaults);
        processed++;
        this.printProgress(processed, jobs.length, result);
        return result;
      });
      
      const chunkResults = await Promise.all(promises);
      this.results.push(...chunkResults);
      
      // Save state after each chunk
      await this.saveState();
    }
    
    // Generate report
    await this.generateReport();
    
    // Print summary
    this.printSummary();
  }
  
  /**
   * Process a single job
   */
  async processJob(job, defaults) {
    const startTime = Date.now();
    const outputPath = this.getOutputPath(job);
    
    try {
      const options = {
        ...defaults,
        ...job.options,
        output: outputPath
      };
      
      await generateDemoV2(job.url, options);
      
      return {
        url: job.url,
        output: outputPath,
        status: 'success',
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        url: job.url,
        output: outputPath,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * Get output path for a job
   */
  getOutputPath(job) {
    const name = job.name || this.urlToFilename(job.url);
    return join(this.outputDir, `${name}.mp4`);
  }
  
  /**
   * Convert URL to safe filename
   */
  urlToFilename(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/[^a-z0-9]/gi, '-');
    } catch {
      return 'demo';
    }
  }
  
  /**
   * Print progress line
   */
  printProgress(current, total, result) {
    const percent = Math.round((current / total) * 100);
    const icon = result.status === 'success' ? chalk.green('✓') : chalk.red('✗');
    const duration = (result.duration / 1000).toFixed(1);
    
    console.log(
      `  ${icon} [${current}/${total}] ${result.url}`,
      chalk.dim(`(${duration}s)`)
    );
  }
  
  /**
   * Generate batch report
   */
  async generateReport() {
    const report = {
      summary: {
        total: this.results.length,
        success: this.results.filter(r => r.status === 'success').length,
        failed: this.results.filter(r => r.status === 'error').length,
        duration: Date.now() - this.startTime
      },
      jobs: this.results,
      timestamp: new Date().toISOString()
    };
    
    const reportPath = this.reportPath || join(this.outputDir, 'batch-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.dim(`\n  Report saved to ${reportPath}`));
  }
  
  /**
   * Print final summary
   */
  printSummary() {
    const success = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'error').length;
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log(chalk.white('\n  ═══════════════════════════════════'));
    console.log(chalk.white('  BATCH COMPLETE'));
    console.log(chalk.white('  ═══════════════════════════════════'));
    console.log(`  ${chalk.green('✓')} Success: ${success}`);
    if (failed > 0) {
      console.log(`  ${chalk.red('✗')} Failed:  ${failed}`);
    }
    console.log(chalk.dim(`  Duration: ${duration}s`));
    console.log(chalk.dim(`  Output:   ${this.outputDir}`));
    console.log();
  }
  
  /**
   * Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
