// 
// Editor Module  Monaco Editor & Yjs Binary Sync Client
// 

export class CodeEditor {
  constructor(containerId, onContentChanged, onCursorChanged) {
    this.container = document.getElementById(containerId);
    this.onContentChanged = onContentChanged;
    this.onCursorChanged = onCursorChanged;
    this.editor = null;
    this.textarea = null;
    this.Y = null;
    this.doc = null;
    this.yText = null;
    this.yTextObserver = null;
    this.pendingBindContent = null;
    this.isApplyingRemote = false;
    
    // Track remote cursors: connectionId -> decorationId
    this.remoteDecorations = new Map();
    this.remoteCursorSeenAt = new Map();
  }

  initialize() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (editor) => {
        if (settled) return;
        settled = true;
        resolve(editor);
      };
      const useFallback = () => {
        this.initializeFallbackEditor();
        finish(this.editor);
      };

      const yjsPromise = import('https://esm.sh/yjs@13.6.31')
        .then((mod) => {
          this.Y = mod;
          console.log('[YJS_INIT]');
          if (this.pendingBindContent !== null && this.editor && !this.textarea) {
            const content = this.pendingBindContent;
            this.pendingBindContent = null;
            console.log('[MODEL_BOUND] pending_yjs_ready');
            this.bindDocument(content);
          }
        })
        .catch((err) => {
          console.warn('Yjs CDN unavailable, using local editor fallback sync:', err);
        });

      const monacoTimeout = setTimeout(() => {
        console.warn('Monaco loader timed out, using fallback editor.');
        useFallback();
      }, 3500);

