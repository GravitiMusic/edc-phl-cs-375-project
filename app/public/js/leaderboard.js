let leaderboardBody = document.getElementById("leaderboard-body");
let leaderboardDesc = document.getElementById("leaderboard-desc");
let sortBySelect = document.getElementById("sort-by-select");

let allLeaderboardData = [];
let currentSortField = 'total_points'; // Default sort by total points

document.addEventListener('DOMContentLoaded', () => {
  // Add event listener for sort dropdown
  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      currentSortField = e.target.value;
      sortAndRender();
      updateHeaderHighlight();
    });
  }
  
  // Initial fetch
  fetchAllStats();
});

async function fetchAllStats() {
  try {
    const response = await fetch('/stats/allStats');
    const data = await response.json();

    if (response.ok) {
        allLeaderboardData = data;
        sortAndRender();
        updateHeaderHighlight();
    } else {
        leaderboardDesc.textContent = data.error;
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    leaderboardDesc.textContent = 'Error loading leaderboard';
  }
}

function sortAndRender() {
  // Sort the data by the current sort field in descending order (highest first)
  const sorted = [...allLeaderboardData].sort((a, b) => {
    const aValue = a[currentSortField];
    const bValue = b[currentSortField];
    
    // Numeric comparison (descending - higher values first)
    return bValue - aValue;
  });
  
  populateLeaderboard(sorted);
}

function updateHeaderHighlight() {
  // Remove highlight from all headers
  const headers = document.querySelectorAll('.leaderboard-table thead th');
  headers.forEach(header => {
    header.classList.remove('sort-active');
  });
  
  // Map sort field to column index
  const fieldToColumnIndex = {
    'total_points': 2,      // Total Points column
    'challenges_completed': 3,  // Challenges Completed column
    'day_streak': 4          // Day Streak column
  };
  
  const columnIndex = fieldToColumnIndex[currentSortField];
  if (columnIndex !== undefined) {
    const headerCells = document.querySelectorAll('.leaderboard-table thead th');
    if (headerCells[columnIndex]) {
      headerCells[columnIndex].classList.add('sort-active');
    }
  }
}

async function populateLeaderboard(userData) {
    leaderboardBody.replaceChildren();
    for (let i = 0; i < userData.length; i++) {
        let stats = userData[i];
        let tr = document.createElement("tr");

        let rankTd = document.createElement("td");
        rankTd.classList.add("rank");
        // Display position in current sorted list (1-indexed)
        rankTd.textContent = i + 1;
        tr.appendChild(rankTd);

        let usernameTd = document.createElement("td");
        usernameTd.textContent = stats.username;
        tr.appendChild(usernameTd);

        let pointsTd = document.createElement("td");
        pointsTd.textContent = stats.total_points;
        tr.appendChild(pointsTd);

        let challengesTd = document.createElement("td");
        challengesTd.textContent = stats.challenges_completed;
        tr.appendChild(challengesTd);

        let streakTd = document.createElement("td");
        streakTd.textContent = stats.day_streak;
        tr.appendChild(streakTd);

        let lastActiveTd = document.createElement("td");
        lastActiveTd.textContent = stats.last_login.split('T')[0] + ' ' + new Date(stats.last_login).toLocaleTimeString();
        tr.appendChild(lastActiveTd);

        leaderboardBody.appendChild(tr);
    }
}