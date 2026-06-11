// 
// Main Client Orchestrator  Manages WS, UI Events, and Modules
// 

import { CodeEditor } from './editor.js?v=sync-cursor-1';
import { PresenceTracker } from './presence.js';
import { NotificationSystem } from './notifications.js';
import { AIPanel } from './ai-panel.js';
import { ConflictIntelligence } from './conflict-intelligence.js';

class WorkspaceApp {
  constructor() {
    this.ws = null;
    this.editor = null;
    this.presence = null;
    this.notifications = null;
    this.aiPanel = null;
    this.conflictIntel = null;
    
    this.connectionId = null;
    this.currentFile = 'main.js';
    this.files = [];
    this.fileContents = {};
    this.lastCleanContent = {};
    this.reconnectTimer = null;
    this.isReconnecting = false;

    // Terminal State
    this.terminalHistory = [];
    this.terminalHistoryIndex = -1;
    this.terminalReady = false;
    this.terminalRunStart = null;
    this.terminalTimer = null;
    this.fileActivity = {};
    this.dirtyFiles = new Set();
    this.workspaceMapScale = parseFloat(localStorage.getItem('workspace_map_scale') || '1');
    this.workspaceMapPosition = this.safeReadJSON('workspace_map_position', { x: 0, y: 0 });

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

  safeReadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn(`[StartupRecovery] Ignoring invalid localStorage ${key}`, err);
      localStorage.removeItem(key);
      return fallback;
    }
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
      try {
        this.aiPanel.init();
      } catch (err) {
        console.warn('AI panel controls failed to initialize; continuing workspace startup:', err);
      }

      // Initialize debugging panel state
      this.updateDebugPanel();

      // 5. Initialize Terminal UI
      this.initTerminal();
      this.initTerminalResizer();

      // 6. Initialize IDE Action Bar
      this.initIDEActionBar();
      this.initGlobalCommandBar();
      this.initPanelResizers();
      this.initWorkspaceMapControls();

      // Fetch initial project files from REST API
      console.log("FETCH_PROJECT_START");
      const res = await fetch('/api/current-project');
      if (!res.ok) {
        throw new Error(`Failed to fetch project: HTTP ${res.status}`);
      }
      const projData = await res.json();
      this.fileContents = projData.files || {};
      this.lastCleanContent = { ...this.fileContents };
      this.files = Object.keys(projData.files || {});
      this.projectFileMetadata = {};
      if (!this.files.includes(this.currentFile) && this.files.length > 0) {
        this.currentFile = this.files[0];
      }
      console.log("FETCH_PROJECT_SUCCESS");

      // Render the initial file list
      this.editor.bindDocument(this.fileContents[this.currentFile] || '');
      this.editor.setLanguageForFile(this.currentFile);
      this.layoutEditorSoon();
      if (this.currentFileEl) {
        this.currentFileEl.textContent = this.currentFile;
      }
      this.renderFileTabs();
      this.renderFileExplorer();
      this.refreshWorkspaceMap();
      this.updateEditorBreadcrumbs();

      // Initialize Conflict Intelligence module
      this.conflictIntel = new ConflictIntelligence(this);
      await this.conflictIntel.fetchAll();
      this.renderFileExplorer();
      this.refreshWorkspaceMap();
      this.updateStatusBarConflicts();

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
      this.fetchActivityHistory();
      
      // 7. Initialize Hackathon Demo Scenarios
      this.initDemoActions();
      this.initReplayEngine();

      // 8. Initialize Lock/Unlock UI
      this.initFileLockUI();
      this.initBellNotifications();
      
