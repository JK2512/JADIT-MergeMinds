// ═══════════════════════════════════════════════════════════════
// Chat Service Module — Express Controller for AI Streaming
// Handles HTTP request lifecycle, SSE headers, and chunked streaming.
// ═══════════════════════════════════════════════════════════════

import { streamChat } from './ai-engine.js';
import { routeAgentRequest } from './agent-router.js';

// Global AI Request Queue
const requestQueue = [];
let isProcessingQueue = false;

// Welcome Summary Cache: username -> summary text
const welcomeSummaryCache = new Map();

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  const { req, res, projectMemory, resolve } = requestQueue.shift();

  try {
    await runChatRequest(req, res, projectMemory);
  } catch (err) {
    console.error('🔴 [ChatService] Error processing queued chat request:', err.message);
    try {
      if (!res.headersSent) {
        res.status(500).json({ error: `AI Streaming Failed: ${err.message}` });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    } catch (sendErr) {
      console.error('🔴 [ChatService] Failed to write error to response:', sendErr.message);
    }
  } finally {
    isProcessingQueue = false;
    resolve();
    // Schedule next in queue
    processQueue();
  }
}

function enqueueChatRequest(req, res, projectMemory) {
  return new Promise((resolve) => {
    requestQueue.push({ req, res, projectMemory, resolve });
    processQueue();
  });
}

async function runChatRequest(req, res, projectMemory) {
  const { message, history, username, agentId, currentFile, currentFileContent } = req.body;

  // Check if this is a welcome summary request and is cached
  const isWelcomeRequest = username && (
    message.toLowerCase().includes('welcome summary') || 
    message.toLowerCase().includes('onboarding')
  );

  if (isWelcomeRequest && welcomeSummaryCache.has(username)) {
    console.log(`ℹ️ [ChatService] Serving cached welcome summary for user: ${username}`);
    const cachedSummary = welcomeSummaryCache.get(username);
    res.write(`data: ${JSON.stringify({ text: cachedSummary })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const routedAgentResponse = await routeAgentRequest({ message, agentId, currentFile, currentFileContent, username }, projectMemory);
  if (routedAgentResponse?.text) {
    const provider = routedAgentResponse.agentType === 'gitlab' ? 'GitLabMCP' : 'LocalFallback';
    console.log(`[AgentProvider] ${provider}`);
    res.write(`data: ${JSON.stringify({ text: routedAgentResponse.text, provider })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  try {
    console.log('[AgentProvider] Gemini');
    const responseStream = await streamChat(message, projectMemory, history || [], agentId || 'manager');
    let fullResponseText = '';

    for await (const chunk of responseStream) {
      if (chunk.rateLimited) {
        res.write(`data: ${JSON.stringify({ rateLimited: true, retryIn: chunk.retryIn })}\n\n`);
      } else if (chunk.text) {
        fullResponseText += chunk.text;
        res.write(`data: ${JSON.stringify({ text: chunk.text, provider: 'Gemini' })}\n\n`);
      }
    }

    // If it was a welcome request, cache the final generated text
    if (isWelcomeRequest && username) {
      welcomeSummaryCache.set(username, fullResponseText);
    }

    // Signal client that stream is complete
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.warn(`⚠️ [ChatService] Gemini streaming failed: ${err.message}. Falling back to local agent.`);
    console.log('[AgentProvider] LocalFallback');

    try {
      const fallbackResponse = await routeAgentRequest({
        message,
        agentId,
        currentFile,
        currentFileContent,
        username,
        forceLocal: true
      }, projectMemory);

      if (fallbackResponse?.text) {
        res.write(`data: ${JSON.stringify({ 
          text: `⚠️ [Local Agent Fallback Engaged - Gemini API Unavailable]\n\n${fallbackResponse.text}`, 
          provider: 'LocalFallback' 
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        throw err;
      }
    } catch (fallbackErr) {
      throw err;
    }
  }
}

/**
 * Controller handler for streaming AI chat requests.
 * Formats response as Server-Sent Events (SSE) stream.
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {ProjectMemory} projectMemory - Instance of the project memory tracker
 */
export async function handleChatRequest(req, res, projectMemory) {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required in request body.' });
  }

  // Set SSE headers to allow client to read chunks as they arrive
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevent proxy buffering

  try {
    // Queue the request to serialize processing and prevent concurrent hits
    await enqueueChatRequest(req, res, projectMemory);
  } catch (err) {
    console.error('🔴 [ChatService] Error in handleChatRequest:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `AI Streaming Failed: ${err.message}` });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}

export default {
  handleChatRequest
};
