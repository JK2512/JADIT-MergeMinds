// 
// Presence Module  Handles User Identity, Avatars, and Awareness
// 

export class PresenceTracker {
  constructor(onUserIdentified) {
    this.currentUser = null;
    this.users = [];
    this.onUserIdentified = onUserIdentified;
    
    // UI Selectors
    this.modalOverlay = document.getElementById('username-modal');
    this.usernameInput = document.getElementById('username-input');
    this.submitBtn = document.getElementById('username-submit');
    this.headerAvatars = document.getElementById('header-avatars');
    this.presenceList = document.getElementById('presence-list');
  }

  init() {
    // Check localStorage for saved username
    const savedName = localStorage.getItem('gitlabs_username');
    const savedColor = localStorage.getItem('gitlabs_color');
    
    if (savedName) {
      this.currentUser = { name: savedName, color: savedColor || this.getRandomColor() };
      localStorage.setItem('gitlabs_color', this.currentUser.color); // ensure saved
      
      // Hide modal instantly
      if (this.modalOverlay) {
        this.modalOverlay.classList.add('hidden');
      }
      
      // Trigger callback
      if (this.onUserIdentified) {
        this.onUserIdentified(this.currentUser);
      }
    } else {
      // Show modal, wait for input
      if (this.modalOverlay) {
        this.modalOverlay.classList.remove('hidden');
      }
      
      this.submitBtn.addEventListener('click', () => this.handleUsernameSubmit());
      this.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleUsernameSubmit();
      });
    }
    this.renderHeaderAvatars(null);
  }

  handleUsernameSubmit() {
    const name = this.usernameInput.value.trim();
    if (!name) return;

    const color = this.getRandomColor();
    this.currentUser = { name, color };
    
    localStorage.setItem('gitlabs_username', name);
    localStorage.setItem('gitlabs_color', color);
    
    if (this.modalOverlay) {
      this.modalOverlay.classList.add('hidden');
    }
    
    if (this.onUserIdentified) {
      this.onUserIdentified(this.currentUser);
    }
  }

  getRandomColor() {
    const colors = [
      '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
      '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#7bed9f'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  updateUsers(userList, selfConnectionId) {
    this.users = userList;
    this.renderHeaderAvatars(selfConnectionId);
    this.renderSidebarList(selfConnectionId);
  }

  renderHeaderAvatars(selfConnectionId) {
    if (!this.headerAvatars) return;
    this.headerAvatars.innerHTML = '';

    const sourceUsers = this.users.length > 0 ? this.users : (this.currentUser ? [{ ...this.currentUser, id: 'self' }] : []);

    if (sourceUsers.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'presence-empty';
      empty.textContent = 'No active collaborators';
      this.headerAvatars.appendChild(empty);
      return;
    }

    const visibleUsers = sourceUsers.slice(0, 4);
    const overflowCount = Math.max(0, sourceUsers.length - visibleUsers.length);

    visibleUsers.forEach((u) => {
      const isSelf = u.id === selfConnectionId;
      const avatar = document.createElement('div');
      avatar.className = `header-avatar ${isSelf ? 'user-self' : ''}`;
      avatar.style.backgroundColor = u.color || '#fc6d26';
      avatar.title = `${u.name} ${isSelf ? '(You)' : ''}  editing ${u.currentFile || 'nothing'}`;
      avatar.textContent = this.getInitials(u.name);
      this.headerAvatars.appendChild(avatar);
    });

    if (overflowCount > 0) {
      const overflow = document.createElement('div');
      overflow.className = 'header-avatar avatar-overflow';
      overflow.title = `${overflowCount} more collaborators online`;
      overflow.textContent = `+${overflowCount}`;
      this.headerAvatars.appendChild(overflow);
    }
  }

  renderSidebarList(selfConnectionId) {
    if (!this.presenceList) return;
    this.presenceList.innerHTML = '';

    if (this.users.length === 0) {
      this.presenceList.innerHTML = '<div style="color: var(--text-muted); font-size:11px; padding: 8px;">No one online</div>';
      return;
    }

    this.users.forEach((u) => {
      const isSelf = u.id === selfConnectionId;
      
      const item = document.createElement('div');
      item.className = 'presence-item';

      const avatar = document.createElement('div');
      avatar.className = 'presence-avatar';
      avatar.style.backgroundColor = u.color || '#fc6d26';
      avatar.textContent = this.getInitials(u.name);

      const info = document.createElement('div');
      info.className = 'presence-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'presence-name';
      nameSpan.textContent = u.name + (isSelf ? ' (You)' : '');

      const fileSpan = document.createElement('span');
      fileSpan.className = 'presence-file';
      fileSpan.textContent = u.currentFile ? ` ${u.currentFile}` : ' idle';

      info.appendChild(nameSpan);
      info.appendChild(fileSpan);
      item.appendChild(avatar);
      item.appendChild(info);
      this.presenceList.appendChild(item);
    });
  }
}
