import { apiClient } from '../lib/api';

export async function listProductionJobs() {
  return apiClient.listProductionJobs('default');
}

export async function updateProductionJob(jobId: string, status: string) {
  return apiClient.adminUpdateProductionJob(jobId, status);
}
