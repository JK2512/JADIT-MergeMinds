# 🚀 JADIT Merge Minds

<div align="center">

# AI-Powered Collaborative Engineering IDE

### Built for the Building Agents for Real-World Challenges Hackathon

Transforming software development from isolated coding into an intelligent human-AI collaborative engineering experience.

🌐 **Live Demo:** https://jadit-mergeminds.onrender.com/

</div>

---

# 📖 Overview

Software development is rapidly evolving from a human-only activity into a collaborative ecosystem involving developers, AI agents, cloud infrastructure, DevOps pipelines, and automation systems.

While modern AI coding assistants can generate code, they still fail to solve one of the biggest challenges in engineering teams:

## Team Coordination & Workspace Synchronization

Developers continue to struggle with:

- Merge conflicts discovered too late
- Lack of visibility into teammate activity
- Ownership collisions on shared codebases
- Fragmented tooling spread across multiple platforms
- Context switching between reviews, deployments, planning, and coding
- AI assistants with limited project-wide awareness

**JADIT Merge Minds** addresses these problems by transforming a traditional IDE into a **Collaborative Engineering Operating System** where developers and AI agents work together in a shared intelligent workspace.

Rather than acting as a simple chatbot, JADIT introduces specialized engineering agents capable of:

- Reviewing code
- Planning features
- Monitoring security risks
- Managing deployments
- Coordinating teams
- Tracking workspace activity

All inside a unified development environment.

---

# 🎯 Problem Statement

Modern development teams face several recurring challenges:

| Problem | Impact |
|----------|---------|
| Merge conflicts discovered late | Lost productivity |
| Multiple developers editing the same file | Accidental overwrites |
| Lack of workspace awareness | Team confusion |
| Fragmented tooling | Constant context switching |
| Limited AI understanding | Weak project-wide assistance |
| Missing ownership management | Collaboration friction |

Current IDEs and coding assistants focus primarily on code generation while ignoring collaborative engineering workflows.

---

# 💡 Our Solution

JADIT Merge Minds introduces an intelligent engineering workspace that combines:

✅ Real-Time Collaboration

✅ Multi-Agent AI Assistance

✅ File Ownership Management

✅ Conflict Prediction

✅ Workspace Activity Replay

✅ GitLab Integration

✅ Deployment Support

✅ Engineering Intelligence

into a single platform.

---

# ✨ Key Features

---

## 🔄 Real-Time Collaborative Editing

Powered by:

- Yjs
- WebSockets
- Shared Workspace State

Developers can collaborate on files simultaneously while maintaining synchronization across the entire workspace.

### Benefits

- Live updates
- Real-time synchronization
- Shared editing experience
- Reduced communication overhead

---

## 🔒 Lock & File Ownership System

Traditional IDEs allow developers to unknowingly overwrite each other's work.

JADIT introduces deterministic file ownership management.

### Workflow

Developer A locks a file

⬇

Developer B attempts edit

⬇

Ownership request generated

⬇

Owner approves or rejects request

⬇

Workspace updates automatically

### Advantages

- Prevents accidental overwrites
- Clear ownership visibility
- Controlled transfer workflows
- Reduced merge conflicts

---

## ⚠️ Conflict Intelligence Engine

Rather than waiting for Git merge conflicts to occur, JADIT predicts collaboration risks before they become problematic.

### Risk Levels

🟢 Healthy

Single-user editing environment.

🟡 Conflict Risk

Multiple developers interacting with related code sections.

🔴 Active Conflict

Simultaneous modifications detected.

### Benefits

- Early conflict detection
- Better team awareness
- Reduced integration pain

---

## 🗺️ Interactive Workspace Map

A real-time SVG-powered visualization of project structure and developer activity.

### Features

- Dependency graph visualization
- Active file indicators
- Lock-state tracking
- Collaboration hotspots
- Dynamic updates

### Benefits

Developers instantly understand:

