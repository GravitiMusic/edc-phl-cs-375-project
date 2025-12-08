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
let currentDailyChallenge = null; // Store the current daily challenge
let currentDifficulty = 'easy'; // Track selected difficulty

// Language configurations
const languageConfigs = {
  71: { name: 'Python', extension: python() },
  63: { name: 'JavaScript', extension: javascript() },
  62: { name: 'Java', extension: java() },
  50: { name: 'C', extension: cpp() },
  54: { name: 'C++', extension: cpp() }
};

/**
 * Get localStorage key for current challenge code
 */
function getCodeStorageKey() {
  if (!currentDailyChallenge) return null;
  return `oneup_code_${currentDailyChallenge.challenge.id}_${currentDifficulty}_${currentLanguageId}`;
}

/**
 * Save code to localStorage
 */
function saveCodeToStorage() {
  if (!editor || !currentDailyChallenge) return;
  
  const code = editor.state.doc.toString();
  const key = getCodeStorageKey();
  
  if (key) {
    try {
      localStorage.setItem(key, code);
      console.log('💾 Code auto-saved to localStorage');
    } catch (error) {
      console.warn('Failed to save code to localStorage:', error);
    }
  }
}

/**
 * Load code from localStorage
 */
function loadCodeFromStorage() {
  const key = getCodeStorageKey();
  
  if (key) {
    try {
      const savedCode = localStorage.getItem(key);
      if (savedCode) {
        console.log('📂 Loaded saved code from localStorage');
        return savedCode;
      }
    } catch (error) {
      console.warn('Failed to load code from localStorage:', error);
    }
  }
  
  return null;
}

/**
 * Initialize the CodeMirror editor
 */
function initializeEditor(starterCode = '', languageId = 71) {
  const editorContainer = document.getElementById('codeEditor');
  const config = languageConfigs[languageId];
  
  // Destroy existing editor if present
  if (editor) {
    editor.destroy();
  }
  
  // Check for saved code first, fallback to starter code
  const savedCode = loadCodeFromStorage();
  const codeToUse = savedCode || starterCode || '// Loading...';
  
  editor = new EditorView({
    state: EditorState.create({
      doc: codeToUse,
      extensions: [
        basicSetup, 
        config.extension,
        EditorView.updateListener.of((update) => {
          // Auto-save code when content changes
          if (update.docChanged) {
            // Debounce saves to avoid excessive localStorage writes
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(saveCodeToStorage, 1000);
          }
        })
      ],
    }),
    parent: editorContainer,
  });

  console.log('✅ Code editor initialized with', config.name);
  if (savedCode) {
    console.log('✨ Restored your previous code');
  }
}

/**
 * Change programming language
 */
