const { getRows } = require('../database/config');
const { AppError } = require('../middleware/errorHandler');
const { MICRO_MAX_LESSONS } = require('./miniCourseHelpers');

const MICRO_MAX_PRICE = 20;
const MICRO_DEFAULT_PRICE = 15;

const mapMicroCourseAdmin = (course) => ({
  id: course.id,
  title: course.title,
  description: course.description,
  topic: course.topic,
  type: course.type,
  format: course.format || 'micro',
  price: course.price != null ? parseFloat(course.price) : null,
  duration: course.duration,
  difficulty: course.difficulty,
  certification: course.certification,
  objectives: course.objectives,
  prerequisites: course.prerequisites,
  syllabus: course.syllabus,
  tags: course.tags,
  imageUrl: course.image_url,
  instructorId: course.instructor_id,
  isPublished: course.is_published,
  lessonCount: course.lesson_count != null ? parseInt(course.lesson_count, 10) : undefined,
  testCount: course.test_count != null ? parseInt(course.test_count, 10) : undefined,
  enrollmentCount: course.enrollment_count != null ? parseInt(course.enrollment_count, 10) : undefined,
  createdAt: course.created_at,
  updatedAt: course.updated_at,
});

async function findMicroCourseByTitle(title, getRow) {
  const trimmed = (title || '').trim();
  if (!trimmed) return null;

  return getRow(
    `SELECT c.*,
            (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.deleted_at IS NULL) as lesson_count,
            (SELECT COUNT(*) FROM tests t WHERE t.course_id = c.id AND t.deleted_at IS NULL) as test_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollment_count
     FROM courses c
     WHERE c.format = 'micro' AND c.deleted_at IS NULL
       AND LOWER(TRIM(c.title)) = LOWER(TRIM($1))
     ORDER BY c.is_published DESC, c.created_at ASC
     LIMIT 1`,
    [trimmed]
  );
}

async function loadMicroCourseById(id, getRow) {
  const course = await getRow(
    `SELECT c.*,
            (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.deleted_at IS NULL) as lesson_count,
            (SELECT COUNT(*) FROM tests t WHERE t.course_id = c.id AND t.deleted_at IS NULL) as test_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollment_count
     FROM courses c
     WHERE c.format = 'micro' AND c.deleted_at IS NULL AND c.id::text = $1`,
    [id]
  );

  if (!course) {
    throw new AppError('Micro course not found', 404, 'NOT_FOUND');
  }

  return mapMicroCourseAdmin(course);
}

function validateMicroPrice(price) {
  const value = parseFloat(price);
  if (Number.isNaN(value) || value < 0) {
    throw new AppError('Price must be a valid number >= 0', 400, 'VALIDATION_ERROR');
  }
  if (value > MICRO_MAX_PRICE) {
    throw new AppError(`Micro courses should be priced at $${MICRO_MAX_PRICE} or less`, 400, 'VALIDATION_ERROR');
  }
  return value;
}

function normalizeMicroCreateFields(body) {
  const {
    title,
    description,
    topic,
    type = 'online',
    price = MICRO_DEFAULT_PRICE,
    duration,
    difficulty,
    objectives,
    prerequisites,
    syllabus,
    tags,
    instructorId,
    imageUrl,
    isPublished = false,
  } = body;

  if (!title?.trim()) {
    throw new AppError('Title is required', 400, 'VALIDATION_ERROR');
  }
  if (!description?.trim()) {
    throw new AppError('Description is required', 400, 'VALIDATION_ERROR');
  }
  if (!topic?.trim()) {
    throw new AppError('Topic is required', 400, 'VALIDATION_ERROR');
  }
  if (!duration?.trim()) {
    throw new AppError('Duration is required', 400, 'VALIDATION_ERROR');
  }

  return {
    title: title.trim(),
    description: description.trim(),
    topic: topic.trim(),
    type,
    price: validateMicroPrice(price),
    duration: duration.trim(),
    difficulty: difficulty || null,
    objectives: objectives || null,
    prerequisites: prerequisites || null,
    syllabus: syllabus || null,
    tags: tags || null,
    instructorId: instructorId || null,
    imageUrl: imageUrl || null,
    isPublished: Boolean(isPublished),
  };
}

async function listMicroCoursesQuery({ page = 1, limit = 50, search, topic, isPublished }, getRow, getRows) {
  let whereClause = `WHERE c.deleted_at IS NULL AND c.format = 'micro'`;
  const params = [];
  let paramCount = 0;

  if (search) {
    paramCount += 1;
    whereClause += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount} OR c.topic ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  if (topic) {
    paramCount += 1;
    whereClause += ` AND c.topic ILIKE $${paramCount}`;
    params.push(`%${topic}%`);
  }

  if (isPublished !== undefined) {
    paramCount += 1;
    whereClause += ` AND c.is_published = $${paramCount}`;
    params.push(isPublished === 'true' || isPublished === true);
  }

  const countResult = await getRow(
    `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
    params
  );

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const courses = await getRows(
    `SELECT c.*,
            (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.deleted_at IS NULL) as lesson_count,
            (SELECT COUNT(*) FROM tests t WHERE t.course_id = c.id AND t.deleted_at IS NULL) as test_count,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollment_count
     FROM courses c
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
    [...params, parseInt(limit, 10), offset]
  );

  return {
    microCourses: courses.map(mapMicroCourseAdmin),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: parseInt(countResult.total, 10),
      pages: Math.ceil(parseInt(countResult.total, 10) / parseInt(limit, 10)),
    },
  };
}

module.exports = {
  MICRO_MAX_PRICE,
  MICRO_DEFAULT_PRICE,
  MICRO_MAX_LESSONS,
  mapMicroCourseAdmin,
  findMicroCourseByTitle,
  loadMicroCourseById,
  validateMicroPrice,
  normalizeMicroCreateFields,
  listMicroCoursesQuery,
};
