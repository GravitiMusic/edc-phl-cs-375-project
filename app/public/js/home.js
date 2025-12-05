/**
 * Home Page JavaScript - Modern & Feature Rich
 * Handles authentication, CodeMirror editor, and daily challenge
 */

// Use dynamic imports - load state first, then other modules that depend on it
let EditorState, EditorView, basicSetup, python;
let codeMirrorLoaded = false;
let codeMirrorLoading = false;

// Load CodeMirror modules dynamically - use unpkg for better dependency sharing
async function loadCodeMirror() {
  if (codeMirrorLoading || codeMirrorLoaded) {
    return; // Already loading or loaded
  }
  
  codeMirrorLoading = true;
  
  try {
    // Use unpkg which handles ES modules better and avoids multiple instances
    // Load state first
    const stateModule = await import("https://unpkg.com/@codemirror/state@6.4.1/dist/index.js");
    EditorState = stateModule.EditorState;
    
    // Then load codemirror
    const codemirrorModule = await import("https://unpkg.com/codemirror@6.0.1/dist/index.js");
    EditorView = codemirrorModule.EditorView;
    basicSetup = codemirrorModule.basicSetup;
    
    // Finally load python lang support
    const pythonModule = await import("https://unpkg.com/@codemirror/lang-python@6.1.7/dist/index.js");
    python = pythonModule.python;
    
    codeMirrorLoaded = true;
    codeMirrorLoading = false;
    console.log('✅ CodeMirror modules loaded successfully');
  } catch (error) {
    codeMirrorLoading = false;
    console.error('❌ Failed to load CodeMirror modules:', error);
    // Fallback to esm.sh if unpkg fails
    try {
      console.log('Trying esm.sh as fallback...');
      const stateModule = await import("https://esm.sh/@codemirror/state@6.4.1");
      const codemirrorModule = await import("https://esm.sh/codemirror@6.0.1");
      const pythonModule = await import("https://esm.sh/@codemirror/lang-python@6.1.7");
      
      EditorState = stateModule.EditorState;
      EditorView = codemirrorModule.EditorView;
      basicSetup = codemirrorModule.basicSetup;
      python = pythonModule.python;
      
      codeMirrorLoaded = true;
      codeMirrorLoading = false;
      console.log('✅ CodeMirror modules loaded via esm.sh fallback');
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }
}

// Start loading CodeMirror immediately
loadCodeMirror();

let editor = null;
let currentLanguageId = 71; // Default to Python

// Language configurations - Python only for now
const languageConfigs = {
  71: { 
    name: 'Python', 
    getExtension: () => python(), 
    defaultCode: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n\n# Test your code\nnums = [2, 7, 11, 15]\ntarget = 9\nprint(two_sum(nums, target))' 
  }
};

/**
 * Initialize the CodeMirror editor
 */
function initializeEditor() {
  if (!codeMirrorLoaded || !EditorView || !EditorState || !basicSetup || !python) {
    console.warn('CodeMirror not loaded yet, waiting...');
    setTimeout(initializeEditor, 200);
    return;
  }
  
  const editorContainer = document.getElementById('codeEditor');
  if (!editorContainer) {
    return;
  }
  
  try {
    const config = languageConfigs[71]; // Python
    
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
        extensions: [basicSetup, config.getExtension()],
      }),
      parent: editorContainer,
    });

    console.log('✅ Code editor initialized');
  } catch (error) {
    console.error('❌ Failed to initialize editor:', error);
    // Show a fallback message but don't break the page
    editorContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #666; border: 1px solid #ddd; border-radius: 4px;">
        <p>⚠️ Code editor could not be loaded.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please refresh the page to try again.</p>
      </div>
    `;
  }
}

/**
 * Change programming language
 */
function changeLanguage(languageId) {
  if (!codeMirrorLoaded || !EditorView || !EditorState) {
    console.warn('CodeMirror not loaded yet');
    return;
  }
  
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
      extensions: [basicSetup, config.getExtension()],
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
    console.log('Checking authentication...');
    const response = await fetch('/auth/me');
    
    if (!response.ok) {
      console.error('Auth check failed with status:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Auth response:', data);

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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Only redirect if it's actually an auth/network error
    // Don't redirect for CodeMirror or other non-auth errors
    const isAuthError = error.message.includes('HTTP error') || 
                       error.message.includes('Failed to fetch') ||
                       error.message.includes('401') ||
                       error.message.includes('403');
    
    if (isAuthError) {
      // Show error to user instead of immediately redirecting
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="loading-spinner"></div>
          <p>Error loading page: ${error.message}</p>
          <p style="margin-top: 1rem; font-size: 0.9rem;">Redirecting to login...</p>
        `;
      }
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 3000);
    } else {
      // For other errors (like CodeMirror), just show the page without editor
      console.warn('Non-auth error, showing page anyway:', error.message);
      // Try to get user info from session if available, otherwise use fallback
      displayUserInfo({ username: 'User' }); // Fallback user info
    }
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
  // Wrap in try-catch to prevent CodeMirror errors from breaking the page
  try {
    initializeEditor();
  } catch (error) {
    console.error('Editor initialization error (non-fatal):', error);
    // Page will still work, just without editor
    const editorContainer = document.getElementById('codeEditor');
    if (editorContainer) {
      editorContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #666; border: 1px solid #ddd; border-radius: 4px;">
          <p>⚠️ Code editor could not be loaded.</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please refresh the page to try again.</p>
        </div>
      `;
    }
  }
  
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

