/**
 * Migration script to add simple review tracking for lessons, test questions, and workshops
 * Run with: node scripts/add-content-review-fields.js
 */

const { query } = require('../src/database/config');

async function migrate() {
  console.log('Starting content review fields migration...');

  try {
    // Add review fields to lessons table
    await query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;
    `);
    console.log('✓ Added review fields to lessons table');

    // Add index for filtering lessons by review status
    await query(`
      CREATE INDEX IF NOT EXISTS idx_lessons_is_reviewed 
      ON lessons(is_reviewed) WHERE deleted_at IS NULL;
    `);
    console.log('✓ Added index for lessons review tracking');

    // Add review fields to test_questions table
    await query(`
      ALTER TABLE test_questions 
      ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;
    `);
    console.log('✓ Added review fields to test_questions table');

    // Add index for filtering test questions by review status
    await query(`
      CREATE INDEX IF NOT EXISTS idx_test_questions_is_reviewed 
      ON test_questions(is_reviewed);
    `);
    console.log('✓ Added index for test_questions review tracking');

    // Add review fields to lesson_workshops table
    await query(`
      ALTER TABLE lesson_workshops 
      ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;
    `);
    console.log('✓ Added review fields to lesson_workshops table');

    // Add index for filtering workshops by review status
    await query(`
      CREATE INDEX IF NOT EXISTS idx_lesson_workshops_is_reviewed 
      ON lesson_workshops(is_reviewed);
    `);
    console.log('✓ Added index for lesson_workshops review tracking');

    // Mark existing published content as reviewed (migration assumption: existing content is already live)
    await query(`
      UPDATE lessons 
      SET is_reviewed = true 
      WHERE is_published = true AND deleted_at IS NULL;
    `);
    console.log('✓ Marked existing published lessons as reviewed');

    await query(`
      UPDATE test_questions tq
      SET is_reviewed = true
      FROM tests t
      WHERE tq.test_id = t.id AND t.is_published = true;
    `);
    console.log('✓ Marked existing published test questions as reviewed');

    await query(`
      UPDATE lesson_workshops 
      SET is_reviewed = true 
      WHERE is_enabled = true;
    `);
    console.log('✓ Marked existing enabled workshops as reviewed');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nAdmins can now mark content as reviewed/unreviewed at any time.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { migrate };
