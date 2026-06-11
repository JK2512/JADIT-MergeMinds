// 
// AI Panel Module  Client Chat Interface & SSE Streaming
// Connects UI, runs chat history, handles markdown & Quick Actions.
// 

export class AIPanel {
  constructor(appInstance) {
    this.app = appInstance;
    this.history = []; // local transient chat history: [{ role: 'user'|'model', text: '...' }]
    this.isStreaming = false;

    // DOM Elements
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.clearBtn = document.getElementById('chat-clear-btn');
    this.agentSelector = document.getElementById('chat-agent-selector');
    this.suggestedPrompts = document.getElementById('suggested-prompts');
    
    // Quick Action Buttons
    this.qaToday = document.getElementById('qa-today');
    this.qaAway = document.getElementById('qa-away');
    this.qaReview = document.getElementById('qa-review');
    this.qaNext = document.getElementById('qa-next');
  }

  init() {
    if (!this.messagesEl) {
      console.warn('AI Panel init skipped: #chat-messages not found.');
      return;
    }

    // Bind event listeners
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    } else {
      console.warn('AI Panel send button missing: #chat-send');
    }

    if (this.inputEl) {
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    } else {
      console.warn('AI Panel input missing: #chat-input');
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.history = [];
        this.renderHelpMessage();
      });
    }

    if (this.agentSelector) {
      this.agentSelector.value = this.app.activeAgentId || 'manager';
      this.agentSelector.addEventListener('change', () => {
        this.app.activeAgentId = this.agentSelector.value;
        this.app.applyPersonality?.(this.agentSelector.value);
        this.app.renderAgents?.();
      });
    }

    if (this.suggestedPrompts) {
      this.suggestedPrompts.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-prompt]');
        if (!btn || !this.inputEl) return;
        const agent = btn.dataset.agent;
        if (agent) {
          this.app.activeAgentId = agent;
          if (this.agentSelector) this.agentSelector.value = agent;
          this.app.applyPersonality?.(agent);
          this.app.renderAgents?.();
        }
        this.inputEl.value = btn.dataset.prompt || '';
        this.inputEl.focus();
      });
    }

    // Quick Actions Click Handlers
    this.bindOptionalAction(this.qaToday, 'qa-today', "What happened today?");
    this.bindOptionalAction(this.qaAway, 'qa-away', "What changed while I was away?");
    this.bindOptionalAction(this.qaReview, 'qa-review', "Review the current code.");
    this.bindOptionalAction(this.qaNext, 'qa-next', "What should I work on next?");

    // Render initial welcome help message
    this.renderHelpMessage();

    // Check GitLab MCP Health for developer diagnostics
    this.checkGitLabHealth();
  }

  bindOptionalAction(el, id, queryText) {
    if (!el) {
      console.warn(`AI Panel quick action missing: #${id}`);
      return;
    }
    el.addEventListener('click', () => this.triggerQuickAction(queryText));
  }

  renderHelpMessage() {
    this.messagesEl.innerHTML = `
      <div class="chat-bubble chat-bubble-ai welcome-summary-card">
        <h3> Tech Lead Manager Ready</h3>
        <p>Hello team, I am your Tech Lead & Engineering Manager. Ask me technical questions, check status, or run verification.</p>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Context Compiled: all workspace files, active presence, and real-time logs.</p>
      </div>
    `;
    this.scrollToBottom();
  }

  setAgent(agentId) {
    const agentDetails = {
      manager: {
        name: "Tech Lead Manager",
        title: " Tech Lead Manager Ready",
        desc: "Hello team, I am your Tech Lead & Engineering Manager. Ask me technical questions, check status, or run verification."
      },
      reviewer: {
        name: "Senior Code Reviewer",
        title: " Senior Code Reviewer Online",
        desc: "Ready to inspect code quality, look for security bugs, performance bottlenecks, and style formatting. Let's analyze the codebase."
      },
      devops: {
        name: "DevOps Specialist",
        title: " DevOps Specialist Active",
        desc: "Focused on CI/CD pipelines, shell/terminal tasks, environment setup, dependencies, compiling, and automation. Ready to help with compilation and runs."
      },
      planner: {
        name: "Project Planner",
        title: " Project Planner Ready",
        desc: "Ready to coordinate team activities, track GitLab issues, merge requests, task decomposition, and milestone mapping."
      },
      security: {
        name: "Security Analyst",
        title: " Security Analyst Active",
        desc: "Specialized in static code analysis, vulnerability scanning, OWASP standards, secrets audits, and securing configurations."
      },
      cto: {
        name: "Startup CTO",
        title: " Startup CTO Online",
        desc: "Focused on agile engineering velocity, MVP scoping trade-offs, architecture simplification, scalability, and technical debt mapping."
      },
      pm: {
        name: "Product Manager",
        title: " Product Manager Ready",
        desc: "Focused on requirements definition, user stories mapping, feature scoping, feedback analysis, and roadmap scheduling."
      }
    };

    const details = agentDetails[agentId];
    if (!details) return;

    // Update input placeholder
    if (this.inputEl) {
      this.inputEl.placeholder = `Ask ${details.name}...`;
    }
    if (this.agentSelector && this.agentSelector.value !== agentId) {
      this.agentSelector.value = agentId;
    }

    // Update greeting message card
    const card = this.messagesEl.querySelector('.welcome-summary-card');
    if (card) {
      card.innerHTML = `
        <h3>${details.title}</h3>
        <p>${details.desc}</p>
        <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Context Compiled: all workspace files, active presence, and real-time logs.</p>
      `;
    }
  }


  triggerQuickAction(queryText) {
    if (this.isStreaming) return;
    this.handleSendMessage(queryText);
  }

  showRateLimitCountdown(seconds) {
    let banner = document.getElementById('chat-rate-limit-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'chat-rate-limit-banner';
      banner.className = 'chat-bubble chat-bubble-ai rate-limit-card';
      banner.style.borderLeft = '4px solid var(--warning, #feca57)';
      banner.style.backgroundColor = 'rgba(254, 202, 87, 0.1)';
      banner.style.margin = '8px 0';
      banner.style.padding = '12px';
      banner.style.borderRadius = '8px';
      this.messagesEl.appendChild(banner);
    }

    let timeLeft = seconds;
    banner.innerHTML = ` <strong>AI is temporarily rate limited.</strong> Retrying in <span id="rate-limit-countdown" style="font-weight: bold; color: var(--warning, #feca57);">${timeLeft}</span> seconds...`;
    this.scrollToBottom();

    const interval = setInterval(() => {
      timeLeft--;
      const span = document.getElementById('rate-limit-countdown');
      if (span) {
        span.textContent = timeLeft;
      }
      if (timeLeft <= 0) {
        clearInterval(interval);
        banner.remove();
      }
    }, 1000);
  }

  async handleSendMessage(customText = null) {
    if (!customText && !this.inputEl) {
      console.warn('AI Panel cannot send message: #chat-input not found.');
      return;
    }

    const text = (customText || this.inputEl.value).trim();
    if (!text || this.isStreaming) return;

    // Clear input if sending from input box
    if (!customText) {
      this.inputEl.value = '';
    }

    // Disable input interface during stream
    this.setInterfaceState(true);

    // 1. Render user message in UI
    this.appendMessage('user', text);
    this.scrollToBottom();

    // 2. Add to transient history
    this.history.push({ role: 'user', text });

    // 3. Show typing loader
    this.showTypingIndicator();

    try {
      // 4. Dispatch query to streaming API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: this.history.slice(0, -1), // Send history excluding the last message we just pushed
          username: this.app.presence.currentUser?.name,
          agentId: this.app.activeAgentId || 'manager',
          currentFile: this.app.currentFile,
          currentFileContent: this.app.getCurrentEditorContent?.() || ''
        })
      });

      this.hideTypingIndicator();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // 5. Create active response bubble in chat area
      const aiBubble = this.createMessageBubble('ai');
      let fullResponseText = '';

      // 6. Read stream dynamically
      await this.readSSEStream(response, (textChunk) => {
        fullResponseText += textChunk;
        aiBubble.innerHTML = this.formatMarkdown(fullResponseText);
        this.scrollToBottom();
      });

      // 7. Store completion in history
      this.history.push({ role: 'model', text: fullResponseText });

      // Keep history bounded to last 20 messages to avoid context explosion
      if (this.history.length > 20) {
        this.history = this.history.slice(-20);
      }

    } catch (err) {
      this.hideTypingIndicator();
      this.appendMessage('ai', ` **Engineering Manager Error**: I ran into an issue analyzing the workspace: ${err.message}. Please verify your Gemini API key.`);
      console.error("AI Panel stream error:", err);
    } finally {
      this.setInterfaceState(false);
    }
  }

  //  Streaming SSE Parser 

  async readSSEStream(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // save incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.rateLimited) {
              this.showRateLimitCountdown(parsed.retryIn);
            } else if (parsed.text) {
              if (parsed.provider) {
                console.log(`[AgentProvider] ${parsed.provider}`);
                const devActiveProvider = document.getElementById('dev-active-provider');
                if (devActiveProvider) {
                  devActiveProvider.textContent = parsed.provider === 'Gemini' ? 'Gemini 2.5 Flash' : (parsed.provider === 'GitLabMCP' ? 'GitLab MCP Server' : 'Local Fallback Agent');
                  devActiveProvider.style.color = parsed.provider === 'Gemini' ? '#2ecc71' : (parsed.provider === 'GitLabMCP' ? '#3498db' : '#e74c3c');
                }
              }
              onChunk(parsed.text);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore parse errors on partial streams
          }
        }
      }
    }
  }

  //  UI Rendering Helpers 

  appendMessage(role, text) {
    const bubble = this.createMessageBubble(role);
    bubble.innerHTML = role === 'user' ? this.escapeHTML(text) : this.formatMarkdown(text);
  }

  createMessageBubble(role) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble-${role}`;
    this.messagesEl.appendChild(bubble);
    return bubble;
  }

  showTypingIndicator() {
    this.hideTypingIndicator(); // prevent duplicates
    const indicator = document.createElement('div');
    indicator.id = 'chat-typing-indicator';
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    this.messagesEl.appendChild(indicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();
  }

  setInterfaceState(loading) {
    this.isStreaming = loading;
    if (this.inputEl) {
      this.inputEl.disabled = loading;
    }
    if (this.sendBtn) {
      this.sendBtn.disabled = loading;
    }
    
    const btns = [this.qaToday, this.qaAway, this.qaReview, this.qaNext];
    btns.forEach(btn => {
      if (btn) btn.disabled = loading;
    });

    if (!this.sendBtn || !this.inputEl) {
      return;
    }

    if (loading) {
      this.sendBtn.style.opacity = '0.5';
    } else {
      this.sendBtn.style.opacity = '1';
      this.inputEl.focus();
    }
  }

  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Simple and robust client markdown renderer
  formatMarkdown(text) {
    if (!text) return '';

    let html = this.escapeHTML(text);

    // Code blocks: ```javascript ... ```
    html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)\n```/g, (match, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold text: **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // GitLab review badges
    html = html.replace(/\[CRITICAL\]/g, '<span style="background:var(--danger);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">CRITICAL</span>');
    html = html.replace(/\[WARNING\]/g, '<span style="background:var(--warning);color:#121212;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">WARNING</span>');
    html = html.replace(/\[INFO\]/g, '<span style="background:var(--accent-ai);color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;margin-right:4px;">INFO</span>');

    // Bullet items
    html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap lists in <ul> tags
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // combine adjacent <ul> tags

    // Line breaks to paragraphs
    const lines = html.split('\n\n');
    html = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('<pre>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<li>')) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  async checkGitLabHealth() {
    const devMcpStatus = document.getElementById('dev-mcp-status');
    try {
      const res = await fetch('/api/gitlab/health');
      if (res.ok) {
        if (devMcpStatus) {
          devMcpStatus.textContent = 'Connected';
          devMcpStatus.style.color = '#2ecc71';
        }
      } else {
        if (devMcpStatus) {
          devMcpStatus.textContent = 'Offline';
          devMcpStatus.style.color = '#e67e22';
        }
      }
    } catch (err) {
      if (devMcpStatus) {
        devMcpStatus.textContent = 'Offline / Error';
        devMcpStatus.style.color = '#e74c3c';
      }
    }
  }
}
export default AIPanel;
