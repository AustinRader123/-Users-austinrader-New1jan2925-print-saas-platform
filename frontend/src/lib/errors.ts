export function extractErrorMessage(error: any): string {
  try {
    const resp = error?.response?.data;
    const msg = resp?.error || resp?.message || error?.message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
    // Axios/network fallbacks
    if (error?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error?.response) return 'Network error. Check API URL and CORS.';
    return `Request failed (${error.response.status}).`;
  } catch {
    return 'Unexpected error occurred.';
  }
}
