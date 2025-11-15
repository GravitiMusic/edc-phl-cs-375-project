let leaderboardBody = document.getElementById("leaderboard-body");
let leaderboardDesc = document.getElementById("leaderboard-desc");

fetchAllStats();

async function fetchAllStats() {
  try {
    const response = await fetch('/stats/allStats');
    const data = await response.json();

    if (response.ok) {
        populateLeaderboard(data);
    } else {
        leaderboardDesc.textContent = data.error;
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

async function populateLeaderboard(userData) {
    leaderboardBody.replaceChildren();
    for (let i = 0; i < userData.length; i++) {
        let stats = userData[i];
        let tr = document.createElement("tr");

        let rankTd = document.createElement("td");
        rankTd.classList.add("rank");
        rankTd.textContent = stats.rank;
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