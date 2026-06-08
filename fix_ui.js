const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/index.html');
const indexHtml = fs.readFileSync(filePath, 'utf8');

const newLayout = `
    <!-- ─── Main Content Area ──────────────────────────────────── -->
    <div class="workspace-container" style="display: flex; gap: 12px; padding: 12px; height: calc(100vh - var(--header-height)); box-sizing: border-box; overflow: hidden; background: var(--bg-base, #07090e);">
      
      <!-- LEFT SIDEBAR -->
      <aside class="left-sidebar" style="width: 240px; display: flex; flex-direction: column; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); flex-shrink: 0; overflow-y: auto;">
        
        <div class="nav-links" style="display: flex; flex-direction: column; padding: 12px; gap: 8px; flex: 1;">
          <button class="nav-link" id="nav-mission-btn" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(252, 109, 38, 0.1); color: var(--accent-color); border: 1px solid var(--glass-border); border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left;">
            <span>🎯</span> MISSION CONTROL
          </button>
          
          <button class="nav-link active" id="nav-explorer-btn" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-primary); border: 1px solid transparent; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left;">
            <span>💻</span> CODEBASE
          </button>
          <div id="sidebar-panel-body" style="padding-left: 24px;">
            <div id="file-explorer" class="file-explorer"></div>
          </div>
          
          <button class="nav-link" id="nav-git-btn" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left;">
            <span>🔀</span> COMMITS
          </button>
          <div id="commits-panel" class="commits-panel hidden" style="padding-left: 24px;">
            <div class="activity-timeline-glow" id="commits-list"></div>
          </div>

          <button class="nav-link" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 8px; font-weight: bold; text-align: left; opacity: 0.5;">
            <span>🤝</span> MERGE REQUESTS
          </button>
          <button class="nav-link" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 8px; font-weight: bold; text-align: left; opacity: 0.5;">
            <span>⚡</span> PIPELINES
          </button>
          <button class="nav-link" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 8px; font-weight: bold; text-align: left; opacity: 0.5;">
            <span>📋</span> ISSUES
          </button>
          <button class="nav-link" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 8px; font-weight: bold; text-align: left; opacity: 0.5;">
            <span>🤖</span> AGENTS
          </button>
          <button class="nav-link" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-muted); border: 1px solid transparent; border-radius: 8px; font-weight: bold; text-align: left; opacity: 0.5;">
            <span>📊</span> INSIGHTS
          </button>
          
          <button class="nav-link" id="nav-settings-btn" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left; margin-top: auto;">
            <span>⚙️</span> SETTINGS
          </button>
        </div>

        <div style="padding: 16px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.2);">
          <div style="font-size: 10px; color: var(--text-muted); font-weight: bold; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">PROJECT HEALTH</div>
          <div style="display: flex; justify-content: center; position: relative;">
            <svg class="progress-ring" width="80" height="80">
              <circle stroke="rgba(255,255,255,0.05)" stroke-width="6" fill="transparent" r="36" cx="40" cy="40" />
              <circle id="health-progress-circle" stroke="var(--accent-color)" stroke-width="6" fill="transparent" r="36" cx="40" cy="40" stroke-dasharray="226" stroke-dashoffset="4" style="transform: rotate(-90deg); transform-origin: 50% 50%;" />
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; font-weight: bold; color: var(--text-primary);" id="health-readiness">98%</div>
          </div>
        </div>
      </aside>

      <!-- CENTER COLUMN -->
      <main class="center-col" style="flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0;">
        
        <!-- WORKSPACE MAP -->
        <section class="grid-panel" id="panel-workspace-map" style="height: 220px; flex-shrink: 0; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); display: flex; flex-direction: column; overflow: hidden;">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <div>
              <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">WORKSPACE MAP</h4>
              <span style="font-size: 9px; color: var(--text-muted);">Real-time view of your codebase</span>
            </div>
            <div style="font-size: 10px; color: var(--text-primary); font-weight: bold; display: flex; gap: 12px;">
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#00f56d;"></span> Active</span>
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#f15bb5;"></span> Changed</span>
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#f85149;"></span> At Risk</span>
              <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#00bbf9;"></span> Stable</span>
            </div>
          </div>
          <div class="panel-body map-body" style="flex: 1; position: relative;">
            <div class="workspace-map-graph" id="workspace-map-graph">
              <svg class="map-connections animate-glow" id="map-connections-svg"></svg>
            </div>
          </div>
        </section>

        <!-- MONACO EDITOR -->
        <section class="grid-panel" id="panel-editor" style="flex: 1; display: flex; flex-direction: column; min-height: 0; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--glass-border);">
            <div class="tabs-list" id="editor-tabs-list" style="display: flex; overflow-x: auto; flex: 1; padding: 4px 8px;"></div>
            <div style="display: flex; gap: 8px; padding: 6px 12px;">
              <button id="ide-run-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-primary); font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><span style="color:var(--success)">▶</span> Run</button>
              <button id="ide-build-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-primary); font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><span style="color:#54a0ff">✓</span> Build</button>
              <button id="ide-review-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-primary); font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><span style="color:#feca57">🔍</span> Review</button>
              <button id="ide-deploy-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); color: var(--text-primary); font-size: 11px; font-weight: bold; padding: 6px 12px; border-radius: 4px; cursor: pointer;"><span style="color:#ff9f43">🚀</span> Deploy</button>
            </div>
          </div>
          <div class="panel-body editor-body" style="flex: 1; position: relative;">
            <div id="editor-container" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
          </div>
        </section>

        <!-- TERMINAL -->
        <section class="grid-panel" id="panel-terminal" style="height: 200px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); overflow: hidden;">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">TERMINAL</h4>
            <button id="terminal-clear-btn" style="background: none; border: none; cursor: pointer; font-size: 14px; color: var(--text-secondary);">🧹</button>
          </div>
          <div class="panel-body terminal-body" style="flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.3);">
            <div class="terminal-container" style="flex: 1; display: flex; flex-direction: column; padding: 12px;">
              <div class="terminal-output" id="terminal-output" style="flex: 1; overflow-y: auto; font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); white-space: pre-wrap;"></div>
              <div class="terminal-input-line" style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                <span style="color: var(--success); font-weight: bold;">&gt;</span>
                <input type="text" id="terminal-input" placeholder="Type a command..." autocomplete="off" style="flex: 1; background: transparent; border: none; color: var(--text-primary); font-family: var(--font-mono); font-size: 13px; outline: none;">
              </div>
            </div>
          </div>
        </section>

      </main>

      <!-- RIGHT COLUMN -->
      <aside class="right-col" style="width: 320px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; overflow-y: auto; padding-right: 4px;">
        
        <!-- AI AGENTS -->
        <section class="grid-panel" id="panel-ai-agents" style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); display: flex; flex-direction: column;">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">AI AGENTS</h4>
            <span style="font-size: 9px; color: var(--accent-color); font-weight: bold; background: rgba(252, 109, 38, 0.1); padding: 4px 8px; border-radius: 4px;">5 Agents Active</span>
          </div>
          <div class="panel-body" style="padding: 12px;">
            <div id="agent-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Javascript populates this -->
            </div>
          </div>
        </section>

        <!-- MISSION BRIEF -->
        <section class="grid-panel" id="panel-mission-brief" style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius); display: flex; flex-direction: column;">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">MISSION BRIEF</h4>
            <span style="font-size: 10px; color: var(--text-secondary); font-weight: bold;">Updated 2m ago</span>
          </div>
          <div class="panel-body" style="padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div>
                <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Status</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--success);" id="health-pipeline">Passing</div>
              </div>
              <div>
                <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Issues</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--text-primary);">2 Open MRs</div>
              </div>
              <div>
                <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: bold;">Completion</div>
                <div style="font-size: 14px; font-weight: bold; color: var(--text-primary);" id="mission-completion-est">1h 15m</div>
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
              <span id="mission-progress-val">76%</span> Complete
            </div>
            <div style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: 76%; background: var(--accent-gradient); border-radius: 3px;"></div>
            </div>
            <div class="hidden">
              <span id="health-rating"></span>
              <span id="health-mrs"></span>
              <span id="health-issues"></span>
              <span id="health-tests"></span>
              <span id="health-security"></span>
              <div id="deploy-status-banner"></div>
              <div id="mission-blockers"></div>
            </div>
          </div>
        </section>

        <!-- ASK AI -->
        <section class="grid-panel" id="panel-ask-ai" style="flex: 1; min-height: 250px; display: flex; flex-direction: column; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius);">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">ASK AI</h4>
            <button id="btn-team-consult" style="font-size: 10px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: var(--text-primary); cursor: pointer; font-weight: bold;">👥 Team Consult</button>
          </div>
          <div class="panel-body chat-panel-body" style="flex: 1; display: flex; flex-direction: column;">
            <div class="agent-banner" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--glass-border);">
              <div style="font-size: 24px;">👔</div>
              <div>
                <div style="font-size: 13px; font-weight: bold; color: var(--text-primary);">Tech Lead Manager</div>
                <div style="font-size: 9px; color: var(--text-muted); letter-spacing: 1px; font-weight: bold;">ACTIVE INTEL AGENT</div>
              </div>
            </div>
            <div class="chat-messages" id="chat-messages" style="flex: 1; overflow-y: auto; padding: 12px;"></div>
            <div style="padding: 12px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.2);">
              <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 8px; padding: 8px 12px;">
                <input type="text" id="chat-input" placeholder="Ask AI..." style="flex: 1; background: transparent; border: none; color: var(--text-primary); font-family: var(--font-ui); font-size: 13px; outline: none;">
                <button id="chat-send" style="background: var(--accent-gradient); border: none; color: white; border-radius: 4px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold;">➔</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ACTIVITY FEED -->
        <section class="grid-panel" id="panel-activity-feed" style="height: 200px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--panel-radius);">
          <div class="panel-header" style="padding: 10px 16px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
            <h4 style="font-size: 11px; font-weight: 700; color: var(--text-primary); margin: 0;">ACTIVITY FEED</h4>
            <button id="btn-workspace-replay" style="font-size: 10px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: var(--text-primary); cursor: pointer; font-weight: bold;">⏳ Replay</button>
          </div>
          <div class="panel-body" style="flex: 1; padding: 12px; overflow-y: auto;">
            <div class="activity-timeline-glow" id="activity-list"></div>
          </div>
        </section>

        <div class="hidden">
           <button id="btn-catch-me-up"></button>
           <button id="review-btn"></button>
           <button id="run-btn"></button>
           <div id="extra-agents"></div>
           <button id="btn-expand-agents"></button>
        </div>

      </aside>

    </div>
`;

const startIndex = indexHtml.indexOf('<!-- ─── Main Content Area ──────────────────────────────────── -->');
const endIndex = indexHtml.indexOf('<!-- ─── Footer Status Bar ──────────────────────────────────── -->');

if (startIndex !== -1 && endIndex !== -1) {
  const finalHtml = indexHtml.substring(0, startIndex) + newLayout + indexHtml.substring(endIndex);
  fs.writeFileSync(filePath, finalHtml, 'utf8');
  console.log('index.html updated successfully.');
} else {
  console.log('Markers not found!');
}
