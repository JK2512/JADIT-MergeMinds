// ═══════════════════════════════════════════════════════════════
// API Routes — REST endpoints for project data
// Consumed by the frontend and (in Phase 2) by the AI Engine.
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import { handleChatRequest } from './chat-service.js';
import { gitlabService } from './gitlab-service.js';

export function setupRoutes(app, projectMemory, collabServer) {
  app.use(express.json());

  // ── AI Capabilities (Streaming) ──────────────────────────

  app.post('/api/ai/chat', (req, res) => {
    handleChatRequest(req, res, projectMemory);
  });

  app.get('/api/gitlab/health', async (req, res) => {
    try {
      const health = await gitlabService.healthCheck();
      res.status(health.status === 'success' ? 200 : 503).json(health);
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: err.message,
        missing: err.missing || []
      });
    }
  });

  // ── File Management REST API ─────────────────────────────

  app.post('/api/project/create-file', (req, res) => {
    const { fileName, content, userName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }
    try {
      collabServer.createFile(fileName, content || '', userName || 'system');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/project/update-file', (req, res) => {
    const { fileName, content, userName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }
    try {
      projectMemory.updateFile(fileName, content || '', userName || 'local');
      projectMemory.saveToDisk();
      if (collabServer && typeof collabServer.broadcastFileReload === 'function') {
        collabServer.broadcastFileReload(fileName, content || '');
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/project/rename-file', (req, res) => {
    const { oldName, newName, userName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Old name and new name are required' });
    }
    try {
      collabServer.renameFile(oldName, newName, userName || 'system');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/project/delete-file', (req, res) => {
    const { fileName, userName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'File name is required' });
    }
    try {
      collabServer.deleteFile(fileName, userName || 'system');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Project Files ────────────────────────────────────────

  app.get('/api/project/files', (req, res) => {
    res.json({
      project: projectMemory.projectName,
      files: projectMemory.getAllFiles()
    });
  });

  app.get('/api/project/file/:fileName', (req, res) => {
    const content = projectMemory.getFileContent(req.params.fileName);
    if (content === null) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({
      fileName: req.params.fileName,
      content,
      metadata: projectMemory.getFile(req.params.fileName)
    });
  });

  // ── Activity Log ─────────────────────────────────────────

  app.get('/api/project/activity', (req, res) => {
    const count = parseInt(req.query.count) || 50;
    const since = req.query.since || null;

    const events = since
      ? projectMemory.getActivitySince(since)
      : projectMemory.getRecentActivity(count);

    res.json({ events });
  });

  // ── User Presence ────────────────────────────────────────

  app.get('/api/project/users', (req, res) => {
    res.json({
      users: projectMemory.getActiveUsers(),
      total: projectMemory.activeSessions.size
    });
  });

  // ── Conflict Intelligence Endpoints ───────────────────────

  app.get('/api/project/ownership', (req, res) => {
    res.json({ ownership: projectMemory.getFileOwnership() });
  });

  app.get('/api/project/locks', (req, res) => {
    res.json({ locks: projectMemory.getLockedFiles() });
  });

  app.get('/api/project/conflicts', (req, res) => {
    res.json({ risks: projectMemory.getConflictRisks() });
  });

  app.get('/api/project/manager-snapshot', (req, res) => {
    res.json(projectMemory.getManagerSnapshot());
  });

  // ── Project Summary (used by AI in Phase 2) ──────────────

  app.get('/api/project/summary', (req, res) => {
    res.json(projectMemory.getProjectSummary());
  });

  // ── Live Hackathon Demo Endpoints ─────────────────────────

  app.post('/api/demo/fail', (req, res) => {
    try {
      const failCode = `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Deploying hackathon workspace..." << endl;\n    // SYNTAX ERROR: missing quotes and semicolon below\n    cout << Incomplete output compilation\n    return 0;\n}\n`;
      projectMemory.updateFile('hi.cpp', failCode, 'devops');
      projectMemory.logActivity('Devops Specialist', 'pipeline_failed', 'hi.cpp', {
        error: 'expected primary-expression before "Incomplete"',
        pipelineId: '#9984'
      });
      projectMemory.saveToDisk();
      
      // Notify collab server peers to pull updated file content
      if (collabServer && typeof collabServer.broadcastFileReload === 'function') {
        collabServer.broadcastFileReload('hi.cpp', failCode);
      }
      
      res.json({ success: true, message: 'Failing compiler state triggered in hi.cpp' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/demo/reset', (req, res) => {
    try {
      const cleanCode = `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "JADIT: Build successful!" << endl;\n    return 0;\n}\n`;
      projectMemory.updateFile('hi.cpp', cleanCode, 'devops');
      projectMemory.logActivity('Devops Specialist', 'pipeline_passed', 'hi.cpp', {
        message: 'All unit tests and builds successful',
        pipelineId: '#9985'
      });
      projectMemory.saveToDisk();
      
      if (collabServer && typeof collabServer.broadcastFileReload === 'function') {
        collabServer.broadcastFileReload('hi.cpp', cleanCode);
      }
      
      res.json({ success: true, message: 'Workspace reset to clean passing state' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Legacy endpoint (backward compatibility) ─────────────

  app.get('/api/current-project', (req, res) => {
    res.json({
      workspace: projectMemory.projectName,
      files: projectMemory.getAllFileContents()
    });
  });

  console.log('🛣️  API routes mounted');
}
