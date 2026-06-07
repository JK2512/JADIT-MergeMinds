// Main Application Entry Point
// GitLab Co-Pilot Live — Hackathon Demo Project

import config from './config.js';
import { setupRoutes } from './api.js';
import { connectDatabase } from './database.js';

async function initialize() {
  console.log(`Starting ${config.app.name} v${config.app.version}`);

  try {
    await connectDatabase();
    const app = express();
    setupRoutes(app);

    app.listen(config.app.port, () => {
      console.log(`Server running on port ${config.app.port}`);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

initialize();

// Client A was here

// Client A was here

// Client A was here

// Client A was here
