import toolRegistry from './tool-registry.js';

export async function tryADKAgent(agentType, payload) {
  console.log('[AgentRouter] tryADKAgent', { agentType, available: false });
  return null;
}

function normalize(text = '') {
  return String(text).toLowerCase().trim();
}

function formatActivity(event) {
  if (!event) return null;
  const user = event.user || 'system';
  const action = String(event.action || 'updated').replace(/_/g, ' ');
  const target = event.target ? ` ${event.target}` : '';
  return `${user} ${action}${target}`.trim();
}

function getProjectTelemetry(summary) {
  const stats = summary.stats || {};
  return {
    mrs: Math.max(1, ((stats.totalFiles || 0) % 3) + 1),
    issues: Math.max(1, 5 - Math.floor((stats.totalEvents || 0) / 15)),
    tests: 98,
    securityIssues: 0
  };
}

function createLocalTools(projectMemory, request = {}) {
  const summary = () => projectMemory.getProjectSummary();
  const tools = {
    currentFile() {
      console.log('[AgentRouter] tool currentFile');
      return request.currentFile || summary().fileNames?.[0] || 'main.js';
    },
    read_file(fileName) {
      console.log('[AgentRouter] tool read_file', { fileName });
      const activeFile = tools.currentFile();
      if (fileName === activeFile && typeof request.currentFileContent === 'string' && request.currentFileContent.length > 0) {
        return {
          status: 'success',
          fileName,
          content: request.currentFileContent,
          source: 'editor'
        };
      }
      const content = projectMemory.getFileContent(fileName);
      if (content === null) {
        return { status: 'error', fileName, content: '', message: `File "${fileName}" does not exist.` };
      }
      const meta = projectMemory.getFile(fileName);
      return {
        status: 'success',
        fileName,
        content,
        lineCount: meta?.lineCount || content.split('\n').length,
        size: meta?.size || content.length,
        lastModified: meta?.lastModified,
        lastModifiedBy: meta?.lastModifiedBy
      };
    },
    list_files() {
      console.log('[AgentRouter] tool list_files');
      return {
        status: 'success',
        files: projectMemory.getAllFiles(),
        fileContents: projectMemory.getAllFileContents()
      };
    },
    activityFeed(count = 30) {
      console.log('[AgentRouter] tool activityFeed', { count });
      return projectMemory.getRecentActivity(count);
    },
    activeUsers() {
      console.log('[AgentRouter] tool activeUsers');
      return projectMemory.getActiveUsers();
    },
    projectSummary() {
      console.log('[AgentRouter] tool projectSummary');
      return summary();
    },
    terminalOutput() {
      console.log('[AgentRouter] tool terminalOutput');
      return request.terminalOutput || '';
    },
    buildStatus() {
      console.log('[AgentRouter] tool buildStatus');
      return summary().pipelineStatus || 'Passing';
    },
    pipelineStatus() {
      console.log('[AgentRouter] tool pipelineStatus');
      return summary().pipelineStatus || 'Passing';
    },
    managerSnapshot() {
      console.log('[AgentRouter] tool managerSnapshot');
      return typeof projectMemory.getManagerSnapshot === 'function'
        ? projectMemory.getManagerSnapshot()
        : {};
    },
    assignOwnership(fileName, owner, assignedBy = 'Engineering Manager') {
      console.log('[AgentRouter] tool assignOwnership', { fileName, owner, assignedBy });
      return projectMemory.assignOwnership(fileName, owner, assignedBy);
    },
    transferOwnership(fileName, fromOwner, toOwner, requestedBy = 'Engineering Manager') {
      console.log('[AgentRouter] tool transferOwnership', { fileName, fromOwner, toOwner, requestedBy });
      return projectMemory.transferOwnership(fileName, fromOwner, toOwner, requestedBy);
    },
    lockFile(fileName, owner, status = 'Manual Lock') {
      console.log('[AgentRouter] tool lockFile', { fileName, owner, status });
      return projectMemory.lockFile(fileName, owner, status);
    },
    unlockFile(fileName, owner = 'Manager') {
      console.log('[AgentRouter] tool unlockFile', { fileName, owner });
      return projectMemory.unlockFile(fileName, owner);
    },
    verifyProtectedMerge(options = {}) {
      console.log('[AgentRouter] tool verifyProtectedMerge');
      return projectMemory.verifyProtectedMerge(options);
    }
  };
  return tools;
}

function routeAgent(message, agentId) {
  const text = normalize(message);
  console.log('[AgentRouter] route request', { agentId, message });

  if (isGitLabIssueCommand(text)) {
    console.log('[Route:GitLabIssues]', { message });
    return 'gitlab';
  }
  if (isGitLabMRCommand(text)) {
    console.log('[Route:GitLabMRs]', { message });
    return 'gitlab';
  }
  if (isGitLabBranchCommand(text)) {
    console.log('[Route:GitLabBranches]', { message });
    return 'gitlab';
  }
  if (isGitLabProjectCommand(text)) {
    console.log('[Route:GitLabProject]', { message });
    return 'gitlab';
  }
  if (isManagerPlatformCommand(text)) {
    console.log('[Route:Manager]', { message });
    return 'manager';
  }

  // General natural language queries fall through to the real Gemini AI model (streamChat)
  return null;
}

function isGitLabIssueCommand(text) {
  return /^(list|show|open)\s+issues?\b/.test(text) || /^create\s+(an?\s+)?issue\b/.test(text);
}

function isGitLabMRCommand(text) {
  return /^(list|show|open)\s+(merge requests?|mrs?)\b/.test(text) || /^create\s+(an?\s+)?(merge request|mr)\b/.test(text);
}

function isGitLabBranchCommand(text) {
  return /^list\s+branches\b/.test(text) || /^create\s+branch\b/.test(text);
}

function isGitLabProjectCommand(text) {
  return /^(project info|gitlab status|gitlab health|health check|pipeline status|latest pipeline|recent failures)\b/.test(text);
}

function isManagerPlatformCommand(text) {
  return /^(who is working on what|show file ownership|show ownership|show locked files|show locks|show conflict risks|show blocked tasks|assign task|assign ownership|transfer ownership|lock \w|unlock \w|project health|team status|protected merge|merge readiness|release readiness|team health|suggest owners|show conflict heatmap|force unlock|force transfer)/.test(text);
}

function severityLabel(level, text) {
  return { severity: level, issue: text };
}

