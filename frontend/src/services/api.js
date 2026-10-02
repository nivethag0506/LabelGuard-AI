/**
 * Centralized API Service for LegalScan Frontend
 * Uses VITE_API_URL or defaults to local backend /api
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `API error: ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
};

export const api = {
  // Check API health
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse(res);
    } catch (err) {
      console.warn('[API] Health check failed:', err.message);
      return { success: false, message: err.message };
    }
  },

  // Get active compliance rules
  async getRules() {
    const res = await fetch(`${API_BASE}/rules`);
    return await handleResponse(res);
  },

  // Get deterministic demo products
  async getDemoProducts() {
    const res = await fetch(`${API_BASE}/demo/products`);
    return await handleResponse(res);
  },

  // Pre-flight image quality check
  async checkImageQuality(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/scans/quality-check`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse(res);
  },

  // Create / Run a scan inspection (Single image, Multi-view, Video, or Demo)
  async createScan({ views, additionalViews, livePhotos, video, videoFrames, demoType, rawText, file, productData }) {
    // If multi-view package inspection
    if (views || (additionalViews && additionalViews.length) || (livePhotos && livePhotos.length) || video || file) {
      const formData = new FormData();

      if (views) {
        if (views.front) formData.append('front', views.front);
        if (views.back) formData.append('back', views.back);
        if (views.top) formData.append('top', views.top);
        if (views.bottom) formData.append('bottom', views.bottom);
        if (views.left) formData.append('left', views.left);
        if (views.right) formData.append('right', views.right);
      }

      if (file && (!views || !views.front)) {
        formData.append('front', file);
      }

      if (additionalViews && Array.isArray(additionalViews)) {
        const metadata = [];
        additionalViews.forEach((v, idx) => {
          if (v && v.file) {
            const fieldKey = `additional_${idx + 1}`;
            formData.append(fieldKey, v.file);
            metadata.push({
              id: fieldKey,
              fieldname: fieldKey,
              viewType: v.viewType || 'additional',
              label: v.label || v.viewType || `Additional View ${idx + 1}`
            });
          }
        });
        if (metadata.length > 0) {
          formData.append('additionalViews', JSON.stringify(metadata));
        }
      }

      if (livePhotos && Array.isArray(livePhotos)) {
        livePhotos.forEach(p => formData.append('livePhotos', p));
      }

      if (video) {
        formData.append('video', video);
      }

      if (videoFrames && Array.isArray(videoFrames)) {
        videoFrames.forEach(vf => formData.append('videoFrames', vf));
      }

      if (rawText) formData.append('rawText', rawText);
      if (demoType) formData.append('demoType', demoType);

      const res = await fetch(`${API_BASE}/scans`, {
        method: 'POST',
        body: formData,
      });
      return await handleResponse(res);
    }

    // JSON payload for demo or text extraction
    const res = await fetch(`${API_BASE}/scans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        demoType,
        rawText,
        productData,
      }),
    });
    return await handleResponse(res);
  },


  // Get scan history with filters
  async getScans({ search = '', status = 'ALL', sort = 'newest' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);
    if (sort) params.append('sort', sort);

    const res = await fetch(`${API_BASE}/scans?${params.toString()}`);
    return await handleResponse(res);
  },

  // Get single scan report by ID
  async getScanById(id) {
    const res = await fetch(`${API_BASE}/scans/${id}`);
    return await handleResponse(res);
  },

  // Get direct report download URL
  getReportDownloadUrl(id, format = 'txt') {
    return `${API_BASE}/scans/${id}/report?format=${format}`;
  },

  // Delete a scan
  async deleteScan(id) {
    const res = await fetch(`${API_BASE}/scans/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },

  // Get dashboard statistics
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return await handleResponse(res);
  },

  // Update compliance rule (Admin)
  async updateRule(id, updates) {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return await handleResponse(res);
  },

  // Create new compliance rule
  async createRule(ruleData) {
    const res = await fetch(`${API_BASE}/rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleData),
    });
    return await handleResponse(res);
  },

  // Delete compliance rule
  async deleteRule(id) {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },
};

export default api;
