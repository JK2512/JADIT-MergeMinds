// 
// Conflict Intelligence Module  Real-time conflict visibility
// Manages ownership, lock, and conflict state for the UI layer.
// 

export class ConflictIntelligence {
  constructor(app) {
    this.app = app;

    // State maps populated from server
    this.fileOwnership = {};   // fileName  { owner, role, team, locked, lockOwner, conflictStatus, ... }
    this.conflictRisks = [];   // Array of { fileName, level, reason, users, suggestedAction }
    this.activeLocks = [];     // Array of { fileName, owner, status, lockedAt }

    // Deduplication for conflict toasts
    this.shownConflictToasts = new Map(); // hash  timestamp
    this.toastDedupMs = 30000;
  }

  //  Data Fetching 

  async fetchAll() {
    await Promise.all([
      this.fetchOwnershipData(),
      this.fetchConflictRisks(),
      this.fetchLockData()
    ]);
  }

  async fetchOwnershipData() {
    try {
      const res = await fetch('/api/project/ownership');
      if (!res.ok) return;
      const data = await res.json();
      this.fileOwnership = data.ownership || {};
    } catch (e) {
      console.warn('[ConflictIntel] Failed to fetch ownership:', e);
    }
  }

  async fetchConflictRisks() {
    try {
      const res = await fetch('/api/project/conflicts');
      if (!res.ok) return;
      const data = await res.json();
      this.conflictRisks = data.risks || [];
    } catch (e) {
      console.warn('[ConflictIntel] Failed to fetch conflicts:', e);
    }
  }

  async fetchLockData() {
    try {
      const res = await fetch('/api/project/locks');
      if (!res.ok) return;
      const data = await res.json();
      this.activeLocks = data.locks || [];
    } catch (e) {
      console.warn('[ConflictIntel] Failed to fetch locks:', e);
    }
  }

  //  State Updates from WebSocket 

  handleConflictUpdate(msg) {
    if (msg.risks) this.conflictRisks = msg.risks;
    if (msg.ownership) this.fileOwnership = msg.ownership;
    if (msg.locks) this.activeLocks = msg.locks;
  }

  handleOwnershipUpdate(msg) {
    if (msg.ownership) this.fileOwnership = msg.ownership;
  }

  handleLockUpdate(msg) {
    if (msg.locks) this.activeLocks = msg.locks;
  }

  //  Manager Alert Handling 

  handleManagerAlert(msg) {
    const { alertType, data } = msg;

    if (alertType === 'conflict_risk' && data) {
      this.showConflictToast(data);
    }
  }

  //  Lock Enforcement Modal 

  handleLockEnforcement(msg) {
    this.showLockModal(msg);
  }