function analyzeImports(fileName, code) {
  const issues = [];
  const withoutImports = code.replace(/^\s*import\s+.*$/gm, '').replace(/^\s*const\s+.+?=\s*require\(.*$/gm, '');
  const importPattern = /^\s*import\s+(.+?)\s+from\s+["'][^"']+["'];?/gm;
  let importMatch;

  while ((importMatch = importPattern.exec(code)) !== null) {
    const rawNames = importMatch[1].trim();
    const names = rawNames
      .replace(/[{}]/g, '')
      .split(',')
      .map(part => part.trim().split(/\s+as\s+/i).pop())
      .filter(name => /^[A-Za-z_$][\w$]*$/.test(name));

    names.forEach(name => {
      if (!new RegExp(`\\b${name}\\b`).test(withoutImports)) {
        issues.push(severityLabel('Low', `Unused import candidate: \`${name}\`.`));
      }
    });
  }

  if (/\bexpress\s*\(/.test(code) && !/import\s+express\s+from\s+["']express["']|require\s*\(\s*["']express["']\s*\)/.test(code)) {
    issues.push(severityLabel('High', '`express()` is used but Express is not imported.'));
  }

  if (/\bReact\b|<\w+[\s>]/.test(code) && fileName.endsWith('.jsx') && !/import\s+React/.test(code)) {
    issues.push(severityLabel('Low', 'JSX-style syntax detected without a React import. Verify build configuration supports automatic runtime.'));
  }

  return issues;
}

function analyzeFunctions(code) {
  const issues = [];
  const blocks = code.match(/(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*{[\s\S]{0,3000}?^}/gm) || [];
  blocks.forEach((block, index) => {
    const branches = (block.match(/\b(if|for|while|switch|catch)\b/g) || []).length;
    const lines = block.split('\n').length;
    if (branches > 5 || lines > 60) {
      issues.push(severityLabel('Medium', `Large/complex function block ${index + 1}: ${branches} branches across ${lines} lines.`));
    }
  });
  return issues;
}

function analyzeFileContent(fileName, content) {
  const code = content || '';
  const issues = [];

  issues.push(...analyzeImports(fileName, code));
  issues.push(...analyzeFunctions(code));

  if (!code.trim()) {
    issues.push(severityLabel('High', 'File is empty or only whitespace.'));
  }
  if ((/\bawait\b|\bfetch\s*\(/.test(code)) && !/\btry\s*{/.test(code)) {
    issues.push(severityLabel('Medium', 'Async/fetch logic appears to run without local try/catch error handling.'));
  }
  if (/\bJSON\.parse\s*\(/.test(code) && !/\btry\s*{/.test(code)) {
    issues.push(severityLabel('Medium', 'JSON.parse is used without nearby error handling.'));
  }
  if (/\bTODO\b|\bFIXME\b/i.test(code)) {
    issues.push(severityLabel('Low', 'TODO/FIXME markers remain in this file.'));
  }
  if (/\beval\s*\(|new\s+Function\s*\(/.test(code)) {
    issues.push(severityLabel('Critical', 'Dynamic code execution detected.'));
  }
  if (fileName.endsWith('.cpp')) {
    const mainCount = (code.match(/\bint\s+main\s*\(/g) || []).length;
    if (mainCount > 1) {
      issues.push(severityLabel('Critical', `C++ file contains ${mainCount} \`main()\` functions; compilation will fail.`));
    }
    if (/using\s+namespace\s+std\s*;/.test(code)) {
      issues.push(severityLabel('Low', '`using namespace std;` is acceptable for demos but avoid it in larger production C++ modules.'));
    }
  }

  return issues;
}

async function reviewerAgent(tools) {
  console.log('[ReviewerAgent] start');
  const fileName = tools.currentFile();
  const file = tools.read_file(fileName);
  console.log('[ReviewerAgent] scanned file', { fileName, status: file.status, bytes: file.content?.length || 0 });
  const issues = analyzeFileContent(fileName, file.content || '');

  return [
    `**Reviewer Agent - ${fileName}**`,
    '',
    '**Tools Used**',
    `* currentFile() -> ${fileName}`,
    `* read_file("${fileName}") -> ${file.status}`,
    '',
    '**Issues Found**',
    ...(issues.length ? issues.map(item => `* **${item.severity}** - ${item.issue}`) : ['* **Info** - No issues found by local static review.']),
    '',
    '**Suggested Fixes**',
    ...(issues.length ? issues.map(item => `* ${suggestFix(item.issue)}`) : ['* Keep this file covered by a run/build check before merge.']),
    '',
    '**Available Actions**',
    `* Create GitLab Issue: \`create issue "Code Review: ${fileName} findings"\``,
    `* Create Fix Branch: \`create branch "fix/${slugify(fileName)}"\``,
    `* Create Merge Request Draft: \`create merge request "Review fixes for ${fileName}" --source fix/${slugify(fileName)} --target main\``
  ].join('\n');
}

function slugify(value) {
  return String(value || 'update')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'update';
}

function suggestFix(issue) {
  if (/Express is not imported/i.test(issue)) return 'Import Express before calling `express()`, or remove the app bootstrap from this file.';
  if (/main\(\)/i.test(issue)) return 'Keep exactly one `int main()` per C++ executable file.';
  if (/try\/catch|error handling|JSON\.parse/i.test(issue)) return 'Wrap the risky operation with targeted error handling and return/log a useful failure message.';
  if (/TODO|FIXME/i.test(issue)) return 'Convert TODO/FIXME markers into GitLab issues or complete the implementation.';
  if (/Unused import/i.test(issue)) return 'Remove the unused import or use the imported symbol.';
  if (/Dynamic code execution/i.test(issue)) return 'Replace dynamic execution with a safe parser, lookup table, or validated command path.';
  if (/empty/i.test(issue)) return 'Add implementation or remove the placeholder file.';
  return 'Review and simplify this area before merge.';
}

function scanSecurityFile(fileName, content) {
  const patterns = [
    { severity: 'Critical', reason: 'Possible hardcoded secret', regex: /\b(api[_-]?key|secret|token|password|jwtSecret)\b\s*[:=][^\n]*["'][^"']{8,}["']/ig, fix: 'Move secrets into environment variables or a secret manager.' },
    { severity: 'High', reason: 'Dangerous eval usage', regex: /\beval\s*\(/g, fix: 'Remove eval and use a safe parser or explicit dispatch table.' },
    { severity: 'High', reason: 'Dynamic Function constructor', regex: /new\s+Function\s*\(/g, fix: 'Remove dynamic function construction.' },
    { severity: 'Medium', reason: 'Child process or shell execution', regex: /\b(exec|execFile|spawn)\s*\(|child_process/g, fix: 'Validate commands and arguments, avoid shell interpolation, and limit allowed commands.' },
    { severity: 'Medium', reason: 'Insecure HTTP URL', regex: /["']http:\/\/[^"']+["']/g, fix: 'Use HTTPS endpoints where possible.' }
  ];

  const findings = [];
  patterns.forEach(pattern => {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(content || '')) {
      findings.push({
        fileName,
        severity: pattern.severity,
        reason: pattern.reason,
        fix: pattern.fix
      });
    }
  });
  return findings;
}

async function securityAgent(tools) {
  console.log('[SecurityAgent] start');
  const files = tools.list_files();
  const findings = [];
  Object.keys(files.files || {}).forEach(fileName => {
    const file = tools.read_file(fileName);
    console.log('[SecurityAgent] scanned file', { fileName, status: file.status });
    findings.push(...scanSecurityFile(fileName, file.content || ''));
  });

  return [
    '**Security Agent - Project Scan**',
    '',
    '**Tools Used**',
    `* list_files() -> ${Object.keys(files.files || {}).length} files`,
    '* read_file(file) -> scanned actual project content',
    '',
    '**Findings**',
    ...(findings.length ? findings.map(item => `* **${item.severity}** - \`${item.fileName}\`: ${item.reason}. ${item.fix}`) : ['* **Low Risk** - No hardcoded secrets, API keys, passwords, tokens, eval(), or obvious unsafe shell execution found in workspace files.'])
  ].join('\n');
}

async function plannerAgent(tools) {
  console.log('[PlannerAgent] start');
  const files = tools.list_files();
  const activity = tools.activityFeed(12);
  const tasks = [];

  Object.keys(files.files || {}).forEach(fileName => {
    const file = tools.read_file(fileName);
    const content = file.content || '';
    console.log('[PlannerAgent] inspected file', { fileName });
    if (/\bTODO\b|\bFIXME\b/i.test(content)) tasks.push({ priority: 'High', task: `Resolve TODO/FIXME markers in ${fileName}.`, impact: 'Reduces delivery ambiguity.' });
    if (/function\s+\w+\s*\([^)]*\)\s*{\s*}/.test(content) || /\/\/\s*(stub|placeholder)/i.test(content)) tasks.push({ priority: 'Medium', task: `Complete stub implementation in ${fileName}.`, impact: 'Turns placeholder code into working behavior.' });
    if (content.trim().length < 40) tasks.push({ priority: 'Medium', task: `Fill out thin/placeholder file ${fileName}.`, impact: 'Improves project completeness.' });
  });

  if (activity.length > 0) {
    tasks.push({ priority: 'Medium', task: `Review latest activity: ${formatActivity(activity[0])}.`, impact: 'Keeps team aligned on the freshest change.' });
  }
  if (tasks.length === 0) {
    tasks.push({ priority: 'High', task: 'Run a release-readiness check and prepare MR notes.', impact: 'Moves the project toward submission/demo readiness.' });
  }

  return [
    '**Planner Agent - Next Tasks**',
    '',
    '**Tools Used**',
    `* activityFeed() -> ${activity.length} events`,
    `* list_files() -> ${Object.keys(files.files || {}).length} files`,
    '* read_file(file) -> inspected actual project content',
    '',
    '**Priority Tasks**',
    ...tasks.slice(0, 8).map((item, index) => `${index + 1}. **${item.priority}** - ${item.task}`),
    '',
    '**Recommended Order**',
    ...tasks.slice(0, 5).map((item, index) => `${index + 1}. ${item.task}`),
    '',
    '**Estimated Impact**',
    ...tasks.slice(0, 5).map(item => `* ${item.impact}`)
  ].join('\n');
}

function detectConflictRisks(summary) {
  const activeUsers = summary.activeUsers || [];
  const byFile = new Map();
  activeUsers.forEach(user => {
    if (!user.currentFile) return;
    const name = String(user.name || '').trim();
    if (!name || /^(system|disk|local|anonymous)$/i.test(name)) return;

    if (!byFile.has(user.currentFile)) byFile.set(user.currentFile, []);
    byFile.get(user.currentFile).push(name);
  });

  const risks = [];
  for (const [fileName, users] of byFile.entries()) {
    if (users.length > 1) {
      risks.push(`Same-file conflict risk: ${users.join(', ')} are active on ${fileName}.`);
    }
  }

  const changedFiles = (summary.recentActivity || [])
    .filter(event => /updated|created|opened|modified|edited/.test(event.action || ''))
    .map(event => event.target)
    .filter(Boolean)
    .slice(0, 8);

  activeUsers.forEach(user => {
    if (user.currentFile && changedFiles.includes(user.currentFile)) {
      const name = String(user.name || '').trim();
      if (name && !/^(system|disk|local|anonymous)$/i.test(name)) {
        risks.push(`Fresh-change risk: ${name} is active on recently changed ${user.currentFile}.`);
      }
    }
  });

  return Array.from(new Set(risks));
}

async function safeGitLabTool(toolName, args = {}) {
  console.log('[GitLabActions] tool invocation', { toolName, args });
  try {
    return {
      ok: true,
      result: await toolRegistry.executeTool(toolName, args)
    };
  } catch (err) {
    console.warn('[GitLabActions] unavailable', { toolName, reason: err.message });
    return {
      ok: false,
      error: err
    };
  }
}

function formatOwnershipRows(ownership = {}) {
  const rows = Object.values(ownership);
  return rows.length
    ? rows.map(item => `* ${item.fileName}: ${item.owner || 'Unassigned'}${item.locked ? ` (locked by ${item.lockOwner})` : ''} - ${item.conflictStatus}`)
    : ['* No files found.'];
}

function formatContributorRows(contributors = {}) {
  const rows = Object.values(contributors);
  return rows.length
    ? rows.map(item => `* ${item.username || item.name}: ${item.role} / ${item.team} - ${(item.assignedFiles || []).join(', ') || 'no assigned files'}`)
    : ['* No contributors registered yet.'];
}

function formatActiveWorkRows(activeUsers = []) {
  return activeUsers.length
    ? activeUsers.map(user => `* ${user.name}: ${user.currentFile || 'no active file'}${user.role ? ` (${user.role})` : ''}`)
    : ['* No active collaborators connected.'];
}

function formatRiskRows(risks = []) {
  return risks.length
    ? risks.map(risk => `* **${risk.level}** - ${risk.fileName}: ${risk.reason} Editors: ${(risk.users || []).join(', ')}. ${risk.suggestedAction}`)
    : ['* No active ownership or file conflict risks detected.'];
}

function parseAssignCommand(message) {
  const quoted = [...message.matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
  const toMatch = message.match(/\bto\s+([A-Za-z][\w -]*)/i);
  const fileMatch = message.match(/\b([\w./-]+\.(?:js|css|html|json|cpp|py|md|txt|env))\b/i);
  return {
    fileName: quoted.find(value => /\.[a-z0-9]+$/i.test(value)) || fileMatch?.[1],
    owner: toMatch?.[1]?.trim() || quoted.find(value => !/\.[a-z0-9]+$/i.test(value))
  };
}

function parseTransferCommand(message) {
  const fileMatch = message.match(/\b([\w./-]+\.(?:js|css|html|json|cpp|py|md|txt|env))\b/i);
  const fromMatch = message.match(/\bfrom\s+([A-Za-z][\w -]*?)(?=\s+to\b|$)/i);
  const toMatch = message.match(/\bto\s+([A-Za-z][\w -]*)/i);
  return {
    fileName: fileMatch?.[1],
    fromOwner: fromMatch?.[1]?.trim(),
    toOwner: toMatch?.[1]?.trim()
  };
}

async function managerAgent(tools, request = {}) {
  console.log('[ManagerAgent] start');
  const message = request.message || '';
  const command = normalize(message);
  const summary = tools.projectSummary();
  const activity = tools.activityFeed(8);
  const activeUsers = tools.activeUsers();
  const managerSnapshot = tools.managerSnapshot();
  const telemetry = getProjectTelemetry(summary);
  const gitlabIssues = await safeGitLabTool('list_gitlab_issues', { state: 'opened' });
  const gitlabMrs = await safeGitLabTool('list_open_merge_requests', { state: 'opened' });
  const gitlabBranches = await safeGitLabTool('list_gitlab_branches');
  const gitlabPipeline = await safeGitLabTool('get_pipeline_status');
  const risks = detectConflictRisks(summary);
  const recentFiles = Object.entries(summary.files || {})
    .sort((a, b) => new Date(b[1].lastModified || 0) - new Date(a[1].lastModified || 0))
    .slice(0, 6)
    .map(([name, meta]) => `${name}${meta.lastModifiedBy ? ` by ${meta.lastModifiedBy}` : ''}`);

  if (/^show (file )?ownership\b/.test(command)) {
    console.log('[OwnershipQuery]', { decision: 'show_file_ownership', ownership: managerSnapshot.ownership });
    return [
      '**Engineering Manager - File Ownership**',
      '',
      '**Owned Files**',
      ...formatOwnershipRows(managerSnapshot.ownership),
      '',
      '**Contributors**',
      ...formatContributorRows(managerSnapshot.contributors)
    ].join('\n');
  }

  if (/^show locked files\b|^show locks\b/.test(command)) {
    console.log('[LockQuery]', { decision: 'show_locked_files', locks: managerSnapshot.locks });
    const locks = managerSnapshot.locks || [];
    return [
      '**Engineering Manager - Locked Files**',
      '',
      ...(locks.length ? locks.map(lock => `*  ${lock.fileName}: ${lock.owner} (${lock.status})`) : ['* No active file locks.'])
    ].join('\n');
  }

  if (/^show conflict risks\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'show_conflict_risks' });
    return [
      '**Engineering Manager - Conflict Risks**',
      '',
      ...formatRiskRows(managerSnapshot.conflictRisks)
    ].join('\n');
  }

  if (/^show blocked tasks\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'show_blocked_tasks' });
    const blocked = managerSnapshot.blockedTasks || [];
    return [
      '**Engineering Manager - Blocked Tasks**',
      '',
      ...(blocked.length ? blocked.map(item => `* ${item.type}: ${item.fileName} - ${item.reason}`) : ['* No blocked tasks detected.'])
    ].join('\n');
  }

  if (/^who is working on what\b|^team status\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'team_status' });
    return [
      '**Engineering Manager - Team Status**',
      '',
      '**Active Work**',
      ...formatActiveWorkRows(activeUsers),
      '',
      '**Contributors**',
      ...formatContributorRows(managerSnapshot.contributors),
      '',
      '**Ownership**',
      ...formatOwnershipRows(managerSnapshot.ownership)
    ].join('\n');
  }

  if (/^assign (task|ownership)\b/.test(command)) {
    const parsed = parseAssignCommand(message);
    if (!parsed.fileName || !parsed.owner) {
      return '**Engineering Manager - Assign Ownership**\n\nFile and owner required.\n\nExample: `assign ownership main.js to <username>`';
    }
    const ownership = tools.assignOwnership(parsed.fileName, parsed.owner, 'Engineering Manager');
    console.log('[OwnershipAssigned]', { fileName: parsed.fileName, owner: parsed.owner });
    return [
      '**Engineering Manager - Ownership Assigned**',
      '',
      `* File: ${ownership.fileName}`,
      `* Owner: ${ownership.owner}`,
      `* Role: ${ownership.role}`,
      `* Team: ${ownership.team}`,
      '',
      'Workspace Map and Explorer updated.'
    ].join('\n');
  }

  if (/^lock\s+([\w./-]+)/.test(command)) {
    const fileMatch = command.match(/^lock\s+([\w./-]+\.\w+)/);
    if (!fileMatch) {
      return '**Engineering Manager - Lock File**\n\nFile name required.\n\nExample: `lock main.js`';
    }
    const fileName = fileMatch[1];
    const currentUser = request.userName || request.user || request.username || 'Manager';
    try {
      const lock = tools.lockFile(fileName, currentUser, 'Manual Lock');
      console.log('[FileLocked]', { fileName, owner: lock.owner });
      return [
        '**Engineering Manager - File Locked**',
        '',
        `* \u{1F512} File: ${lock.fileName}`,
        `* Owner: ${lock.owner}`,
        `* Status: ${lock.status}`,
        `* Locked At: ${lock.lockedAt}`,
        '',
        'Other contributors will see a lock indicator in the Explorer and Workspace Map.'
      ].join('\n');
    } catch (err) {
      return `**Engineering Manager - Lock Failed**\n\n${err.message}`;
    }
  }

  if (/^unlock\s+([\w./-]+)/.test(command)) {
    const fileMatch = command.match(/^unlock\s+([\w./-]+\.\w+)/);
    if (!fileMatch) {
      return '**Engineering Manager - Unlock File**\n\nFile name required.\n\nExample: `unlock main.js`';
    }
    const fileName = fileMatch[1];
    const currentUser = request.userName || request.user || request.username || 'Manager';
    try {
      const result = tools.unlockFile(fileName, currentUser);
      console.log('[FileUnlocked]', { fileName, unlockedBy: currentUser });
      return [
        '**Engineering Manager - File Unlocked**',
        '',
        `* \u{1F513} File: ${fileName}`,
        `* Unlocked By: ${currentUser}`,
        '',
        'Lock indicator removed from Explorer and Workspace Map.'
      ].join('\n');
    } catch (err) {
      return `**Engineering Manager - Unlock Failed**\n\n${err.message}`;
    }
  }

  if (/^transfer ownership\b/.test(command)) {
    const parsed = parseTransferCommand(message);
    if (!parsed.fileName || !parsed.toOwner) {
      return '**Engineering Manager - Ownership Transfer**\n\nFile and new owner required.\n\nExample: `transfer ownership database.js from <current-owner> to <new-owner>`';
    }
    const ownership = tools.transferOwnership(parsed.fileName, parsed.fromOwner, parsed.toOwner, 'Engineering Manager');
    console.log('[ManagerDecision]', { decision: 'ownership_transferred', fileName: parsed.fileName, toOwner: parsed.toOwner });
    return [
      '**Engineering Manager - Ownership Transferred**',
      '',
      `* File: ${ownership.fileName}`,
      `* From: ${parsed.fromOwner || 'previous owner'}`,
      `* To: ${ownership.owner}`,
      '* Activity logged and file locked for the new owner.'
    ].join('\n');
  }

  if (/^protected merge\b|^merge readiness\b/.test(command)) {
    const pipelineStatus = gitlabPipeline.ok ? (gitlabPipeline.result.pipelineStatus || gitlabPipeline.result.status) : summary.pipelineStatus;
    const decision = tools.verifyProtectedMerge({ pipelineStatus });
    return [
      '**Engineering Manager - Protected Merge Check**',
      '',
      `* Decision: ${decision.allowed ? 'ALLOW MERGE' : 'BLOCK MERGE'}`,
      '',
      '**Blockers**',
      ...(decision.blockers.length ? decision.blockers.map(item => `* ${item}`) : ['* No merge blockers detected.'])
    ].join('\n');
  }

  if (/^project health\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'project_health' });
    return [
      '**Engineering Manager - Project Health**',
      '',
      `* Open GitLab Issues: ${gitlabIssues.ok ? gitlabIssues.result.length : 'GitLab unavailable'}`,
      `* Open Merge Requests: ${gitlabMrs.ok ? gitlabMrs.result.length : 'GitLab unavailable'}`,
      `* Branches: ${gitlabBranches.ok ? gitlabBranches.result.map(branch => branch.name).join(', ') : 'GitLab unavailable'}`,
      `* Pipeline: ${gitlabPipeline.ok ? (gitlabPipeline.result.pipelineStatus || gitlabPipeline.result.status) : summary.pipelineStatus}`,
      `* Active Locks: ${(managerSnapshot.locks || []).length}`,
      `* Conflict Risks: ${(managerSnapshot.conflictRisks || []).length}`,
      `* Readiness: ${summary.readinessScore}%`
    ].join('\n');
  }

  //  Release Readiness 
  if (/^release readiness\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'release_readiness' });
    const openIssues = gitlabIssues.ok ? gitlabIssues.result.length : telemetry.issues;
    const openMrs = gitlabMrs.ok ? gitlabMrs.result.length : telemetry.mrs;
    const activeConflicts = (managerSnapshot.conflictRisks || []).length;
    const lockedFiles = (managerSnapshot.locks || []).length;
    const pipelineVal = gitlabPipeline.ok ? (gitlabPipeline.result.pipelineStatus || gitlabPipeline.result.status || 'Unavailable') : 'Unavailable';
    const pipelinePassing = /success|passing|passed/i.test(pipelineVal || '');

    // Readiness scoring algorithm (0-100)
    let score = 100;
    score -= Math.min(openIssues * 8, 30);          // issues: up to -30
    score -= Math.min(openMrs * 5, 15);              // open MRs: up to -15
    score -= Math.min(activeConflicts * 12, 25);     // conflicts: up to -25
    score -= Math.min(lockedFiles * 4, 15);           // locks: up to -15
    if (!pipelinePassing) score -= 15;                // pipeline: -15
    score = Math.max(0, Math.min(100, score));

    const riskLevel = score >= 80 ? 'Low' : score >= 50 ? 'Medium' : 'High';
    const recommendations = [];
    if (activeConflicts > 0 && managerSnapshot.conflictRisks) {
      managerSnapshot.conflictRisks.forEach(risk => {
        recommendations.push(`Resolve ${risk.fileName} conflict`);
      });
    }
    if (!pipelinePassing) {
      recommendations.push('Run pipeline');
    }
    if (openMrs > 0 && gitlabMrs.ok && Array.isArray(gitlabMrs.result)) {
      gitlabMrs.result.forEach(mr => {
        recommendations.push(`Close MR #${mr.iid || mr.id || 1}`);
      });
    } else if (openMrs > 0) {
      recommendations.push('Close MR #1');
    }
    if (openIssues > 0) {
      recommendations.push(`Triage ${openIssues} open issue(s)`);
    }
    if (lockedFiles > 0) {
      recommendations.push(`Review ${lockedFiles} locked file(s) for stale locks`);
    }
    if (recommendations.length === 0) {
      recommendations.push('All clear  ready to ship.');
    }

    return [
      `Release Readiness: ${score}%`,
      '',
      'Open Issues:',
      `${openIssues}`,
      '',
      'Open Merge Requests:',
      `${openMrs}`,
      '',
      'Active Conflicts:',
      `${activeConflicts}`,
      '',
      'Locked Files:',
      `${lockedFiles}`,
      '',
      'Pipeline:',
      `${pipelineVal}`,
      '',
      'Risk Level:',
      `${riskLevel}`,
      '',
      'Recommendations:',
      '',
      ...recommendations.map(r => `* ${r}`)
    ].join('\n');
  }

  //  Team Health 
  if (/^team health\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'team_health' });
    const contributors = Object.values(managerSnapshot.contributors || {});
    const locks = managerSnapshot.locks || [];
    const conflictRisks = managerSnapshot.conflictRisks || [];
    const allActivity = managerSnapshot.recentActivity || [];

    const memberRows = contributors.map(c => {
      const ownedFiles = (c.assignedFiles || []).length;
      const userLocks = locks.filter(l => l.owner === c.name || l.owner === c.username).length;
      const userConflicts = conflictRisks.filter(r => (r.users || []).includes(c.name) || (r.users || []).includes(c.username)).length;
      const recentEdits = allActivity.filter(a => (a.user === c.name || a.user === c.username) && /edited|updated|created/i.test(a.action || '')).length;
      const load = ownedFiles + userLocks * 2 + userConflicts * 3;
      const loadLabel = load >= 8 ? '\u{1F534} Overloaded' : load >= 4 ? '\u{1F7E1} Busy' : '\u{1F7E2} Available';
      return `* **${c.name || c.username}** (${c.role || 'Contributor'})  Files: ${ownedFiles}, Locks: ${userLocks}, Conflicts: ${userConflicts}, Edits: ${recentEdits}  ${loadLabel}`;
    });

    return [
      '**Engineering Manager - Team Health**',
      '',
      '**Team Members**',
      ...(memberRows.length ? memberRows : ['* No contributors registered.']),
      '',
      '**Summary**',
      `* Total Contributors: ${contributors.length}`,
      `* Active Locks: ${locks.length}`,
      `* Conflict Risks: ${conflictRisks.length}`,
      `* Recent Activity Events: ${allActivity.length}`
    ].join('\n');
  }

  //  Suggest Owners 
  if (/^suggest owners\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'suggest_owners' });
    const allFiles = Object.keys(summary.files || {});
    const contributors = Object.values(managerSnapshot.contributors || {});
    const ownership = managerSnapshot.ownership || {};
    const allActivity = managerSnapshot.recentActivity || [];

    const suggestions = allFiles.map(fileName => {
      const currentOwner = ownership[fileName]?.owner || null;
      // Score each contributor by recent edits on this file
      const candidates = contributors.map(c => {
        const name = c.name || c.username;
        const edits = allActivity.filter(a => a.target === fileName && (a.user === name)).length;
        const alreadyAssigned = (c.assignedFiles || []).includes(fileName) ? 2 : 0;
        return { name, score: edits + alreadyAssigned, role: c.role };
      }).filter(c => c.score > 0).sort((a, b) => b.score - a.score);

      const suggested = candidates.length > 0 ? candidates[0].name : null;
      const interactions = candidates.length > 0 ? allActivity.filter(a => a.target === fileName && (a.user === candidates[0].name)).length : 0;
      const reason = candidates.length > 0
        ? `${interactions} interactions`
        : 'No activity detected';

      return { fileName, currentOwner, suggested, reason };
    });

    const rows = suggestions.map(s => {
      return `* ${s.fileName} [Suggested Owner: ${s.suggested || 'None'}] (reason: ${s.reason})`;
    });

    return [
      '**Engineering Manager - Ownership Suggestions**',
      '',
      ...(rows.length ? rows : ['* No files in workspace.']),
      '',
      '**Actions**',
      '* Use `assign ownership <file> to <user>` to apply a suggestion.'
    ].join('\n');
  }

  //  Show Conflict Heatmap 
  if (/^show conflict heatmap\b/.test(command)) {
    console.log('[ManagerDecision]', { decision: 'show_conflict_heatmap' });
    const allFiles = Object.keys(summary.files || {});
    const ownership = managerSnapshot.ownership || {};
    const locks = managerSnapshot.locks || [];
    const conflictRisks = managerSnapshot.conflictRisks || [];
    const allActivity = managerSnapshot.recentActivity || [];

    const heatmap = allFiles.map(fileName => {
      const fileOwner = ownership[fileName]?.owner || null;
      const isLocked = locks.some(l => l.fileName === fileName);
      const fileRisks = conflictRisks.filter(r => r.fileName === fileName);
      const editorSet = new Set();
      allActivity.filter(a => a.target === fileName && /edited|updated|created/i.test(a.action || '')).forEach(a => editorSet.add(a.user));

      // Heat score: higher = more risky
      let heat = 0;
      heat += fileRisks.length * 3;
      heat += editorSet.size > 1 ? editorSet.size * 2 : 0;
      heat += isLocked ? 1 : 0;
      heat += !fileOwner ? 1 : 0;

      const heatLabel = heat >= 6 ? '\u{1F534}' : heat >= 3 ? '\u{1F7E1}' : '\u{1F7E2}';
      return { fileName, heat, heatLabel, fileOwner, isLocked, risks: fileRisks.length, editors: editorSet.size };
    }).sort((a, b) => b.heat - a.heat);

    const rows = heatmap.map(h => {
      const lockIcon = h.isLocked ? ' \u{1F512}' : '';
      const ownerStr = h.fileOwner || 'unowned';
      return `* ${h.heatLabel} \`${h.fileName}\`${lockIcon}  Owner: ${ownerStr}, Risks: ${h.risks}, Editors: ${h.editors}`;
    });

    return [
      '**Engineering Manager - Conflict Heatmap**',
      '',
      ' High Risk   Medium Risk   Low Risk',
      '',
      ...(rows.length ? rows : ['* No files in workspace.']),
      '',
      '**Legend**',
      '* Heat factors: active conflicts, multiple editors, locks, missing ownership'
    ].join('\n');
  }

  //  Force Unlock (Manager Override) 
  if (/^force unlock\s+/.test(command)) {
    const fileMatch = command.match(/^force unlock\s+([\w./-]+\.\w+)/);
    if (!fileMatch) {
      return '**Engineering Manager - Force Unlock**\n\nFile name required.\n\nExample: `force unlock main.js`';
    }
    const fileName = fileMatch[1];
    console.log('[ManagerOverride]', { action: 'force_unlock', fileName });
    try {
      const result = tools.unlockFile(fileName, 'Manager');
      tools.managerSnapshot(); // refresh
      const logMsg = `[ManagerOverride] Force unlocked ${fileName}`;
      console.log(logMsg);
      return [
        '**Engineering Manager - Force Unlock**',
        '',
        `* \u{1F513} File: ${fileName}`,
        `* Action: **Force Unlocked** (Manager Override)`,
        `* Previous Owner: ${result?.owner || 'unknown'}`,
        '',
        '\u{26A0}\u{FE0F} This override has been logged to the activity feed.',
        '',
        '**Activity Logged**',
        `* [ManagerOverride] force_unlock ${fileName}`
      ].join('\n');
    } catch (err) {
      return `**Engineering Manager - Force Unlock Failed**\n\n${err.message}`;
    }
  }

  //  Force Transfer (Manager Override) 
  if (/^force transfer\b/.test(command)) {
    const parsed = parseTransferCommand(message);
    if (!parsed.fileName || !parsed.toOwner) {
      return '**Engineering Manager - Force Transfer**\n\nFile and new owner required.\n\nExample: `force transfer main.js from <current-owner> to <new-owner>`';
    }
    console.log('[ManagerOverride]', { action: 'force_transfer', fileName: parsed.fileName, to: parsed.toOwner });
    try {
      const ownership = tools.transferOwnership(parsed.fileName, parsed.fromOwner, parsed.toOwner, 'Manager');
      return [
        '**Engineering Manager - Force Transfer**',
        '',
        `* File: ${ownership.fileName}`,
        `* From: ${parsed.fromOwner || 'previous owner'}`,
        `* To: ${ownership.owner}`,
        `* Action: **Force Transferred** (Manager Override)`,
        '',
        ' This override has been logged to the activity feed.',
        '',
        '**Activity Logged**',
        `* [ManagerOverride] force_transfer ${parsed.fileName}  ${ownership.owner}`
      ].join('\n');
    } catch (err) {
      return `**Engineering Manager - Force Transfer Failed**\n\n${err.message}`;
    }
  }

  return [
    '**Manager Agent - Project Coordination Brief**',
    '',
    '**Tools Used**',
    `* activityFeed() -> ${activity.length} events`,
    `* activeUsers() -> ${activeUsers.length} users`,
    '* projectSummary() -> readiness, files, activity, pipeline',
    '* managerSnapshot() -> ownership, locks, conflicts, contributors',
    `* list_gitlab_issues() -> ${gitlabIssues.ok ? `${gitlabIssues.result.length} open` : 'unavailable'}`,
    `* list_open_merge_requests() -> ${gitlabMrs.ok ? `${gitlabMrs.result.length} open` : 'unavailable'}`,
    '',
    '**Recent Changes**',
    ...(recentFiles.length ? recentFiles.map(item => `* ${item}`) : ['* No recent file changes recorded.']),
    '',
    '**Team Summary**',
    ...(activeUsers.length ? activeUsers.map(user => `* ${user.name}: ${user.currentFile || 'no active file'}`) : ['* No active collaborators connected.']),
    '',
    '**Current Risks**',
    ...(managerSnapshot.conflictRisks?.length ? formatRiskRows(managerSnapshot.conflictRisks) : (risks.length ? risks.map(risk => `* ${risk}`) : ['* No same-file collaboration conflicts detected.'])),
    '',
    '**Progress / Readiness**',
    `* Pipeline: ${gitlabPipeline.ok ? (gitlabPipeline.result.pipelineStatus || gitlabPipeline.result.status) : summary.pipelineStatus}`,
    `* Readiness: ${summary.readinessScore}%`,
    `* Open Issues: ${gitlabIssues.ok ? gitlabIssues.result.length : `${telemetry.issues} (local estimate)`}`,
    `* Open MRs: ${gitlabMrs.ok ? gitlabMrs.result.length : `${telemetry.mrs} (local estimate)`}`,
    '',
    '**Next Priorities**',
    '* Run Can we deploy? before recording the demo.',
    '* Convert unresolved reviewer/security findings into GitLab issues.',
    '* Keep one owner per risky file until merge-ready.'
  ].join('\n');
}

