#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { query, getRow } = require('../src/database/config');
require('dotenv').config();

const createAdminUser = async (email, password, firstName, lastName) => {
  try {
    console.log('🔧 Creating admin user...');

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.error('❌ All fields are required: email, password, firstName, lastName');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      process.exit(1);
    }

    // Validate password strength
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      console.error('❌ User with this email already exists');
      process.exit(1);
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider, email_verified, is_active)
       VALUES ($1, $2, $3, $4, 'admin', 'local', true, true)
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, passwordHash, firstName, lastName]
    );

    const admin = result.rows[0];

    // Create default user settings
    await query(
      `INSERT INTO user_settings (user_id) VALUES ($1)`,
      [admin.id]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Created: ${admin.created_at}`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  Please save these credentials securely!');
    console.log('🚀 You can now login at: POST /api/auth/admin/login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Interactive mode
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const interactiveMode = async () => {
  try {
    console.log('🔧 TheMobileProf Admin User Creation');
    console.log('=====================================\n');

    const email = await question('Email: ');
    const password = await question('Password (min 8 characters): ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');

    rl.close();

    await createAdminUser(email, password, firstName, lastName);

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
};

// Command line arguments mode
const argsMode = () => {
  const args = process.argv.slice(2);
  
  if (args.length !== 4) {
    console.log('Usage: node scripts/create-admin.js <email> <password> <firstName> <lastName>');
    console.log('');
    console.log('Or run without arguments for interactive mode:');
    console.log('node scripts/create-admin.js');
    process.exit(1);
  }

  const [email, password, firstName, lastName] = args;
  createAdminUser(email, password, firstName, lastName);
};

// Main execution
if (require.main === module) {
  if (process.argv.length === 2) {
    // Interactive mode
    interactiveMode();
  } else {
    // Command line arguments mode
    argsMode();
  }
}

module.exports = { createAdminUser }; 