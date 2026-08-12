const express = require('express');
const { processAssistantMessage } = require('../ai/graph/campusAgent');
const { getOllamaHealth } = require('../services/ollamaService');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const health = await getOllamaHealth();
    return res.status(200).json({
      success: true,
      ai: health,
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      ai: {
        available: false,
        message: error.message,
        model: null,
      },
    });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, currentLocation, currentPlace, destination, navigationActive, route } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        error: 'A non-empty message is required.',
      });
    }

    const result = await processAssistantMessage({
      message,
      currentLocation,
      currentPlace,
      destination,
      navigationActive,
      route,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AI chat]', error.message);
    return res.status(503).json({
      success: false,
      error: 'The DISHAA AI assistant is unavailable right now. Please try again shortly.',
      detail: error.message,
    });
  }
});

module.exports = router;
