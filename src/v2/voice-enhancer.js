/**
 * VoiceEnhancer - Improve voiceover quality and synchronization
 * 
 * Features:
 * - Script optimization for natural speech
 * - Word-level timing for captions
 * - Emotion/tone markers
 * - Pause insertion for emphasis
 * - Multi-voice support (narrator + callouts)
 */

/**
 * Optimize script text for TTS
 * @param {string} script - Raw script text
 */
export function optimizeForSpeech(script) {
  let optimized = script;
  
  // Expand common abbreviations
  const abbreviations = {
    'e.g.': 'for example',
    'i.e.': 'that is',
    'etc.': 'and so on',
    'vs.': 'versus',
    'approx.': 'approximately',
    'w/': 'with',
    'b/c': 'because',
    'btw': 'by the way',
    'UI': 'U I',
    'API': 'A P I',
    'URL': 'U R L',
    'HTML': 'H T M L',
    'CSS': 'C S S',
    'SQL': 'S Q L',
    'JSON': 'Jason', // Common pronunciation
    'CLI': 'command line',
    'SDK': 'S D K',
    'OAuth': 'O Auth',
    'SaaS': 'sass',
    'AI': 'A I',
    'ML': 'machine learning'
  };
  
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    optimized = optimized.replace(regex, full);
  }
  
  // Add natural pauses
  // After sentences - longer pause
  optimized = optimized.replace(/\.\s+/g, '. <break time="400ms"/> ');
  
  // After commas - shorter pause
  optimized = optimized.replace(/,\s+/g, ', <break time="200ms"/> ');
  
  // Before important words (add emphasis)
  const emphasisWords = ['important', 'key', 'crucial', 'essential', 'powerful', 'amazing', 'easy', 'simple', 'quick'];
  for (const word of emphasisWords) {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi');
    optimized = optimized.replace(regex, `<emphasis level="strong">$1</emphasis>`);
  }
  
  // Numbers - add spacing for clarity
  optimized = optimized.replace(/(\d+)/g, ' $1 ');
  
  // Clean up extra spaces
  optimized = optimized.replace(/\s+/g, ' ').trim();
  
  return optimized;
}

/**
 * Generate word-level timing for captions
 * @param {string} script - Script text
 * @param {number} totalDuration - Total audio duration in ms
 */
export function generateWordTimings(script, totalDuration) {
  // Clean script for word extraction
  const cleanScript = script
    .replace(/<[^>]+>/g, '') // Remove SSML tags
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleanScript.split(' ').filter(w => w.length > 0);
  const timings = [];
  
  // Estimate word durations based on length and complexity
  const totalWeight = words.reduce((sum, word) => sum + estimateWordDuration(word), 0);
  
  let currentTime = 0;
  for (const word of words) {
    const weight = estimateWordDuration(word);
    const duration = (weight / totalWeight) * totalDuration;
    
    timings.push({
      word,
      startTime: Math.round(currentTime),
      endTime: Math.round(currentTime + duration),
      duration: Math.round(duration)
    });
    
    currentTime += duration;
  }
  
  return timings;
}

/**
 * Estimate relative duration for a word
 */
function estimateWordDuration(word) {
  const syllables = countSyllables(word);
  const length = word.length;
  
  // Base weight from syllables
  let weight = syllables * 100;
  
  // Adjust for word length (longer words take more time)
  weight += length * 10;
  
  // Common short words are spoken faster
  const fastWords = ['the', 'a', 'an', 'to', 'in', 'on', 'at', 'is', 'it', 'and', 'or', 'of'];
  if (fastWords.includes(word.toLowerCase())) {
    weight *= 0.6;
  }
  
  return Math.max(weight, 80); // Minimum weight
}

/**
 * Count syllables in a word (approximation)
 */
function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  // Remove trailing e
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Generate SSML with emotion markers
 * @param {string} script - Plain text script
 * @param {Object} options - SSML options
 */
