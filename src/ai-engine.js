// ═══════════════════════════════════════════════════════════════
// AI Engine Module — Integrates Google Gemini API Client
// Initializes Gemini, loads persona, compiles context, and streams.
// ═══════════════════════════════════════════════════════════════

import { GoogleGenAI } from '@google/genai';
import SYSTEM_PROMPT from './system-prompt.js';
import buildProjectContext from './context-builder.js';
import toolRegistry from './tool-registry.js';

let aiClient = null;

// Context Cache variables
let cachedContext = null;
let lastContextTime = 0;

/**
 * Helper to parse Gemini error payloads and check for 429 rate limit / resource exhaustion status.
 * @param {Error} err - Error object thrown by SDK
 */
function parseRateLimitError(err) {
  const errorObj = err.error || err;
  let isRateLimit = false;
  let retryDelay = 60; // fallback

  if (
    errorObj.status === 429 ||
    errorObj.status === 'Too Many Requests' ||
    errorObj.statusCode === 429 ||
    errorObj.code === 429 ||
    err.code === 429
  ) {
    isRateLimit = true;
  }

  if (errorObj.message) {
    let messageText = errorObj.message;
    if (typeof messageText === 'object') {
      messageText = JSON.stringify(messageText);
    }

    try {
      const parsedErr = JSON.parse(messageText);
      const innerError = parsedErr.error || parsedErr;
      if (innerError) {
        if (innerError.code === 429 || innerError.status === 'RESOURCE_EXHAUSTED') {
          isRateLimit = true;
        }
        const details = innerError.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' || d.retryDelay);
          if (retryInfo && retryInfo.retryDelay) {
            const match = retryInfo.retryDelay.match(/^([\d.]+)/);
            if (match) {
              retryDelay = Math.ceil(parseFloat(match[1]));
            }
          }
        }
      }
    } catch (parseErr) {
      if (messageText.includes('429') || messageText.includes('RESOURCE_EXHAUSTED')) {
        isRateLimit = true;
      }
    }
  }

  return { isRateLimit, retryDelay };
}

/**
 * Initializes the Gemini API client safely.
 * Will not throw on missing key, to prevent crashing the collaboration server.
 */
export function initGemini() {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [AIEngine] GEMINI_API_KEY environment variable is not set! AI features will be unavailable.");
    return null;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey });
    console.log("🤖 [AIEngine] Google Gemini API initialized successfully.");
    return aiClient;
  } catch (err) {
    console.error("❌ [AIEngine] Error initializing Gemini API Client:", err.message);
    return null;
  }
}

const AGENT_PROMPTS = {
  manager: "", // Default Technical Lead / Engineering Manager persona
  reviewer: "\n\nACTIVE PERSONA SHIFT: You are the Senior Code Reviewer. Focus exclusively on code quality, security audits, performance, and best practices. Critique files deeply, line-by-line, and suggest improvements. Keep your tone direct, constructive, and analytical.",
  devops: "\n\nACTIVE PERSONA SHIFT: You are the DevOps Specialist. Focus exclusively on CI/CD pipelines, shell/terminal tasks, environment setup, dependencies, compiling, and automation scripting. Assist with resolving build failures.",
  planner: "\n\nACTIVE PERSONA SHIFT: You are the Project Planner. Focus on GitLab issues, merge requests, task decomposition, milestone tracking, scope constraints, and coordinating team activities.",
  security: "\n\nACTIVE PERSONA SHIFT: You are the Security Analyst. Focus exclusively on code security auditing, vulnerability checking (OWASP Top 10, SQL injection, XSS, etc.), secret scanning, dependency verification, and data privacy best practices.",
  cto: "\n\nACTIVE PERSONA SHIFT: You are the Startup CTO. Focus on rapid development, MVP feature sizing, scalability trade-offs, architecture simplicity, technical debt mitigation, and fast engineering velocity.",
  pm: "\n\nACTIVE PERSONA SHIFT: You are the Product Manager. Focus on feature scoping, requirements gathering, defining user stories, task prioritization, defining success metrics, and release mapping."
};

/**
 * Generates a streaming chat response from Gemini with full project context and tool calling support.
 * @param {string} userMessage - Raw message from the user
 * @param {ProjectMemory} projectMemory - Real-time state mapping files, presence, and activity
 * @param {array} history - Existing message list in the current thread: [{ role: 'user'|'model', text: '...' }]
 * @param {string} agentId - Selected active agent persona
 * @returns {AsyncGenerator} Stream of text chunks
 */
