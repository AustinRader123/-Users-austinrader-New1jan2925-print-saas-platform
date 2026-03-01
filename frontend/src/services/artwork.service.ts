import { apiClient } from '../lib/api';

export async function listArtworkApprovals() {
  return apiClient.listProofRequests('default', 'PENDING');
}

export async function approveArtwork(approvalId: string) {
  return apiClient.respondProofRequest(approvalId, 'APPROVED');
}

export async function rejectArtwork(approvalId: string, reason: string) {
  return apiClient.respondProofRequest(approvalId, 'REJECTED', reason);
}
