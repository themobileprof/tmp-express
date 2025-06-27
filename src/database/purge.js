const { query } = require('./config');

const purgeDatabase = async () => {
  try {
    console.log('🗑️  Purging database tables...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Drop all tables in the correct order (respecting foreign key constraints)
    const tablesToDrop = [
      'payment_webhooks',
      'payments',
      'user_settings',
      'certifications',
      'discussion_replies',
      'discussions',
      'test_attempt_answers',
      'test_attempts',
      'test_questions',
      'tests',
      'lessons',
      'enrollments',
      'class_courses',
      'classes',
      'sponsorship_opportunities',
      'sponsorship_usage',
      'sponsorships',
      'courses',
      'users',
      'scraped_urls'
    ];

    for (const table of tablesToDrop) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop table ${table}:`, error.message);
      }
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

    console.log('✅ Database purge completed successfully!');
    console.log('🎉 All tables and types have been removed!');
    
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