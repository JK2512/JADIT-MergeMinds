// ═══════════════════════════════════════════════════════════════
// Main Client Orchestrator — Manages WS, UI Events, and Modules
// ═══════════════════════════════════════════════════════════════

import { CodeEditor } from './editor.js';
import { PresenceTracker } from './presence.js';
import { NotificationSystem } from './notifications.js';
import { AIPanel } from './ai-panel.js';

class WorkspaceApp {
  constructor() {
    this.ws = null;
    this.editor = null;
    this.presence = null;
    this.notifications = null;
    this.aiPanel = null;
    
    this.connectionId = null;
    this.currentFile = 'main.js';
    this.files = [];
    this.reconnectTimer = null;
    this.isReconnecting = false;

    // Terminal State
    this.terminalHistory = [];
    this.terminalHistoryIndex = -1;
    this.terminalReady = false;

    // Collaboration Debug Stats
    this.lastSyncTimestamp = '-';
    this.totalOpsCount = 0;

    // Active Agent & Health Telemetry
    this.activeAgentId = 'manager';
    this.lastRunFailed = false;

    // UI Selectors
    this.currentFileEl = document.getElementById('current-file');
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.activityListEl = document.getElementById('activity-list');
    
    // IDE Action Bar Selectors
    this.ideRunBtn = document.getElementById('ide-run-btn');
    this.ideBuildBtn = document.getElementById('ide-build-btn');
    this.ideReviewBtn = document.getElementById('ide-review-btn');
    this.ideDeployBtn = document.getElementById('ide-deploy-btn');
  }

  async init() {
    console.log("BOOT_START");
    // Clear layout/demo/snapshot keys from localStorage on page load
    localStorage.removeItem('setting_layout');
    localStorage.removeItem('setting_demo_mode');
    localStorage.removeItem('gitlabs_theme_snapshot');
    try {
      // 1. Initialize notification system
      this.notifications = new NotificationSystem();
      
      // 2. Initialize Monaco Editor
      this.editor = new CodeEditor(
        'editor-container',
        (update) => this.handleLocalContentChange(update),
        (pos) => this.handleLocalCursorChange(pos)
      );
      await this.editor.initialize();

      // 3. Initialize AI Panel
      this.aiPanel = new AIPanel(this);
      this.aiPanel.init();

      // Initialize debugging panel state
      this.updateDebugPanel();

      // 5. Initialize Terminal UI
      this.initTerminal();
      this.initTerminalResizer();

      // 6. Initialize IDE Action Bar
      this.initIDEActionBar();

      // Fetch initial project files from REST API
      console.log("FETCH_PROJECT_START");
      const res = await fetch('/api/current-project');
      if (!res.ok) {
        throw new Error(`Failed to fetch project: HTTP ${res.status}`);
      }
      const projData = await res.json();
      this.files = Object.keys(projData.files || {});
      console.log("FETCH_PROJECT_SUCCESS");

      // Render the initial file list
      this.renderFileTabs();
      this.renderFileExplorer();

      // 5. Initialize presence tracker
      this.presence = new PresenceTracker((user) => {
        this.notifications.show(`Welcome back, ${user.name}! Connecting...`, 'success');
        this.connectWebSocket();
      });
      this.presence.init();

      // 6. Initialize UI
      this.initAppearanceSettings();
      this.initAgentDock();
      this.initBgCanvas();
      this.initWorkspaceMap();
      this.initNavigation();
      
      // 7. Initialize Hackathon Demo Scenarios
      this.initDemoActions();
      this.initReplayEngine();
      
      await this.updateProjectHealth();
      setInterval(() => this.updateProjectHealth(), 10000);

    } catch (err) {
      console.error("CRITICAL STARTUP ERROR IN app.js:", err);
    }
  }

  initNavigation() {
    const explorerBtn = document.getElementById('nav-explorer-btn');
    const gitBtn = document.getElementById('nav-git-btn');
    const settingsBtn = document.getElementById('nav-settings-btn');
    const sidebarPanel = document.getElementById('sidebar-panel');
    const panelTitle = document.getElementById('sidebar-panel-title');
    const fileExplorer = document.getElementById('file-explorer');
    const commitsPanel = document.getElementById('commits-panel');

    const switchPanel = (title, activeBtn) => {
      panelTitle.textContent = title;
      document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    explorerBtn?.addEventListener('click', () => {
      switchPanel('EXPLORER', explorerBtn);
      fileExplorer.classList.remove('hidden');
      commitsPanel.classList.add('hidden');
    });

    gitBtn?.addEventListener('click', () => {
      switchPanel('SOURCE CONTROL', gitBtn);
      fileExplorer.classList.add('hidden');
      commitsPanel.classList.remove('hidden');
      this.fetchActivityHistory();
    });

    settingsBtn?.addEventListener('click', () => {
      document.getElementById('settings-modal')?.classList.remove('hidden');
    });
  }

  initTerminalResizer() {
    const resizer = document.getElementById('terminal-resizer');
    const bottomPanels = document.getElementById('bottom-panels');
    if (!resizer || !bottomPanels) return;

    let isResizing = false;

    // Load persisted height
    const savedHeight = localStorage.getItem('terminal_height');
    if (savedHeight) {
      bottomPanels.style.height = `${savedHeight}px`;
    }

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'ns-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const height = window.innerHeight - e.clientY - 28; // 28 is status bar height
      const finalHeight = Math.min(400, Math.max(120, height));
      bottomPanels.style.height = `${finalHeight}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = 'default';
        localStorage.setItem('terminal_height', bottomPanels.offsetHeight);
      }
    });
  }

  initIDEActionBar() {
    this.ideRunBtn?.addEventListener('click', () => this.runCurrentFile());
    this.ideBuildBtn?.addEventListener('click', () => {
      this.notifications.show('Building project...', 'info');
      this.sendJSON({ type: 'terminalInput', input: 'npm run build\n' });
    });
    this.ideReviewBtn?.addEventListener('click', () => {
      this.applyPersonality('reviewer');
      this.aiPanel.handleSendMessage(`Deeply review the active file: ${this.currentFile}. Inspect syntax, structure, quality, possible security flaws, and performance. Give me a clean bulleted review card with line-specific improvements.`);
    });
    this.ideDeployBtn?.addEventListener('click', () => {
      this.notifications.show('Deploying build...', 'success');
      this.sendJSON({ type: 'terminalInput', input: 'npm run deploy\n' });
    });
  }

  // ── WebSocket Integration ────────────────────────────────
  
  connectWebSocket() {
    console.log("WS_CONNECT_START");
    if (this.ws) {
      this.ws.close();
    }

    // Bind empty document and set language
    this.editor.bindDocument(null);
    this.editor.setLanguageForFile(this.currentFile);
    if (this.currentFileEl) {
      this.currentFileEl.textContent = this.currentFile;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/room/hackathon-demo?file=${this.currentFile}`;
    
    this.updateStatus('syncing', 'Connecting...');
    this.updateDebugPanel();
    
    console.log('WEBSOCKET_CONNECTING');
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.isReconnecting = false;
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.updateStatus('connected', 'Connected');
      this.updateDebugPanel();
      console.log('WEBSOCKET_CONNECTED');
      console.log("WS_CONNECT_SUCCESS");
      
      // Join room with user metadata
      this.sendJSON({
        type: 'join',
        user: this.presence.currentUser
      });
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Yjs binary update
        const updateSize = event.data.byteLength;
        console.log(`📥 UPDATE_RECEIVED file=${this.currentFile} size=${updateSize}`);
        this.editor.applyUpdate(event.data);
        console.log(`✅ UPDATE_APPLIED file=${this.currentFile} size=${updateSize}`);
        this.totalOpsCount++;
        this.lastSyncTimestamp = new Date().toLocaleTimeString();
        this.updateDebugPanel();
      } else {
        // JSON control message
        try {
          const msg = JSON.parse(event.data);
          this.handleControlMessage(msg);
        } catch (err) {
          console.error('Error handling string message:', err);
        }
      }
    };

