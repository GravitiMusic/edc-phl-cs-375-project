// Get all navigation items
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Function to switch tabs
function switchTab(tabName) {
  // Remove active class from all nav items and tab contents
  navItems.forEach(item => item.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // Add active class to clicked nav item
  const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add('active');
  }
  
  // Show corresponding tab content
  const activeContent = document.getElementById(tabName);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

// Add click event listeners to navigation items
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabName = item.getAttribute('data-tab');
    switchTab(tabName);
  });
});

// Handle edit button clicks
const editButtons = document.querySelectorAll('.edit-button');
editButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const settingLabel = e.target.closest('.setting-item').querySelector('label').textContent;
    alert(`Edit ${settingLabel} - This would open an edit form`);
  });
});

// Handle expandable items
const expandableItems = document.querySelectorAll('.expandable-item');
expandableItems.forEach(item => {
  item.addEventListener('click', () => {
    alert('This section would expand to show more options');
  });
});

// Handle card links
const cardLinks = document.querySelectorAll('.card-link');
cardLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const linkText = e.target.textContent;
    alert(`Navigating to: ${linkText}`);
  });
});

// Handle primary button clicks
const primaryButtons = document.querySelectorAll('.primary-button');
primaryButtons.forEach(button => {
  button.addEventListener('click', () => {
    alert('Privacy Checkup feature would start here');
  });
});

// Optional: Handle keyboard navigation
document.addEventListener('keydown', (e) => {
  const currentActiveNav = document.querySelector('.nav-item.active');
  const currentIndex = Array.from(navItems).indexOf(currentActiveNav);
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextIndex = (currentIndex + 1) % navItems.length;
    const nextTab = navItems[nextIndex].getAttribute('data-tab');
    switchTab(nextTab);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + navItems.length) % navItems.length;
    const prevTab = navItems[prevIndex].getAttribute('data-tab');
    switchTab(prevTab);
  }
});

