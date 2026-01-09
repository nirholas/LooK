import simpleGit from 'simple-git';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export async function cloneRepo(repoUrl) {
  // Normalize GitHub URL
  const normalizedUrl = normalizeGitHubUrl(repoUrl);
  
  // Create temp directory
  const tempDir = await mkdtemp(join(tmpdir(), 'repovideo-'));
  
  // Clone repository
  const git = simpleGit();
  await git.clone(normalizedUrl, tempDir, ['--depth', '1']);
  
  return tempDir;
}

export async function cleanupRepo(tempDir) {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

function normalizeGitHubUrl(url) {
  // Handle various GitHub URL formats
  // https://github.com/user/repo
  // https://github.com/user/repo.git
  // git@github.com:user/repo.git
  // user/repo
  
  if (url.match(/^[\w-]+\/[\w-]+$/)) {
    return `https://github.com/${url}.git`;
  }
  
  if (!url.endsWith('.git')) {
    return `${url}.git`;
  }
  
  return url;
}
