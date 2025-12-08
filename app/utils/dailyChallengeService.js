/**
 * Daily Challenge Service
 * Core business logic for daily challenge feature
 */

const supabase = require('../database');

/**
 * Get or create today's daily challenge
 * @param {string} date - Date in YYYY-MM-DD format (user's local date or UTC)
 * @returns {Object} Daily challenge data
 */
async function getDailyChallenge(date) {
  try {
    // Check if today already has a challenge
    const { data: existingDaily, error: checkError } = await supabase
      .from('daily_challenges')
      .select(`
        id,
        challenge_id,
        date,
        pool_cycle,
        challenges (
          id,
          title,
          description,
          easy_instructions,
          easy_starter_code,
          easy_hint,
          medium_instructions,
          medium_starter_code,
          medium_hint,
          hard_instructions,
          hard_starter_code,
          hard_hint,
          test_cases
        )
      `)
      .eq('date', date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected if no daily challenge yet
      throw checkError;
    }

    // If challenge exists and is active, return it
    if (existingDaily && existingDaily.challenges) {
      return {
        success: true,
        dailyChallenge: existingDaily,
        isNew: false
      };
    }

    // Need to select a new challenge for today
    const newChallenge = await selectNewDailyChallenge(date);
    
    return {
      success: true,
      dailyChallenge: newChallenge,
      isNew: true
    };
  } catch (error) {
    // If race condition occurred, try fetching one more time
    if (error.code === '23505') {
      console.log('⚠️  Duplicate detected, retrying fetch...');
      try {
        const { data: retryDaily, error: retryError } = await supabase
          .from('daily_challenges')
          .select(`
            id,
            challenge_id,
            date,
            pool_cycle,
            challenges (
              id,
              title,
              description,
              easy_instructions,
              easy_starter_code,
              easy_hint,
              medium_instructions,
              medium_starter_code,
              medium_hint,
              hard_instructions,
              hard_starter_code,
              hard_hint,
              test_cases
            )
          `)
          .eq('date', date)
          .single();
        
        if (!retryError && retryDaily) {
          return {
            success: true,
            dailyChallenge: retryDaily,
            isNew: false
          };
        }
      } catch (retryErr) {
        console.error('Retry also failed:', retryErr);
      }
    }
    
    console.error('Error getting daily challenge:', error);
    throw error;
  }
}

/**
 * Select a new daily challenge (pool exhaustion logic)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Object} Newly created daily challenge
 */
