/**
 * Home Page JavaScript - Modern & Feature Rich
 * Handles authentication, CodeMirror editor, and daily challenge
 */

import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript";
import { java } from "https://esm.sh/@codemirror/lang-java";
import { cpp } from "https://esm.sh/@codemirror/lang-cpp";

let editor = null;
let currentLanguageId = 71; // Default to Python

// Language configurations
const languageConfigs = {
  71: { name: 'Python', extension: python(), defaultCode: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n\n# Test your code\nnums = [2, 7, 11, 15]\ntarget = 9\nprint(two_sum(nums, target))' },
  63: { name: 'JavaScript', extension: javascript(), defaultCode: 'function twoSum(nums, target) {\n    // Write your solution here\n}\n\n// Test your code\nconst nums = [2, 7, 11, 15];\nconst target = 9;\nconsole.log(twoSum(nums, target));' },
  62: { name: 'Java', extension: java(), defaultCode: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n    \n    public static void main(String[] args) {\n        Solution sol = new Solution();\n        int[] nums = {2, 7, 11, 15};\n        int target = 9;\n        int[] result = sol.twoSum(nums, target);\n        System.out.println(java.util.Arrays.toString(result));\n    }\n}' },
  50: { name: 'C', extension: cpp(), defaultCode: '#include <stdio.h>\n\nvoid two_sum(int* nums, int numsSize, int target) {\n    // Write your solution here\n}\n\nint main() {\n    int nums[] = {2, 7, 11, 15};\n    int target = 9;\n    two_sum(nums, 4, target);\n    return 0;\n}' },
  54: { name: 'C++', extension: cpp(), defaultCode: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here\n    return {};\n}\n\nint main() {\n    vector<int> nums = {2, 7, 11, 15};\n    int target = 9;\n    vector<int> result = twoSum(nums, target);\n    for (int i : result) {\n        cout << i << " ";\n    }\n    return 0;\n}' }
};

/**
 * Initialize the CodeMirror editor
 */
function initializeEditor() {
  const editorContainer = document.getElementById('codeEditor');
  
  editor = new EditorView({
    state: EditorState.create({
      doc: `def subtract_numbers(a, b):
    """
    This function should subtract b from a.
    Right now it performs the wrong operation.
    Fix the line below.
    """
    result = a + b  # TODO: change this to subtract instead of add
    return result
`,
      extensions: [basicSetup, languageConfigs[71].extension], //python
    }),
    parent: editorContainer,
  });

  console.log('✅ Code editor initialized');
}

/**
 * Change programming language
 */
function changeLanguage(languageId) {
  currentLanguageId = parseInt(languageId);
  const config = languageConfigs[currentLanguageId];
  
  if (!config) {
    console.error('Unknown language ID:', languageId);
    return;
  }

  // Destroy old editor
  if (editor) {
    editor.destroy();
  }

  // Create new editor with appropriate language
  const editorContainer = document.getElementById('codeEditor');
  editor = new EditorView({
    state: EditorState.create({
      doc: config.defaultCode,
      extensions: [basicSetup, config.extension],
    }),
    parent: editorContainer,
  });

  console.log(`✅ Switched to ${config.name}`);
}

/**
 * Run the code
 */
async function runCode() {
  const code = editor.state.doc.toString();
  const outputEl = document.getElementById('codeOutput');
  const runBtn = document.getElementById('runCodeBtn');
  
  // Disable button and show loading
  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="btn-icon">⏳</span>Running...';
  outputEl.textContent = "⏳ Your code is being executed...";

  try {
    const response = await window.csrfProtection.protectedFetch("/challenge/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: currentLanguageId,   // e.g. 71 for Python
        challengeId: "easy_subtract",     // TODO: swap this for your real challenge id/slug
      }),
    });

    // Check if user is authenticated
    if (response.status === 401) {
      outputEl.textContent = "🔒 You must be logged in to run code. Redirecting...";
      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 2000);
      return;
    }

    const result = await response.json();

    // Expecting backend to send something like:
    // { summary: "3/3 tests passed", raw_stdout: "...", error: null }
    if (result.summary) {
      outputEl.textContent = `✅ ${result.summary}`;
    } else if (result.error) {
      outputEl.textContent = "⚠️ Error while running tests:\n\n" + result.error;
    } else {
      outputEl.textContent = "❓ No summary received from challenge runner.";
    }
  } catch (err) {
    outputEl.textContent = "❌ Request failed:\n\n" + err.message;
    console.error('Error running code:', err);
  } finally {
    // Re-enable button
    runBtn.disabled = false;
    runBtn.innerHTML = '<span class="btn-icon">▶</span>Run Code';
  }
}

/**
 * Submit the solution
 */
async function submitSolution() {
  const code = editor.state.doc.toString();
  const submitBtn = document.getElementById('submitCodeBtn');
  
  if (!code.trim()) {
    alert('Please write some code before submitting!');
    return;
  }

  // Disable button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Submitting...';

  try {
    // For now, just show a success message
    // In the future, this would submit to your backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('🎉 Solution submitted successfully!\n\nThis is a placeholder. In the full version, your solution would be tested against multiple test cases.');
    
    console.log('✅ Solution submitted');
  } catch (err) {
    alert('Failed to submit solution. Please try again.');
    console.error('Error submitting solution:', err);
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-icon">✓</span>Submit Solution';
  }
}

/**
 * Format and display the current date
 */
function displayChallengeDate() {
  const dateEl = document.getElementById('challengeDate');
  const today = new Date();
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  dateEl.textContent = today.toLocaleDateString('en-US', options);
}

/**
 * Check if user is logged in when page loads
 */
async function checkAuth() {
  try {
    const response = await fetch('/auth/me');
    const data = await response.json();

    if (data.authenticated) {
      // User is logged in - show their info
      displayUserInfo(data.user);
    } else {
      // Not logged in - redirect to login page
      console.log('Not authenticated, redirecting to login...');
      window.location.href = '/pages/login.html';
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    window.location.href = '/pages/login.html';
  }
}

/**
 * Display user information on the page
 */
function displayUserInfo(user) {
  // Hide loading, show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  // Display username in hero section
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay) {
    usernameDisplay.textContent = user.username;
  }

  // Initialize the editor now that the page is visible
  initializeEditor();
  displayChallengeDate();

  // Set up event listeners
  setupEventListeners();

  // In the future, fetch user stats from API
  // For now, showing placeholder data
  updateStats({
    challengesCompleted: 0,
    currentStreak: 0,
    totalPoints: 0,
    userRank: 'N/A'
  });

  console.log('✅ User info loaded:', user);
}

/**
 * Update user statistics
 */
function updateStats(stats) {
  document.getElementById('challengesCompleted').textContent = stats.challengesCompleted;
  document.getElementById('currentStreak').textContent = stats.currentStreak;
  document.getElementById('totalPoints').textContent = stats.totalPoints;
  document.getElementById('userRank').textContent = '#' + stats.userRank;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Language selector
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      changeLanguage(e.target.value);
    });
  }

  // Run code button
  const runCodeBtn = document.getElementById('runCodeBtn');
  if (runCodeBtn) {
    runCodeBtn.addEventListener('click', runCode);
  }

  // Submit solution button
  const submitCodeBtn = document.getElementById('submitCodeBtn');
  if (submitCodeBtn) {
    submitCodeBtn.addEventListener('click', submitSolution);
  }
}

/**
 * Log out the user
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

// Make logout function globally available
window.logout = logout;

// Check authentication when page loads
checkAuth();

