// API Routes
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
