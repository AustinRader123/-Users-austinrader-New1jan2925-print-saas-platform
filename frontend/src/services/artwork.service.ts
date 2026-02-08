import { apiClient } from '../lib/api';

export async function listArtworkApprovals() {
  // If backend exposes approvals, call it; else derive from designs/mockups
  try {
    const { data } = await (apiClient as any)['client'].get('/artwork/approvals');
    return data;
  } catch {
    // Fallback: use mockups for designs (Not fully connected)
    return [];
  }
}

export async function approveArtwork(approvalId: string) {
  try {
    const { data } = await (apiClient as any)['client'].post(`/artwork/approvals/${approvalId}/approve`);
    return data;
  } catch {
    return { ok: false };
  }
}

export async function rejectArtwork(approvalId: string, reason: string) {
  try {
    const { data } = await (apiClient as any)['client'].post(`/artwork/approvals/${approvalId}/reject`, { reason });
    return data;
  } catch {
    return { ok: false };
  }
}
