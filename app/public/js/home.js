/**
 * Home Page JavaScript
 * Fetches and displays user info from session
 */

// Check if user is logged in when page loads
async function checkAuth() {
  try {
    const response = await fetch('/auth/me');
    const data = await response.json();

    if (data.authenticated) {
      // User is logged in - show their info
      displayUserInfo(data.user);
    } else {
      // Not logged in - redirect to login page
      console.log('Not authenticated, redirecting to login...');
      window.location.href = '/pages/login.html';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    window.location.href = '/pages/login.html';
  }
}

/**
 * Display user information on the page
 */
function displayUserInfo(user) {
  // Hide loading, show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  // Fill in user info
  document.getElementById('userId').textContent = user.id;
  document.getElementById('username').textContent = user.username;

  console.log('✅ User info loaded:', user);
}

/**
 * Go to account settings page
 */
function goToAccount() {
  window.location.href = '/pages/account-settings.html';
}

/**
 * Log out the user
 */
async function logout() {
  // Confirm logout
  if (!confirm('Are you sure you want to log out?')) {
    return;
  }

  try {
    console.log('Logging out...');
    
    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Logged out successfully');
      window.location.href = '/pages/login.html';
    } else {
      console.error('Logout failed:', data.error);
      alert('Failed to log out. Please try again.');
    }
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to log out. Please try again.');
  }
}

// Check authentication when page loads
checkAuth();

