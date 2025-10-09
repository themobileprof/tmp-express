const { getRow } = require('../src/database/config');
const validator = require('validator');

(async () => {
  try {
    const raw = process.argv[2];
    if (!raw) {
      console.error('Usage: node scripts/find-email.js <email>');
      process.exit(1);
    }
  // Match server normalization: preserve Gmail dots
  const normalized = validator.normalizeEmail(raw, { gmail_remove_dots: false, gmail_convert_googlemaildotcom: false });
    console.log('Normalized:', normalized);
    const row = await getRow('SELECT id, email, auth_provider, is_active FROM users WHERE email = $1', [normalized]);
    console.log('Row:', JSON.stringify(row, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
