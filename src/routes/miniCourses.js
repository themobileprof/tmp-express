const express = require('express');
const { getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const mapMicroCourse = (course) => ({
  id: course.id,
  title: course.title,
  description: course.description,
  topic: course.topic,
  type: course.type,
  format: course.format,
  price: parseFloat(course.price),
  duration: course.duration,
  difficulty: course.difficulty,
  imageUrl: course.image_url,
  lessonCount: parseInt(course.lesson_count || 0, 10),
  instructorName: course.instructor_id
    ? `${course.instructor_first_name || ''} ${course.instructor_last_name || ''}`.trim()
    : null,
});

const mapMiniCourse = (mini, microCourses = []) => ({
  id: mini.id,
  title: mini.title,
  slug: mini.slug,
  description: mini.description,
  topic: mini.topic,
  imageUrl: mini.image_url,
  bundlePrice: mini.bundle_price != null ? parseFloat(mini.bundle_price) : null,
  microCount: microCourses.length,
  microCourses,
  isPublished: mini.is_published,
  createdAt: mini.created_at,
  updatedAt: mini.updated_at,
});

async function getMiniCourseMicros(miniCourseId) {
  return getRows(
    `SELECT c.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name,
            mcm.order_index,
            (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = true AND l.deleted_at IS NULL) as lesson_count
     FROM mini_course_micros mcm
     JOIN courses c ON mcm.course_id = c.id
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE mcm.mini_course_id = $1 AND c.deleted_at IS NULL AND c.format = 'micro'
     ORDER BY mcm.order_index ASC`,
    [miniCourseId]
  );
}

async function getUserMicroCompletion(userId, courseIds) {
  if (!courseIds.length) return {};

  const rows = await getRows(
    `SELECT e.course_id, e.progress, e.status
     FROM enrollments e
     WHERE e.user_id = $1 AND e.course_id = ANY($2::uuid[]) AND e.enrollment_type = 'course'`,
    [userId, courseIds]
  );

  return rows.reduce((acc, row) => {
    acc[row.course_id] = {
      progress: row.progress,
      isCompleted: row.progress >= 100 && row.status === 'completed',
    };
    return acc;
  }, {});
}

// List published mini courses (public)
router.get('/', asyncHandler(async (req, res) => {
  const { topic, limit = 50, offset = 0 } = req.query;

  let whereClause = 'WHERE mc.is_published = true AND mc.deleted_at IS NULL';
  const params = [];
  let paramIndex = 1;

  if (topic) {
    whereClause += ` AND mc.topic ILIKE $${paramIndex}`;
    params.push(`%${topic}%`);
    paramIndex++;
  }

  const minis = await getRows(
    `SELECT mc.*,
            (SELECT COUNT(*) FROM mini_course_micros mcm WHERE mcm.mini_course_id = mc.id) as micro_count
     FROM mini_courses mc
     ${whereClause}
     ORDER BY mc.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  res.json({
    miniCourses: minis.map((mini) => ({
      id: mini.id,
      title: mini.title,
      slug: mini.slug,
      description: mini.description,
      topic: mini.topic,
      imageUrl: mini.image_url,
      bundlePrice: mini.bundle_price != null ? parseFloat(mini.bundle_price) : null,
      microCount: parseInt(mini.micro_count || 0, 10),
      isPublished: mini.is_published,
      createdAt: mini.created_at,
    })),
  });
}));

// User progress through a mini course (authenticated) — before /:slugOrId
router.get('/:slugOrId/progress', authenticateToken, asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;
  const userId = req.user.id;

  const mini = await getRow(
    `SELECT * FROM mini_courses
     WHERE (slug = $1 OR id::text = $1) AND is_published = true AND deleted_at IS NULL`,
    [slugOrId]
  );

  if (!mini) {
    throw new AppError('Mini course not found', 404, 'NOT_FOUND');
  }

  const microRows = await getMiniCourseMicros(mini.id);
  const courseIds = microRows.map((row) => row.id);
  const completionMap = await getUserMicroCompletion(userId, courseIds);

  const microCourses = microRows.map((course) => ({
    ...mapMicroCourse(course),
    progress: completionMap[course.id]?.progress || 0,
    isCompleted: completionMap[course.id]?.isCompleted || false,
  }));

  const completedCount = microCourses.filter((m) => m.isCompleted).length;
  const totalCount = microCourses.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const miniCertificate = await getRow(
    `SELECT id, verification_code, issued_date, certificate_url
     FROM certifications
     WHERE user_id = $1 AND mini_course_id = $2 AND credential_type = 'mini' AND status = 'issued'`,
    [userId, mini.id]
  );

  res.json({
    miniCourse: mapMiniCourse(mini, microCourses),
    progress,
    completedMicroCount: completedCount,
    totalMicroCount: totalCount,
    isCompleted: totalCount > 0 && completedCount === totalCount,
    certificate: miniCertificate
      ? {
          id: miniCertificate.id,
          verificationCode: miniCertificate.verification_code,
          issuedDate: miniCertificate.issued_date,
          certificateUrl: miniCertificate.certificate_url,
        }
      : null,
  });
}));

// Get mini course by slug or id (public)
router.get('/:slugOrId', asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;

  const mini = await getRow(
    `SELECT * FROM mini_courses
     WHERE (slug = $1 OR id::text = $1) AND is_published = true AND deleted_at IS NULL`,
    [slugOrId]
  );

  if (!mini) {
    throw new AppError('Mini course not found', 404, 'NOT_FOUND');
  }

  const microRows = await getMiniCourseMicros(mini.id);

  res.json(mapMiniCourse(mini, microRows.map(mapMicroCourse)));
}));

module.exports = router;
