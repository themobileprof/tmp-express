-- ============================================================================
-- Database Schema with Soft Delete Support (Built-in)
-- ============================================================================
-- This schema includes deleted_at columns directly in CREATE TABLE statements
-- No ALTER statements needed for soft delete functionality
-- ============================================================================

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'sponsor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE course_type AS ENUM ('online', 'offline');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sponsorship_status AS ENUM ('active', 'paused', 'expired', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE class_type AS ENUM ('online', 'offline', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_type AS ENUM ('course', 'class');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('enrolled', 'in_progress', 'completed', 'dropped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
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
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COURSES TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on courses
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at 
ON courses(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- CLASSES TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on classes
CREATE INDEX IF NOT EXISTS idx_classes_deleted_at 
ON classes(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- CLASS_COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS class_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  course_id UUID NOT NULL,
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(class_id, course_id)
);

-- ============================================================================
-- SPONSORSHIPS TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on sponsorships
CREATE INDEX IF NOT EXISTS idx_sponsorships_deleted_at 
ON sponsorships(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- SPONSORSHIP_COURSES TABLE (multi-course support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sponsorship_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id UUID NOT NULL,
  course_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE(sponsorship_id, course_id)
);

-- ============================================================================
-- SPONSORSHIP_USAGE TABLE
-- ============================================================================
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
);

-- ============================================================================
-- SPONSORSHIP_OPPORTUNITIES TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on sponsorship_opportunities
CREATE INDEX IF NOT EXISTS idx_sponsorship_opportunities_deleted_at 
ON sponsorship_opportunities(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- SPONSORSHIP_CONTRIBUTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sponsorship_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL,
  contributor_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES sponsorship_opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- ENROLLMENTS TABLE
-- ============================================================================
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
);

-- ============================================================================
-- LESSONS TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on lessons
CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at 
ON lessons(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- LESSON_PROGRESS TABLE
-- ============================================================================
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
);

-- ============================================================================
-- LESSON_WORKSHOPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lesson_workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  instructor_id UUID,
  max_participants INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- TESTS TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on tests
CREATE INDEX IF NOT EXISTS idx_tests_deleted_at 
ON tests(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TEST_QUESTIONS TABLE
-- ============================================================================
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
);

-- ============================================================================
-- TEST_ATTEMPTS TABLE
-- ============================================================================
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
);

-- ============================================================================
-- TEST_ATTEMPT_ANSWERS TABLE
-- ============================================================================
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
);

-- ============================================================================
-- DISCUSSIONS TABLE (with soft delete)
-- ============================================================================
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
);

-- Index for soft delete queries on discussions
CREATE INDEX IF NOT EXISTS idx_discussions_deleted_at 
ON discussions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- DISCUSSION_REPLIES TABLE
-- ============================================================================
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
);

-- ============================================================================
-- DISCUSSION_LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS discussion_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(discussion_id, user_id)
);

-- ============================================================================
-- CERTIFICATION_PROGRAMS TABLE (with soft delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS certification_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  duration VARCHAR(50) NOT NULL,
  level VARCHAR(50) NOT NULL,
  prerequisites TEXT,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for soft delete queries on certification_programs
CREATE INDEX IF NOT EXISTS idx_certification_programs_deleted_at 
ON certification_programs(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- CERTIFICATION_PROGRAM_MODULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS certification_program_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES certification_programs(id) ON DELETE CASCADE
);

-- ============================================================================
-- CERTIFICATION_PROGRAM_ENROLLMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS certification_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress',
  progress INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES certification_programs(id) ON DELETE CASCADE,
  UNIQUE(user_id, program_id)
);

-- ============================================================================
-- CERTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID,
  program_id UUID,
  certificate_url TEXT NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_code VARCHAR(100) UNIQUE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (program_id) REFERENCES certification_programs(id) ON DELETE SET NULL
);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  transaction_id VARCHAR(255) UNIQUE,
  course_id UUID,
  class_id UUID,
  sponsorship_id UUID,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE SET NULL
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- USER_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- SYSTEM_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Course indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic);

-- Class indexes
CREATE INDEX IF NOT EXISTS idx_classes_instructor ON classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_published ON classes(is_published);

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);

-- Lesson indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published);

-- Test indexes
CREATE INDEX IF NOT EXISTS idx_tests_course ON tests(course_id);
CREATE INDEX IF NOT EXISTS idx_tests_lesson ON tests(lesson_id);

-- Discussion indexes
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course ON discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_discussions_class ON discussions(class_id);

-- Sponsorship indexes
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_code ON sponsorships(discount_code);
CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorships(status);

-- ============================================================================
-- SCHEMA VERSION AND METADATA
-- ============================================================================

-- Insert schema version
INSERT INTO system_settings (key, value, updated_at)
VALUES ('schema_version', '2.0.0-soft-delete', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_settings (key, value, updated_at)
VALUES ('soft_delete_enabled', 'true', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;

INSERT INTO system_settings (key, value, updated_at)
VALUES ('schema_created_at', CURRENT_TIMESTAMP::TEXT, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SOFT DELETE SUMMARY
-- ============================================================================
-- Tables with soft delete (deleted_at column + partial index):
-- 1. courses
-- 2. classes
-- 3. sponsorships
-- 4. sponsorship_opportunities
-- 5. lessons
-- 6. tests
-- 7. discussions
-- 8. certification_programs
--
-- Query Pattern:
-- SELECT * FROM table WHERE deleted_at IS NULL;
-- UPDATE table SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;
-- UPDATE table SET deleted_at = NULL WHERE id = $1;  -- Restore
-- ============================================================================
