/**
 * Migration: Add Soft Delete Support (Extended)
 * Adds deleted_at columns to additional important tables
 * Run with: node src/database/migrations/add-soft-delete-extended.js
 */

const { query } = require('../config');

async function up() {
  console.log('Adding soft delete columns to additional tables...\n');
  
  try {
    // Add deleted_at to lessons table
    await query(`
      ALTER TABLE lessons
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to lessons');

    // Add deleted_at to tests table
    await query(`
      ALTER TABLE tests
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to tests');

    // Add deleted_at to discussions table
    await query(`
      ALTER TABLE discussions
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to discussions');

    // Add deleted_at to sponsorships table
    await query(`
      ALTER TABLE sponsorships
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to sponsorships');

    // Add deleted_at to certification_programs table
    await query(`
      ALTER TABLE certification_programs
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to certification_programs');

    // Add deleted_at to sponsorship_opportunities table
    await query(`
      ALTER TABLE sponsorship_opportunities
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
    `);
    console.log('✓ Added deleted_at to sponsorship_opportunities');

    console.log('\n📊 Creating indexes for soft delete queries...\n');

    // Create indexes for efficient soft delete queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at 
      ON lessons(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on lessons.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tests_deleted_at 
      ON tests(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on tests.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_discussions_deleted_at 
      ON discussions(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on discussions.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sponsorships_deleted_at 
      ON sponsorships(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on sponsorships.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_certification_programs_deleted_at 
      ON certification_programs(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on certification_programs.deleted_at');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sponsorship_opportunities_deleted_at 
      ON sponsorship_opportunities(deleted_at) 
      WHERE deleted_at IS NULL;
    `);
    console.log('✓ Created index on sponsorship_opportunities.deleted_at');

    console.log('\n✅ Extended soft delete migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Added deleted_at to 6 tables');
    console.log('   - Created 6 partial indexes');
    console.log('   - Soft delete now available for:');
    console.log('     • Lessons');
    console.log('     • Tests');
    console.log('     • Discussions');
    console.log('     • Sponsorships');
    console.log('     • Certification Programs');
    console.log('     • Sponsorship Opportunities');
    console.log('\n⚠️  Remember to update route handlers to filter: WHERE deleted_at IS NULL');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('Rolling back extended soft delete columns...\n');
  
  try {
    // Drop indexes
    await query('DROP INDEX IF EXISTS idx_lessons_deleted_at');
    await query('DROP INDEX IF EXISTS idx_tests_deleted_at');
    await query('DROP INDEX IF EXISTS idx_discussions_deleted_at');
    await query('DROP INDEX IF EXISTS idx_sponsorships_deleted_at');
    await query('DROP INDEX IF EXISTS idx_certification_programs_deleted_at');
    await query('DROP INDEX IF EXISTS idx_sponsorship_opportunities_deleted_at');
    console.log('✓ Dropped all soft delete indexes');

    // Drop columns
    await query('ALTER TABLE lessons DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE tests DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE discussions DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE sponsorships DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE certification_programs DROP COLUMN IF EXISTS deleted_at');
    await query('ALTER TABLE sponsorship_opportunities DROP COLUMN IF EXISTS deleted_at');
    console.log('✓ Dropped all deleted_at columns');

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
