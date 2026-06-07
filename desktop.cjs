const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Redirect user data and cache path to a project local folder
// to prevent Chromium/Electron permission errors (0x5 Access Denied) in global directories
const localUserData = path.join(__dirname, '.electron-user-data');
app.setPath('userData', localUserData);

let serverProcess = null;
let mainWindow = null;

// Check if port is already active
function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: port,
      path: '/api/current-project',
      method: 'GET',
      timeout: 800
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Start Express server as a child process
function startServer() {
  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: '8080' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, 'public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Windows 11 Acrylic/Mica material support
  if (process.platform === 'win32') {
    mainWindow.setBackgroundMaterial('acrylic'); // Fails gracefully on older Win versions
  }

  // Load the web app
  mainWindow.loadURL('http://localhost:8080');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Clean up child process on exit
app.on('ready', async () => {
  const isRunning = await checkServerRunning(8080);
  if (isRunning) {
    console.log('⚡ [Desktop] Express server is already running on port 8080. Connecting to existing instance...');
    createWindow();
  } else {
    console.log('🚀 [Desktop] Starting Express backend server...');
    startServer();
    setTimeout(createWindow, 1200);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

ipcMain.on('set-window-opacity', (event, opacity) => {
  if (mainWindow) {
    // If user wants full opacity, make window opaque. Otherwise keep transparent.
    mainWindow.setSimpleFullScreen(false);
  }
});
