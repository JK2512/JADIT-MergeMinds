// ═══════════════════════════════════════════════════════════════
// Tool Registry Module — Dynamically registers and routes AI tools
// ═══════════════════════════════════════════════════════════════

import { gitlabService } from './gitlab-service.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Registers a new tool with a Gemini function declaration and its execution handler.
   * @param {string} name - Name of the function/tool
   * @param {object} declaration - Gemini tool function declaration object
   * @param {function} handler - Async handler function that executes the tool
   */
  register(name, declaration, handler) {
    this.tools.set(name, { declaration, handler });
    console.log(`🔧 [ToolRegistry] Registered tool: ${name}`);
  }

  /**
   * Returns all registered tool declarations formatted for the Gemini API.
   * @returns {array} Array of Gemini function declarations
   */
  getDeclarations() {
    const declarations = [];
    for (const tool of this.tools.values()) {
      declarations.push(tool.declaration);
    }
    return declarations;
  }

  /**
   * Checks if a tool is registered.
   * @param {string} name - Name of the tool
   * @returns {boolean} True if tool exists
   */
  hasTool(name) {
    return this.tools.has(name);
  }

  /**
   * Executes a tool's handler by name with provided arguments.
   * @param {string} name - Name of the tool to execute
   * @param {object} args - Arguments passed by the AI model
   * @returns {Promise<any>} Execution result
   */
  async executeTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in the ToolRegistry.`);
    }

    try {
      console.log(`🚀 [ToolRegistry] Executing tool "${name}" with args:`, args);
      const result = await tool.handler(args);
      console.log(`✅ [ToolRegistry] Tool "${name}" execution completed.`);
      return result;
    } catch (err) {
      console.error(`❌ [ToolRegistry] Tool "${name}" execution failed:`, err.message);
      throw err;
    }
  }
}

// Global instance of Tool Registry
export const toolRegistry = new ToolRegistry();

// ── Tool Declarations ────────────────────────────────────────

const CREATE_BRANCH_DECLARATION = {
  name: "create_branch",
  description: "Create a new branch in the GitLab repository off of a source branch.",
  parameters: {
    type: "OBJECT",
    properties: {
      branchName: {
        type: "STRING",
        description: "The name of the branch to create, e.g., 'feature-auth' or 'bugfix-issue-12'."
      },
      ref: {
        type: "STRING",
        description: "The source branch or commit SHA to branch off from. Defaults to 'main'."
      }
    },
    required: ["branchName"]
  }
};

const GET_PIPELINE_STATUS_DECLARATION = {
  name: "get_pipeline_status",
  description: "Get the current GitLab CI/CD pipeline status for the project.",
  parameters: {
    type: "OBJECT",
    properties: {
      ref: {
        type: "STRING",
        description: "Optional branch name or commit SHA to filter the pipeline status."
      }
    },
    required: []
  }
};

const CREATE_ISSUE_DECLARATION = {
  name: "create_gitlab_issue",
  description: "Create a new issue on GitLab for tracking tasks or bugs.",
  parameters: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING", description: "The title of the issue" },
      description: { type: "STRING", description: "Detailed description of the issue" }
    },
    required: ["title"]
  }
};

const LIST_MR_DECLARATION = {
  name: "list_open_merge_requests",
  description: "List open merge requests in the GitLab repository.",
  parameters: {
    type: "OBJECT",
    properties: {
      state: {
        type: "STRING",
        description: "Filter by merge request state. Defaults to 'opened'. Valid values: 'opened', 'closed', 'merged', 'all'."
      }
    },
    required: []
  }
};

const CREATE_MR_DECLARATION = {
  name: "create_merge_request",
  description: "Create a new Merge Request on GitLab to merge changes from a source branch.",
  parameters: {
    type: "OBJECT",
    properties: {
      sourceBranch: {
        type: "STRING",
        description: "The branch containing the changes to merge."
      },
      targetBranch: {
        type: "STRING",
        description: "The target branch to merge into. Defaults to 'main'."
      },
      title: {
        type: "STRING",
        description: "The title of the Merge Request."
      },
      description: {
        type: "STRING",
        description: "Detailed description of the Merge Request."
      }
    },
    required: ["sourceBranch", "title"]
  }
};

// Register Tools
toolRegistry.register(
  "create_branch",
  CREATE_BRANCH_DECLARATION,
  async (args) => {
    const { branchName, ref } = args;
    return await gitlabService.createBranch(branchName, ref || 'main');
  }
);

toolRegistry.register(
  "get_pipeline_status",
  GET_PIPELINE_STATUS_DECLARATION,
  async (args) => {
    return await gitlabService.getLatestPipeline(args.ref || null);
  }
);

toolRegistry.register(
  "create_gitlab_issue",
  CREATE_ISSUE_DECLARATION,
  async (args) => {
    const { title, description } = args;
    return await gitlabService.createIssue(title, description || '');
  }
);

toolRegistry.register(
  "list_open_merge_requests",
  LIST_MR_DECLARATION,
  async (args) => {
    return await gitlabService.listMergeRequests(args.state || 'opened');
  }
);

toolRegistry.register(
  "create_merge_request",
  CREATE_MR_DECLARATION,
  async (args) => {
    const { sourceBranch, targetBranch, title, description } = args;
    return await gitlabService.createMergeRequest(
      sourceBranch,
      targetBranch || 'main',
      title,
      description || ''
    );
  }
);

// ── IDE File Tool Declarations ────────────────────────────────

const READ_FILE_DECLARATION = {
  name: "read_file",
  description: "Read the full contents of a workspace file. Use this to inspect code before suggesting edits or reviewing.",
  parameters: {
    type: "OBJECT",
    properties: {
      fileName: {
        type: "STRING",
        description: "The name of the file to read, e.g. 'main.js' or 'utils.js'."
      }
    },
    required: ["fileName"]
  }
};

const WRITE_FILE_DECLARATION = {
  name: "write_file",
  description: "Create or overwrite a workspace file with new content. Use this to fix bugs, add features, or create new files.",
  parameters: {
    type: "OBJECT",
    properties: {
      fileName: {
        type: "STRING",
        description: "The name of the file to write, e.g. 'auth.js'. If the file does not exist, it will be created."
      },
      content: {
        type: "STRING",
        description: "The full content to write to the file."
      }
    },
    required: ["fileName", "content"]
  }
};

const LIST_FILES_DECLARATION = {
  name: "list_files",
  description: "List all files currently in the workspace with their metadata (size, line count, last modified, last modified by).",
  parameters: {
    type: "OBJECT",
    properties: {},
    required: []
  }
};

/**
 * Registers IDE file tools that require a ProjectMemory instance.
 * Must be called from server.js after ProjectMemory is created.
 * @param {ProjectMemory} projectMemory - The active project memory instance
 */
export function registerFileTools(projectMemory, collabServer) {
  toolRegistry.register(
    "read_file",
    READ_FILE_DECLARATION,
    async (args) => {
      const { fileName } = args;
      const content = projectMemory.getFileContent(fileName);
      if (content === null) {
        return { status: 'error', message: `File "${fileName}" does not exist in the workspace.` };
      }
      const meta = projectMemory.getFile(fileName);
      return {
        status: 'success',
        fileName,
        content,
        lineCount: meta.lineCount,
        size: meta.size,
        lastModified: meta.lastModified,
        lastModifiedBy: meta.lastModifiedBy
      };
    }
  );

  toolRegistry.register(
    "write_file",
    WRITE_FILE_DECLARATION,
    async (args) => {
      const { fileName, content } = args;
      const existed = projectMemory.files.has(fileName);
      const changedBy = 'AI Engineering Manager';
      if (existed) {
        projectMemory.updateFile(fileName, content, changedBy);
      } else {
        projectMemory.createFile(fileName, content, changedBy);
      }

      // Explicitly log and broadcast activity event
      const event = projectMemory.logActivity(changedBy, 'updated', fileName, {
        lineCount: content.split('\n').length,
        size: content.length
      });

      if (collabServer) {
        // Broadcast the activity event to all peers in all rooms
        for (const roomName of collabServer.rooms.keys()) {
          collabServer.broadcastToRoom(roomName, { type: 'activity', event }, null);
        }
        // Force Yjs document update to sync Monaco editor
        collabServer.broadcastFileReload(fileName, content);
      }

      return {
        status: 'success',
        action: existed ? 'updated' : 'created',
        fileName,
        lineCount: content.split('\n').length,
        size: content.length
      };
    }
  );

  toolRegistry.register(
    "list_files",
    LIST_FILES_DECLARATION,
    async () => {
      const files = projectMemory.getAllFiles();
      return {
        status: 'success',
        fileCount: Object.keys(files).length,
        files
      };
    }
  );

  // ── Controlled Execution Tools ──────────────────────────────

  const RUN_CURRENT_FILE_DECLARATION = {
    name: "run_current_file",
    description: "Execute a specific workspace file and return its stdout/stderr output. Automatically detects the file type and uses the correct runtime (.js→node, .py→python, .cpp→g++ compile and run).",
    parameters: {
      type: "OBJECT",
      properties: {
        fileName: {
          type: "STRING",
          description: "The name of the file to execute, e.g. 'main.js' or 'script.py'."
        }
      },
      required: ["fileName"]
    }
  };

  const RUN_PROJECT_DECLARATION = {
    name: "run_project",
    description: "Run a project-level command in the workspace directory, such as 'npm install', 'npm test', 'npm start', or 'node server.js'. Use for multi-file project operations.",
    parameters: {
      type: "OBJECT",
      properties: {
        command: {
          type: "STRING",
          description: "The shell command to run in the workspace directory, e.g. 'npm install' or 'npm test'."
        }
      },
      required: ["command"]
    }
  };

  toolRegistry.register(
    "run_current_file",
    RUN_CURRENT_FILE_DECLARATION,
    async (args) => {
      const { fileName } = args;

      // Check if file exists
      if (!projectMemory.files.has(fileName)) {
        return { status: 'error', message: `File "${fileName}" does not exist in the workspace.` };
      }

      const ext = fileName.split('.').pop().toLowerCase();

      if (ext === 'cpp') {
        // Compile step
        const compileResult = await executeInWorkspace(`g++ ${fileName} -o run_output.exe`);
        if (compileResult.status !== 'success' || compileResult.exitCode !== 0) {
          const errors = compileResult.stderr || compileResult.stdout || 'Unknown compiler error';
          return {
            status: 'error',
            message: 'Compilation failed',
            stdout: '',
            stderr: `[Compilation Error]\n${errors}`,
            exitCode: compileResult.exitCode
          };
        }

        // Run step
        const isWin = process.platform === 'win32';
        const runCmd = isWin ? '.\\run_output.exe' : './run_output.exe';
        const runResult = await executeInWorkspace(runCmd);
        
        // Clean up binary
        try {
          const fs = await import('fs');
          const path = await import('path');
          const exePath = path.join(process.cwd(), 'workspace', isWin ? 'run_output.exe' : 'run_output.exe');
          if (fs.existsSync(exePath)) {
            fs.unlinkSync(exePath);
          }
        } catch (e) {}

        return runResult;
      }

      let command;
      switch (ext) {
        case 'js':
          command = `node ${fileName}`;
          break;
        case 'py':
          command = `python ${fileName}`;
          break;
        default:
          command = `node ${fileName}`;
          break;
      }

      return await executeInWorkspace(command);
    }
  );

  toolRegistry.register(
    "run_project",
    RUN_PROJECT_DECLARATION,
    async (args) => {
      const { command } = args;

      // Safety: only allow certain command prefixes
      const allowedPrefixes = ['npm', 'node', 'python', 'g++', 'gcc', 'git', 'dir', 'ls', 'cat', 'type', 'echo'];
      const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
      if (!allowedPrefixes.includes(firstWord)) {
        return {
          status: 'error',
          message: `Command "${firstWord}" is not allowed. Permitted: ${allowedPrefixes.join(', ')}.`
        };
      }

      return await executeInWorkspace(command);
    }
  );

  console.log('📁 [ToolRegistry] IDE file tools registered (read_file, write_file, list_files, run_current_file, run_project)');
}

/**
 * Executes a shell command in the workspace directory and returns the output.
 * Has a 30-second timeout and 10KB output cap for safety.
 * @param {string} command - Shell command to run
 * @returns {object} Result with status, stdout, stderr, and exitCode
 */
async function executeInWorkspace(command) {
  const { execSync } = await import('child_process');
  const workspaceDir = path.join(process.cwd(), 'workspace');

  console.log(`🏃 [ToolRegistry] Executing in workspace: ${command}`);

  try {
    const output = execSync(command, {
      cwd: workspaceDir,
      timeout: 30000,
      maxBuffer: 10 * 1024,
      encoding: 'utf8',
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    return {
      status: 'success',
      command,
      stdout: output.slice(0, 5000),
      stderr: '',
      exitCode: 0
    };
  } catch (err) {
    return {
      status: err.killed ? 'timeout' : 'error',
      command,
      stdout: (err.stdout || '').slice(0, 5000),
      stderr: (err.stderr || '').slice(0, 5000),
      exitCode: err.status || 1,
      message: err.killed ? 'Command timed out after 30 seconds.' : err.message
    };
  }
}

export default toolRegistry;