async function selectNewDailyChallenge(date) {
  try {
    // 1. Get current cycle number
    const { data: latestCycleData } = await supabase
      .from('daily_challenges')
      .select('pool_cycle')
      .order('pool_cycle', { ascending: false })
      .limit(1)
      .single();
    
    const currentCycle = latestCycleData?.pool_cycle || 1;

    // 2. Get all active challenges
    const { data: allChallenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id')
      .eq('is_active', true);
    
    if (challengesError) throw challengesError;
    
    if (!allChallenges || allChallenges.length === 0) {
      throw new Error('No active challenges available');
    }

    // 3. Get challenges already used in current cycle
    const { data: usedInCycle, error: usedError } = await supabase
      .from('daily_challenges')
      .select('challenge_id')
      .eq('pool_cycle', currentCycle);
    
    if (usedError) throw usedError;

    const usedIds = (usedInCycle || []).map(d => d.challenge_id);

    // 4. Find available challenges
    const availableChallenges = allChallenges.filter(
      c => !usedIds.includes(c.id)
    );

    // 5. Determine cycle and select challenge
    let cycleToUse = currentCycle;
    let selectedChallengeId;

    if (availableChallenges.length === 0) {
      // Pool exhausted! Start new cycle
      cycleToUse = currentCycle + 1;
      // Select random from ALL challenges
      selectedChallengeId = allChallenges[Math.floor(Math.random() * allChallenges.length)].id;
      console.log(`🔄 Pool exhausted! Starting cycle ${cycleToUse}`);
    } else {
      // Select random from available
      selectedChallengeId = availableChallenges[Math.floor(Math.random() * availableChallenges.length)].id;
      console.log(`✅ Selected challenge ${selectedChallengeId} from pool (${availableChallenges.length} remaining in cycle ${cycleToUse})`);
    }

    // 6. Insert the new daily challenge
    const { data: newDaily, error: insertError } = await supabase
      .from('daily_challenges')
      .insert({
        challenge_id: selectedChallengeId,
        date: date,
        pool_cycle: cycleToUse
      })
      .select(`
        id,
        challenge_id,
        date,
        pool_cycle,
        challenges (
          id,
          title,
          description,
          easy_instructions,
          easy_starter_code,
          easy_hint,
          medium_instructions,
          medium_starter_code,
          medium_hint,
          hard_instructions,
          hard_starter_code,
          hard_hint,
          test_cases
        )
      `)
      .single();

    // Handle race condition: if another request already created today's challenge
    if (insertError && insertError.code === '23505') {
      console.log('⚠️  Race condition detected - fetching existing daily challenge');
      // Another request created it, just fetch it
      const { data: existingDaily, error: fetchError } = await supabase
        .from('daily_challenges')
        .select(`
          id,
          challenge_id,
          date,
          pool_cycle,
          challenges (
            id,
            title,
            description,
            easy_instructions,
            easy_starter_code,
            easy_hint,
            medium_instructions,
            medium_starter_code,
            medium_hint,
            hard_instructions,
            hard_starter_code,
            hard_hint,
            test_cases
          )
        `)
        .eq('date', date)
        .single();
      
      if (fetchError) throw fetchError;
      return existingDaily;
    }
    
    if (insertError) throw insertError;

    return newDaily;
  } catch (error) {
    console.error('Error selecting new daily challenge:', error);
    throw error;
  }
}

/**
 * Check if a specific challenge is today's daily challenge
 * @param {number} challengeId - Challenge ID to check
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {boolean} True if this challenge is today's daily
 */
async function isTodaysDaily(challengeId, date) {
  try {
    const { data, error } = await supabase
      .from('daily_challenges')
      .select('challenge_id')
      .eq('date', date)
      .eq('challenge_id', challengeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if challenge is daily:', error);
    return false;
  }
}

/**
 * Update user's streak after completing a daily challenge
 * @param {number} userId - User ID
 * @param {string} completionDate - Date in YYYY-MM-DD format
 * @returns {Object} Updated streak information
 */
async function updateStreak(userId, completionDate) {
  try {
    // Get user's current streak data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('day_streak, longest_streak, last_daily_challenge_date')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const today = new Date(completionDate);
    const lastDate = userData.last_daily_challenge_date 
      ? new Date(userData.last_daily_challenge_date) 
      : null;

    let newStreak;
    let streakAction = 'maintained';

    if (!lastDate) {
      // First daily challenge ever
      newStreak = 1;
      streakAction = 'started';
    } else {
      const lastDateStr = lastDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      // Check if already completed today
      if (lastDateStr === todayStr) {
        // Already completed today, no change
        return {
          streak: userData.day_streak,
          longestStreak: userData.longest_streak,
          streakAction: 'already_completed_today'
        };
      }

      // Calculate yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDateStr === yesterdayStr) {
        // Completed yesterday, increment streak
        newStreak = (userData.day_streak || 0) + 1;
        streakAction = 'incremented';
      } else {
        // Missed days, reset streak
        newStreak = 1;
        streakAction = 'reset';
      }
    }

    // Calculate longest streak
    const longestStreak = Math.max(
      userData.longest_streak || 0,
      newStreak
    );

    // Update user's streak data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        day_streak: newStreak,
        longest_streak: longestStreak,
        last_daily_challenge_date: completionDate
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`🔥 Streak updated for user ${userId}: ${newStreak} days (action: ${streakAction})`);

    return {
      streak: newStreak,
      longestStreak: longestStreak,
      streakAction: streakAction,
      previousStreak: userData.day_streak || 0
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
}

/**
 * Get user's today date based on their timezone
 * @param {string} timezone - User's timezone (e.g., 'America/New_York')
 * @returns {string} Date in YYYY-MM-DD format
 */
function getUserToday(timezone = 'UTC') {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { 
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch (error) {
    console.error('Error getting user today:', error);
    // Fallback to UTC
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Check if user has already completed a challenge at any difficulty
 * @param {number} userId - User ID
 * @param {number} challengeId - Challenge ID
 * @returns {Object} Completion status by difficulty
 */
async function getUserChallengeCompletions(userId, challengeId) {
  try {
    const { data, error } = await supabase
      .from('user_completions')
      .select('difficulty')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId);

    if (error) throw error;

    const completions = {
      easy: false,
      medium: false,
      hard: false
    };

    (data || []).forEach(row => {
      completions[row.difficulty] = true;
    });

    return completions;
  } catch (error) {
    console.error('Error getting user completions:', error);
    return { easy: false, medium: false, hard: false };
  }
}

module.exports = {
  getDailyChallenge,
  selectNewDailyChallenge,
  isTodaysDaily,
  updateStreak,
  getUserToday,
  getUserChallengeCompletions
};

