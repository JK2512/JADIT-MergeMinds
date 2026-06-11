# JADIT Merge Minds 🚀
### AI Engineering Manager Platform & Collaborative Operating System
*Designed for the Building Agents for Real-World Challenges Hackathon*

---

**JADIT Merge Minds** is a next-generation collaborative IDE and team orchestration platform. It is built to solve the most painful bottleneck in modern software engineering: **human-agent-system collaboration sync**. 

In conventional development, merge conflicts, silent lock-outs, and disconnected code reviews stall velocity. JADIT acts as a live, context-aware **Engineering Operating System** where developers collaborate in real-time, backed by an autonomous council of AI Agents that coordinate workspace state, predict conflict risks, scan for security flaws, and auto-repair broken builds.

---

## 💡 The Core Vision & Idea
Modern development is no longer just humans writing code—it's humans and AI agents co-authoring code. JADIT presents a cohesive pane-of-glass workspace where:
1. **Real-time collaboration is the default:** Multi-user editing, cursor positions, and file states are synced live using Yjs and WebSockets.
2. **AI acts as a peer and coordinator:** Instead of a simple chat panel, specialized AI agents act as Engineering Managers, QA reviewers, and DevOps guides.
3. **Conflict is intercepted before it happens:** The interactive Workspace Map shows live editing heatmaps and active conflict risks, prompting developers to request ownership or lock files before rewriting code.

---

## 🧠 The JADIT Multi-Agent Council

JADIT deploys a structured, specialized multi-agent architecture. Users can interact with or delegate tasks to five distinct agent personas:

*   **📋 Manager Agent (`manager`):** Coordinates team context. Understands the current workspace structure, scans recent timeline events, and answers team alignment prompts like *"What happened?"* or *"Catch me up."*
*   **🔍 Reviewer Agent (`reviewer`):** Inspects syntax, design patterns, and code style. It provides line-specific code improvements and structures reviews directly inside the active editor context.
*   **🛡️ Security Agent (`security`):** Proactively checks files for vulnerabilities, hardcoded keys, and insecure APIs, flagging risk indicators.
*   **📋 Planner Agent (`planner`):** Analyzes the state of the workspace and issues to build high-level implementation plans and checklists for the development lifecycle.
*   **🚀 DevOps Agent (`devops`):** Manages project compilation, testing, and deployment. If a build fails (e.g. C++ compiler syntax errors), the DevOps Agent steps in to analyze the error logs, propose corrections, and execute **AI Auto-Fixes** directly on the file system.

---

## ⚡ Robust Fallback & Internal Routing Architecture

A major challenge for production AI agents is **reliability**. Network drops, API credential corruption, or API demand spikes (such as HTTP 503 Service Unavailable or 429 Rate Limits) can brick a live system. 

JADIT solves this with an **internal fallback routing architecture**:

```
                 [ User Prompt / IDE Command ]
                             │
                             ▼
                 ┌───────────────────────┐
                 │  Provider Router      │
                 └───────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼ (Primary Route)                 ▼ (Immediate Fallback)
  ┌──────────────────┐               ┌──────────────────┐
  │   Google Cloud   │               │   Custom Local   │
  │  Agent Builder   │               │  Offline Agents  │
  └─────────┬────────┘               └─────────┬────────┘
            │                                  │
            ▼ (If HTTP 503 / 429 / Error)      │
            └────────────────►─────────────────┘
                             │
                             ▼
                [ Instant Agent Response ]
```

### Key Highlights of the Fallback System:
1.  **Dual Engine Execution:**
    *   **Primary Engine:** Google Cloud Agent Builder (Vertex AI) + GitLab MCP. Uses Google Cloud's agent reasoning framework and Gemini tool-calling to run file mutations, check project memory, and execute GitLab API workflows.
    *   **Fallback Engine:** Custom Local Offline Agents. Instantly takes over if Google Cloud keys are missing, network connectivity is lost, or API limits occur, generating static/rule-based responses so the user experience is uninterrupted.
2.  **Zero-Clutter UI Banners:** Provider routing operates silently under the hood. There are no distracting warning banners or fallback badges.
3.  **Strict Developer Telemetry:** Logging occurs cleanly inside background consoles to let maintainers audit routing performance:
    *   **Server Logs:** Every query outputs the active engine: `[AgentProvider] Gemini`, `[AgentProvider] GitLabMCP`, or `[AgentProvider] LocalFallback` (matching the Gemini agent logs).
    *   **Browser Developer Console:** Extracted chunk metadata prints active provider traces live.
    *   **Developer Diagnostics Panel:** Double-clicking the settings card header (`Workspace Parameters` or gear icon) reveals a hidden tab containing live GitLab MCP connection health and active routing telemetry.

---

## 🖥️ Live UI Capabilities

*   **🗺️ Interactive Workspace Map:** A real-time, auto-laying SVG node graph representing files and their import/dependency relationships. Editing files animates nodes, while locks or active conflicts highlight nodes in red/orange.
*   **⏳ Workspace Activity Replay:** A timeline scrubbing engine. Use the slider or step controls to step backwards and forwards in time through all historical file modifications, creations, and locks.
*   **🔒 Lock & File Ownership:** Files can be locked. If another developer edits a locked file, their edits are instantly reverted, and they are prompted to request file ownership. The lock owner receives a notification with inline **Approve** or **Reject** action buttons.
*   **⌨️ Explorer Keyboard Delete:** Select a file in the workspace tree and press the `Delete` key on your keyboard to delete the file immediately (with browser confirmation), avoiding slow click pathways.

---

## 🛠️ Step-by-Step Installation

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Setup
Configure your `.env` file at the root:
```env
PORT=8080
GEMINI_API_KEY=AIzaSy...
# Optional GitLab Integration details
GITLAB_API_URL=https://gitlab.example.com/api/v4
GITLAB_ACCESS_TOKEN=glpat-...
GITLAB_PROJECT_ID=123456
```

### 3. Run Locally

*   **Persistent Web Server:**
    ```bash
    npm start
    ```
    Visit `http://localhost:8080` in your web browser.

*   **Desktop Electron App Wrapper:**
    In a separate terminal tab:
    ```bash
    npm run desktop
    ```

---

## 🚀 Deployment Guide
JADIT relies on WebSocket connections to synchronize editor states via Yjs. Because WebSockets require persistent connections, **traditional serverless hosts (like Vercel or Netlify static functions) are not supported**. Use stateful hosting platforms:

### Option 1: Render (Easiest)
1.  Connect your repository to [Render](https://render.com/).
2.  Select **Web Service** node type.
3.  Use build command: `npm install` and start command: `npm start`.
4.  Define environment variables (e.g. `GEMINI_API_KEY`) under settings.
5.  Deploy.

### Option 2: Fly.io
1.  Run `fly launch` to automatically configure your Node environment.
2.  Add secrets with `fly secrets set GEMINI_API_KEY=...`
3.  Deploy using `fly deploy`.

---

## 🛡️ License
Licensed under the [MIT License](file:///c:/Users/Dell/OneDrive/Desktop/gitlabs/LICENSE).
