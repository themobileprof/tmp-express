const { query } = require('./config');

const purgeDatabase = async () => {
  try {
    console.log('🗑️  Purging database tables...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Drop all tables in the correct order (respecting foreign key constraints)
    const tablesToDrop = [
      // Child tables first (those with foreign keys)
      'email_logs',
      'payment_webhooks',
      'lesson_workshops',
      'notifications',
      'discussion_likes',
      'discussion_replies',
      'test_attempt_answers',
      'test_attempts',
      'test_questions',
      'lesson_progress',
      'certification_program_progress',
      'certification_program_enrollments',
      'certification_program_modules',
      'certifications',
      'sponsorship_contributions',
      'sponsorship_usage',
      'sponsorship_courses',
      'class_courses',
      'enrollments',
      'payments',
      'user_settings',
      
      // Mid-level tables
      'tests',
      'lessons',
      'discussions',
      'discussion_categories',
      'sponsorship_opportunities',
      'sponsorships',
      'classes',
      'certification_programs',
      'courses',
      'scraped_urls',
      'system_settings',
      
      // Base tables last
      'users'
    ];

    for (const table of tablesToDrop) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}:`, error.message);
      }
    }

    // Drop any remaining tables not in the list
    console.log('\n🔍 Checking for any remaining tables...');
    const remainingTables = await query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%'
    `);
    
    if (remainingTables.rows.length > 0) {
      console.log(`⚠️  Found ${remainingTables.rows.length} remaining table(s):`);
      for (const row of remainingTables.rows) {
        try {
          await query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
          console.log(`✅ Dropped remaining table: ${row.tablename}`);
        } catch (error) {
          console.log(`⚠️  Could not drop ${row.tablename}:`, error.message);
        }
      }
    } else {
      console.log('✅ No remaining tables found');
    }

    // Drop all custom types
    const typesToDrop = [
      'scraping_status',
      'payment_method',
      'payment_type',
      'payment_status',
      'theme_type',
      'certification_status',
      'attempt_status',
      'question_type',
      'enrollment_status',
      'enrollment_type',
      'class_type',
      'urgency_level',
      'sponsorship_status',
      'discount_type',
      'course_type',
      'user_role'
    ];

    for (const type of typesToDrop) {
      try {
        await query(`DROP TYPE IF EXISTS ${type} CASCADE`);
        console.log(`✅ Dropped type: ${type}`);
      } catch (error) {
        console.log(`⚠️  Could not drop type ${type}:`, error.message);
      }
    }

    // Drop any remaining custom types
    console.log('\n🔍 Checking for any remaining types...');
    const remainingTypes = await query(`
      SELECT typname FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);
    
    if (remainingTypes.rows.length > 0) {
      console.log(`⚠️  Found ${remainingTypes.rows.length} remaining type(s):`);
      for (const row of remainingTypes.rows) {
        try {
          await query(`DROP TYPE IF EXISTS ${row.typname} CASCADE`);
          console.log(`✅ Dropped remaining type: ${row.typname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop ${row.typname}:`, error.message);
        }
      }
    } else {
      console.log('✅ No remaining types found');
    }

    // Drop all sequences
    console.log('\n🔍 Checking for sequences...');
    const sequences = await query(`
      SELECT sequencename FROM pg_sequences 
      WHERE schemaname = 'public'
    `);
    
    if (sequences.rows.length > 0) {
      for (const row of sequences.rows) {
        try {
          await query(`DROP SEQUENCE IF EXISTS ${row.sequencename} CASCADE`);
          console.log(`✅ Dropped sequence: ${row.sequencename}`);
        } catch (error) {
          console.log(`⚠️  Could not drop sequence ${row.sequencename}:`, error.message);
        }
      }
    } else {
      console.log('✅ No sequences found');
    }

    // Drop all functions
    console.log('\n🔍 Checking for functions...');
    const functions = await query(`
      SELECT proname, pg_get_function_identity_arguments(oid) as args
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `);
    
    if (functions.rows.length > 0) {
      for (const row of functions.rows) {
        try {
          await query(`DROP FUNCTION IF EXISTS ${row.proname}(${row.args}) CASCADE`);
          console.log(`✅ Dropped function: ${row.proname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop function ${row.proname}:`, error.message);
        }
      }
    } else {
      console.log('✅ No functions found');
    }

    // Drop all views
    console.log('\n🔍 Checking for views...');
    const views = await query(`
      SELECT viewname FROM pg_views 
      WHERE schemaname = 'public'
    `);
    
    if (views.rows.length > 0) {
      for (const row of views.rows) {
        try {
          await query(`DROP VIEW IF EXISTS ${row.viewname} CASCADE`);
          console.log(`✅ Dropped view: ${row.viewname}`);
        } catch (error) {
          console.log(`⚠️  Could not drop view ${row.viewname}:`, error.message);
        }
      }
    } else {
      console.log('✅ No views found');
    }

    console.log('\n✅ Database purge completed successfully!');
    console.log('🎉 All tables, types, sequences, functions, and views have been removed!');
    console.log('📊 Database is now completely clean and ready for fresh migration');
    
  } catch (error) {
    console.error('❌ Database purge failed:', error);
    console.error('💥 Error details:', error.message);
    process.exit(1);
  }
};

// Run purge if this file is executed directly
if (require.main === module) {
  // Add confirmation prompt
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('⚠️  WARNING: This will DELETE ALL DATA from the database. Are you sure? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      rl.close();
      purgeDatabase().then(() => {
        console.log('🎉 Database purge complete!');
        process.exit(0);
      }).catch((error) => {
        console.error('💥 Database purge failed:', error);
        process.exit(1);
      });
    } else {
      console.log('❌ Database purge cancelled.');
      rl.close();
      process.exit(0);
    }
  });
}

module.exports = { purgeDatabase }; 