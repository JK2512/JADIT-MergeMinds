// Project Configuration
// Environment and application settings

const config = {
  app: {
    name: 'JADIT Demo',
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
