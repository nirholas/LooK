/**
 * LooK Import Module
 * 
 * Handles importing projects from URLs (websites) and Git repositories.
 */

import simpleGit from 'simple-git';
import { mkdir, readFile, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Project } from './project.js';
import { analyzeWebsite, generateScript } from './ai.js';
import { createLogger } from './logger.js';

const log = createLogger('import');

/**
 * Detect import type from URL
 * @param {string} url - URL to analyze
 * @returns {'git' | 'website'}
 */
export function detectImportType(url) {
  const gitPatterns = [
    /github\.com/i,
    /gitlab\.com/i,
    /bitbucket\.org/i,
    /\.git$/i,
    /codeberg\.org/i,
    /sr\.ht/i
  ];
  
  for (const pattern of gitPatterns) {
    if (pattern.test(url)) {
      return 'git';
    }
  }
  
  return 'website';
}

/**
 * Validate URL format and safety
 * @param {string} url - URL to validate
 * @throws {Error} If URL is invalid or unsafe
 */
export function validateUrl(url) {
  // Allow SSH-style git URLs
  if (/^[\w-]+@[^:]+:.+/.test(url)) {
    return true;
  }
  
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }
  
  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported');
  }
  
  // Block localhost and private IPs in production
  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
  
  if (process.env.NODE_ENV === 'production' && blockedHosts.includes(hostname)) {
    throw new Error('Cannot import from local URLs in production');
  }
  
  return true;
}

/**
 * Process import asynchronously
 * @param {string} projectId - Project ID
 * @param {string} url - URL to import
 * @param {'git' | 'website'} type - Import type
 * @param {Object} options - Import options
 * @param {Function} broadcast - Broadcast function for progress updates
 */
export async function processImport(projectId, url, type, options = {}, broadcast = () => {}) {
  const project = await Project.load(projectId);
  
  try {
    project.importStatus = 'processing';
    project.importProgress = 0;
    await project.save();
    
    if (type === 'git') {
      await processGitImport(project, url, options, broadcast);
    } else {
      await processWebsiteImport(project, url, options, broadcast);
    }
    
    project.importStatus = 'complete';
    project.importProgress = 100;
    await project.save();
    
    broadcast('import-complete', { projectId, status: 'complete' });
    
  } catch (error) {
    project.importStatus = 'error';
    project.importError = error.message;
    await project.save();
    
    broadcast('import-error', { projectId, error: error.message });
    throw error;
  }
}

/**
 * Process Git repository import
 */
async function processGitImport(project, url, options, broadcast) {
  const { shallow = true, branch, analyzeReadme = true } = options;
  
  const tempDir = join(tmpdir(), `look-git-${project.id}`);
  await mkdir(tempDir, { recursive: true });
  
  try {
    broadcast('import-progress', { projectId: project.id, progress: 10, stage: 'cloning' });
    
    const git = simpleGit();
    const cloneOptions = shallow ? ['--depth', '1'] : [];
    if (branch) {
      cloneOptions.push('--branch', branch);
    }
    
    await git.clone(url, tempDir, cloneOptions);
    
    project.importProgress = 30;
    await project.save();
    
    broadcast('import-progress', { projectId: project.id, progress: 30, stage: 'analyzing' });
    
    // Find README
    let readmeContent = '';
    const readmeFiles = ['README.md', 'readme.md', 'README.MD', 'README', 'Readme.md'];
    
    for (const file of readmeFiles) {
      try {
        readmeContent = await readFile(join(tempDir, file), 'utf-8');
        break;
      } catch {
        // Continue to next option
      }
    }
    
    // Find package.json
    let packageInfo = null;
    try {
      const pkg = await readFile(join(tempDir, 'package.json'), 'utf-8');
      packageInfo = JSON.parse(pkg);
    } catch {
      // No package.json
    }
    
    // Analyze structure
    const structure = await analyzeProjectStructure(tempDir);
    
    project.importProgress = 50;
    await project.save();
    
    broadcast('import-progress', { projectId: project.id, progress: 50, stage: 'generating' });
    
    // Build analysis
    project.analysis = {
      name: packageInfo?.name || extractRepoName(url),
      description: packageInfo?.description || extractDescriptionFromReadme(readmeContent),
      readme: readmeContent.substring(0, 5000),
      structure,
      homepage: packageInfo?.homepage,
      keywords: packageInfo?.keywords || [],
      type: 'repository',
      importType: 'git'
    };
    
    // If homepage exists, capture screenshot
    if (packageInfo?.homepage) {
      try {
        broadcast('import-progress', { projectId: project.id, progress: 60, stage: 'capturing' });
        const screenshot = await captureHomepage(packageInfo.homepage);
        project.analysis.screenshot = screenshot;
        project.url = packageInfo.homepage;
      } catch (e) {
        log.warn('Could not capture homepage', { error: e.message });
        project.url = url;
      }
    } else {
      project.url = url;
    }
    
    project.importProgress = 80;
    await project.save();
    
    // Generate script from README
    if (readmeContent && analyzeReadme) {
      broadcast('import-progress', { projectId: project.id, progress: 80, stage: 'scripting' });
      project.script = generateScriptFromReadme(readmeContent, project.analysis);
    }
    
    project.importProgress = 100;
    await project.save();
    
  } finally {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Process website import
 */
async function processWebsiteImport(project, url, options, broadcast) {
  broadcast('import-progress', { projectId: project.id, progress: 10, stage: 'loading' });
  
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });
  
  try {
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    project.importProgress = 30;
    project.url = url;
    await project.save();
    broadcast('import-progress', { projectId: project.id, progress: 30, stage: 'capturing' });
    
    const screenshot = await page.screenshot({ encoding: 'base64' });
    
    const metadata = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
      favicon: document.querySelector('link[rel="icon"]')?.href || ''
    }));
    
    project.importProgress = 50;
    await project.save();
    broadcast('import-progress', { projectId: project.id, progress: 50, stage: 'analyzing' });
    
    const analysis = await analyzeWebsite(screenshot, { ...metadata, url });
    project.analysis = {
      ...analysis,
      importType: 'website',
      screenshot
    };
    
    project.importProgress = 75;
    await project.save();
    broadcast('import-progress', { projectId: project.id, progress: 75, stage: 'scripting' });
    
    const script = await generateScript(analysis, {
      duration: options.duration || 25,
      style: options.style || 'professional'
    });
    project.script = script;
    
  } finally {
    await browser.close();
  }
}

