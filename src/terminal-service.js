import { spawn } from 'child_process';
import path from 'path';

export class TerminalSession {
  /**
   * Creates a new persistent terminal session.
   * @param {function} onOutputCallback - Callback function to stream output back to the client
   */
  constructor(onOutputCallback) {
    this.onOutput = onOutputCallback;
    this.workspaceDir = path.join(process.cwd(), 'workspace');

    // Select the proper shell based on OS
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'powershell.exe' : 'bash';
    const args = isWin ? ['-NoLogo', '-NoProfile'] : [];

    console.log(`💻 Spawning persistent shell: ${shell} in ${this.workspaceDir}`);

    this.proc = spawn(shell, args, {
      cwd: this.workspaceDir,
      env: {
        ...process.env,
        // Ensure color and terminal settings are inherited where possible
        FORCE_COLOR: '1',
        TERM: 'xterm-256color'
      }
    });

    // Handle stdout
    this.proc.stdout.on('data', (data) => {
      this.onOutput(data.toString('utf8'));
    });

    // Handle stderr
    this.proc.stderr.on('data', (data) => {
      this.onOutput(data.toString('utf8'));
    });

    // Handle termination
    this.proc.on('close', (code) => {
      console.log(`💻 Terminal process exited with code ${code}`);
      this.onOutput(`\r\n[Process exited with code ${code}]\r\n`);
    });

    this.proc.on('error', (err) => {
      console.error('💻 Terminal process error:', err.message);
      this.onOutput(`\r\n[Failed to start shell: ${err.message}]\r\n`);
    });
  }

  /**
   * Writes input data to the terminal process stdin.
   * @param {string} data - Input string
   */
  write(data) {
    if (this.proc && this.proc.stdin && this.proc.stdin.writable) {
      this.proc.stdin.write(data);
    }
  }

  /**
   * Stub for resize operations.
   */
  resize(cols, rows) {
    // Standard spawned child processes on Windows/Linux do not support PTY resize easily
    // without native dependencies (node-pty), but we keep this method for interface compatibility.
  }

  /**
   * Terminates the terminal process.
   */
  kill() {
    if (this.proc) {
      console.log('💻 Killing terminal process...');
      this.proc.kill('SIGINT');
      setTimeout(() => {
        if (this.proc) {
          this.proc.kill('SIGKILL');
        }
      }, 500);
    }
  }
}

export default TerminalSession;
