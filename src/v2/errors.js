/**
 * Custom Error Classes for LooK
 * 
 * Provides structured, user-friendly error handling with error codes
 */

/**
 * Base error class for LooK
 */
export class LookError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = 'LookError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: Object.keys(this.details).length > 0 ? this.details : undefined,
      timestamp: this.timestamp
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends LookError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Resource not found (404)
 */
export class NotFoundError extends LookError {
  constructor(resource, id) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * API key errors (401/403)
 */
export class ApiKeyError extends LookError {
  constructor(service, message) {
    super(
      message || `${service} API key is missing or invalid`,
      'API_KEY_ERROR',
      401,
      { service }
    );
    this.name = 'ApiKeyError';
  }
}

/**
 * External service errors (502)
 */
export class ExternalServiceError extends LookError {
  constructor(service, originalError) {
    super(
      `${service} service error: ${originalError?.message || 'Unknown error'}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { 
        service,
        originalError: originalError?.message
      }
    );
    this.name = 'ExternalServiceError';
  }
}

/**
 * Browser/Playwright errors
 */
export class BrowserError extends LookError {
  constructor(message, originalError) {
    super(
      message || 'Browser automation error',
      'BROWSER_ERROR',
      500,
      { originalError: originalError?.message }
    );
    this.name = 'BrowserError';
  }
}

/**
 * FFmpeg/Video processing errors
 */
export class VideoProcessingError extends LookError {
  constructor(message, originalError) {
    super(
      message || 'Video processing failed',
      'VIDEO_PROCESSING_ERROR',
      500,
      { originalError: originalError?.message }
    );
    this.name = 'VideoProcessingError';
  }
}

/**
 * Import errors
 */
export class ImportError extends LookError {
  constructor(message, importType, originalError) {
    super(
      message || 'Import failed',
      'IMPORT_ERROR',
      400,
      { 
        importType,
        originalError: originalError?.message
      }
    );
    this.name = 'ImportError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends LookError {
  constructor(operation, timeoutMs) {
    super(
      `Operation timed out: ${operation}`,
      'TIMEOUT_ERROR',
      504,
      { operation, timeoutMs }
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends LookError {
  constructor(retryAfter) {
    super(
      'Too many requests. Please slow down.',
      'RATE_LIMIT_ERROR',
      429,
      { retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Error code definitions with user-friendly messages
 */
export const ErrorCodes = {
  VALIDATION_ERROR: {
    title: 'Invalid Request',
    suggestion: 'Check the request parameters and try again.'
  },
  NOT_FOUND: {
    title: 'Not Found',
    suggestion: 'The requested resource does not exist.'
  },
  API_KEY_ERROR: {
    title: 'Authentication Required',
    suggestion: 'Configure your API keys in Settings.'
  },
  EXTERNAL_SERVICE_ERROR: {
    title: 'Service Unavailable',
    suggestion: 'The external service is temporarily unavailable. Please try again.'
  },
  BROWSER_ERROR: {
    title: 'Browser Error',
    suggestion: 'Try restarting the server or run: npx playwright install chromium'
  },
  VIDEO_PROCESSING_ERROR: {
    title: 'Video Processing Failed',
    suggestion: 'Ensure FFmpeg is installed and try again.'
  },
  IMPORT_ERROR: {
    title: 'Import Failed',
    suggestion: 'Check that the URL is accessible and try again.'
  },
  TIMEOUT_ERROR: {
    title: 'Request Timed Out',
    suggestion: 'The operation took too long. Try with a smaller scope or check your network.'
  },
  RATE_LIMIT_ERROR: {
    title: 'Rate Limited',
    suggestion: 'Please wait before making more requests.'
  }
};

/**
 * Express error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  console.error(`[${new Date().toISOString()}] Error:`, {
    path: req.path,
    method: req.method,
    error: err.message,
    code: err.code,
    stack: err.stack?.split('\n').slice(0, 3).join('\n')
  });

  // Handle LookError instances
  if (err instanceof LookError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle known error types
  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      code: 'VALIDATION_ERROR'
    });
  }

  // Handle Playwright errors
  if (err.message?.includes('Target page') || err.message?.includes('browser has been closed')) {
    return res.status(500).json({
      error: 'Browser session expired. Please try again.',
      code: 'BROWSER_ERROR'
    });
  }

  // Handle timeout errors
  if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    return res.status(504).json({
      error: 'Request timed out',
      code: 'TIMEOUT_ERROR'
    });
  }

  // Default error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    code: 'INTERNAL_ERROR'
  });
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(body, fields) {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate URL format
 */
export function validateUrlFormat(url) {
  if (!url) {
    throw new ValidationError('URL is required');
  }
  
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError('URL must use HTTP or HTTPS protocol', { url });
    }
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError('Invalid URL format', { url });
  }
}

export default {
  LookError,
  ValidationError,
  NotFoundError,
  ApiKeyError,
  ExternalServiceError,
  BrowserError,
  VideoProcessingError,
  ImportError,
  TimeoutError,
  RateLimitError,
  ErrorCodes,
  errorHandler,
  asyncHandler,
  validateRequired,
  validateUrlFormat
};
