const { getRow } = require('../src/database/config');

(async () => {
  try {
    const id = process.argv[2];
    if (!id) {
      console.error('Usage: node scripts/check-user.js <user-id>');
      process.exit(1);
    }
    const user = await getRow('SELECT id, email, auth_provider, password_hash IS NOT NULL as has_password, updated_at FROM users WHERE id = $1', [id]);
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
