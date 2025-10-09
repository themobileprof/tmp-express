const { query, getRow } = require('../src/database/config');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

(async () => {
  try {
    const id = process.argv[2];
    const newPassword = process.argv[3] || 'TempPass123!';
    if (!id) {
      console.error('Usage: node scripts/reset-and-test-password.js <user-id> [newPassword]');
      process.exit(1);
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hash = await bcrypt.hash(newPassword, saltRounds);

    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, id]);
    console.log('✅ Updated password hash for user', id);

    const user = await getRow('SELECT id, email, password_hash FROM users WHERE id = $1', [id]);
    if (!user) {
      console.error('User not found after update');
      process.exit(2);
    }

    const match = await bcrypt.compare(newPassword, user.password_hash);
    console.log('bcrypt.compare result:', match);

    // If server is running locally, try to login via HTTP to verify whole flow
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    try {
      const res = await fetch(baseUrl + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: newPassword })
      });
      const text = await res.text();
      console.log('HTTP login status:', res.status);
      console.log('HTTP login response:', text);
    } catch (err) {
      console.log('Could not reach HTTP server to test login:', err.message || err);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
})();