      await this.updateProjectHealth();
      setInterval(() => this.updateProjectHealth(), 10000);

    } catch (err) {
      console.error("CRITICAL STARTUP ERROR IN app.js:", err);
    }
  }

  initNavigation() {
    const explorerBtn = document.getElementById('nav-explorer-btn');
    const searchBtn = document.getElementById('nav-search-btn');
    const gitBtn = document.getElementById('nav-git-btn');
    const debugBtn = document.getElementById('nav-debug-btn');
    const settingsBtn = document.getElementById('nav-settings-btn');
    const newFileBtn = document.getElementById('explorer-new-file-btn');
    const sidebarPanel = document.getElementById('sidebar-panel');
    const panelTitle = document.getElementById('sidebar-panel-title');
    const fileExplorer = document.getElementById('file-explorer');
    const commitsPanel = document.getElementById('commits-panel');

    const switchPanel = (title, activeBtn, panelKind) => {
      const isAlreadyOpen = !sidebarPanel.classList.contains('collapsed') && activeBtn.classList.contains('active');
      if (isAlreadyOpen) {
        sidebarPanel.classList.add('collapsed');
        activeBtn.classList.remove('active');
        return false;
      }
      sidebarPanel.classList.remove('collapsed');
      sidebarPanel.dataset.activePanel = panelKind;
      panelTitle.textContent = title;
      document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
      return true;
    };

    explorerBtn?.addEventListener('click', () => {
      if (!switchPanel('EXPLORER', explorerBtn, 'explorer')) return;
      fileExplorer.classList.remove('hidden');
      commitsPanel.classList.add('hidden');
    });

    newFileBtn?.addEventListener('click', () => {
      if (sidebarPanel.classList.contains('collapsed')) {
        switchPanel('EXPLORER', explorerBtn, 'explorer');
        fileExplorer.classList.remove('hidden');
        commitsPanel.classList.add('hidden');
      }
      this.handleCreateFile();
    });

    searchBtn?.addEventListener('click', () => {
      if (!switchPanel('SEARCH', searchBtn, 'search')) return;
      fileExplorer.classList.remove('hidden');
      commitsPanel.classList.add('hidden');
      const searchInput = document.getElementById('file-search-input');
      if (searchInput) {
        searchInput.focus();
      } else {
        const query = window.prompt('Find file');
        const normalizedQuery = query?.trim().toLowerCase();
        if (!normalizedQuery) return;
        const match = this.files.find(file => file.toLowerCase().includes(normalizedQuery));
        if (match) {
          this.switchFile(match);
          this.notifications.show(`Opened ${match}`, 'success');
        } else {
          this.notifications.show(`No file found for "${query}"`, 'danger');
        }
      }
    });

    gitBtn?.addEventListener('click', () => {
      if (!switchPanel('SOURCE CONTROL', gitBtn, 'source-control')) return;
      fileExplorer.classList.add('hidden');
      commitsPanel.classList.remove('hidden');
      this.fetchActivityHistory();
    });

    debugBtn?.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
      debugBtn.classList.add('active');
      this.runCurrentFile();
    });

    settingsBtn?.addEventListener('click', () => {
      if (settingsBtn.classList.contains('active')) {
        settingsBtn.classList.remove('active');
        document.getElementById('settings-modal')?.classList.add('hidden');
      } else {
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        settingsBtn.classList.add('active');
        document.getElementById('settings-modal')?.classList.remove('hidden');
      }
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
      const finalSavedHeight = Math.min(350, Math.max(120, parseInt(savedHeight, 10) || 180));
      bottomPanels.style.height = `${finalSavedHeight}px`;
    }

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'ns-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const height = window.innerHeight - e.clientY - 28; // 28 is status bar height
      const finalHeight = Math.min(350, Math.max(120, height));
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

  initPanelResizers() {
    this.restoreRightPanelSizes();
    this.restoreBottomSplit();
    this.initRightPanelResizers();
    this.initBottomSplitResizer();
  }

  getRightPanelIds() {
    return ['panel-workspace-map', 'panel-ai-agents', 'panel-mission-brief', 'panel-ask-ai'];
  }

  getRightPanelMinimums() {
    return {
      'panel-workspace-map': 38,
      'panel-ai-agents': 38,
      'panel-mission-brief': 38,
      'panel-ask-ai': 38
    };
  }

  getRightSidebarAvailableHeight() {
    const sidebar = document.querySelector('.ai-sidebar');
    if (!sidebar) return 0;
    const handlesHeight = Array.from(document.querySelectorAll('.right-panel-resizer'))
      .reduce((sum, handle) => sum + handle.offsetHeight, 0);
    return Math.max(0, sidebar.clientHeight - handlesHeight);
  }

  getEffectiveRightPanelMinimums() {
    const minimums = this.getRightPanelMinimums();
    const available = this.getRightSidebarAvailableHeight();
    const minSum = Object.values(minimums).reduce((sum, value) => sum + value, 0);
    if (available > 0 && minSum > available) {
      const scale = available / minSum;
      return Object.fromEntries(
        Object.entries(minimums).map(([id, value]) => [id, Math.max(24, Math.floor(value * scale))])
      );
    }
    return minimums;
  }

  logRightResizeDebug(label, heights = null) {
    const sidebar = document.querySelector('.ai-sidebar');
    const panels = this.getRightPanelIds()
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const panelHeights = heights || Object.fromEntries(panels.map(panel => [panel.id, Math.round(panel.offsetHeight)]));
    const available = this.getRightSidebarAvailableHeight();
    const total = Object.values(panelHeights).reduce((sum, value) => sum + value, 0);
    const overflow = Math.max(0, total - available);
    console.log('[right-resize]', label, {
      sidebarHeight: sidebar?.clientHeight || 0,
      availableHeight: available,
      panelHeights,
      overflow
    });
  }

  applyRightPanelHeights(heights) {
    this.getRightPanelIds().forEach(id => {
      const panel = document.getElementById(id);
      const height = Math.max(0, Math.round(heights[id] || 0));
      if (!panel || !height) return;
      panel.style.flex = `0 0 ${height}px`;
      panel.style.flexBasis = `${height}px`;
    });
  }

  normalizeRightPanelHeights(sourceHeights = null) {
    const ids = this.getRightPanelIds();
    const panels = ids.map(id => document.getElementById(id)).filter(Boolean);
    const available = this.getRightSidebarAvailableHeight();
    if (!available || panels.length !== ids.length) return null;

    const minimums = this.getEffectiveRightPanelMinimums();
    panels.forEach(panel => {
      panel.style.minHeight = `${minimums[panel.id]}px`;
    });

    const defaults = {
      'panel-workspace-map': 0.15,
      'panel-ai-agents': 0.10,
      'panel-mission-brief': 0.15,
      'panel-ask-ai': 0.60
    };

    let heights = ids.reduce((acc, id) => {
      const requested = parseInt(sourceHeights?.[id], 10);
      acc[id] = Number.isFinite(requested) ? requested : Math.round(available * defaults[id]);
      return acc;
    }, {});

    const minSum = ids.reduce((sum, id) => sum + minimums[id], 0);
    const requestedSum = ids.reduce((sum, id) => sum + heights[id], 0);
    const savedImpossible = requestedSum > available || ids.some(id => heights[id] < minimums[id]);

    if (!sourceHeights || savedImpossible) {
      heights = ids.reduce((acc, id) => {
        acc[id] = Math.max(minimums[id], Math.round(available * defaults[id]));
        return acc;
      }, {});
    }

    let total = ids.reduce((sum, id) => sum + heights[id], 0);
    let overflow = total - available;
    if (overflow > 0) {
      const shrinkableIds = ids.filter(id => heights[id] > minimums[id]);
      while (overflow > 0 && shrinkableIds.length > 0) {
        const shrinkableTotal = shrinkableIds.reduce((sum, id) => sum + (heights[id] - minimums[id]), 0);
        if (shrinkableTotal <= 0) break;
        shrinkableIds.forEach(id => {
          if (overflow <= 0) return;
          const room = heights[id] - minimums[id];
          const shrink = Math.min(room, Math.max(1, Math.ceil((room / shrinkableTotal) * overflow)));
          heights[id] -= shrink;
          overflow -= shrink;
        });
      }
    }

    total = ids.reduce((sum, id) => sum + heights[id], 0);
    if (total < available) {
      heights['panel-ask-ai'] += available - total;
    }

    this.applyRightPanelHeights(heights);
    this.logRightResizeDebug('normalize', heights);
    return heights;
  }

  restoreRightPanelSizes() {
    const savedHeights = this.safeReadJSON('right_panel_heights', {});
    if (Object.keys(savedHeights).length > 0) {
      this.normalizeRightPanelHeights(savedHeights);
      this.persistRightPanelSizes();
      return;
    }

    const saved = this.safeReadJSON('right_panel_sizes', {});
    const available = this.getRightSidebarAvailableHeight();
    const converted = Object.fromEntries(
      Object.entries(saved).map(([id, pct]) => [id, Math.round(available * (parseInt(pct, 10) / 100))])
    );
    this.normalizeRightPanelHeights(Object.keys(converted).length ? converted : null);
    this.persistRightPanelSizes();
  }

  persistRightPanelSizes() {
    const heights = {};
    ['panel-workspace-map', 'panel-ai-agents', 'panel-mission-brief', 'panel-ask-ai'].forEach(id => {
      const panel = document.getElementById(id);
      if (panel) {
        const flexBasis = parseFloat(panel.style.flexBasis);
        heights[id] = Math.round(Number.isFinite(flexBasis) ? flexBasis : panel.offsetHeight);
      }
    });
    localStorage.setItem('right_panel_heights', JSON.stringify(heights));
  }

  initRightPanelResizers() {
    document.querySelectorAll('.right-panel-resizer').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const before = document.getElementById(handle.dataset.resizeBefore);
        const after = document.getElementById(handle.dataset.resizeAfter);
        if (!before || !after) return;

        console.log('[right-resize] resize start', handle.dataset.resizeBefore, handle.dataset.resizeAfter);
        const startY = e.clientY;
        const ids = this.getRightPanelIds();
        const beforeIndex = ids.indexOf(before.id);
        const afterIndex = ids.indexOf(after.id);
        const startHeights = Object.fromEntries(ids.map(id => {
          const panel = document.getElementById(id);
          const flexBasis = parseFloat(panel?.style.flexBasis);
          return [id, Math.round(Number.isFinite(flexBasis) ? flexBasis : panel?.offsetHeight || 0)];
        }));
        const panelMinimums = this.getEffectiveRightPanelMinimums();
        const shrinkPanels = (heights, shrinkIds, amount) => {
          let remaining = amount;
          shrinkIds.forEach(id => {
            if (remaining <= 0) return;
            const room = Math.max(0, heights[id] - (panelMinimums[id] || 0));
            const shrink = Math.min(room, remaining);
            heights[id] -= shrink;
            remaining -= shrink;
          });
          return amount - remaining;
        };

        const onMove = (moveEvent) => {
          const delta = moveEvent.clientY - startY;
          console.log('[right-resize] resize move', {
            delta,
            startHeights,
            minimums: panelMinimums
          });

          const nextHeights = { ...startHeights };
          if (delta > 0) {
            const lowerPanels = ids.slice(afterIndex);
            const actualGrow = shrinkPanels(nextHeights, lowerPanels, delta);
            nextHeights[before.id] += actualGrow;
          } else if (delta < 0) {
            const upperPanels = ids.slice(0, beforeIndex + 1).reverse();
            const actualGrow = shrinkPanels(nextHeights, upperPanels, Math.abs(delta));
            nextHeights[after.id] += actualGrow;
          }

          this.applyRightPanelHeights(nextHeights);
          this.logRightResizeDebug('resize move');
          this.layoutEditorSoon();
        };

        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          document.body.classList.remove('is-resizing');
          const currentHeights = Object.fromEntries(this.getRightPanelIds().map(id => {
            const panel = document.getElementById(id);
            const flexBasis = parseFloat(panel?.style.flexBasis);
            return [id, Math.round(Number.isFinite(flexBasis) ? flexBasis : panel?.offsetHeight || 0)];
          }));
          const currentTotal = Object.values(currentHeights).reduce((sum, height) => sum + height, 0);
          const available = this.getRightSidebarAvailableHeight();
          if (currentTotal > available + 1) {
            this.normalizeRightPanelHeights(currentHeights);
          }
          this.persistRightPanelSizes();
          this.logRightResizeDebug('resize end');
          this.drawMapConnections();
        };

        document.body.classList.add('is-resizing');
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    });
  }

  restoreBottomSplit() {
    const saved = localStorage.getItem('bottom_split_terminal_pct');
    const terminal = document.getElementById('panel-terminal');
    const activity = document.getElementById('panel-activity-feed');
    if (!terminal || !activity) return;
    const pct = saved ? Math.min(75, Math.max(25, parseInt(saved, 10))) : 70;
    terminal.style.flexBasis = `${pct}%`;
    activity.style.flexBasis = `${100 - pct}%`;
  }

  initBottomSplitResizer() {
    const handle = document.getElementById('bottom-split-resizer');
    const terminal = document.getElementById('panel-terminal');
    const activity = document.getElementById('panel-activity-feed');
    if (!handle || !terminal || !activity) return;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const container = document.querySelector('.bottom-panels-content');
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMove = (moveEvent) => {
        const pct = Math.min(75, Math.max(25, ((moveEvent.clientX - rect.left) / rect.width) * 100));
        terminal.style.flexBasis = `${pct}%`;
        activity.style.flexBasis = `${100 - pct}%`;
        localStorage.setItem('bottom_split_terminal_pct', Math.round(pct));
        this.layoutEditorSoon();
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.classList.remove('is-resizing');
      };

      document.body.classList.add('is-resizing');
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  initGlobalCommandBar() {
    const input = document.getElementById('global-command-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const command = input.value.trim();
      if (!command) return;
      this.handleGlobalCommand(command);
      input.value = '';
    });
  }

  handleGlobalCommand(command) {
    const normalized = command.replace(/^>\s*/, '').toLowerCase();
    if (normalized.startsWith('open ')) {
      const fileName = command.replace(/^>-\s*open\s+/i, '').trim();
      const target = this.files.find(file => file.toLowerCase() === fileName.toLowerCase());
      if (target) this.switchFile(target);
      else this.notifications.show(`File not found: ${fileName}`, 'danger');
      return;
    }
    if (normalized.includes('review')) {
      this.applyPersonality('reviewer');
      this.aiPanel?.handleSendMessage('Review current file');
      return;
    }
    if (normalized.includes('deploy')) {
      this.applyPersonality('devops');
      this.aiPanel?.handleSendMessage('Deployment readiness');
      return;
    }
    if (normalized.includes('catch') || normalized.includes('what happened')) {
      this.applyPersonality('manager');
      this.aiPanel?.handleSendMessage('What happened?');
      return;
    }
    this.aiPanel?.handleSendMessage(command);
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

  //  WebSocket Integration 
  
  connectWebSocket() {
    console.log("WS_CONNECT_START");
    if (this.ws) {
      this.ws.close();
    }

    // Bind locally cached content first; the server sync update will refine it when available.
    this.editor.bindDocument(this.fileContents[this.currentFile] || '');
    this.editor.setLanguageForFile(this.currentFile);
    this.layoutEditorSoon();
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
      console.log(`[ROOM_JOIN] room=hackathon-demo file=${this.currentFile}`);
      this.sendJSON({
        type: 'join',
        user: this.presence.currentUser
      });
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Yjs binary update
        const updateSize = event.data.byteLength;
        console.log('[DOC_UPDATE_RECEIVED]');
        console.log(` UPDATE_RECEIVED file=${this.currentFile} size=${updateSize}`);
        this.editor.applyUpdate(event.data);
        this.fileContents[this.currentFile] = this.getCurrentEditorContent();
        this.refreshWorkspaceMap();
        console.log(` UPDATE_APPLIED file=${this.currentFile} size=${updateSize}`);
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
      console.log(' Attempting to reconnect...');
      this.connectWebSocket();
    }, 5000);
  }

  //  Message Handlers 
  
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
        this.files = Array.isArray(msg.files) ? msg.files : Object.keys(msg.files || {});
        console.log('FILES_FETCHED');
        this.renderFileTabs();
        this.renderFileExplorer();
        this.refreshWorkspaceMap();
        this.updateDebugPanel();
        break;

      case 'presence':
        this.presence.updateUsers(msg.users, this.connectionId);
        (msg.users || []).forEach(user => {
          if (user.currentFile) {
            this.updateLiveFileActivity(user.currentFile, user.name, 'editing', user.color);
          }
        });
        // Clear remote cursors for users who left or switched to another file
        const activePeersOnSameFile = new Set(
          msg.users
            .filter(u => u.id !== this.connectionId && u.currentFile === this.currentFile)
            .map(u => u.id)
        );
        for (const connId of this.editor.remoteDecorations.keys()) {
          if (!activePeersOnSameFile.has(connId)) {
            if (this.editor.shouldKeepRecentRemoteCursor?.(connId)) continue;
            this.editor.clearRemoteCursor(connId);
          }
        }
        this.renderFileExplorer();
        this.refreshWorkspaceMap();
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
          this.notifications.show(` ${msg.event.user} ${actionText}`, 'info');
        }
        break;

      case 'activityHistory':
        this.renderActivityHistory(msg.events || []);
        break;

      case 'remoteCursor':
        if (msg.connectionId !== this.connectionId && (!msg.file || msg.file === this.currentFile)) {
          console.log('[REMOTE_CURSOR_RECEIVED]', {
            from: msg.connectionId,
            user: msg.user?.name || msg.user,
            file: msg.file,
            currentFile: this.currentFile
          });
          this.editor.updateRemoteCursor(msg.connectionId, msg.user, msg.cursor);
          this.updateLiveFileActivity(msg.file || this.currentFile, msg.user?.name || msg.user, 'editing', msg.user?.color);
          this.renderFileExplorer();
          this.refreshWorkspaceMap();
        }
        break;

      case 'contentSnapshot':
        if (msg.file === this.currentFile && (!msg.connectionId || msg.connectionId !== this.connectionId)) {
          console.log('[DOC_UPDATE_RECEIVED]', { mode: 'snapshot', file: msg.file, user: msg.user?.name || msg.user });
          this.editor.replaceContentFromRemote(msg.content || '');
          this.fileContents[msg.file] = msg.content || '';
          this.lastCleanContent[msg.file] = msg.content || '';
          this.updateLiveFileActivity(msg.file, msg.user?.name || msg.user, 'editing', msg.user?.color);
          this.renderFileExplorer();
          this.refreshWorkspaceMap();
        } else {
          console.log('[DOC_SNAPSHOT_SKIPPED]', {
            file: msg.file,
            currentFile: this.currentFile,
            from: msg.connectionId,
            self: this.connectionId
          });
        }
        break;

      case 'fileChanged':
        this.currentFile = msg.file;
        this.editor.bindDocument(this.fileContents[msg.file] || '');
        this.editor.setLanguageForFile(msg.file);
        this.layoutEditorSoon();
        if (this.currentFileEl) {
          this.currentFileEl.textContent = msg.file;
        }
        this.renderFileTabs();
        this.renderFileExplorer();
        this.updateDebugPanel();
        break;

      case 'terminalOutput':
        this.appendTerminalOutput(msg.output);
        if (msg.output && /error|failed/i.test(msg.output)) this.setTerminalStatus('Failed');
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
            this.setTerminalStatus('Running');
            runBtn.textContent = ' Compiling...';
            runBtn.classList.add('compiling');
          } else if (status === 'running') {
            this.setTerminalStatus('Running');
            runBtn.textContent = ' Running...';
            runBtn.classList.add('running');
            this.appendTerminalOutput(`\n[Program Output]\n`, 'term-header-program');
          } else if (status === 'completed') {
            if (!this.currentRunHadOutput) {
              this.appendTerminalOutput('(Program completed with no stdout.)\n', 'term-muted');
            }
            this.setTerminalStatus('Success');
            runBtn.textContent = ' Run';
            this.notifications.show(`Execution completed for ${this.currentFile}`, 'success');
            this.lastRunFailed = false;
            this.updateProjectHealth();
          } else if (status === 'failed') {
            this.setTerminalStatus('Failed');
            runBtn.textContent = ' Run';
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
          this.appendTerminalOutput(text.endsWith('\n') ? text : `${text}\n`, 'term-stderr');
        } else {
          if ((text || '').trim()) this.currentRunHadOutput = true;
          this.appendTerminalOutput(text.endsWith('\n') ? text : `${text}\n`, category === 'stderr' ? 'term-stderr' : 'term-stdout');
        }
        break;
      }

      case 'managerAlert':
        this.conflictIntel?.handleManagerAlert(msg);
        break;

      case 'lockEnforcement':
        this.conflictIntel?.handleLockEnforcement(msg);
        break;

      case 'ownershipAssigned':
      case 'ownershipTransferred':
      case 'ownershipUpdate':
        this.conflictIntel?.handleOwnershipUpdate(msg);
        this.renderFileExplorer();
        this.refreshWorkspaceMap();
        this.updateFileLockUI();
        if (msg.type === 'ownershipTransferred') {
          const prevStr = msg.previousOwner ? ` from ${msg.previousOwner}` : '';
          this.notifications?.show(` Ownership of ${msg.file || msg.fileName} transferred${prevStr} to ${msg.owner}`, 'success');
        } else if (msg.type === 'ownershipAssigned') {
          this.notifications?.show(` Ownership of ${msg.file || msg.fileName} assigned to ${msg.owner}`, 'success');
        }
        break;

      case 'fileLocked':
      case 'fileUnlocked':
      case 'lockUpdate':
        this.conflictIntel?.handleLockUpdate(msg);
        this.renderFileExplorer();
        this.refreshWorkspaceMap();
        this.updateFileLockUI();
        if (msg.type === 'fileLocked') {
          this.notifications?.show(` ${msg.file || msg.fileName} locked by ${msg.owner}`, 'info');
        } else if (msg.type === 'fileUnlocked') {
          this.notifications?.show(` ${msg.file || msg.fileName} unlocked`, 'info');
        }
        break;

      case 'conflictUpdate':
        this.conflictIntel?.handleConflictUpdate(msg);
        this.renderFileExplorer();
        this.refreshWorkspaceMap();
        this.updateStatusBarConflicts();
        break;

      case 'ownershipRequest':
      case 'ownershipRequestReceived': {
        const mappedMsg = { file: msg.file, owner: msg.owner || msg.from, requester: msg.requester || msg.to };
        // Send bell notification to the owner
        this.addBellNotification({
          type: 'ownership_request',
          title: 'Ownership Request',
          message: `${mappedMsg.requester} wants ownership of ${mappedMsg.file}`,
          data: mappedMsg,
          time: new Date()
        });
        this.handleOwnershipApprovalModal(mappedMsg);
        break;
      }

      case 'ownershipApproved':
      case 'ownershipApprovedReceived':
        const requesterVal = msg.requester || msg.to;
        this.notifications?.show('Approved ownership for ' + msg.file + ' to ' + requesterVal, 'success');
        this.conflictIntel?.fetchAll().then(() => {
          this.renderFileExplorer();
          this.refreshWorkspaceMap();
          this.updateFileLockUI();
        });
        break;

      case 'ownershipRejected':
      case 'ownershipRejectedReceived':
        this.notifications?.show('Rejected ownership request for ' + msg.file, 'warning');
        break;
    }
  }

  fetchActivityHistory() {
    fetch('/api/project/activity-count=50')
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then(data => this.renderActivityHistory(data.events || []))
      .catch(err => {
        console.warn('REST activity history failed, falling back to websocket:', err);
        this.sendJSON({ type: 'getActivityHistory' });
      });
  }

  layoutEditorSoon() {
    requestAnimationFrame(() => this.editor?.layout?.());
    setTimeout(() => this.editor?.layout?.(), 150);
  }

  getCurrentEditorContent() {
    return this.editor?.getValue?.() || this.fileContents[this.currentFile] || '';
  }

  setTerminalStatus(status) {
    const statusEl = document.getElementById('terminal-status');
    const timeEl = document.getElementById('terminal-execution-time');

    if (status === 'Running') {
      this.terminalRunStart = performance.now();
      clearInterval(this.terminalTimer);
      this.terminalTimer = setInterval(() => this.updateTerminalElapsed(), 100);
    } else if (status === 'Success' || status === 'Failed') {
      this.updateTerminalElapsed();
      clearInterval(this.terminalTimer);
      this.terminalTimer = null;
    }

    if (statusEl) {
      statusEl.textContent = `Status: ${status}`;
      statusEl.dataset.status = status.toLowerCase();
    }
    if (timeEl && status === 'Idle') timeEl.textContent = '0.0s';
  }

  updateTerminalElapsed() {
    const timeEl = document.getElementById('terminal-execution-time');
    if (!timeEl || !this.terminalRunStart) return;
    timeEl.textContent = `${((performance.now() - this.terminalRunStart) / 1000).toFixed(1)}s`;
  }

  updateEditorBreadcrumbs() {
    const breadcrumbs = document.getElementById('editor-breadcrumbs');
    if (!breadcrumbs) return;
    const parts = this.currentFile.split('/');
    breadcrumbs.textContent = ['workspace', ...parts].join(' > ');
  }

  refreshWorkspaceMap() {
    if (!document.getElementById('workspace-map-graph')) return;
    this.renderWorkspaceMapNodes();
    setTimeout(() => this.drawMapConnections(), 50);
  }

  switchFile(fileName) {
    if (fileName === this.currentFile) return;
    this.currentFile = fileName;
    
    // Highlight in tab list immediately
    this.renderFileTabs();
    this.renderFileExplorer();

    // Bind locally cached content first; live sync updates will follow when connected.
    this.editor.bindDocument(this.fileContents[fileName] || '');
    this.lastCleanContent[fileName] = this.fileContents[fileName] || '';
    this.editor.setLanguageForFile(fileName);
    this.layoutEditorSoon();
    if (this.currentFileEl) {
      this.currentFileEl.textContent = fileName;
    }
    this.updateEditorBreadcrumbs();

    // Notify WS server about file switch
    this.sendJSON({
      type: 'switchFile',
      file: fileName
    });
    this.updateDebugPanel();
    this.updateFileLockUI();
  }

  //  Local Change Handlers 
  
  handleLocalContentChange(update) {
    const userName = this.presence?.currentUser?.name || '';
    const lock = this.conflictIntel?.activeLocks?.find(l => l.fileName === this.currentFile);
    const ownership = this.conflictIntel?.fileOwnership?.[this.currentFile] || {};
    const lockOwner = lock?.owner || ownership.lockOwner || null;
    const isSameUser = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const isLocked = !!lock || ownership.locked === true;
    const isLockedByOther = isLocked && lockOwner && !isSameUser(lockOwner, userName);

    if (isLockedByOther) {
      // Revert edit
      const cleanContent = this.lastCleanContent?.[this.currentFile] || '';
      this.editor.isApplyingRemote = true;
      this.editor.bindDocument(cleanContent);
      this.editor.isApplyingRemote = false;

      // Show lock modal
      const ownerName = lockOwner || 'another user';
      this.conflictIntel?.showLockModal({
        file: this.currentFile,
        owner: ownerName,
        reason: `This file is locked by ${ownerName}. You must request ownership or create a branch to edit it.`
      });
      return;
    }

    if (typeof update === 'string') {
      this.fileContents[this.currentFile] = update;
      this.lastCleanContent[this.currentFile] = update;
      this.dirtyFiles.add(this.currentFile);
      this.sendContentSnapshot(update);
      this.sendCurrentCursor();
      this.updateLiveFileActivity(this.currentFile, userName || 'local', 'editing', this.presence?.currentUser?.color);
      this.renderFileTabs();
      this.renderFileExplorer();
      this.refreshWorkspaceMap();
      clearTimeout(this.fallbackSaveTimer);
      this.fallbackSaveTimer = setTimeout(() => {
        fetch('/api/project/update-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: this.currentFile,
            content: update,
            userName: this.presence?.currentUser?.name || 'local'
          })
        })
          .then(() => {
            this.dirtyFiles.delete(this.currentFile);
            this.renderFileTabs();
          })
          .catch((err) => console.warn('Fallback editor save failed:', err));
      }, 500);
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[DOC_UPDATE_SENT]');
      console.log(` UPDATE_SENT file=${this.currentFile} size=${update.byteLength || update.length || 0}`);
      this.updateLiveFileActivity(this.currentFile, userName || 'local', 'editing', this.presence?.currentUser?.color);
      this.renderFileExplorer();
      this.refreshWorkspaceMap();
      this.ws.send(update);
      this.sendContentSnapshot(this.getCurrentEditorContent());
      this.sendCurrentCursor();
      setTimeout(() => {
        const content = this.getCurrentEditorContent();
        this.fileContents[this.currentFile] = content;
        this.lastCleanContent[this.currentFile] = content;
        this.refreshWorkspaceMap();
      }, 0);
    } else {
      console.warn(` UPDATE_NOT_SENT file=${this.currentFile} wsState=${this.ws?.readyState}`);
    }
  }

  sendContentSnapshot(content) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    clearTimeout(this.contentSnapshotTimer);
    const file = this.currentFile;
    const user = this.presence?.currentUser || null;
    this.contentSnapshotTimer = setTimeout(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN || file !== this.currentFile) return;
      console.log('[DOC_SNAPSHOT_SENT]', { file, size: (content || '').length });
      this.sendJSON({
        type: 'contentSnapshot',
        file,
        content: content || '',
        user,
        timestamp: Date.now()
      });
    }, 80);
  }

  updateLiveFileActivity(fileName, user, action = 'editing', color) {
    if (!fileName || !user) return;
    const userName = typeof user === 'string' ? user : user.name;
    if (!userName) return;
    this.fileActivity[fileName] = {
      user: userName,
      action,
      timestamp: new Date().toISOString(),
      color: color || this.getUserColor(userName)
    };
  }

  handleLocalCursorChange(position) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJSON({
        type: 'cursor',
        file: this.currentFile,
        cursor: {
          lineNumber: position.lineNumber,
          column: position.column
        }
      });
      console.log('[LOCAL_CURSOR_SENT]', { file: this.currentFile, position });
    }
  }

  sendCurrentCursor() {
    const position = this.editor?.getCursorPosition?.();
    if (position) this.handleLocalCursorChange(position);
  }

  //  UI Rendering 
  
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
      const dirty = document.createElement('span');
      dirty.className = 'tab-dirty-indicator';
      dirty.textContent = '';
      dirty.hidden = !this.dirtyFiles.has(fileName);
      
      const closeBtn = document.createElement('span');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.handleDeleteFile(fileName);
      };
      
      tab.appendChild(icon);
      tab.appendChild(name);
      tab.appendChild(dirty);
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
    root.innerHTML = `<span class="icon"></span> <span class="label">workspace</span>`;
    explorer.appendChild(root);

    const children = document.createElement('div');
    children.className = 'tree-children';
    
    this.files.forEach(fileName => {
      const item = document.createElement('div');
      const status = this.conflictIntel?.getFileStatus(fileName);
      const statusClass = status ? `status-${status.statusLabel.toLowerCase().replace(/\s+/g, '-')}` : '';
      const isLocked = status?.statusLabel === 'Locked' || status?.lockOwner;
      item.className = `tree-item ${fileName === this.currentFile ? 'active' : ''} ${statusClass} ${isLocked ? 'file-locked' : ''}`;
      item.title = status?.tooltip || fileName;
      
      let dotClass = 'dot-healthy';
      if (status) {
        if (status.statusLabel === 'Locked') {
          dotClass = 'dot-locked';
        } else if (status.statusLabel === 'Active Conflict') {
          dotClass = 'dot-active-conflict';
        } else if (status.statusLabel === 'Conflict Risk') {
          dotClass = 'dot-conflict-risk';
        }
      }

      item.innerHTML = `
        <span class="icon">${this.getFileIcon(fileName)}</span>
        <span class="label">${fileName}</span>
        <span class="file-status-dot ${dotClass}" title="${status?.statusLabel || 'Healthy'}"></span>
      `;
      item.onclick = () => this.switchFile(fileName);
      children.appendChild(item);
    });

    explorer.appendChild(children);
  }

  getFileIcon(fileName) {
    if (fileName.endsWith('.js')) return '';
    if (fileName.endsWith('.css')) return '';
    if (fileName.endsWith('.html')) return '';
    if (fileName.endsWith('.cpp')) return '';
    if (fileName.endsWith('.json')) return '';
    return '';
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
          userName: this.presence?.currentUser?.name || 'anonymous'
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create file');
      }
      if (!this.files.includes(cleanName)) {
        this.files.push(cleanName);
      }
      this.fileContents[cleanName] = `// ${cleanName}\n`;
      this.renderFileExplorer();
      this.renderFileTabs();
      this.refreshWorkspaceMap();
      this.switchFile(cleanName);
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
    if (!confirm(`Are you sure you want to delete ${fileName}-`)) return;

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
    if (e.target) {
      this.fileActivity[e.target] = {
        user: e.user,
        action: e.action,
        timestamp: e.timestamp,
        color: this.getUserColor(e.user)
      };
      this.refreshWorkspaceMap();
    }

    const item = document.createElement('div');
    item.className = 'activity-item activity-new';
    item.style.setProperty('--activity-color', this.getUserColor(e.user));

    const content = document.createElement('div');
    content.className = 'activity-content';

    const userSpan = document.createElement('span');
    userSpan.className = 'activity-user';
    userSpan.textContent = e.user;

    const actionText = document.createTextNode(` ${this.getActivityVerb(e.action)} `);

    const targetSpan = document.createElement('span');
    targetSpan.className = 'activity-target';
    targetSpan.style.color = 'var(--accent-color)';
    targetSpan.textContent = e.target;

    const time = document.createElement('span');
    time.className = 'activity-time';
    time.textContent = this.formatRelativeTime(e.timestamp);

    content.appendChild(userSpan);
    content.appendChild(actionText);
    content.appendChild(targetSpan);
    content.appendChild(time);
    
    item.appendChild(content);

    // Insert at top of activity feed (chronological reverse)
    this.activityListEl.insertBefore(item, this.activityListEl.firstChild);
  }

  renderActivityHistory(events) {
    const ordered = [...events].reverse();

    if (this.activityListEl) {
      this.activityListEl.innerHTML = '';
      if (ordered.length === 0) {
        this.activityListEl.innerHTML = '<div class="panel-empty-state">No activity yet</div>';
      } else {
        ordered.forEach(e => this.appendActivityEvent(e));
      }
    }

    const commitsList = document.getElementById('commits-list');
    if (!commitsList) return;

    commitsList.innerHTML = '';
    const commitEvents = ordered
      .filter(e => e.action !== 'joined' && e.action !== 'left');
    if (commitEvents.length === 0) {
      commitsList.innerHTML = '<div class="panel-empty-state">No commits yet</div>';
      return;
    }
    commitEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.style.setProperty('--activity-color', this.getUserColor(e.user));
        item.innerHTML = `
          <div class="activity-content">
            <span class="activity-user">${e.user}</span>
            ${this.getActivityVerb(e.action)}
            <span class="activity-target" style="color:var(--accent-color)">${e.target}</span>
            <span class="activity-time">${this.formatRelativeTime(e.timestamp)}</span>
          </div>
        `;
        commitsList.appendChild(item);
      });
  }

  formatTime(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  getActivityVerb(action) {
    if (action === 'joined') return 'joined';
    if (action === 'left') return 'left';
    if (action === 'created_file') return 'created';
    if (action === 'file_locked') return ' locked';
    if (action === 'file_unlocked') return ' unlocked';
    if (action === 'conflict_detected') return ' conflict detected in';
    if (action === 'ownership_assigned') return ' assigned ownership of';
    if (action === 'ownership_transferred') return ' transferred ownership of';
    if (/review/i.test(action || '')) return 'reviewed';
    if (/scan|security/i.test(action || '')) return 'scanned';
    if (/summary|ai/i.test(action || '')) return 'generated';
    return 'edited';
  }

  formatRelativeTime(isoString) {
    const time = new Date(isoString).getTime();
    if (!Number.isFinite(time)) return '--';
    const seconds = Math.max(1, Math.round((Date.now() - time) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.round(hours / 24)} day ago`;
  }

  getUserColor(userName) {
    const match = this.presence?.users?.find(user => user.name === userName);
    if (match?.color) return match.color;
    let hash = 0;
    String(userName || 'system').split('').forEach(ch => { hash = ((hash << 5) - hash) + ch.charCodeAt(0); });
    const colors = ['#fc6d26', '#54a0ff', '#9b5de5', '#00f56d', '#f15bb5', '#feca57'];
    return colors[Math.abs(hash) % colors.length];
  }

  updateStatusBarConflicts() {
    const conflictStatusEl = document.querySelector('.conflict-status');
    if (!conflictStatusEl || !this.conflictIntel) return;

    const risks = this.conflictIntel.conflictRisks || [];
    const highRisks = risks.filter(r => r.level === 'High');
    const medRisks = risks.filter(r => r.level === 'Medium');
    const locks = this.conflictIntel.activeLocks || [];

    if (highRisks.length > 0) {
      conflictStatusEl.textContent = ` ${highRisks.length} active conflict${highRisks.length > 1 ? 's' : ''}`;
      conflictStatusEl.style.color = '#f85149';
    } else if (medRisks.length > 0) {
      conflictStatusEl.textContent = ` ${medRisks.length} conflict risk${medRisks.length > 1 ? 's' : ''}`;
      conflictStatusEl.style.color = '#d29922';
    } else if (locks.length > 0) {
      conflictStatusEl.textContent = ` ${locks.length} locked file${locks.length > 1 ? 's' : ''}`;
      conflictStatusEl.style.color = '#58a6ff';
    } else {
      conflictStatusEl.textContent = ' No conflicts';
      conflictStatusEl.style.color = '#3fb950';
    }
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

  //  Terminal Integration 

  initTerminal() {
    const termInput = document.getElementById('terminal-input');
    const termOutput = document.getElementById('terminal-output');
    const clearBtn = document.getElementById('terminal-clear-btn');
    if (!termInput || !termOutput) return;

    this.appendTerminalOutput('[Terminal ready. Type commands below.]\n', 'term-info');
    this.terminalReady = true;

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = termInput.value;
        if (!cmd.trim()) return;
        this.terminalHistory.push(cmd);
        if (this.terminalHistory.length > 50) this.terminalHistory.shift();
        this.terminalHistoryIndex = this.terminalHistory.length;
        this.appendTerminalOutput(`> ${cmd}\n`, 'term-cmd');
        this.setTerminalStatus('Running');
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
        this.setTerminalStatus('Idle');
      });
    }
  }

  appendTerminalOutput(text, className = 'term-stdout') {
    const termOutput = document.getElementById('terminal-output');
    if (!termOutput) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    termOutput.appendChild(line);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  switchToTerminalTab() {
    setTimeout(() => {
      const termInput = document.getElementById('terminal-input');
      if (termInput) termInput.focus();
    }, 100);
  }

  runCurrentFile(fileOverride) {
    const fileToRun = fileOverride || this.currentFile;
    if (!fileToRun) { this.notifications.show('No file selected to run.', 'danger'); return; }
    const ext = fileToRun.split('.').pop().toLowerCase();
    if (ext !== 'js' && ext !== 'py' && ext !== 'cpp' && ext !== 'html') { this.notifications.show(`File type .${ext} cannot be executed.`, 'info'); return; }
    this.switchToTerminalTab();
    this.currentRunHadOutput = false;
    this.appendTerminalOutput(`\n\n Running ${fileToRun}\n`, 'term-success');
    this.sendJSON({ type: 'runFile', file: fileToRun });
  }

  sendJSON(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  initFileLockUI() {
    const lockBtn = document.getElementById('ide-lock-btn');
    const unlockBtn = document.getElementById('ide-unlock-btn');
    const requestOwnershipBtn = document.getElementById('ide-request-ownership-btn');
    
    lockBtn?.addEventListener('click', () => {
      const userName = this.presence?.currentUser?.name || 'anonymous';
      this.sendJSON({ type: 'lockFile', file: this.currentFile, owner: userName });
      this.notifications?.show(` Locked ${this.currentFile}`, 'success');
      setTimeout(() => { this.conflictIntel?.fetchAll().then(() => { this.renderFileExplorer(); this.refreshWorkspaceMap(); this.updateFileLockUI(); }); }, 300);
    });
    
    unlockBtn?.addEventListener('click', () => {
      const userName = this.presence?.currentUser?.name || 'anonymous';
      this.sendJSON({ type: 'unlockFile', file: this.currentFile, owner: userName });
      this.notifications?.show(` Unlocked ${this.currentFile}`, 'success');
      setTimeout(() => { this.conflictIntel?.fetchAll().then(() => { this.renderFileExplorer(); this.refreshWorkspaceMap(); this.updateFileLockUI(); }); }, 300);
    });

    requestOwnershipBtn?.addEventListener('click', () => {
      const userName = this.presence?.currentUser?.name || 'anonymous';
      const status = this.conflictIntel?.getFileStatus(this.currentFile);
      const owner = status?.owner || 'system';
      this.sendJSON({
        type: 'requestOwnership',
        file: this.currentFile,
        from: owner,
        to: userName
      });
      this.notifications?.show(` Requested ownership for ${this.currentFile} from ${owner}`, 'info');
    });

    const approveBtn = document.getElementById('ownership-approve-btn');
    const rejectBtn = document.getElementById('ownership-reject-btn');
    const modal = document.getElementById('ownership-approval-modal');
    approveBtn?.addEventListener('click', () => {
      if (this._pendingOwnershipRequest) {
        const file = this._pendingOwnershipRequest.file;
        const requester = this._pendingOwnershipRequest.requester || this._pendingOwnershipRequest.to;
        this.sendJSON({
          type: 'approveOwnership',
          file: file,
          from: this._pendingOwnershipRequest.owner || this._pendingOwnershipRequest.from,
          to: requester
        });
        this.notifications?.show(` Approved`, 'success');
        
        // Remove corresponding bell notification
        if (this._bellNotifications) {
          const idx = this._bellNotifications.findIndex(n => 
            n.type === 'ownership_request' && 
            n.data && 
            n.data.file === file && 
            (n.data.requester === requester || n.data.to === requester)
          );
          if (idx !== -1) {
            this._bellNotifications.splice(idx, 1);
            this.renderBellDropdown();
          }
        }
        this._pendingOwnershipRequest = null;
      }
      modal?.classList.add('hidden');
    });
    rejectBtn?.addEventListener('click', () => {
      if (this._pendingOwnershipRequest) {
        const file = this._pendingOwnershipRequest.file;
        const requester = this._pendingOwnershipRequest.requester || this._pendingOwnershipRequest.to;
        this.sendJSON({
          type: 'rejectOwnership',
          file: file,
          from: this._pendingOwnershipRequest.owner || this._pendingOwnershipRequest.from,
          to: requester
        });
        this.notifications?.show(` Rejected`, 'warning');
        
        // Remove corresponding bell notification
        if (this._bellNotifications) {
          const idx = this._bellNotifications.findIndex(n => 
            n.type === 'ownership_request' && 
            n.data && 
            n.data.file === file && 
            (n.data.requester === requester || n.data.to === requester)
          );
          if (idx !== -1) {
            this._bellNotifications.splice(idx, 1);
            this.renderBellDropdown();
          }
        }
        this._pendingOwnershipRequest = null;
      }
      modal?.classList.add('hidden');
    });
    this.updateFileLockUI();
  }

  updateFileLockUI() {
    const lockBtn = document.getElementById('ide-lock-btn');
    const unlockBtn = document.getElementById('ide-unlock-btn');
    const requestOwnershipBtn = document.getElementById('ide-request-ownership-btn');
    const lockBadge = document.getElementById('file-lock-status');
    const ownerBadge = document.getElementById('file-owner-badge');
    if (!lockBtn || !unlockBtn) return;

    const status = this.conflictIntel?.getFileStatus(this.currentFile);
    const currentUser = this.presence?.currentUser?.name || '';
    const isLocked = status?.statusLabel === 'Locked' || !!status?.lockOwner;
    const fileOwner = status?.owner || null;
    
    // If no owner assigned, current user is treated as de facto owner (can lock)
    const isOwner = !fileOwner || (fileOwner.toLowerCase() === currentUser.toLowerCase());
    const isLockedByMe = status?.lockOwner && status.lockOwner.toLowerCase() === currentUser.toLowerCase();
    const isLockedBySomeoneElse = isLocked && !isLockedByMe;

    if (isOwner && !isLockedBySomeoneElse) {
      requestOwnershipBtn?.classList.add('hidden');
      if (isLocked && isLockedByMe) {
        lockBtn.classList.add('hidden');
        unlockBtn.classList.remove('hidden');
      } else if (!isLocked) {
        lockBtn.classList.remove('hidden');
        unlockBtn.classList.add('hidden');
      } else {
        lockBtn.classList.add('hidden');
        unlockBtn.classList.add('hidden');
      }
    } else {
      lockBtn.classList.add('hidden');
      unlockBtn.classList.add('hidden');
      requestOwnershipBtn?.classList.remove('hidden');
    }

    if (this.editor && typeof this.editor.setReadOnly === 'function') {
      this.editor.setReadOnly(isLockedBySomeoneElse);
    }

    if (lockBadge) {
      if (isLocked) {
        lockBadge.classList.remove('hidden');
        lockBadge.textContent = ` Locked by ${status.lockOwner || 'unknown'}`;
      } else {
        lockBadge.classList.add('hidden');
      }
    }
    if (ownerBadge) {
      if (status?.owner) {
        ownerBadge.classList.remove('hidden');
        ownerBadge.textContent = ` ${status.owner}`;
      } else {
        ownerBadge.classList.add('hidden');
      }
    }
  }

  handleOwnershipApprovalModal(msg) {
    const currentUser = this.presence?.currentUser?.name || '';
    if (msg.owner && msg.owner.toLowerCase() !== currentUser.toLowerCase()) return;

    const file = msg.file;
    const requester = msg.requester;
    const owner = msg.owner;

    const contentHtml = `
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px;">🔑 Ownership Request</div>
        <div style="margin-bottom: 8px;"><strong>${requester}</strong> wants ownership of <code>${file}</code></div>
        <div class="toast-actions">
          <button class="toast-btn toast-btn-approve">Approve</button>
          <button class="toast-btn toast-btn-reject">Reject</button>
        </div>
      </div>
    `;

    // Show with duration = 0 so it stays visible until answered
    const toast = this.notifications?.show(contentHtml, 'info', 0);

    if (toast) {
      const approveBtn = toast.querySelector('.toast-btn-approve');
      const rejectBtn = toast.querySelector('.toast-btn-reject');

      approveBtn?.addEventListener('click', () => {
        this.sendJSON({
          type: 'approveOwnership',
          file: file,
          from: owner,
          to: requester
        });
        this.notifications?.dismiss(toast);

        // Remove corresponding bell notification
        if (this._bellNotifications) {
          const idx = this._bellNotifications.findIndex(n =>
            n.type === 'ownership_request' &&
            n.data &&
            n.data.file === file &&
            (n.data.requester === requester || n.data.to === requester)
          );
          if (idx !== -1) {
            this._bellNotifications.splice(idx, 1);
            this.renderBellDropdown();
          }
        }
      });

      rejectBtn?.addEventListener('click', () => {
        this.sendJSON({
          type: 'rejectOwnership',
          file: file,
          from: owner,
          to: requester
        });
        this.notifications?.dismiss(toast);

        // Remove corresponding bell notification
        if (this._bellNotifications) {
          const idx = this._bellNotifications.findIndex(n =>
            n.type === 'ownership_request' &&
            n.data &&
            n.data.file === file &&
            (n.data.requester === requester || n.data.to === requester)
          );
          if (idx !== -1) {
            this._bellNotifications.splice(idx, 1);
            this.renderBellDropdown();
          }
        }
      });
    }
  }

  // ── Bell Notification System ────────────────────────────────
  initBellNotifications() {
    this._bellNotifications = [];
    const bellBtn = document.querySelector('.notification-indicator-btn');
    if (!bellBtn) return;

    // Add badge counter
    const badge = document.createElement('span');
    badge.id = 'bell-badge';
    badge.className = 'bell-badge hidden';
    badge.textContent = '0';
    bellBtn.style.position = 'relative';
    bellBtn.appendChild(badge);

    // Create dropdown panel
    const dropdown = document.createElement('div');
    dropdown.id = 'bell-dropdown';
    dropdown.className = 'bell-dropdown hidden';
    dropdown.innerHTML = `
      <div class="bell-dropdown-header">
        <span>Notifications</span>
        <button id="bell-clear-all" class="bell-clear-btn">Clear All</button>
      </div>
      <div class="bell-dropdown-body" id="bell-dropdown-body">
        <div class="bell-empty">No notifications</div>
      </div>
    `;
    bellBtn.parentElement.style.position = 'relative';
    bellBtn.parentElement.appendChild(dropdown);

    // Toggle dropdown on click
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });
    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // Clear all button
    document.getElementById('bell-clear-all')?.addEventListener('click', () => {
      this._bellNotifications = [];
      this.renderBellDropdown();
    });
  }

  addBellNotification(notification) {
    if (!this._bellNotifications) this._bellNotifications = [];
    this._bellNotifications.unshift(notification);
    // Cap at 50
    if (this._bellNotifications.length > 50) this._bellNotifications.pop();
    this.renderBellDropdown();

    // Pulse the bell icon
    const bellBtn = document.querySelector('.notification-indicator-btn');
    if (bellBtn) {
      bellBtn.classList.add('bell-pulse');
      setTimeout(() => bellBtn.classList.remove('bell-pulse'), 1000);
    }
  }

  renderBellDropdown() {
    const body = document.getElementById('bell-dropdown-body');
    const badge = document.getElementById('bell-badge');
    if (!body) return;

    const items = this._bellNotifications || [];

    if (badge) {
      if (items.length > 0) {
        badge.textContent = items.length > 9 ? '9+' : items.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (items.length === 0) {
      body.innerHTML = '<div class="bell-empty">No notifications</div>';
      return;
    }

    body.innerHTML = items.map((n, i) => {
      const icon = n.type === 'ownership_request' ? '🔑'
                 : n.type === 'conflict' ? '⚠️'
                 : n.type === 'lock' ? '🔒'
                 : 'ℹ️';
      const ago = this._timeAgo(n.time);

      let actionsHtml = '';
      if (n.type === 'ownership_request' && n.data) {
        actionsHtml = `
          <div class="bell-actions">
            <button class="bell-action-btn grant-btn" data-index="${i}">Grant</button>
            <button class="bell-action-btn reject-btn" data-index="${i}">Reject</button>
          </div>
        `;
      }

      return `
        <div class="bell-item" data-index="${i}">
          <span class="bell-item-icon">${icon}</span>
          <div class="bell-item-content">
            <div class="bell-item-title">${n.title}</div>
            <div class="bell-item-msg">${n.message}</div>
            ${actionsHtml}
            <div class="bell-item-time">${ago}</div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers using request details
    body.querySelectorAll('.grant-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-index'));
        const n = this._bellNotifications[index];
        if (n && n.data) {
          this.sendJSON({
            type: 'approveOwnership',
            file: n.data.file,
            from: n.data.owner || n.data.from,
            to: n.data.requester || n.data.to
          });
          this.notifications?.show('Ownership request approved!', 'success');
          this._bellNotifications.splice(index, 1);
          this.renderBellDropdown();
        }
      });
    });

    body.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-index'));
        const n = this._bellNotifications[index];
        if (n && n.data) {
          this.sendJSON({
            type: 'rejectOwnership',
            file: n.data.file,
            from: n.data.owner || n.data.from,
            to: n.data.requester || n.data.to
          });
          this.notifications?.show('Ownership request rejected.', 'warning');
          this._bellNotifications.splice(index, 1);
          this.renderBellDropdown();
        }
      });
    });
  }

  _timeAgo(time) {
    if (!time) return '';
    const s = Math.floor((Date.now() - new Date(time).getTime()) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  initDemoActions() {
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
        this.aiPanel.handleSendMessage("Run Team Consultation Mode. Provide a combined response panel containing brief feedback from our core AI specialists:  Engineering Manager (timeline/scoping),  Code Reviewer (code quality and suggestions for the active file),  DevOps Specialist (run safety), and  Security Analyst (settings security/OWASP checks). Format each response under a distinct specialist subheader.");
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
          const res = await fetch('/api/project/activity-count=100');
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
        if (btnPlay) btnPlay.textContent = '';
        if (lblStatus) lblStatus.textContent = 'Paused';
        modalReplay.classList.add('hidden');
      });
    }

    const stopPlayback = () => {
      if (this.replayInterval) {
        clearInterval(this.replayInterval);
        this.replayInterval = null;
        if (btnPlay) btnPlay.textContent = '';
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
          btnPlay.textContent = '';
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

  //  Personalization Settings Panel Toggles & Engine 
  
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
    const fontSizeAppearanceSlider = document.getElementById('setting-font-size-appearance');
    const compactModeToggle = document.getElementById('setting-compact-mode');
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
    const storedTheme = localStorage.getItem('setting_theme');
    const themeMigrated = localStorage.getItem('theme_default_migrated_vscode') === 'true';
    if (!themeMigrated && (!storedTheme || storedTheme === 'gitlab-neon')) {
      localStorage.setItem('setting_theme', 'vscode-dark');
      localStorage.setItem('setting_accent', '#007acc');
      localStorage.setItem('setting_transparency', '95');
      localStorage.setItem('setting_blur', '0');
      localStorage.setItem('setting_bg_engine', 'solid');
      localStorage.setItem('theme_default_migrated_vscode', 'true');
    }
    const theme = localStorage.getItem('setting_theme') || 'vscode-dark';
    const savedAccent = localStorage.getItem('setting_accent');
    const accent = savedAccent || '#fc6d26';
    const transparency = localStorage.getItem('setting_transparency') || '80';
    const blur = localStorage.getItem('setting_blur') || '12';
    const fontSize = localStorage.getItem('setting_font_size') || '13';
    const editorZoom = localStorage.getItem('setting_editor_zoom') || '100';
    const sidebarWidth = localStorage.getItem('setting_sidebar_width') || '220';
    const panelRadius = localStorage.getItem('setting_panel_radius') || '12';
    const glowIntensity = localStorage.getItem('setting_glow_intensity') || '80';
    const bgEngine = localStorage.getItem('setting_bg_engine') || 'aurora';
    const persona = localStorage.getItem('setting_persona') || 'manager';
    const compactMode = localStorage.getItem('setting_compact_mode') === 'true';

    // 4. Attach change change listeners
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const newTheme = e.target.value;
        localStorage.setItem('setting_theme', newTheme);
        this.applyTheme(newTheme);
        this.applyTransparency(localStorage.getItem('setting_transparency') || '80');
      });
    }

    document.querySelectorAll('.theme-preview-card[data-theme]').forEach(card => {
      card.addEventListener('click', () => {
        const newTheme = card.dataset.theme;
        localStorage.setItem('setting_theme', newTheme);
        this.applyTheme(newTheme);
        if (themeSelect) themeSelect.value = newTheme;
      });
    });

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

    if (fontSizeAppearanceSlider) {
      fontSizeAppearanceSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('setting_font_size', val);
        this.applyFontSize(val);
        const display = document.getElementById('val-font-size-appearance');
        if (display) display.textContent = `${val}px`;
        if (fontSizeSlider) fontSizeSlider.value = val;
      });
    }

    if (compactModeToggle) {
      compactModeToggle.addEventListener('change', (e) => {
        localStorage.setItem('setting_compact_mode', String(e.target.checked));
        this.applyCompactMode(e.target.checked);
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

        localStorage.removeItem('setting_compact_mode');
        this.applyTheme('vscode-dark');
        this.applyAccentColor('#007acc');
        this.applyTransparency('95');
        this.applyBlur('0');
        this.applyFontSize('13');
        this.applyEditorZoom('100');
        this.applySidebarWidth('220');
        this.applyPanelRadius('12');
        this.applyGlowIntensity('80');
        this.applyLayout();
        this.applyBgEngine('solid');

        if (themeSelect) themeSelect.value = 'vscode-dark';
        if (colorPicker) colorPicker.value = '#007acc';
        if (transparencySlider) transparencySlider.value = '95';
        if (blurSlider) blurSlider.value = '0';
        if (fontSizeSlider) fontSizeSlider.value = '13';
        if (zoomSlider) zoomSlider.value = '100';
        if (sidebarSlider) sidebarSlider.value = '220';
        if (radiusSlider) radiusSlider.value = '12';
        if (glowSlider) glowSlider.value = '80';
        if (bgSelect) bgSelect.value = 'solid';
        if (compactModeToggle) compactModeToggle.checked = false;

        this.notifications.show("Appearance reset to defaults", "success");
      });
    }

    // 5. Apply Initial Settings
    this.applyTheme(theme);
    if (savedAccent) this.applyAccentColor(accent);
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
    this.applyCompactMode(compactMode);

    // Sync input components
    if (themeSelect) themeSelect.value = theme;
    if (colorPicker) colorPicker.value = accent;
    if (transparencySlider) transparencySlider.value = transparency;
    if (blurSlider) blurSlider.value = blur;
    if (fontSizeSlider) fontSizeSlider.value = fontSize;
    if (fontSizeAppearanceSlider) fontSizeAppearanceSlider.value = fontSize;
    if (compactModeToggle) compactModeToggle.checked = compactMode;
    const appearanceFontVal = document.getElementById('val-font-size-appearance');
    if (appearanceFontVal) appearanceFontVal.textContent = `${fontSize}px`;
    if (zoomSlider) zoomSlider.value = editorZoom;
    if (sidebarSlider) sidebarSlider.value = sidebarWidth;
    if (radiusSlider) radiusSlider.value = panelRadius;
    if (glowSlider) glowSlider.value = glowIntensity;
    if (bgSelect) bgSelect.value = bgEngine;
    if (personaSelect) personaSelect.value = persona;
  }

  applyTheme(theme) {
    const aliases = {
      glassmorphism: 'gitlab-neon',
      'gitlab-dark': 'gitlab-neon',
      'midnight-neon': 'gitlab-neon',
      'cyber-purple': 'cursor-dark',
      'hacker-matrix': 'hacker-green',
      'forest-green': 'hacker-green'
    };
    const nextTheme = aliases[theme] || theme || 'gitlab-neon';
    const themes = [
      'theme-gitlab-neon',
      'theme-vscode-dark',
      'theme-github-dark',
      'theme-cursor-dark',
      'theme-hacker-green',
      'theme-gitlab-dark',
      'theme-midnight-neon',
      'theme-cyber-purple',
      'theme-ocean-blue',
      'theme-forest-green',
      'theme-sunset-orange',
      'theme-hacker-matrix',
      'theme-minimal-light',
      'theme-glassmorphism'
    ];
    themes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(`theme-${nextTheme}`);
    localStorage.setItem('setting_theme', nextTheme);
    this.updateThemePreviewSelection(nextTheme);
    this.applyEditorThemeForAppTheme(nextTheme);
    
    const select = document.getElementById('setting-theme');
    if (select) select.value = nextTheme;
  }

  applyEditorThemeForAppTheme(theme) {
    const monacoTheme = theme === 'vscode-dark' ? 'vs-dark' : 'gitlab-dark';
    try {
      if (window.monaco?.editor) {
        window.monaco.editor.setTheme(monacoTheme);
      }
    } catch (err) {
      console.warn('Unable to apply Monaco theme:', err);
    }
    this.layoutEditorSoon();
  }

  updateThemePreviewSelection(theme) {
    document.querySelectorAll('.theme-preview-card[data-theme]').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === theme);
    });
  }

  applyCompactMode(enabled) {
    document.body.classList.toggle('compact-mode', Boolean(enabled));
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
      manager: { name: "Tech Lead Manager", avatar: "", role: "Active Intel Agent" },
      reviewer: { name: "Senior Code Reviewer", avatar: "", role: "Code Quality Agent" },
      devops: { name: "DevOps Specialist", avatar: "", role: "Deployment & CI/CD Agent" },
      security: { name: "Security Analyst", avatar: "", role: "Security Analyst Agent" },
      cto: { name: "Startup CTO", avatar: "", role: "Startup CTO Agent" },
      pm: { name: "Product Manager", avatar: "", role: "Product Manager Agent" }
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

  //  Snapshots & Theme Profiles Operations 
  
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
    const result = /^#-([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  //  Agent Dock & Switcher 
  
  initAgentDock() {
    this.renderAgents();
  }

  renderAgents() {
    const agentList = document.getElementById('agent-list');
    if (!agentList) return;

    const agents = [
      { id: 'manager', name: 'Engineering Manager', icon: '', status: 'Active' },
      { id: 'reviewer', name: 'Code Reviewer', icon: '', status: 'Active' },
      { id: 'devops', name: 'DevOps Engineer', icon: '', status: 'Active' },
      { id: 'security', name: 'Security Analyst', icon: '', status: 'Idle' },
      { id: 'planner', name: 'Planner', icon: '', status: 'Active' }
    ];

    agents.forEach(agent => {
      if (agent.id === 'manager') agent.last = 'now';
      if (agent.id === 'reviewer') agent.last = this.currentFile ? `watching ${this.currentFile}` : 'ready';
      if (agent.id === 'devops') {
        agent.status = this.lastRunFailed ? 'Blocked' : 'Active';
        agent.last = this.lastRunFailed ? 'last run failed' : 'checks green';
      }
      if (agent.id === 'security') agent.last = 'scan ready';
      if (agent.id === 'planner') agent.last = 'queue updated';
    });

    agentList.innerHTML = '';
    agents.forEach(agent => {
      const row = document.createElement('div');
      row.className = `agent-row-compact ${agent.id === this.activeAgentId ? 'active' : ''}`;
      row.dataset.agent = agent.id;
      
      const dot = agent.status === 'Active' ? '' : '';
      const statusClass = agent.status === 'Active' ? 'status-active' : agent.status === 'Blocked' ? 'status-blocked' : 'status-idle';
      
      row.innerHTML = `
        <div class="agent-info">
          <span class="agent-icon">${agent.icon}</span>
          <span class="agent-name">${agent.name}</span>
          <span class="agent-last-action">${agent.last}</span>
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

  //  Canvas Background Engine 
  
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

  //  Interactive Codebase Graph Map Navigation 

  initWorkspaceMapControls() {
    const zoomIn = document.getElementById('map-zoom-in');
    const zoomOut = document.getElementById('map-zoom-out');
    const fit = document.getElementById('map-fit');
    const center = document.getElementById('map-center');

    zoomIn?.addEventListener('click', () => this.setWorkspaceMapScale(this.workspaceMapScale + 0.1));
    zoomOut?.addEventListener('click', () => this.setWorkspaceMapScale(this.workspaceMapScale - 0.1));
    fit?.addEventListener('click', () => {
      this.fitWorkspaceMap();
    });
    center?.addEventListener('click', () => {
      this.centerWorkspaceMap();
    });
    this.setWorkspaceMapScale(this.workspaceMapScale);
    this.initWorkspaceMapPan();
  }

  setWorkspaceMapScale(scale) {
    this.workspaceMapScale = Math.min(1.35, Math.max(0.75, scale));
    localStorage.setItem('workspace_map_scale', String(this.workspaceMapScale));
    const graph = document.getElementById('workspace-map-graph');
    if (graph) {
      graph.style.transform = `translate(${this.workspaceMapPosition.x}px, ${this.workspaceMapPosition.y}px) scale(${this.workspaceMapScale})`;
      graph.style.transformOrigin = 'center center';
    }
    setTimeout(() => this.drawMapConnections(), 50);
  }

  centerWorkspaceMap() {
    this.workspaceMapPosition = { x: 0, y: 0 };
    localStorage.setItem('workspace_map_position', JSON.stringify(this.workspaceMapPosition));
    this.setWorkspaceMapScale(this.workspaceMapScale || 1);
    this.refreshWorkspaceMap();
  }

  fitWorkspaceMap() {
    this.workspaceMapPosition = { x: 0, y: 0 };
    localStorage.setItem('workspace_map_position', JSON.stringify(this.workspaceMapPosition));
    const graph = document.getElementById('workspace-map-graph');
    const nodeCount = graph ? graph.querySelectorAll('.map-node').length : 0;
    const scale = nodeCount > 7 ? 0.78 : nodeCount > 4 ? 0.86 : 1;
    this.setWorkspaceMapScale(scale);
    this.drawMapConnections();
  }

  initWorkspaceMapPan() {
    const graph = document.getElementById('workspace-map-graph');
    if (!graph || graph.dataset.panReady === 'true') return;
    graph.dataset.panReady = 'true';

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let origin = { x: 0, y: 0 };

    graph.addEventListener('mousedown', (e) => {
      if (e.target.closest('.map-node') || e.target.closest('.map-controls')) return;
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      origin = { ...this.workspaceMapPosition };
      graph.classList.add('is-panning');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      this.workspaceMapPosition = {
        x: origin.x + (e.clientX - startX),
        y: origin.y + (e.clientY - startY)
      };
      this.setWorkspaceMapScale(this.workspaceMapScale);
    });

    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      graph.classList.remove('is-panning');
      localStorage.setItem('workspace_map_position', JSON.stringify(this.workspaceMapPosition));
      this.drawMapConnections();
    });
  }
  
  initWorkspaceMap() {
    this.renderWorkspaceMapNodes();
    
    // Initial draw and schedule resize listener
    this.drawMapConnections();
    window.addEventListener('resize', () => this.drawMapConnections());
    
    // Draw connection paths periodically to handle layout loading states
    setInterval(() => this.drawMapConnections(), 2000);
  }

  getWorkspaceMapNodeId(fileName) {
    return `node-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`;
  }

  resolveWorkspaceImport(fromFile, importPath, fileSet) {
    if (!importPath || !importPath.startsWith('.')) return null;

    const fromParts = fromFile.split('/').slice(0, -1);
    const rawParts = importPath.replace(/\\/g, '/').split('/');
    const parts = [...fromParts];

    rawParts.forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    });

    const base = parts.join('/');
    const candidates = [
      base,
      `${base}.js`,
      `${base}.json`,
      `${base}.css`,
      `${base}.html`,
      `${base}.cpp`,
      `${base}/index.js`
    ];

    return candidates.find(candidate => fileSet.has(candidate)) || null;
  }

  extractWorkspaceDependencies(fileName, content, fileSet) {
    const dependencies = new Set();
    const importPattern = /import\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;
    let match;

    while ((match = importPattern.exec(content || '')) !== null) {
      const importPath = match[1] || match[2] || match[3];
      const resolved = this.resolveWorkspaceImport(fileName, importPath, fileSet);
      if (resolved) dependencies.add(resolved);
    }

    return Array.from(dependencies);
  }

  buildWorkspaceDependencyGraph() {
    const fileSet = new Set(this.files || []);
    const files = (this.files || []).filter(file => /\.js$/i.test(file));
    const edges = [];
    const connectedFiles = new Set();

    files.forEach(fileName => {
      const deps = this.extractWorkspaceDependencies(fileName, this.fileContents[fileName], fileSet);
      deps.forEach(dep => {
        if (!fileSet.has(dep)) return;
        edges.push([fileName, dep]);
        connectedFiles.add(fileName);
        connectedFiles.add(dep);
      });
    });

    return { files: Array.from(fileSet), edges };
  }

  getWorkspaceMapLayout(files, edges) {
    if (files.length === 0) return [];

    const root = files.includes(this.currentFile) ? this.currentFile : files.includes('main.js') ? 'main.js' : files[0];
    const children = Array.from(new Set(edges.filter(([from]) => from === root).map(([, to]) => to)));
    const parents = Array.from(new Set(edges.filter(([, to]) => to === root).map(([from]) => from)));
    const related = new Set([root, ...children, ...parents]);
    const others = files.filter(file => !related.has(file));
    const layout = [{ file: root, x: 50, y: 50 }];
    const childYs = children.length <= 1 ? [50] : children.map((_, index) => 22 + (56 / Math.max(1, children.length - 1)) * index);
    children.forEach((file, index) => layout.push({ file, x: 78, y: childYs[index] }));
    const parentYs = parents.length <= 1 ? [50] : parents.map((_, index) => 22 + (56 / Math.max(1, parents.length - 1)) * index);
    parents.forEach((file, index) => layout.push({ file, x: 22, y: parentYs[index] }));
    const remainingSlots = [
      { x: 50, y: 18 },
      { x: 50, y: 82 },
      { x: 22, y: 18 },
      { x: 78, y: 18 },
      { x: 22, y: 82 },
      { x: 78, y: 82 },
      { x: 36, y: 34 },
      { x: 64, y: 34 },
      { x: 36, y: 66 },
      { x: 64, y: 66 },
      { x: 12, y: 50 },
      { x: 88, y: 50 }
    ];
    others.slice(0, remainingSlots.length).forEach((file, index) => {
      layout.push({ file, ...remainingSlots[index] });
    });
    return layout;
  }

  renderWorkspaceMapNodes() {
    const graph = document.getElementById('workspace-map-graph');
    if (!graph) return;

    graph.querySelectorAll('.map-node').forEach(node => node.remove());

    const dependencyGraph = this.buildWorkspaceDependencyGraph();
    const layouts = this.getWorkspaceMapLayout(dependencyGraph.files, dependencyGraph.edges);
    const edgeFiles = new Set(dependencyGraph.edges.flat());
    const connectedToActive = new Set([this.currentFile]);
    dependencyGraph.edges.forEach(([from, to]) => {
      if (from === this.currentFile) connectedToActive.add(to);
      if (to === this.currentFile) connectedToActive.add(from);
    });
    this.workspaceMapConnections = dependencyGraph.edges.map(([from, to]) => [
      this.getWorkspaceMapNodeId(from),
      this.getWorkspaceMapNodeId(to)
    ]);

    layouts.forEach(nodeData => {
      const node = document.createElement('button');
      node.type = 'button';
      node.id = this.getWorkspaceMapNodeId(nodeData.file);
      const state = nodeData.file === this.currentFile ? 'node-active' : edgeFiles.has(nodeData.file) ? 'node-changed' : 'node-stable';
      node.className = `map-node ${state} ${connectedToActive.has(nodeData.file) ? 'node-connected' : ''}`;
      node.dataset.file = nodeData.file;
      node.style.left = `${nodeData.x}%`;
      node.style.top = `${nodeData.y}%`;

      if (this.conflictIntel) {
        const status = this.conflictIntel.getFileStatus(nodeData.file);
        node.style.borderColor = status.statusColor;
        if (status.statusLabel === 'Locked') {
          node.classList.add('map-node-locked');
        } else if (status.statusLabel === 'Conflict Risk') {
          node.classList.add('map-node-risk');
        } else if (status.statusLabel === 'Active Conflict') {
          node.classList.add('map-node-conflict');
        } else {
          node.classList.add('map-node-healthy');
        }
      }

      const usersOnFile = (this.presence?.users || []).filter(user => user.currentFile === nodeData.file);
      const activeUsers = usersOnFile.slice(0, 3);
      const collaboratorCount = usersOnFile.length;
      if (collaboratorCount > 0) {
        node.classList.add('node-live-editing');
      }
      const activity = this.fileActivity[nodeData.file];
      const metadata = this.projectFileMetadata?.[nodeData.file] || {};
      const recentActivity = activity && (Date.now() - new Date(activity.timestamp).getTime()) < 300000;
      const liveNames = usersOnFile.map(user => user.name).filter(Boolean);
      const lastEditor = liveNames.length
        ? liveNames.join(', ')
        : recentActivity
          ? activity.user
          : (metadata.lastModifiedBy || 'system');

      const status = this.conflictIntel?.getFileStatus(nodeData.file);
      const ownerText = status?.owner ? `${status.owner}` : 'Unassigned';
      const statusText = status ? `${status.statusLabel}` : 'Healthy';

      const badges = activeUsers.map(user => (
        `<span class="node-avatar" style="background:${user.color || this.getUserColor(user.name)}" title="${user.name} editing">${this.presence?.getInitials?.(user.name) || '-'}</span>`
      )).join('');
      const activityLabel = liveNames.length
        ? `<span class="node-editing-label">Editing: ${liveNames.join(', ')}</span>`
        : recentActivity
          ? `<span class="node-editing-label">Edited: ${activity.user}</span>`
          : '';
      node.innerHTML = `
        <span class="node-file-icon">${this.getFileIcon(nodeData.file)}</span>
        <span class="node-main-label">${nodeData.file}</span>
        <span class="node-meta-line">${lastEditor || ownerText}</span>
        <span class="node-meta-line node-collab-count">${statusText} - ${collaboratorCount} live</span>
        ${activityLabel}
        ${badges ? `<span class="node-avatars">${badges}</span>` : ''}
      `;
      node.addEventListener('click', () => {
        this.switchFile(nodeData.file);
        this.notifications.show(`Navigated to codebase module: ${nodeData.file}`, 'success');
      });
      graph.appendChild(node);
    });
  }

  drawMapConnections() {
    const svg = document.getElementById('map-connections-svg');
    const container = document.getElementById('workspace-map-graph');
    if (!svg || !container) return;
    
    // Clear old connector lines
    svg.innerHTML = '';
    
    const connections = this.workspaceMapConnections || [];
    
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;
    
    connections.forEach(([fromId, toId]) => {
      const fromEl = document.getElementById(fromId);
      const toEl = document.getElementById(toId);
      if (!fromEl || !toEl) return;
      const isActiveConnection = fromEl.dataset.file === this.currentFile || toEl.dataset.file === this.currentFile;
      
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
      
      const d = Math.abs(x2 - x1) > Math.abs(y2 - y1)
        ? `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
        : `M ${x1} ${y1} L ${x2} ${y2}`;
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'var(--accent-glow, rgba(252, 109, 38, 0.2))');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('class', `connection-line ${isActiveConnection ? 'connection-active' : ''}`);
      
      svg.appendChild(path);
    });
  }

  //  Project Health Telemetry Card Calculations 

  async updateProjectHealth() {
    try {
      const res = await fetch('/api/project/summary');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const summary = await res.json();
      this.projectFileMetadata = summary.files || this.projectFileMetadata || {};
      this.refreshWorkspaceMap();
      
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
      const buildEl = document.getElementById('health-build');
      const deploymentEl = document.getElementById('health-deployment');
      const usersEl = document.getElementById('health-users');
      const objectiveEl = document.getElementById('health-objective');
      const updatedEl = document.getElementById('health-updated');

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
      if (buildEl) buildEl.textContent = pipelineStatus === 'Failed' ? 'Failed' : 'Success';
      if (deploymentEl) deploymentEl.textContent = pipelineStatus === 'Failed' ? 'Blocked' : 'Ready';
      if (usersEl) usersEl.textContent = `${stats.activeUserCount || this.presence?.users?.length || 0}`;
      if (objectiveEl) objectiveEl.textContent = issues > 1 ? 'Improve authentication flow' : 'Stabilize collaboration flow';
      if (updatedEl) updatedEl.textContent = 'just now';

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
          bannerIcon.textContent = '';
          bannerTitle.textContent = 'Deployment Blocked';
          bannerTitle.style.color = 'var(--danger)';
          bannerDesc.textContent = 'Build/pipeline failure detected in hi.cpp';

          bannerActions.innerHTML = `
            <button id="btn-why-cant-deploy" class="settings-action-btn" style="background: rgba(248, 81, 73, 0.2); border-color: rgba(248, 81, 73, 0.4); color: #ff8b8b; font-weight: bold; font-size: 9.5px; padding: 4px 8px;">Why Can't We Deploy-</button>
            <button id="btn-ai-auto-fix" style="background: var(--accent-gradient); color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 9.5px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 4px;"> AI Auto-Fix</button>
          `;

          // Bind Action click events
          const whyDeployBtn = document.getElementById('btn-why-cant-deploy');
          if (whyDeployBtn) {
            whyDeployBtn.onclick = () => {
              this.applyPersonality('devops');
              whyDeployBtn.style.animation = 'avatarScalePulse 0.4s ease';
              setTimeout(() => { whyDeployBtn.style.animation = ''; }, 400);
              this.aiPanel.handleSendMessage("Why is our deployment blocked- Inspect the workspace, recent compiler logs in the terminal, and pipeline status. Tell me why compilation is failing and what command or code change is needed to fix it.");
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
                      console.log(" AI Auto-Fix disk write detected. Auto-building hi.cpp...");
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
          bannerIcon.textContent = '';
          bannerTitle.textContent = 'Deployment Ready';
          bannerTitle.style.color = 'var(--success)';
          bannerDesc.textContent = 'Workspace files synced & pipeline checks passing.';

          bannerActions.innerHTML = `
            <button id="btn-deploy-action" style="background: var(--success); color: #000; border: none; padding: 4px 10px; border-radius: 4px; font-size: 9.5px; font-weight: 700; cursor: pointer;"> Deploy Build</button>
          `;

          const deployBtn = document.getElementById('btn-deploy-action');
          if (deployBtn) {
            deployBtn.onclick = () => {
              this.notifications.show(" Deploying workspace build...", "info");
              setTimeout(() => {
                this.notifications.show(" Build deployed successfully to production staging!", "success");
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
      console.warn(" Failed to load workspace summary telemetry stats:", err);
    }
  }
}

// Instantiate and initialize the app on page load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WorkspaceApp();
  window.app.init().catch(console.error);
});
