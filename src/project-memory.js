import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// Project Memory — The brain of GitLab Co-Pilot Live
// Tracks all file state, activity events, and user sessions.
// This data is consumed by the AI Engine for project understanding.
// ═══════════════════════════════════════════════════════════════

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

class ProjectMemory {
  constructor(projectName = 'hackathon-demo') {
    this.projectName = projectName;

    // File contents and metadata: Map<fileName, { content, lastModified, ... }>
    this.files = new Map();

    // Chronological activity log
    this.activityLog = [];

    // Active user sessions: Map<connectionId, { name, color, joinedAt, ... }>
    this.activeSessions = new Map();

    // Per-user edit statistics
    this.userStats = new Map();

    this.storagePath = path.join(process.cwd(), 'workspace-storage.json');
    this.loadFromDisk();

    console.log(`🧠 Project Memory initialized for: ${projectName}`);
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const fileContent = fs.readFileSync(this.storagePath, 'utf8');
        if (fileContent.trim()) {
          const data = JSON.parse(fileContent);
          if (data.files) {
            this.files = new Map(Object.entries(data.files));
            // Sync all workspace files to disk on startup
            for (const [fileName, fileData] of this.files.entries()) {
              this.syncToDisk(fileName, fileData.content);
            }
          }
          if (data.activityLog) {
            this.activityLog = data.activityLog;
          }
          if (data.userStats) {
            this.userStats = new Map();
            for (const [username, stats] of Object.entries(data.userStats)) {
              this.userStats.set(username, {
                edits: stats.edits || 0,
                filesModified: new Set(Array.isArray(stats.filesModified) ? stats.filesModified : [])
              });
            }
          }
          console.log(`💾 Loaded project state from disk: ${this.storagePath}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to load project memory from disk:`, err.message);
    }
  }

  saveToDisk() {
    try {
      const serializedUserStats = {};
      for (const [username, stats] of this.userStats.entries()) {
        serializedUserStats[username] = {
          edits: stats.edits,
          filesModified: Array.from(stats.filesModified || [])
        };
      }
      const data = {
        files: Object.fromEntries(this.files),
        activityLog: this.activityLog,
        userStats: serializedUserStats
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`❌ Failed to save project memory to disk:`, err.message);
    }
  }

  syncToDisk(fileName, content) {
    try {
      const filePath = path.join(process.cwd(), 'workspace', fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (err) {
      console.error(`❌ Failed to sync file ${fileName} to disk:`, err.message);
    }
  }

  deleteFromDisk(fileName) {
    try {
      const filePath = path.join(process.cwd(), 'workspace', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`❌ Failed to delete file ${fileName} from disk:`, err.message);
    }
  }

  createFile(fileName, content = '', changedBy = 'system') {
    if (this.files.has(fileName)) {
      throw new Error(`File ${fileName} already exists`);
    }
    this.updateFile(fileName, content, changedBy);
    this.saveToDisk();
  }

  renameFile(oldName, newName, changedBy = 'system') {
    if (!this.files.has(oldName)) {
      throw new Error(`File ${oldName} does not exist`);
    }
    if (this.files.has(newName)) {
      throw new Error(`File ${newName} already exists`);
    }
    const fileData = this.files.get(oldName);
    this.files.delete(oldName);
    this.files.set(newName, fileData);

    if (changedBy !== 'disk') {
      try {
        const oldPath = path.join(process.cwd(), 'workspace', oldName);
        const newPath = path.join(process.cwd(), 'workspace', newName);
        if (fs.existsSync(oldPath)) {
          fs.mkdirSync(path.dirname(newPath), { recursive: true });
          fs.renameSync(oldPath, newPath);
        } else {
          this.syncToDisk(newName, fileData.content);
        }
      } catch (err) {
        console.error(`❌ Failed to rename file on disk:`, err.message);
      }
    }

    this.saveToDisk();
  }

  deleteFile(fileName, changedBy = 'system') {
    if (!this.files.has(fileName)) {
      throw new Error(`File ${fileName} does not exist`);
    }
    this.files.delete(fileName);
    if (changedBy !== 'disk') {
      this.deleteFromDisk(fileName);
    }
    this.saveToDisk();
  }

  // ── File Management ──────────────────────────────────────

  updateFile(fileName, content, changedBy = 'system') {
    const now = new Date().toISOString();
    const previous = this.files.get(fileName);
    const existed = previous !== undefined;

    this.files.set(fileName, {
      content,
      lastModified: now,
      lastModifiedBy: changedBy,
      lineCount: content.split('\n').length,
      size: content.length,
      version: (previous?.version || 0) + 1
    });

    if (changedBy !== 'disk') {
      this.syncToDisk(fileName, content);
    }

    // Track per-user statistics
    if (changedBy !== 'system' && changedBy !== 'disk') {
      if (!this.userStats.has(changedBy)) {
        this.userStats.set(changedBy, { edits: 0, filesModified: new Set() });
      }
      const stats = this.userStats.get(changedBy);
      stats.edits++;
      stats.filesModified.add(fileName);
    }

    // Log file creation events
    if (!existed) {
      this.logActivity(changedBy, 'created_file', fileName, {
        lineCount: content.split('\n').length
      });
    }

    this.saveToDisk();
  }

  getFile(fileName) {
    return this.files.get(fileName) || null;
  }

  getFileContent(fileName) {
    return this.files.get(fileName)?.content || null;
  }

  getAllFiles() {
    const result = {};
    for (const [name, data] of this.files) {
      result[name] = {
        lastModified: data.lastModified,
        lastModifiedBy: data.lastModifiedBy,
        lineCount: data.lineCount,
        size: data.size,
        version: data.version
      };
    }
    return result;
  }

  getAllFileContents() {
    const result = {};
    for (const [name, data] of this.files) {
      result[name] = data.content;
    }
    return result;
  }

  getFileNames() {
    return Array.from(this.files.keys());
  }

  // ── Activity Tracking ────────────────────────────────────

  logActivity(user, action, target, details = null) {
    const event = {
      id: generateId(),
      user,
      action,
      target,
      details,
      timestamp: new Date().toISOString()
    };

    this.activityLog.push(event);

    // Keep last 1000 events to prevent unbounded growth
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-1000);
    }

    return event;
  }

