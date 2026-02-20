/**
 * Migration: Add student flag fields to lessons and lesson_workshops
 * This enables students to flag problematic content for admin review
 */

const { query } = require('../src/database/config.js');

async function addFlagFields() {
  console.log('Adding flag fields to lessons and lesson_workshops...');

  try {
    // Add flag fields to lessons table
    await query(`
      ALTER TABLE lessons
      ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_flagged_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_flag_reason TEXT;
    `);
    console.log('✅ Added flag fields to lessons table');

    // Add flag fields to lesson_workshops table
    await query(`
      ALTER TABLE lesson_workshops
      ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_flagged_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_flag_reason TEXT;
    `);
    console.log('✅ Added flag fields to lesson_workshops table');

    // Add last_flag_reason to test_questions (other flag fields already exist)
    await query(`
      ALTER TABLE test_questions
      ADD COLUMN IF NOT EXISTS last_flag_reason TEXT;
    `);
    console.log('✅ Added last_flag_reason to test_questions table');

    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
  
  process.exit(0);
}

addFlagFields();
