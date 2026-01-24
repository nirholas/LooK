/**
 * Authentication Routes
 * Handles: signup, login, logout, password reset, OAuth callbacks
 */

import { Router } from 'express';
import { User, Session, PlanLimits } from '../db/index.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateSessionToken,
  hashToken,
  authMiddleware,
  rateLimit
} from './middleware.js';

const router = Router();

// Rate limit auth endpoints more strictly
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }); // 10 per 15 min

/**
 * POST /auth/signup - Create new account
 */
router.post('/signup', authRateLimit, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if email exists
    const existing = User.findByEmail(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ 
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }
    
    // Create user
    const passwordHash = await hashPassword(password);
    const user = User.create({
      email: email.toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0]
    });
    
    // Generate tokens
    const accessToken = generateToken(user);
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    
    Session.create(user.id, sessionTokenHash, req.ip, req.headers['user-agent']);
    
    // Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Get plan limits for response
    const limits = PlanLimits.get('free');
    
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        createdAt: user.created_at
      },
      accessToken,
      planLimits: limits
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ 
      error: 'Failed to create account',
      code: 'SIGNUP_ERROR'
    });
  }
});

/**
 * POST /auth/login - Login with email/password
 */
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Find user
    const user = User.findByEmail(email.toLowerCase());
    if (!user || !user.password_hash) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Update last login
    User.update(user.id, { lastLoginAt: new Date().toISOString() });
    
    // Generate tokens
    const accessToken = generateToken(user);
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    
    Session.create(user.id, sessionTokenHash, req.ip, req.headers['user-agent']);
    
    // Set session cookie
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    // Get plan limits
    const limits = PlanLimits.get(user.plan || 'free');
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatarUrl: user.avatar_url,
        monthlyRenders: user.monthly_renders,
        monthlyApiCalls: user.monthly_api_calls
      },
      accessToken,
      planLimits: limits
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Failed to login',
      code: 'LOGIN_ERROR'
    });
  }
});

/**
 * POST /auth/logout - Logout current session
 */
router.post('/logout', authMiddleware({ required: false }), (req, res) => {
  try {
    // Clear session cookie
    res.clearCookie('session');
    
    // Delete session from DB if exists
    const sessionToken = req.cookies?.session;
    if (sessionToken) {
      const tokenHash = hashToken(sessionToken);
      const session = Session.findByToken(tokenHash);
      if (session) {
        Session.delete(session.id);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.json({ success: true }); // Don't fail logout
  }
});

/**
 * GET /auth/me - Get current user
 */
router.get('/me', authMiddleware(), (req, res) => {
  const limits = PlanLimits.get(req.user.plan || 'free');
  const usageCheck = PlanLimits.checkLimit(req.user, 'renders');
  
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      plan: req.user.plan,
      planStatus: req.user.plan_status,
      planPeriodEnd: req.user.plan_period_end,
      avatarUrl: req.user.avatar_url,
      monthlyRenders: req.user.monthly_renders,
      monthlyApiCalls: req.user.monthly_api_calls,
      createdAt: req.user.created_at
    },
    planLimits: limits,
    usage: {
      renders: usageCheck,
      apiCalls: PlanLimits.checkLimit(req.user, 'apiCalls'),
      storage: PlanLimits.checkLimit(req.user, 'storage')
    },
    authMethod: req.authMethod
  });
});

/**
 * PATCH /auth/me - Update current user
 */
