/**
 * CSRF Token Management
 * Handles fetching and including CSRF tokens in requests
 */

// Store the CSRF token globally
let csrfToken = null;

/**
 * Fetch CSRF token from server
 * @returns {Promise<string>} The CSRF token
 */
async function fetchCsrfToken() {
  try {
    const response = await fetch('/csrf-token');
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Get current CSRF token (fetch if not available)
 * @returns {Promise<string>} The CSRF token
 */
async function getCsrfToken() {
  if (!csrfToken) {
    await fetchCsrfToken();
  }
  return csrfToken;
}

/**
 * Make a protected fetch request with CSRF token
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
async function protectedFetch(url, options = {}) {
  // Ensure we have a CSRF token
  const token = await getCsrfToken();
  
  // Add CSRF token to headers
  const headers = {
    ...options.headers,
    'X-CSRF-Token': token
  };
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // If we get a 403 (CSRF validation failed), try refreshing the token once
  if (response.status === 403) {
    console.log('CSRF token may be invalid, refreshing...');
    await fetchCsrfToken();
    
    // Retry the request with new token
    headers['X-CSRF-Token'] = csrfToken;
    return fetch(url, {
      ...options,
      headers
    });
  }
  
  return response;
}

// Fetch CSRF token when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchCsrfToken);
} else {
  fetchCsrfToken();
}

// Export functions for use in other scripts
window.csrfProtection = {
  getCsrfToken,
  protectedFetch,
  fetchCsrfToken
};

