import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';

export async function analyzeRepo(repoPath) {
  const analysis = {
    name: '',
    description: '',
    installCommand: '',
    commands: [],
    features: [],
    techStack: []
  };

  // Try to read package.json
  try {
    const packageJson = JSON.parse(
      await readFile(join(repoPath, 'package.json'), 'utf-8')
    );
    analysis.name = packageJson.name || '';
    analysis.description = packageJson.description || '';
    analysis.installCommand = 'npm install';
    
    // Extract run commands
    if (packageJson.scripts) {
      if (packageJson.scripts.dev) {
        analysis.commands.push('npm run dev');
      }
      if (packageJson.scripts.start) {
        analysis.commands.push('npm start');
      }
      if (packageJson.scripts.build) {
        analysis.commands.push('npm run build');
      }
    }

    // Detect tech stack
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.next) analysis.techStack.push('Next.js');
    if (deps.react) analysis.techStack.push('React');
    if (deps.express) analysis.techStack.push('Express');
    if (deps.typescript) analysis.techStack.push('TypeScript');
    
  } catch (error) {
    // No package.json, try other project types
  }

  // Try to read README
  try {
    const readmePath = await findReadme(repoPath);
    if (readmePath) {
      const readme = await readFile(readmePath, 'utf-8');
      const extracted = extractFromReadme(readme);
      
      // Merge with existing data
      if (!analysis.name && extracted.name) {
        analysis.name = extracted.name;
      }
      if (!analysis.description && extracted.description) {
        analysis.description = extracted.description;
      }
      analysis.commands.push(...extracted.commands);
      analysis.features = extracted.features;
    }
  } catch (error) {
    // No README
  }

  // Dedupe commands
  analysis.commands = [...new Set(analysis.commands)];

  // Ensure we have at least some commands
  if (analysis.commands.length === 0) {
    analysis.commands = ['npm install', 'npm start'];
  }

  return analysis;
}

async function findReadme(repoPath) {
  const possibleNames = ['README.md', 'readme.md', 'Readme.md', 'README.MD'];
  
  for (const name of possibleNames) {
    try {
      await readFile(join(repoPath, name));
      return join(repoPath, name);
    } catch {
      continue;
    }
  }
  
  return null;
}

function extractFromReadme(readme) {
  const result = {
    name: '',
    description: '',
    commands: [],
    features: []
  };

  // Extract title (first # heading)
  const titleMatch = readme.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.name = titleMatch[1].replace(/[^\w\s-]/g, '').trim();
  }

  // Extract description (first paragraph after title)
  const descMatch = readme.match(/^#\s+.+\n+([^#\n].+)/m);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // Extract code blocks with bash/sh commands
  const codeBlockRegex = /```(?:bash|sh|shell|console)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(readme)) !== null) {
    const code = match[1].trim();
    const lines = code.split('\n');
    
    for (const line of lines) {
      const cleanLine = line.replace(/^\$\s*/, '').trim();
      if (cleanLine && !cleanLine.startsWith('#') && isValidCommand(cleanLine)) {
        result.commands.push(cleanLine);
      }
    }
  }

  // Extract features (bullet points under Features/Usage sections)
  const featuresMatch = readme.match(/##\s*(?:Features|What|Why)[\s\S]*?((?:[-*]\s+.+\n?)+)/i);
  if (featuresMatch) {
    const bullets = featuresMatch[1].match(/[-*]\s+(.+)/g);
    if (bullets) {
      result.features = bullets.map(b => b.replace(/^[-*]\s+/, '').trim()).slice(0, 5);
    }
  }

  return result;
}

function isValidCommand(cmd) {
  const validStarters = [
    'npm', 'npx', 'yarn', 'pnpm', 'node', 'curl', 'git',
    'pip', 'python', 'cargo', 'go', 'docker', 'make'
  ];
  
  return validStarters.some(starter => cmd.startsWith(starter));
}
