// GitLab Service Module - REST client for GitLab API v4.

export class GitLabService {
  constructor() {
    this.baseUrl = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/+$/, '');
    this.token = process.env.GITLAB_TOKEN || process.env.GITLAB_PRIVATE_TOKEN || '';
    this.projectId = process.env.GITLAB_PROJECT_ID || '';
    this.validation = this.validateConfiguration();
  }

  refreshFromEnv() {
    this.baseUrl = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/+$/, '');
    this.token = process.env.GITLAB_TOKEN || process.env.GITLAB_PRIVATE_TOKEN || '';
    this.projectId = process.env.GITLAB_PROJECT_ID || '';
    this.validation = this.validateConfiguration();
    return this.validation;
  }

  getMissingConfig() {
    const missing = [];
    if (!this.token) missing.push('GITLAB_TOKEN');
    if (!this.projectId) missing.push('GITLAB_PROJECT_ID');
    return missing;
  }

  validateConfiguration() {
    const missing = this.getMissingConfig();
    if (missing.length > 0) {
      console.warn('[GitLabAPIError]', {
        message: 'GitLab is not configured.',
        missing
      });
      return {
        configured: false,
        missing,
        message: 'GitLab is not configured.'
      };
    }

    console.log('[GitLabConnected]', {
      baseUrl: this.baseUrl,
      projectId: this.projectId
    });

    return {
      configured: true,
      missing: [],
      message: 'GitLab configuration loaded.'
    };
  }

  isConfigured() {
    return this.getMissingConfig().length === 0;
  }

  assertConfigured() {
    const missing = this.getMissingConfig();
    if (missing.length === 0) return;

    const error = new Error(`GitLab is not configured. Missing: ${missing.join(', ')}`);
    error.code = 'GITLAB_NOT_CONFIGURED';
    error.missing = missing;
    console.error('[GitLabAPIError]', {
      message: error.message,
      missing
    });
    throw error;
  }

  projectUrl(pathname = '') {
    const encodedProjectId = encodeURIComponent(this.projectId);
    const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${this.baseUrl}/api/v4/projects/${encodedProjectId}${suffix}`;
  }

  headers(json = false) {
    const headers = { 'PRIVATE-TOKEN': this.token };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async parseResponse(response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  createApiError(data, fallback = 'GitLab API error') {
    const message = data?.message || data?.error || JSON.stringify(data) || fallback;
    const error = new Error(`GitLab API error: ${message}`);
    error.code = 'GITLAB_API_ERROR';
    error.details = data;
    console.error('[GitLabAPIError]', {
      message: error.message,
      details: data
    });
    return error;
  }

  async request(pathname, options = {}) {
    this.assertConfigured();
    const response = await fetch(this.projectUrl(pathname), {
      ...options,
      headers: {
        ...this.headers(options.json),
        ...(options.headers || {})
      }
    });
    const data = await this.parseResponse(response);

    if (!response.ok) {
      throw this.createApiError(data, `HTTP ${response.status}`);
    }

    return data;
  }

  async getProjectInfo() {
    const data = await this.request('');
    const project = {
      status: 'success',
      projectId: data.id,
      name: data.name,
      pathWithNamespace: data.path_with_namespace,
      defaultBranch: data.default_branch,
      webUrl: data.web_url,
      visibility: data.visibility,
      openIssuesCount: data.open_issues_count,
      lastActivityAt: data.last_activity_at
    };

    console.log('[GitLabProjectLoaded]', {
      projectId: project.projectId,
      pathWithNamespace: project.pathWithNamespace,
      defaultBranch: project.defaultBranch
    });

    return project;
  }

  async healthCheck() {
    const config = this.refreshFromEnv();
    if (!config.configured) {
      return {
        status: 'error',
        configured: false,
        message: 'GitLab is not configured.',
        missing: config.missing
      };
    }

    const project = await this.getProjectInfo();
    return {
      status: 'success',
      configured: true,
      tokenWorks: true,
      projectReachable: true,
      project
    };
  }

  async listIssues(state = 'opened') {
    const issues = await this.request(`/issues?state=${encodeURIComponent(state)}&per_page=50`);
    return (Array.isArray(issues) ? issues : []).map(issue => ({
      issueId: issue.id,
      issueIid: issue.iid,
      title: issue.title,
      state: issue.state,
      labels: issue.labels || [],
      webUrl: issue.web_url,
      author: issue.author?.name || issue.author?.username || 'Unknown',
      createdAt: issue.created_at,
      updatedAt: issue.updated_at
    }));
  }

  async createIssue(title, description = '', options = {}) {
    const body = {
      title,
      description
    };

    if (Array.isArray(options.labels) && options.labels.length > 0) {
      body.labels = options.labels.join(',');
    } else if (typeof options.labels === 'string' && options.labels.trim()) {
      body.labels = options.labels;
    }

    const data = await this.request('/issues', {
      method: 'POST',
      json: true,
      body: JSON.stringify(body)
    });

    const issue = {
      status: 'success',
      issueId: data.id,
      issueIid: data.iid,
      title: data.title,
      description: data.description,
      state: data.state,
      labels: data.labels || [],
      webUrl: data.web_url,
      createdAt: data.created_at
    };

    console.log('[GitLabIssueCreated]', {
      issueIid: issue.issueIid,
      title: issue.title
    });

    return issue;
  }

  async createBranch(branchName, ref = 'main') {
    const data = await this.request('/repository/branches', {
      method: 'POST',
      json: true,
      body: JSON.stringify({
        branch: branchName,
        ref
      })
    });

    return {
      status: 'success',
      branch: data.name,
      commit: {
        id: data.commit?.id,
        shortId: data.commit?.short_id,
        title: data.commit?.title,
        author: data.commit?.author_name
      },
      webUrl: data.web_url
    };
  }

  async listBranches() {
    const branches = await this.request('/repository/branches?per_page=50');
    return (Array.isArray(branches) ? branches : []).map(branch => ({
      name: branch.name,
      merged: branch.merged,
      protected: branch.protected,
      default: branch.default,
      webUrl: branch.web_url,
      commit: {
        id: branch.commit?.id,
        shortId: branch.commit?.short_id,
        title: branch.commit?.title
      }
    }));
  }

  async createMergeRequest(sourceBranch, targetBranch = 'main', title, description = '') {
    const data = await this.request('/merge_requests', {
      method: 'POST',
      json: true,
      body: JSON.stringify({
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title,
        description
      })
    });

    const mr = {
      status: 'success',
      mrId: data.id,
      mrIid: data.iid,
      title: data.title,
      description: data.description,
      state: data.state,
      sourceBranch: data.source_branch,
      targetBranch: data.target_branch,
      webUrl: data.web_url,
      author: data.author?.name || data.author?.username || 'Unknown',
      createdAt: data.created_at
    };

    console.log('[GitLabMRCreated]', {
      mrIid: mr.mrIid,
      title: mr.title,
      sourceBranch: mr.sourceBranch,
      targetBranch: mr.targetBranch
    });

    return mr;
  }

  async listMergeRequests(state = 'opened') {
    const mergeRequests = await this.request(`/merge_requests?state=${encodeURIComponent(state)}&per_page=50`);
    return (Array.isArray(mergeRequests) ? mergeRequests : []).map(mr => ({
      mrId: mr.id,
      mrIid: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      webUrl: mr.web_url,
      author: mr.author?.name || mr.author?.username || 'Unknown',
      createdAt: mr.created_at,
      hasConflicts: mr.has_conflicts,
      mergeStatus: mr.merge_status
    }));
  }

  async getLatestPipeline(ref = null) {
    let path = '/pipelines?per_page=1';
    if (ref) path += `&ref=${encodeURIComponent(ref)}`;

    const pipelines = await this.request(path);
    if (!Array.isArray(pipelines) || pipelines.length === 0) {
      return {
        status: 'no_pipelines',
        message: 'No pipelines found for this project.'
      };
    }

    const latest = pipelines[0];
    return {
      status: 'success',
      pipelineId: latest.id,
      pipelineStatus: latest.status,
      ref: latest.ref,
      sha: latest.sha,
      webUrl: latest.web_url,
      createdAt: latest.created_at,
      updatedAt: latest.updated_at
    };
  }
}

export const gitlabService = new GitLabService();
export default gitlabService;
