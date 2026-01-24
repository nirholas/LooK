/**
 * Database connection and utilities
 * Uses better-sqlite3 for synchronous SQLite (fast, simple)
 * Can migrate to PostgreSQL with minimal changes
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;

/**
 * Initialize database connection
 */
export function initDatabase(dbPath = null) {
  if (db) return db;
  
  const defaultPath = process.env.DATABASE_PATH || join(__dirname, '../../data/look.db');
  const finalPath = dbPath || defaultPath;
  
  // Ensure directory exists
  const dir = dirname(finalPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  db = new Database(finalPath);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Run migrations
  runMigrations();
  
  return db;
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

/**
 * Run schema migrations
 */
function runMigrations() {
  const schemaPath = join(__dirname, 'schema.sql');
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix = '') {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * User model
 */
export const User = {
  create(data) {
    const id = generateId('usr');
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, google_id, github_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, data.email, data.passwordHash, data.name, data.googleId, data.githubId);
    return this.findById(id);
  },
  
  findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },
  
  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },
  
  findByGoogleId(googleId) {
    const stmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId);
  },
  
  findByGithubId(githubId) {
    const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
    return stmt.get(githubId);
  },
  
  findByApiKey(apiKey) {
    const stmt = db.prepare('SELECT * FROM users WHERE api_key = ?');
    return stmt.get(apiKey);
  },
  
  update(id, data) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      // Convert camelCase to snake_case
      const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${column} = ?`);
      values.push(value);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },
  
  updatePlan(id, plan, stripeCustomerId, periodEnd) {
    const stmt = db.prepare(`
      UPDATE users 
      SET plan = ?, stripe_customer_id = ?, plan_period_end = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(plan, stripeCustomerId, periodEnd, id);
    return this.findById(id);
  },
  
  incrementUsage(id, type, amount = 1) {
    const column = {
      renders: 'monthly_renders',
      apiCalls: 'monthly_api_calls',
      storage: 'monthly_storage_mb'
    }[type];
    
    if (!column) throw new Error(`Unknown usage type: ${type}`);
    
    const stmt = db.prepare(`UPDATE users SET ${column} = ${column} + ? WHERE id = ?`);
    stmt.run(amount, id);
  },
  
  resetMonthlyUsage(id) {
    const stmt = db.prepare(`
      UPDATE users 
      SET monthly_renders = 0, monthly_api_calls = 0, usage_reset_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
  },
  
  generateApiKey(id) {
    const apiKey = `lk_${randomUUID().replace(/-/g, '')}`;
    const stmt = db.prepare(`
      UPDATE users SET api_key = ?, api_key_created_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    stmt.run(apiKey, id);
    return apiKey;
  },
  
  delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(id);
  }
};

/**
 * Project model
 */