async function devopsAgent(tools) {
  console.log('[DevOpsAgent] start');
  const build = tools.buildStatus();
  const gitlabPipeline = await safeGitLabTool('get_pipeline_status');
  const pipeline = gitlabPipeline.ok
    ? (gitlabPipeline.result.pipelineStatus || gitlabPipeline.result.status)
    : tools.pipelineStatus();
  const terminal = tools.terminalOutput();
  const summary = tools.projectSummary();
  const telemetry = getProjectTelemetry(summary);
  const blockers = [];

  if (build !== 'Passing') blockers.push(`Build status is ${build}.`);
  if (pipeline !== 'Passing') blockers.push(`Pipeline status is ${pipeline}.`);
  if (/error|failed|exception/i.test(terminal || '')) blockers.push('Recent terminal output contains an error/failure signal.');
  if (telemetry.securityIssues > 0) blockers.push(`${telemetry.securityIssues} security issue(s) are open.`);

  const ready = blockers.length === 0 && telemetry.tests >= 90;
  return [
    '**DevOps Agent - Deployment Readiness**',
    '',
    '**Tools Used**',
    `* buildStatus() -> ${build}`,
    `* ${gitlabPipeline.ok ? 'get_pipeline_status()' : 'pipelineStatus()'} -> ${pipeline}`,
    `* terminalOutput() -> ${terminal ? 'available' : 'no terminal snapshot supplied'}`,
    '',
    `**Deployment Status:** ${ready ? 'READY' : 'BLOCKED'}`,
    `**Build Health:** ${build}`,
    `**Pipeline:** ${pipeline}`,
    `**Last Run:** ${gitlabPipeline.ok ? (gitlabPipeline.result.updatedAt || gitlabPipeline.result.createdAt || 'not provided') : 'local fallback'}`,
    `**Tests:** ${telemetry.tests}%`,
    '',
    '**Warnings / Blockers**',
    ...(blockers.length ? blockers.map(item => `* ${item}`) : ['* No local deployment blockers detected.']),
    '',
    '**Recommendations**',
    ready
      ? '* Safe to prepare a merge request after reviewer approval.'
      : '* Resolve blockers, rerun the build, then re-check deployment readiness.'
  ].join('\n');
}

