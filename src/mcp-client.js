import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { toolRegistry } from './tool-registry.js';

class McpClient {
  constructor() {
    this.process = null;
    this.nextId = 1;
    this.pendingRequests = new Map();
    this.buffer = '';
  }

  async start() {
    // 1. Resolve credentials from environment or mcp-config.json
    let token = process.env.GITLAB_PRIVATE_TOKEN || process.env.GITLAB_TOKEN;
    let url = process.env.GITLAB_URL || 'https://gitlab.com';
    let projectId = process.env.GITLAB_PROJECT_ID;

    try {
      const configPath = path.join(process.cwd(), 'mcp-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const gitlabConfig = config.mcpServers?.gitlab;
        if (gitlabConfig && gitlabConfig.env) {
          if (!token) token = gitlabConfig.env.GITLAB_PRIVATE_TOKEN;
          if (!url) url = gitlabConfig.env.GITLAB_URL;
          if (!projectId) projectId = gitlabConfig.env.GITLAB_PROJECT_ID;
        }
      }
    } catch (err) {
      console.warn('⚠️ [MCP Client] Failed to parse mcp-config.json:', err.message);
    }

    if (!token || !projectId) {
      console.warn('⚠️ [MCP Client] GitLab credentials or project ID missing in env / mcp-config.json. GitLab MCP server will not start.');
      return;
    }

    console.log('🚀 [MCP Client] Spawning GitLab MCP Server...');
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    this.process = spawn(cmd, ['-y', '@gitlab/mcp-server'], {
      env: {
        ...process.env,
        GITLAB_PRIVATE_TOKEN: token,
        GITLAB_URL: url,
        GITLAB_PROJECT_ID: projectId
      }
    });

    this.process.stdout.on('data', (data) => {
      this.handleIncomingData(data.toString());
    });

    this.process.stderr.on('data', (data) => {
      console.warn(`[MCP Server Stderr] ${data.toString().trim()}`);
    });

    this.process.on('close', (code) => {
      console.log(`[MCP Server] Closed with code ${code}`);
    });

    // Handle process errors
    this.process.on('error', (err) => {
      console.error('❌ [MCP Client] Child process error:', err.message);
    });

    // 2. Perform JSON-RPC handshake
    try {
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'gitlab-copilot-client', version: '1.0.0' }
      });

      this.sendNotification('notifications/initialized', {});
      console.log('✅ [MCP Client] GitLab MCP Server handshaked and initialized.');

      // 3. Fetch tool definitions from MCP Server
      const toolsResponse = await this.sendRequest('tools/list', {});
      const tools = toolsResponse.tools || [];
      console.log(`📦 [MCP Client] Found ${tools.length} tools on GitLab MCP server.`);

      // 4. Dynamically register tools in ToolRegistry
      tools.forEach(tool => {
        const geminiDeclaration = this.convertMcpToGemini(tool);
        toolRegistry.register(
          tool.name,
          geminiDeclaration,
          async (args) => {
            console.log(`🔧 [MCP Client] Invoking GitLab MCP tool "${tool.name}" with args:`, args);
            const callResult = await this.sendRequest('tools/call', {
              name: tool.name,
              arguments: args
            });

            if (callResult.isError) {
              throw new Error(callResult.content?.[0]?.text || 'MCP Tool execution failed');
            }

            // Return the structured response contents
            return callResult;
          }
        );
      });

    } catch (err) {
      console.error('❌ [MCP Client] Handshake/Initialization failed:', err.message);
    }
  }

  handleIncomingData(data) {
    this.buffer += data;
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          const message = JSON.parse(line);
          this.handleResponse(message);
        } catch (err) {
          // Skip if line is incomplete or malformed JSON
        }
      }
    }
  }

  handleResponse(msg) {
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);
      if (msg.error) {
        reject(new Error(msg.error.message || 'JSON-RPC Error'));
      } else {
        resolve(msg.result);
      }
    }
  }

  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.process) {
        return reject(new Error('MCP server process is not running.'));
      }
      const id = this.nextId++;
      const request = { jsonrpc: '2.0', id, method, params };
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  sendNotification(method, params) {
    if (!this.process) return;
    const notification = { jsonrpc: '2.0', method, params };
    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  convertMcpToGemini(mcpTool) {
    const mcpSchema = mcpTool.inputSchema || {};
    const geminiProperties = {};
    const required = mcpSchema.required || [];

    if (mcpSchema.properties) {
      for (const [key, prop] of Object.entries(mcpSchema.properties)) {
        geminiProperties[key] = {
          type: String(prop.type || 'STRING').toUpperCase(),
          description: prop.description || ''
        };
      }
    }

    return {
      name: mcpTool.name,
      description: mcpTool.description || '',
      parameters: {
        type: 'OBJECT',
        properties: geminiProperties,
        required
      }
    };
  }
}

export const mcpClient = new McpClient();
export default mcpClient;
