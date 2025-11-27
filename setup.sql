DROP DATABASE IF EXISTS oneup;
CREATE DATABASE oneup;
\c oneup

-- Session table for express-session (persistent login sessions)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Users table with enhanced fields
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(100),
    phone VARCHAR(20),
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rank INTEGER DEFAULT 99999,
    total_points INTEGER DEFAULT 0,
    easy_completed INTEGER DEFAULT 0,
    medium_completed INTEGER DEFAULT 0,
    hard_completed INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0, -- Total: easy + medium + hard
    day_streak INTEGER DEFAULT 0
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_total_points ON users(total_points DESC);
CREATE INDEX idx_users_challenges_completed ON users(challenges_completed DESC);

-- Challenges table for daily coding problems
-- Each challenge has 3 difficulty versions: Easy (fix broken code), Medium (implement solution), Hard (optimize code)
DROP TABLE IF EXISTS challenges CASCADE;
CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL, -- Base problem description
    
    -- Easy version: Fix broken code (syntax-level errors)
    easy_instructions TEXT NOT NULL,
    easy_starter_code JSONB NOT NULL, -- Broken code with syntax errors
    easy_hint TEXT,
    
    -- Medium version: Implement full solution
    medium_instructions TEXT NOT NULL,
    medium_starter_code JSONB NOT NULL, -- Empty function template
    medium_hint TEXT,
    
    -- Hard version: Optimize inefficient code
    hard_instructions TEXT NOT NULL,
    hard_starter_code JSONB NOT NULL, -- Working but inefficient code
    hard_hint TEXT,
    
    -- Shared across all difficulties
    test_cases JSONB NOT NULL, -- Array of test cases with input/expected output
    time_limit_ms INTEGER DEFAULT 5000,
    memory_limit_mb INTEGER DEFAULT 128,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_challenges_active ON challenges(is_active);
CREATE INDEX idx_challenges_created ON challenges(created_at DESC);