  getRecentActivity(count = 50) {
    return this.activityLog.slice(-count).reverse();
  }

  getActivitySince(isoTimestamp) {
    return this.activityLog
      .filter(e => e.timestamp > isoTimestamp)
      .reverse();
  }

  getActivityByUser(userName, count = 20) {
    return this.activityLog
      .filter(e => e.user === userName)
      .slice(-count)
      .reverse();
  }

  // ── User Session Management ──────────────────────────────

  userJoined(connectionId, userName, userColor) {
    this.activeSessions.set(connectionId, {
      name: userName,
      color: userColor,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      currentFile: null
    });
    this.logActivity(userName, 'joined', 'workspace');
    return this.getActiveUsers();
  }

  userLeft(connectionId) {
    const session = this.activeSessions.get(connectionId);
    if (session) {
      this.logActivity(session.name, 'left', 'workspace');
      this.activeSessions.delete(connectionId);
    }
    return this.getActiveUsers();
  }

  userSwitchedFile(connectionId, fileName) {
    const session = this.activeSessions.get(connectionId);
    if (session) {
      const oldFile = session.currentFile;
      session.currentFile = fileName;
      session.lastSeen = new Date().toISOString();
      if (oldFile !== fileName && oldFile !== null) {
        this.logActivity(session.name, 'opened', fileName);
      }
    }
  }

  getActiveUsers() {
    const users = [];
    for (const [id, session] of this.activeSessions) {
      users.push({
        id,
        name: session.name,
        color: session.color,
        currentFile: session.currentFile,
        joinedAt: session.joinedAt
      });
    }
    return users;
  }

  getUserByConnection(connectionId) {
    return this.activeSessions.get(connectionId) || null;
  }

  getPipelineStatus() {
    // Find the latest pipeline event
    const latestPipelineEvent = this.activityLog
      .slice()
      .reverse()
      .find(e => e.action === 'pipeline_failed' || e.action === 'pipeline_passed');
    
    if (latestPipelineEvent) {
      return latestPipelineEvent.action === 'pipeline_failed' ? 'Failed' : 'Passing';
    }
    return 'Passing';
  }

  // ── Project Summary (for AI context in Phase 2) ──────────

  getProjectSummary() {
    const userStatsObj = {};
    for (const [name, stats] of this.userStats) {
      userStatsObj[name] = {
        edits: stats.edits,
        filesModified: Array.from(stats.filesModified)
      };
    }

    const pipelineStatus = this.getPipelineStatus();

    const stats = {
      totalFiles: this.files.size,
      totalLines: Array.from(this.files.values()).reduce((sum, f) => sum + f.lineCount, 0),
      totalSize: Array.from(this.files.values()).reduce((sum, f) => sum + f.size, 0),
      totalEvents: this.activityLog.length,
      activeUserCount: this.activeSessions.size
    };

    // Calculate readinessScore here to match the frontend formula
    const mrs = Math.max(1, (stats.totalFiles % 3) + 1);
    const issues = Math.max(1, 5 - Math.floor(stats.totalEvents / 15));
    const testPct = 98;
    const securityIssues = 0;
    
    let readinessScore = 100;
    if (pipelineStatus === 'Failed') readinessScore -= 35;
    readinessScore -= mrs * 5;
    readinessScore -= issues * 4;
    readinessScore -= Math.round((100 - testPct) * 0.5);
    if (securityIssues > 0) readinessScore -= 15;
    readinessScore = Math.min(100, Math.max(10, readinessScore));

    return {
      projectName: this.projectName,
      files: this.getAllFiles(),
      fileContents: this.getAllFileContents(),
      recentActivity: this.getRecentActivity(30),
      activeUsers: this.getActiveUsers(),
      userStats: userStatsObj,
      pipelineStatus,
      readinessScore,
      stats
    };
  }
}

export default ProjectMemory;