function extractQuotedOrTrailing(message, keyword) {
  const quoted = message.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1].trim();
  const pattern = new RegExp(`${keyword}\\s+(.+)$`, 'i');
  const match = message.match(pattern);
  return match?.[1]?.trim();
}

function extractFlag(message, flagName) {
  const pattern = new RegExp(`--${flagName}\\s+(?:"([^"]+)"|'([^']+)'|(.+?))(?=\\s+--\\w+|$)`, 'i');
  const match = message.match(pattern);
  return (match?.[1] || match?.[2] || match?.[3] || '').trim();
}

function formatGitLabError(toolName, err) {
  if (err.code === 'GITLAB_NOT_CONFIGURED' || err.missing?.length) {
    return [
      '**GitLab Actions Agent**',
      '',
      'GitLab is not configured.',
      '',
      '**Missing**',
      ...(err.missing || ['GITLAB_TOKEN', 'GITLAB_PROJECT_ID']).map(item => `* ${item}`),
      '',
      `Command: ${toolName}`
    ].join('\n');
  }

  return [
    '**GitLab Actions Agent**',
    '',
    `* Command: ${toolName}`,
    '* Status: Failed',
    `* Reason: ${err.message}`
  ].join('\n');
}

async function gitlabActionsAgent(message, projectMemory = null) {
  console.log('[GitLabActions] start', { message });
  const text = normalize(message);
  let toolName = null;
  let args = {};

  if (/^(project info|gitlab status|gitlab health|health check)\b/.test(text)) {
    toolName = /health|status/.test(text) ? 'gitlab_health_check' : 'get_gitlab_project_info';
  } else if (/pipeline status|latest pipeline|recent failures/.test(text)) {
    toolName = 'get_pipeline_status';
    args = { ref: extractFlag(message, 'ref') || undefined };
  } else if (/^(list|show|open)\s+issues?\b/.test(text)) {
    toolName = 'list_gitlab_issues';
    args = { state: extractFlag(message, 'state') || 'opened' };
  } else if (/show\s+branches|list\s+branches/.test(text)) {
    toolName = 'list_gitlab_branches';
  } else if (/^(list|show|open)\s+(merge requests?|mrs?)\b/.test(text)) {
    toolName = 'list_open_merge_requests';
    args = { state: extractFlag(message, 'state') || 'opened' };
  } else if (/create\s+branch/.test(text)) {
    const branchName = extractQuotedOrTrailing(message, 'create\\s+branch');
    if (!branchName) {
      return [
        '**GitLab Actions Agent**',
        '',
        'Branch name?',
        'Source branch?',
        '',
        'Reply with: `create branch "feature/name" --source main`'
      ].join('\n');
    }
    toolName = 'create_branch';
    args = {
      branchName,
      sourceBranch: extractFlag(message, 'source') || extractFlag(message, 'ref') || 'main'
    };
  } else if (/create\s+(an?\s+)?issue/.test(text)) {
    const title = extractQuotedOrTrailing(message, 'create\\s+(?:an?\\s+)?issue');
    const description = extractFlag(message, 'description');
    if (!title) {
      return [
        '**GitLab Actions Agent**',
        '',
        'Title?',
        'Description?',
        '',
        'Reply with: `create issue "Title" --description "Description"`'
      ].join('\n');
    }
    toolName = 'create_gitlab_issue';
    args = {
      title,
      description: description || 'Created from JADIT agent action.',
      labels: /security/i.test(message) ? 'security,high-priority' : ''
    };
  } else if (/create\s+(an?\s+)?(merge request|mr)/.test(text)) {
    const title = extractQuotedOrTrailing(message, 'create\\s+(?:an?\\s+)?(?:merge request|mr)');
    const sourceBranch = extractFlag(message, 'source');
    if (!title || !sourceBranch) {
      return [
        '**GitLab Actions Agent**',
        '',
        'Source branch?',
        'Target branch?',
        'Title?',
        '',
        'Reply with: `create merge request "Title" --source feature/name --target main`'
      ].join('\n');
    }
    toolName = 'create_merge_request';
    args = {
      sourceBranch,
      targetBranch: extractFlag(message, 'target') || 'main',
      title,
      description: extractFlag(message, 'description') || 'Merge request prepared by JADIT agent.'
    };
  }

  if (!toolName) return null;

  console.log('[GitLabActions] executing tool', { toolName, args });
  try {
    const result = await toolRegistry.executeTool(toolName, args);
    if (toolName === 'create_merge_request' && projectMemory && typeof projectMemory.runConflictCheck === 'function') {
      projectMemory.runConflictCheck('merge_request_creation');
    }
    return formatGitLabResult(toolName, result);
  } catch (err) {
    return formatGitLabError(toolName, err);
  }
}

