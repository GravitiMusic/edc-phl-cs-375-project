// Submission History Page Logic

let allSubmissions = [];
let allChallenges = [];
let filteredSubmissions = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadData();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/auth/profile');
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        // Navbar user info is handled by navbar.js
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/';
    }
}

// Load all data
async function loadData() {
    try {
        // Load submissions and challenges in parallel
        const [submissionsRes, challengesRes, statsRes] = await Promise.all([
            fetch('/submissions/history'),
            fetch('/challenges'),
            fetch('/submissions/stats/summary')
        ]);

        if (!submissionsRes.ok || !challengesRes.ok || !statsRes.ok) {
            throw new Error('Failed to load data');
        }

        const submissionsData = await submissionsRes.json();
        const challengesData = await challengesRes.json();
        const statsData = await statsRes.json();

        allSubmissions = submissionsData.submissions || [];
        allChallenges = challengesData.challenges || [];
        
        // Hide loading, show appropriate content
        document.getElementById('loading-spinner').style.display = 'none';
        
        if (allSubmissions.length === 0) {
            document.getElementById('no-submissions').style.display = 'block';
        } else {
            document.getElementById('submissions-table').style.display = 'table';
            populateChallengeFilter();
            updateStats(statsData.stats);
            applyFilters();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('loading-spinner').textContent = 'Error loading submissions. Please refresh the page.';
    }
}

// Update summary stats
function updateStats(stats) {
    document.getElementById('total-submissions').textContent = stats.total_submissions || 0;
    document.getElementById('successful-submissions').textContent = stats.successful_submissions || 0;
    
    const successRate = stats.total_submissions > 0 
        ? ((stats.successful_submissions / stats.total_submissions) * 100).toFixed(1)
        : 0;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('unique-solved').textContent = stats.unique_challenges_solved || 0;
}

// Populate challenge filter dropdown
function populateChallengeFilter() {
    const select = document.getElementById('filter-challenge');
    
    // Get unique challenges from submissions
    const uniqueChallenges = new Set(allSubmissions.map(s => s.challenge_id));
    
    uniqueChallenges.forEach(challengeId => {
        const challenge = allChallenges.find(c => c.id === challengeId);
        if (challenge) {
            const option = document.createElement('option');
            option.value = challengeId;
            option.textContent = challenge.title;
            select.appendChild(option);
        }
    });
}

// Apply filters
function applyFilters() {
    const challengeFilter = document.getElementById('filter-challenge').value;
    const difficultyFilter = document.getElementById('filter-difficulty').value;
    const statusFilter = document.getElementById('filter-status').value;

    filteredSubmissions = allSubmissions.filter(submission => {
        if (challengeFilter !== 'all' && submission.challenge_id != challengeFilter) return false;
        if (difficultyFilter !== 'all' && submission.difficulty !== difficultyFilter) return false;
        if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
        return true;
    });

    renderSubmissions();
}

// Render submissions table
function renderSubmissions() {
    const tbody = document.getElementById('submissions-body');
    tbody.innerHTML = '';

    if (filteredSubmissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No submissions match your filters.</td></tr>';
        return;
    }

    filteredSubmissions.forEach(submission => {
        const challenge = allChallenges.find(c => c.id === submission.challenge_id);
        const row = document.createElement('tr');
        
        const statusClass = getStatusClass(submission.status);
        const difficultyClass = getDifficultyClass(submission.difficulty);
        
        row.innerHTML = `
            <td>${challenge ? challenge.title : 'Unknown'}</td>
            <td><span class="badge ${difficultyClass}">${capitalizeFirst(submission.difficulty)}</span></td>
            <td><span class="badge ${statusClass}">${capitalizeFirst(submission.status)}</span></td>
            <td>${submission.tests_passed || 0}/${submission.total_tests || 0}</td>
            <td>${submission.points_awarded || 0}</td>
            <td>${submission.execution_time ? submission.execution_time + 'ms' : '-'}</td>
            <td>${formatDate(submission.submitted_at)}</td>
            <td><button class="btn-view" data-id="${submission.id}">View</button></td>
        `;
        
        tbody.appendChild(row);
    });

    // Add click handlers to view buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const submissionId = btn.getAttribute('data-id');
            viewSubmissionDetails(submissionId);
        });
    });
}

