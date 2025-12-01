const { query } = require('./config');

const createTables = async () => {
  try {
    console.log('📋 Creating database tables...');
    console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('⏰ Migration started at:', new Date().toISOString());

    // Create custom types
    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'sponsor');
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

    await query(`
      DO $$ BEGIN
        CREATE TYPE scraping_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped', 'partial');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create Users table (create-only - includes verification/reset columns)
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
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
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
        instructor_id UUID,
        image_url TEXT,
        difficulty VARCHAR(50),
        objectives TEXT,
        prerequisites TEXT,
        syllabus TEXT,
        tags TEXT[],
        is_published BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create Sponsorships table (multi-course model)
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sponsor_id UUID NOT NULL,
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
        is_paid BOOLEAN DEFAULT false,
        paid_at TIMESTAMP,
        payment_id UUID,
        payment_reference VARCHAR(255),
        paid_amount DECIMAL(10,2),
        paid_currency VARCHAR(3) DEFAULT 'USD',
        created_by VARCHAR(20) DEFAULT 'sponsor',
        admin_note TEXT,
        invoice_number VARCHAR(100),
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Sponsorship_Courses table for multi-course sponsorships
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorship_courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sponsorship_id UUID NOT NULL,
        course_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(sponsorship_id, course_id)
      )
    `);

    // Create Sponsorship_Usage table
    await query(`
      CREATE TABLE IF NOT EXISTS sponsorship_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sponsorship_id UUID NOT NULL,
        course_id UUID,
        student_id UUID NOT NULL,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        original_price DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        final_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
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
        created_by UUID,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create System Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        deleted_at TIMESTAMP DEFAULT NULL,
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
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Create Lesson_Progress table
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        lesson_id UUID NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        progress_percentage INTEGER DEFAULT 0,
        time_spent_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE(user_id, lesson_id)
      )
    `);

    // Create Tests table
    await query(`
      CREATE TABLE IF NOT EXISTS tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL,
        lesson_id UUID,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL,
        passing_score INTEGER DEFAULT 70,
        max_attempts INTEGER DEFAULT 3,
        order_index INTEGER NOT NULL,
        is_published BOOLEAN DEFAULT false,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
      )
    `);

    // Create Test_Questions table (includes flagging columns)
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
        flagged BOOLEAN DEFAULT false,
        flag_count INTEGER DEFAULT 0,
        last_flagged_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
      )
    `);

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
        lesson_id UUID,
        class_id UUID,
        tags TEXT[] DEFAULT '{}',
        is_pinned BOOLEAN DEFAULT false,
        is_locked BOOLEAN DEFAULT false,
        reply_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
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

    // Create Discussion_Likes table
    await query(`
      CREATE TABLE IF NOT EXISTS discussion_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        discussion_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(discussion_id, user_id)
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

    // Certification Programs
    await query(`
      CREATE TABLE IF NOT EXISTS certification_programs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration VARCHAR(100),
        level VARCHAR(50),
        prerequisites TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        deleted_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS certification_program_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES certification_programs(id) ON DELETE CASCADE
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS certification_program_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        program_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'in_progress',
        progress INTEGER DEFAULT 0,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (program_id) REFERENCES certification_programs(id) ON DELETE CASCADE,
        UNIQUE(user_id, program_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS certification_program_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id UUID NOT NULL,
        module_id UUID NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (enrollment_id) REFERENCES certification_program_enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES certification_program_modules(id) ON DELETE CASCADE,
        UNIQUE(enrollment_id, module_id)
      )
    `);

    // Create User_Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        course_notifications BOOLEAN DEFAULT true,
        class_notifications BOOLEAN DEFAULT true,
        discussion_notifications BOOLEAN DEFAULT true,
        test_notifications BOOLEAN DEFAULT true,
        certification_notifications BOOLEAN DEFAULT true,
        payment_notifications BOOLEAN DEFAULT true,
        system_notifications BOOLEAN DEFAULT true,
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

    // Create Payment_Webhooks table
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

    // Create Scraped_URLs table
    await query(`
      CREATE TABLE IF NOT EXISTS scraped_urls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL UNIQUE,
        status scraping_status DEFAULT 'pending',
        title VARCHAR(255),
        description TEXT,
        category VARCHAR(100),
        level VARCHAR(50),
        metadata JSON,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Discussion Categories table
    await query(`
      CREATE TABLE IF NOT EXISTS discussion_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(7),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        priority VARCHAR(20) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Login Attempts table for security
    await query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        success BOOLEAN NOT NULL,
        ip_address INET NOT NULL,
        user_agent TEXT,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
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
    await query('CREATE INDEX IF NOT EXISTS idx_tests_lesson ON tests(lesson_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_course ON discussions(course_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_class ON discussions(class_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions(category)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussions_last_activity ON discussions(last_activity_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(flutterwave_reference)');
    await query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_payment_webhooks_reference ON payment_webhooks(flutterwave_reference)');
    await query('CREATE INDEX IF NOT EXISTS idx_scraped_urls_url ON scraped_urls(url)');
    await query('CREATE INDEX IF NOT EXISTS idx_scraped_urls_status ON scraped_urls(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_scraped_urls_created_at ON scraped_urls(created_at)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussion_likes_discussion ON discussion_likes(discussion_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussion_likes_user ON discussion_likes(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_cert_programs_active ON certification_programs(is_active)');
    await query('CREATE INDEX IF NOT EXISTS idx_cert_program_modules_program ON certification_program_modules(program_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_cert_program_enrollments_user ON certification_program_enrollments(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_cert_program_enrollments_program ON certification_program_enrollments(program_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_cert_program_progress_enrollment ON certification_program_progress(enrollment_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussion_categories_key ON discussion_categories(key)');
    await query('CREATE INDEX IF NOT EXISTS idx_discussion_categories_active ON discussion_categories(is_active)');
    await query('CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email)');
    await query('CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at)');

    // Workshops support
    await query(`
      CREATE TABLE IF NOT EXISTS lesson_workshops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id UUID NOT NULL UNIQUE,
        is_enabled BOOLEAN DEFAULT false,
        spec JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_lesson_workshops_enabled ON lesson_workshops(is_enabled)');

    // Create soft delete indexes (partial indexes for efficiency)
    console.log('\n📊 Creating soft delete indexes...');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_courses_deleted_at 
      ON courses(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on courses');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_classes_deleted_at 
      ON classes(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on classes');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sponsorships_deleted_at 
      ON sponsorships(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on sponsorships');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_sponsorship_opportunities_deleted_at 
      ON sponsorship_opportunities(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on sponsorship_opportunities');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at 
      ON lessons(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on lessons');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_tests_deleted_at 
      ON tests(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on tests');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_discussions_deleted_at 
      ON discussions(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on discussions');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_certification_programs_deleted_at 
      ON certification_programs(deleted_at) WHERE deleted_at IS NULL
    `);
    console.log('✓ Created soft delete index on certification_programs');

    console.log('\n✅ Database migration completed successfully!');
    console.log('🎉 All tables created with soft delete support!');
    console.log('📝 Soft delete enabled for: courses, classes, sponsorships, sponsorship_opportunities,');
    console.log('   lessons, tests, discussions, certification_programs');
    console.log('⏰ Migration completed at:', new Date().toISOString());

    // Seed default discussion categories
    await seedDiscussionCategories();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('💥 Error details:', error.message);
    process.exit(1);
  }
};

