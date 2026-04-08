import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
// Automatically append /api if the user forgot to include it in their environment variable
const baseURL = rawBaseURL.endsWith('/api') || rawBaseURL.endsWith('/api/') 
  ? rawBaseURL 
  : `${rawBaseURL.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL,
});

export const skuApi = {
  getAll: () => api.get('/skus').then(res => res.data),
  getById: (id) => api.get(`/skus/${id}`).then(res => res.data),
  create: (data) => api.post('/skus', data).then(res => res.data),
  update: (id, data) => api.put(`/skus/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/skus/${id}`).then(res => res.data),
  patchPlatforms: (id, data) => api.patch(`/skus/${id}/platforms`, data).then(res => res.data),
};

export const refApi = {
  getAll: (type) => api.get(`/references${type ? `?ref_type=${type}` : ''}`).then(res => res.data),
  create: (data) => api.post('/references', data).then(res => res.data),
  update: (id, data) => api.put(`/references/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/references/${id}`).then(res => res.data),
};

export const uploadApi = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

export default api;
