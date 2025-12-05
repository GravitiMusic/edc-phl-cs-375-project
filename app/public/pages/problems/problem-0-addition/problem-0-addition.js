import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { python } from "https://esm.sh/@codemirror/lang-python";

let editor = null;
let currentLanguageId = 71; // Default to Python

// Language configurations
const languageConfigs = {
  71: { name: 'Python', extension: python(), defaultCode: '' },
}

/**
 * Return starter code
 */
function getStarterCode(difficultyId) {
    if (difficultyId === 1) {
        // 5. Add easy template
        return `def add_numbers(a, b):
    """
    This function should add b to a.
    Right now it performs the wrong operation.
    Fix the line below.
    """
    result = a - b  # TODO: change this to add instead of subtract
    return result
    `;  
    } else if (difficultyId === 2) {
        // 6. Add medium template
        return `def add_numbers(a, b):
    """
    This function should add b to a.
    Implement the whole solution
    """
    pass
    `;
    }
    else {
        // 7. Add hard template
       return `def add_numbers(a, b):
    """
    This function should add b to a, but is highly inefficient/complicated. "Optimize" it.
    """
    add_lambda = lambda x: lambda y: x + y
    add_a = add_lambda(a)
    sum = add_a(b)
    return sum
    ` 
    }
}
/**
 * Initialize the CodeMirror editor
 */
function initializeEditor(difficultyId) {
  const editorContainer = document.getElementById('codeEditor');
  editorContainer.replaceChildren();
  editor = new EditorView({
    state: EditorState.create({
      doc: getStarterCode(difficultyId),
      extensions: [basicSetup, languageConfigs[71].extension], //python
    }),
    parent: editorContainer,
  });

  console.log('✅ Code editor initialized');
}

/**
 * Change difficulty
 */
function changeDifficulty(difficultyId) {
    console.log(difficultyId)
    const challengePoints = document.getElementById("challengePoints");
    const diffic = document.getElementById("difficultySelect");
    if (difficultyId === 1) {
        console.log("Changing difficulty to easy.")
        challengePoints.textContent = "+25 points";
        difficultySelect.className = "difficulty-select difficulty-easy"

    } else if (difficultyId === 2) {
        console.log("Changing difficulty to medium.")
        challengePoints.textContent = "+50 points";
        difficultySelect.className = "difficulty-select difficulty-medium"

    } else {
        console.log("Changing difficulty to hard.")
        challengePoints.textContent = "+75 points";
        difficultySelect.className = "difficulty-select difficulty-hard"

    }
    initializeEditor(difficultyId);
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

function testSuite(userCode) {
    // 8. Add Test Suite
    return `
${userCode}

tests_passed = 0
total_tests = 3

def assert_equal(actual, expected, name):
    global tests_passed
    if actual == expected:
        tests_passed += 1

# Test cases
assert_equal(add_numbers(10, 5), 15, "basic_1")
assert_equal(add_numbers(7, 2), 9, "basic_2")
assert_equal(add_numbers(3, 10), 13, "basic_3")

print(f"{tests_passed}/{total_tests} tests passed")
`;
}

function submitSuite(userCode) {
    // 9. Change submit suite
    // TODO
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
    const response = await fetch("/challenge/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: testSuite(code),
        language_id: currentLanguageId,   // e.g. 71 for Python
        challengeId: "TODO",     // TODO: swap this for your real challenge id/slug
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
        console.log(result)
        outputEl.textContent = `${result.summary}`;
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
  const outputEl = document.getElementById('codeOutput');
  
  if (!code.trim()) {
    alert('Please write some code before submitting!');
    return;
  }

  // Get current difficulty
  const difficultySelect = document.getElementById('difficultySelect');
  const difficultyValue = parseInt(difficultySelect.value);
  const difficultyMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
  const difficulty = difficultyMap[difficultyValue];

  // Disable button
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span>Submitting...';
  outputEl.textContent = "⏳ Submitting your solution...";

  try {
    const response = await fetch("/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challenge_id: 1, // TODO: Get this from page context
        source_code: testSuite(code),
        language_id: currentLanguageId,
        difficulty: difficulty
      }),
    });

    // Check if user is authenticated
    if (response.status === 401) {
      outputEl.textContent = "🔒 You must be logged in to submit. Redirecting...";
      setTimeout(() => {
        window.location.href = "/pages/login.html";
      }, 2000);
      return;
    }

    const data = await response.json();

    if (response.ok && data.success) {
      const sub = data.submission;
      const stats = data.user_stats;
      
      // Build result message
      let message = '';
      
      if (sub.status === 'passed') {
        message = '🎉 Submission Successful!\n\n';
        message += `✅ All tests passed: ${sub.tests_passed}/${sub.tests_total}\n`;
        
        if (sub.is_first_completion) {
          message += `\n🌟 First completion! +${sub.points_earned} points\n`;
        } else {
          message += `\n✓ Already completed (no points awarded)\n`;
        }
        
        if (sub.execution_time_ms) {
          message += `⏱️  Execution time: ${sub.execution_time_ms}ms\n`;
        }
        if (sub.memory_used_kb) {
          message += `💾 Memory used: ${sub.memory_used_kb}KB\n`;
        }
        
        message += `\n📊 Your Stats:\n`;
        message += `   Total Points: ${stats.total_points}\n`;
        message += `   Challenges Completed: ${stats.challenges_completed}\n`;
        message += `   Day Streak: ${stats.day_streak}`;
        
        outputEl.textContent = message;
        outputEl.style.color = '#28a745';
      } else {
        message = '❌ Submission Failed\n\n';
        message += `Tests passed: ${sub.tests_passed}/${sub.tests_total}\n\n`;
        
        if (data.output.stderr) {
          message += 'Error:\n' + data.output.stderr;
        } else if (data.output.compile_output) {
          message += 'Compilation Error:\n' + data.output.compile_output;
        } else {
          message += 'Some tests failed. Try debugging your code.';
        }
        
        outputEl.textContent = message;
        outputEl.style.color = '#dc3545';
      }
      
      console.log('✅ Solution submitted:', data);
    } else {
      throw new Error(data.error || 'Submission failed');
    }
  } catch (err) {
    outputEl.textContent = "❌ Submission failed:\n\n" + err.message;
    outputEl.style.color = '#dc3545';
    console.error('Error submitting solution:', err);
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-icon">✓</span>Submit Solution';
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Difficulty Selector
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        difficultySelect.addEventListener('change', (e) => {
            changeDifficulty(parseInt(e.target.value));
        });
    }
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
 * Check if user is logged in when page loads
 */
async function checkAuth() {
  try {
    const response = await fetch('/auth/me');
    const data = await response.json();

    if (data.authenticated) {
      // User is logged in - initialize the page
      initializeEditor(2);
      setupEventListeners();
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

// Check authentication before initializing page
checkAuth();