// Function to seed default discussion categories (same as in the original migrate script)
const seedDiscussionCategories = async () => {
  try {
    console.log('🌱 Seeding discussion categories...');
    const defaultCategories = [
      { key: 'general', name: 'General', description: 'Platform-wide discussions and announcements', icon: '💬', color: '#3B82F6', sort_order: 1 },
      { key: 'course', name: 'Course', description: 'Course-specific discussions and announcements', icon: '📚', color: '#10B981', sort_order: 2 },
      { key: 'lesson', name: 'Lesson', description: 'Lesson-specific questions and clarifications', icon: '💡', color: '#F59E0B', sort_order: 3 },
      { key: 'class', name: 'Class', description: 'Class-specific discussions and Q&A', icon: '👥', color: '#8B5CF6', sort_order: 4 },
      { key: 'question', name: 'Question', description: 'General questions seeking help', icon: '❓', color: '#EF4444', sort_order: 5 },
      { key: 'help', name: 'Help', description: 'Help requests and support', icon: '🛟', color: '#06B6D4', sort_order: 6 },
      { key: 'feedback', name: 'Feedback', description: 'Feedback and suggestions', icon: '💭', color: '#84CC16', sort_order: 7 }
    ];

    for (const category of defaultCategories) {
      try {
        await query(
          `INSERT INTO discussion_categories (key, name, description, icon, color, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (key) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             icon = EXCLUDED.icon,
             color = EXCLUDED.color,
             sort_order = EXCLUDED.sort_order,
             updated_at = CURRENT_TIMESTAMP`,
          [category.key, category.name, category.description, category.icon, category.color, category.sort_order]
        );
      } catch (error) {
        console.log(`⚠️  Could not insert category ${category.key}:`, error.message);
      }
    }

    console.log('✅ Discussion categories seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed discussion categories:', error);
    // Don't fail the migration if seeding fails
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
