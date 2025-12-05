import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";

let editor = null;
let currentLanguageId = 71; // Default to Python
let currentChallenge = null;
let currentDifficulty = 'medium';

// Language configurations
const languageConfigs = {
  71: { name: 'Python', extension: python() },
};

/**
 * Initialize - Get challenge ID from URL and load data
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;

  // Get challenge ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const challengeId = urlParams.get('id');

  if (!challengeId) {
    showError('No challenge ID provided');
    return;
  }

  // Load challenge data
  await loadChallenge(challengeId);
});

/**
 * Check if user is authenticated
 */
async function checkAuth() {
  try {
    const response = await fetch('/auth/profile');
    if (response.status === 401) {
      window.location.href = '/pages/login.html';
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

/**
 * Load challenge data from API
 */
async function loadChallenge(challengeId) {
  try {
    const response = await fetch(`/challenges/${challengeId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        showError('Challenge not found');
      } else {
        showError('Failed to load challenge');
      }
      return;
    }

    const data = await response.json();
    if (!data.success || !data.challenge) {
      showError('Invalid challenge data');
      return;
    }

    currentChallenge = data.challenge;
    
    // Get difficulty from URL or default to medium
    const urlParams = new URLSearchParams(window.location.search);
    const urlDifficulty = urlParams.get('difficulty');
    if (urlDifficulty && ['easy', 'medium', 'hard'].includes(urlDifficulty)) {
      currentDifficulty = urlDifficulty;
    }

    // Display the challenge
    displayChallenge();
    
    // Initialize editor
    initializeEditor();
    
    // Setup event listeners
    setupEventListeners();
    
    // Hide loading, show content
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('challenge-content').style.display = 'block';

  } catch (error) {
    console.error('Error loading challenge:', error);
    showError('Error loading challenge');
  }
}

/**
 * Display challenge information
 */
function displayChallenge() {
  const c = currentChallenge;
  
  // Set title
  document.getElementById('challengeTitle').textContent = c.title;
  document.getElementById('challengeDescription').textContent = c.description;
  
  // Set difficulty selector
  const difficultySelect = document.getElementById('difficultySelect');
  difficultySelect.value = currentDifficulty;
  
  // Update difficulty-specific content
  updateDifficultyContent();
}

/**
 * Update content based on selected difficulty
 */
function updateDifficultyContent() {
  const c = currentChallenge;
  const difficulty = currentDifficulty;
  
  // Update instructions
  const instructions = difficulty === 'easy' ? c.easy_instructions :
                      difficulty === 'medium' ? c.medium_instructions :
                      c.hard_instructions;
  document.getElementById('challengeInstructions').textContent = instructions;
  
  // Update hint
  const hint = difficulty === 'easy' ? c.easy_hint :
              difficulty === 'medium' ? c.medium_hint :
              c.hard_hint;
  const hintSection = document.getElementById('challengeHintSection');
  if (hint) {
    document.getElementById('challengeHint').textContent = hint;
    hintSection.style.display = 'block';
  } else {
    hintSection.style.display = 'none';
  }
  
  // Update points
  const points = difficulty === 'easy' ? 25 :
                difficulty === 'medium' ? 50 : 75;
  document.getElementById('challengePoints').textContent = `+${points} points`;
  
  // Update difficulty styling
  const difficultySelect = document.getElementById('difficultySelect');
  difficultySelect.className = `difficulty-select difficulty-${difficulty}`;
  
  // Update completion status
  const completionBadge = document.getElementById('completionStatus');
  if (c.completions && c.completions[difficulty]) {
    completionBadge.style.display = 'inline-block';
  } else {
    completionBadge.style.display = 'none';
  }
  
  // Update editor content if it exists
  if (editor) {
    // Try to load saved code first, fallback to starter code
    const savedCode = loadSavedCode();
    const starterCode = getStarterCode();
    const codeToLoad = savedCode || starterCode;
    
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: codeToLoad
      }
    });
    
    if (savedCode) {
      console.log('📂 Loaded saved code for', difficulty);
    }
  }
}

/**
 * Get starter code for current difficulty and language
 */
function getStarterCode() {
  const c = currentChallenge;
  const difficulty = currentDifficulty;
  
  const starterCodeObj = difficulty === 'easy' ? c.easy_starter_code :
                        difficulty === 'medium' ? c.medium_starter_code :
                        c.hard_starter_code;
  
  // Get Python code (default language)
  return starterCodeObj?.python || '# Starter code not available\n';
}

/**
 * Get localStorage key for current challenge/difficulty
 */
function getStorageKey() {
  return `code_${currentChallenge.id}_${currentDifficulty}_${currentLanguageId}`;
}

/**
 * Save code to localStorage
 */
function saveCode(code) {
  try {
    localStorage.setItem(getStorageKey(), code);
    console.log('💾 Code auto-saved');
  } catch (e) {
    console.error('Failed to save code:', e);
  }
}

/**
 * Load code from localStorage
 */
function loadSavedCode() {
  try {
    const saved = localStorage.getItem(getStorageKey());
    return saved;
  } catch (e) {
    console.error('Failed to load saved code:', e);
    return null;
  }
}

/**
 * Clear saved code for current challenge/difficulty
 */
function clearSavedCode() {
  try {
    localStorage.removeItem(getStorageKey());
    console.log('🗑️ Saved code cleared');
  } catch (e) {
    console.error('Failed to clear saved code:', e);
  }
}

/**
 * Initialize the CodeMirror editor
 */
function initializeEditor() {
  const editorContainer = document.getElementById('codeEditor');
  editorContainer.replaceChildren();
  
  // Try to load saved code first, fallback to starter code
  const savedCode = loadSavedCode();
  const starterCode = getStarterCode();
  const initialCode = savedCode || starterCode;
  
  editor = new EditorView({
    state: EditorState.create({
      doc: initialCode,
      extensions: [
        basicSetup, 
        languageConfigs[71].extension,
        // Auto-save on change (debounced)
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Debounce saves
            clearTimeout(window.autoSaveTimeout);
            window.autoSaveTimeout = setTimeout(() => {
              saveCode(editor.state.doc.toString());
            }, 1000); // Save 1 second after user stops typing
          }
        })
      ],
    }),
    parent: editorContainer,
  });

  if (savedCode) {
    console.log('✅ Code editor initialized (loaded from auto-save)');
  } else {
    console.log('✅ Code editor initialized (starter code)');
  }
}

/**
 * Reset code to starter code
 */
function resetCode() {
  if (!confirm('Reset to starter code? Your current code will be lost.')) {
    return;
  }
  
  clearSavedCode();
  const starterCode = getStarterCode();
  
  if (editor) {
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: starterCode
      }
    });
  }
  
  console.log('🔄 Code reset to starter code');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Difficulty change
  const difficultySelect = document.getElementById('difficultySelect');
  difficultySelect.addEventListener('change', (e) => {
    currentDifficulty = e.target.value;
    updateDifficultyContent();
  });

  // Reset code button
  const resetBtn = document.getElementById('resetCodeBtn');
  resetBtn.addEventListener('click', resetCode);

  // Run code button
  const runBtn = document.getElementById('runCodeBtn');
  runBtn.addEventListener('click', runCode);

  // Submit code button
  const submitBtn = document.getElementById('submitCodeBtn');
  submitBtn.addEventListener('click', submitSolution);

  // Language selector (for future)
  const languageSelect = document.getElementById('languageSelect');
  languageSelect.addEventListener('change', (e) => {
    currentLanguageId = parseInt(e.target.value);
    // TODO: Reinitialize editor with new language
  });
}

/**
 * Generate Python test harness from test cases
 */
function generatePythonTestHarness(userCode, testCases) {
  // Parse test cases from database
  const tests = typeof testCases === 'string' ? JSON.parse(testCases) : testCases;
  
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
  testCode += `# Print summary\n`;
  testCode += `total_tests = tests_passed + tests_failed\n`;
  testCode += `print(f"\\n{'='*50}")\n`;
  testCode += `print(f"SUMMARY: {tests_passed}/{total_tests} tests passed")\n`;
  testCode += `print(f"{'='*50}")\n`;
  
  return testCode;
}

/**
 * Parse test results from Judge0 output
 */
function parseTestResults(stdout) {
  if (!stdout) return null;
  
  const lines = stdout.trim().split('\n');
  const results = [];
  let currentTest = null;
  let summaryLine = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for test start (✓ or ✗)
    if (line.startsWith('✓') || line.startsWith('✗')) {
      if (currentTest) {
        results.push(currentTest);
      }
      currentTest = {
        passed: line.startsWith('✓'),
        name: line,
        input: '',
        expected: '',
        actual: '',
        error: ''
      };
    }
    // Parse test details
    else if (currentTest && line.startsWith('Input:')) {
      currentTest.input = line.substring(6).trim();
    }
    else if (currentTest && line.startsWith('Expected:')) {
      currentTest.expected = line.substring(9).trim();
    }
    else if (currentTest && line.startsWith('Got:')) {
      currentTest.actual = line.substring(4).trim();
    }
    else if (currentTest && line.startsWith('Error:')) {
      currentTest.error = line.substring(6).trim();
    }
    // Check for summary
    else if (line.includes('tests passed')) {
      summaryLine = line;
    }
  }
  
  // Add last test
  if (currentTest) {
    results.push(currentTest);
  }
  
  return {
    tests: results,
    summary: summaryLine
  };
}

/**
 * Run code (test without submitting)
 */
async function runCode() {
  const code = editor.state.doc.toString();
  const runBtn = document.getElementById('runCodeBtn');
  const outputEl = document.getElementById('codeOutput');

  if (!code.trim()) {
    outputEl.textContent = 'Please write some code before running!';
    return;
  }

  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Running...</span>';
  outputEl.textContent = "⏳ Running your code...";

  try {
    // Generate test harness with user code
    const testCases = currentChallenge.test_cases;
    const codeWithTests = generatePythonTestHarness(code, testCases);

    const response = await fetch("/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: codeWithTests,
        language_id: currentLanguageId,
      }),
    });

    const result = await response.json();

    if (result.stdout) {
      // Parse and display test results
      const testResults = parseTestResults(result.stdout);
      
      if (testResults && testResults.tests.length > 0) {
        let outputMessage = `${'='.repeat(50)}\n`;
        outputMessage += `TEST RESULTS (Run - Not Submitted)\n`;
        outputMessage += `${'='.repeat(50)}\n\n`;
        
        testResults.tests.forEach((test) => {
          outputMessage += `${test.name}\n`;
          if (test.input) outputMessage += `  Input: ${test.input}\n`;
          if (test.expected) outputMessage += `  Expected: ${test.expected}\n`;
          if (test.actual) outputMessage += `  Got: ${test.actual}\n`;
          if (test.error) outputMessage += `  Error: ${test.error}\n`;
          outputMessage += `\n`;
        });
        
        outputMessage += `${testResults.summary || 'Test complete'}\n`;
        outputEl.textContent = outputMessage;
      } else {
        outputEl.textContent = result.stdout;
      }
    } else if (result.stderr) {
      outputEl.textContent = `❌ Error:\n${result.stderr}`;
    } else if (result.compile_output) {
      outputEl.textContent = `❌ Compilation Error:\n${result.compile_output}`;
    } else {
      outputEl.textContent = "No output";
    }
  } catch (err) {
    outputEl.textContent = "❌ Request failed:\n\n" + err.message;
    console.error('Error running code:', err);
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = '<span class="btn-icon">▶</span><span>Run Code</span>';
  }
}

/**
 * Submit solution for grading
 */
async function submitSolution() {
  const code = editor.state.doc.toString();
  const submitBtn = document.getElementById('submitCodeBtn');
  const outputEl = document.getElementById('codeOutput');

  if (!code.trim()) {
    outputEl.textContent = 'Please write some code before submitting!';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Submitting...';
  outputEl.textContent = "⏳ Submitting your solution...";

  try {
    // Generate test harness with user code
    const testCases = currentChallenge.test_cases;
    const codeWithTests = generatePythonTestHarness(code, testCases);

    const response = await fetch("/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challenge_id: currentChallenge.id,
        source_code: codeWithTests,
        language_id: currentLanguageId,
        difficulty: currentDifficulty,
      }),
    });

    if (response.status === 401) {
      outputEl.textContent = "🔒 You must be logged in to submit code. Redirecting...";
      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 2000);
      return;
    }

    // Check for non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      outputEl.textContent = `❌ Submission failed:\n\nStatus: ${response.status}\nError: ${errorData.error || 'Unknown error'}`;
      return;
    }

    const result = await response.json();

    if (result.success) {
      // Parse test results
      const testResults = parseTestResults(result.output.stdout);
      
      // Build output message
      let outputMessage = `🎉 Submission ${result.submission.status.toUpperCase()}!\n\n`;
      outputMessage += `${'='.repeat(50)}\n`;
      outputMessage += `RESULTS\n`;
      outputMessage += `${'='.repeat(50)}\n\n`;
      
      if (testResults && testResults.tests.length > 0) {
        // Show each test result
        testResults.tests.forEach((test, index) => {
          outputMessage += `${test.name}\n`;
          if (test.input) outputMessage += `  Input: ${test.input}\n`;
          if (test.expected) outputMessage += `  Expected: ${test.expected}\n`;
          if (test.actual) outputMessage += `  Got: ${test.actual}\n`;
          if (test.error) outputMessage += `  Error: ${test.error}\n`;
          outputMessage += `\n`;
        });
        
        outputMessage += `${testResults.summary || `${result.submission.tests_passed}/${result.submission.tests_total} tests passed`}\n\n`;
      } else {
        outputMessage += `Tests: ${result.submission.tests_passed}/${result.submission.tests_total}\n\n`;
      }
      
      outputMessage += `${'='.repeat(50)}\n`;
      outputMessage += `PERFORMANCE\n`;
      outputMessage += `${'='.repeat(50)}\n`;
      outputMessage += `Time: ${result.submission.execution_time_ms || 'N/A'} ms\n`;
      outputMessage += `Memory: ${result.submission.memory_used_kb || 'N/A'} KB\n\n`;
      
      if (result.submission.points_earned > 0) {
        outputMessage += `💰 Earned: +${result.submission.points_earned} points!\n`;
      } else if (result.submission.status === 'passed') {
        outputMessage += `✅ Already completed this difficulty for points.\n`;
      }
      
      if (result.submission.error_message) {
        outputMessage += `\n❌ Error: ${result.submission.error_message}\n`;
      }
      
      outputEl.textContent = outputMessage;

      // Update completion badge if just completed
      if (result.submission.is_first_completion) {
        document.getElementById('completionStatus').style.display = 'inline-block';
      }

    } else {
      outputEl.textContent = "❌ Submission failed:\n\n" + (result.error || "Unknown error");
    }
  } catch (err) {
    outputEl.textContent = "❌ Request failed:\n\n" + err.message;
    console.error('Error submitting solution:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-icon">✓</span><span>Submit Solution</span>';
  }
}

/**
 * Show error state
 */
function showError(message) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'block';
  console.error(message);
}

