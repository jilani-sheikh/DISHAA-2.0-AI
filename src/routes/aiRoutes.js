const express = require('express');
const { processAssistantMessage, processAssistantMessageStream } = require('../ai/graph/campusAgent');
const { getAiHealth } = require('../services/ai/aiProvider');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const health = await getAiHealth();
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
    const { message, currentLocation, currentPlace, destination, navigationActive, route, initialGreeting, navigationContext } = req.body || {};
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
      initialGreeting: Boolean(initialGreeting),
      navigationContext,
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

router.post('/chat/stream', async (req, res) => {
  const { message, currentLocation, currentPlace, destination, navigationActive, route, initialGreeting, navigationContext } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({
      success: false,
      error: 'A non-empty message is required.',
    });
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const finalResult = await processAssistantMessageStream(
      {
        message,
        currentLocation,
        currentPlace,
        destination,
        navigationActive,
        route,
        initialGreeting: Boolean(initialGreeting),
        navigationContext,
      },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ type: 'done', result: finalResult })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[AI chat stream]', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;

