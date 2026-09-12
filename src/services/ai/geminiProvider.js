const { GoogleGenAI } = require('@google/genai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest').trim();
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000);

// In-memory cache for static/semi-static queries (e.g. "What is DISHAA?")
const memoryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCachedResponse = (key) => {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return item.value;
};

const setCachedResponse = (key, value) => {
  if (memoryCache.size > 200) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { value, timestamp: Date.now() });
};

const getClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({ apiKey });
};

const DISHAA_SYSTEM_INSTRUCTION = `You are DISHAA, an AI campus navigation assistant.
Your job is to help users understand their campus, locations, routes, surroundings, and current navigation state.
Navigation data provided by the navigation engine is authoritative.
Never invent campus locations.
Never calculate GPS geometry, route geometry, distances, bearings, or navigation thresholds yourself.
Use the provided navigationContext when answering navigation questions.
Be concise, natural, and helpful (max 2-3 sentences).
If the user is currently navigating, prioritize the current navigation state.
Do not claim a place exists unless it is present in the provided campus data.
If information is unavailable, clearly say so.
Real-time navigation decisions are handled by the navigation engine, not by you.
You are the conversational intelligence layer of DISHAA.`;

/**
 * Perform a health check against the Gemini API.
 */
const getGeminiHealth = async () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      available: false,
      provider: 'gemini',
      model: GEMINI_MODEL,
      message: 'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in your environment.',
    };
  }

  try {
    const ai = getClient();
    // Lightweight check using countTokens or model info
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'ping',
      config: {
        maxOutputTokens: 5,
        temperature: 0.1,
      },
    });

    if (response && response.text != null) {
      return {
        available: true,
        provider: 'gemini',
        model: GEMINI_MODEL,
        message: `Gemini is ready with model "${GEMINI_MODEL}".`,
      };
    }

    return {
      available: false,
      provider: 'gemini',
      model: GEMINI_MODEL,
      message: 'Gemini returned an empty response.',
    };
  } catch (error) {
    return {
      available: false,
      provider: 'gemini',
      model: GEMINI_MODEL,
      message: `Gemini API check failed: ${error.message}`,
    };
  }
};

/**
 * Generate standard full text with Gemini.
 */
const generateText = async (prompt, options = {}) => {
  const cacheKey = typeof prompt === 'string' ? prompt.trim() : JSON.stringify(prompt);
  if (!options.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { text: cached, model: GEMINI_MODEL, fromCache: true, provider: 'gemini' };
  }

  const ai = getClient();
  const systemInstruction = options.systemInstruction || DISHAA_SYSTEM_INSTRUCTION;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 300,
    },
  });

  const resultText = (response.text || '').trim();
  if (!resultText) {
    throw new Error('Gemini returned an empty response.');
  }

  if (!options.skipCache) {
    setCachedResponse(cacheKey, resultText);
  }

  return {
    text: resultText,
    model: GEMINI_MODEL,
    provider: 'gemini',
  };
};

/**
 * Stream text generation tokens from Gemini via callback.
 */
const generateTextStream = async (prompt, onChunk, options = {}) => {
  const cacheKey = typeof prompt === 'string' ? prompt.trim() : JSON.stringify(prompt);
  if (!options.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      onChunk(cached);
      return { text: cached, model: GEMINI_MODEL, fromCache: true, provider: 'gemini' };
    }
  }

  const ai = getClient();
  const systemInstruction = options.systemInstruction || DISHAA_SYSTEM_INSTRUCTION;

  const responseStream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 300,
    },
  });

  let accumulated = '';
  for await (const chunk of responseStream) {
    const chunkText = chunk.text;
    if (chunkText) {
      accumulated += chunkText;
      onChunk(chunkText);
    }
  }

  const resultText = accumulated.trim();
  if (!options.skipCache && resultText) {
    setCachedResponse(cacheKey, resultText);
  }

  return {
    text: resultText,
    model: GEMINI_MODEL,
    provider: 'gemini',
  };
};

module.exports = {
  getGeminiHealth,
  generateText,
  generateTextStream,
  GEMINI_MODEL,
};