// View submission details in modal
async function viewSubmissionDetails(submissionId) {
    try {
        const response = await fetch(`/submissions/${submissionId}`);
        if (!response.ok) throw new Error('Failed to load submission details');
        
        const data = await response.json();
        const submission = data.submission;
        const challenge = allChallenges.find(c => c.id === submission.challenge_id);

        // Populate modal
        document.getElementById('detail-challenge').textContent = challenge ? challenge.title : 'Unknown';
        document.getElementById('detail-difficulty').innerHTML = `<span class="badge ${getDifficultyClass(submission.difficulty)}">${capitalizeFirst(submission.difficulty)}</span>`;
        document.getElementById('detail-status').innerHTML = `<span class="badge ${getStatusClass(submission.status)}">${capitalizeFirst(submission.status)}</span>`;
        document.getElementById('detail-tests').textContent = `${submission.tests_passed || 0}/${submission.total_tests || 0}`;
        document.getElementById('detail-time').textContent = submission.execution_time ? `${submission.execution_time}ms` : '-';
        document.getElementById('detail-memory').textContent = submission.memory_used ? `${submission.memory_used}KB` : '-';
        document.getElementById('detail-points').textContent = submission.points_awarded || 0;
        document.getElementById('detail-date').textContent = formatDateTime(submission.submitted_at);
        document.getElementById('detail-code').textContent = submission.source_code || 'No code available';

        // Show/hide error section
        const errorSection = document.getElementById('error-section');
        if (submission.error_message) {
            errorSection.style.display = 'block';
            document.getElementById('detail-error').textContent = submission.error_message;
        } else {
            errorSection.style.display = 'none';
        }

        // Display test results if available
        displayTestResults(submission.test_results);

        // Setup retry button
        const retryBtn = document.getElementById('retry-button');
        retryBtn.onclick = () => {
            window.location.href = `/pages/problem.html?id=${submission.challenge_id}`;
        };

        // Show modal
        document.getElementById('submission-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading submission details:', error);
        alert('Failed to load submission details. Please try again.');
    }
}

// Display test results
function displayTestResults(testResults) {
    const container = document.getElementById('detail-test-results');
    
    if (!testResults || typeof testResults !== 'object') {
        container.innerHTML = '<p>No test results available.</p>';
        return;
    }

    // Check if it's the new format (array of test results)
    if (Array.isArray(testResults)) {
        container.innerHTML = testResults.map((test, idx) => `
            <div class="test-result ${test.passed ? 'test-passed' : 'test-failed'}">
                <div class="test-header">
                    <span class="test-name">Test ${idx + 1}</span>
                    <span class="test-status">${test.passed ? '✓ Passed' : '✗ Failed'}</span>
                </div>
                ${test.input ? `<div class="test-detail"><strong>Input:</strong> ${test.input}</div>` : ''}
                ${test.expected ? `<div class="test-detail"><strong>Expected:</strong> ${test.expected}</div>` : ''}
                ${test.actual ? `<div class="test-detail"><strong>Actual:</strong> ${test.actual}</div>` : ''}
                ${test.error ? `<div class="test-detail error"><strong>Error:</strong> ${test.error}</div>` : ''}
            </div>
        `).join('');
    } else {
        // Legacy format or summary
        container.innerHTML = `<pre>${JSON.stringify(testResults, null, 2)}</pre>`;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navbar functionality is handled by navbar.js
    
    // Filter changes
    document.getElementById('filter-challenge').addEventListener('change', applyFilters);
    document.getElementById('filter-difficulty').addEventListener('change', applyFilters);
    document.getElementById('filter-status').addEventListener('change', applyFilters);
    
    // Reset filters
    document.getElementById('reset-filters').addEventListener('click', () => {
        document.getElementById('filter-challenge').value = 'all';
        document.getElementById('filter-difficulty').value = 'all';
        document.getElementById('filter-status').value = 'all';
        applyFilters();
    });

    // Modal close handlers
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('submission-modal').style.display = 'none';
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('submission-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Utility functions
function getStatusClass(status) {
    const classes = {
        'passed': 'status-passed',
        'failed': 'status-failed',
        'error': 'status-error',
        'timeout': 'status-timeout'
    };
    return classes[status] || 'status-default';
}

function getDifficultyClass(difficulty) {
    const classes = {
        'easy': 'difficulty-easy',
        'medium': 'difficulty-medium',
        'hard': 'difficulty-hard'
    };
    return classes[difficulty] || 'difficulty-default';
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
}