router.patch('/me', authMiddleware(), async (req, res) => {
  try {
    const { name, avatarUrl, defaultVoice, defaultStyle } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (defaultVoice !== undefined) updates.defaultVoice = defaultVoice;
    if (defaultStyle !== undefined) updates.defaultStyle = defaultStyle;
    
    const user = User.update(req.user.id, updates);
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatarUrl: user.avatar_url,
        defaultVoice: user.default_voice,
        defaultStyle: user.default_style
      }
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ 
      error: 'Failed to update user',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * POST /auth/change-password - Change password
 */
router.post('/change-password', authMiddleware(), authRateLimit, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current and new password are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Verify current password
    const user = User.findById(req.user.id);
    if (!user.password_hash) {
      return res.status(400).json({ 
        error: 'Cannot change password for OAuth accounts',
        code: 'OAUTH_ACCOUNT'
      });
    }
    
    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Update password
    const newHash = await hashPassword(newPassword);
    User.update(req.user.id, { passwordHash: newHash });
    
    // Invalidate all other sessions
    Session.deleteByUser(req.user.id);
    
    // Create new session
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashToken(sessionToken);
    Session.create(req.user.id, sessionTokenHash, req.ip, req.headers['user-agent']);
    
    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ 
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

/**
 * POST /auth/api-keys - Create API key
 */
router.post('/api-keys', authMiddleware(), (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        error: 'API key name is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if user has API access
    if (!PlanLimits.hasFeature(req.user, 'apiAccess')) {
      return res.status(403).json({
        error: 'API access requires Pro plan or higher',
        code: 'FEATURE_UNAVAILABLE',
        upgradeUrl: '/pricing'
      });
    }
    
    // Generate key
    const { key, prefix, hash } = require('./middleware.js').generateApiKey();
    const apiKey = require('../db/index.js').ApiKey.create(req.user.id, name, hash, prefix);
    
    // Return the key only once - it cannot be retrieved later
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Only time the full key is returned
      keyPrefix: apiKey.key_prefix,
      createdAt: apiKey.created_at,
      message: 'Save this key securely - it cannot be retrieved again'
    });
  } catch (err) {
    console.error('Create API key error:', err);
    res.status(500).json({ 
      error: 'Failed to create API key',
      code: 'API_KEY_ERROR'
    });
  }
});

/**
 * GET /auth/api-keys - List API keys
 */
router.get('/api-keys', authMiddleware(), (req, res) => {
  const keys = require('../db/index.js').ApiKey.findByUser(req.user.id);
  
  res.json({
    keys: keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key_prefix,
      lastUsedAt: k.last_used_at,
      totalRequests: k.total_requests,
      createdAt: k.created_at
    }))
  });
});

/**
 * DELETE /auth/api-keys/:id - Revoke API key
 */
router.delete('/api-keys/:id', authMiddleware(), (req, res) => {
  try {
    const { ApiKey } = require('../db/index.js');
    const key = ApiKey.findById(req.params.id);
    
    if (!key || key.user_id !== req.user.id) {
      return res.status(404).json({ 
        error: 'API key not found',
        code: 'NOT_FOUND'
      });
    }
    
    ApiKey.revoke(req.params.id);
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    console.error('Revoke API key error:', err);
    res.status(500).json({ 
      error: 'Failed to revoke API key',
      code: 'API_KEY_ERROR'
    });
  }
});

/**
 * GET /auth/oauth/google - Initiate Google OAuth
 */
router.get('/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(501).json({ 
      error: 'Google OAuth not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  }
  
  const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/oauth/google/callback`;
  const scope = encodeURIComponent('email profile');
  const state = generateSessionToken().substring(0, 16);
  
  // Store state for CSRF protection
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
  
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
  
  res.redirect(url);
});

/**
 * GET /auth/oauth/github - Initiate GitHub OAuth
 */
router.get('/oauth/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(501).json({ 
      error: 'GitHub OAuth not configured',
      code: 'OAUTH_NOT_CONFIGURED'
    });
  }
  
  const redirectUri = `${process.env.BASE_URL || 'http://localhost:3000'}/auth/oauth/github/callback`;
  const scope = 'user:email';
  const state = generateSessionToken().substring(0, 16);
  
  res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000 });
  
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  
  res.redirect(url);
});

// OAuth callbacks would be implemented here - they exchange codes for tokens
// and create/login users. Implementation depends on the OAuth libraries used.

export default router;
