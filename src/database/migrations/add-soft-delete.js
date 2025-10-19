/**
 * Migration: Add Soft Delete Support
 * Adds deleted_at columns to courses and classes tables
 * Run with: node src/database/migrations/add-soft-delete.js
 */

const { query } = require('../config');

async function up() {
  console.log('Adding soft delete columns...');
  
  try {
    // Add deleted_at to courses table
    await query(`
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to courses');

    // Add deleted_at to classes table
    await query(`
      ALTER TABLE classes
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to classes');

    // Create indexes for soft delete queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_courses_deleted_at 
      ON courses(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on courses.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_deleted_at 
      ON classes(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on classes.deleted_at');

    console.log('\n✅ Soft delete migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Removing soft delete columns...');
  
  try {
    // Drop indexes
    await query('DROP INDEX IF EXISTS idx_courses_deleted_at');
    await query('DROP INDEX IF EXISTS idx_classes_deleted_at');
    console.log('✓ Dropped indexes');

    // Remove columns
    await query('ALTER TABLE courses DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE classes DROP COLUMN IF EXISTS deleted_at');
    console.log('✓ Removed deleted_at columns');

    console.log('\n✅ Rollback completed successfully!');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  (async () => {
    try {
      await up();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
