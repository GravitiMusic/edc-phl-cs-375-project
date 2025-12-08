document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('challenges-body');
  const searchInput = document.getElementById('search-input');
  const completionFilter = document.getElementById('completion-filter');

  if (!tbody) return;

  let allChallenges = [];
  let dailyChallengeData = null; // Store today's daily challenge

  // Fetch today's daily challenge and all challenges
  Promise.all([
    fetch('/api/daily-challenge').then(res => res.json()).catch(() => null),
    fetch('/challenges').then(res => res.json())
  ])
    .then(([dailyData, challengesData]) => {
      // Store daily challenge data
      if (dailyData && dailyData.success) {
        dailyChallengeData = dailyData;
        console.log('✅ Daily challenge loaded:', dailyData.challenge.title);
        
        // Show and populate the daily challenge banner
        showDailyChallengeBanner(dailyData);
      }

      // Handle challenges data
      if (!challengesData || !challengesData.success) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Failed to load challenges.</td></tr>';
        return;
      }

      allChallenges = challengesData.challenges || [];

      if (allChallenges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No challenges available.</td></tr>';
        return;
      }

      renderChallenges(allChallenges);

      // Add event listeners for filters
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          applyFilters();
        });
      }

      if (completionFilter) {
        completionFilter.addEventListener('change', () => {
          applyFilters();
        });
      }
    })
    .catch((err) => {
      console.error('Fetch challenges error:', err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #ef4444;">Error loading challenges.</td></tr>';
    });

  /**
   * Show and populate the daily challenge banner
   */
  function showDailyChallengeBanner(data) {
    const banner = document.getElementById('daily-challenge-banner');
    const titleEl = document.getElementById('daily-challenge-title');
    const bonusEl = document.getElementById('daily-challenge-bonus');
    const startBtn = document.getElementById('start-daily-challenge-btn');
    
    if (!banner || !titleEl || !bonusEl || !startBtn) return;
    
    // Populate banner
    titleEl.textContent = data.challenge.title;
    
    if (data.bonus.available) {
      bonusEl.textContent = `💰 ${data.bonus.message}`;
      bonusEl.style.color = '#10b981';
      bonusEl.style.fontWeight = '600';
    } else {
      bonusEl.textContent = '✓ Already completed';
      bonusEl.style.color = '#6b7280';
    }
    
    // Show banner
    banner.style.display = 'block';
    
    // Add click handler to start button
    startBtn.addEventListener('click', () => {
      window.location.href = '/pages/home.html';
    });
    
    // Add hover effects
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.transform = 'translateY(-2px)';
      startBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });
    
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.transform = 'translateY(0)';
      startBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    });
  }

  /**
   * Apply search and completion filters
   */
  function applyFilters() {
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const completionStatus = completionFilter?.value || '';

    const filtered = allChallenges.filter((c) => {
      const matchesSearch = c.title?.toLowerCase().includes(searchTerm) || 
                           c.description?.toLowerCase().includes(searchTerm) || false;
      
      // Filter by completion status
      if (completionStatus === 'completed') {
        return matchesSearch && c.completions.easy && c.completions.medium && c.completions.hard;
      } else if (completionStatus === 'partial') {
        const hasAny = c.completions.easy || c.completions.medium || c.completions.hard;
        const hasAll = c.completions.easy && c.completions.medium && c.completions.hard;
        return matchesSearch && hasAny && !hasAll;
      } else if (completionStatus === 'incomplete') {
        return matchesSearch && !c.completions.easy && !c.completions.medium && !c.completions.hard;
      }

      return matchesSearch;
    });

    renderChallenges(filtered);
  }

  /**
   * Render challenges to the table
   */
  function renderChallenges(challenges) {
    if (challenges.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No challenges match your filters.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    challenges.forEach((c) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-challenge-id', c.id);
      tr.style.cursor = 'pointer';

      // Check if this is today's daily challenge
      const isDailyChallenge = dailyChallengeData && 
                               dailyChallengeData.challenge.id === c.id;

      // Highlight daily challenge row
      if (isDailyChallenge) {
        tr.style.backgroundColor = '#fef3c7'; // Light yellow highlight
        tr.style.borderLeft = '4px solid #f59e0b'; // Orange border
      }

      // Make entire row clickable
      tr.addEventListener('click', () => {
        // If it's the daily challenge, go to home page instead
        if (isDailyChallenge) {
          window.location.href = `/pages/home.html`;
        } else {
          window.location.href = `/pages/problem.html?id=${c.id}`;
        }
      });

      // Title column with daily challenge badge
      const titleTd = document.createElement('td');
      titleTd.className = 'challenge-title-cell';
      
      if (isDailyChallenge) {
        const badge = document.createElement('span');
        badge.style.cssText = `
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          margin-right: 8px;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        badge.textContent = '⭐ Today\'s Daily';
        titleTd.appendChild(badge);
        
        // Add bonus indicator if available
        if (dailyChallengeData.bonus.available) {
          const bonusBadge = document.createElement('span');
          bonusBadge.style.cssText = `
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            margin-right: 8px;
          `;
          bonusBadge.textContent = '💰 +50 Bonus';
          bonusBadge.title = dailyChallengeData.bonus.message;
          titleTd.appendChild(bonusBadge);
        }
      }
      
      const titleText = document.createElement('span');
      titleText.textContent = c.title || '(no title)';
      titleTd.appendChild(titleText);

      // Easy column
      const easyTd = document.createElement('td');
      easyTd.style.textAlign = 'center';
      easyTd.innerHTML = createCheckmark(c.completions.easy, 'Easy', 'Fix Broken Code');

      // Medium column
      const mediumTd = document.createElement('td');
      mediumTd.style.textAlign = 'center';
      mediumTd.innerHTML = createCheckmark(c.completions.medium, 'Medium', 'Implement Solution');

      // Hard column
      const hardTd = document.createElement('td');
      hardTd.style.textAlign = 'center';
      hardTd.innerHTML = createCheckmark(c.completions.hard, 'Hard', 'Optimize Code');

      // Description column with toggle
      const descriptionTd = document.createElement('td');
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'toggle-description-btn';
      toggleBtn.textContent = 'Show';
      toggleBtn.setAttribute('aria-label', `Toggle description for ${c.title}`);

      // Prevent row click when clicking the button
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const descRow = document.getElementById(`desc-row-${c.id}`);
        if (descRow) {
          descRow.classList.toggle('active');
          toggleBtn.classList.toggle('active');
          toggleBtn.textContent = descRow.classList.contains('active') ? 'Hide' : 'Show';
        }
      });

      descriptionTd.appendChild(toggleBtn);

      tr.appendChild(titleTd);
      tr.appendChild(easyTd);
      tr.appendChild(mediumTd);
      tr.appendChild(hardTd);
      tr.appendChild(descriptionTd);

      tbody.appendChild(tr);

      // Create hidden description row
      const descRow = document.createElement('tr');
      descRow.id = `desc-row-${c.id}`;
      descRow.className = 'description-row';
      const descTd = document.createElement('td');
      descTd.setAttribute('colspan', '5');
      const descContent = document.createElement('div');
      descContent.className = 'description-content';
      descContent.textContent = c.description || '(no description available)';
      descTd.appendChild(descContent);
      descRow.appendChild(descTd);
      tbody.appendChild(descRow);
    });
  }

  /**
   * Create checkmark HTML for completion status
   */
  function createCheckmark(completed, difficulty, description) {
    if (completed) {
      return `<span class="completion-checkmark completed" title="${difficulty}: ${description} - Completed">✓</span>`;
    } else {
      return `<span class="completion-checkmark incomplete" title="${difficulty}: ${description} - Not Started">○</span>`;
    }
  }
});
