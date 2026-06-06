import axios from 'axios';
import type {
  MaterialBatch,
  WitnessRecord,
  SampleSeal,
  InspectionOrder,
  TestReport,
  Rectification,
  OperationLog,
  ApiResponse,
} from './types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const batchesApi = {
  getAll: (params?: any) => api.get<ApiResponse<MaterialBatch[]>>('/batches', { params }),
  getById: (id: string) => api.get<ApiResponse<MaterialBatch>>(`/batches/${id}`),
  create: (data: any) => api.post<ApiResponse<MaterialBatch>>('/batches', data),
  archive: (id: string) => api.post<ApiResponse<MaterialBatch>>(`/batches/${id}/archive`),
};

export const witnessApi = {
  getByBatchId: (batchId: string) => api.get<ApiResponse<WitnessRecord[]>>(`/witness/batch/${batchId}`),
  create: (data: any) => api.post<ApiResponse<WitnessRecord>>('/witness', data),
};

export const sampleSealsApi = {
  getByBatchId: (batchId: string) => api.get<ApiResponse<SampleSeal[]>>(`/sample-seals/batch/${batchId}`),
  getById: (id: string) => api.get<ApiResponse<SampleSeal>>(`/sample-seals/${id}`),
  create: (data: any) => api.post<ApiResponse<SampleSeal>>('/sample-seals', data),
};

export const inspectionOrdersApi = {
  getAll: (params?: any) => api.get<ApiResponse<InspectionOrder[]>>('/inspection-orders', { params }),
  getById: (id: string) => api.get<ApiResponse<InspectionOrder>>(`/inspection-orders/${id}`),
  create: (data: any) => api.post<ApiResponse<InspectionOrder>>('/inspection-orders', data),
  receive: (id: string) => api.post<ApiResponse<InspectionOrder>>(`/inspection-orders/${id}/receive`),
};

export const testReportsApi = {
  getAll: (params?: any) => api.get<ApiResponse<TestReport[]>>('/test-reports', { params }),
  getById: (id: string) => api.get<ApiResponse<TestReport>>(`/test-reports/${id}`),
  create: (data: any) => api.post<ApiResponse<any>>('/test-reports', data),
};

export const rectificationsApi = {
  getAll: (params?: any) => api.get<ApiResponse<Rectification[]>>('/rectifications', { params }),
  getById: (id: string) => api.get<ApiResponse<Rectification>>(`/rectifications/${id}`),
  getByBatchId: (batchId: string) => api.get<ApiResponse<Rectification[]>>(`/rectifications/batch/${batchId}`),
  update: (id: string, data: any) => api.put<ApiResponse<Rectification>>(`/rectifications/${id}`, data),
  close: (id: string, data?: any) => api.post<ApiResponse<Rectification>>(`/rectifications/${id}/close`, data),
};

export const operationLogsApi = {
  getAll: (params?: any) => api.get<ApiResponse<OperationLog[]>>('/operation-logs', { params }),
};

export default api;
