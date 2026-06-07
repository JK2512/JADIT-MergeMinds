// ═══════════════════════════════════════════════════════════════
// Context Builder Module — Assembles Real-Time Workspace State
// Aggregates files, contents, active users, stats, and activity.
// ═══════════════════════════════════════════════════════════════

/**
 * Compiles the current in-memory workspace state into a clean, structured
 * string context block to be injected into the Gemini request.
 * @param {ProjectMemory} projectMemory - Instance of the project memory tracker
 * @returns {string} Fully structured text context
 */
export function buildProjectContext(projectMemory) {
  if (!projectMemory) {
    return "No project context available.";
  }

  const summary = projectMemory.getProjectSummary();

  let context = `=== REAL-TIME WORKSPACE CONTEXT ===\n`;
  context += `Timestamp: ${new Date().toISOString()}\n`;
  context += `Project Name: ${summary.projectName}\n`;
  context += `Total Files: ${summary.stats.totalFiles}\n`;
  context += `Total Lines of Code: ${summary.stats.totalLines}\n`;
  context += `Active Team Size: ${summary.stats.activeUserCount}\n\n`;

  // 1. Online presence
  context += `--- Active Online Team Members ---\n`;
  if (summary.activeUsers.length === 0) {
    context += `No users are currently viewing the workspace.\n`;
  } else {
    summary.activeUsers.forEach(u => {
      context += `- User: "${u.name}" | Connection ID: ${u.id.slice(0, 8)} | Active File: ${u.currentFile || 'idle'}\n`;
    });
  }
  context += `\n`;

  // 2. File tree and metadata
  context += `--- Workspace Files Metadata ---\n`;
  const fileNames = Object.keys(summary.files);
  if (fileNames.length === 0) {
    context += `No files in the workspace.\n`;
  } else {
    for (const [name, meta] of Object.entries(summary.files)) {
      context += `- File: "${name}" | ${meta.lineCount} lines | Size: ${meta.size} bytes | Version: v${meta.version} | Last modified by: ${meta.lastModifiedBy} at ${meta.lastModified}\n`;
    }
  }
  context += `\n`;

  // 3. Complete file contents (real data, no mocks!)
  context += `--- Full Content of Workspace Files ---\n`;
  const fileContents = Object.entries(summary.fileContents);
  if (fileContents.length === 0) {
    context += `[Workspace is currently empty]\n`;
  } else {
    for (const [name, content] of fileContents) {
      context += `[File: ${name}]\n`;
      context += `\`\`\`\n`;
      context += content;
      context += `\n\`\`\`\n\n`;
    }
  }

  // 4. Chronological activity feed
  context += `--- Chronological Activity Feed (Most Recent First) ---\n`;
  if (summary.recentActivity.length === 0) {
    context += `No activity recorded yet in this session.\n`;
  } else {
    summary.recentActivity.forEach(e => {
      const detailsStr = e.details ? ` | details: ${JSON.stringify(e.details)}` : '';
      context += `[${e.timestamp}] User "${e.user}" performed "${e.action}" on "${e.target}"${detailsStr}\n`;
    });
  }
  context += `\n===================================`;

  return context;
}

export default buildProjectContext;
