document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('challenges-body');
  const searchInput = document.getElementById('search-input');
  const difficultyFilter = document.getElementById('difficulty-filter');

  if (!tbody) return;

  let allChallenges = [];

  // Fetch challenges on page load
  fetch('/challenges')
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.success) {
        tbody.innerHTML = '<tr><td colspan="3">Failed to load challenges.</td></tr>';
        return;
      }

      allChallenges = data.challenges || [];

      if (allChallenges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No challenges available.</td></tr>';
        return;
      }

      renderChallenges(allChallenges);

      // Add event listeners for filters
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          applyFilters();
        });
      }

      if (difficultyFilter) {
        difficultyFilter.addEventListener('change', () => {
          applyFilters();
        });
      }
    })
    .catch((err) => {
      console.error('Fetch challenges error:', err);
      tbody.innerHTML = '<tr><td colspan="3">Error loading challenges.</td></tr>';
    });

  /**
   * Apply search and difficulty filters
   */
  function applyFilters() {
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const selectedDifficulty = difficultyFilter?.value || '';

    const filtered = allChallenges.filter((c) => {
      const matchesSearch = c.title?.toLowerCase().includes(searchTerm) || false;
      const matchesDifficulty = selectedDifficulty === '' || c.difficulty === selectedDifficulty;

      return matchesSearch && matchesDifficulty;
    });

    renderChallenges(filtered);
  }

  /**
   * Render challenges to the table
   */
  function renderChallenges(challenges) {
    if (challenges.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No challenges match your filters.</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    challenges.forEach((c) => {
      const tr = document.createElement('tr');

      const titleTd = document.createElement('td');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = c.title || '(no title)';
      // Future: link to challenge detail page
      titleTd.appendChild(link);

      const difficultyTd = document.createElement('td');
      const difficulty = c.difficulty || '';
      const difficultyBadge = document.createElement('span');
      difficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      
      // Add class based on difficulty level
      if (difficulty === 'easy') {
        difficultyBadge.className = 'difficulty-easy';
      } else if (difficulty === 'medium') {
        difficultyBadge.className = 'difficulty-medium';
      } else if (difficulty === 'hard') {
        difficultyBadge.className = 'difficulty-hard';
      }
      
      difficultyTd.appendChild(difficultyBadge);

      const createdTd = document.createElement('td');
      const created = c.created_at ? new Date(c.created_at) : null;
      createdTd.textContent = created ? created.toLocaleString() : '';

      tr.appendChild(titleTd);
      tr.appendChild(difficultyTd);
      tr.appendChild(createdTd);

      tbody.appendChild(tr);
    });
  }
});
