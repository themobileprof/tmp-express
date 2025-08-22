const { query } = require('../src/database/config');

const defaultSettings = {
  'support_email': 'support@themobileprof.com',
  'site_description': 'Professional mobile development learning platform',
  'max_file_size': '10MB',
  'maintenance_mode': 'false',
  'email_verification_required': 'true',
  'max_test_attempts': '3',
  'sponsorship_code_length': '10',
  'max_sponsorship_duration_months': '12'
};

const initializeSystemSettings = async () => {
  try {
    console.log('🔧 Initializing system settings...');
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      await query(
        `INSERT INTO system_settings (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
      console.log(`✅ Set ${key} = ${value}`);
    }
    
    console.log('🎉 System settings initialized successfully!');
    console.log('\n📋 Current system settings:');
    
    const settings = await query('SELECT * FROM system_settings ORDER BY key');
    settings.rows.forEach(row => {
      console.log(`  ${row.key}: ${row.value}`);
    });
    
  } catch (error) {
    console.error('❌ Error initializing system settings:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeSystemSettings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to initialize system settings:', error);
      process.exit(1);
    });
}

module.exports = { initializeSystemSettings, defaultSettings }; 