/**
 * Backward-compatibility wrapper.
 * Forwards to the AI provider abstraction or legacy Ollama provider.
 */
const ollamaProvider = require('./ai/ollamaProvider');
const aiProvider = require('./ai/aiProvider');

module.exports = {
  getOllamaHealth: ollamaProvider.getOllamaHealth,
  generateText: aiProvider.generateText,
  generateTextStream: aiProvider.generateTextStream,
  OLLAMA_BASE_URL: ollamaProvider.OLLAMA_BASE_URL,
  OLLAMA_MODEL: ollamaProvider.OLLAMA_MODEL,
};
