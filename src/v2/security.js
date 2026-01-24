/**
 * Security Middleware for LooK Server
 * 
 * Provides HTTP security headers, CORS configuration, and rate limiting.
 */

import { createLogger } from './logger.js';

const log = createLogger('security');

/**
 * HTTP Security Headers Middleware
 * Implements common security headers similar to helmet
 */
export function securityHeaders() {
  return (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection (legacy, but still useful)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy (restrict browser features)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy (allow self and common CDNs)
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for some UI frameworks
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https://api.openai.com https://api.anthropic.com https://api.groq.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-ancestors 'self'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);
    
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    next();
  };
}

/**
 * CORS Middleware
 * Configurable Cross-Origin Resource Sharing
 * @param {Object} options - CORS options
 * @param {string|string[]} options.origin - Allowed origins (default: same origin)
 * @param {string[]} options.methods - Allowed methods
 * @param {string[]} options.allowedHeaders - Allowed headers
 * @param {boolean} options.credentials - Allow credentials
 */
export function cors(options = {}) {
  const {
    origin = process.env.CORS_ORIGIN || '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-OpenAI-Key',
      'X-Groq-Key'
    ],
    credentials = true,
    maxAge = 86400 // 24 hours
  } = options;
  
  return (req, res, next) => {
    const requestOrigin = req.headers.origin;
    
    // Handle origin
    if (origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (Array.isArray(origin)) {
      if (origin.includes(requestOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
        res.setHeader('Vary', 'Origin');
      }
    } else if (typeof origin === 'string') {
      if (origin === requestOrigin || origin === '*') {
        res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
        res.setHeader('Vary', 'Origin');
      }
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    res.setHeader('Access-Control-Max-Age', String(maxAge));
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    
    next();
  };
}

/**
 * Rate Limiter Middleware
 * In-memory rate limiting (use Redis in production for distributed systems)
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message when rate limited
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 */
export function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    skip = () => false,
    onLimitReached = null
  } = options;
  
  const store = new Map();
  
  // Cleanup old entries periodically
  const cleanup = () => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now - data.resetTime > windowMs) {
        store.delete(key);
      }
    }
  };
  
  setInterval(cleanup, windowMs);
  
  return (req, res, next) => {
    // Skip if configured
    if (skip(req)) {
      return next();
    }
    
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = store.get(key);
    
    if (!record || now - record.resetTime > windowMs) {
      // New window
      record = {
        count: 1,
        resetTime: now
      };
      store.set(key, record);
    } else {
      record.count++;
    }
    
    // Set rate limit headers
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime + windowMs - now) / 1000);
    
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));
    
    if (record.count > max) {
      log.warn('Rate limit exceeded', { key, count: record.count, max });
      
      if (onLimitReached) {
        onLimitReached(req, res);
      }
      
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({ error: message });
    }
    
    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export function strictRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many requests to this endpoint, please slow down.'
  });
}

/**
 * API rate limiter (more generous)
 */
export function apiRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    message: 'API rate limit exceeded. Please try again later.'
  });
}

/**
 * Check if IP address is private/internal
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private
 */
export function isPrivateIP(ip) {
  if (!ip) return false;
  
  // IPv4 private ranges
  const privateRanges = [
    /^127\./,                    // Loopback
    /^10\./,                     // Class A private
    /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
    /^192\.168\./,               // Class C private
    /^169\.254\./,               // Link-local
    /^0\./,                      // Current network
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT
  ];
  
  // Check localhost
  if (ip === 'localhost' || ip === '::1' || ip === '0.0.0.0') {
    return true;
  }
  
  // Check private IPv4 ranges
  for (const range of privateRanges) {
    if (range.test(ip)) {
      return true;
    }
  }
  
  // Check IPv6 private ranges
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
    return true;
  }
  
  return false;
}

/**
 * SSRF Protection Middleware
 * Blocks requests to private/internal IP addresses
 */
export function ssrfProtection() {
  return (req, res, next) => {
    // Only check in production or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_SSRF_PROTECTION) {
      return next();
    }
    
    // Check URL parameters that might contain URLs
    const urlParams = ['url', 'target', 'redirect', 'callback', 'return_url'];
    
    for (const param of urlParams) {
      const value = req.query[param] || req.body?.[param];
      if (value) {
        try {
          const parsed = new URL(value);
          if (isPrivateIP(parsed.hostname)) {
            log.warn('SSRF attempt blocked', { param, url: value, ip: req.ip });
            return res.status(403).json({ error: 'Access to internal resources is forbidden' });
          }
        } catch {
          // Not a valid URL, ignore
        }
      }
    }
    
    next();
  };
}

/**
 * Validate environment configuration at startup
 * @throws {Error} If required configuration is missing
 */
export function validateEnvironment() {
  const warnings = [];
  const errors = [];
  
  // Required in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
      warnings.push('No AI API keys configured. AI features will be disabled.');
    }
  }
  
  // Optional but recommended
  if (!process.env.CORS_ORIGIN && process.env.NODE_ENV === 'production') {
    warnings.push('CORS_ORIGIN not set. Using permissive CORS policy.');
  }
  
  // Log warnings
  for (const warning of warnings) {
    log.warn(warning);
  }
  
  // Throw errors
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
  
  return {
    warnings,
    errors,
    valid: errors.length === 0
  };
}

export default {
  securityHeaders,
  cors,
  rateLimit,
  strictRateLimit,
  apiRateLimit,
  isPrivateIP,
  ssrfProtection,
  validateEnvironment
};
