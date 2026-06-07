// ═══════════════════════════════════════════════════════════════
// GitLab Co-Pilot Live — Core Server Orchestrator
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectMemory from './src/project-memory.js';
import CollabServer from './src/collab-server.js';
import { setupRoutes } from './src/routes.js';
import { registerFileTools } from './src/tool-registry.js';

const app = express();
const port = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app);

// Initialize modular components
const projectMemory = new ProjectMemory('hackathon-demo');
const collabServer = new CollabServer(server, projectMemory);

// Register IDE file tools with access to project memory and collaboration server
registerFileTools(projectMemory, collabServer);

// Set up REST routes
setupRoutes(app, projectMemory, collabServer);

// Start server listening
server.listen(port, () => {
  console.log(`🚀 GitLab Co-Pilot Live Operational at http://localhost:${port}`);
});