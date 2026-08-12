const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || '').trim();
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);

const ensureModelIsConfigured = () => {
  if (!OLLAMA_MODEL) {
    throw new Error('Ollama is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL in your environment.');
  }
};

const getOllamaHealth = async () => {
  if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
    return {
      available: false,
      message: 'Ollama is not configured. Set OLLAMA_BASE_URL and OLLAMA_MODEL before enabling the assistant.',
      model: null,
    };
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    if (!response.ok) {
      return {
        available: false,
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
        message: 'Ollama is running but no models are available. Pull a model with "ollama pull <model>".',
        model: OLLAMA_MODEL,
      };
    }

    const configuredAvailable = knownModels.some((name) => name === OLLAMA_MODEL || name.startsWith(`${OLLAMA_MODEL}:`));
    if (!configuredAvailable) {
      return {
        available: false,
        message: `Model "${OLLAMA_MODEL}" is not installed yet. Pull it with "ollama pull ${OLLAMA_MODEL}".`,
        model: OLLAMA_MODEL,
      };
    }

    return {
      available: true,
      message: `Ollama is ready for model "${OLLAMA_MODEL}".`,
      model: OLLAMA_MODEL,
    };
  } catch (error) {
    return {
      available: false,
      message: `Ollama is unreachable: ${error.message}`,
      model: OLLAMA_MODEL,
    };
  }
};

const generateText = async (prompt) => {
  ensureModelIsConfigured();

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 400,
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

  return {
    text: payload.response.trim(),
    model: payload.model || OLLAMA_MODEL,
  };
};

module.exports = {
  getOllamaHealth,
  generateText,
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
};
