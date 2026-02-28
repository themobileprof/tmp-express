/**
 * Fix script to mark old in_progress attempts as abandoned
 * This fixes the time calculation bug for users who started tests
 * and never completed them
 */

const { query, getRows } = require('./src/database/config');

async function fixAbandonedAttempts() {
  console.log('🔧 Checking for stale in_progress test attempts...\n');

  // Find all in_progress attempts
  const inProgressAttempts = await getRows(
    `SELECT ta.id, ta.test_id, ta.user_id, ta.started_at, ta.attempt_number,
            t.title as test_title, t.duration_minutes,
            EXTRACT(EPOCH FROM (NOW() - ta.started_at)) / 60 as age_minutes
     FROM test_attempts ta
     JOIN tests t ON ta.test_id = t.id
     WHERE ta.status = 'in_progress'
     ORDER BY ta.started_at DESC`
  );

  if (inProgressAttempts.length === 0) {
    console.log('✅ No in_progress attempts found. Database is clean!');
    process.exit(0);
  }

  console.log(`Found ${inProgressAttempts.length} in_progress attempts:\n`);

  const abandoned = [];
  const stillValid = [];

  inProgressAttempts.forEach((attempt, index) => {
    const ageMinutes = Math.round(attempt.age_minutes);
    const testDurationWithBuffer = (attempt.duration_minutes || 60) + 30;
    const shouldAbandon = ageMinutes > testDurationWithBuffer;

    const status = shouldAbandon ? 'ABANDON' : 'KEEP';
    const emoji = shouldAbandon ? '❌' : '✓';

    console.log(`${emoji} ${index + 1}. Attempt ${attempt.id.substring(0, 8)}...`);
    console.log(`   Test: ${attempt.test_title} (duration: ${attempt.duration_minutes} min)`);
    console.log(`   Started: ${attempt.started_at}`);
    console.log(`   Age: ${ageMinutes} minutes`);
    console.log(`   Status: ${status} (limit: ${testDurationWithBuffer} min)`);
    console.log('');

    if (shouldAbandon) {
      abandoned.push(attempt);
    } else {
      stillValid.push(attempt);
    }
  });

  if (abandoned.length === 0) {
    console.log('✅ All in_progress attempts are still valid. No action needed!');
    process.exit(0);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total in_progress: ${inProgressAttempts.length}`);
  console.log(`   Should abandon: ${abandoned.length}`);
  console.log(`   Still valid: ${stillValid.length}`);
  console.log('');

  // Ask for confirmation (or auto-proceed if --auto flag)
  const autoMode = process.argv.includes('--auto');

  if (!autoMode) {
    console.log('⚠️  These attempts will be marked as "abandoned".');
    console.log('   Run with --auto flag to proceed automatically: node fix-abandoned-attempts.js --auto');
    process.exit(0);
  }

  console.log('🔄 Marking attempts as abandoned...\n');

  let updated = 0;
  for (const attempt of abandoned) {
    try {
      await query(
        `UPDATE test_attempts SET status = 'abandoned' WHERE id = $1`,
        [attempt.id]
      );
      updated++;
      console.log(`✓ Abandoned attempt ${attempt.id.substring(0, 8)}... for test "${attempt.test_title}"`);
    } catch (error) {
      console.error(`✗ Failed to abandon attempt ${attempt.id}:`, error.message);
    }
  }

  console.log(`\n✅ Updated ${updated} out of ${abandoned.length} attempts!`);
  console.log('\n💡 The bug has been fixed in the code, so new attempts will not have this issue.');
  process.exit(0);
}

fixAbandonedAttempts().catch(error => {
  console.error('Error running fix script:', error);
  process.exit(1);
});
