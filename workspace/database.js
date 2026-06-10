// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Auth Helper
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Auth Helper
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
console.log("api");// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
// Database Connection
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Project Configuration
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
// Database Connection
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
console.log("api");