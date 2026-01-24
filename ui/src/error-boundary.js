/**
 * Error Boundary - User-friendly error handling for L👀K Editor
 * 
 * Provides contextual error messages for common failures
 */

/**
 * Error type classifications
 */
export const ErrorType = {
  API_KEY_MISSING: 'api_key_missing',
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  BROWSER: 'browser',
  FFMPEG: 'ffmpeg',
  SERVER: 'server',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

/**
 * User-friendly error messages mapped to error patterns
 */
const ERROR_MESSAGES = {
  // API Key errors
  'OPENAI_API_KEY': {
    type: ErrorType.API_KEY_MISSING,
    title: 'OpenAI API Key Missing',
    message: 'OpenAI API key is required for AI analysis and voiceover.',
    action: 'Add your API key in Settings → API Keys, or set the OPENAI_API_KEY environment variable.',
    docLink: 'https://platform.openai.com/api-keys'
  },
  'GROQ_API_KEY': {
    type: ErrorType.API_KEY_MISSING,
    title: 'Groq API Key Missing',
    message: 'Groq API key is needed for script generation.',
    action: 'Add your API key in Settings (optional - falls back to OpenAI).',
    docLink: 'https://console.groq.com'
  },
  'Invalid API Key': {
    type: ErrorType.API_KEY_MISSING,
    title: 'Invalid API Key',
    message: 'The provided API key is invalid or expired.',
    action: 'Check your API key in Settings → API Keys.'
  },
  
  // Network errors
  'ECONNREFUSED': {
    type: ErrorType.NETWORK,
    title: 'Cannot Connect to Server',
    message: 'The LooK server is not running or unreachable.',
    action: 'Make sure the server is running with `look serve` or `npm run serve`.'
  },
  'NetworkError': {
    type: ErrorType.NETWORK,
    title: 'Network Error',
    message: 'Failed to connect. Check your internet connection.',
    action: 'Verify your network connection and try again.'
  },
  'fetch failed': {
    type: ErrorType.NETWORK,
    title: 'Connection Failed',
    message: 'Could not reach the server.',
    action: 'Check if the server is running and your network is connected.'
  },
  
  // Timeout errors
  'timeout': {
    type: ErrorType.TIMEOUT,
    title: 'Request Timed Out',
    message: 'The operation took too long to complete.',
    action: 'Try again. If the issue persists, the target website may be slow.'
  },
  'Navigation timeout': {
    type: ErrorType.TIMEOUT,
    title: 'Page Load Timeout',
    message: 'The website took too long to load.',
    action: 'Check if the URL is correct and the website is accessible.'
  },
  
  // Browser/Playwright errors
  'Target page, context or browser has been closed': {
    type: ErrorType.BROWSER,
    title: 'Browser Closed',
    message: 'The recording browser was unexpectedly closed.',
    action: 'Try starting a new recording session.'
  },
  'Playwright': {
    type: ErrorType.BROWSER,
    title: 'Browser Error',
    message: 'There was an issue with the browser automation.',
    action: 'Try restarting the server.'
  },
  'chromium': {
    type: ErrorType.BROWSER,
    title: 'Browser Launch Failed',
    message: 'Could not launch the Chrome browser.',
    action: 'Run `npx playwright install chromium` to install dependencies.'
  },
  
  // FFmpeg errors
  'ffmpeg': {
    type: ErrorType.FFMPEG,
    title: 'Video Processing Error',
    message: 'FFmpeg failed to process the video.',
    action: 'Ensure FFmpeg is installed on your system.'
  },
  
  // Server errors
  '500': {
    type: ErrorType.SERVER,
    title: 'Server Error',
    message: 'An internal server error occurred.',
    action: 'Check the server logs for more details.'
  },
  
  // Validation errors
  'URL is required': {
    type: ErrorType.VALIDATION,
    title: 'URL Required',
    message: 'Please enter a website URL to continue.',
    action: 'Enter the URL of the website you want to demo.'
  },
  'Invalid URL': {
    type: ErrorType.VALIDATION,
    title: 'Invalid URL',
    message: 'The provided URL format is not valid.',
    action: 'Enter a valid URL starting with http:// or https://'
  },
  'Project not found': {
    type: ErrorType.VALIDATION,
    title: 'Project Not Found',
    message: 'The requested project does not exist.',
    action: 'The project may have been deleted. Start a new project instead.'
  }
};

/**
 * Classify an error based on its message
 * @param {Error|string} error - The error to classify
 * @returns {Object} Error classification with type, title, message, action
 */
export function classifyError(error) {
  const errorMessage = error?.message || String(error);
  
  for (const [pattern, info] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      return { ...info, original: errorMessage };
    }
  }
  
  return {
    type: ErrorType.UNKNOWN,
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred.',
    action: 'Try again. If the problem persists, check the console.',
    original: errorMessage
  };
}

/**
 * Handle an error with context-aware messaging
 * @param {Error|string} error - The error to handle
 * @param {string} context - Context where the error occurred
 * @returns {string} User-friendly error message
 */
export function handleError(error, context = 'Unknown') {
  const classified = classifyError(error);
  console.error(`[${context}] ${classified.type}:`, classified.original);
  return classified.message;
}

/**
 * Get detailed error info for display
 * @param {Error|string} error - The error
 * @returns {Object} Full error details
 */
export function getErrorDetails(error) {
  return classifyError(error);
}

/**
 * Check if an error is recoverable (user can retry)
 * @param {Error|string} error - The error to check
 * @returns {boolean} True if the error is recoverable
 */
export function isRecoverableError(error) {
  const classified = classifyError(error);
  return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER].includes(classified.type);
}

export default { ErrorType, classifyError, handleError, getErrorDetails, isRecoverableError };
