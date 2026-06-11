import fs from 'fs';
import path from 'path';

// 
// Project Memory  The brain of JADIT
// Tracks all file state, activity events, and user sessions.
// This data is consumed by the AI Engine for project understanding.
// 

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const ROLE_PERMISSIONS = {
  'Frontend Developer': {
    team: 'Frontend Developers',
    patterns: [/\.css$/i, /\.html$/i, /^(ui|dashboard|app|presence|editor|ai-panel)\.js$/i, /\.cpp$/i]
  },
  'Backend Developer': {
    team: 'Backend Developers',
    patterns: [/^(api|auth|main|utils|config|routes|server)\.js$/i, /\.json$/i, /\.cpp$/i]
  },
  'Database Developer': {
    team: 'Database Developers',
    patterns: [/^(database|db|migration|schema)/i, /\.(sql|json)$/i]
  },
  'DevOps Engineer': {
    team: 'DevOps',
    patterns: [/^(package|server|config|deploy|pipeline)/i, /\.(env|yml|yaml|json)$/i, /\.cpp$/i]
  },
  Reviewer: {
    team: 'Review',
    patterns: []
  },
  Manager: {
    team: 'Management',
    patterns: [/.*/]
  },
  Admin: {
    team: 'Admin',
    patterns: [/.*/]
  }
};

const ALLOWED_SYSTEM_ACTORS = ['system', 'disk', 'local', 'devops', 'ai engineering manager'];

function getCanonicalUsername(name) {
  if (!name) return null;
  const clean = String(name).trim();
  const lower = clean.toLowerCase();

  // Check system actors
  if (lower === 'system') return 'system';
  if (lower === 'disk') return 'disk';
  if (lower === 'local') return 'local';
  if (lower === 'devops') return 'devops';
  if (lower === 'ai engineering manager' || lower === 'manager') return 'ai engineering manager';

  if (/^developer\s+[a-z0-9]+$/i.test(clean)) return null;
  if (/^(anonymous|unknown|undefined|null)$/i.test(clean)) return null;

  return clean;
}

function inferContributorRole(userName = '') {
  const name = String(userName).toLowerCase().trim();
  if (/admin/.test(name)) return 'Admin';
  if (/manager|lead|ai engineering manager/.test(name)) return 'Manager';
  if (/review/.test(name)) return 'Reviewer';
  if (/devops|deploy|ops|devops specialist/.test(name)) return 'DevOps Engineer';
  if (/db|database|data|sql/.test(name)) return 'Database Developer';
  if (/backend|api|server|auth/.test(name)) return 'Backend Developer';
  if (/frontend|front-end|ui|client|design/.test(name)) return 'Frontend Developer';
  return 'Manager';
}

