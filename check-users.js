const { query, getRow } = require('./src/database/config');
const bcrypt = require('bcryptjs');

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users...\n');

    // Get all users
    const users = await query(`
      SELECT id, email, first_name, last_name, role, is_active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    if (users.rows.length === 0) {
      console.log('❌ No users found in the database.');
      console.log('You need to create at least one admin user first.');
      return;
    }

    console.log(`📊 Found ${users.rows.length} user(s):\n`);

    users.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // Check for instructors specifically
    const instructors = users.rows.filter(user => user.role === 'instructor');
    
    if (instructors.length === 0) {
      console.log('⚠️  No instructors found!');
      console.log('You need an instructor to create courses.');
      
      const createInstructor = await askQuestion('Would you like to create an instructor? (y/n): ');
      
      if (createInstructor.toLowerCase() === 'y' || createInstructor.toLowerCase() === 'yes') {
        await createInstructorUser();
      }
    } else {
      console.log(`✅ Found ${instructors.length} instructor(s):`);
      instructors.forEach((instructor, index) => {
        console.log(`   ${index + 1}. ${instructor.first_name} ${instructor.last_name} (${instructor.id})`);
      });
      console.log('\n💡 Use one of these instructor IDs when creating courses.');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  }
}

async function createInstructorUser() {
  try {
    console.log('\n👨‍🏫 Creating instructor user...\n');

    // Generate a default instructor
    const instructorData = {
      email: 'instructor@themobileprof.com',
      password: 'instructor123',
      firstName: 'Default',
      lastName: 'Instructor',
      role: 'instructor'
    };

    // Check if user already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = $1', [instructorData.email]);
    if (existingUser) {
      console.log('⚠️  Instructor with this email already exists.');
      return;
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(instructorData.password, saltRounds);

    // Create instructor
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider, email_verified, is_active)
       VALUES ($1, $2, $3, $4, $5, 'local', true, true)
       RETURNING id, email, first_name, last_name, role`,
      [instructorData.email, passwordHash, instructorData.firstName, instructorData.lastName, instructorData.role]
    );

    const instructor = result.rows[0];

    // Create default user settings
    await query(
      `INSERT INTO user_settings (user_id) VALUES ($1)`,
      [instructor.id]
    );

    console.log('✅ Instructor created successfully!');
    console.log(`   Name: ${instructor.first_name} ${instructor.last_name}`);
    console.log(`   Email: ${instructor.email}`);
    console.log(`   Password: ${instructorData.password}`);
    console.log(`   ID: ${instructor.id}`);
    console.log('\n💡 Use this instructor ID when creating courses.');
    console.log('⚠️  Remember to change the password in production!');

  } catch (error) {
    console.error('❌ Error creating instructor:', error.message);
  }
}

function askQuestion(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Run the check
checkUsers(); 