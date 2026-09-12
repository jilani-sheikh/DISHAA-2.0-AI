const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b').trim();
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);

const memoryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

const ensureModelIsConfigured = () => {
  if (!OLLAMA_MODEL) {
    throw new Error('Ollama is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL in your environment.');
  }
};

const getOllamaHealth = async () => {
  if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
    return {
      available: false,
      provider: 'ollama',
      message: 'Ollama is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL before enabling.',
      model: null,
    };
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    if (!response.ok) {
      return {
        available: false,
        provider: 'ollama',
        message: `Ollama responded with HTTP ${response.status}.`,
        model: OLLAMA_MODEL,
      };
    }

    const payload = await response.json().catch(() => null);
    const models = Array.isArray(payload?.models) ? payload.models : [];
    const knownModels = models.map((model) => (typeof model === 'string' ? model : (model?.name || model?.model || ''))).filter(Boolean);

    if (!knownModels.length) {
      return {
        available: false,
        provider: 'ollama',
        message: 'Ollama is running but no models are available. Pull a model with "ollama pull <model>".',
        model: OLLAMA_MODEL,
      };
    }

    const configuredAvailable = knownModels.some((name) => name === OLLAMA_MODEL || name.startsWith(`${OLLAMA_MODEL}:`));
    if (!configuredAvailable) {
      return {
        available: false,
        provider: 'ollama',
        message: `Model "${OLLAMA_MODEL}" is not installed yet. Pull it with "ollama pull ${OLLAMA_MODEL}".`,
        model: OLLAMA_MODEL,
      };
    }

    return {
      available: true,
      provider: 'ollama',
      message: `Ollama is ready for model "${OLLAMA_MODEL}".`,
      model: OLLAMA_MODEL,
    };
  } catch (error) {
    return {
      available: false,
      provider: 'ollama',
      message: `Ollama is unreachable: ${error.message}`,
      model: OLLAMA_MODEL,
    };
  }
};

const generateText = async (prompt, options = {}) => {
  ensureModelIsConfigured();

  const cacheKey = typeof prompt === 'string' ? prompt.trim() : JSON.stringify(prompt);
  if (!options.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) return { text: cached, model: OLLAMA_MODEL, fromCache: true, provider: 'ollama' };
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxOutputTokens ?? 200,
      },
    }),
    timeout: OLLAMA_TIMEOUT_MS,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama request failed with HTTP ${response.status}: ${text || 'Unknown error'}`);
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload.response !== 'string' || !payload.response.trim()) {
    throw new Error('Ollama returned a malformed response.');
  }

  const resultText = payload.response.trim();
  if (!options.skipCache) {
    setCachedResponse(cacheKey, resultText);
  }

  return {
    text: resultText,
    model: payload.model || OLLAMA_MODEL,
    provider: 'ollama',
  };
};

const generateTextStream = async (prompt, onChunk, options = {}) => {
  ensureModelIsConfigured();

  const cacheKey = typeof prompt === 'string' ? prompt.trim() : JSON.stringify(prompt);
  if (!options.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      onChunk(cached);
      return { text: cached, model: OLLAMA_MODEL, fromCache: true, provider: 'ollama' };
    }
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxOutputTokens ?? 200,
      },
    }),
    timeout: OLLAMA_TIMEOUT_MS,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama request failed with HTTP ${response.status}: ${text || 'Unknown error'}`);
  }

  let accumulated = '';
  const body = response.body;

  return new Promise((resolve, reject) => {
    body.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            accumulated += parsed.response;
            onChunk(parsed.response);
          }
          if (parsed.done) {
            if (!options.skipCache) setCachedResponse(cacheKey, accumulated.trim());
          }
        } catch (_) {}
      }
    });

    body.on('end', () => {
      resolve({ text: accumulated.trim(), model: OLLAMA_MODEL, provider: 'ollama' });
    });

    body.on('error', (err) => {
      reject(err);
    });
  });
};

module.exports = {
  getOllamaHealth,
  generateText,
  generateTextStream,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
};
