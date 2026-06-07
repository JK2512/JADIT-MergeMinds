// ═══════════════════════════════════════════════════════════════
// Editor Module — Monaco Editor & Yjs Binary Sync Client
// ═══════════════════════════════════════════════════════════════

import * as Y from 'https://esm.sh/yjs@13.6.31';

export class CodeEditor {
  constructor(containerId, onContentChanged, onCursorChanged) {
    this.container = document.getElementById(containerId);
    this.onContentChanged = onContentChanged;
    this.onCursorChanged = onCursorChanged;
    this.editor = null;
    this.doc = null;
    this.yText = null;
    this.yTextObserver = null;
    this.isApplyingRemote = false;
    
    // Track remote cursors: connectionId -> decorationId
    this.remoteDecorations = new Map();
  }

  initialize() {
    return new Promise((resolve) => {
      // Ensure Monaco loader is loaded, then initialize
      if (typeof require !== 'undefined') {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
          this.editor = monaco.editor.create(this.container, {
            value: '// Connecting to collaboration session...',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: true },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            lineHeight: 22,
            padding: { top: 12, bottom: 12 },
            roundedSelection: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8
            }
          });

          // Bind local edit listener
          this.editor.onDidChangeModelContent((event) => {
            if (this.isApplyingRemote || !this.doc || !this.yText) return;
            
            this.doc.transact(() => {
              // Apply changes using precise character offsets
              const sortedChanges = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
              for (const change of sortedChanges) {
                this.yText.delete(change.rangeOffset, change.rangeLength);
                this.yText.insert(change.rangeOffset, change.text);
              }
            }, 'local');
          });

          // Bind cursor change listener
          this.editor.onDidChangeCursorPosition((event) => {
            if (this.onCursorChanged) {
              this.onCursorChanged(event.position);
            }
          });

          resolve(this.editor);
        });
      } else {
        console.error('Monaco loader not found on page.');
        resolve(null);
      }
    });
  }

  // Bind to new Yjs document
  bindDocument(fileContent) {
    if (this.yTextObserver && this.yText) {
      this.yText.unobserve(this.yTextObserver);
      this.yTextObserver = null;
    }
    if (this.doc) {
      this.doc.destroy();
    }

    this.doc = new Y.Doc();
    this.yText = this.doc.getText('code-content');
    
    // Bind Yjs update event to send updates to the WebSocket server
    this.doc.on('update', (update, origin) => {
      if (origin !== 'remote' && this.onContentChanged) {
        this.onContentChanged(update);
      }
    });

    this.isApplyingRemote = true;
    if (fileContent) {
      this.yText.insert(0, fileContent);
    }
    this.editor.setValue(this.yText.toString());
    this.isApplyingRemote = false;

    // Observe changes to apply them to Monaco
    const model = this.editor.getModel();
    this.yTextObserver = (event) => {
      if (event.transaction.origin === 'local') return;

      this.isApplyingRemote = true;
      let index = 0;
      const edits = [];

      event.delta.forEach(op => {
        if (op.retain) {
          index += op.retain;
        } else if (op.insert) {
          const text = op.insert;
          const pos = model.getPositionAt(index);
          edits.push({
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            text: text,
            forceMoveMarkers: true
          });
          index += text.length;
        } else if (op.delete) {
          const len = op.delete;
          const startPos = model.getPositionAt(index);
          const endPos = model.getPositionAt(index + len);
          edits.push({
            range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
            text: '',
            forceMoveMarkers: false
          });
        }
      });

      if (edits.length > 0) {
        const selections = this.editor.getSelections();
        model.pushEditOperations(
          selections,
          edits,
          () => null
        );
        this.editor.setSelections(selections);
      }
      this.isApplyingRemote = false;
    };

    this.yText.observe(this.yTextObserver);
    
    this.clearAllRemoteCursors();
  }

  // Update language based on file name/extension
  setLanguageForFile(fileName = 'main.js') {
    if (!this.editor) return;
    const model = this.editor.getModel();
    if (!model) return;

    let language = 'javascript';
    if (fileName.endsWith('.html')) language = 'html';
    else if (fileName.endsWith('.css')) language = 'css';
    else if (fileName.endsWith('.json')) language = 'json';
    else if (fileName.endsWith('.md')) language = 'markdown';
    
    monaco.editor.setModelLanguage(model, language);
  }

  // Apply Yjs update from server
  applyUpdate(binaryUpdate) {
    if (!this.doc || !this.yText) return;
    Y.applyUpdate(this.doc, new Uint8Array(binaryUpdate), 'remote');
  }

  // Render remote cursors
  updateRemoteCursor(connectionId, user, position) {
    if (!this.editor || !position) return;

    // Clear existing decoration for this user
    this.clearRemoteCursor(connectionId);

    const name = user.name || 'Collaborator';
    const color = user.color || '#fc6d26';
    
    // Inject dynamic CSS rules for remote user cursor custom color if needed
    const styleId = `remote-cursor-style-${connectionId}`;
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      .remote-cursor-${connectionId} {
        background-color: ${color};
        width: 2px !important;
      }
      .remote-cursor-label-${connectionId}::after {
        content: '${name}';
        background-color: ${color};
        color: #fff;
        font-family: var(--font-ui);
        font-size: 10px;
        font-weight: 600;
        padding: 1px 5px;
        border-radius: 3px;
        position: absolute;
        top: -16px;
        left: 0;
        white-space: nowrap;
        pointer-events: none;
        z-index: 1000;
        opacity: 0.85;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
    `;

    // Create decoration
    const range = new monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column
    );

    const decorationIds = this.editor.deltaDecorations([], [
      {
        range: range,
        options: {
          className: `remote-cursor-${connectionId}`,
          hoverMessage: { value: name },
          beforeContentClassName: `remote-cursor-label-${connectionId}`
        }
      }
    ]);

    this.remoteDecorations.set(connectionId, decorationIds);
  }

  clearRemoteCursor(connectionId) {
    const decs = this.remoteDecorations.get(connectionId);
    if (decs && this.editor) {
      this.editor.deltaDecorations(decs, []);
      this.remoteDecorations.delete(connectionId);
    }
    const styleEl = document.getElementById(`remote-cursor-style-${connectionId}`);
    if (styleEl) styleEl.remove();
  }

  clearAllRemoteCursors() {
    for (const connectionId of this.remoteDecorations.keys()) {
      this.clearRemoteCursor(connectionId);
    }
  }

  setFontSize(size) {
    if (this.editor) {
      this.editor.updateOptions({ fontSize: size });
    }
  }
}
