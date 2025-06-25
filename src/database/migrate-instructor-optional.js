const { query } = require('./config');

async function migrateInstructorOptional() {
  try {
    console.log('🔄 Starting migration: Make instructor_id optional for courses...\n');

    // Check if the column is already nullable
    const checkColumn = await query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND column_name = 'instructor_id'
    `);

    if (checkColumn.rows.length > 0) {
      const isNullable = checkColumn.rows[0].is_nullable === 'YES';
      
      if (isNullable) {
        console.log('✅ instructor_id is already nullable for courses');
        return;
      }
    }

    // Drop the foreign key constraint first
    console.log('1. Dropping foreign key constraint...');
    await query(`
      ALTER TABLE courses 
      DROP CONSTRAINT IF EXISTS courses_instructor_id_fkey
    `);

    // Make the column nullable
    console.log('2. Making instructor_id nullable...');
    await query(`
      ALTER TABLE courses 
      ALTER COLUMN instructor_id DROP NOT NULL
    `);

    // Re-add the foreign key constraint (now nullable)
    console.log('3. Re-adding foreign key constraint (nullable)...');
    await query(`
      ALTER TABLE courses 
      ADD CONSTRAINT courses_instructor_id_fkey 
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📝 Courses can now be created without an instructor_id');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run the migration
migrateInstructorOptional()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }); 