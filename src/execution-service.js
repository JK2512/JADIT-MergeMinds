import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class ExecutionSession {
  constructor() {
    this.processes = new Set();
    this.killed = false;
    this.workspaceDir = path.join(process.cwd(), 'workspace');
  }

  /**
   * Run the specified file.
   * @param {string} fileName - File name to run, relative to workspace
   * @param {string} connId - WebSocket connection ID for unique compiled binary names
   * @param {function} onStatus - Callback (status, details)
   * @param {function} onOutput - Callback (category, text)
   */
  async runFile(fileName, connId, onStatus, onOutput) {
    const filePath = path.join(this.workspaceDir, fileName);
    if (!fs.existsSync(filePath)) {
      onStatus('failed', `File "${fileName}" does not exist.`);
      return;
    }

    const ext = fileName.split('.').pop().toLowerCase();

    if (ext === 'cpp') {
      this.runCpp(fileName, connId, onStatus, onOutput);
    } else if (ext === 'js') {
      this.runJs(fileName, onStatus, onOutput);
    } else if (ext === 'py') {
      this.runPython(fileName, onStatus, onOutput);
    } else {
      onStatus('failed', `Unsupported file type: .${ext}`);
    }
  }

  /**
   * Run C++ File: Compile with g++ and run
   */
  runCpp(fileName, connId, onStatus, onOutput) {
    // 1. Verify g++ installation
    const isWin = process.platform === 'win32';
    const check = spawn('g++', ['--version']);
    
    check.on('error', (err) => {
      if (err.code === 'ENOENT') {
        onStatus('failed', 'C++ compiler (g++) not installed. Install MinGW or MSYS2.');
      } else {
        onStatus('failed', `Compiler check failed: ${err.message}`);
      }
    });

    check.on('close', (code) => {
      if (code !== 0) return; // handled by error or didn't succeed

      if (this.killed) return;

      // 2. Set status to Compiling
      onStatus('compiling', '🟡 Compiling...');

      const exeName = `run_output_${connId}${isWin ? '.exe' : ''}`;
      const exePath = path.join(this.workspaceDir, exeName);

      // Clean up pre-existing binary if any
      try {
        if (fs.existsSync(exePath)) {
          fs.unlinkSync(exePath);
        }
      } catch (e) {}

      // Spawn g++ compiler
      const compiler = spawn('g++', [fileName, '-o', exeName], {
        cwd: this.workspaceDir
      });
      this.processes.add(compiler);

      let compilerErrors = '';
      compiler.stderr.on('data', (data) => {
        compilerErrors += data.toString('utf8');
      });
      compiler.stdout.on('data', (data) => {
        compilerErrors += data.toString('utf8');
      });

      compiler.on('error', (err) => {
        this.processes.delete(compiler);
        onStatus('failed', `Compilation failed to start: ${err.message}`);
      });

      compiler.on('close', (compileCode) => {
        this.processes.delete(compiler);
        if (this.killed) {
          this.cleanupBinary(exePath);
          return;
        }

        if (compileCode !== 0) {
          // Compilation failed
          onOutput('compile_error', compilerErrors || `g++ exited with code ${compileCode}`);
          onStatus('failed', '🔴 Failed');
          return;
        }

        // 3. Compilation succeeded, set status to Running
        onStatus('running', '🟢 Running...');

        const runCmd = isWin ? exeName : `./${exeName}`;
        const runner = spawn(runCmd, [], {
          cwd: this.workspaceDir
        });
        this.processes.add(runner);

        runner.stdout.on('data', (data) => {
          onOutput('stdout', data.toString('utf8'));
        });

        runner.stderr.on('data', (data) => {
          onOutput('stderr', data.toString('utf8'));
        });

        runner.on('error', (err) => {
          this.processes.delete(runner);
          onStatus('failed', `Failed to start binary: ${err.message}`);
          this.cleanupBinary(exePath);
        });

        runner.on('close', (runCode) => {
          this.processes.delete(runner);
          if (runCode === 0) {
            onStatus('completed', '✅ Completed');
          } else {
            onStatus('failed', `🔴 Failed (exit code ${runCode})`);
          }
          this.cleanupBinary(exePath);
        });
      });
    });
  }

  /**
   * Run JavaScript File with Node
   */
  runJs(fileName, onStatus, onOutput) {
    const check = spawn('node', ['--version']);
    
    check.on('error', (err) => {
      if (err.code === 'ENOENT') {
        onStatus('failed', 'Node.js is not installed.');
      } else {
        onStatus('failed', `Node.js check failed: ${err.message}`);
      }
    });

    check.on('close', (code) => {
      if (code !== 0) return;
      if (this.killed) return;

      onStatus('running', '🟢 Running...');

      const runner = spawn('node', [fileName], {
        cwd: this.workspaceDir
      });
      this.processes.add(runner);

      runner.stdout.on('data', (data) => {
        onOutput('stdout', data.toString('utf8'));
      });

      runner.stderr.on('data', (data) => {
        onOutput('stderr', data.toString('utf8'));
      });

      runner.on('error', (err) => {
        this.processes.delete(runner);
        onStatus('failed', `Failed to start Node process: ${err.message}`);
      });

      runner.on('close', (runCode) => {
        this.processes.delete(runner);
        if (runCode === 0) {
          onStatus('completed', '✅ Completed');
        } else {
          onStatus('failed', `🔴 Failed (exit code ${runCode})`);
        }
      });
    });
  }

  /**
   * Run Python File
   */
  runPython(fileName, onStatus, onOutput) {
    // Try 'python' first, then 'python3' if it fails with ENOENT
    let pythonCmd = 'python';
    const check = spawn(pythonCmd, ['--version']);

    check.on('error', (err) => {
      if (err.code === 'ENOENT') {
        // Try python3
        pythonCmd = 'python3';
        const check3 = spawn(pythonCmd, ['--version']);
        
        check3.on('error', (err3) => {
          if (err3.code === 'ENOENT') {
            onStatus('failed', 'Python is not installed (tried python and python3).');
          } else {
            onStatus('failed', `Python check failed: ${err3.message}`);
          }
        });

        check3.on('close', (code3) => {
          if (code3 === 0) {
            this.startPythonProcess(pythonCmd, fileName, onStatus, onOutput);
          }
        });
      } else {
        onStatus('failed', `Python check failed: ${err.message}`);
      }
    });

    check.on('close', (code) => {
      if (code === 0) {
        this.startPythonProcess(pythonCmd, fileName, onStatus, onOutput);
      }
    });
  }

  startPythonProcess(pythonCmd, fileName, onStatus, onOutput) {
    if (this.killed) return;

    onStatus('running', '🟢 Running...');

    const runner = spawn(pythonCmd, [fileName], {
      cwd: this.workspaceDir
    });
    this.processes.add(runner);

    runner.stdout.on('data', (data) => {
      onOutput('stdout', data.toString('utf8'));
    });

    runner.stderr.on('data', (data) => {
      onOutput('stderr', data.toString('utf8'));
    });

    runner.on('error', (err) => {
      this.processes.delete(runner);
      onStatus('failed', `Failed to start Python process: ${err.message}`);
    });

    runner.on('close', (runCode) => {
      this.processes.delete(runner);
      if (runCode === 0) {
        onStatus('completed', '✅ Completed');
      } else {
        onStatus('failed', `🔴 Failed (exit code ${runCode})`);
      }
    });
  }

  cleanupBinary(exePath) {
    // Delete binary file asynchronously
    setTimeout(() => {
      fs.unlink(exePath, (err) => {
        // Silently ignore if file doesn't exist or failed to delete
      });
    }, 100);
  }

  /**
   * Kill any running compilation or execution processes
   */
  kill() {
    this.killed = true;
    for (const proc of this.processes) {
      try {
        proc.kill('SIGKILL');
      } catch (e) {}
    }
    this.processes.clear();
  }
}

export default ExecutionSession;