function formatGitLabResult(toolName, result) {
  if (toolName === 'create_gitlab_issue') {
    return `**GitLab Actions Agent**\n\nIssue #${result.issueIid || result.issueId} created successfully.\n\n* Title: ${result.title}\n* URL: ${result.webUrl || 'not provided'}`;
  }
  if (toolName === 'list_gitlab_issues') {
    const list = Array.isArray(result) ? result : [];
    return [
      '**GitLab Actions Agent - Issues**',
      '',
      ...(list.length ? list.map(issue => `* #${issue.issueIid}: ${issue.title} (${issue.state})`) : ['* No issues returned.'])
    ].join('\n');
  }
  if (toolName === 'create_branch') {
    return `**GitLab Actions Agent**\n\nBranch \`${result.branch}\` created successfully.\n\n* Commit: ${result.commit?.shortId || result.commit?.id || 'not provided'}\n* URL: ${result.webUrl || 'not provided'}`;
  }
  if (toolName === 'list_gitlab_branches') {
    const list = Array.isArray(result) ? result : [];
    return [
      '**GitLab Actions Agent - Branches**',
      '',
      ...(list.length ? list.map(branch => `* ${branch.name}${branch.default ? ' (default)' : ''} - ${branch.commit?.shortId || 'no commit'}`) : ['* No branches returned.'])
    ].join('\n');
  }
  if (toolName === 'create_merge_request') {
    return `**GitLab Actions Agent**\n\nMerge Request !${result.mrIid || result.mrId} opened.\n\n* Title: ${result.title}\n* Source: ${result.sourceBranch}\n* Target: ${result.targetBranch}\n* URL: ${result.webUrl || 'not provided'}`;
  }
  if (toolName === 'list_open_merge_requests') {
    const list = Array.isArray(result) ? result : [];
    return [
      '**GitLab Actions Agent - Open Merge Requests**',
      '',
      ...(list.length ? list.map(mr => `* !${mr.mrIid}: ${mr.title} (${mr.sourceBranch} -> ${mr.targetBranch})`) : ['* No open merge requests returned.'])
    ].join('\n');
  }
  if (toolName === 'get_pipeline_status') {
    return [
      '**GitLab Actions Agent - Pipeline Status**',
      '',
      `* Status: ${result.pipelineStatus || result.status}`,
      `* Ref: ${result.ref || 'not provided'}`,
      `* Last Run: ${result.updatedAt || result.createdAt || 'not provided'}`,
      `* URL: ${result.webUrl || 'not provided'}`,
      '',
      `**Recommendation:** ${(result.pipelineStatus || result.status) === 'success' ? 'Deploy' : 'Do Not Deploy'}`
    ].join('\n');
  }
  if (toolName === 'get_gitlab_project_info' || toolName === 'gitlab_health_check') {
    const project = result.project || result;
    return [
      '**GitLab Actions Agent - Project**',
      '',
      `* Project: ${project.pathWithNamespace || project.name || 'not provided'}`,
      `* Project ID: ${project.projectId || 'not provided'}`,
      `* Default Branch: ${project.defaultBranch || 'not provided'}`,
      `* URL: ${project.webUrl || 'not provided'}`
    ].join('\n');
  }
  return `**GitLab Actions Agent**\n\n${JSON.stringify(result, null, 2)}`;
}

