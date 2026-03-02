export function extractErrorMessage(error: any): string {
  try {
    const resp = error?.response?.data;
    const requestId = resp?.requestId || error?.response?.headers?.['x-request-id'];
    const msg = resp?.error || resp?.message || error?.message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return requestId && !msg.includes('requestId=') ? `${msg} (requestId=${requestId})` : msg;
    }
    // Axios/network fallbacks
    if (error?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error?.response) return 'Network error. Check API URL and CORS.';
    return requestId ? `Request failed (${error.response.status}) (requestId=${requestId}).` : `Request failed (${error.response.status}).`;
  } catch {
    return 'Unexpected error occurred.';
  }
}