  showLockModal(data) {
    const modal = document.getElementById('lock-modal');
    const infoEl = document.getElementById('lock-modal-info');
    const detailsEl = document.getElementById('lock-modal-details');
    if (!modal || !infoEl || !detailsEl) return;

    infoEl.textContent = data.reason || `This file is owned by ${data.owner}.`;
    detailsEl.innerHTML = `
      <div class="lock-detail-row"><span class="lock-detail-label">File</span><span class="lock-detail-value">${data.file}</span></div>
      <div class="lock-detail-row"><span class="lock-detail-label">Owner</span><span class="lock-detail-value">${data.owner}</span></div>
    `;

    modal.classList.remove('hidden');

    // Wire buttons
    const requestBtn = document.getElementById('lock-modal-request');
    const branchBtn = document.getElementById('lock-modal-branch');
    const readonlyBtn = document.getElementById('lock-modal-readonly');

    const closeModal = () => modal.classList.add('hidden');

    const onRequest = () => {
      closeModal();
      this.app.aiPanel?.handleSendMessage?.(`Request ownership transfer for ${data.file} from ${data.owner}`);
      this.app.notifications?.show(`Ownership transfer requested for ${data.file}`, 'info');
    };
    const onBranch = () => {
      closeModal();
      this.app.notifications?.show(`Create a branch to work on ${data.file} independently`, 'info');
    };
    const onReadonly = () => {
      closeModal();
      this.app.notifications?.show(`Opened ${data.file} in read-only mode`, 'info');
    };

    // Remove old listeners by cloning
    if (requestBtn) {
      const newBtn = requestBtn.cloneNode(true);
      requestBtn.parentNode.replaceChild(newBtn, requestBtn);
      newBtn.addEventListener('click', onRequest);
    }
    if (branchBtn) {
      const newBtn = branchBtn.cloneNode(true);
      branchBtn.parentNode.replaceChild(newBtn, branchBtn);
      newBtn.addEventListener('click', onBranch);
    }
    if (readonlyBtn) {
      const newBtn = readonlyBtn.cloneNode(true);
      readonlyBtn.parentNode.replaceChild(newBtn, readonlyBtn);
      newBtn.addEventListener('click', onReadonly);
    }
    const cancelBtn = document.getElementById('lock-modal-cancel');
    if (cancelBtn) {
      const newBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newBtn, cancelBtn);
      newBtn.addEventListener('click', closeModal);
    }
  }

  //  File Status Computation 

  getFileStatus(fileName) {
    const ownership = this.fileOwnership[fileName] || {};
    const risk = this.conflictRisks.find(r => r.fileName === fileName);
    const lock = this.activeLocks.find(l => l.fileName === fileName);

    let statusColor = '#3fb950';  // green  healthy
    let statusIcon = '\u{1F7E2}';
    let statusLabel = 'Healthy';
    let conflictLevel = null;

    if (risk) {
      conflictLevel = risk.level;
      if (risk.level === 'High') {
        statusColor = '#f85149';
        statusIcon = '\u{1F534}';
        statusLabel = 'Active Conflict';
      } else {
        statusColor = '#d29922';
        statusIcon = '\u{26A0}';
        statusLabel = 'Conflict Risk';
      }
    } else if (ownership.locked || lock) {
      statusColor = '#58a6ff';
      statusIcon = '\u{1F512}';
      statusLabel = 'Locked';
    }

    const owner = ownership.owner || lock?.owner || null;
    const lockOwner = ownership.lockOwner || lock?.owner || null;
    const lastEditor = ownership.lastEditor || null;

    const tooltipParts = [
      `File: ${fileName}`,
      `Owner: ${owner || 'Unassigned'}`,
      `Last Editor: ${lastEditor || 'None'}`,
      `Status: ${statusLabel}`
    ];
    if (lockOwner) tooltipParts.push(`Locked By: ${lockOwner}`);
    if (risk) tooltipParts.push(`Risk: ${risk.reason}`);

    let riskScore = 0;
    if (risk) {
      if (risk.level === 'High') {
        riskScore = 85;
      } else if (risk.level === 'Medium') {
        riskScore = 45;
      } else {
        riskScore = 35;
      }
    } else if (ownership.locked || lock) {
      riskScore = 15;
    } else if (ownership.owner) {
      riskScore = 5;
    } else {
      riskScore = 10;
    }

    return {
      statusColor,
      statusIcon,
      statusLabel,
      owner,
      lockOwner,
      lastEditor,
      conflictLevel,
      tooltip: tooltipParts.join('\n'),
      branch: ownership.branch || 'main',
      riskScore
    };
  }

  getStatusColor(conflictStatus) {
    if (!conflictStatus || conflictStatus === 'Healthy') return '#3fb950';
    if (/high/i.test(conflictStatus)) return '#f85149';
    if (/medium|risk/i.test(conflictStatus)) return '#d29922';
    return '#58a6ff';
  }

  //  Conflict Toast Notifications 

  showConflictToast(risk) {
    if (!risk || !this.app.notifications) return;

    // Deduplication
    const hash = `${risk.fileName}|${(risk.users || []).sort().join(',')}|${risk.level}`;
    const now = Date.now();
    const lastShown = this.shownConflictToasts.get(hash) || 0;
    if (now - lastShown < this.toastDedupMs) return;
    this.shownConflictToasts.set(hash, now);

    const users = (risk.users || []).join(', ');
    const messageHtml = `
      <div class="conflict-toast-content">
        <div style="font-weight: 700; margin-bottom: 4px;">\u{26A0}\u{FE0F} Conflict Risk: ${risk.fileName}</div>
        <div style="font-size: 11px; margin-bottom: 8px; color: var(--text-secondary);">${risk.reason || 'Multiple editors detected.'} (Editors: ${users})</div>
        <div class="conflict-toast-actions" style="display: flex; gap: 6px; margin-top: 6px;">
          <button class="toast-action-btn view-conflict-btn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer; color: var(--text-primary);">View Conflict</button>
          <button class="toast-action-btn request-owner-btn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer; color: var(--text-primary);">Request Ownership</button>
          <button class="toast-action-btn create-branch-btn" style="background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); border-radius: 4px; padding: 4px 8px; font-size: 10px; cursor: pointer; color: var(--text-primary);">Create Branch</button>
        </div>
      </div>
    `;

    const toast = this.app.notifications.show(messageHtml, 'warning', 12000);
    if (toast) {
      const viewBtn = toast.querySelector('.view-conflict-btn');
      const requestBtn = toast.querySelector('.request-owner-btn');
      const branchBtn = toast.querySelector('.create-branch-btn');

      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          this.app.switchFile(risk.fileName);
          this.app.notifications?.dismiss(toast);
        });
      }
      if (requestBtn) {
        requestBtn.addEventListener('click', () => {
          const ownerInfo = this.fileOwnership[risk.fileName] || {};
          const owner = ownerInfo.owner || 'system';
          const currentUser = this.app.presence?.currentUser?.name || 'anonymous';
          this.app.sendJSON({
            type: 'requestOwnership',
            file: risk.fileName,
            from: owner,
            to: currentUser
          });
          this.app.notifications?.show(`Requested ownership for ${risk.fileName} from ${owner}`, 'info');
          this.app.notifications?.dismiss(toast);
        });
      }
      if (branchBtn) {
        branchBtn.addEventListener('click', () => {
          const cleanName = risk.fileName.replace(/\.[^/.]+$/, "");
          const branchName = `feature/resolve-${cleanName}-${Math.floor(Math.random()*1000)}`;
          this.app.aiPanel?.handleSendMessage?.(`create branch "${branchName}" --source main`);
          this.app.notifications?.dismiss(toast);
        });
      }
    }
  }
}

export default ConflictIntelligence;