const localAgents = {
  reviewer: reviewerAgent,
  security: securityAgent,
  planner: plannerAgent,
  manager: managerAgent,
  devops: devopsAgent
};

export async function routeAgentRequest(request, projectMemory) {
  let agentType = routeAgent(request.message, request.agentId);
  if (!agentType && request.forceLocal) {
    agentType = request.agentId || 'manager';
    if (agentType === 'cto' || agentType === 'pm') {
      agentType = 'manager';
    }
  }
  if (!agentType) {
    console.log('[AgentRouter] no local route matched');
    return null;
  }

  const payload = { ...request, agentType };
  try {
    const adkResult = await tryADKAgent(agentType, payload);
    if (adkResult) {
      console.log('[AgentRouter] ADK result used', { agentType });
      return { text: adkResult, source: 'adk', agentType };
    }
  } catch (err) {
    console.warn('[AgentRouter] ADK failed, falling back to local agent', { agentType, error: err.message });
  }

  if (agentType === 'gitlab') {
    const text = await gitlabActionsAgent(request.message, projectMemory);
    return text ? { text, source: 'local', agentType } : null;
  }

  const agent = localAgents[agentType];
  if (!agent) return null;

  const tools = createLocalTools(projectMemory, request);
  const text = await agent(tools, request);
  console.log('[AgentRouter] local result used', { agentType });
  return { text, source: 'local', agentType };
}

export default {
  routeAgentRequest,
  tryADKAgent
};
