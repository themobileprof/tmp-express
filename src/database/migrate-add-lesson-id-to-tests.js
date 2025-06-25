const { query } = require('./config');

async function migrate() {
  try {
    console.log('🔄 Adding lesson_id column to tests table...');

    // Check if lesson_id already exists
    const check = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tests' AND column_name = 'lesson_id'
    `);
    if (check.rows.length > 0) {
      console.log('✅ lesson_id column already exists in tests table.');
      return;
    }

    // Add lesson_id column
    await query(`
      ALTER TABLE tests
      ADD COLUMN lesson_id UUID;
    `);
    console.log('✅ lesson_id column added.');

    // Add foreign key constraint
    await query(`
      ALTER TABLE tests
      ADD CONSTRAINT fk_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
    `);
    console.log('✅ Foreign key constraint added.');

    console.log('🎉 Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate(); 