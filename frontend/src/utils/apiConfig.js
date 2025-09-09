// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://htnguonsong.com' // Backend API server
  : ''; // Empty string sẽ sử dụng proxy trong development

export const API_ENDPOINTS = {
  SONGS: `${API_BASE_URL}/api/songs`,
  SONG_VIEW: `${API_BASE_URL}/api/songs/view`,
  // Thêm các endpoint khác nếu cần
};

// Helper function để build API URL với params
export const buildApiUrl = (endpoint, params = {}) => {
  let url;
  
  // Nếu endpoint là relative URL và trong development, sử dụng current origin
  if (endpoint.startsWith('/') && process.env.NODE_ENV === 'development') {
    url = new URL(endpoint, window.location.origin);
  } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    // Endpoint đã có protocol
    url = new URL(endpoint);
  } else {
    // Fallback: sử dụng current origin
    url = new URL(endpoint, window.location.origin);
  }
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Fetch wrapper với error handling
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      mode: 'cors',
      credentials: 'omit',
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Silent fail in production
    throw error;
  }
};
