/**
 * Account Settings JavaScript
 * Handles profile loading, editing, and saving
 */

// Store current user data
let currentUserData = {};

// Load user profile when page loads
document.addEventListener('DOMContentLoaded', function() {
  loadUserProfile();
  setupTabNavigation();
});

/**
 * Load user profile from server
 */
async function loadUserProfile() {
  const loadingEl = document.getElementById('loadingProfile');
  const contentEl = document.getElementById('profileContent');

  try {
    const response = await fetch('/auth/profile');
    const data = await response.json();

    if (response.ok && data.success) {
      currentUserData = data.user;
      displayUserProfile(data.user);
      
      // Hide loading, show content
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } else {
      throw new Error(data.error || 'Failed to load profile');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    loadingEl.textContent = 'Failed to load profile. Please refresh the page.';
  }
}

/**
 * Display user profile data
 */
function displayUserProfile(user) {
  document.getElementById('displayName').textContent = user.name || 'Not set';
  document.getElementById('displayUsername').textContent = user.username || '-';
  document.getElementById('displayEmail').textContent = user.email || 'Not set';
  document.getElementById('displayPhone').textContent = user.phone || 'Not set';
  
  // Set input values for editing
  document.getElementById('editName').value = user.name || '';
  document.getElementById('editUsername').value = user.username || '';
  document.getElementById('editEmail').value = user.email || '';
  document.getElementById('editPhone').value = user.phone || '';
}

/**
 * Toggle edit mode for a field
 */
function toggleEdit(field) {
  const displayEl = document.getElementById(`display${capitalize(field)}`);
  const inputEl = document.getElementById(`edit${capitalize(field)}`);
  const settingItem = document.querySelector(`[data-field="${field}"]`);
  const editButton = settingItem.querySelector('.edit-button');
  const editActions = settingItem.querySelector('.edit-actions');
  
  // Hide display, show input
  displayEl.style.display = 'none';
  inputEl.style.display = 'block';
  inputEl.focus();
  
  // Hide edit button, show save/cancel
  editButton.style.display = 'none';
  editActions.style.display = 'flex';
}

/**
 * Cancel edit mode for a field
 */
function cancelEdit(field) {
  const displayEl = document.getElementById(`display${capitalize(field)}`);
  const inputEl = document.getElementById(`edit${capitalize(field)}`);
  const settingItem = document.querySelector(`[data-field="${field}"]`);
  const editButton = settingItem.querySelector('.edit-button');
  const editActions = settingItem.querySelector('.edit-actions');
  
  // Reset input to original value
  inputEl.value = currentUserData[field] || '';
  
  // Show display, hide input
  displayEl.style.display = 'block';
  inputEl.style.display = 'none';
  
  // Show edit button, hide save/cancel
  editButton.style.display = 'block';
  editActions.style.display = 'none';
}

/**
 * Save a field
 */
async function saveField(field) {
  const inputEl = document.getElementById(`edit${capitalize(field)}`);
  const newValue = inputEl.value.trim();
  
  // Validate
  if (field === 'username' && !newValue) {
    alert('Username cannot be empty');
    return;
  }
  
  if (field === 'email' && !newValue) {
    alert('Email cannot be empty');
    return;
  }

  // Show loading state
  const settingItem = document.querySelector(`[data-field="${field}"]`);
  const saveButton = settingItem.querySelector('.save-button');
  const originalText = saveButton.textContent;
  saveButton.textContent = 'Saving...';
  saveButton.disabled = true;

  try {
    const response = await fetch('/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        [field]: newValue || null
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Update current user data
      currentUserData = data.user;
      
      // Update display
      const displayEl = document.getElementById(`display${capitalize(field)}`);
      displayEl.textContent = newValue || 'Not set';
      
      // Exit edit mode
      cancelEdit(field);
      
      console.log(`✅ ${capitalize(field)} updated successfully`);
      
      // Show success message briefly
      showNotification('Changes saved successfully!', 'success');
      
      // Update navbar if username changed
      if (field === 'username') {
        const navbarUsername = document.getElementById('navbarDropdownUsername');
        const navbarInitial = document.getElementById('navbarProfileInitial');
        if (navbarUsername) navbarUsername.textContent = newValue;
        if (navbarInitial) navbarInitial.textContent = newValue.charAt(0).toUpperCase();
      }
    } else {
      throw new Error(data.error || 'Failed to update');
    }
  } catch (error) {
    console.error(`Error updating ${field}:`, error);
    alert(error.message || `Failed to update ${field}. Please try again.`);
  } finally {
    saveButton.textContent = originalText;
    saveButton.disabled = false;
  }
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Remove active from all
      navItems.forEach(nav => nav.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));
      
      // Add active to clicked
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

/**
 * Toggle password change form
 */
function togglePasswordChange() {
  const form = document.getElementById('passwordChangeForm');
  if (form.style.display === 'none') {
    form.style.display = 'block';
  } else {
    form.style.display = 'none';
  }
}

/**
 * Cancel password change
 */
function cancelPasswordChange() {
  const form = document.getElementById('passwordChangeForm');
  form.style.display = 'none';
  
  // Clear inputs
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  
  // Hide message
  const message = document.getElementById('passwordMessage');
  message.className = 'message';
  message.textContent = '';
}

/**
 * Change password
 */
async function changePassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const messageEl = document.getElementById('passwordMessage');
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showPasswordMessage('Please fill in all fields', 'error');
    return;
  }
  
  // Validate password strength (must match backend requirements)
  if (newPassword.length < 8) {
    showPasswordMessage('Password must be at least 8 characters long', 'error');
    return;
  }
  
  if (!/[A-Z]/.test(newPassword)) {
    showPasswordMessage('Password must contain at least one uppercase letter', 'error');
    return;
  }
  
  if (!/[a-z]/.test(newPassword)) {
    showPasswordMessage('Password must contain at least one lowercase letter', 'error');
    return;
  }
  
  if (!/[0-9]/.test(newPassword)) {
    showPasswordMessage('Password must contain at least one number', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showPasswordMessage('New passwords do not match', 'error');
    return;
  }
  
  // Show loading
  const button = document.querySelector('#passwordChangeForm .primary-button');
  const originalText = button.textContent;
  button.textContent = 'Updating...';
  button.disabled = true;
  
  try {
    const response = await fetch('/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      showPasswordMessage('Password updated successfully!', 'success');
      
      // Clear form after delay
      setTimeout(() => {
        cancelPasswordChange();
      }, 2000);
    } else {
      throw new Error(data.error || 'Failed to update password');
    }
  } catch (error) {
    console.error('Error updating password:', error);
    showPasswordMessage(error.message, 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

/**
 * Show password message
 */
function showPasswordMessage(message, type) {
  const messageEl = document.getElementById('passwordMessage');
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background-color: ${type === 'success' ? '#e6f4ea' : '#fce8e6'};
    color: ${type === 'success' ? '#137333' : '#c5221f'};
    border: 1px solid ${type === 'success' ? '#c6e8d0' : '#f4c7c3'};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