export async function* streamChat(userMessage, projectMemory, history = [], agentId = 'manager') {
  const client = initGemini();
  if (!client) {
    throw new Error("Gemini API Client is not configured. Please supply a GEMINI_API_KEY in your .env file.");
  }

  try {
    // 1. Compile fresh workspace context (files tree, code contents, online users, active logs) with 60s cache
    const now = Date.now();
    let contextText;
    if (cachedContext && (now - lastContextTime < 60000)) {
      contextText = cachedContext;
      console.log(`ℹ️ [AIEngine] Using cached workspace context (~${contextText.length} chars). Expires in ${Math.round((60000 - (now - lastContextTime)) / 1000)}s.`);
    } else {
      contextText = buildProjectContext(projectMemory);
      cachedContext = contextText;
      lastContextTime = now;
      console.log(`💬 [AIEngine] Compiled fresh workspace context (~${contextText.length} chars).`);
    }

    // 2. Inject context directly into the System Prompt/Instruction
    const agentPrompt = AGENT_PROMPTS[agentId] || '';
    const systemInstruction = `${SYSTEM_PROMPT}${agentPrompt}\n\nHere is the active workspace state you must refer to:\n${contextText}`;

    // 3. Format message history for Gemini SDK
    const contents = [];
    history.forEach(msg => {
      let role = 'user';
      if (msg.role === 'model' || msg.role === 'assistant') {
        role = 'model';
      }
      contents.push({
        role: role,
        parts: [{ text: msg.text }]
      });
    });

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    console.log(`💬 [AIEngine] Dispatching chat query to gemini-2.5-flash. Context size: ~${contextText.length} chars.`);

    // 4. Request streaming content from Gemini with tools (with rate-limiting retry)
    let responseStream = null;
    let attempts = 0;
    while (attempts < 2) {
      try {
        responseStream = await client.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.2, // Slightly lower temp for technical tasks
            tools: [{ functionDeclarations: toolRegistry.getDeclarations() }]
          }
        });
        break;
      } catch (err) {
        attempts++;
        const { isRateLimit, retryDelay } = parseRateLimitError(err);
        if (isRateLimit && attempts < 2) {
          console.warn(`⚠️ [AIEngine] Gemini rate limited (429) on initial call. Retrying in ${retryDelay} seconds...`);
          yield { rateLimited: true, retryIn: retryDelay };
          await new Promise(r => setTimeout(r, retryDelay * 1000));
        } else {
          throw err;
        }
      }
    }

    let functionCalls = [];
    for await (const chunk of responseStream) {
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        functionCalls.push(...chunk.functionCalls);
      }
      if (chunk.text) {
        yield chunk;
      }
    }

    // 5. If function calls are requested, execute them and feedback to model (with rate-limiting retry)
    while (functionCalls.length > 0) {
      const modelCallParts = [];
      const toolResponseParts = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        modelCallParts.push({ functionCall: { name, args } });

        let result;
        try {
          result = await toolRegistry.executeTool(name, args);
        } catch (err) {
          result = { status: 'error', message: err.message };
        }

        toolResponseParts.push({
          functionResponse: {
            name,
            response: result
          }
        });
      }

      contents.push({
        role: 'model',
        parts: modelCallParts
      });

      contents.push({
        role: 'tool',
        parts: toolResponseParts
      });

      console.log(`💬 [AIEngine] Sending function response back to Gemini for: ${functionCalls.map(c => c.name).join(', ')}`);

      let nextStream = null;
      let nextAttempts = 0;
      while (nextAttempts < 2) {
        try {
          nextStream = await client.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.2,
              tools: [{ functionDeclarations: toolRegistry.getDeclarations() }]
            }
          });
          break;
        } catch (err) {
          nextAttempts++;
          const { isRateLimit, retryDelay } = parseRateLimitError(err);
          if (isRateLimit && nextAttempts < 2) {
            console.warn(`⚠️ [AIEngine] Gemini rate limited (429) on tool response turn. Retrying in ${retryDelay} seconds...`);
            yield { rateLimited: true, retryIn: retryDelay };
            await new Promise(r => setTimeout(r, retryDelay * 1000));
          } else {
            throw err;
          }
        }
      }

      functionCalls = [];
      for await (const chunk of nextStream) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCalls.push(...chunk.functionCalls);
        }
        if (chunk.text) {
          yield chunk;
        }
      }
    }
  } catch (err) {
    console.error("❌ [AIEngine] streamChat failed:", err.message);
    throw err;
  }
}

export function clearContextCache() {
  cachedContext = null;
  lastContextTime = 0;
}

export default {
  initGemini,
  streamChat,
  clearContextCache
};