    this.ws.onclose = () => {
      this.updateStatus('disconnected', 'Disconnected');
      this.editor.clearAllRemoteCursors();
      this.updateDebugPanel();
      this.triggerReconnection();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.updateStatus('error', 'Connection Error');
      this.updateDebugPanel();
    };
  }

  triggerReconnection() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.notifications.show('Disconnected from server. Attempting reconnection...', 'danger');
    
    this.reconnectTimer = setInterval(() => {
      console.log('🔄 Attempting to reconnect...');
      this.connectWebSocket();
    }, 5000);
  }

  // ── Message Handlers ─────────────────────────────────────
  
  handleControlMessage(msg) {
    switch (msg.type) {
      case 'welcome':
        this.connectionId = msg.connectionId;
        // If server assigned a new color, save it
        if (msg.assignedColor) {
          this.presence.currentUser.color = msg.assignedColor;
          localStorage.setItem('gitlabs_color', msg.assignedColor);
        }
        this.updateDebugPanel();
        console.log('WORKSPACE_READY');
        break;

      case 'fileList':
        this.files = msg.files;
        console.log('FILES_FETCHED');
        this.renderFileTabs();
        this.renderFileExplorer();
        this.updateDebugPanel();
        break;

      case 'presence':
        this.presence.updateUsers(msg.users, this.connectionId);
        // Clear remote cursors for users who left or switched to another file
        const activePeersOnSameFile = new Set(
          msg.users
            .filter(u => u.id !== this.connectionId && u.currentFile === this.currentFile)
            .map(u => u.id)
        );
        for (const connId of this.editor.remoteDecorations.keys()) {
          if (!activePeersOnSameFile.has(connId)) {
            this.editor.clearRemoteCursor(connId);
          }
        }
        this.updateDebugPanel();
        break;

      case 'activity':
        this.appendActivityEvent(msg.event);
        // Show notification toast for non-system events
        if (msg.event.user !== 'system' && msg.event.user !== this.presence.currentUser?.name) {
          const actionText = msg.event.action === 'joined' ? 'joined the workspace' : 
                             msg.event.action === 'left' ? 'left the workspace' :
                             msg.event.action === 'created_file' ? `created ${msg.event.target}` :
                             `modified ${msg.event.target}`;
          this.notifications.show(`👤 ${msg.event.user} ${actionText}`, 'info');
        }
        break;

      case 'activityHistory':
        if (this.activityListEl) {
          this.activityListEl.innerHTML = '';
          msg.events.reverse().forEach(e => this.appendActivityEvent(e));
        }
        // Also update commits list if it's the commits panel
        const commitsList = document.getElementById('commits-list');
        if (commitsList) {
          commitsList.innerHTML = '';
          msg.events.filter(e => e.action !== 'joined' && e.action !== 'left')
                   .forEach(e => {
                     const item = document.createElement('div');
                     item.className = 'activity-item';
                     item.innerHTML = `
                       <div class="activity-content">
                         <span class="activity-user">${e.user}</span>
                         ${e.action === 'created_file' ? ' created ' : ' edited '}
                         <span class="activity-target" style="color:var(--accent-color)">${e.target}</span>
                         <span class="activity-time">${this.formatTime(e.timestamp)}</span>
                       </div>
                     `;
                     commitsList.appendChild(item);
                   });
        }
        break;

      case 'remoteCursor':
        if (msg.connectionId !== this.connectionId) {
          this.editor.updateRemoteCursor(msg.connectionId, msg.user, msg.cursor);
        }
        break;

      case 'fileChanged':
        this.currentFile = msg.file;
        this.editor.bindDocument(null);
        this.editor.setLanguageForFile(msg.file);
        if (this.currentFileEl) {
          this.currentFileEl.textContent = msg.file;
        }
        this.renderFileTabs();
        this.renderFileExplorer();
        this.updateDebugPanel();
        break;

      case 'terminalOutput':
        this.appendTerminalOutput(msg.output);
        break;

      case 'runStatus': {
        const { status, details } = msg;
        
        // 1. Log the status inside the terminal
        this.appendTerminalOutput(`[Status: ${details}]\n`, 'term-status-line');

        // 2. Update the Run button UI states
        const runBtn = this.ideRunBtn;
        if (runBtn) {
          runBtn.className = 'ide-action-btn'; // reset
          if (status === 'compiling') {
            runBtn.textContent = '🟡 Compiling...';
            runBtn.classList.add('compiling');
          } else if (status === 'running') {
            runBtn.textContent = '🟢 Running...';
            runBtn.classList.add('running');
            this.appendTerminalOutput(`[Program Output]\n`, 'term-header-program');
          } else if (status === 'completed') {
            runBtn.textContent = '▶ Run';
            this.notifications.show(`Execution completed for ${this.currentFile}`, 'success');
            this.lastRunFailed = false;
            this.updateProjectHealth();
          } else if (status === 'failed') {
            runBtn.textContent = '▶ Run';
            this.appendTerminalOutput(`[Error: ${details}]\n`, 'term-stderr');
            this.notifications.show(`Execution failed: ${details}`, 'danger');
            this.lastRunFailed = true;
            this.updateProjectHealth();
          }
        }
        break;
      }

      case 'runOutput': {
        const { category, text } = msg;
        if (category === 'compile_error') {
          this.appendTerminalOutput(`\n[Compilation Error]\n`, 'term-header-compilation');
          this.appendTerminalOutput(text, 'term-stderr');
        } else {
          this.appendTerminalOutput(text, category === 'stderr' ? 'term-stderr' : 'term-stdout');
        }
        break;
      }
    }
  }

  fetchActivityHistory() {
    this.sendJSON({ type: 'getActivityHistory' });
  }

  switchFile(fileName) {
    if (fileName === this.currentFile) return;
    this.currentFile = fileName;
    
    // Highlight in tab list immediately
    this.renderFileTabs();
    this.renderFileExplorer();

    // Bind empty document and set language
    this.editor.bindDocument(null);
    this.editor.setLanguageForFile(fileName);
    if (this.currentFileEl) {
      this.currentFileEl.textContent = fileName;
    }

    // Notify WS server about file switch
    this.sendJSON({
      type: 'switchFile',
      file: fileName
    });
    this.updateDebugPanel();
  }

  // ── Local Change Handlers ────────────────────────────────
  
  handleLocalContentChange(update) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`📤 UPDATE_SENT file=${this.currentFile} size=${update.byteLength || update.length || 0}`);
      this.ws.send(update);
    } else {
      console.warn(`⚠️ UPDATE_NOT_SENT file=${this.currentFile} wsState=${this.ws?.readyState}`);
    }
  }

  handleLocalCursorChange(position) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJSON({
        type: 'cursor',
        cursor: {
          lineNumber: position.lineNumber,
          column: position.column
        }
      });
    }
  }

  // ── UI Rendering ──────────────────────────────────────────
  
  renderFileTabs() {
    const tabsList = document.getElementById('editor-tabs-list');
    if (!tabsList) return;
    
    tabsList.innerHTML = '';
    
    this.files.forEach(fileName => {
      const tab = document.createElement('div');
      tab.className = `tab-item ${fileName === this.currentFile ? 'active' : ''}`;
      tab.dataset.file = fileName;
      
      tab.onclick = (e) => {
        if (e.target.closest('.tab-close-btn')) return;
        this.switchFile(fileName);
      };
      
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.textContent = this.getFileIcon(fileName);
                         
      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = fileName;
      
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleDeleteFile(fileName);
      };
      
      tab.appendChild(icon);
      tab.appendChild(name);
      tab.appendChild(closeBtn);
      
      tabsList.appendChild(tab);
    });
    
    // Add '+' tab-add-btn at the end
    const addBtn = document.createElement('button');
    addBtn.className = 'tab-add-btn';
    addBtn.id = 'new-file-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Create New File';
    addBtn.onclick = () => this.handleCreateFile();
    tabsList.appendChild(addBtn);
  }

  renderFileExplorer() {
    const explorer = document.getElementById('file-explorer');
    if (!explorer) return;

    explorer.innerHTML = '';
    
    // Simple flat tree for now, can be improved to handle folders
    const root = document.createElement('div');
    root.className = 'tree-item folder';
    root.innerHTML = `<span class="icon">📁</span> <span class="label">workspace</span>`;
    explorer.appendChild(root);

    const children = document.createElement('div');
    children.className = 'tree-children';
    
    this.files.forEach(fileName => {
      const item = document.createElement('div');
      item.className = `tree-item ${fileName === this.currentFile ? 'active' : ''}`;
      item.innerHTML = `<span class="icon">${this.getFileIcon(fileName)}</span> <span class="label">${fileName}</span>`;
      item.onclick = () => this.switchFile(fileName);
      children.appendChild(item);
    });

    explorer.appendChild(children);
  }

  getFileIcon(fileName) {
    if (fileName.endsWith('.js')) return '🟨';
    if (fileName.endsWith('.css')) return '🟦';
    if (fileName.endsWith('.html')) return '🟥';
    if (fileName.endsWith('.cpp')) return '📄';
    if (fileName.endsWith('.json')) return '⚙️';
    return '📄';
  }

  async handleCreateFile() {
    const fileName = prompt('Enter the name of the new file (e.g. auth.js):');
    if (!fileName) return;
    const cleanName = fileName.trim();
    if (!cleanName) return;

    try {
      const response = await fetch('/api/project/create-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: cleanName,
          content: `// ${cleanName}\n`,
          userName: this.presence.currentUser?.name || 'anonymous'
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create file');
      }
      this.notifications.show(`Created file ${cleanName}`, 'success');
    } catch (err) {
      console.error(err);
      this.notifications.show(err.message, 'danger');
    }
  }

  async handleRenameFile(oldName) {
    const newName = prompt(`Rename file ${oldName} to:`, oldName);
    if (!newName) return;
    const cleanNewName = newName.trim();
    if (!cleanNewName || cleanNewName === oldName) return;

    try {
      const response = await fetch('/api/project/rename-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName,
          newName: cleanNewName,
          userName: this.presence.currentUser?.name || 'anonymous'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to rename file');
      }
      this.notifications.show(`Renamed ${oldName} to ${cleanNewName}`, 'success');
      
      // If we were editing the renamed file, switch client state to the new name
      if (this.currentFile === oldName) {
        this.currentFile = cleanNewName;
        if (this.currentFileEl) {
          this.currentFileEl.textContent = cleanNewName;
        }
      }
    } catch (err) {
      console.error(err);
      this.notifications.show(err.message, 'danger');
    }
  }

  async handleDeleteFile(fileName) {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      const response = await fetch('/api/project/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          userName: this.presence.currentUser?.name || 'anonymous'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete file');
      }
      this.notifications.show(`Deleted file ${fileName}`, 'success');
    } catch (err) {
      console.error(err);
      this.notifications.show(err.message, 'danger');
    }
  }

  appendActivityEvent(e) {
    if (!this.activityListEl) return;

    const item = document.createElement('div');
    item.className = 'activity-item activity-new';

    const content = document.createElement('div');
    content.className = 'activity-content';

    const userSpan = document.createElement('span');
    userSpan.className = 'activity-user';
    userSpan.textContent = e.user;

    const actionText = document.createTextNode(
      e.action === 'joined' ? ' joined the workspace' :
      e.action === 'left' ? ' left the workspace' :
      e.action === 'created_file' ? ' created ' : ' edited '
    );

    const targetSpan = document.createElement('span');
    targetSpan.className = 'activity-target';
    targetSpan.style.color = 'var(--accent-color)';
    targetSpan.textContent = e.target;

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = this.formatTime(e.timestamp);

    content.appendChild(userSpan);
    content.appendChild(actionText);
    content.appendChild(targetSpan);
    content.appendChild(time);
    
    item.appendChild(content);

    // Insert at top of activity feed (chronological reverse)
    this.activityListEl.insertBefore(item, this.activityListEl.firstChild);
  }

  formatTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  updateStatus(state, label) {
    if (!this.statusIndicator || !this.statusText) return;
    
    this.statusIndicator.className = 'status-indicator';
    this.statusIndicator.classList.add(`status-${state}`);
    this.statusText.textContent = label;
  }

  updateDebugPanel() {
    // Legacy debugging panel states updated inside parameters if needed
  }



  // ── Terminal Integration ─────────────────────────────────

  initTerminal() {
    const termInput = document.getElementById('terminal-input');
    const termOutput = document.getElementById('terminal-output');
    const clearBtn = document.getElementById('terminal-clear-btn');
    if (!termInput || !termOutput) return;

    // Show welcome message
    this.appendTerminalOutput('[Terminal ready. Type commands below.]\n', 'term-info');
    this.terminalReady = true;

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = termInput.value;
        if (!cmd.trim()) return;

        // Add to history
        this.terminalHistory.push(cmd);
        if (this.terminalHistory.length > 50) this.terminalHistory.shift();
        this.terminalHistoryIndex = this.terminalHistory.length;

        // Echo command in output
        this.appendTerminalOutput(`> ${cmd}\n`, 'term-cmd');

        // Send to backend
        this.sendJSON({ type: 'terminalInput', input: cmd + '\n' });

        termInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.terminalHistoryIndex > 0) {
          this.terminalHistoryIndex--;
          termInput.value = this.terminalHistory[this.terminalHistoryIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.terminalHistoryIndex < this.terminalHistory.length - 1) {
          this.terminalHistoryIndex++;
          termInput.value = this.terminalHistory[this.terminalHistoryIndex];
        } else {
          this.terminalHistoryIndex = this.terminalHistory.length;
          termInput.value = '';
        }
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        termOutput.innerHTML = '';
      });
    }
  }

  appendTerminalOutput(text, className = 'term-stdout') {
    const termOutput = document.getElementById('terminal-output');
    if (!termOutput) return;

    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    termOutput.appendChild(span);

    // Auto-scroll to bottom
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  switchToTerminalTab() {
    setTimeout(() => {
      const termInput = document.getElementById('terminal-input');
      if (termInput) termInput.focus();
    }, 100);
  }

  // ── Run Logic ───────────────────────────────────────────

  runCurrentFile(fileOverride) {
    const fileToRun = fileOverride || this.currentFile;
    if (!fileToRun) {
      this.notifications.show('No file selected to run.', 'danger');
      return;
    }

    const ext = fileToRun.split('.').pop().toLowerCase();
    
    // Check supported runnable formats
    if (ext !== 'js' && ext !== 'py' && ext !== 'cpp' && ext !== 'html') {
      this.notifications.show(`File type .${ext} cannot be executed.`, 'info');
      return;
    }

    // Switch to layout containing terminal
    this.switchToTerminalTab();

    // Echo running message
    this.appendTerminalOutput(`\n▶ Running ${fileToRun}\n`, 'term-success');

    // Request backend to run file asynchronously
    this.sendJSON({ type: 'runFile', file: fileToRun });
  }

  sendJSON(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // ── Live Demo Scenarios & AI Automations ───────────────────────

  initDemoActions() {
    // 1. Live Demo Trigger Fail State & Reset buttons
    const btnTriggerFail = document.getElementById('btn-trigger-fail');
    const btnResetDemo = document.getElementById('btn-reset-demo');
    
    if (btnTriggerFail) {
      btnTriggerFail.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/demo/fail', { method: 'POST' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.lastRunFailed = true;
          this.notifications.show("LIVE DEMO: Deployment failure scenario loaded!", "warning");
          
          // Switch current file to hi.cpp and reload
          if (this.currentFile === 'hi.cpp') {
            this.editor.bindDocument(null);
            this.connectWebSocket();
          } else {
            this.switchFile('hi.cpp');
          }
          
          await this.updateProjectHealth();
          
          // Close settings modal to reveal centerpiece
          document.getElementById('settings-modal')?.classList.add('hidden');
        } catch (err) {
          this.notifications.show(`Failed to load fail scenario: ${err.message}`, 'danger');
        }
      });
    }
    
    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/demo/reset', { method: 'POST' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.lastRunFailed = false;
          this.notifications.show("LIVE DEMO: Workspace restored to clean passing state!", "success");
          
          if (this.currentFile === 'hi.cpp') {
            this.editor.bindDocument(null);
            this.connectWebSocket();
          } else {
            this.switchFile('hi.cpp');
          }
          
          await this.updateProjectHealth();
          document.getElementById('settings-modal')?.classList.add('hidden');
        } catch (err) {
          this.notifications.show(`Failed to reset workspace: ${err.message}`, 'danger');
        }
      });
    }

    // 2. AI Catch Me Up
    const btnCatchup = document.getElementById('btn-catch-me-up');
    if (btnCatchup) {
      btnCatchup.addEventListener('click', () => {
        this.applyPersonality('manager');
        btnCatchup.style.animation = 'avatarScalePulse 0.4s ease';
        setTimeout(() => { btnCatchup.style.animation = ''; }, 400);
        this.aiPanel.handleSendMessage("Please analyze the workspace memory and recent activity logs. Give me a concise, high-impact 'Catch Me Up' briefing: summarize recent edits, online users' activities, pipeline status, and what concrete tasks we need to prioritize next.");
      });
    }

    // 3. AI Review File
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        this.applyPersonality('reviewer');
        reviewBtn.style.animation = 'avatarScalePulse 0.4s ease';
        setTimeout(() => { reviewBtn.style.animation = ''; }, 400);
        this.aiPanel.handleSendMessage(`Deeply review the active file: ${this.currentFile}. Inspect syntax, structure, quality, possible security flaws, and performance. Give me a clean bulleted review card with line-specific improvements.`);
      });
    }

    // 4. Team Consultation Mode
    const btnTeamConsult = document.getElementById('btn-team-consult');
    if (btnTeamConsult) {
      btnTeamConsult.addEventListener('click', () => {
        this.applyPersonality('manager');
        btnTeamConsult.style.animation = 'avatarScalePulse 0.4s ease';
        setTimeout(() => { btnTeamConsult.style.animation = ''; }, 400);
        this.aiPanel.handleSendMessage("Run Team Consultation Mode. Provide a combined response panel containing brief feedback from our core AI specialists: 👔 Engineering Manager (timeline/scoping), 🔍 Code Reviewer (code quality and suggestions for the active file), 🚀 DevOps Specialist (run safety), and 🛡️ Security Analyst (settings security/OWASP checks). Format each response under a distinct specialist subheader.");
      });
    }
  }

  initReplayEngine() {
    const btnReplay = document.getElementById('btn-workspace-replay');
    const modalReplay = document.getElementById('replay-modal');
    const btnCloseReplay = document.getElementById('replay-modal-close');
    const btnPlay = document.getElementById('replay-btn-play');
    const btnPrev = document.getElementById('replay-btn-prev');
    const btnNext = document.getElementById('replay-btn-next');
    const slider = document.getElementById('replay-slider');
    
    const lblStatus = document.getElementById('replay-status-lbl');
    const lblTime = document.getElementById('replay-time-lbl');
    const elAction = document.getElementById('replay-event-action');
    const elTime = document.getElementById('replay-event-time');
    const elUser = document.getElementById('replay-event-user');
    const elTarget = document.getElementById('replay-event-target');
    const elDetails = document.getElementById('replay-event-details');

    this.replayEvents = [];
    this.replayIndex = -1;
    this.replayInterval = null;

    if (btnReplay && modalReplay) {
      btnReplay.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/project/activity?count=100');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Chronological oldest to newest
          this.replayEvents = (data.events || []).slice().reverse();
          
          if (this.replayEvents.length > 0) {
            slider.max = this.replayEvents.length - 1;
            slider.min = 0;
            slider.value = 0;
            this.replayIndex = 0;
            this.showReplayEvent(0);
          } else {
            slider.max = 0;
            slider.min = 0;
            slider.value = 0;
            this.replayIndex = -1;
            if (elDetails) elDetails.textContent = 'No events found in activity log.';
          }
          modalReplay.classList.remove('hidden');
        } catch (err) {
          this.notifications.show(`Failed to load activity logs for replay: ${err.message}`, 'danger');
        }
      });
    }

    if (btnCloseReplay && modalReplay) {
      btnCloseReplay.addEventListener('click', () => {
        if (this.replayInterval) {
          clearInterval(this.replayInterval);
          this.replayInterval = null;
        }
        if (btnPlay) btnPlay.textContent = '▶';
        if (lblStatus) lblStatus.textContent = 'Paused';
        modalReplay.classList.add('hidden');
      });
    }

    const stopPlayback = () => {
      if (this.replayInterval) {
        clearInterval(this.replayInterval);
        this.replayInterval = null;
        if (btnPlay) btnPlay.textContent = '▶';
        if (lblStatus) lblStatus.textContent = 'Paused';
      }
    };

    if (slider) {
      slider.addEventListener('input', () => {
        stopPlayback();
        this.replayIndex = parseInt(slider.value);
        this.showReplayEvent(this.replayIndex);
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (this.replayEvents.length === 0) return;
        
        if (this.replayInterval) {
          stopPlayback();
        } else {
          lblStatus.textContent = 'Playing';
          btnPlay.textContent = '⏸';
          this.replayInterval = setInterval(() => {
            if (this.replayIndex < this.replayEvents.length - 1) {
              this.replayIndex++;
              slider.value = this.replayIndex;
              this.showReplayEvent(this.replayIndex);
            } else {
              this.replayIndex = 0;
              slider.value = 0;
              this.showReplayEvent(0);
            }
          }, 1500);
        }
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        stopPlayback();
        if (this.replayIndex > 0) {
          this.replayIndex--;
          slider.value = this.replayIndex;
          this.showReplayEvent(this.replayIndex);
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        stopPlayback();
        if (this.replayIndex < this.replayEvents.length - 1) {
          this.replayIndex++;
          slider.value = this.replayIndex;
          this.showReplayEvent(this.replayIndex);
        }
      });
    }
  }

  showReplayEvent(index) {
    if (index < 0 || index >= this.replayEvents.length) return;
    const e = this.replayEvents[index];
    
    const lblStatus = document.getElementById('replay-status-lbl');
    const lblTime = document.getElementById('replay-time-lbl');
    const elAction = document.getElementById('replay-event-action');
    const elTime = document.getElementById('replay-event-time');
    const elUser = document.getElementById('replay-event-user');
    const elTarget = document.getElementById('replay-event-target');
    const elDetails = document.getElementById('replay-event-details');

    if (lblTime) lblTime.textContent = `Event ${index + 1} of ${this.replayEvents.length}`;
    if (elAction) {
      elAction.textContent = e.action;
      if (e.action === 'pipeline_failed' || e.action.includes('error') || e.action.includes('fail')) {
        elAction.style.color = 'var(--danger)';
      } else if (e.action === 'pipeline_passed' || e.action.includes('success') || e.action.includes('pass')) {
        elAction.style.color = 'var(--success)';
      } else {
        elAction.style.color = 'var(--accent-color)';
      }
    }
    if (elTime) elTime.textContent = new Date(e.timestamp).toLocaleTimeString();
    if (elUser) elUser.textContent = e.user;
    if (elTarget) elTarget.textContent = e.target;
    if (elDetails) {
      elDetails.textContent = e.details ? JSON.stringify(e.details, null, 2) : '(No additional event details)';
    }

    // Node Flash Highlight on map
    const fileToNodeId = {
      'main.js': 'node-server-js',
      'auth.js': 'node-auth-js',
      'jk.html': 'node-login-js',
      'hi.cpp': 'node-middleware-js',
      'database.js': 'node-database-js',
      'config.js': 'node-user-model-js',
      'utils.js': 'node-utils-js',
      'api.js': 'node-routes-js'
    };
    
    const nodeId = fileToNodeId[e.target];
    if (nodeId) {
      const nodeEl = document.getElementById(nodeId);
      if (nodeEl) {
        nodeEl.classList.remove('node-pulse-flash', 'node-pulse-failed', 'node-pulse-success');
        void nodeEl.offsetWidth; // trigger reflow
        
        if (e.action === 'pipeline_failed' || e.action.includes('fail') || e.action.includes('error')) {
          nodeEl.classList.add('node-pulse-failed');
        } else if (e.action === 'pipeline_passed' || e.action.includes('success') || e.action.includes('pass')) {
          nodeEl.classList.add('node-pulse-success');
        } else {
          nodeEl.classList.add('node-pulse-flash');
        }
      }
    }

    // Avatar joins/leaves animation pulse
    if (e.action === 'joined' || e.action === 'left') {
      const avatars = document.getElementById('header-avatars');
      if (avatars) {
        avatars.classList.remove('avatar-pulse-animate');
        void avatars.offsetWidth;
        avatars.classList.add('avatar-pulse-animate');
        setTimeout(() => avatars.classList.remove('avatar-pulse-animate'), 1600);
      }
    }
  }

  // ── Personalization Settings Panel Toggles & Engine ───────────────
  
  initAppearanceSettings() {
    const settingsBtn = document.getElementById('settings-nav-btn');
    const sidebarSettingsBtn = document.getElementById('nav-btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const modalClose = document.getElementById('settings-modal-close');
    
    const themeSelect = document.getElementById('setting-theme');
    const colorPicker = document.getElementById('setting-accent');
    const transparencySlider = document.getElementById('setting-transparency');
    const blurSlider = document.getElementById('setting-blur');
    const fontSizeSlider = document.getElementById('setting-font-size');
    const zoomSlider = document.getElementById('setting-editor-zoom');
    const sidebarSlider = document.getElementById('setting-sidebar-width');
    const radiusSlider = document.getElementById('setting-panel-radius');
    const glowSlider = document.getElementById('setting-glow-intensity');
    const bgSelect = document.getElementById('setting-bg-engine');
    const personaSelect = document.getElementById('setting-persona');
    
    // Snapshots
    const btnSave = document.getElementById('btn-save-theme');
    const btnLoad = document.getElementById('btn-load-theme');
    const btnExport = document.getElementById('btn-export-profile');
    const btnImport = document.getElementById('btn-import-profile');
    const fileUpload = document.getElementById('profile-upload');

    // 1. Settings tab selectors
    const tabButtons = document.querySelectorAll('.settings-tab-btn');
    const panes = document.querySelectorAll('.settings-pane');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // 2. Modal toggling
    const openModal = () => { if (settingsModal) settingsModal.classList.remove('hidden'); };
    const closeModal = () => { if (settingsModal) settingsModal.classList.add('hidden'); };
    
    if (settingsBtn) settingsBtn.addEventListener('click', openModal);
    if (sidebarSettingsBtn) sidebarSettingsBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
      });
    }

    // 3. Load cache config theme
    const theme = localStorage.getItem('setting_theme') || 'glassmorphism';
    const accent = localStorage.getItem('setting_accent') || '#fc6d26';
    const transparency = localStorage.getItem('setting_transparency') || '80';
    const blur = localStorage.getItem('setting_blur') || '12';
    const fontSize = localStorage.getItem('setting_font_size') || '13';
    const editorZoom = localStorage.getItem('setting_editor_zoom') || '100';
    const sidebarWidth = localStorage.getItem('setting_sidebar_width') || '220';
    const panelRadius = localStorage.getItem('setting_panel_radius') || '12';
    const glowIntensity = localStorage.getItem('setting_glow_intensity') || '80';
    const bgEngine = localStorage.getItem('setting_bg_engine') || 'aurora';
    const persona = localStorage.getItem('setting_persona') || 'manager';

    // 4. Attach change change listeners
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        localStorage.setItem('setting_theme', newTheme);
        this.applyTheme(newTheme);
        this.applyTransparency(localStorage.getItem('setting_transparency') || '80');
      });
    }

    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_accent', val);
        this.applyAccentColor(val);
      });
    }

    if (transparencySlider) {
      transparencySlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_transparency', val);
        this.applyTransparency(val);
      });
    }

    if (blurSlider) {
      blurSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_blur', val);
        this.applyBlur(val);
      });
    }

    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_font_size', val);
        this.applyFontSize(val);
      });
    }

    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_editor_zoom', val);
        this.applyEditorZoom(val);
      });
    }

    if (sidebarSlider) {
      sidebarSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_sidebar_width', val);
        this.applySidebarWidth(val);
      });
    }

    if (radiusSlider) {
      radiusSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_panel_radius', val);
        this.applyPanelRadius(val);
      });
    }

    if (glowSlider) {
      glowSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_glow_intensity', val);
        this.applyGlowIntensity(val);
      });
    }

    if (bgSelect) {
      bgSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.applyBgEngine(val);
      });
    }

    if (personaSelect) {
      personaSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_persona', val);
        this.applyPersonality(val);
      });
    }

    // Attach presets click events
    const presets = document.querySelectorAll('.accent-preset');
    presets.forEach(p => {
      p.addEventListener('click', () => {
        const val = p.getAttribute('data-preset');
        if (val) {
          localStorage.setItem('setting_accent', val);
          if (colorPicker) colorPicker.value = val;
          this.applyAccentColor(val);
        }
      });
    });

    // Wire snapshot operations
    if (btnSave) btnSave.addEventListener('click', () => this.saveThemeSnapshot());
    if (btnLoad) btnLoad.addEventListener('click', () => this.loadThemeSnapshot());
    if (btnExport) btnExport.addEventListener('click', () => this.exportProfile());
    if (btnImport && fileUpload) {
      btnImport.addEventListener('click', () => fileUpload.click());
      fileUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importProfile(e.target.files[0]);
        }
      });
    }

    // Reset Appearance
    const btnResetAppearance = document.getElementById('btn-reset-appearance');
    if (btnResetAppearance) {
      btnResetAppearance.addEventListener('click', () => {
        localStorage.removeItem('setting_theme');
        localStorage.removeItem('setting_accent');
        localStorage.removeItem('setting_transparency');
        localStorage.removeItem('setting_blur');
        localStorage.removeItem('setting_font_size');
        localStorage.removeItem('setting_editor_zoom');
        localStorage.removeItem('setting_sidebar_width');
        localStorage.removeItem('setting_panel_radius');
        localStorage.removeItem('setting_glow_intensity');
        localStorage.removeItem('setting_bg_engine');

        this.applyTheme('glassmorphism');
        this.applyAccentColor('#fc6d26');
        this.applyTransparency('80');
        this.applyBlur('12');
        this.applyFontSize('13');
        this.applyEditorZoom('100');
        this.applySidebarWidth('220');
        this.applyPanelRadius('12');
        this.applyGlowIntensity('80');
        this.applyLayout();
        this.applyBgEngine('aurora');

        if (themeSelect) themeSelect.value = 'glassmorphism';
        if (colorPicker) colorPicker.value = '#fc6d26';
        if (transparencySlider) transparencySlider.value = '80';
        if (blurSlider) blurSlider.value = '12';
        if (fontSizeSlider) fontSizeSlider.value = '13';
        if (zoomSlider) zoomSlider.value = '100';
        if (sidebarSlider) sidebarSlider.value = '220';
        if (radiusSlider) radiusSlider.value = '12';
        if (glowSlider) glowSlider.value = '80';
        if (bgSelect) bgSelect.value = 'aurora';

        this.notifications.show("Appearance reset to defaults", "success");
      });
    }

    // 5. Apply Initial Settings
    this.applyTheme(theme);
    this.applyAccentColor(accent);
    this.applyTransparency(transparency);
    this.applyBlur(blur);
    this.applyFontSize(fontSize);
    this.applyEditorZoom(editorZoom);
    this.applySidebarWidth(sidebarWidth);
    this.applyPanelRadius(panelRadius);
    this.applyGlowIntensity(glowIntensity);
    this.applyLayout();
    this.applyBgEngine(bgEngine);
    this.applyPersonality(persona);

    // Sync input components
    if (themeSelect) themeSelect.value = theme;
    if (colorPicker) colorPicker.value = accent;
    if (transparencySlider) transparencySlider.value = transparency;
    if (blurSlider) blurSlider.value = blur;
    if (fontSizeSlider) fontSizeSlider.value = fontSize;
    if (zoomSlider) zoomSlider.value = editorZoom;
    if (sidebarSlider) sidebarSlider.value = sidebarWidth;
    if (radiusSlider) radiusSlider.value = panelRadius;
    if (glowSlider) glowSlider.value = glowIntensity;
    if (bgSelect) bgSelect.value = bgEngine;
    if (personaSelect) personaSelect.value = persona;
  }

  applyTheme(theme) {
    const themes = [
      'theme-gitlab-dark', 'theme-midnight-neon', 'theme-cyber-purple', 
      'theme-ocean-blue', 'theme-forest-green', 'theme-sunset-orange', 
      'theme-hacker-matrix', 'theme-minimal-light', 'theme-glassmorphism'
    ];
    themes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(`theme-${theme}`);
    
    const select = document.getElementById('setting-theme');
    if (select) select.value = theme;
  }

  applyAccentColor(hex) {
    document.documentElement.style.setProperty('--accent-color', hex);
    
    // RGB components calculation
    const rgb = this.hexToRgb(hex);
    if (rgb) {
      document.documentElement.style.setProperty('--accent-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
      document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${hex}, ${hex}cc, ${hex}aa)`);
    }

    const picker = document.getElementById('setting-accent');
    if (picker) picker.value = hex;

    // Highlight active preset
    const presets = document.querySelectorAll('.accent-preset');
    presets.forEach(p => {
      const pColor = p.getAttribute('data-preset');
      if (pColor && pColor.toLowerCase() === hex.toLowerCase()) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  applyTransparency(pct) {
    const intensity = pct / 100;
    
    // Calculate base alpha to scale opacities safely between 0.82 and 0.92
    const alphaBase = 0.82 + intensity * 0.10;
    
    // Map opacities maintaining hierarchy: Mission Brief (brightest/centerpiece) > Workspace Map (second centerpiece) > cards
    const cardOpacity = Math.max(0.80, alphaBase - 0.02);
    const mapOpacity = Math.min(0.94, alphaBase + 0.02);
    const briefOpacity = Math.min(0.98, alphaBase + 0.06);

    document.documentElement.style.setProperty('--glass-alpha', cardOpacity);
    document.documentElement.style.setProperty('--card-opacity', cardOpacity);
    document.documentElement.style.setProperty('--map-opacity', mapOpacity);
    document.documentElement.style.setProperty('--brief-opacity', briefOpacity);

    // 2. Backdrop blur (scales from 0px to 24px)
    const blur = Math.round(intensity * 24);
    document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    const displayBlur = document.getElementById('val-blur');
    if (displayBlur) displayBlur.textContent = `${blur}px`;
    const inputBlur = document.getElementById('setting-blur');
    if (inputBlur) inputBlur.value = blur;

    // 3. Border visibility (scales from 0.02 to 0.25)
    const borderAlpha = 0.02 + intensity * 0.23;
    document.documentElement.style.setProperty('--glass-border-opacity', borderAlpha);

    // 4. Reflection intensity (scales from 0 to 0.15)
    const reflectionAlpha = intensity * 0.15;
    document.documentElement.style.setProperty('--glass-reflection-opacity', reflectionAlpha);
    
    // Toggle application backgrounds to transparent when running inside Electron wrapper
    // to allow Electron's window materials (Mica/Acrylic) and desktop wallpaper to shine through
    const hasElectron = !!(window.electronAPI && window.electronAPI.setWindowOpacity);
    if (hasElectron && intensity < 0.98) {
      document.body.style.background = 'transparent';
      document.documentElement.style.background = 'transparent';
      const layout = document.querySelector('.app-layout');
      if (layout) layout.style.background = 'transparent';
    } else {
      document.body.style.background = 'var(--bg-base)';
      document.documentElement.style.background = 'var(--bg-base)';
      const layout = document.querySelector('.app-layout');
      if (layout) layout.style.background = 'var(--bg-base)';
    }

    // Adjust theme color representation for custom CSS rules
    const theme = localStorage.getItem('setting_theme') || 'glassmorphism';
    const themeGlassBgs = {
      'gitlab-dark': { r: 23, g: 19, b: 31 },
      'midnight-neon': { r: 6, g: 6, b: 20 },
      'cyber-purple': { r: 22, g: 10, b: 36 },
      'ocean-blue': { r: 8, g: 20, b: 38 },
      'forest-green': { r: 6, g: 28, b: 14 },
      'sunset-orange': { r: 30, g: 12, b: 6 },
      'hacker-matrix': { r: 0, g: 20, b: 5 },
      'minimal-light': { r: 255, g: 255, b: 255 },
      'glassmorphism': { r: 20, g: 20, b: 30 } // Premium slate base
    };
    
    const rgb = themeGlassBgs[theme] || themeGlassBgs['glassmorphism'];
    const clampColor = (val) => Math.min(255, Math.max(0, Math.round(val)));
    
    const isLight = theme === 'minimal-light';
    const offsetMap = isLight ? -5 : 5;
    const offsetBrief = isLight ? -10 : 10;
    
    const mapR = clampColor(rgb.r + offsetMap);
    const mapG = clampColor(rgb.g + offsetMap);
    const mapB = clampColor(rgb.b + (isLight ? -5 : 8));
    
    const briefR = clampColor(rgb.r + offsetBrief);
    const briefG = clampColor(rgb.g + offsetBrief);
    const briefB = clampColor(rgb.b + (isLight ? -10 : 15));
    
    document.documentElement.style.setProperty('--glass-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cardOpacity})`);
    document.documentElement.style.setProperty('--card-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cardOpacity})`);
    document.documentElement.style.setProperty('--map-bg', `rgba(${mapR}, ${mapG}, ${mapB}, ${mapOpacity})`);
    document.documentElement.style.setProperty('--brief-bg', `rgba(${briefR}, ${briefG}, ${briefB}, ${briefOpacity})`);

    // Communicate opacity adjustment to the Desktop Wrapper
    if (window.electronAPI && window.electronAPI.setWindowOpacity) {
      window.electronAPI.setWindowOpacity(intensity);
    }

    const display = document.getElementById('val-transparency');
    if (display) display.textContent = `${pct}%`;
  }

  applyBlur(px) {
    document.documentElement.style.setProperty('--glass-blur', `${px}px`);
    const display = document.getElementById('val-blur');
    if (display) display.textContent = `${px}px`;
  }

  applyFontSize(px) {
    document.documentElement.style.setProperty('--font-size-ui', `${px}px`);
    
    // Rescale Monaco editor options
    const zoom = parseInt(localStorage.getItem('setting_editor_zoom') || '100');
    const baseFontSize = parseInt(px);
    const scaledSize = Math.round(baseFontSize * (zoom / 100));
    if (this.editor) {
      this.editor.setFontSize(scaledSize);
    }

    const display = document.getElementById('val-font-size');
    if (display) display.textContent = `${px}px`;
  }

  applyEditorZoom(pct) {
    const baseSize = parseInt(localStorage.getItem('setting_font_size') || '13');
    const scaledSize = Math.round(baseSize * (pct / 100));
    if (this.editor) {
      this.editor.setFontSize(scaledSize);
    }
    const display = document.getElementById('val-editor-zoom');
    if (display) display.textContent = `${pct}%`;
  }

  applySidebarWidth(px) {
    document.documentElement.style.setProperty('--sidebar-width', `${px}px`);
    const display = document.getElementById('val-sidebar-width');
    if (display) display.textContent = `${px}px`;
  }

  applyPanelRadius(px) {
    document.documentElement.style.setProperty('--panel-radius', `${px}px`);
    const display = document.getElementById('val-panel-radius');
    if (display) display.textContent = `${px}px`;
  }

  applyGlowIntensity(pct) {
    document.documentElement.style.setProperty('--glow-intensity', pct / 100);
    const display = document.getElementById('val-glow-intensity');
    if (display) display.textContent = `${pct}%`;
  }

  applyLayout() {
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      const layouts = ['layout-mission-control', 'layout-dev-focus', 'layout-team-collab', 'layout-presentation'];
      layouts.forEach(l => appLayout.classList.remove(l));
      appLayout.classList.add('layout-mission-control');
    }

    // Relayout Monaco container
    if (this.editor && this.editor.editor) {
      setTimeout(() => this.editor.editor.layout(), 100);
    }

    // Refresh codebase node graph connection lines
    setTimeout(() => this.drawMapConnections(), 200);
  }

  applyBgEngine(engine) {
    localStorage.setItem('setting_bg_engine', engine);
    this.runBgAnimation();
    
    const select = document.getElementById('setting-bg-engine');
    if (select) select.value = engine;
  }

  applyPersonality(persona) {
    this.activeAgentId = persona;
    
    const select = document.getElementById('setting-persona');
    if (select) select.value = persona;
    
    // Sync chat panel banners
    const agentDetails = {
      manager: { name: "Tech Lead Manager", avatar: "👔", role: "Active Intel Agent" },
      reviewer: { name: "Senior Code Reviewer", avatar: "🔍", role: "Code Quality Agent" },
      devops: { name: "DevOps Specialist", avatar: "🚀", role: "Deployment & CI/CD Agent" },
      security: { name: "Security Analyst", avatar: "🛡️", role: "Security Analyst Agent" },
      cto: { name: "Startup CTO", avatar: "💡", role: "Startup CTO Agent" },
      pm: { name: "Product Manager", avatar: "📅", role: "Product Manager Agent" }
    };
    
    const details = agentDetails[persona] || agentDetails['manager'];
    
    const bannerAvatar = document.getElementById('agent-banner-avatar');
    const bannerName = document.getElementById('agent-banner-name');
    const bannerRole = document.getElementById('agent-banner-role');
    if (bannerAvatar) bannerAvatar.textContent = details.avatar;
    if (bannerName) bannerName.textContent = details.name;
    if (bannerRole) bannerRole.textContent = details.role;
    
    // Refresh compact agent list
    this.renderAgents();

    if (this.aiPanel && typeof this.aiPanel.setAgent === 'function') {
      this.aiPanel.setAgent(persona);
    }
  }



  // ── Snapshots & Theme Profiles Operations ───────────────────────
  
  saveThemeSnapshot() {
    const config = {
      theme: localStorage.getItem('setting_theme') || 'glassmorphism',
      accent: localStorage.getItem('setting_accent') || '#fc6d26',
      transparency: localStorage.getItem('setting_transparency') || '80',
      blur: localStorage.getItem('setting_blur') || '12',
      fontSize: localStorage.getItem('setting_font_size') || '13',
      editorZoom: localStorage.getItem('setting_editor_zoom') || '100',
      sidebarWidth: localStorage.getItem('setting_sidebar_width') || '220',
      panelRadius: localStorage.getItem('setting_panel_radius') || '12',
      glowIntensity: localStorage.getItem('setting_glow_intensity') || '80',
      bgEngine: localStorage.getItem('setting_bg_engine') || 'aurora',
      persona: localStorage.getItem('setting_persona') || 'manager'
    };
    localStorage.setItem('gitlabs_theme_snapshot', JSON.stringify(config));
    this.notifications.show("Workspace theme snapshot saved to local storage!", "success");
  }

  loadThemeSnapshot() {
    const raw = localStorage.getItem('gitlabs_theme_snapshot');
    if (!raw) {
      this.notifications.show("No saved snapshot found in cache storage.", "warning");
      return;
    }
    try {
      const config = JSON.parse(raw);
      this.applyProfileConfig(config);
      this.notifications.show("Workspace theme snapshot restored!", "success");
    } catch (e) {
      this.notifications.show("Failed to load snapshot.", "danger");
    }
  }

  exportProfile() {
    const config = {
      theme: localStorage.getItem('setting_theme') || 'glassmorphism',
      accent: localStorage.getItem('setting_accent') || '#fc6d26',
      transparency: localStorage.getItem('setting_transparency') || '80',
      blur: localStorage.getItem('setting_blur') || '12',
      fontSize: localStorage.getItem('setting_font_size') || '13',
      editorZoom: localStorage.getItem('setting_editor_zoom') || '100',
      sidebarWidth: localStorage.getItem('setting_sidebar_width') || '220',
      panelRadius: localStorage.getItem('setting_panel_radius') || '12',
      glowIntensity: localStorage.getItem('setting_glow_intensity') || '80',
      bgEngine: localStorage.getItem('setting_bg_engine') || 'aurora',
      persona: localStorage.getItem('setting_persona') || 'manager'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-profile.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notifications.show("Profile exported as workspace-profile.json.", "success");
  }

  importProfile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        this.applyProfileConfig(config);
        this.notifications.show("Workspace profile configuration restored!", "success");
      } catch (err) {
        this.notifications.show("Invalid JSON configuration profile format.", "danger");
      }
    };
    reader.readAsText(file);
  }

  applyProfileConfig(config) {
    if (config.theme) { localStorage.setItem('setting_theme', config.theme); this.applyTheme(config.theme); }
    if (config.accent) { localStorage.setItem('setting_accent', config.accent); this.applyAccentColor(config.accent); }
    if (config.transparency) { localStorage.setItem('setting_transparency', config.transparency); this.applyTransparency(config.transparency); }
    if (config.blur) { localStorage.setItem('setting_blur', config.blur); this.applyBlur(config.blur); }
    if (config.fontSize) { localStorage.setItem('setting_font_size', config.fontSize); this.applyFontSize(config.fontSize); }
    if (config.editorZoom) { localStorage.setItem('setting_editor_zoom', config.editorZoom); this.applyEditorZoom(config.editorZoom); }
    if (config.sidebarWidth) { localStorage.setItem('setting_sidebar_width', config.sidebarWidth); this.applySidebarWidth(config.sidebarWidth); }
    if (config.panelRadius) { localStorage.setItem('setting_panel_radius', config.panelRadius); this.applyPanelRadius(config.panelRadius); }
    if (config.glowIntensity) { localStorage.setItem('setting_glow_intensity', config.glowIntensity); this.applyGlowIntensity(config.glowIntensity); }
    if (config.bgEngine) { localStorage.setItem('setting_bg_engine', config.bgEngine); this.applyBgEngine(config.bgEngine); }
    if (config.persona) { localStorage.setItem('setting_persona', config.persona); this.applyPersonality(config.persona); }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // ── Agent Dock & Switcher ─────────────────────────────────────────

  initAgentDock() {
    this.renderAgents();
  }

  renderAgents() {
    const agentList = document.getElementById('agent-list');
    if (!agentList) return;

    const agents = [
      { id: 'manager', name: 'Engineering Manager', icon: '🧠', status: 'Active' },
      { id: 'reviewer', name: 'Code Reviewer', icon: '🔍', status: 'Active' },
      { id: 'devops', name: 'DevOps Engineer', icon: '🚀', status: 'Active' },
      { id: 'security', name: 'Security Analyst', icon: '🛡', status: 'Idle' },
      { id: 'planner', name: 'Planner', icon: '📋', status: 'Active' }
    ];

    agentList.innerHTML = '';
    agents.forEach(agent => {
      const row = document.createElement('div');
      row.className = `agent-row-compact ${agent.id === this.activeAgentId ? 'active' : ''}`;
      row.dataset.agent = agent.id;
      
      const dot = agent.status === 'Active' ? '●' : '○';
      const statusClass = agent.status === 'Active' ? 'status-active' : 'status-idle';
      
      row.innerHTML = `
        <div class="agent-info">
          <span class="agent-icon">${agent.icon}</span>
          <span class="agent-name">${agent.name}</span>
        </div>
        <div class="agent-status ${statusClass}">
          <span class="status-dot">${dot}</span>
          <span class="status-text">${agent.status}</span>
        </div>
      `;
      
      row.onclick = () => {
        this.activeAgentId = agent.id;
        this.applyPersonality(agent.id);
        this.renderAgents();
        this.notifications.show(`Switched to ${agent.name}`, 'info');
      };
      
      agentList.appendChild(row);
    });
  }

  // ── Canvas Background Engine ──────────────────────────────────────
  
  initBgCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    this.bgCanvas = canvas;
    this.bgCtx = canvas.getContext('2d');
    
    // Resize handler
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    this.bgAnimFrame = null;
    this.bgTimer = 0;
    
    // Start animation loop
    this.runBgAnimation();
  }
  
  runBgAnimation() {
    if (this.bgAnimFrame) {
      cancelAnimationFrame(this.bgAnimFrame);
    }
    
    const engine = localStorage.getItem('setting_bg_engine') || 'aurora';
    const ctx = this.bgCtx;
    const canvas = this.bgCanvas;
    if (!ctx || !canvas) return;
    
    // Initialize node grid points if using neural network grid
    if (engine === 'neural') {
      this.neuralNodes = [];
      const numNodes = 45;
      for (let i = 0; i < numNodes; i++) {
        this.neuralNodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1
        });
      }
    }
    
    // Initialize particle array if using particles
    if (engine === 'particles') {
      this.particles = [];
      const numParticles = 60;
      for (let i = 0; i < numParticles; i++) {
        this.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: Math.random() * 0.3 - 0.4, // float up
          r: Math.random() * 3 + 1,
          alpha: Math.random() * 0.5 + 0.1
        });
      }
    }
    
    const draw = () => {
      this.bgTimer += 0.005;
      const w = canvas.width;
      const h = canvas.height;
      
      if (engine === 'solid') {
        ctx.clearRect(0, 0, w, h);
      } 
      else if (engine === 'gradient') {
        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h));
        grad.addColorStop(0, 'rgba(30, 20, 45, 0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } 
      else if (engine === 'aurora') {
        ctx.clearRect(0, 0, w, h);
        
        // Draw floating smooth gradient blobs
        const blobs = [
          { x: w * 0.2 + Math.sin(this.bgTimer) * 100, y: h * 0.3 + Math.cos(this.bgTimer * 0.8) * 80, r: 250, color: 'rgba(252, 109, 38, 0.05)' },
          { x: w * 0.8 + Math.cos(this.bgTimer * 0.9) * 120, y: h * 0.7 + Math.sin(this.bgTimer * 1.1) * 90, r: 300, color: 'rgba(155, 93, 229, 0.04)' },
          { x: w * 0.5 + Math.sin(this.bgTimer * 0.7) * 150, y: h * 0.5 + Math.cos(this.bgTimer * 1.2) * 100, r: 280, color: 'rgba(0, 187, 249, 0.04)' }
        ];
        
        blobs.forEach(b => {
          const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
          g.addColorStop(0, b.color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        });
      } 
      else if (engine === 'neural') {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        
        // Update nodes position
        this.neuralNodes.forEach((n, idx) => {
          n.x += n.vx;
          n.y += n.vy;
          
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
          
          // Connect close nodes
          for (let j = idx + 1; j < this.neuralNodes.length; j++) {
            const o = this.neuralNodes[j];
            const dist = Math.hypot(n.x - o.x, n.y - o.y);
            if (dist < 100) {
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * (1 - dist / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(n.x, n.y);
              ctx.lineTo(o.x, o.y);
              ctx.stroke();
            }
          }
        });
      } 
      else if (engine === 'particles') {
        ctx.clearRect(0, 0, w, h);
        
        this.particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0) {
            p.y = h;
            p.x = Math.random() * w;
          }
          
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
      } 
      else if (engine === 'cyber') {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 0.5;
        
        // Draw grid
        const step = 40;
        const offset = (this.bgTimer * 20) % step;
        
        for (let x = offset; x < w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        
        for (let y = offset; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      } 
      else if (engine === 'waves') {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(252, 109, 38, 0.015)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        for (let x = 0; x < w; x += 5) {
          const y = h * 0.5 + Math.sin(x * 0.005 + this.bgTimer) * 40 + Math.cos(x * 0.002 - this.bgTimer * 0.5) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(155, 93, 229, 0.012)';
        ctx.beginPath();
        for (let x = 0; x < w; x += 5) {
          const y = h * 0.6 + Math.sin(x * 0.003 - this.bgTimer * 0.8) * 30 + Math.cos(x * 0.004 + this.bgTimer * 0.3) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      
      this.bgAnimFrame = requestAnimationFrame(draw);
    };
    
    this.bgAnimFrame = requestAnimationFrame(draw);
  }

  // ── Interactive Codebase Graph Map Navigation ────────────────────
  
  initWorkspaceMap() {
    const nodes = document.querySelectorAll('.map-node');
    nodes.forEach(node => {
      node.addEventListener('click', () => {
        const file = node.getAttribute('data-file');
        if (file) {
          this.switchFile(file);
          this.notifications.show(`Navigated to codebase module: ${file}`, 'success');
        }
      });
    });
    
    // Initial draw and schedule resize listener
    this.drawMapConnections();
    window.addEventListener('resize', () => this.drawMapConnections());
    
    // Draw connection paths periodically to handle layout loading states
    setInterval(() => this.drawMapConnections(), 2000);
  }

  drawMapConnections() {
    const svg = document.getElementById('map-connections-svg');
    const container = document.getElementById('workspace-map-graph');
    if (!svg || !container) return;
    
    // Clear old connector lines
    svg.innerHTML = '';
    
    const connections = [
      ['node-auth-js', 'node-server-js'],
      ['node-login-js', 'node-server-js'],
      ['node-middleware-js', 'node-server-js'],
      ['node-database-js', 'node-server-js'],
      ['node-user-model-js', 'node-database-js'],
      ['node-utils-js', 'node-server-js'],
      ['node-routes-js', 'node-server-js']
    ];
    
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;
    
    connections.forEach(([fromId, toId]) => {
      const fromEl = document.getElementById(fromId);
      const toEl = document.getElementById(toId);
      if (!fromEl || !toEl) return;
      
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      
      // Compute connection nodes center points relative to container
      const x1 = (fromRect.left + fromRect.width / 2) - containerRect.left;
      const y1 = (fromRect.top + fromRect.height / 2) - containerRect.top;
      
      const x2 = (toRect.left + toRect.width / 2) - containerRect.left;
      const y2 = (toRect.top + toRect.height / 2) - containerRect.top;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cx1 = (x1 + x2) / 2;
      const cy1 = y1;
      const cx2 = (x1 + x2) / 2;
      const cy2 = y2;
      
      const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'var(--accent-glow, rgba(252, 109, 38, 0.2))');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'connection-line');
      
      svg.appendChild(path);
    });
  }

  // ── Project Health Telemetry Card Calculations ───────────────────

  async updateProjectHealth() {
    try {
      const res = await fetch('/api/project/summary');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const summary = await res.json();
      
      const stats = summary.stats || {};
      const totalFiles = stats.totalFiles || 0;
      const totalEvents = stats.totalEvents || 0;

      // Dynamic telemetry inputs
      const mrs = Math.max(1, (totalFiles % 3) + 1);
      const issues = Math.max(1, 5 - Math.floor(totalEvents / 15));
      const testPct = 98; // base unit test coverage %
      const securityIssues = 0; // security vulnerability alerts count
      const pipelineStatus = this.lastRunFailed ? 'Failed' : 'Passing';
      
      // Task 8: Dynamic Project Readiness Score computation
      let readiness = 100;
      if (pipelineStatus === 'Failed') readiness -= 35;
      readiness -= mrs * 5;
      readiness -= issues * 4;
      readiness -= Math.round((100 - testPct) * 0.5);
      if (securityIssues > 0) readiness -= 15;
      readiness = Math.min(100, Math.max(10, readiness));

      // Render health grid elements
      const readinessEl = document.getElementById('health-readiness');
      const healthCircle = document.getElementById('health-progress-circle');
      const ratingEl = document.getElementById('health-rating');
      
      const pipelineEl = document.getElementById('health-pipeline');
      const mrsEl = document.getElementById('health-mrs');
      const issuesEl = document.getElementById('health-issues');

      if (readinessEl) readinessEl.textContent = `${readiness}%`;
      
      // Update circular SVG progress dashes: Circumference of R=36 circle is 2*PI*36 = 226.19
      if (healthCircle) {
        const offset = 226.19 * (1 - readiness / 100);
        healthCircle.style.strokeDashoffset = offset;
      }
      
      if (ratingEl) {
        ratingEl.textContent = readiness >= 90 ? 'Excellent' : 
                               readiness >= 75 ? 'Good' :
                               readiness >= 50 ? 'Fair' : 'Critical';
      }

      if (pipelineEl) {
        pipelineEl.textContent = pipelineStatus;
        if (pipelineStatus === 'Failed') {
          pipelineEl.className = 'health-stat-val badge-danger';
        } else {
          pipelineEl.className = 'health-stat-val badge-success';
        }
      }

      if (mrsEl) mrsEl.textContent = `${mrs} Open`;
      if (issuesEl) issuesEl.textContent = `${issues} Open`;

      // Update Deploy status banner and action controls
      const banner = document.getElementById('deploy-status-banner');
      const bannerIcon = document.getElementById('deploy-status-icon');
      const bannerTitle = document.getElementById('deploy-status-title');
      const bannerDesc = document.getElementById('deploy-status-desc');
      const bannerActions = document.getElementById('deploy-action-container');

      if (banner && bannerIcon && bannerTitle && bannerDesc && bannerActions) {
        if (pipelineStatus === 'Failed') {
          // Blocked deployment styling
          banner.style.borderColor = 'rgba(248, 81, 73, 0.25)';
          banner.style.background = 'rgba(248, 81, 73, 0.08)';
          bannerIcon.textContent = '🚨';
          bannerTitle.textContent = 'Deployment Blocked';
          bannerTitle.style.color = 'var(--danger)';
          bannerDesc.textContent = 'Build/pipeline failure detected in hi.cpp';

          bannerActions.innerHTML = `
            <button id="btn-why-cant-deploy" class="settings-action-btn" style="background: rgba(248, 81, 73, 0.2); border-color: rgba(248, 81, 73, 0.4); color: #ff8b8b; font-weight: bold; font-size: 9.5px; padding: 4px 8px;">Why Can't We Deploy?</button>
            <button id="btn-ai-auto-fix" style="background: var(--accent-gradient); color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 9.5px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px;">✨ AI Auto-Fix</button>
          `;

          // Bind Action click events
          const whyDeployBtn = document.getElementById('btn-why-cant-deploy');
          if (whyDeployBtn) {
            whyDeployBtn.onclick = () => {
              this.applyPersonality('devops');
              whyDeployBtn.style.animation = 'avatarScalePulse 0.4s ease';
              setTimeout(() => { whyDeployBtn.style.animation = ''; }, 400);
              this.aiPanel.handleSendMessage("Why is our deployment blocked? Inspect the workspace, recent compiler logs in the terminal, and pipeline status. Tell me why compilation is failing and what command or code change is needed to fix it.");
            };
          }

          const autoFixBtn = document.getElementById('btn-ai-auto-fix');
          if (autoFixBtn) {
            autoFixBtn.onclick = () => {
              this.applyPersonality('devops');
              autoFixBtn.style.animation = 'avatarScalePulse 0.4s ease';
              setTimeout(() => { autoFixBtn.style.animation = ''; }, 400);
              this.aiPanel.handleSendMessage("Automated Task: Use your write_file tool to fix the C++ compilation syntax error in hi.cpp. After updating the file, explain the fix you applied.");
              
              // Temporarily hook websocket message receiver to automatically compile hi.cpp once AI writes the fix
              const originalOnMessage = this.ws.onmessage;
              const self = this;
              this.ws.onmessage = function(event) {
                originalOnMessage.apply(this, arguments);
                
                if (!(event.data instanceof ArrayBuffer)) {
                  try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'activity' && msg.event && msg.event.action === 'updated' && msg.event.target === 'hi.cpp' && msg.event.user.includes('AI')) {
                      console.log("🤖 AI Auto-Fix disk write detected. Auto-building hi.cpp...");
                      self.ws.onmessage = originalOnMessage; // restore original listener
                      setTimeout(() => {
                        self.runCurrentFile('hi.cpp');
                      }, 1000);
                    }
                  } catch (e) {}
                }
              };
            };
          }
        } else {
          // Passing/Deployment Ready styling
          banner.style.borderColor = 'rgba(0, 245, 109, 0.15)';
          banner.style.background = 'rgba(0, 245, 109, 0.04)';
          bannerIcon.textContent = '🟢';
          bannerTitle.textContent = 'Deployment Ready';
          bannerTitle.style.color = 'var(--success)';
          bannerDesc.textContent = 'Workspace files synced & pipeline checks passing.';

          bannerActions.innerHTML = `
            <button id="btn-deploy-action" style="background: var(--success); color: #000; border: none; padding: 4px 10px; border-radius: 4px; font-size: 9.5px; font-weight: 700; cursor: pointer;">🚢 Deploy Build</button>
          `;

          const deployBtn = document.getElementById('btn-deploy-action');
          if (deployBtn) {
            deployBtn.onclick = () => {
              this.notifications.show("🚢 Deploying workspace build...", "info");
              setTimeout(() => {
                this.notifications.show("✅ Build deployed successfully to production staging!", "success");
              }, 1200);
            };
          }
        }
      }

      // Draw upgraded telemetry details in Mission Brief
      const missionRingVal = document.getElementById('mission-progress-val');
      const missionCircle = document.getElementById('mission-progress-circle');
      const missionReadiness = document.getElementById('mission-readiness-val');
      
      // Circular progress inside Mission Brief: Circumference of R=32 is 2*PI*32 = 201.06
      const missionProgress = Math.max(30, Math.min(95, 40 + (totalEvents % 45)));
      if (missionRingVal) missionRingVal.textContent = `${missionProgress}%`;
      if (missionCircle) {
        const offset = 201.06 * (1 - missionProgress / 100);
        missionCircle.style.strokeDashoffset = offset;
      }
      if (missionReadiness) missionReadiness.textContent = `${readiness}%`;

    } catch (err) {
      console.warn("⚠️ Failed to load workspace summary telemetry stats:", err);
    }
  }
}

// Instantiate and initialize the app on page load
window.addEventListener('DOMContentLoaded', () => {
  const app = new WorkspaceApp();
  app.init().catch(console.error);
});