- What files are active
- Who is working where
- Structural dependencies
- Collaboration risk zones

---

## ⏳ Workspace Activity Replay

Inspired by time-travel debugging.

Every workspace event is recorded:

- File Creation
- File Deletion
- File Modification
- Ownership Transfers
- Lock Events
- Collaboration Actions

Developers can replay workspace history using timeline controls.

### Benefits

- Better debugging
- Team visibility
- Historical project understanding

---

## ⌨️ Explorer Keyboard Delete

Quick workspace management through keyboard shortcuts.

Select any file and press:

DELETE

to remove it instantly with confirmation.

---

# 🧠 Multi-Agent Engineering Council

Unlike traditional AI coding assistants, JADIT provides a specialized council of engineering agents.

Each agent focuses on a dedicated engineering responsibility.

---

## 📋 Manager Agent

### Role

Engineering Manager

### Responsibilities

- Team coordination
- Workspace summaries
- Activity monitoring
- Daily progress reports

### Example Prompts

"What changed today?"

"Summarize workspace activity."

"Which files were modified recently?"

---

## 🔍 Reviewer Agent

### Role

Senior Software Engineer

### Responsibilities

- Code reviews
- Refactoring recommendations
- Design pattern suggestions
- Maintainability analysis

### Example Prompts

"Review this file."

"Find code smells."

"Suggest improvements."

---

## 🛡️ Security Agent

### Role

Application Security Engineer

### Responsibilities

- Secret scanning
- Vulnerability detection
- Credential exposure checks
- Security recommendations

### Example Prompts

"Scan for vulnerabilities."

"Check exposed credentials."

---

## 📅 Planner Agent

### Role

Technical Product Planner

### Responsibilities

- Sprint planning
- Task breakdown
- Feature roadmaps
- Milestone generation

### Example Prompts

"Create an OAuth roadmap."

"Break this feature into tasks."

---

## 🚀 DevOps Agent

### Role

Deployment Specialist

### Responsibilities

- Build diagnostics
- Deployment monitoring
- Environment validation
- Failure analysis

### Example Prompts

"Why did deployment fail?"

"Analyze build logs."

---

# ⚡ AI Provider Fallback Architecture

Production systems require reliability.

JADIT ensures uninterrupted AI assistance through an intelligent fallback routing layer.

```text
                     User Request
                           │
                           ▼
                  Provider Router
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼

 Google Agent Builder              Local Offline Agents
      (Primary)                        (Fallback)

         ▼                                   ▼

                 Instant Agent Response
```

### Primary Engine

- Gemini
- Google Cloud Agent Builder
- Vertex AI
- GitLab MCP

### Fallback Engine

Custom Offline Agents

Automatically activated when:

- API limits occur
- Network issues happen
- Service disruptions occur
- Credentials are unavailable

### Benefits

- High availability
- Better reliability
- Seamless experience
- Zero workflow interruption

---

# 🏗️ High-Level Architecture

```text
                      Developers
                           │
                           ▼
             ┌──────────────────────────┐
             │      JADIT Frontend      │
             │ Collaborative IDE Layer  │
             └─────────────┬────────────┘
                           │
                           ▼
             ┌──────────────────────────┐
             │ Collaboration Engine     │
             │ Yjs + WebSockets         │
             └─────────────┬────────────┘
                           │

     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼

 Workspace Core     Multi-Agent AI      GitLab Integration

     ▼                     ▼                     ▼

 File Locks        Gemini Agents        GitLab APIs
 Replay Engine     Context Memory       Issue Tracking
 Activity Feed     Routing Layer        Merge Requests
```

---

# 🛠️ Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript
- Monaco Editor
- SVG Graph Engine

## Backend

- Node.js
- Express.js

## Real-Time Collaboration

- Yjs
- WebSockets

## AI Layer

- Gemini
- Google Agent Framework
- Agent Builder
- Local Fallback Agents

## DevOps & Integrations

- GitLab APIs
- GitLab MCP
- GitLab Projects

