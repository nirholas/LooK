/**
 * Structured Logger for LooK
 * 
 * Provides consistent, JSON-structured logging for better observability
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

const LEVEL_COLORS = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[36m',  // cyan
  http: '\x1b[35m',  // magenta
  debug: '\x1b[90m', // gray
  trace: '\x1b[90m'  // gray
};

const RESET = '\x1b[0m';

class Logger {
  constructor(options = {}) {
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.pretty = options.pretty ?? (process.env.NODE_ENV !== 'production');
    this.name = options.name || 'look';
    this.defaultMeta = options.meta || {};
  }

  /**
   * Check if a level should be logged
   */
  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
  }

  /**
   * Format a log entry
   */
  format(level, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      ...this.defaultMeta,
      ...meta
    };

    // Remove undefined values
    Object.keys(entry).forEach(key => {
      if (entry[key] === undefined) delete entry[key];
    });

    if (this.pretty) {
      return this.formatPretty(entry);
    }

    return JSON.stringify(entry);
  }

  /**
   * Format for human-readable output
   */
  formatPretty(entry) {
    const { timestamp, level, name, message, ...rest } = entry;
    const time = timestamp.split('T')[1].split('.')[0];
    const color = LEVEL_COLORS[level] || '';
    const levelStr = level.toUpperCase().padEnd(5);
    
    let output = `${color}[${time}] ${levelStr}${RESET} ${message}`;
    
    if (Object.keys(rest).length > 0) {
      output += ` ${JSON.stringify(rest)}`;
    }
    
    return output;
  }

  /**
   * Log at specified level
   */
  log(level, message, meta) {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.format(level, message, meta);
    
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  // Convenience methods
  error(message, meta) { this.log('error', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  http(message, meta) { this.log('http', message, meta); }
  debug(message, meta) { this.log('debug', message, meta); }
  trace(message, meta) { this.log('trace', message, meta); }

  /**
   * Create a child logger with additional context
   */
  child(meta) {
    return new Logger({
      level: this.level,
      pretty: this.pretty,
      name: this.name,
      meta: { ...this.defaultMeta, ...meta }
    });
  }

  /**
   * Time an operation
   */
  time(label) {
    const start = process.hrtime.bigint();
    return {
      end: (meta = {}) => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        this.info(`${label} completed`, { ...meta, durationMs: Math.round(durationMs * 100) / 100 });
        return durationMs;
      }
    };
  }
}

// Default logger instance
export const logger = new Logger();

/**
 * Create a named logger
 */
export function createLogger(name, options = {}) {
  return new Logger({ ...options, name });
}

/**
 * Express middleware for HTTP request logging
 */
export function httpLogger(options = {}) {
  const log = options.logger || logger;
  
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const meta = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection?.remoteAddress
      };
      
      // Add query params if present
      if (Object.keys(req.query).length > 0) {
        meta.query = req.query;
      }
      
      // Log level based on status code
      if (res.statusCode >= 500) {
        log.error(`${req.method} ${req.path}`, meta);
      } else if (res.statusCode >= 400) {
        log.warn(`${req.method} ${req.path}`, meta);
      } else {
        log.http(`${req.method} ${req.path}`, meta);
      }
    });
    
    next();
  };
}

/**
 * Error logging helper with stack trace
 */
export function logError(error, context = {}) {
  const meta = {
    ...context,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n')
  };
  
  logger.error(error.message, meta);
}

export default logger;
