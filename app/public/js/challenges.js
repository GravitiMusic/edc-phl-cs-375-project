document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('challenges-body');
  const searchInput = document.getElementById('search-input');
  const completionFilter = document.getElementById('completion-filter');

  if (!tbody) return;

  let allChallenges = [];

  // Fetch challenges on page load
  fetch('/challenges')
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.success) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Failed to load challenges.</td></tr>';
        return;
      }

      allChallenges = data.challenges || [];

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

      // Make entire row clickable
      tr.addEventListener('click', () => {
        window.location.href = `/pages/problem.html?id=${c.id}`;
      });

      // Title column
      const titleTd = document.createElement('td');
      titleTd.className = 'challenge-title-cell';
      titleTd.textContent = c.title || '(no title)';

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