export const Project = {
  create(data) {
    const id = generateId('prj');
    const stmt = db.prepare(`
      INSERT INTO projects (id, user_id, team_id, name, description, url, settings_json, thumbnail_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, 
      data.userId, 
      data.teamId || null, 
      data.name, 
      data.description || null, 
      data.url || null, 
      JSON.stringify(data.settings || {}),
      data.thumbnailPath || null
    );
    return this.findById(id);
  },
  
  findById(id) {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(id);
    if (project && project.settings_json) {
      project.settings = JSON.parse(project.settings_json);
    }
    return project;
  },
  
  findByUser(userId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM projects 
      WHERE user_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset).map(p => ({
      ...p,
      settings: p.settings_json ? JSON.parse(p.settings_json) : {}
    }));
  },
  
  findByTeam(teamId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT * FROM projects 
      WHERE team_id = ? 
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(teamId, limit, offset).map(p => ({
      ...p,
      settings: p.settings_json ? JSON.parse(p.settings_json) : {}
    }));
  },
  
  update(id, data) {
    const updates = { ...data };
    if (updates.settings) {
      updates.settings_json = JSON.stringify(updates.settings);
      delete updates.settings;
    }
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${column} = ?`);
      values.push(value);
    }
    
    if (fields.length === 0) return this.findById(id);
    
    values.push(id);
    const stmt = db.prepare(`UPDATE projects SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  },
  
  delete(id) {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
  },
  
  countByUser(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?');
    return stmt.get(userId).count;
  }
};

/**
 * Render model
 */
export const Render = {
  create(data) {
    const id = generateId('rnd');
    const stmt = db.prepare(`
      INSERT INTO renders (id, project_id, user_id, preset, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    stmt.run(id, data.projectId, data.userId, data.preset || 'youtube');
    return this.findById(id);
  },
  
  findById(id) {
    const stmt = db.prepare('SELECT * FROM renders WHERE id = ?');
    return stmt.get(id);
  },
  
  findByProject(projectId) {
    const stmt = db.prepare('SELECT * FROM renders WHERE project_id = ? ORDER BY created_at DESC');
    return stmt.all(projectId);
  },
  
  findByUser(userId, limit = 50, offset = 0) {
    const stmt = db.prepare(`
      SELECT r.*, p.name as project_name 
      FROM renders r
      JOIN projects p ON r.project_id = p.id
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC 
      LIMIT ? OFFSET ?
    `);
    return stmt.all(userId, limit, offset);
  },
  
  updateProgress(id, progress, status = null) {
    if (status) {
      const stmt = db.prepare('UPDATE renders SET progress = ?, status = ? WHERE id = ?');
      stmt.run(progress, status, id);
    } else {
      const stmt = db.prepare('UPDATE renders SET progress = ? WHERE id = ?');
      stmt.run(progress, id);
    }
  },
  
  complete(id, data) {
    const stmt = db.prepare(`
      UPDATE renders SET
        status = 'completed',
        progress = 100,
        output_path = ?,
        output_size_mb = ?,
        duration_seconds = ?,
        resolution = ?,
        ai_tokens_used = ?,
        tts_characters = ?,
        render_time_seconds = ?,
        estimated_cost_usd = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      data.outputPath,
      data.outputSizeMb,
      data.durationSeconds,
      data.resolution,
      data.aiTokensUsed || 0,
      data.ttsCharacters || 0,
      data.renderTimeSeconds || 0,
      data.estimatedCostUsd || 0,
      id
    );
    return this.findById(id);
  },
  
  fail(id, errorMessage) {
    const stmt = db.prepare(`
      UPDATE renders SET status = 'failed', error_message = ? WHERE id = ?
    `);
    stmt.run(errorMessage, id);
  },
  
  countByUserThisMonth(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM renders 
      WHERE user_id = ? 
      AND created_at >= date('now', 'start of month')
    `);
    return stmt.get(userId).count;
  }
};

/**
 * Usage tracking
 */
export const UsageLog = {
  log(data) {
    const id = generateId('usg');
    const stmt = db.prepare(`
      INSERT INTO usage_logs (id, user_id, team_id, action, resource_id, tokens_used, characters_used, storage_bytes, duration_ms, cost_usd, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.userId,
      data.teamId || null,
      data.action,
      data.resourceId || null,
      data.tokensUsed || 0,
      data.charactersUsed || 0,
      data.storageBytes || 0,
      data.durationMs || 0,
      data.costUsd || 0,
      data.ipAddress || null,
      data.userAgent || null
    );
    return id;
  },
  
  getMonthlyUsage(userId) {
    const stmt = db.prepare(`
      SELECT 
        action,
        SUM(tokens_used) as total_tokens,
        SUM(characters_used) as total_characters,
        SUM(storage_bytes) as total_storage,
        SUM(cost_usd) as total_cost,
        COUNT(*) as count
      FROM usage_logs
      WHERE user_id = ?
      AND created_at >= date('now', 'start of month')
      GROUP BY action
    `);
    return stmt.all(userId);
  },
  
  getDailyUsage(userId, days = 30) {
    const stmt = db.prepare(`
      SELECT 
        date(created_at) as date,
        action,
        COUNT(*) as count,
        SUM(cost_usd) as cost
      FROM usage_logs
      WHERE user_id = ?
      AND created_at >= date('now', '-${days} days')
      GROUP BY date(created_at), action
      ORDER BY date DESC
    `);
    return stmt.all(userId);
  }
};

/**
 * Plan limits helper
 */
export const PlanLimits = {
  get(plan) {
    const stmt = db.prepare('SELECT * FROM plan_limits WHERE plan = ?');
    const limits = stmt.get(plan);
    if (limits && limits.features_json) {
      limits.features = JSON.parse(limits.features_json);
    }
    return limits;
  },
  
  getAll() {
    const stmt = db.prepare('SELECT * FROM plan_limits ORDER BY price_monthly_usd ASC');
    return stmt.all().map(l => ({
      ...l,
      features: l.features_json ? JSON.parse(l.features_json) : {}
    }));
  },
  
  checkLimit(user, type) {
    const limits = this.get(user.plan || 'free');
    if (!limits) return { allowed: false, reason: 'Unknown plan' };
    
    const limitMap = {
      renders: { limit: limits.renders_per_month, used: user.monthly_renders },
      apiCalls: { limit: limits.api_calls_per_month, used: user.monthly_api_calls },
      storage: { limit: limits.storage_mb, used: user.monthly_storage_mb }
    };
    
    const check = limitMap[type];
    if (!check) return { allowed: true };
    
    // -1 means unlimited
    if (check.limit === -1) return { allowed: true, unlimited: true };
    
    const allowed = check.used < check.limit;
    return {
      allowed,
      limit: check.limit,
      used: check.used,
      remaining: Math.max(0, check.limit - check.used),
      reason: allowed ? null : `Monthly ${type} limit reached (${check.limit})`
    };
  },
  
  hasFeature(user, feature) {
    const limits = this.get(user.plan || 'free');
    if (!limits || !limits.features) return false;
    return limits.features[feature] === true;
  }
};

/**
 * Session management
 */
export const Session = {
  create(userId, tokenHash, ipAddress, userAgent, expiresInHours = 24 * 7) {
    const id = generateId('ses');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, tokenHash, ipAddress, userAgent, expiresAt);
    return { id, expiresAt };
  },
  
  findByToken(tokenHash) {
    const stmt = db.prepare(`
      SELECT s.*, u.* FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now')
    `);
    return stmt.get(tokenHash);
  },
  
  delete(id) {
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
    stmt.run(id);
  },
  
  deleteByUser(userId) {
    const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  },
  
  cleanup() {
    const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
    return stmt.run().changes;
  }
};

/**
 * API Key management
 */
export const ApiKey = {
  create(userId, name, keyHash, keyPrefix, scopes = 'read,write') {
    const id = generateId('key');
    const stmt = db.prepare(`
      INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, name, keyHash, keyPrefix, scopes);
    return this.findById(id);
  },
  
  findById(id) {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE id = ?');
    return stmt.get(id);
  },
  
  findByHash(keyHash) {
    const stmt = db.prepare(`
      SELECT k.*, u.* FROM api_keys k
      JOIN users u ON k.user_id = u.id
      WHERE k.key_hash = ? AND k.is_active = 1
      AND (k.expires_at IS NULL OR k.expires_at > datetime('now'))
    `);
    return stmt.get(keyHash);
  },
  
  findByUser(userId) {
    const stmt = db.prepare('SELECT id, name, key_prefix, scopes, last_used_at, total_requests, created_at FROM api_keys WHERE user_id = ? AND is_active = 1');
    return stmt.all(userId);
  },
  
  recordUsage(id) {
    const stmt = db.prepare(`
      UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, total_requests = total_requests + 1 WHERE id = ?
    `);
    stmt.run(id);
  },
  
  revoke(id) {
    const stmt = db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?');
    stmt.run(id);
  }
};

export default {
  initDatabase,
  getDatabase,
  generateId,
  User,
  Project,
  Render,
  UsageLog,
  PlanLimits,
  Session,
  ApiKey
};
