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
  generateCatalogUrl: (id) => api.post(`/skus/${id}/generate-catalog-url`).then(res => res.data),
  generateCatalogUrlPreview: (data) => api.post(`/skus/generate-catalog-url`, data).then(res => res.data),
  trashCatalogFolder: (id) => api.post(`/skus/${id}/trash-catalog-folder`).then(res => res.data),
  exportImages: (data) => api.post('/skus/export-images', data, { responseType: 'blob' }).then(res => res.data),
  bulkImport: (data) => api.post('/skus/bulk-import', data).then(res => res.data),
  search: (q) => api.get('/skus-search', { params: { q } }).then(res => res.data),
  linkComponent: (id, targetId, type) => {
    const params = { component_type: type };
    if (targetId) params.target_sku_id = targetId;
    return api.post(`/skus/${id}/link-component`, null, { params }).then(res => res.data);
  },
  unlinkComponent: (id, type) => api.delete(`/skus/${id}/link-component/${type}`).then(res => res.data),
  getPoolInfo: (id) => api.get(`/skus/${id}/pool-info`).then(res => res.data),
  getPoolDiscovery: (id, type) => api.get(`/skus/${id}/pool-discovery${type ? `?comp_type=${type}` : ''}`).then(res => res.data),
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

export const salesApi = {
  getAll: () => api.get('/sales').then(res => res.data),
  bulkImport: (data) => api.post('/sales/bulk-import', data).then(res => res.data),
};

export default api;
