import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectMemory from './src/project-memory.js';
import CollabServer from './src/collab-server.js';
import { setupRoutes } from './src/routes.js';
import { registerFileTools } from './src/tool-registry.js';
import { gitlabService } from './src/gitlab-service.js';
import mcpClient from './src/mcp-client.js';

const app = express();
const port = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const server = http.createServer(app);

const projectMemory = new ProjectMemory('hackathon-demo');
const collabServer = new CollabServer(server, projectMemory);

registerFileTools(projectMemory, collabServer);
mcpClient.start().catch(console.error);
setupRoutes(app, projectMemory, collabServer);

server.listen(port, () => {
  console.log(`JADIT Operational at http://localhost:${port}`);
  gitlabService.healthCheck()
    .then((health) => {
      if (health.status === 'success') {
        console.log('[GitLabConnected]', {
          projectId: health.project.projectId,
          project: health.project.pathWithNamespace
        });
      } else {
        console.warn('[GitLabAPIError]', health);
      }
    })
    .catch((err) => {
      console.error('[GitLabAPIError]', {
        message: err.message,
        missing: err.missing || []
      });
    });
});