-- Insert sample challenges with 3 difficulty versions each
INSERT INTO challenges (
    title, description,
    easy_instructions, easy_starter_code, easy_hint,
    medium_instructions, medium_starter_code, medium_hint,
    hard_instructions, hard_starter_code, hard_hint,
    test_cases, is_active
) VALUES
(
    'Two Sum',
    'Given an array of integers and a target, find two numbers that add up to the target.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below to make it work correctly.',
    '{"python": "def solution(nums, target):\n    for i in range(len(nums)\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] = target:\n                return [i, j\n    return []", "javascript": "function solution(nums, target) {\n    for (let i = 0; i < nums.length; i++ {\n        for (let j = i + 1; j < nums.length; j++) {\n            if (nums[i] + nums[j] === target) {\n                return [i, j]\n            }\n        }\n    return []\n}"}',
    'Look for missing colons, brackets, and incorrect operators.',
    
    -- MEDIUM: Implement solution
    'Implement a function that returns the indices of two numbers that add up to the target.',
    '{"python": "def solution(nums, target):\n    # Your code here\n    pass", "javascript": "function solution(nums, target) {\n    // Your code here\n    \n}"}',
    'Try using a hash map to store numbers you''ve seen.',
    
    -- HARD: Optimize code
    'The code below works but is too slow (O(n²)). Optimize it to O(n) time complexity.',
    '{"python": "def solution(nums, target):\n    # O(n²) solution - optimize this!\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []", "javascript": "function solution(nums, target) {\n    // O(n²) solution - optimize this!\n    for (let i = 0; i < nums.length; i++) {\n        for (let j = i + 1; j < nums.length; j++) {\n            if (nums[i] + nums[j] === target) {\n                return [i, j];\n            }\n        }\n    }\n    return [];\n}"}',
    'Use a hash map to reduce time complexity from O(n²) to O(n).',
    
    '[
      {"input": "([2, 7, 11, 15], 9)", "expected": "[0, 1]"},
      {"input": "([3, 2, 4], 6)", "expected": "[1, 2]"},
      {"input": "([3, 3], 6)", "expected": "[0, 1]"}
    ]',
    true
),
(
    'Reverse String',
    'Reverse an array of characters in-place.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below.',
    '{"python": "def solution(s):\n    left = 0\n    right = len(s) - 1\n    while left < right\n        s[left], s[right] = s[right], s[left\n        left += 1\n        right -= 1\n    return s", "javascript": "function solution(s) {\n    let left = 0;\n    let right = s.length - 1\n    while (left < right) {\n        [s[left], s[right]] = [s[right], s[left]];\n        left++\n        right--;\n    }\n    return s;\n}"}',
    'Check for missing brackets and colons.',
    
    -- MEDIUM: Implement solution
    'Implement a function to reverse the array in-place.',
    '{"python": "def solution(s):\n    # Your code here\n    pass", "javascript": "function solution(s) {\n    // Your code here\n    \n}"}',
    'Use two pointers: one at the start, one at the end.',
    
    -- HARD: Optimize code  
    'The code works but creates extra space. Optimize to use O(1) space.',
    '{"python": "def solution(s):\n    # O(n) space - optimize to O(1)!\n    reversed_s = []\n    for i in range(len(s) - 1, -1, -1):\n        reversed_s.append(s[i])\n    for i in range(len(s)):\n        s[i] = reversed_s[i]\n    return s", "javascript": "function solution(s) {\n    // O(n) space - optimize to O(1)!\n    const reversed = [];\n    for (let i = s.length - 1; i >= 0; i--) {\n        reversed.push(s[i]);\n    }\n    for (let i = 0; i < s.length; i++) {\n        s[i] = reversed[i];\n    }\n    return s;\n}"}',
    'Swap elements in-place instead of creating a new array.',
    
    '[
      {"input": "([\"h\",\"e\",\"l\",\"l\",\"o\"])", "expected": "[\"o\",\"l\",\"l\",\"e\",\"h\"]"},
      {"input": "([\"H\",\"a\",\"n\",\"n\",\"a\",\"h\"])", "expected": "[\"h\",\"a\",\"n\",\"n\",\"a\",\"H\"]"},
      {"input": "([\"A\"])", "expected": "[\"A\"]"}
    ]',
    true
),
(
    'Palindrome Check',
    'Determine if a given string is a palindrome (reads the same forwards and backwards).',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below to make it work correctly.',
    '{"python": "def solution(s):\n    s = s.lower()\n    left = 0\n    right = len(s) - 1\n    while left < right\n        if s[left] != s[right]\n            return False\n        left += 1\n        right -= 1\n    return True", "javascript": "function solution(s) {\n    s = s.toLowerCase();\n    let left = 0\n    let right = s.length - 1;\n    while (left < right) {\n        if (s[left] !== s[right]) {\n            return false;\n        }\n        left++;\n        right--\n    }\n    return true;\n}"}',
    'Look for missing colons, brackets, and check indentation.',
    
    -- MEDIUM: Implement solution
    'Implement a function that checks if a string is a palindrome. Ignore case.',
    '{"python": "def solution(s):\n    # Your code here\n    pass", "javascript": "function solution(s) {\n    // Your code here\n    \n}"}',
    'Use two pointers from both ends of the string, or compare the string with its reverse.',
    
    -- HARD: Optimize code
    'The code works but is inefficient. Optimize to avoid creating a reversed copy.',
    $${"python": "def solution(s):\n    # O(n) space - optimize to O(1)!\n    s_lower = s.lower()\n    reversed_s = s_lower[::-1]\n    return s_lower == reversed_s", "javascript": "function solution(s) {\n    // O(n) space - optimize to O(1)!\n    const lower = s.toLowerCase();\n    const reversed = lower.split('').reverse().join('');\n    return lower === reversed;\n}"}$$::jsonb,
    'Use two pointers instead of creating a reversed copy.',
    
    '[
      {"input": "(\"racecar\")", "expected": "True"},
      {"input": "(\"hello\")", "expected": "False"},
      {"input": "(\"A man a plan a canal Panama\")", "expected": "False"},
      {"input": "(\"aaa\")", "expected": "True"}
    ]',
    true
),
(
    'FizzBuzz',
    'Print numbers 1 to n, but print "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of both.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors and logic issues in the code below.',
    '{"python": "def solution(n):\n    result = []\n    for i in range(1, n + 1)\n        if i % 3 == 0 and i % 5 = 0:\n            result.append(\"FizzBuzz\")\n        elif i % 3 == 0\n            result.append(\"Fizz\")\n        elif i % 5 == 0:\n            result.append(\"Buzz\")\n        else:\n            result.append(str(i))\n    return result", "javascript": "function solution(n) {\n    const result = [];\n    for (let i = 1; i <= n; i++) {\n        if (i % 3 === 0 && i % 5 === 0) {\n            result.push(\"FizzBuzz\")\n        } else if (i % 3 === 0) {\n            result.push(\"Fizz\");\n        } else if (i % 5 === 0) {\n            result.push(\"Buzz\")\n        } else {\n            result.push(String(i));\n        }\n    return result;\n}"}',
    'Check for missing colons, brackets, and comparison operators.',
    
    -- MEDIUM: Implement solution
    'Implement the classic FizzBuzz problem from scratch.',
    '{"python": "def solution(n):\n    # Your code here\n    pass", "javascript": "function solution(n) {\n    // Your code here\n    \n}"}',
    'Check divisibility by 15 first (or both 3 and 5), then by 3, then by 5.',
    
    -- HARD: Optimize code
    'The code works but has redundant checks. Optimize the conditional logic.',
    '{"python": "def solution(n):\n    # Redundant - optimize!\n    result = []\n    for i in range(1, n + 1):\n        if i % 3 == 0:\n            if i % 5 == 0:\n                result.append(\"FizzBuzz\")\n            else:\n                result.append(\"Fizz\")\n        elif i % 5 == 0:\n            if i % 3 == 0:\n                result.append(\"FizzBuzz\")\n            else:\n                result.append(\"Buzz\")\n        else:\n            result.append(str(i))\n    return result", "javascript": "function solution(n) {\n    // Redundant - optimize!\n    const result = [];\n    for (let i = 1; i <= n; i++) {\n        if (i % 3 === 0) {\n            if (i % 5 === 0) {\n                result.push(\"FizzBuzz\");\n            } else {\n                result.push(\"Fizz\");\n            }\n        } else if (i % 5 === 0) {\n            if (i % 3 === 0) {\n                result.push(\"FizzBuzz\");\n            } else {\n                result.push(\"Buzz\");\n            }\n        } else {\n            result.push(String(i));\n        }\n    }\n    return result;\n}"}',
    'Check for divisibility by 15 first to eliminate redundant checks.',
    
    '[
      {"input": "(5)", "expected": "[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\"]"},
      {"input": "(15)", "expected": "[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\", \"Fizz\", \"7\", \"8\", \"Fizz\", \"Buzz\", \"11\", \"Fizz\", \"13\", \"14\", \"FizzBuzz\"]"},
      {"input": "(3)", "expected": "[\"1\", \"2\", \"Fizz\"]"}
    ]',
    true
),
(
    'Find Maximum',
    'Find the maximum number in an array of integers.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below.',
    '{"python": "def solution(nums):\n    if not nums\n        return None\n    max_num = nums[0\n    for num in nums:\n        if num > max_num\n            max_num = num\n    return max_num", "javascript": "function solution(nums) {\n    if (nums.length === 0) {\n        return null;\n    }\n    let maxNum = nums[0];\n    for (let i = 0; i < nums.length; i++) {\n        if (nums[i] > maxNum {\n            maxNum = nums[i];\n        }\n    }\n    return maxNum\n}"}',
    'Look for missing colons, brackets, and parentheses.',
    
    -- MEDIUM: Implement solution
    'Implement a function to find the maximum value in an array.',
    '{"python": "def solution(nums):\n    # Your code here\n    pass", "javascript": "function solution(nums) {\n    // Your code here\n    \n}"}',
    'Iterate through the array keeping track of the largest number seen so far.',
    
    -- HARD: Optimize code
    'The code works but sorts the entire array. Optimize to O(n) time.',
    '{"python": "def solution(nums):\n    # O(n log n) - optimize to O(n)!\n    if not nums:\n        return None\n    sorted_nums = sorted(nums)\n    return sorted_nums[-1]", "javascript": "function solution(nums) {\n    // O(n log n) - optimize to O(n)!\n    if (nums.length === 0) {\n        return null;\n    }\n    const sorted = [...nums].sort((a, b) => a - b);\n    return sorted[sorted.length - 1];\n}"}',
    'You don''t need to sort to find the maximum - just track the largest value as you iterate.',
    
    '[
      {"input": "([1, 5, 3, 9, 2])", "expected": "9"},
      {"input": "([-10, -5, -20, -1])", "expected": "-1"},
      {"input": "([42])", "expected": "42"},
      {"input": "([7, 7, 7, 7])", "expected": "7"}
    ]',
    true
),
(
    'Valid Anagram',
    'Check if two strings are anagrams (contain the same characters in different order).',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below.',
    $${"python": "def solution(s, t):\n    if len(s) != len(t)\n        return False\n    return sorted(s) = sorted(t)", "javascript": "function solution(s, t) {\n    if (s.length !== t.length) {\n        return false\n    }\n    return s.split('').sort().join('') === t.split('').sort().join('')\n}"}$$::jsonb,
    'Look for missing colons and comparison operators.',
    
    -- MEDIUM: Implement solution
    'Implement a function that checks if two strings are anagrams.',
    '{"python": "def solution(s, t):\n    # Your code here\n    pass", "javascript": "function solution(s, t) {\n    // Your code here\n    \n}"}',
    'Sort both strings and compare, or count character frequencies.',
    
    -- HARD: Optimize code
    'The code works but uses extra space for sorting. Optimize space usage.',
    $${"python": "def solution(s, t):\n    # O(n log n) time - optimize!\n    if len(s) != len(t):\n        return False\n    return sorted(s) == sorted(t)", "javascript": "function solution(s, t) {\n    // O(n log n) time - optimize!\n    if (s.length !== t.length) {\n        return false;\n    }\n    return s.split('').sort().join('') === t.split('').sort().join('');\n}"}$$::jsonb,
    'Use a hash map to count character frequencies instead of sorting.',
    
    '[
      {"input": "(\"listen\", \"silent\")", "expected": "True"},
      {"input": "(\"hello\", \"world\")", "expected": "False"},
      {"input": "(\"anagram\", \"nagaram\")", "expected": "True"},
      {"input": "(\"rat\", \"car\")", "expected": "False"}
    ]',
    true
),
(
    'Sum of Array',
    'Calculate the sum of all numbers in an array.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below.',
    '{"python": "def solution(nums):\n    total = 0\n    for num in nums\n        total += num\n    return total", "javascript": "function solution(nums) {\n    let total = 0;\n    for (let i = 0; i < nums.length; i++ {\n        total += nums[i];\n    }\n    return total;\n}"}',
    'Look for missing colons and parentheses.',
    
    -- MEDIUM: Implement solution
    'Implement a function that returns the sum of all numbers in an array.',
    '{"python": "def solution(nums):\n    # Your code here\n    pass", "javascript": "function solution(nums) {\n    // Your code here\n    \n}"}',
    'Use a loop to accumulate the sum, or use built-in functions.',
    
    -- HARD: Optimize code
    'The code works but uses a loop. Use built-in functions for cleaner code.',
    '{"python": "def solution(nums):\n    # Can be more concise!\n    total = 0\n    for num in nums:\n        total = total + num\n    return total", "javascript": "function solution(nums) {\n    // Can be more concise!\n    let total = 0;\n    for (let i = 0; i < nums.length; i++) {\n        total = total + nums[i];\n    }\n    return total;\n}"}',
    'Python has sum(), JavaScript has reduce().',
    
    '[
      {"input": "([1, 2, 3, 4, 5])", "expected": "15"},
      {"input": "([-1, -2, -3])", "expected": "-6"},
      {"input": "([0, 0, 0])", "expected": "0"},
      {"input": "([100])", "expected": "100"}
    ]',
    true
),
(
    'Contains Duplicate',
    'Check if an array contains any duplicate values.',
    
    -- EASY: Fix broken code
    'Fix the syntax errors in the code below.',
    '{"python": "def solution(nums):\n    seen = set()\n    for num in nums\n        if num in seen\n            return True\n        seen.add(num\n    return False", "javascript": "function solution(nums) {\n    const seen = new Set();\n    for (let num of nums) {\n        if (seen.has(num)) {\n            return true\n        }\n        seen.add(num);\n    }\n    return false;\n}"}',
    'Look for missing colons, parentheses, and semicolons.',
    
    -- MEDIUM: Implement solution
    'Implement a function that checks if an array contains duplicate values.',
    '{"python": "def solution(nums):\n    # Your code here\n    pass", "javascript": "function solution(nums) {\n    // Your code here\n    \n}"}',
    'Use a set to track values you''ve seen, or compare lengths.',
    
    -- HARD: Optimize code
    'The code works but uses O(n²) time with nested loops. Optimize to O(n).',
    '{"python": "def solution(nums):\n    # O(n²) - optimize to O(n)!\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] == nums[j]:\n                return True\n    return False", "javascript": "function solution(nums) {\n    // O(n²) - optimize to O(n)!\n    for (let i = 0; i < nums.length; i++) {\n        for (let j = i + 1; j < nums.length; j++) {\n            if (nums[i] === nums[j]) {\n                return true;\n            }\n        }\n    }\n    return false;\n}"}',
    'Use a Set to track seen values in a single pass.',
    
    '[
      {"input": "([1, 2, 3, 4, 5])", "expected": "False"},
      {"input": "([1, 2, 3, 1])", "expected": "True"},
      {"input": "([1, 1, 1])", "expected": "True"},
      {"input": "([])", "expected": "False"}
    ]',
    true
);

