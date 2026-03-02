type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

export async function apiRequest<T>(path: string, method: HttpMethod = 'GET', body?: unknown): Promise<ApiResult<T>> {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        data: null,
        error: parsed?.error || `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: parsed as T,
      error: null,
      status: response.status,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error?.message || 'Network error',
      status: 0,
    };
  }
}

export async function withFallback<T>(primary: () => Promise<T>, fallback: () => T | Promise<T>, key: string): Promise<T> {
  try {
    return await primary();
  } catch (error: any) {
    console.info(`[app-data] fallback for ${key}:`, error?.message || error);
    return await fallback();
  }
}
