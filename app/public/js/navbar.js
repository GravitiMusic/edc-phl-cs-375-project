// Navbar functionality
document.addEventListener('DOMContentLoaded', function() {
  const navbarToggle = document.querySelector('.navbar-toggle');
  const navbarMenu = document.querySelector('.navbar ul');
  const navbarProfileCircle = document.getElementById('navbarProfileCircle');
  const navbarDropdown = document.getElementById('navbarDropdown');

  // Mobile menu toggle
  if (navbarToggle) {
    navbarToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      navbarMenu.classList.toggle('active');
    });
  }

  // Profile dropdown toggle
  if (navbarProfileCircle) {
    navbarProfileCircle.addEventListener('click', function(e) {
      e.stopPropagation();
      navbarDropdown.classList.toggle('active');
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    const navbar = document.querySelector('.navbar');
    const isClickInside = navbar && navbar.contains(event.target);
    
    // Close mobile menu
    if (!isClickInside && navbarMenu && navbarMenu.classList.contains('active')) {
      navbarMenu.classList.remove('active');
    }

    // Close profile dropdown
    if (navbarDropdown && navbarDropdown.classList.contains('active')) {
      const isProfileClick = navbarProfileCircle && navbarProfileCircle.contains(event.target);
      const isDropdownClick = navbarDropdown.contains(event.target);
      
      if (!isProfileClick && !isDropdownClick) {
        navbarDropdown.classList.remove('active');
      }
    }
  });

  // Close mobile menu when clicking on a link
  const navLinks = document.querySelectorAll('.navbar ul li a');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (navbarMenu) {
        navbarMenu.classList.remove('active');
      }
    });
  });

  // Close dropdown when clicking on dropdown links
  const dropdownLinks = document.querySelectorAll('.navbar-dropdown-link');
  dropdownLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (navbarDropdown) {
        navbarDropdown.classList.remove('active');
      }
    });
  });

  // Fetch and display user info in navbar
  fetchNavbarUserInfo();
});

/**
 * Fetch user info and populate navbar profile
 */
async function fetchNavbarUserInfo() {
  const navbarProfileInitial = document.getElementById('navbarProfileInitial');
  const navbarDropdownUsername = document.getElementById('navbarDropdownUsername');

  if (!navbarProfileInitial || !navbarDropdownUsername) {
    return; // Elements don't exist on this page
  }

  try {
    const response = await fetch('/auth/me');
    const data = await response.json();

    if (data.authenticated && data.user) {
      const username = data.user.username;
      const firstLetter = username.charAt(0).toUpperCase();

      // Update profile circle with first letter
      navbarProfileInitial.textContent = firstLetter;

      // Update dropdown username
      navbarDropdownUsername.textContent = username;
    } else {
      // Not authenticated - show default
      navbarProfileInitial.textContent = 'U';
      navbarDropdownUsername.textContent = 'Guest';
    }
  } catch (error) {
    console.error('Error fetching user info for navbar:', error);
    navbarProfileInitial.textContent = 'U';
    navbarDropdownUsername.textContent = 'User';
  }
}

/**
 * Universal logout function for navbar
 * Used across all pages with navbar
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