/**
 * Analyze project directory structure
 */
async function analyzeProjectStructure(dir) {
  const structure = { 
    directories: [], 
    files: [], 
    techStack: [],
    hasTests: false,
    hasCI: false,
    hasDocs: false
  };
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      if (entry.name === 'node_modules') continue;
      if (entry.name === 'vendor') continue;
      
      if (entry.isDirectory()) {
        structure.directories.push(entry.name);
        
        if (['tests', 'test', '__tests__', 'spec'].includes(entry.name.toLowerCase())) {
          structure.hasTests = true;
        }
        if (entry.name === '.github') {
          structure.hasCI = true;
        }
        if (['docs', 'documentation'].includes(entry.name.toLowerCase())) {
          structure.hasDocs = true;
        }
      } else if (entry.isFile()) {
        structure.files.push(entry.name);
        detectTechStack(entry.name, structure);
      }
    }
  } catch {
    // Directory read failed
  }
  
  return structure;
}

/**
 * Detect technology stack from filename
 */
function detectTechStack(filename, structure) {
  const techMap = {
    'package.json': 'Node.js',
    'requirements.txt': 'Python',
    'Cargo.toml': 'Rust',
    'go.mod': 'Go',
    'pom.xml': 'Java/Maven',
    'Gemfile': 'Ruby',
    'composer.json': 'PHP',
    'Dockerfile': 'Docker',
    'tsconfig.json': 'TypeScript',
    'vite.config.js': 'Vite',
    'next.config.js': 'Next.js',
    'tailwind.config.js': 'Tailwind CSS'
  };
  
  if (techMap[filename] && !structure.techStack.includes(techMap[filename])) {
    structure.techStack.push(techMap[filename]);
  }
}

function extractRepoName(url) {
  const match = url.match(/\/([^\/]+?)(\.git)?$/);
  return match ? match[1] : 'Unknown Project';
}

function extractDescriptionFromReadme(readme) {
  if (!readme) return '';
  
  const lines = readme.split('\n');
  let foundTitle = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('![') || trimmed.startsWith('[![')) continue;
    if (trimmed.startsWith('#')) { foundTitle = true; continue; }
    if (foundTitle && trimmed) return trimmed.substring(0, 200);
  }
  
  return '';
}

async function captureHomepage(url) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });
  
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    return await page.screenshot({ encoding: 'base64' });
  } finally {
    await browser.close();
  }
}

function generateScriptFromReadme(readme, analysis) {
  const name = analysis.name || 'this project';
  const description = analysis.description || '';
  
  let script = `Welcome to ${name}. `;
  if (description) script += `${description}. `;
  
  if (analysis.structure?.techStack?.length > 0) {
    script += `Built with ${analysis.structure.techStack.slice(0, 3).join(', ')}. `;
  }
  
  script += `Check out the documentation for more details.`;
  return script;
}

export default { detectImportType, validateUrl, processImport };