## Deployment

- Render
- Fly.io
- Electron Desktop Wrapper

---

# 🚀 Installation

## Prerequisites

```bash
Node.js v18+
npm
```

## Clone Repository

```bash
git clone https://github.com/JK2512/JADIT-MergeMinds.git

cd JADIT-MergeMinds
```

## Install Dependencies

```bash
npm install
```

---

# ⚙️ Environment Configuration

Create a `.env` file:

```env
PORT=8080

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

GITLAB_URL=https://gitlab.com

GITLAB_API_URL=https://gitlab.com/api/v4

GITLAB_PRIVATE_TOKEN=YOUR_TOKEN

GITLAB_ACCESS_TOKEN=YOUR_TOKEN

GITLAB_PROJECT_ID=YOUR_PROJECT_ID
```

---

# ▶️ Running Locally

Start the application:

```bash
npm start
```

Visit:

```text
http://localhost:8080
```

---

# 🖥️ Electron Desktop Version

Run:

```bash
npm run desktop
```

---

# 📸 Screenshots

## Dashboard

<img width="959" height="476" alt="image" src="https://github.com/user-attachments/assets/55f38650-ff02-4048-9896-1ed88c0e94e3" />

---

## Workspace Map
<img width="959" height="436" alt="image" src="https://github.com/user-attachments/assets/42d631fb-def1-4e1e-9489-c192f64201ac" />


<img width="266" height="248" alt="image" src="https://github.com/user-attachments/assets/84da59ae-e29d-492b-9fd7-eec73094e62b" />


---

## Multi-Agent Council

<img width="959" height="437" alt="image" src="https://github.com/user-attachments/assets/79716b0d-5fde-4eef-9767-53bfc5efada2" />


---

## File Ownership Workflow

<img width="959" height="83" alt="image" src="https://github.com/user-attachments/assets/0250789b-34da-473b-aa24-a9a3a7bd98ce" />
<img width="724" height="434" alt="image" src="https://github.com/user-attachments/assets/7bb0e875-1cfa-40ab-8b9b-e5e2702d0ac9" />

- Lock if you are the file owner.
- Request ownership transfer.
- Prevent overwrite conflicts.

---

## Activity Replay

<img width="511" height="398" alt="image" src="https://github.com/user-attachments/assets/62ae296a-042f-4b52-8ccf-f80ae2253ff2" />


---

# 🏆 Innovation Highlights

### 🚀 Collaborative Engineering Operating System

Not just another IDE.

### 🧠 Specialized Multi-Agent Council

Dedicated AI expertise for every engineering task.

### 🔒 Ownership Management

Prevent accidental code collisions.

### ⚠️ Conflict Intelligence Engine

Predict problems before merges occur.

### ⏳ Activity Replay System

Time-travel through workspace history.

### 🔄 Fallback AI Routing

Reliable assistance even during provider outages.

### 🔗 GitLab Native Integration

Designed for real engineering workflows.

---

# 🔮 Future Roadmap

## Phase 1

- GitHub Integration
- Advanced Conflict Resolution
- Team Analytics Dashboard

## Phase 2

- Voice-Controlled Agents
- Autonomous Pull Request Reviews
- Agent-to-Agent Collaboration

## Phase 3

- Multi-Repository Workspaces
- AI Sprint Planning
- Autonomous Release Management

---

# 👩‍💻 Team

Built for the **Building Agents for Real-World Challenges Hackathon**

### Team JADIT

- Jiya Kathuria
- Arnav Majithia
- Contributors & Collaborators

---

# 📜 License

MIT License

Copyright (c) 2026 JADIT Merge Minds

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files to deal in the Software without restriction.

See the LICENSE file for more information.

---

<div align="center">

# ⭐ JADIT Merge Minds

### Building the Future of Human-AI Software Engineering

Where Developers and AI Agents Build Together.

⭐ Star this repository if you found it useful!

</div>
