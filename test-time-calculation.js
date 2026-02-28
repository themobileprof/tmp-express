/**
 * Test script to verify time calculation for test attempts
 * and check for any data anomalies
 */

const { getRows } = require('./src/database/config');

async function testTimeCalculation() {
  console.log('🔍 Testing time calculation logic...\n');

  // Test the formula with known values
  console.log('=== Formula Test ===');
  const now = Date.now();
  const oneMinuteAgo = now - (60 * 1000); // 60 seconds ago
  const tenMinutesAgo = now - (10 * 60 * 1000); // 10 minutes ago
  const oneHourAgo = now - (60 * 60 * 1000); // 60 minutes ago

  const testCalc = (startTime, label) => {
    const timeTakenMinutes = Math.round((now - startTime) / (1000 * 60));
    console.log(`${label}: ${timeTakenMinutes} minutes`);
  };

  testCalc(oneMinuteAgo, '1 minute ago  ');
  testCalc(tenMinutesAgo, '10 minutes ago');
  testCalc(oneHourAgo, '60 minutes ago');

  console.log('\n=== Database Check ===');
  
  // Check actual test attempts in database
  const attempts = await getRows(
    `SELECT 
      id, 
      test_id,
      user_id,
      started_at, 
      completed_at,
      time_taken_minutes,
      EXTRACT(EPOCH FROM (completed_at - started_at)) as actual_seconds,
      EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 as actual_minutes
    FROM test_attempts 
    WHERE status = 'completed' AND completed_at IS NOT NULL
    ORDER BY completed_at DESC 
    LIMIT 10`
  );

  if (attempts.length === 0) {
    console.log('No completed test attempts found in database.');
    console.log('\n💡 Checking for stale in_progress attempts...\n');
    
    // Check for stale in_progress attempts
    const inProgress = await getRows(
      `SELECT ta.id, ta.started_at, t.duration_minutes, t.title,
              EXTRACT(EPOCH FROM (NOW() - ta.started_at)) / 60 as age_minutes
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE ta.status = 'in_progress'`
    );
    
    if (inProgress.length > 0) {
      console.log(`Found ${inProgress.length} in_progress attempts:\n`);
      inProgress.forEach((attempt, i) => {
        const ageMinutes = Math.round(attempt.age_minutes);
        const testDuration = attempt.duration_minutes || 60;
        const isStale = ageMinutes > (testDuration + 30);
        console.log(`${i + 1}. ${attempt.title}`);
        console.log(`   Age: ${ageMinutes} minutes (test duration: ${testDuration} min)`);
        console.log(`   Status: ${isStale ? '❌ STALE (should be abandoned)' : '✓ Valid'}`);
        console.log('');
      });
      
      const staleCount = inProgress.filter(a => a.age_minutes > ((a.duration_minutes || 60) + 30)).length;
      if (staleCount > 0) {
        console.log(`\n⚠️  ${staleCount} stale attempts found!`);
        console.log('Run: node fix-abandoned-attempts.js --auto');
      }
    }
    return;
  }

  console.log(`\nFound ${attempts.length} completed test attempts:\n`);
  
  attempts.forEach((attempt, index) => {
    const storedMinutes = attempt.time_taken_minutes;
    const actualMinutes = Math.round(attempt.actual_minutes);
    const actualSeconds = Math.round(attempt.actual_seconds);
    
    const mismatch = storedMinutes !== actualMinutes;
    const isSecondsStoredAsMinutes = storedMinutes === actualSeconds;
    
    console.log(`${index + 1}. Attempt ID: ${attempt.id.substring(0, 8)}...`);
    console.log(`   Started: ${attempt.started_at}`);
    console.log(`   Completed: ${attempt.completed_at}`);
    console.log(`   Stored time_taken_minutes: ${storedMinutes}`);
    console.log(`   Actual duration (seconds): ${actualSeconds}`);
    console.log(`   Actual duration (minutes): ${actualMinutes}`);
    
    if (isSecondsStoredAsMinutes) {
      console.log(`   ⚠️  WARNING: Stored minutes equals actual seconds! (${storedMinutes} == ${actualSeconds})`);
      console.log(`   🐛 BUG DETECTED: Seconds are stored as minutes!`);
    } else if (mismatch) {
      console.log(`   ⚠️  Mismatch: stored=${storedMinutes}, actual=${actualMinutes} (diff: ${storedMinutes - actualMinutes})`);
    } else {
      console.log(`   ✓ Values match correctly`);
    }
    console.log('');
  });

  const bugged = attempts.filter(a => Math.round(a.time_taken_minutes) === Math.round(a.actual_seconds));
  if (bugged.length > 0) {
    console.log(`\n❌ ISSUE FOUND: ${bugged.length} out of ${attempts.length} test attempts have seconds stored as minutes!`);
    console.log(`\nThe calculation formula is correct: / (1000 * 60)`);
    console.log(`But somehow ${(bugged.length / attempts.length * 100).toFixed(1)}% of the data has seconds stored.`);
    console.log(`\nThis could mean:`);
    console.log(`  1. There was a previous bug that has been fixed`);
    console.log(`  2. Data was imported incorrectly`);
    console.log(`  3. There's another code path setting this value`);
    console.log(`  4. The calculation had a typo that was recently fixed`);
  } else {
    console.log(`\n✅ All test attempts have correct time values!`);
  }

  process.exit(0);
}

testTimeCalculation().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});
