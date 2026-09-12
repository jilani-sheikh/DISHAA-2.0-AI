const geminiProvider = require('./geminiProvider');
const ollamaProvider = require('./ollamaProvider');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const getActiveProviderName = () => {
  const configured = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  if (configured === 'ollama') return 'ollama';
  return 'gemini';
};

const getActiveProvider = () => {
  const name = getActiveProviderName();
  if (name === 'ollama') {
    return ollamaProvider;
  }
  return geminiProvider;
};

/**
 * Unified health check for whichever AI provider is active.
 */
const getAiHealth = async () => {
  const provider = getActiveProvider();
  const providerName = getActiveProviderName();

  try {
    if (providerName === 'gemini') {
      return await geminiProvider.getGeminiHealth();
    }
    return await ollamaProvider.getOllamaHealth();
  } catch (error) {
    return {
      available: false,
      provider: providerName,
      model: null,
      message: error.message,
    };
  }
};

/**
 * Unified standard text generation.
 */
const generateText = async (prompt, options = {}) => {
  const provider = getActiveProvider();
  return provider.generateText(prompt, options);
};

/**
 * Unified streaming text generation.
 */
const generateTextStream = async (prompt, onChunk, options = {}) => {
  const provider = getActiveProvider();
  return provider.generateTextStream(prompt, onChunk, options);
};

module.exports = {
  getAiHealth,
  generateText,
  generateTextStream,
  getActiveProviderName,
};
