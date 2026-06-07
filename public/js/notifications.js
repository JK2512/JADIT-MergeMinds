// ═══════════════════════════════════════════════════════════════
// Notifications Module — Real-time floating alerts / toast system
// ═══════════════════════════════════════════════════════════════

export class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create notifications container
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    
    // Position floating above status bar
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '36px',
      right: '20px',
      zIndex: '9999',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '350px',
      pointerEvents: 'none'
    });
    document.body.appendChild(this.container);

    // Inject dynamic CSS rules for animations and toast styles
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.innerHTML = `
      @keyframes toastIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
      .toast-alert {
        padding: 12px 16px;
        border-radius: 8px;
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        box-shadow: var(--shadow-lg);
        color: var(--text-primary);
        font-family: var(--font-ui);
        font-size: 12px;
        pointer-events: auto;
        animation: toastIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        transition: transform 0.3s, opacity 0.3s;
      }
      .toast-success { border-left: 4px solid var(--success); }
      .toast-info { border-left: 4px solid var(--accent-ai); }
      .toast-warning { border-left: 4px solid var(--warning); }
      .toast-danger { border-left: 4px solid var(--danger); }
      
      .toast-close-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 16px;
        padding: 0 2px;
        line-height: 1;
        transition: color var(--transition);
      }
      .toast-close-btn:hover {
        color: var(--text-primary);
      }
    `;
    document.head.appendChild(style);
  }

  show(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-${type}`;
    
    const icon = document.createElement('span');
    icon.style.fontSize = '16px';
    icon.style.lineHeight = '1';
    
    if (type === 'success') icon.textContent = '✅';
    else if (type === 'warning') icon.textContent = '⚠️';
    else if (type === 'danger') icon.textContent = '🚨';
    else icon.textContent = 'ℹ️';

    const text = document.createElement('div');
    text.style.flex = '1';
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.dismiss(toast);

    toast.appendChild(icon);
    toast.appendChild(text);
    toast.appendChild(closeBtn);
    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
  }

  dismiss(toast) {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }
}
export default NotificationSystem;
