/**
 * Authentication Middleware & Utilities
 * Supports: JWT, API Keys, OAuth (Google, GitHub)
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Session, ApiKey, PlanLimits, UsageLog } from '../db/index.js';

// Environment config
const JWT_SECRET = process.env.JWT_SECRET || 'look-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

/**
 * Hash a password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Generate a session token
 */
export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate an API key
 */
export function generateApiKey() {
  const key = `lk_live_${randomBytes(24).toString('hex')}`;
  const prefix = key.substring(0, 12);
  const hash = hashToken(key);
  return { key, prefix, hash };
}

/**
 * Authentication middleware - extracts user from request
 */
export function authMiddleware(options = {}) {
  const { required = true, allowApiKey = true } = options;
  
  return async (req, res, next) => {
    req.user = null;
    req.authMethod = null;
    
    try {
      // Try Bearer token (JWT)
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Check if it's an API key
        if (allowApiKey && token.startsWith('lk_')) {
          const keyHash = hashToken(token);
          const result = ApiKey.findByHash(keyHash);
          
          if (result) {
            ApiKey.recordUsage(result.id);
            req.user = User.findById(result.user_id);
            req.authMethod = 'api_key';
            req.apiKey = result;
            return next();
          }
        }
        
        // Try as JWT
        const payload = verifyToken(token);
        if (payload) {
          req.user = User.findById(payload.userId);
          req.authMethod = 'jwt';
          return next();
        }
      }
      
      // Try session cookie
      const sessionToken = req.cookies?.session;
      if (sessionToken) {
        const tokenHash = hashToken(sessionToken);
        const session = Session.findByToken(tokenHash);
        
        if (session) {
          req.user = session;
          req.authMethod = 'session';
          return next();
        }
      }
      
      // Try X-API-Key header
      if (allowApiKey) {
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
          const keyHash = hashToken(apiKey);
          const result = ApiKey.findByHash(keyHash);
          
          if (result) {
            ApiKey.recordUsage(result.id);
            req.user = User.findById(result.user_id);
            req.authMethod = 'api_key';
            req.apiKey = result;
            return next();
          }
        }
      }
      
      // No valid auth found
      if (required) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      if (required) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
      next();
    }
  };
}

/**
 * Plan requirement middleware
 */
export function requirePlan(...plans) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userPlan = req.user.plan || 'free';
    
    if (!plans.includes(userPlan)) {
      return res.status(403).json({ 
        error: `This feature requires ${plans.join(' or ')} plan`,
        code: 'PLAN_REQUIRED',
        requiredPlans: plans,
        currentPlan: userPlan
      });
    }
    
    next();
  };
}

/**
 * Feature requirement middleware
 */
export function requireFeature(feature) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!PlanLimits.hasFeature(req.user, feature)) {
      const limits = PlanLimits.get(req.user.plan || 'free');
      return res.status(403).json({ 
        error: `This feature (${feature}) is not available on your plan`,
        code: 'FEATURE_UNAVAILABLE',
        feature,
        currentPlan: req.user.plan || 'free',
        upgradeUrl: '/pricing'
      });
    }
    
    next();
  };
}

/**
 * Usage limit middleware
 */
export function checkUsageLimit(type) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const check = PlanLimits.checkLimit(req.user, type);
    
    if (!check.allowed) {
      return res.status(429).json({ 
        error: check.reason,
        code: 'USAGE_LIMIT_EXCEEDED',
        type,
        limit: check.limit,
        used: check.used,
        remaining: 0,
        resetDate: new Date(new Date().setDate(1)).toISOString(), // First of next month
        upgradeUrl: '/pricing'
      });
    }
    
    // Attach usage info to request for downstream use
    req.usageLimit = check;
    next();
  };
}

/**
 * Rate limiting (in-memory, use Redis in production)
 */
const rateLimitStore = new Map();

export function rateLimit(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 60,             // requests per window
    keyGenerator = (req) => req.user?.id || req.ip,
    skipSuccessfulRequests = false
  } = options;
  
  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > windowMs * 2) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let data = rateLimitStore.get(key);
    
    if (!data || now - data.windowStart > windowMs) {
      data = { windowStart: now, count: 0 };
      rateLimitStore.set(key, data);
    }
    
    data.count++;
    
    // Set headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - data.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((data.windowStart + windowMs) / 1000));
    
    if (data.count > max) {
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Log usage action
 */
export function logUsage(action, data = {}) {
  return (req, res, next) => {
    // Log after response is sent
    res.on('finish', () => {
      if (req.user) {
        try {
          UsageLog.log({
            userId: req.user.id,
            teamId: req.user.team_id,
            action,
            resourceId: data.resourceId || req.params.id,
            tokensUsed: res.locals.tokensUsed || 0,
            charactersUsed: res.locals.charactersUsed || 0,
            storageBytes: res.locals.storageBytes || 0,
            durationMs: Date.now() - req.startTime,
            costUsd: res.locals.costUsd || 0,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (err) {
          console.error('Failed to log usage:', err);
        }
      }
    });
    
    req.startTime = Date.now();
    next();
  };
}

/**
 * CORS configuration for authenticated requests
 */
export function corsWithCredentials(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');
  
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  }
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateSessionToken,
  hashToken,
  generateApiKey,
  authMiddleware,
  requirePlan,
  requireFeature,
  checkUsageLimit,
  rateLimit,
  logUsage,
  corsWithCredentials
};