export function generateSSML(script, options = {}) {
  const {
    voice = 'alloy', // OpenAI voice
    rate = 'medium',
    pitch = 'medium',
    volume = 'medium',
    language = 'en-US'
  } = options;
  
  // Optimize text first
  let ssml = optimizeForSpeech(script);
  
  // Wrap in speak tags
  ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
    <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
      ${ssml}
    </prosody>
  </speak>`;
  
  return ssml;
}

/**
 * Split script into sections for multi-voice narration
 * @param {string} script - Full script
 */
export function splitForMultiVoice(script) {
  const sections = [];
  
  // Split by paragraph or explicit markers
  const paragraphs = script.split(/\n\n+/);
  
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].trim();
    if (!text) continue;
    
    // Detect section type from content
    let voiceType = 'narrator';
    let emotion = 'neutral';
    
    // Questions get different voice treatment
    if (text.includes('?')) {
      emotion = 'curious';
    }
    
    // Exciting features
    if (/amazing|incredible|powerful|awesome|exciting/i.test(text)) {
      emotion = 'enthusiastic';
    }
    
    // Instructions/how-to
    if (/click|tap|select|enter|type|navigate/i.test(text)) {
      voiceType = 'instructor';
      emotion = 'instructive';
    }
    
    // Callouts/tips
    if (/tip:|note:|important:|pro tip/i.test(text)) {
      voiceType = 'callout';
      emotion = 'advisory';
    }
    
    sections.push({
      index: i,
      text: text.replace(/^(tip:|note:|important:|pro tip:?)\s*/i, ''),
      voiceType,
      emotion,
      estimatedDuration: estimateSpeechDuration(text)
    });
  }
  
  return sections;
}

/**
 * Estimate speech duration for text
 * @param {string} text - Text to estimate
 * @param {number} wpm - Words per minute (default 150)
 */
export function estimateSpeechDuration(text, wpm = 150) {
  const words = text.split(/\s+/).length;
  const minutes = words / wpm;
  const ms = minutes * 60 * 1000;
  
  // Add time for pauses (commas, periods, etc.)
  const pauses = (text.match(/[,.!?;:]/g) || []).length;
  const pauseTime = pauses * 200; // 200ms per pause
  
  return Math.round(ms + pauseTime);
}

/**
 * Generate caption segments from word timings
 * @param {Array} wordTimings - Word-level timings
 * @param {Object} options - Caption options
 */
export function generateCaptions(wordTimings, options = {}) {
  const {
    maxWordsPerCaption = 7,
    maxDuration = 3000, // Max caption display time
    minDuration = 1000  // Min caption display time
  } = options;
  
  const captions = [];
  let currentCaption = {
    words: [],
    startTime: 0,
    endTime: 0
  };
  
  for (const timing of wordTimings) {
    const currentDuration = timing.endTime - currentCaption.startTime;
    
    // Start new caption if needed
    if (
      currentCaption.words.length >= maxWordsPerCaption ||
      currentDuration >= maxDuration
    ) {
      if (currentCaption.words.length > 0) {
        captions.push({
          text: currentCaption.words.join(' '),
          startTime: currentCaption.startTime,
          endTime: currentCaption.endTime
        });
      }
      currentCaption = {
        words: [timing.word],
        startTime: timing.startTime,
        endTime: timing.endTime
      };
    } else {
      if (currentCaption.words.length === 0) {
        currentCaption.startTime = timing.startTime;
      }
      currentCaption.words.push(timing.word);
      currentCaption.endTime = timing.endTime;
    }
  }
  
  // Add final caption
  if (currentCaption.words.length > 0) {
    captions.push({
      text: currentCaption.words.join(' '),
      startTime: currentCaption.startTime,
      endTime: currentCaption.endTime
    });
  }
  
  // Ensure minimum duration
  return captions.map(caption => ({
    ...caption,
    endTime: Math.max(caption.endTime, caption.startTime + minDuration)
  }));
}

/**
 * Sync voiceover with demo actions
 * @param {Array} voiceSections - Voiceover sections
 * @param {Array} demoActions - Demo action timeline
 */
export function syncVoiceWithActions(voiceSections, demoActions) {
  const synced = [];
  let voiceIndex = 0;
  
  for (const action of demoActions) {
    if (voiceIndex >= voiceSections.length) break;
    
    const voice = voiceSections[voiceIndex];
    
    // Match voice section to action based on content
    const actionKeywords = extractKeywords(action.description || action.element);
    const voiceKeywords = extractKeywords(voice.text);
    
    const overlap = actionKeywords.filter(k => voiceKeywords.includes(k)).length;
    const relevance = overlap / Math.max(actionKeywords.length, 1);
    
    synced.push({
      action,
      voice: relevance > 0.3 ? voice : null,
      startTime: action.startTime,
      endTime: action.endTime,
      voiceStartTime: relevance > 0.3 ? action.startTime : null
    });
    
    if (relevance > 0.3) {
      voiceIndex++;
    }
  }
  
  return synced;
}

function extractKeywords(text) {
  if (!text) return [];
  const stopWords = ['the', 'a', 'an', 'to', 'in', 'on', 'at', 'is', 'it', 'and', 'or', 'of', 'for', 'with', 'this', 'that'];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
}

/**
 * Generate background music suggestions based on script tone
 * @param {Array} sections - Script sections
 */
export function suggestBackgroundMusic(sections) {
  const toneAnalysis = {
    upbeat: 0,
    calm: 0,
    professional: 0,
    exciting: 0
  };
  
  for (const section of sections) {
    const text = section.text.toLowerCase();
    
    if (/fast|quick|easy|simple|instant/i.test(text)) toneAnalysis.upbeat += 2;
    if (/powerful|amazing|incredible|awesome/i.test(text)) toneAnalysis.exciting += 2;
    if (/secure|reliable|professional|enterprise/i.test(text)) toneAnalysis.professional += 2;
    if (/seamless|smooth|elegant|clean/i.test(text)) toneAnalysis.calm += 2;
  }
  
  // Determine dominant tone
  const dominantTone = Object.entries(toneAnalysis)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const musicSuggestions = {
    upbeat: {
      style: 'upbeat corporate',
      tempo: 'medium-fast (120-140 BPM)',
      instruments: ['acoustic guitar', 'light drums', 'piano'],
      keywords: ['energetic', 'positive', 'modern']
    },
    calm: {
      style: 'ambient corporate',
      tempo: 'slow (60-80 BPM)',
      instruments: ['piano', 'soft synths', 'strings'],
      keywords: ['peaceful', 'elegant', 'minimal']
    },
    professional: {
      style: 'corporate presentation',
      tempo: 'medium (90-110 BPM)',
      instruments: ['piano', 'orchestra', 'subtle drums'],
      keywords: ['business', 'confident', 'sophisticated']
    },
    exciting: {
      style: 'inspirational corporate',
      tempo: 'medium-fast (110-130 BPM)',
      instruments: ['drums', 'strings', 'synths'],
      keywords: ['epic', 'inspiring', 'dynamic']
    }
  };
  
  return {
    recommendedTone: dominantTone,
    toneScores: toneAnalysis,
    musicProfile: musicSuggestions[dominantTone]
  };
}

export default {
  optimizeForSpeech,
  generateWordTimings,
  generateSSML,
  splitForMultiVoice,
  estimateSpeechDuration,
  generateCaptions,
  syncVoiceWithActions,
  suggestBackgroundMusic
};