-- Submissions table for tracking user challenge attempts
DROP TABLE IF EXISTS submissions CASCADE;
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    source_code TEXT NOT NULL,
    language_id INTEGER NOT NULL, -- Judge0 language ID (71=Python, 63=JavaScript, etc.)
    status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'error', 'timeout')),
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    execution_time_ms INTEGER, -- Execution time in milliseconds
    memory_used_kb INTEGER, -- Memory usage in kilobytes
    points_earned INTEGER DEFAULT 0,
    error_message TEXT, -- Store compilation/runtime errors
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_challenge ON submissions(challenge_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_difficulty ON submissions(difficulty);
CREATE INDEX idx_submissions_user_challenge ON submissions(user_id, challenge_id);
CREATE INDEX idx_submissions_user_challenge_difficulty ON submissions(user_id, challenge_id, difficulty);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_user_status ON submissions(user_id, status);

-- User completions tracking table (for tracking first completions)
DROP TABLE IF EXISTS user_completions CASCADE;
CREATE TABLE user_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points_awarded INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id, difficulty) -- Each user can complete each difficulty once
);
CREATE INDEX idx_completions_user ON user_completions(user_id);
CREATE INDEX idx_completions_challenge ON user_completions(challenge_id);
CREATE INDEX idx_completions_difficulty ON user_completions(difficulty);
CREATE INDEX idx_completions_date ON user_completions(completed_at DESC);

-- Leaderboard view for easy querying
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    ROW_NUMBER() OVER (
        ORDER BY total_points DESC, challenges_completed DESC, username ASC
    ) as rank,
    id,
    username,
    total_points,
    challenges_completed,
    day_streak,
    last_login,
    created_at
FROM users
ORDER BY total_points DESC, challenges_completed DESC, username ASC;