      // Ensure Monaco loader is loaded, then initialize.
      if (typeof require !== 'undefined') {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
        require(['vs/editor/editor.main'], () => {
          if (settled) return;
          clearTimeout(monacoTimeout);
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
          console.log('[MODEL_CREATED]');

          // Bind local edit listener
          this.editor.onDidChangeModelContent((event) => {
            if (this.isApplyingRemote) return;
            if (!this.doc || !this.yText) {
              console.warn('[LOCAL_EDIT_NO_DOC]', { hasDoc: !!this.doc, hasYText: !!this.yText });
              if (this.onContentChanged && this.editor && typeof this.editor.getValue === 'function') {
                this.onContentChanged(this.editor.getValue());
              }
              return;
            }
            
            console.log('[LOCAL_EDIT]', event);
            this.doc.transact(() => {
              // Apply changes using precise character offsets
              const sortedChanges = [...event.changes].sort((a, b) => b.rangeOffset - a.rangeOffset);
              for (const change of sortedChanges) {
                this.yText.delete(change.rangeOffset, change.rangeLength);
                this.yText.insert(change.rangeOffset, change.text);
              }
            }, 'local');
            console.log('[YTEXT_UPDATED]', { origin: 'local', length: this.yText.length });
          });

          // Bind cursor change listener
          this.editor.onDidChangeCursorPosition((event) => {
            if (this.onCursorChanged) {
              this.onCursorChanged(event.position);
            }
          });

          // Make sure Yjs is loaded (or catch block finished) before finishing
          yjsPromise.finally(() => {
            finish(this.editor);
          });
        }, (err) => {
          clearTimeout(monacoTimeout);
          console.warn('Monaco CDN unavailable, using fallback editor:', err);
          useFallback();
        });
      } else {
        clearTimeout(monacoTimeout);
        console.warn('Monaco loader not found on page, using fallback editor.');
        useFallback();
      }
    });
  }

  initializeFallbackEditor() {
    this.container.innerHTML = '';
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'fallback-code-editor';
    this.textarea.spellcheck = false;
    this.textarea.value = '// Local editor mode active.\n// External editor assets were unavailable, but your files are still visible.\n';
    this.container.appendChild(this.textarea);

    this.editor = {
      setValue: (value) => { this.textarea.value = value || ''; },
      getValue: () => this.textarea.value,
      getModel: () => null,
      updateOptions: () => {},
      onDidChangeModelContent: () => {},
      onDidChangeCursorPosition: () => {},
      deltaDecorations: () => [],
      getSelections: () => [],
      setSelections: () => {}
    };

    this.textarea.addEventListener('input', () => {
      if (this.isApplyingRemote || !this.onContentChanged) return;
      this.onContentChanged(this.textarea.value);
    });
    this.textarea.addEventListener('keyup', () => this.emitFallbackCursor());
    this.textarea.addEventListener('click', () => this.emitFallbackCursor());
  }

  emitFallbackCursor() {
    if (!this.onCursorChanged || !this.textarea) return;
    const beforeCursor = this.textarea.value.slice(0, this.textarea.selectionStart);
    const lines = beforeCursor.split('\n');
    this.onCursorChanged({
      lineNumber: lines.length,
      column: lines[lines.length - 1].length + 1
    });
  }

  // Bind to new Yjs document
  bindDocument(fileContent) {
    console.log('[bindDocument] executing');
    if (!this.Y && !this.textarea) {
      this.pendingBindContent = fileContent || '';
      console.warn('[MODEL_BOUND] waiting_for_yjs');
      this.isApplyingRemote = true;
      this.editor?.setValue(fileContent || '');
      this.isApplyingRemote = false;
      return;
    }
    if (this.textarea) {
      this.isApplyingRemote = true;
      this.editor?.setValue(fileContent || '');
      this.isApplyingRemote = false;
      console.log('[MODEL_BOUND] fallback_textarea');
      return;
    }

    if (this.yTextObserver && this.yText) {
      this.yText.unobserve(this.yTextObserver);
      console.log('[YTEXT_OBSERVER_REMOVED]');
      this.yTextObserver = null;
    }
    if (this.doc) {
      console.log('[MODEL_DISPOSED]');
      this.doc.destroy();
    }

    this.doc = new this.Y.Doc();
    console.log('[YDOC_CREATED]');
    this.yText = this.doc.getText('code-content');
    console.log('[YTEXT_CREATED]');
    
    // Bind Yjs update event to send updates to the WebSocket server
    this.doc.on('update', (update, origin) => {
      if (origin !== 'remote' && origin !== 'init' && this.onContentChanged) {
        console.log('[DOC_UPDATE_SENT]');
        this.onContentChanged(update);
      }
    });

    this.isApplyingRemote = true;
    this.doc.transact(() => {
      if (fileContent) {
        this.yText.insert(0, fileContent);
      }
    }, 'init');
    this.editor.setValue(this.yText.toString());
    console.log('[MODEL_BOUND]', { length: this.yText.length });
    this.isApplyingRemote = false;

    // Observe changes to apply them to Monaco
    const model = this.editor.getModel();
    this.yTextObserver = (event) => {
      if (event.transaction.origin === 'local') return;

      this.isApplyingRemote = true;
      console.log('[YTEXT_UPDATED]', { origin: event.transaction.origin || 'remote', delta: event.delta.length });
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
    console.log('[YTEXT_OBSERVER_ADDED]');
    console.log('[YJS_BOUND]');
    
    this.clearAllRemoteCursors();
  }

  // Update language based on file name/extension
  setLanguageForFile(fileName = 'main.js') {
    if (!this.editor || this.textarea) return;
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
    if (this.textarea) {
      if (typeof binaryUpdate === 'string') {
        this.isApplyingRemote = true;
        this.textarea.value = binaryUpdate;
        this.isApplyingRemote = false;
      }
      return;
    }
    if (!this.Y || !this.doc || !this.yText) return;
    console.log('[REMOTE_APPLY]');
    this.Y.applyUpdate(this.doc, new Uint8Array(binaryUpdate), 'remote');
  }

  replaceContentFromRemote(content) {
    const nextContent = content || '';
    const currentValue = this.getValue();
    if (currentValue === nextContent) {
      console.log('[REMOTE_APPLY]', { mode: 'snapshot_noop', length: nextContent.length });
      return;
    }
    if (this.textarea) {
      this.isApplyingRemote = true;
      this.textarea.value = nextContent;
      this.isApplyingRemote = false;
      console.log('[REMOTE_APPLY]', { mode: 'snapshot_textarea', length: nextContent.length });
      return;
    }

    if (!this.editor) return;

    this.isApplyingRemote = true;
    if (this.yTextObserver && this.yText) {
      this.yText.unobserve(this.yTextObserver);
      console.log('[YTEXT_OBSERVER_REMOVED]', { reason: 'snapshot_replace' });
    }
    const model = this.editor.getModel?.();
    if (this.doc && this.yText) {
      this.doc.transact(() => {
        this.yText.delete(0, this.yText.length);
        if (nextContent) this.yText.insert(0, nextContent);
      }, 'remote');
    }
    if (model && typeof model.setValue === 'function') {
      model.setValue(nextContent);
    } else {
      this.editor.setValue(nextContent);
    }
    if (this.yTextObserver && this.yText) {
      this.yText.observe(this.yTextObserver);
      console.log('[YTEXT_OBSERVER_ADDED]', { reason: 'snapshot_replace' });
    }
    this.isApplyingRemote = false;
    console.log('[REMOTE_APPLY]', { mode: 'snapshot', length: nextContent.length });
  }

  // Render remote cursors
  updateRemoteCursor(connectionId, user, position) {
    if (!this.editor || !position || this.textarea) return;
    console.log('[REMOTE_CURSOR_APPLY]', { connectionId, user: user?.name, position });
    this.remoteCursorSeenAt.set(connectionId, Date.now());

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

  shouldKeepRecentRemoteCursor(connectionId, maxAgeMs = 10000) {
    const seenAt = this.remoteCursorSeenAt.get(connectionId);
    return !!seenAt && (Date.now() - seenAt) < maxAgeMs;
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

  getValue() {
    if (this.textarea) {
      return this.textarea.value;
    }
    if (this.editor && typeof this.editor.getValue === 'function') {
      return this.editor.getValue();
    }
    return '';
  }

  getCursorPosition() {
    if (this.textarea) {
      const beforeCursor = this.textarea.value.slice(0, this.textarea.selectionStart);
      const lines = beforeCursor.split('\n');
      return {
        lineNumber: lines.length,
        column: lines[lines.length - 1].length + 1
      };
    }
    if (this.editor && typeof this.editor.getPosition === 'function') {
      return this.editor.getPosition();
    }
    return null;
  }

  layout() {
    if (this.editor && typeof this.editor.layout === 'function') {
      this.editor.layout();
    }
  }
}