function permissionAllows(role, fileName) {
  const config = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Manager;
  return config.patterns.some(pattern => pattern.test(fileName));
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

    // Engineering manager coordination state
    this.contributors = new Map();
    this.fileOwnership = new Map();
    this.fileLocks = new Map();
    this.mergeApprovals = {
      reviewer: false,
      security: false,
      pipeline: 'unknown'
    };
    this.conflictCache = new Map();
    this.lastConflictHash = '';
    this.conflictDedupMs = 60000;

    // Event callbacks for real-time broadcasting
    this.onConflictDetected = null;   // (risk) => void
    this.onOwnershipChanged = null;   // (fileName, ownerData) => void
    this.onLockChanged = null;        // (fileName, lockData, action) => void

    this.storagePath = path.join(process.cwd(), 'workspace-storage.json');
    this.loadFromDisk();

    console.log(` Project Memory initialized for: ${projectName}`);
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
          
          this.contributors = new Map();
          if (data.contributors) {
            for (const [key, value] of Object.entries(data.contributors)) {
              const canonical = getCanonicalUsername(key);
              if (canonical && !ALLOWED_SYSTEM_ACTORS.includes(canonical)) {
                const role = value.role || inferContributorRole(canonical);
                this.contributors.set(canonical, {
                  id: value.id || value.userId || generateId(),
                  username: canonical,
                  role,
                  team: value.team || ROLE_PERMISSIONS[role]?.team || 'Management',
                  assignedFiles: Array.isArray(value.assignedFiles) ? value.assignedFiles : [],
                  activeBranch: value.activeBranch || 'main',
                  lastActivity: value.lastActivity || new Date().toISOString()
                });
              }
            }
          }
          if (data.fileOwnership) {
            this.fileOwnership = new Map();
            for (const [fileName, value] of Object.entries(data.fileOwnership)) {
              const canonicalOwner = getCanonicalUsername(value.owner);
              if (canonicalOwner && !ALLOWED_SYSTEM_ACTORS.includes(canonicalOwner)) {
                const role = value.role || inferContributorRole(canonicalOwner);
                this.fileOwnership.set(fileName, {
                  fileName: value.fileName || fileName,
                  owner: canonicalOwner,
                  ownerId: value.ownerId || generateId(),
                  role,
                  team: value.team || ROLE_PERMISSIONS[role]?.team || 'Management',
                  assignedBy: value.assignedBy || 'Manager',
                  assignedAt: value.assignedAt || new Date().toISOString(),
                  updatedAt: value.updatedAt || new Date().toISOString(),
                  branch: value.branch || 'main'
                });
              }
            }
          }
          if (data.fileLocks) {
            this.fileLocks = new Map();
            for (const [fileName, value] of Object.entries(data.fileLocks)) {
              const canonicalOwner = getCanonicalUsername(value.owner);
              if (canonicalOwner) {
                this.fileLocks.set(fileName, {
                  fileName: value.fileName || fileName,
                  owner: canonicalOwner,
                  status: value.status || 'Editing',
                  lockedAt: value.lockedAt || new Date().toISOString()
                });
              }
            }
          }
          if (data.mergeApprovals) {
            this.mergeApprovals = {
              reviewer: !!data.mergeApprovals.reviewer,
              security: !!data.mergeApprovals.security,
              pipeline: data.mergeApprovals.pipeline || 'unknown'
            };
          }
          if (data.userStats) {
            this.userStats = new Map();
            for (const [username, stats] of Object.entries(data.userStats)) {
              const canonical = getCanonicalUsername(username);
              if (canonical) {
                this.userStats.set(canonical, {
                  edits: stats.edits || 0,
                  filesModified: new Set(Array.isArray(stats.filesModified) ? stats.filesModified : [])
                });
              }
            }
          }
          console.log(` Loaded project state from disk: ${this.storagePath}`);
        }
      }
    } catch (err) {
      console.error(` Failed to load project memory from disk:`, err.message);
    }

    this.saveToDisk();
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
        userStats: serializedUserStats,
        contributors: Object.fromEntries(this.contributors),
        fileOwnership: Object.fromEntries(this.fileOwnership),
        fileLocks: Object.fromEntries(this.fileLocks),
        mergeApprovals: this.mergeApprovals
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(` Failed to save project memory to disk:`, err.message);
    }
  }

  syncToDisk(fileName, content) {
    try {
      const filePath = path.join(process.cwd(), 'workspace', fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (err) {
      console.error(` Failed to sync file ${fileName} to disk:`, err.message);
    }
  }

  deleteFromDisk(fileName) {
    try {
      const filePath = path.join(process.cwd(), 'workspace', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(` Failed to delete file ${fileName} from disk:`, err.message);
    }
  }

  isSystemActor(userName = '') {
    const canonical = getCanonicalUsername(userName);
    if (!canonical) return false;
    return /^(system|disk|local|devops|ai engineering manager)$/i.test(canonical);
  }

  getCanonicalUsername(name) {
    return getCanonicalUsername(name);
  }

  ensureContributor(userName = 'system', overrides = {}) {
    const name = getCanonicalUsername(userName);
    if (!name) {
      throw new Error(`Access denied: Unknown user "${userName}"`);
    }

    if (this.isSystemActor(name)) {
      const role = name === 'ai engineering manager' ? 'Manager' : 'DevOps Engineer';
      const team = name === 'ai engineering manager' ? 'Management' : 'DevOps';
      return {
        id: 'system-' + name.toLowerCase().replace(/\s+/g, '-'),
        username: name,
        role: role,
        team: team,
        assignedFiles: overrides.assignedFiles || [],
        activeBranch: 'main',
        lastActivity: new Date().toISOString()
      };
    }

    const existing = this.contributors.get(name) || {};
    const role = overrides.role || existing.role || inferContributorRole(name);
    const team = overrides.team || existing.team || ROLE_PERMISSIONS[role]?.team || 'Management';
    const assignedFiles = Array.from(new Set([
      ...(existing.assignedFiles || []),
      ...(overrides.assignedFiles || [])
    ]));

    const contributor = {
      id: existing.id || existing.userId || generateId(),
      username: name,
      role: role,
      team: team,
      assignedFiles: assignedFiles,
      activeBranch: overrides.activeBranch || existing.activeBranch || 'main',
      lastActivity: new Date().toISOString()
    };

    this.contributors.set(name, contributor);
    return contributor;
  }

  canEditFile(userName, fileName) {
    const canonical = getCanonicalUsername(userName);
    if (!canonical) return { allowed: false, reason: `Unknown user: "${userName}"` };
    if (this.isSystemActor(canonical)) return { allowed: true, reason: 'system actor' };

    this.ensureContributor(canonical);
    const lock = this.fileLocks.get(fileName);
    if (lock && lock.owner !== canonical) {
      return { allowed: false, reason: `File is locked by ${lock.owner}. Request ownership transfer or create branch.` };
    }
    return { allowed: true, reason: 'file unlocked or locked by current user' };
  }

  assertCanEditFile(userName, fileName) {
    const permission = this.canEditFile(userName, fileName);
    if (permission.allowed) return permission;
    console.warn('[ManagerDecision]', { decision: 'edit_blocked', user: userName, fileName, reason: permission.reason });
    throw new Error(permission.reason);
  }

  assignOwnership(fileName, owner, assignedBy = 'Manager') {
    const canonicalOwner = getCanonicalUsername(owner);
    if (!canonicalOwner) throw new Error(`Unknown owner user: "${owner}"`);
    const contributor = this.ensureContributor(canonicalOwner);
    const now = new Date().toISOString();
    const previous = this.fileOwnership.get(fileName);
    this.fileOwnership.set(fileName, {
      fileName,
      owner: canonicalOwner,
      ownerId: contributor.id,
      role: contributor.role,
      team: contributor.team,
      assignedBy,
      assignedAt: previous?.assignedAt || now,
      updatedAt: now,
      branch: previous?.branch || 'main'
    });
    if (!contributor.assignedFiles.includes(fileName)) {
      contributor.assignedFiles.push(fileName);
      this.contributors.set(canonicalOwner, contributor);
    }
    console.log('[OwnershipAssigned]', { fileName, owner: canonicalOwner, assignedBy });
    this.logActivity(assignedBy, 'ownership_assigned', fileName, { owner: canonicalOwner, previousOwner: previous?.owner || null });
    this.runConflictCheck('ownership_change');
    this.saveToDisk();

    // Push notification for real-time broadcast
    if (typeof this.onOwnershipChanged === 'function') {
      try { this.onOwnershipChanged(fileName, { ...this.fileOwnership.get(fileName), previousOwner: previous?.owner || null }); } catch (e) { console.error('[OwnershipCallback]', e); }
    }

    return this.fileOwnership.get(fileName);
  }

  lockFile(fileName, owner, status = 'Editing') {
    const canonicalOwner = getCanonicalUsername(owner);
    if (!canonicalOwner) throw new Error(`Unknown lock user: "${owner}"`);
    let ownership = this.fileOwnership.get(fileName);
    let ownerName = ownership?.owner || null;
    if (!ownerName) {
      this.assignOwnership(fileName, canonicalOwner, 'Auto Lock Assignment');
      ownership = this.fileOwnership.get(fileName);
      ownerName = ownership?.owner || null;
    }
    if (ownerName !== canonicalOwner) {
      throw new Error(`This file is owned by ${ownerName}. Request ownership from owner or manager.`);
    }
    const lock = { fileName, owner: canonicalOwner, status, lockedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
    this.fileLocks.set(fileName, lock);
    console.log('[FileLocked]', lock);
    this.logActivity(canonicalOwner, 'FileLocked', fileName, { owner: canonicalOwner, status });
    this.runConflictCheck('lock_change');
    this.saveToDisk();

    // Push notification for real-time broadcast
    if (typeof this.onLockChanged === 'function') {
      try { this.onLockChanged(fileName, lock, 'locked'); } catch (e) { console.error('[LockCallback]', e); }
    }

    return lock;
  }

  unlockFile(fileName, owner = 'Manager') {
    const lock = this.fileLocks.get(fileName);
    if (!lock) return null;
    const canonicalOwner = getCanonicalUsername(owner) || owner;
    const isSystem = this.isSystemActor(canonicalOwner) || canonicalOwner === 'Manager';
    if (!isSystem && lock.owner !== canonicalOwner) {
      throw new Error(`This file is locked by ${lock.owner}. Only the owner or a manager can unlock it.`);
    }
    this.fileLocks.delete(fileName);
    console.log('[FileUnlocked]', { fileName, owner: canonicalOwner, previousOwner: lock.owner });
    this.logActivity(canonicalOwner, 'FileUnlocked', fileName, { previousOwner: lock.owner });
    this.runConflictCheck('lock_change');
    this.saveToDisk();

    // Push notification for real-time broadcast
    if (typeof this.onLockChanged === 'function') {
      try { this.onLockChanged(fileName, { fileName, owner: lock.owner }, 'unlocked'); } catch (e) { console.error('[UnlockCallback]', e); }
    }

    return lock;
  }

  transferOwnership(fileName, fromOwner, toOwner, requestedBy = 'Manager') {
    const canonicalFrom = getCanonicalUsername(fromOwner);
    const canonicalTo = getCanonicalUsername(toOwner);
    const canonicalRequestedBy = getCanonicalUsername(requestedBy) || requestedBy;
    if (!canonicalTo) throw new Error(`Unknown target owner: "${toOwner}"`);

    const current = this.fileOwnership.get(fileName);
    const resolvedFrom = canonicalFrom || current?.owner || null;
    if (resolvedFrom && current && current.owner !== resolvedFrom) {
      throw new Error(`${fileName} is owned by ${current.owner}, not ${resolvedFrom}.`);
    }
    const next = this.assignOwnership(fileName, canonicalTo, canonicalRequestedBy);
    this.fileLocks.set(fileName, { fileName, owner: canonicalTo, status: 'Editing', lockedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() });
    console.log('[OwnershipTransferred]', { fileName, from: resolvedFrom, to: canonicalTo, requestedBy: canonicalRequestedBy });
    this.logActivity(canonicalRequestedBy, 'OwnershipTransferred', fileName, { from: resolvedFrom, to: canonicalTo });
    this.runConflictCheck('ownership_change');
    this.saveToDisk();
    return next;
  }

  getFileOwnership() {
    const result = {};
    for (const fileName of this.getFileNames()) {
      const owner = this.fileOwnership.get(fileName);
      const lock = this.fileLocks.get(fileName);
      const file = this.files.get(fileName);
      result[fileName] = {
        fileName,
        owner: owner?.owner || null,
        role: owner?.role || null,
        team: owner?.team || null,
        locked: !!lock,
        lockOwner: lock?.owner || null,
        lockStatus: lock?.status || 'Unlocked',
        lastEditor: file?.lastModifiedBy || null,
        lastModified: file?.lastModified || null,
        branch: owner?.branch || 'main',
        conflictStatus: this.getFileConflictStatus(fileName)
      };
    }
    return result;
  }

  getLockedFiles() {
    return Array.from(this.fileLocks.values());
  }

  getContributorDirectory() {
    return Object.fromEntries(this.contributors);
  }

  buildConflictRisks() {
    const usersByFile = new Map();
    for (const user of this.getActiveUsers()) {
      if (!user.currentFile) continue;
      const canonical = getCanonicalUsername(user.name);
      if (!canonical || this.isSystemActor(canonical)) continue;

      if (!usersByFile.has(user.currentFile)) usersByFile.set(user.currentFile, []);
      usersByFile.get(user.currentFile).push(canonical);
    }
    const recentEditors = new Map();
    for (const event of this.getRecentActivity(100)) {
      if (!/edited|updated|created_file/.test(event.action || '') || !event.target) continue;
      const canonical = getCanonicalUsername(event.user);
      if (!canonical || this.isSystemActor(canonical)) continue;

      if (!recentEditors.has(event.target)) recentEditors.set(event.target, new Set());
      recentEditors.get(event.target).add(canonical);
    }
    const risks = [];
    for (const [fileName, users] of usersByFile) {
      if (users.length > 1) {
        risks.push({ fileName, level: 'High', reason: 'Multiple active users are editing the same file.', users, suggestedAction: 'Assign ownership to one contributor or split work by branch.' });
      }
    }
    for (const [fileName, editors] of recentEditors) {
      if (editors.size > 1) {
        risks.push({ fileName, level: 'Medium', reason: 'Multiple recent editors touched this file.', users: Array.from(editors), suggestedAction: 'Review ownership before merge.' });
      }
    }
    return risks;
  }

  getConflictHash(risk) {
    const users = (risk.users || []).slice().sort().join('|');
    return `${risk.fileName}|${risk.level}|${users}|${risk.reason}`;
  }

  detectConflicts(trigger = 'manual') {
    return this.runConflictCheck(trigger);
  }

  logConflict(risk) {
    const riskHash = this.getConflictHash(risk);
    const now = Date.now();
    const lastEmitted = this.conflictCache.get(riskHash) || 0;
    if (now - lastEmitted < this.conflictDedupMs) {
      console.log('[ConflictSkippedDuplicate]', {
        fileName: risk.fileName,
        suppressMs: this.conflictDedupMs - (now - lastEmitted)
      });
      return;
    }
    this.conflictCache.set(riskHash, now);

    console.warn(`[ConflictDetected] ${risk.fileName}`);
    console.warn('[ConflictCreated]', risk);

    // Prevent conflict detection from triggering on conflict logs
    this.appendActivity('system', 'conflict_detected', risk.fileName, {
      level: risk.level,
      reason: risk.reason,
      users: risk.users
    });

    // Push notification to CollabServer for real-time broadcast
    if (typeof this.onConflictDetected === 'function') {
      try { this.onConflictDetected(risk); } catch (e) { console.error('[ConflictCallback]', e); }
    }
  }

  appendActivity(user, action, target, details = null) {
    return this.logActivity(user, action, target, details);
  }

  updateProjectMemory(fileName, content, changedBy = 'system') {
    return this.updateFile(fileName, content, changedBy);
  }

  runConflictCheck(trigger = 'manual') {
    const allowedTriggers = ['file_edit', 'ownership_change', 'lock_change', 'merge_request_creation'];
    if (!allowedTriggers.includes(trigger)) {
      console.log('[ConflictCheckIgnored]', { trigger });
      return this.buildConflictRisks();
    }

    const risks = this.buildConflictRisks();
    const hash = risks.map(risk => this.getConflictHash(risk)).sort().join('::');

    if (hash === this.lastConflictHash) {
      return risks;
    }
    this.lastConflictHash = hash;

    console.log('[ConflictCheck]', { trigger, count: risks.length });

    for (const risk of risks) {
      this.logConflict(risk);
    }

    return risks;
  }

  getConflictRisks() {
    return this.buildConflictRisks();
  }

  getFileConflictStatus(fileName) {
    const risk = this.getConflictRisks().find(item => item.fileName === fileName);
    return risk ? `${risk.level} Risk` : 'Healthy';
  }

  getBlockedTasks() {
    const blocked = this.getLockedFiles().map(lock => ({
      type: 'Active Lock',
      fileName: lock.fileName,
      owner: lock.owner,
      reason: `${lock.fileName} is locked by ${lock.owner}.`
    }));
    for (const risk of this.getConflictRisks()) {
      blocked.push({ type: 'Conflict Risk', fileName: risk.fileName, owner: null, reason: risk.reason });
    }
    return blocked;
  }

  getManagerSnapshot() {
    return {
      contributors: this.getContributorDirectory(),
      ownership: this.getFileOwnership(),
      locks: this.getLockedFiles(),
      conflictRisks: this.getConflictRisks(),
      blockedTasks: this.getBlockedTasks(),
      activeUsers: this.getActiveUsers(),
      recentActivity: this.getRecentActivity(30)
    };
  }

  verifyProtectedMerge({ reviewerApproved = false, securityApproved = false, pipelineStatus = null } = {}) {
    const conflicts = this.getConflictRisks();
    const locks = this.getLockedFiles();
    const pipeline = pipelineStatus || this.getPipelineStatus();
    const blockers = [];
    if (conflicts.length) blockers.push(`${conflicts.length} ownership/conflict risk(s) detected.`);
    if (locks.length) blockers.push(`${locks.length} active file lock(s) must be resolved.`);
    if (!reviewerApproved && !this.mergeApprovals.reviewer) blockers.push('Reviewer approval missing.');
    if (!securityApproved && !this.mergeApprovals.security) blockers.push('Security approval missing.');
    if (!/success|passing|passed/i.test(pipeline)) blockers.push(`Pipeline is ${pipeline}.`);
    if (blockers.length) {
      console.warn('[MergeBlocked]', { blockers });
      return { allowed: false, blockers };
    }
    console.log('[ManagerDecision]', { decision: 'merge_allowed' });
    return { allowed: true, blockers: [] };
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
        console.error(` Failed to rename file on disk:`, err.message);
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

  //  File Management 

  updateFile(fileName, content, changedBy = 'system') {
    const canonicalChangedBy = getCanonicalUsername(changedBy) || changedBy;
    const now = new Date().toISOString();
    const previous = this.files.get(fileName);
    const existed = previous !== undefined;

    if (!this.isSystemActor(canonicalChangedBy)) {
      this.assertCanEditFile(canonicalChangedBy, fileName);

      const lock = this.fileLocks.get(fileName);
      if (lock?.owner === canonicalChangedBy) {
        lock.lastActivityAt = new Date().toISOString();
        lock.warned = false;
      }
    }

    this.files.set(fileName, {
      content,
      lastModified: now,
      lastModifiedBy: canonicalChangedBy,
      lineCount: content.split('\n').length,
      size: content.length,
      version: (previous?.version || 0) + 1
    });

    if (canonicalChangedBy !== 'disk') {
      this.syncToDisk(fileName, content);
    }

    // Track per-user statistics
    if (canonicalChangedBy !== 'system' && canonicalChangedBy !== 'disk') {
      if (!this.userStats.has(canonicalChangedBy)) {
        this.userStats.set(canonicalChangedBy, { edits: 0, filesModified: new Set() });
      }
      const stats = this.userStats.get(canonicalChangedBy);
      stats.edits++;
      stats.filesModified.add(fileName);
    }

    // Log file creation events
    if (!existed) {
      this.logActivity(canonicalChangedBy, 'created_file', fileName, {
        lineCount: content.split('\n').length
      });
    }

    if (!this.isSystemActor(canonicalChangedBy)) {
      this.runConflictCheck('file_edit');
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
      const ownership = this.fileOwnership.get(name);
      const lock = this.fileLocks.get(name);
      result[name] = {
        lastModified: data.lastModified,
        lastModifiedBy: data.lastModifiedBy,
        lineCount: data.lineCount,
        size: data.size,
        version: data.version,
        owner: ownership?.owner || null,
        branch: ownership?.branch || 'main',
        locked: !!lock,
        lockOwner: lock?.owner || null,
        conflictStatus: this.getFileConflictStatus(name)
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

  //  Activity Tracking 

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

  //  User Session Management 

  userJoined(connectionId, userName, userColor) {
    const contributor = this.ensureContributor(userName);
    const canonical = contributor.username;
    this.activeSessions.set(connectionId, {
      name: canonical,
      color: userColor,
      role: contributor.role,
      team: contributor.team,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      currentFile: null
    });
    this.logActivity(canonical, 'joined', 'workspace');
    return this.getActiveUsers();
  }

  userLeft(connectionId) {
    const session = this.activeSessions.get(connectionId);
    if (session) {
      this.logActivity(session.name, 'left', 'workspace');
      if (session.currentFile) {
        const lock = this.fileLocks.get(session.currentFile);
        if (lock?.owner === session.name) this.unlockFile(session.currentFile, session.name);
      }
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
      const canonical = getCanonicalUsername(session.name);
      if (canonical && !this.isSystemActor(canonical) && !this.fileOwnership.has(fileName)) {
        this.assignOwnership(fileName, canonical, 'Engineering Manager');
      }
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
        role: session.role,
        team: session.team,
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

  //  Project Summary (for AI context in Phase 2) 

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
