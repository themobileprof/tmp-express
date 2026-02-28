# Test Time Calculation Bug - Fix Summary

## 🐛 The Bug

When taking a test multiple times, the `timeTakenMinutes` field was showing incorrect values (e.g., 172 minutes for a 20-minute test).

## 🔍 Root Cause

The backend has a "resume test" feature that reuses old `in_progress` attempts:

1. **First attempt**: User starts test → creates attempt with `started_at = 10:00 AM`
2. **Abandoned**: User doesn't complete, leaves it as `in_progress`
3. **Second attempt**: User starts same test 150 minutes later
4. **Bug**: System finds the OLD `in_progress` attempt and resumes it
5. **Completion**: User completes test at 12:52 PM
6. **Wrong calculation**: `12:52 PM - 10:00 AM = 172 minutes` ❌

The calculation formula was **always correct**: `(now - started_at) / (1000 * 60)`

The problem was using the **wrong `started_at`** from an old abandoned attempt!

## ✅ The Fix

### Code Changes in `src/routes/tests.js`

Added timeout logic to the "Start Test" endpoint (around **line 540**):

```javascript
if (inProgressAttempt) {
  // Check if the in-progress attempt has expired
  const attemptAge = Math.round((Date.now() - new Date(inProgressAttempt.started_at).getTime()) / (1000 * 60));
  const testDurationWithBuffer = (test.duration_minutes || 60) + 30; // 30-min buffer
  
  if (attemptAge > testDurationWithBuffer) {
    // Mark old attempt as abandoned and create new one
    console.log(`Abandoning timed-out attempt ${inProgressAttempt.id}`);
    await query(
      `UPDATE test_attempts SET status = 'abandoned' WHERE id = $1`,
      [inProgressAttempt.id]
    );
    // Continue to create new attempt
  } else {
    // Resume existing attempt (still within time limit)
    console.log(`Resuming in-progress attempt ${inProgressAttempt.id}`);
    // ... return existing attempt
  }
}
```

### What This Does

- When starting a test, check if any old `in_progress` attempt exists
- If the attempt age exceeds test duration + 30 minutes → mark as `abandoned`
- Create a **fresh attempt** with current timestamp
- If within time limit → resume (existing behavior)

### Buffer Time

The fix adds a 30-minute buffer to allow for:
- Network issues
- Browser crashes  
- Brief interruptions

Example: 20-minute test allows up to 50 minutes (20 + 30) before abandoning.

## 🔧 Fixing Existing Data

Two utility scripts have been created:

### 1. Check Database (`test-time-calculation.js`)

```bash
node test-time-calculation.js
```

This script:
- Tests the calculation formula (confirms it's correct)
- Checks completed attempts for incorrect time values
- Lists stale `in_progress` attempts that should be abandoned

### 2. Fix Stale Attempts (`fix-abandoned-attempts.js`)

```bash
# Preview what will be changed
node fix-abandoned-attempts.js

# Actually mark stale attempts as abandoned
node fix-abandoned-attempts.js --auto
```

This script:
- Finds all `in_progress` attempts older than test duration + 30 min
- Marks them as `abandoned`
- Prevents them from being resumed in the future

## 📊 Impact

### Before Fix
- Old `in_progress` attempts were never cleaned up
- Resuming old attempts caused wildly incorrect time calculations
- Users could see 172 minutes for a 20-minute test

### After Fix
- Stale attempts are automatically marked as `abandoned`
- Each test start gets a fresh attempt with correct timestamp
- Time calculations are accurate
- Resume feature still works for legitimate interruptions (within time limit)

## 🚀 Deployment Steps

1. **Deploy code changes** to production
2. **Run diagnostic**: `node test-time-calculation.js` on production DB
3. **Fix stale data**: `node fix-abandoned-attempts.js --auto` on production DB
4. **Monitor**: Check logs for "Abandoning timed-out attempt" messages

## ✨ Additional Benefits

- Database cleanup (abandoned attempts are clearly marked)
- Better user experience (no confusion from resuming very old attempts)
- More accurate analytics (time_taken_minutes is reliable)
- Maintains resume functionality for legitimate use cases

## 🔍 Testing

To verify the fix works:

1. Start a test
2. Don't complete it (leave as `in_progress`)
3. Wait longer than test duration + 30 minutes
4. Start the same test again
5. Verify a NEW attempt is created (check `started_at` is current time)
6. Complete the test
7. Verify `timeTakenMinutes` reflects actual duration, not total time since first start
