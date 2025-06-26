const { query } = require('./config');

const createTables = async () => {
  try {
    console.log('📋 Creating database tables...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Create custom types
    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE course_type AS ENUM ('online', 'offline');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE sponsorship_status AS ENUM ('active', 'paused', 'expired', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE class_type AS ENUM ('online', 'hybrid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE enrollment_type AS ENUM ('course', 'class');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE enrollment_status AS ENUM ('enrolled', 'in_progress', 'completed', 'dropped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE certification_status AS ENUM ('issued', 'expired', 'revoked');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE theme_type AS ENUM ('light', 'dark', 'system');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'successful', 'failed', 'cancelled', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('course', 'class');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('card', 'bank_transfer', 'ussd', 'mobile_money', 'qr_code');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role user_role DEFAULT 'student',
        avatar_url TEXT,
        bio TEXT,
        google_id VARCHAR(255) UNIQUE,
        google_email VARCHAR(255),
        auth_provider VARCHAR(20) DEFAULT 'local',
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Create Courses table
    await query(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        topic VARCHAR(100) NOT NULL,
        type course_type DEFAULT 'online',
        certification VARCHAR(255),
        price DECIMAL(10,2) NOT NULL,
        rating DECIMAL(3,2) DEFAULT 0,
        student_count INTEGER DEFAULT 0,
        duration VARCHAR(50) NOT NULL,
        instructor_id UUID NOT NULL,
        image_url TEXT,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Sponsorships table
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sponsor_id UUID NOT NULL,
        course_id UUID NOT NULL,
        discount_code VARCHAR(50) UNIQUE NOT NULL,
        discount_type discount_type NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        max_students INTEGER NOT NULL,
        students_used INTEGER DEFAULT 0,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status sponsorship_status DEFAULT 'active',
        completion_rate DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Create Sponsorship_Usage table
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorship_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sponsorship_id UUID NOT NULL,
        student_id UUID NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_price DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        final_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(sponsorship_id, student_id)
      )
    `);

    // Create Sponsorship_Opportunities table
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorship_opportunities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL,
        target_students INTEGER NOT NULL,
        funding_goal DECIMAL(10,2) NOT NULL,
        funding_raised DECIMAL(10,2) DEFAULT 0,
        urgency urgency_level DEFAULT 'medium',
        demographics TEXT,
        impact_description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Create Classes table
    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        topic VARCHAR(100) NOT NULL,
        type class_type DEFAULT 'online',
        start_date DATE NOT NULL,
        end_date DATE,
        duration VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        instructor_id UUID NOT NULL,
        available_slots INTEGER NOT NULL,
        total_slots INTEGER NOT NULL,
        location TEXT,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Class_Courses table
    await query(`
      CREATE TABLE IF NOT EXISTS class_courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL,
        course_id UUID NOT NULL,
        order_index INTEGER DEFAULT 0,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(class_id, course_id)
      )
    `);

    // Create Enrollments table
    await query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        course_id UUID,
        class_id UUID,
        enrollment_type enrollment_type NOT NULL,
        progress INTEGER DEFAULT 0,
        status enrollment_status DEFAULT 'enrolled',
        sponsorship_id UUID,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE SET NULL,
        CHECK (
          (enrollment_type = 'course' AND course_id IS NOT NULL AND class_id IS NULL) OR
          (enrollment_type = 'class' AND class_id IS NOT NULL AND course_id IS NULL)
        )
      )
    `);

    // Create Lessons table
    await query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT,
        video_url TEXT,
        duration_minutes INTEGER DEFAULT 0,
        order_index INTEGER NOT NULL,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Create Tests table
    await query(`
      CREATE TABLE IF NOT EXISTS tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        passing_score INTEGER DEFAULT 70,
        max_attempts INTEGER DEFAULT 3,
        order_index INTEGER NOT NULL,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Create Test_Questions table
    await query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id UUID NOT NULL,
        question TEXT NOT NULL,
        question_type question_type DEFAULT 'multiple_choice',
        options JSON,
        correct_answer INTEGER,
        correct_answer_text TEXT,
        points INTEGER DEFAULT 1,
        order_index INTEGER NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
      )
    `);

    // Add image_url column to existing test_questions table if it doesn't exist
    try {
      await query('ALTER TABLE test_questions ADD COLUMN image_url TEXT');
      console.log('✅ Added image_url column to test_questions table');
    } catch (error) {
      if (error.code === '42701') { // Column already exists
        console.log('ℹ️  image_url column already exists in test_questions table');
      } else {
        console.log('⚠️  Could not add image_url column:', error.message);
      }
    }

    // Create Test_Attempts table
    await query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_id UUID NOT NULL,
        user_id UUID NOT NULL,
        attempt_number INTEGER NOT NULL,
        score INTEGER,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER DEFAULT 0,
        status attempt_status DEFAULT 'in_progress',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        time_taken_minutes INTEGER,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(test_id, user_id, attempt_number)
      )
    `);

    // Create Test_Attempt_Answers table
    await query(`
      CREATE TABLE IF NOT EXISTS test_attempt_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id UUID NOT NULL,
        question_id UUID NOT NULL,
        selected_answer INTEGER,
        answer_text TEXT,
        is_correct BOOLEAN DEFAULT false,
        points_earned INTEGER DEFAULT 0,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE,
        UNIQUE(attempt_id, question_id)
      )
    `);

    // Create Discussions table
    await query(`
      CREATE TABLE IF NOT EXISTS discussions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        author_id UUID NOT NULL,
        course_id UUID,
        class_id UUID,
        is_pinned BOOLEAN DEFAULT false,
        reply_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      )
    `);

    // Create Discussion_Replies table
    await query(`
      CREATE TABLE IF NOT EXISTS discussion_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        discussion_id UUID NOT NULL,
        author_id UUID NOT NULL,
        content TEXT NOT NULL,
        parent_reply_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_reply_id) REFERENCES discussion_replies(id) ON DELETE SET NULL
      )
    `);

    // Create Certifications table
    await query(`
      CREATE TABLE IF NOT EXISTS certifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        course_id UUID,
        class_id UUID,
        certification_name VARCHAR(255) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        issued_date DATE NOT NULL,
        expiry_date DATE,
        certificate_url TEXT,
        verification_code VARCHAR(100) UNIQUE,
        status certification_status DEFAULT 'issued',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      )
    `);

    // Create User_Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        marketing_emails BOOLEAN DEFAULT false,
        theme theme_type DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Payments table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        course_id UUID,
        class_id UUID,
        payment_type payment_type NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'NGN',
        flutterwave_reference VARCHAR(255) UNIQUE NOT NULL,
        flutterwave_transaction_id VARCHAR(255),
        payment_method payment_method,
        status payment_status DEFAULT 'pending',
        metadata JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        CHECK (
          (payment_type = 'course' AND course_id IS NOT NULL AND class_id IS NULL) OR
          (payment_type = 'class' AND class_id IS NOT NULL AND course_id IS NULL)
        )
      )
    `);

    // Create Payment_Webhooks table for webhook logging
    await query(`
      CREATE TABLE IF NOT EXISTS payment_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flutterwave_reference VARCHAR(255) NOT NULL,
        webhook_data JSON NOT NULL,
        processed BOOLEAN DEFAULT false,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic)');
    await query('CREATE INDEX IF NOT EXISTS idx_sponsorships_code ON sponsorships(discount_code)');
    await query('CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON sponsorships(sponsor_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_tests_course ON tests(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(flutterwave_reference)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_payment_webhooks_reference ON payment_webhooks(flutterwave_reference)');

    console.log('✅ Database migration completed successfully!');
    console.log('🎉 All tables created and ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('💥 Error details:', error.message);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables().then(() => {
    console.log('🎉 Database setup complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  });
}

module.exports = { createTables }; 