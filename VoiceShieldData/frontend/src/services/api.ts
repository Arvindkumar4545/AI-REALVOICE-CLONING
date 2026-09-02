import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  User,
  AuthTokens,
  DetectionRequestStatus,
  ScamReport,
  ThreatLocationPoint,
  SystemStatistics,
  AdminTelemetry,
} from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token and handle multipart boundary
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('voiceshield_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If request payload is FormData, remove Content-Type so Axios/browser computes the multipart boundary
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Refresh token rotation on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/signin')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('voiceshield_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const newTokens: AuthTokens = res.data.data.tokens;
          
          localStorage.setItem('voiceshield_access_token', newTokens.access_token);
          localStorage.setItem('voiceshield_refresh_token', newTokens.refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          }
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('voiceshield_access_token');
          localStorage.removeItem('voiceshield_refresh_token');
          localStorage.removeItem('voiceshield_user');
          window.location.href = '/signin';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API Service functions
export const authApi = {
  signup: async (data: { email: string; password: string; full_name?: string; admin_otp?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: { user: User; tokens: AuthTokens } }>('/auth/signup', data);
    return res.data;
  },
  signin: async (data: { email: string; password: string; admin_otp?: string }) => {
    const res = await apiClient.post<{ success: boolean; data: { user: User; tokens: AuthTokens } }>('/auth/signin', data);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (data: { token: string; new_password: string }) => {
    const res = await apiClient.post('/auth/reset-password', data);
    return res.data;
  },
  verifyEmail: async (token: string) => {
    const res = await apiClient.get(`/auth/verify-email?token=${token}`);
    return res.data;
  },
};

export const detectionApi = {
  uploadAudio: async (file: File, sync: boolean = false) => {
    const formData = new FormData();
    formData.append('audio', file);
    const res = await apiClient.post<{ success: boolean; status: string; data: any }>(
      `/detection?sync=${sync}`,
      formData
    );
    return res.data;
  },
  getDetectionStatus: async (requestId: string) => {
    const res = await apiClient.get<{ success: boolean; data: DetectionRequestStatus }>(`/detection/${requestId}`);
    return res.data;
  },
  validatePreflight: async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    const res = await apiClient.post('/detection/validate', formData);
    return res.data;
  },
  getModelInfo: async () => {
    const res = await apiClient.get('/detection/model/info');
    return res.data;
  },
};

export const historyApi = {
  getHistory: async (params?: { page?: number; limit?: number; prediction?: string; minRisk?: number; all?: boolean }) => {
    const res = await apiClient.get<{ success: boolean; data: { items: any[]; pagination: any } }>('/history', { params });
    return res.data;
  },
  clearHistory: async () => {
    const res = await apiClient.delete('/history');
    return res.data;
  },
};

export const reportsApi = {
  submitReport: async (data: Partial<ScamReport>) => {
    const res = await apiClient.post<{ success: boolean; data: ScamReport }>('/reports', data);
    return res.data;
  },
  getReports: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<{ success: boolean; data: { items: ScamReport[]; pagination: any } }>('/reports', { params });
    return res.data;
  },
};

export const locationApi = {
  getThreatPoints: async () => {
    const res = await apiClient.get<{ success: boolean; data: { points: ThreatLocationPoint[]; total_events: number; region_distribution: Record<string, number> } }>('/location/threats');
    return res.data;
  },
};

export const statisticsApi = {
  getStatistics: async () => {
    const res = await apiClient.get<{ success: boolean; data: SystemStatistics }>('/statistics');
    return res.data;
  },
};

export const adminApi = {
  getOverview: async () => {
    const res = await apiClient.get<{ success: boolean; data: AdminTelemetry }>('/admin/overview');
    return res.data;
  },
  getUsers: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<{ success: boolean; data: { items: any[]; pagination: any } }>('/admin/users', { params });
    return res.data;
  },
  getAuditLogs: async (limit?: number) => {
    const res = await apiClient.get<{ success: boolean; data: { items: any[]; total: number } }>('/admin/audit-logs', { params: { limit } });
    return res.data;
  },
};

export const userApi = {
  updateProfile: async (data: { full_name?: string }) => {
    const res = await apiClient.put('/user/profile', data);
    return res.data;
  },
  generateApiKey: async () => {
    const res = await apiClient.post<{ success: boolean; data: { api_key: string } }>('/user/api-key');
    return res.data;
  },
  exportData: async () => {
    const res = await apiClient.get('/user/export-data');
    return res.data;
  },
  deleteAccount: async () => {
    const res = await apiClient.delete('/user/account');
    return res.data;
  },
};

export const investigationApi = {
  getCases: async () => {
    const res = await apiClient.get<{ success: boolean; cases: any[]; total: number }>('/investigation');
    return res.data;
  },
  getCaseDetails: async (id: string) => {
    const res = await apiClient.get<{ success: boolean; case: any; evidence: any[]; chain_of_custody: any[] }>(`/investigation/${id}`);
    return res.data;
  },
  getAuthorizedLocation: async (data: { case_id: string; phone_number: string; authorization_reference: string }) => {
    const res = await apiClient.post<{ success: boolean; location: any }>('/investigation/location', data);
    return res.data;
  },
  getAuthorizedEvidence: async (data: { case_id: string; evidence_type: string; authorization_reference: string }) => {
    const res = await apiClient.post<{ success: boolean; evidence: any }>('/investigation/evidence', data);
    return res.data;
  },
  generatePoliceReport: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; case: any }>(`/investigation/${id}/report`);
    return res.data;
  },
  escalateToBank: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; case: any }>(`/investigation/${id}/escalate/bank`);
    return res.data;
  },
  escalateToCybercrime: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; case: any }>(`/investigation/${id}/escalate/le`);
    return res.data;
  },
};