function changeLanguage(languageId) {
  // Save current code before switching
  saveCodeToStorage();
  
  currentLanguageId = parseInt(languageId);
  const config = languageConfigs[currentLanguageId];
  
  if (!config) {
    console.error('Unknown language ID:', languageId);
    return;
  }

  // Get starter code for the new language
  let starterCode = '// Loading...';
  if (currentDailyChallenge && currentDailyChallenge.challenge.difficulties[currentDifficulty]) {
    const difficultyData = currentDailyChallenge.challenge.difficulties[currentDifficulty];
    starterCode = getStarterCodeForLanguage(difficultyData.starterCode, currentLanguageId);
  }

  // Reinitialize editor with new language (will load saved code if available)
  initializeEditor(starterCode, currentLanguageId);

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
 * Generate Python test harness (wraps user code with tests)
 */
function generatePythonTestHarness(userCode, testCases) {
  // Parse test cases from database
  let tests = [];
  if (testCases) {
    tests = typeof testCases === 'string' ? JSON.parse(testCases) : testCases;
  }
  
  // If no test cases, return user code as-is
  if (!tests || tests.length === 0) {
    console.warn('⚠️ No test cases found for this challenge');
    return userCode;
  }
  
  console.log(`✅ Generating test harness with ${tests.length} tests`);
  
  // Generate test code
  let testCode = `${userCode}\n\n`;
  testCode += `# Test Harness (Auto-generated)\n`;
  testCode += `tests_passed = 0\n`;
  testCode += `tests_failed = 0\n`;
  testCode += `test_results = []\n\n`;
  
  testCode += `def run_test(test_num, input_str, expected_str):\n`;
  testCode += `    global tests_passed, tests_failed, test_results\n`;
  testCode += `    try:\n`;
  testCode += `        # Parse input and expected\n`;
  testCode += `        actual = eval(f"solution{input_str}")\n`;
  testCode += `        expected = eval(expected_str)\n`;
  testCode += `        \n`;
  testCode += `        if actual == expected:\n`;
  testCode += `            tests_passed += 1\n`;
  testCode += `            test_results.append(f"✓ Test {test_num}: PASS")\n`;
  testCode += `            test_results.append(f"  Input: {input_str}")\n`;
  testCode += `            test_results.append(f"  Expected: {expected}")\n`;
  testCode += `            test_results.append(f"  Got: {actual}")\n`;
  testCode += `        else:\n`;
  testCode += `            tests_failed += 1\n`;
  testCode += `            test_results.append(f"✗ Test {test_num}: FAIL")\n`;
  testCode += `            test_results.append(f"  Input: {input_str}")\n`;
  testCode += `            test_results.append(f"  Expected: {expected}")\n`;
  testCode += `            test_results.append(f"  Got: {actual}")\n`;
  testCode += `    except Exception as e:\n`;
  testCode += `        tests_failed += 1\n`;
  testCode += `        test_results.append(f"✗ Test {test_num}: ERROR")\n`;
  testCode += `        test_results.append(f"  Input: {input_str}")\n`;
  testCode += `        test_results.append(f"  Error: {str(e)}")\n`;
  testCode += `    test_results.append("")  # blank line\n\n`;
  
  // Add each test case
  tests.forEach((test, index) => {
    const testNum = index + 1;
    const input = test.input.replace(/"/g, '\\"');
    const expected = test.expected.replace(/"/g, '\\"');
    testCode += `run_test(${testNum}, "${input}", "${expected}")\n`;
  });
  
  // Print results
  testCode += `\n# Print all test results\n`;
  testCode += `for result in test_results:\n`;
  testCode += `    print(result)\n`;
  testCode += `\n`;
  testCode += `# Print summary (must be last line for backend parsing)\n`;
  testCode += `total_tests = tests_passed + tests_failed\n`;
  testCode += `print(f"\\n{'='*50}")\n`;
  testCode += `print(f"{'='*50}")\n`;
  testCode += `print(f"{tests_passed}/{total_tests} tests passed")\n`;
  
  return testCode;
}

/**
 * Submit the solution
 */
async function submitSolution() {
  const code = editor.state.doc.toString();
  const submitBtn = document.getElementById('submitCodeBtn');
  const outputEl = document.getElementById('codeOutput');
  
  if (!code.trim()) {
    alert('Please write some code before submitting!');
    return;
  }

  if (!currentDailyChallenge) {
    alert('No daily challenge loaded. Please refresh the page.');
    return;
  }

  // Disable button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Submitting...';
  outputEl.textContent = "⏳ Submitting your solution...";

  try {
    // Generate test harness with user code (only for Python for now)
    let codeToSubmit = code;
    if (currentLanguageId === 71 && currentDailyChallenge.challenge.testCases) {
      codeToSubmit = generatePythonTestHarness(code, currentDailyChallenge.challenge.testCases);
    }
    
    const response = await fetch('/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        challenge_id: currentDailyChallenge.challenge.id,
        source_code: codeToSubmit,
        language_id: currentLanguageId,
        difficulty: currentDifficulty
      })
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      const submission = result.submission;
      
      // Build success message
      let message = '';
      
      if (submission.status === 'passed') {
        message = `🎉 Success! All tests passed (${submission.tests_passed}/${submission.tests_total})!\n\n`;
        message += `Points earned: ${submission.points_earned}`;
        
        if (submission.bonus_points > 0) {
          message += ` (includes +${submission.bonus_points} bonus!)`;
        }
        
        // Show streak info if available
        if (result.streak) {
          message += `\n\n🔥 Streak: ${result.streak.streak} days!`;
          
          if (result.streak.streakAction === 'incremented') {
            message += ` (+1)`;
          } else if (result.streak.streakAction === 'started') {
            message += ` (Started!)`;
          } else if (result.streak.streakAction === 'reset') {
            message += ` (Streak reset - complete daily challenges consecutively!)`;
          }
          
          if (result.streak.streak === result.streak.longestStreak && result.streak.streak > 1) {
            message += `\n🏆 New personal best!`;
          }
        }
        
        outputEl.textContent = `✅ ${message}`;
        alert(message);
        
        // Reload stats to show updated points and streak
        await loadUserStats();
        
      } else if (submission.status === 'failed') {
        message = `❌ Tests failed (${submission.tests_passed}/${submission.tests_total} passed)\n\n`;
        message += result.output.stdout || 'No output';
        outputEl.textContent = message;
        alert('Some tests failed. Check the output for details.');
      } else if (submission.status === 'error') {
        message = '❌ Compilation or runtime error:\n\n';
        message += result.output.stderr || result.output.compile_output || 'Unknown error';
        outputEl.textContent = message;
        alert('Your code has errors. Check the output for details.');
      } else if (submission.status === 'timeout') {
        message = '⏱️ Time limit exceeded. Your code took too long to run.';
        outputEl.textContent = message;
        alert(message);
      }
    } else {
      throw new Error(result.error || 'Submission failed');
    }
    
    console.log('✅ Solution submitted:', result);
  } catch (err) {
    const errorMsg = 'Failed to submit solution. Please try again.';
    outputEl.textContent = `❌ ${errorMsg}\n\n${err.message}`;
    alert(errorMsg);
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
 * Fetch and display today's daily challenge
 */
async function loadDailyChallenge() {
  try {
    const response = await fetch('/api/daily-challenge');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch daily challenge: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Daily challenge not available');
    }
    
    currentDailyChallenge = data;
    console.log('✅ Daily challenge loaded:', data.challenge.title);
    
    // Update UI with challenge details
    displayDailyChallenge(data);
    
    return data;
  } catch (error) {
    console.error('Error loading daily challenge:', error);
    // Show error message to user
    document.getElementById('challengeTitle').textContent = 'Challenge Unavailable';
    document.getElementById('challengeDescription').innerHTML = 
      '<p>Unable to load today\'s daily challenge. Please try again later.</p>';
  }
}

/**
 * Display the daily challenge in the UI
 */
function displayDailyChallenge(data) {
  const challenge = data.challenge;
  
  // Update challenge title
  document.getElementById('challengeTitle').textContent = challenge.title;
  
  // Update challenge description
  document.getElementById('challengeDescription').innerHTML = challenge.description;
  
  // Determine difficulty to show (default to easy, or first incomplete)
  let difficulty = 'easy';
  if (challenge.difficulties.easy.completed && !challenge.difficulties.medium.completed) {
    difficulty = 'medium';
  } else if (challenge.difficulties.medium.completed && !challenge.difficulties.hard.completed) {
    difficulty = 'hard';
  }
  
  currentDifficulty = difficulty;
  
  // Update difficulty badge
  const difficultyBadge = document.getElementById('challengeDifficultyBadge');
  if (difficultyBadge) {
    difficultyBadge.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    difficultyBadge.className = `difficulty-badge difficulty-${difficulty}`;
  }
  
  // Update points display
  const pointsMap = { easy: 25, medium: 50, hard: 75 };
  const basePoints = pointsMap[difficulty];
  const pointsEl = document.getElementById('challengePoints');
  if (pointsEl) {
    pointsEl.textContent = `+${basePoints} points`;
  }
  
  // Show/hide bonus indicator
  const bonusEl = document.getElementById('challengeBonus');
  if (bonusEl) {
    if (data.bonus.available) {
      bonusEl.style.display = 'inline-block';
      bonusEl.title = data.bonus.message;
      console.log(`💰 Bonus available: ${data.bonus.message}`);
    } else {
      bonusEl.style.display = 'none';
    }
  }
  
  // Get starter code for current language and difficulty
  const starterCode = getStarterCodeForLanguage(challenge.difficulties[difficulty].starterCode, currentLanguageId);
  
  // Initialize editor with starter code
  initializeEditor(starterCode, currentLanguageId);
}

/**
 * Get starter code for specific language
 */
function getStarterCodeForLanguage(starterCodeObj, languageId) {
  const languageMap = {
    71: 'python',
    63: 'javascript',
    62: 'java',
    50: 'c',
    54: 'cpp'
  };
  
  const langKey = languageMap[languageId] || 'python';
  return starterCodeObj[langKey] || starterCodeObj.python || '// Starter code not available';
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
async function displayUserInfo(user) {
  // Hide loading, show content
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';

  // Display username in hero section
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay) {
    usernameDisplay.textContent = user.username;
  }

  // Display challenge date
  displayChallengeDate();

  // Set up event listeners
  setupEventListeners();

  // Fetch and display today's daily challenge
  await loadDailyChallenge();

  // Fetch and display real user stats
  await loadUserStats();

  console.log('✅ User info loaded:', user);
}

/**
 * Load and display user statistics
 */
async function loadUserStats() {
  try {
    const response = await fetch('/stats/me');
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    
    if (data.success && data.stats) {
      updateStats({
        challengesCompleted: data.stats.challenges_completed || 0,
        currentStreak: data.stats.day_streak || 0,
        totalPoints: data.stats.total_points || 0,
        userRank: data.stats.rank || 'N/A'
      });
    }
  } catch (error) {
    console.error('Error loading user stats:', error);
    // Show placeholder data on error
    updateStats({
      challengesCompleted: 0,
      currentStreak: 0,
      totalPoints: 0,
      userRank: 'N/A'
    });
  }
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
    
    const response = await window.csrfProtection.protectedFetch('/auth/logout', {
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

