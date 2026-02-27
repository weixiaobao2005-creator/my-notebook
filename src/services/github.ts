export class GitHubService {
  constructor(private token: string, private owner: string, private repo: string) {}

  async request(method: string, endpoint: string, body?: any) {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      method,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      if (res.status === 404 && method === 'GET') return null;
      throw new Error(`GitHub API Error: ${res.statusText}`);
    }
    
    // 204 No Content
    if (res.status === 204) return null;
    
    return res.json();
  }

  async checkRepoExists() {
    try {
      await this.request('GET', `/repos/${this.owner}/${this.repo}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  async createRepo() {
    await this.request('POST', `/user/repos`, {
      name: this.repo,
      private: true,
      description: 'My Personal Notebook Data'
    });
  }

  async getFile(path: string) {
    const res = await this.request('GET', `/repos/${this.owner}/${this.repo}/contents/${path}`);
    if (!res) return null;
    
    // GitHub base64 might have newlines
    const base64 = res.content.replace(/\n/g, '');
    
    // Decode base64 to utf-8 string
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    const content = new TextDecoder().decode(bytes);
    
    return {
      content,
      sha: res.sha
    };
  }

  async saveFile(path: string, content: string, message: string, sha?: string) {
    // Encode utf-8 string to base64
    const bytes = new TextEncoder().encode(content);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    const encoded = btoa(binString);
    
    return this.request('PUT', `/repos/${this.owner}/${this.repo}/contents/${path}`, {
      message,
      content: encoded,
      sha
    });
  }
}
