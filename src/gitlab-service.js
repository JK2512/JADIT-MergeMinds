// ═══════════════════════════════════════════════════════════════
// GitLab Service Module — REST Client for GitLab API v4
// ═══════════════════════════════════════════════════════════════

export class GitLabService {
  constructor() {
    this.baseUrl = process.env.GITLAB_URL || 'https://gitlab.com';
    this.token = process.env.GITLAB_PRIVATE_TOKEN;
    this.projectId = process.env.GITLAB_PROJECT_ID;
  }

  /**
   * Helper to verify if the required configuration variables are set.
   */
  isConfigured() {
    return !!(this.token && this.projectId);
  }

  /**
   * Creates a new git branch in the repository.
   * POST /api/v4/projects/:id/repository/branches
   * @param {string} branchName - Name of the new branch
   * @param {string} ref - Source branch/ref (default: 'main')
   */
  async createBranch(branchName, ref = 'main') {
    if (!this.isConfigured()) {
      throw new Error(
        "GitLab service is not fully configured. Please ensure GITLAB_PRIVATE_TOKEN and GITLAB_PROJECT_ID are set in your .env file."
      );
    }

    const encodedProjectId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedProjectId}/repository/branches`;

    console.log(`🌐 [GitLabService] Creating branch "${branchName}" from ref "${ref}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branch: branchName,
        ref: ref
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || JSON.stringify(data);
      throw new Error(`GitLab API error: ${errorMessage}`);
    }

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

  /**
   * Fetches the latest pipeline status for the project.
   * GET /api/v4/projects/:id/pipelines
   * @param {string} ref - Optional branch name to filter by
   */
  async getLatestPipeline(ref = null) {
    if (!this.isConfigured()) {
      throw new Error(
        "GitLab service is not fully configured. Please ensure GITLAB_PRIVATE_TOKEN and GITLAB_PROJECT_ID are set in your .env file."
      );
    }

    const encodedProjectId = encodeURIComponent(this.projectId);
    let url = `${this.baseUrl}/api/v4/projects/${encodedProjectId}/pipelines?per_page=1`;
    if (ref) {
      url += `&ref=${encodeURIComponent(ref)}`;
    }

    console.log(`🌐 [GitLabService] Fetching latest pipeline status${ref ? ` for ref "${ref}"` : ''}`);

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || JSON.stringify(data);
      throw new Error(`GitLab API error: ${errorMessage}`);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        status: 'no_pipelines',
        message: 'No pipelines found for this project.'
      };
    }

    const latest = data[0];
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

  /**
   * Creates a new GitLab issue.
   * POST /api/v4/projects/:id/issues
   * @param {string} title - The title of the issue
   * @param {string} description - The description of the issue
   */
  async createIssue(title, description = '') {
    if (!this.isConfigured()) {
      throw new Error(
        "GitLab service is not fully configured. Please ensure GITLAB_PRIVATE_TOKEN and GITLAB_PROJECT_ID are set in your .env file."
      );
    }

    const encodedProjectId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedProjectId}/issues`;

    console.log(`🌐 [GitLabService] Creating issue: "${title}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || JSON.stringify(data);
      throw new Error(`GitLab API error: ${errorMessage}`);
    }

    return {
      status: 'success',
      issueId: data.id,
      issueIid: data.iid,
      title: data.title,
      description: data.description,
      state: data.state,
      webUrl: data.web_url,
      createdAt: data.created_at
    };
  }

  /**
   * Lists merge requests in the repository.
   * GET /api/v4/projects/:id/merge_requests
   * @param {string} state - Filter by MR state: 'opened', 'closed', 'merged', or 'all'
   */
  async listMergeRequests(state = 'opened') {
    if (!this.isConfigured()) {
      throw new Error(
        "GitLab service is not fully configured. Please ensure GITLAB_PRIVATE_TOKEN and GITLAB_PROJECT_ID are set in your .env file."
      );
    }

    const encodedProjectId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedProjectId}/merge_requests?state=${encodeURIComponent(state)}`;

    console.log(`🌐 [GitLabService] Listing merge requests (state: ${state})`);

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || JSON.stringify(data);
      throw new Error(`GitLab API error: ${errorMessage}`);
    }

    if (!Array.isArray(data)) {
      throw new Error('GitLab API did not return an array of merge requests.');
    }

    return data.map(mr => ({
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

  /**
   * Creates a new GitLab merge request.
   * POST /api/v4/projects/:id/merge_requests
   * @param {string} sourceBranch - The branch containing the changes
   * @param {string} targetBranch - The branch to merge changes into (default: 'main')
   * @param {string} title - The title of the Merge Request
   * @param {string} description - Detailed description
   */
  async createMergeRequest(sourceBranch, targetBranch, title, description = '') {
    if (!this.isConfigured()) {
      throw new Error(
        "GitLab service is not fully configured. Please ensure GITLAB_PRIVATE_TOKEN and GITLAB_PROJECT_ID are set in your .env file."
      );
    }

    const encodedProjectId = encodeURIComponent(this.projectId);
    const url = `${this.baseUrl}/api/v4/projects/${encodedProjectId}/merge_requests`;

    console.log(`🌐 [GitLabService] Creating merge request from "${sourceBranch}" to "${targetBranch}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_branch: sourceBranch,
        target_branch: targetBranch,
        title,
        description
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || JSON.stringify(data);
      throw new Error(`GitLab API error: ${errorMessage}`);
    }

    return {
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
  }
}

export const gitlabService = new GitLabService();
export default gitlabService;
