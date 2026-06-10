// 
// Collaboration Server  Real-time editing with Yjs + Presence
// Handles WebSocket connections, Yjs document sync, user presence,
// cursor sharing, and activity event broadcasting.
// 

import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import fs from 'fs';
import path from 'path';
import { TerminalSession } from './terminal-service.js';
import { ExecutionSession } from './execution-service.js';


// Palette for assigning user cursor colors
const USER_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
  '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#7bed9f'
];

// Demo project seed files  realistic content for a compelling demo
const SEED_FILES = {
  'main.js': `// Main Application Entry Point
// GitLab Co-Pilot Live  Hackathon Demo Project

import config from './config.js';
import { setupRoutes } from './api.js';
import { connectDatabase } from './database.js';

async function initialize() {
  console.log(\`Starting \${config.app.name} v\${config.app.version}\`);

  try {
    await connectDatabase();
    const app = express();
    setupRoutes(app);

    app.listen(config.app.port, () => {
      console.log(\`Server running on port \${config.app.port}\`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

initialize();
`,

  'utils.js': `// Utility Functions
// Shared helpers used across the project

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function validateEmail(email) {
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return re.test(email);
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
`,

  'config.js': `// Project Configuration
// Environment and application settings

const config = {
  app: {
    name: 'GitLab Co-Pilot Demo',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'copilot_db',
    pool: { min: 2, max: 10 }
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    tokenExpiry: '24h',
    bcryptRounds: 12
  },
  gitlab: {
    url: process.env.GITLAB_URL || 'https://gitlab.com',
    projectId: process.env.GITLAB_PROJECT_ID || ''
  }
};

export default config;
`,

  'api.js': `// API Routes
// REST endpoint handlers for the demo application

import { validateEmail } from './utils.js';

const users = [];
const projects = [];

export function setupRoutes(app) {

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // User endpoints
  app.get('/api/users', (req, res) => {
    res.json({ users, total: users.length });
  });

  app.post('/api/users', (req, res) => {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const newUser = {
      id: users.length + 1,
      name,
      email,
      role: role || 'developer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    res.status(201).json(newUser);
  });

  // Project endpoints
  app.get('/api/projects', (req, res) => {
    res.json({ projects, total: projects.length });
  });

  app.post('/api/projects', (req, res) => {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = {
      id: projects.length + 1,
      name,
      description: description || '',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    projects.push(project);
    res.status(201).json(project);
  });
}
`,

  'database.js': `// Database Connection
// Handles database initialization and connection pooling

let isConnected = false;

export async function connectDatabase() {
  console.log('Connecting to database...');

  // Simulated connection delay
  await new Promise(resolve => setTimeout(resolve, 100));

  isConnected = true;
  console.log('Database connected successfully');

  return { isConnected };
}

export async function query(sql, params = []) {
  if (!isConnected) {
    throw new Error('Database not connected');
  }

  // TODO: Implement actual database queries
  console.log('Executing query:', sql);
  return { rows: [], rowCount: 0 };
}

export async function disconnect() {
  isConnected = false;
  console.log('Database disconnected');
}
`
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

class CollabServer {
  constructor(httpServer, projectMemory) {
    this.wss = new WebSocketServer({ noServer: true });
    this.memory = projectMemory;
    this.activeDocuments = new Map();  // "room:file"  Y.Doc
    this.connections = new Map();      // ws  { id, room, file, user }
    this.rooms = new Map();            // room  Set<ws>
    this.nextColorIndex = 0;
    this.editDebounceTimers = new Map();

    // Seed demo files into project memory
    this.seedFiles();

    // Start watching files for external disk changes
    this.setupFileWatcher();

    // Register ProjectMemory event callbacks for real-time broadcasting
    this.setupMemoryCallbacks();

    // Handle HTTP  WebSocket upgrade
    httpServer.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });

    // Handle new connections
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    // Start periodic check for lock inactivity
    this.lockCheckInterval = setInterval(() => {
      this.checkLockExpirations();
    }, 15000); // Check every 15 seconds

    console.log(' Collaboration server initialized');
  }

  checkLockExpirations() {
    const now = Date.now();
    const locks = this.memory.fileLocks;
    for (const [file, lock] of locks.entries()) {
      const lastAct = lock.lastActivityAt ? new Date(lock.lastActivityAt).getTime() : new Date(lock.lockedAt).getTime();
      const elapsedMs = now - lastAct;
      
      // 15 min lock expiration: 900000 ms
      if (elapsedMs >= 15 * 60 * 1000) {
        console.log(`[FileLockExpired] Lock expired for ${file} owned by ${lock.owner}`);
        this.memory.logActivity('system', 'FileLockExpired', file, { owner: lock.owner, reason: 'Inactive for 15 minutes' });
        this.memory.unlockFile(file, 'System');
        
        for (const roomName of this.rooms.keys()) {
          this.broadcastToRoom(roomName, {
            type: 'managerAlert',
            alertType: 'lock_expired',
            data: { file, owner: lock.owner }
          });
        }
      } 
      // 10 min warning: 600000 ms
      else if (elapsedMs >= 10 * 60 * 1000 && !lock.warned) {
        lock.warned = true;
        this.memory.logActivity('system', 'LockWarning', file, { owner: lock.owner, reason: 'Inactive for 10 minutes' });
        
        for (const roomName of this.rooms.keys()) {
          this.broadcastToRoom(roomName, {
            type: 'managerAlert',
            alertType: 'lock_warning',
            data: {
              file,
              owner: lock.owner,
              message: `Lock on ${file} by ${lock.owner} will expire in 5 minutes due to inactivity.`
            }
          }, null);
        }
      }
    }
  }

  //  Memory Event Callbacks 

  setupMemoryCallbacks() {
    this.memory.onConflictDetected = (risk) => {
      for (const roomName of this.rooms.keys()) {
        this.broadcastToRoom(roomName, {
          type: 'managerAlert',
          alertType: 'conflict_risk',
          data: risk
        }, null);
        this.broadcastConflictIntelligence(roomName);
      }
    };

    this.memory.onOwnershipChanged = (fileName, ownerData) => {
      for (const roomName of this.rooms.keys()) {
        const type = ownerData.previousOwner ? 'ownershipTransferred' : 'ownershipAssigned';
        this.broadcastToRoom(roomName, {
          type,
          file: fileName,
          owner: ownerData.owner,
          previousOwner: ownerData.previousOwner,
          ownership: this.memory.getFileOwnership()
        }, null);
        this.broadcastToRoom(roomName, {
          type: 'ownershipUpdate',
          ownership: this.memory.getFileOwnership()
        }, null);
      }
    };

    this.memory.onLockChanged = (fileName, lockData, action) => {
      for (const roomName of this.rooms.keys()) {
        const type = action === 'locked' ? 'fileLocked' : 'fileUnlocked';
        this.broadcastToRoom(roomName, {
          type,
          file: fileName,
          owner: lockData.owner,
          status: lockData.status,
          locks: this.memory.getLockedFiles(),
          event: { fileName, ...lockData, action }
        }, null);
        this.broadcastToRoom(roomName, {
          type: 'lockUpdate',
          locks: this.memory.getLockedFiles(),
          event: { fileName, ...lockData, action }
        }, null);
        this.broadcastConflictIntelligence(roomName);
      }
    };
  }

  broadcastConflictIntelligence(room) {
    this.broadcastToRoom(room, {
      type: 'conflictUpdate',
      risks: this.memory.getConflictRisks(),
      ownership: this.memory.getFileOwnership(),
      locks: this.memory.getLockedFiles()
    }, null);
  }

  //  Initialization 

  seedFiles() {
    if (this.memory.getFileNames().length > 0) {
      console.log(" Storage already has files. Skipping seed.");
      return;
    }
    for (const [fileName, content] of Object.entries(SEED_FILES)) {
      this.memory.updateFile(fileName, content, 'system');
    }
    console.log(` Seeded ${Object.keys(SEED_FILES).length} demo files`);
  }

  createFile(fileName, content = '', userName = 'system') {
    this.memory.createFile(fileName, content, userName);
    
    // Broadcast fileList to all rooms
    for (const roomName of this.rooms.keys()) {
      this.broadcastToRoom(roomName, {
        type: 'fileList',
        files: this.memory.getFileNames()
      });
      // Broadcast activity event
      const event = this.memory.logActivity(userName, 'created_file', fileName);
      this.broadcastToRoom(roomName, { type: 'activity', event });
    }
  }

  renameFile(oldName, newName, userName = 'system') {
    this.memory.renameFile(oldName, newName, userName);

    // Update activeDocuments map
    for (const roomName of this.rooms.keys()) {
      const oldKey = `${roomName}:${oldName}`;
      const newKey = `${roomName}:${newName}`;
      if (this.activeDocuments.has(oldKey)) {
        this.activeDocuments.set(newKey, this.activeDocuments.get(oldKey));
        this.activeDocuments.delete(oldKey);
      }

      // Update client connection info
      const roomSet = this.rooms.get(roomName);
      if (roomSet) {
        for (const ws of roomSet) {
          const conn = this.connections.get(ws);
          if (conn && conn.file === oldName) {
            conn.file = newName;
            this.memory.userSwitchedFile(conn.id, newName);
            // Notify this client to switch their editor context
            this.sendJSON(ws, { type: 'fileChanged', file: newName });
            
            // Send new Yjs state update
            const doc = this.getOrCreateDocument(`${roomName}:${newName}`);
            const stateUpdate = Y.encodeStateAsUpdate(doc);
            if (ws.readyState === 1) {
              ws.send(stateUpdate);
            }
          }
        }
      }

      // Broadcast fileList
      this.broadcastToRoom(roomName, {
        type: 'fileList',
        files: this.memory.getFileNames()
      });

      // Broadcast presence updates since current files changed
      this.broadcastPresence(roomName);

      // Broadcast activity event
      const event = this.memory.logActivity(userName, 'renamed_file', `${oldName} to ${newName}`);
      this.broadcastToRoom(roomName, { type: 'activity', event });
    }
  }

  deleteFile(fileName, userName = 'system') {
    this.memory.deleteFile(fileName, userName);

    // Update activeDocuments map
    for (const roomName of this.rooms.keys()) {
      const docKey = `${roomName}:${fileName}`;
      if (this.activeDocuments.has(docKey)) {
        this.activeDocuments.delete(docKey);
      }

      // Update client connection info
      const roomSet = this.rooms.get(roomName);
      if (roomSet) {
        for (const ws of roomSet) {
          const conn = this.connections.get(ws);
          if (conn && conn.file === fileName) {
            // Find a fallback file (first available one)
            const fallback = this.memory.getFileNames()[0] || 'main.js';
            conn.file = fallback;
            this.memory.userSwitchedFile(conn.id, fallback);
            this.sendJSON(ws, { type: 'fileChanged', file: fallback });
            
            // Send new Yjs state update
            const doc = this.getOrCreateDocument(`${roomName}:${fallback}`);
            const stateUpdate = Y.encodeStateAsUpdate(doc);
            if (ws.readyState === 1) {
              ws.send(stateUpdate);
            }
          }
        }
      }

      // Broadcast fileList
      this.broadcastToRoom(roomName, {
        type: 'fileList',
        files: this.memory.getFileNames()
      });

      // Broadcast presence updates
      this.broadcastPresence(roomName);

      // Broadcast activity event
      const event = this.memory.logActivity(userName, 'deleted_file', fileName);
      this.broadcastToRoom(roomName, { type: 'activity', event });
    }
  }

  getOrCreateDocument(roomAndFile) {
    if (!this.activeDocuments.has(roomAndFile)) {
      const doc = new Y.Doc();
      const yText = doc.getText('code-content');

      const [room, file] = roomAndFile.split(':');
      const existingContent = this.memory.getFileContent(file);
      const initialText = existingContent || `// ${file}\n`;
      yText.insert(0, initialText);

      // Listen for updates made from disk sync
      doc.on('update', (update, origin) => {
        if (origin === 'disk') {
          this.broadcastBinaryToFilePeers(null, room, file, Buffer.from(update));
        }
      });

      this.activeDocuments.set(roomAndFile, doc);
    }
    return this.activeDocuments.get(roomAndFile);
  }

  assignColor() {
    const color = USER_COLORS[this.nextColorIndex % USER_COLORS.length];
    this.nextColorIndex++;
    return color;
  }

  //  Connection Handling 

  handleConnection(ws, request) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathParts = url.pathname.split('/');
    const roomName = pathParts[pathParts.length - 1] || 'hackathon-demo';
    const fileName = url.searchParams.get('file') || 'main.js';
    const connectionId = generateId();

    // Store connection metadata
    const connInfo = {
      id: connectionId,
      room: roomName,
      file: fileName,
      user: null,
      terminal: null,
      activeExecution: null
    };
    this.connections.set(ws, connInfo);

    // Initialize terminal session for this user connection
    connInfo.terminal = new TerminalSession((output) => {
      this.sendJSON(ws, {
        type: 'terminalOutput',
        output
      });
    });

    // Add to room
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(ws);

    // Send file list
    this.sendJSON(ws, {
      type: 'fileList',
      files: this.memory.getFileNames()
    });

    // Send initial Yjs document state
    const doc = this.getOrCreateDocument(`${roomName}:${fileName}`);
    const stateUpdate = Y.encodeStateAsUpdate(doc);
    if (ws.readyState === 1) {
      ws.send(stateUpdate);
    }

    console.log(`[ROOM_JOIN] room=${roomName} file=${fileName} connection=${connectionId.slice(0, 8)}`);

    //  Message Handler 

    ws.on('message', (message, isBinary) => {
      if (isBinary || message instanceof Buffer) {
        // Check if it might be a JSON string sent as buffer
        try {
          const str = message.toString();
          if (str.startsWith('{')) {
            const msg = JSON.parse(str);
            this.handleControlMessage(ws, msg);
            return;
          }
        } catch (e) {
          // Not JSON, treat as Yjs binary
        }
        this.handleYjsUpdate(ws, message);
      } else {
        try {
          const msg = JSON.parse(message.toString());
          this.handleControlMessage(ws, msg);
        } catch (e) {
          // If not valid JSON, attempt as Yjs update
          this.handleYjsUpdate(ws, message);
        }
      }
    });

    //  Disconnect Handler 

    ws.on('close', () => this.handleDisconnect(ws));
    ws.on('error', (err) => {
      console.error(`WebSocket error [${connectionId.slice(0, 8)}]:`, err.message);
      this.handleDisconnect(ws);
    });
  }

  //  Yjs Synchronization 

  handleYjsUpdate(ws, message) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    const { room, file } = conn;
    const docKey = `${room}:${file}`;
    const doc = this.getOrCreateDocument(docKey);
    const userName = conn.user?.name || 'anonymous';
    const updateSize = message.byteLength || message.length || 0;

    console.log(`[SERVER_UPDATE_RECEIVED] room=${room} file=${file} user=${userName} size=${updateSize}`);
    console.log(` UPDATE_FROM_CLIENT user=${userName} file=${file} room=${room} size=${updateSize}`);

    try {
      Y.applyUpdate(doc, new Uint8Array(message));

      // Update project memory with latest content
      const content = doc.getText('code-content').toString();

      // Check lock enforcement before allowing edit
      const lockCheck = this.memory.canEditFile(userName, file);
      if (!lockCheck.allowed && userName !== 'anonymous') {
        const lock = this.memory.fileLocks.get(file);
        this.sendJSON(ws, {
          type: 'lockEnforcement',
          file,
          owner: lock?.owner || 'Unknown',
          reason: lockCheck.reason,
          options: ['request_ownership', 'create_branch', 'read_only']
        });
        // Still allow the update to proceed  the modal is informational
      }

      // updateFile may throw via assertCanEditFile for non-owners on locked
      // files. Since Y.applyUpdate already modified the Yjs doc above, we must
      // not let this throw skip the broadcast and break Yjs sync consistency.
      try {
        this.memory.updateFile(file, content, userName);
      } catch (updateErr) {
        console.warn(`[CollabServer] updateFile skipped for ${file}: ${updateErr.message}`);
      }

      // Debounced activity logging (avoid spamming on every keystroke)
      const debounceKey = `${room}:${file}:${userName}`;
      if (this.editDebounceTimers.has(debounceKey)) {
        clearTimeout(this.editDebounceTimers.get(debounceKey));
      }
      this.editDebounceTimers.set(debounceKey, setTimeout(() => {
        const event = this.memory.logActivity(userName, 'edited', file, {
          lineCount: content.split('\n').length,
          size: content.length
        });
        // Broadcast activity event to entire room
        this.broadcastToRoom(room, { type: 'activity', event }, null);
        this.editDebounceTimers.delete(debounceKey);
      }, 3000));

      // Broadcast Yjs update only to peers editing the SAME file
      this.broadcastBinaryToFilePeers(ws, room, file, message);
    } catch (err) {
      console.error('Yjs sync error:', err.message);
      this.sendJSON(ws, {
        type: 'managerDecision',
        status: 'blocked',
        file,
        message: err.message
      });
    }
  }

  //  Control Messages 

  handleControlMessage(ws, msg) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    switch (msg.type) {
      case 'join': {
        try {
          const rawName = msg.user?.name;
          const canonicalName = this.memory.getCanonicalUsername(rawName);
          if (!canonicalName || this.memory.isSystemActor(canonicalName)) {
            throw new Error(`Unauthorized or invalid username: "${rawName || 'Anonymous'}"`);
          }

          console.log('[ROOM_JOIN]', { userName: canonicalName, file: conn.file, room: conn.room });

          const color = msg.user?.color || this.assignColor();
          conn.user = {
            name: canonicalName,
            color
          };

          // Register in project memory
          this.memory.userJoined(conn.id, conn.user.name, color);
          this.memory.userSwitchedFile(conn.id, conn.file);

          // Send welcome response
          this.sendJSON(ws, {
            type: 'welcome',
            connectionId: conn.id,
            assignedColor: color,
            user: conn.user
          });

          // Broadcast presence to entire room
          this.broadcastPresence(conn.room);

          // Send recent activity history
          this.sendJSON(ws, {
            type: 'activityHistory',
            events: this.memory.getRecentActivity(20)
          });

          // Send initial conflict intelligence data
          this.sendJSON(ws, {
            type: 'conflictUpdate',
            risks: this.memory.getConflictRisks(),
            ownership: this.memory.getFileOwnership(),
            locks: this.memory.getLockedFiles()
          });

          console.log(` ${conn.user.name} joined [${conn.room}] file=[${conn.file}]  color ${color}`);
        } catch (err) {
          console.error(` Join rejected: ${err.message}`);
          this.sendJSON(ws, {
            type: 'joinFailed',
            message: err.message
          });
          ws.close(4001, err.message);
        }
        break;
      }

      case 'lockFile': {
        const { file, owner } = msg;
        if (!file || !owner) break;
        try {
          this.memory.lockFile(file, owner, 'Locked');
        } catch (err) {
          console.warn(`[CollabServer] lockFile failed: ${err.message}`);
          this.sendJSON(ws, {
            type: 'lockEnforcement',
            file,
            owner: this.memory.fileOwnership.get(file)?.owner || 'unknown',
            reason: err.message
          });
        }
        break;
      }

      case 'unlockFile': {
        const { file, owner } = msg;
        if (!file) break;
        try {
          this.memory.unlockFile(file, owner || 'Manager');
        } catch (err) {
          console.warn(`[CollabServer] unlockFile failed: ${err.message}`);
          this.sendJSON(ws, {
            type: 'lockEnforcement',
            file,
            owner: this.memory.fileLocks.get(file)?.owner || 'unknown',
            reason: err.message
          });
        }
        break;
      }

      case 'requestOwnership': {
        const { file, from, to } = msg;
        if (!file || !from || !to) break;
        
        const event = this.memory.logActivity(from, 'OwnershipRequest', file, { from, to });
        
        this.broadcastToRoom(conn.room, {
          type: 'ownershipRequestReceived',
          file,
          from,
          to,
          event
        }, null);
        break;
      }

      case 'approveOwnership': {
        const { file, from, to } = msg;
        if (!file || !from || !to) break;
        
        // Transfer ownership
        this.memory.transferOwnership(file, from, to, from);
        
        const event = this.memory.logActivity(from, 'OwnershipApproved', file, { from, to });
        
        this.broadcastToRoom(conn.room, {
          type: 'ownershipApprovedReceived',
          file,
          from,
          to,
          event
        }, null);
        break;
      }

      case 'rejectOwnership': {
        const { file, from, to } = msg;
        if (!file || !from || !to) break;
        
        const event = this.memory.logActivity(from, 'OwnershipRejected', file, { from, to });
        
        this.broadcastToRoom(conn.room, {
          type: 'ownershipRejectedReceived',
          file,
          from,
          to,
          event
        }, null);
        break;
      }

      case 'switchFile': {
        const newFile = msg.file;
        if (!newFile || newFile === conn.file) break;

        conn.file = newFile;
        console.log(`[ROOM_JOIN] room=${conn.room} file=${newFile} connection=${conn.id.slice(0, 8)} switchFile=true`);

        // Update presence tracking
        this.memory.userSwitchedFile(conn.id, newFile);

        // Notify client that file context is changing
        this.sendJSON(ws, { type: 'fileChanged', file: newFile });

        // Send Yjs state for the new file
        const newDoc = this.getOrCreateDocument(`${conn.room}:${newFile}`);
        const stateUpdate = Y.encodeStateAsUpdate(newDoc);
        if (ws.readyState === 1) {
          ws.send(stateUpdate);
        }

        // Broadcast updated presence
        this.broadcastPresence(conn.room);
        
        // Check conflicts and broadcast conflict updates live
        this.memory.runConflictCheck('file_edit');
        this.broadcastConflictIntelligence(conn.room);
        break;
      }

      case 'cursor': {
        // Broadcast cursor position to peers editing the same file
        this.broadcastToFilePeers(conn.room, conn.file, {
          type: 'remoteCursor',
          user: conn.user,
          connectionId: conn.id,
          file: conn.file,
          cursor: msg.cursor
        }, ws);
        
        // Run conflict check and broadcast
        this.memory.runConflictCheck('file_edit');
        this.broadcastConflictIntelligence(conn.room);
        break;
      }

      case 'contentSnapshot': {
        const file = msg.file || conn.file;
        if (!file || file !== conn.file) break;
        const content = typeof msg.content === 'string' ? msg.content : '';
        const userName = conn.user?.name || 'anonymous';
        console.log(`[SERVER_UPDATE_RECEIVED] mode=snapshot room=${conn.room} file=${file} user=${userName} size=${content.length}`);

        try {
          this.memory.updateFile(file, content, userName);
        } catch (updateErr) {
          console.warn(`[CollabServer] snapshot updateFile skipped for ${file}: ${updateErr.message}`);
        }

        this.broadcastToFilePeers(conn.room, file, {
          type: 'contentSnapshot',
          file,
          content,
          user: conn.user,
          connectionId: conn.id,
          timestamp: msg.timestamp || Date.now()
        }, ws);
        console.log(`[SERVER_BROADCAST] mode=snapshot room=${conn.room} file=${file} user=${userName} size=${content.length}`);
        break;
      }

      case 'terminalInput': {
        if (conn.terminal) {
          conn.terminal.write(msg.input);
        }
        break;
      }

      case 'runFile': {
        const fileName = msg.file;
        if (!fileName) break;

        if (conn.activeExecution) {
          conn.activeExecution.kill();
        }

        conn.activeExecution = new ExecutionSession();
        conn.activeExecution.runFile(
          fileName,
          conn.id,
          (status, details) => {
            this.sendJSON(ws, { type: 'runStatus', status, details });
          },
          (category, text) => {
            this.sendJSON(ws, { type: 'runOutput', category, text });
          }
        );
        break;
      }

      default:
        // Unknown message type  ignore silently
        break;
    }
  }

  //  Disconnect Handling 

  handleDisconnect(ws) {
    const conn = this.connections.get(ws);
    if (!conn) return;

    // Clean up active running process
    if (conn.activeExecution) {
      conn.activeExecution.kill();
      conn.activeExecution = null;
    }

    // Clean up terminal process
    if (conn.terminal) {
      conn.terminal.kill();
      conn.terminal = null;
    }

    // Remove from room
    const roomSet = this.rooms.get(conn.room);
    if (roomSet) {
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        this.rooms.delete(conn.room);
      }
    }

    // Update project memory
    if (conn.user) {
      this.memory.userLeft(conn.id);
      console.log(` ${conn.user.name} left [${conn.room}]`);
    }

    // Clean up
    this.connections.delete(ws);

    // Broadcast updated presence
    if (conn.room) {
      this.broadcastPresence(conn.room);
    }
  }

  //  Broadcasting 

  sendJSON(ws, data) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcastToRoom(room, data, excludeWs) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) return;

    const message = JSON.stringify(data);
    for (const client of roomSet) {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(message);
      }
    }
  }

  broadcastToFilePeers(room, file, data, excludeWs) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) return;

    const message = JSON.stringify(data);
    for (const client of roomSet) {
      if (client === excludeWs) continue;
      const clientConn = this.connections.get(client);
      if (clientConn && clientConn.file === file && client.readyState === 1) {
        client.send(message);
      }
    }
  }

  broadcastBinaryToFilePeers(senderWs, room, file, binaryData) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) {
      console.log(` BROADCAST_NO_ROOM room=${room}`);
      return;
    }

    const senderConn = senderWs ? this.connections.get(senderWs) : null;
    const senderName = senderConn?.user?.name || 'server';
    let sentCount = 0;

    for (const client of roomSet) {
      if (client === senderWs) continue;
      const clientConn = this.connections.get(client);
      if (!clientConn) {
        console.log(` BROADCAST_SKIP reason=no_conn_info`);
        continue;
      }
      if (clientConn.file !== file) {
        console.log(` BROADCAST_SKIP reason=file_mismatch peer=${clientConn.user?.name || clientConn.id} peerFile=${clientConn.file} senderFile=${file}`);
        continue;
      }
      if (client.readyState !== 1) {
        console.log(` BROADCAST_SKIP reason=ws_not_open peer=${clientConn.user?.name || clientConn.id} readyState=${client.readyState}`);
        continue;
      }
      client.send(binaryData);
      sentCount++;
      console.log(`[SERVER_BROADCAST] room=${room} file=${file} to=${clientConn.user?.name || clientConn.id} size=${binaryData.byteLength || binaryData.length || 0}`);
      console.log(` BROADCAST_TO_CLIENT from=${senderName} to=${clientConn.user?.name || clientConn.id} file=${file} size=${binaryData.byteLength || binaryData.length || 0}`);
    }

    if (sentCount === 0) {
      console.log(`[SERVER_BROADCAST] room=${room} file=${file} sent=0 roomSize=${roomSet.size}`);
      console.log(` BROADCAST_EMPTY from=${senderName} file=${file} roomSize=${roomSet.size} (no matching peers)`);
    }
  }

  broadcastPresence(room) {
    const users = this.memory.getActiveUsers();
    this.broadcastToRoom(room, { type: 'presence', users }, null);
  }

  //  Public API 

  broadcastFileReload(fileName, content) {
    console.log(` Forcing file reload for Yjs document: ${fileName}`);
    for (const roomName of this.rooms.keys()) {
      const docKey = `${roomName}:${fileName}`;
      const doc = this.activeDocuments.get(docKey);
      if (doc) {
        const yText = doc.getText('code-content');
        doc.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, content);
        }, 'remote');
      }
    }
  }

  getActiveUsers() {
    return this.memory.getActiveUsers();
  }

  getConnectionCount() {
    return this.connections.size;
  }

  //  Filesystem Watching (Disk  Editor) 

  setupFileWatcher() {
    const workspaceDir = path.join(process.cwd(), 'workspace');
    fs.mkdirSync(workspaceDir, { recursive: true });

    try {
      fs.watch(workspaceDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        this.handleDiskFileChange(filename);
      });
      console.log(' Filesystem watcher active on workspace/ directory');
    } catch (err) {
      console.error(' Failed to start filesystem watcher:', err.message);
    }
  }

  isWorkspaceFile(filename) {
    const normalized = filename.replace(/\\/g, '/');
    
    // Ignore dotfiles and standard ignored directories/files
    if (
      normalized.startsWith('.') ||
      normalized.includes('/.') ||
      normalized.startsWith('node_modules/') ||
      normalized.startsWith('.git/')
    ) {
      return false;
    }

    const ext = path.extname(normalized).toLowerCase();
    const allowedExtensions = ['.js', '.py', '.cpp', '.css', '.html', '.json', '.md', '.txt', '.env'];
    return allowedExtensions.includes(ext);
  }

  handleDiskFileChange(filename) {
    if (!this.isWorkspaceFile(filename)) return;

    const normalizedName = filename.replace(/\\/g, '/');
    const filePath = path.join(process.cwd(), 'workspace', normalizedName);

    // Set a short delay to allow complete write operation
    setTimeout(() => {
      try {
        if (!fs.existsSync(filePath)) {
          // File was deleted on disk
          if (this.memory.files.has(normalizedName)) {
            console.log(` Disk Sync: File deleted on disk: ${normalizedName}. Deleting in-memory.`);
            this.deleteFile(normalizedName, 'disk');
          }
          return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const memoryContent = this.memory.getFileContent(normalizedName);

        if (content !== memoryContent) {
          console.log(` Disk Sync: File modified on disk: ${normalizedName}. Syncing to memory.`);
          if (!this.memory.files.has(normalizedName)) {
            this.memory.createFile(normalizedName, content, 'disk');
            // Broadcast fileList to update clients
            for (const roomName of this.rooms.keys()) {
              this.broadcastToRoom(roomName, {
                type: 'fileList',
                files: this.memory.getFileNames()
              });
            }
          } else {
            this.memory.updateFile(normalizedName, content, 'disk');
          }

          // Sync the active Yjs document if loaded
          for (const roomName of this.rooms.keys()) {
            const docKey = `${roomName}:${normalizedName}`;
            const doc = this.activeDocuments.get(docKey);
            if (doc) {
              const yText = doc.getText('code-content');
              if (yText.toString() !== content) {
                doc.transact(() => {
                  yText.delete(0, yText.length);
                  yText.insert(0, content);
                }, 'disk');
              }
            }
          }
        }
      } catch (err) {
        // Safe catch for lock contention or file deletion race
      }
    }, 100);
  }
}

export default CollabServer;
