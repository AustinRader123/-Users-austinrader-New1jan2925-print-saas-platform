import axios, { AxiosInstance } from 'axios';

export class DNApiClient {
  client: AxiosInstance;
  constructor(baseUrl: string, auth?: { username?: string; password?: string }) {
    this.client = axios.create({ baseURL: baseUrl, timeout: 10000 });
    if (auth && auth.username) {
      this.client.defaults.auth = { username: auth.username, password: auth.password || '' };
    }
  }

  async post(path: string, body: any) {
    return this.client.post(path, body);
  }

  // Simple paginator for APIs that return { events: [...], nextPage }
  async *paginate(opts: { url: string; params?: any; pageSize?: number; pathToItems?: string[] }) {
    const { url, params = {}, pageSize = 100 } = opts;
    let page = params.page || 1;
    while (true) {
      const resp = await this.client.post(url, { ...params, page, limit: pageSize });
      const data = resp.data;
      let items = data;
      // try common shape
      if (data && data.events) items = data.events;
      if (!Array.isArray(items)) break;
      for (const it of items) yield it;
      if (!data || !data.nextPage) break;
      page = data.nextPage;
    }
  }
}
