/**
 * Statistics Page JavaScript
 * Loads and displays user statistics
 */

document.addEventListener('DOMContentLoaded', () => {
  loadStatistics();
});

/**
 * Load all statistics
 */
async function loadStatistics() {
  try {
    // Fetch both user stats and submission summary in parallel
    const [userResponse, submissionResponse] = await Promise.all([
      fetch('/stats/me'),
      fetch('/submissions/stats/summary')
    ]);

    if (!userResponse.ok || !submissionResponse.ok) {
      throw new Error('Failed to fetch statistics');
    }

    const userData = await userResponse.json();
    const submissionData = await submissionResponse.json();

    if (userData.success && submissionData.success) {
      displayStatistics(userData.stats, submissionData.stats);
      
      // Hide loading, show content
      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'block';
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.getElementById('loading').innerHTML = `
      <div class="error-message">
        <p>❌ Failed to load statistics</p>
        <button onclick="location.reload()" class="btn-retry">Retry</button>
      </div>
    `;
  }
}

/**
 * Display statistics on the page
 */
function displayStatistics(userStats, submissionStats) {
  // Overview Cards
  document.getElementById('userRank').textContent = userStats.rank ? `#${userStats.rank}` : 'Unranked';
  document.getElementById('totalPoints').textContent = userStats.total_points || 0;
  document.getElementById('challengesCompleted').textContent = userStats.challenges_completed || 0;
  document.getElementById('dayStreak').textContent = userStats.day_streak || 0;

  // Difficulty Breakdown
  document.getElementById('easyCompleted').textContent = userStats.easy_completed || 0;
  document.getElementById('mediumCompleted').textContent = userStats.medium_completed || 0;
  document.getElementById('hardCompleted').textContent = userStats.hard_completed || 0;

  // Submission Statistics
  const totalSubmissions = parseInt(submissionStats.total_submissions) || 0;
  const successfulSubmissions = parseInt(submissionStats.successful_submissions) || 0;
  const successRate = totalSubmissions > 0 
    ? Math.round((successfulSubmissions / totalSubmissions) * 100) 
    : 0;

  document.getElementById('totalSubmissions').textContent = totalSubmissions;
  document.getElementById('successfulSubmissions').textContent = successfulSubmissions;
  document.getElementById('successRate').textContent = `${successRate}%`;

  // Average execution time
  const avgTime = submissionStats.avg_execution_time;
  if (avgTime !== null && avgTime !== undefined) {
    document.getElementById('avgExecutionTime').textContent = `${Math.round(avgTime)}ms`;
  } else {
    document.getElementById('avgExecutionTime').textContent = 'N/A';
  }

  // Account Information
  document.getElementById('username').textContent = userStats.username || 'Unknown';
  
  if (userStats.created_at) {
    const createdDate = new Date(userStats.created_at);
    document.getElementById('memberSince').textContent = createdDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (userStats.last_login) {
    const lastLoginDate = new Date(userStats.last_login);
    document.getElementById('lastLogin').textContent = formatRelativeTime(lastLoginDate);
  }

  if (submissionStats.first_submission) {
    const firstSubDate = new Date(submissionStats.first_submission);
    document.getElementById('firstSubmission').textContent = firstSubDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    document.getElementById('firstSubmission').textContent = 'No submissions yet';
  }

  if (submissionStats.last_submission) {
    const lastSubDate = new Date(submissionStats.last_submission);
    document.getElementById('lastSubmission').textContent = formatRelativeTime(lastSubDate);
  } else {
    document.getElementById('lastSubmission').textContent = 'No submissions yet';
  }

  // Progress Bar (milestones at 100, 250, 500, 1000, etc.)
  // const points = userStats.total_points || 0;
  // const milestones = [100, 250, 500, 1000, 2500, 5000, 10000];
  // let nextMilestone = milestones.find(m => m > points) || (Math.ceil(points / 10000) + 1) * 10000;
  // let prevMilestone = milestones.filter(m => m <= points).pop() || 0;
  
  // const progress = ((points - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
  
  // document.getElementById('progressText').textContent = `${points} / ${nextMilestone} points`;
  // document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;

  // Add color to rank card based on rank
  const rankCard = document.querySelector('.rank-card');
  if (userStats.rank <= 10) {
    rankCard.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  } else if (userStats.rank <= 50) {
    rankCard.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  } else if (userStats.rank <= 100) {
    rankCard.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
  }
}

/**
 * Format date as relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

