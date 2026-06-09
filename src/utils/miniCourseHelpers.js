const { getRows } = require('../database/config');
const { AppError } = require('../middleware/errorHandler');

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const generateUniqueSlug = async (title, getRow, excludeId = null) => {
  let baseSlug = slugify(title) || 'mini-course';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await getRow(
      `SELECT id FROM mini_courses WHERE slug = $1 AND deleted_at IS NULL${excludeId ? ' AND id != $2' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const MICRO_MAX_LESSONS = 10;

const mapMicroCourseRow = (course) => ({
  id: course.id,
  title: course.title,
  topic: course.topic,
  price: course.price != null ? parseFloat(course.price) : null,
  duration: course.duration,
  format: course.format,
  orderIndex: course.order_index,
  isPublished: course.is_published,
});

const mapMiniCourseAdmin = (mini, microRows = []) => ({
  id: mini.id,
  title: mini.title,
  slug: mini.slug,
  description: mini.description,
  topic: mini.topic,
  imageUrl: mini.image_url,
  bundlePrice: mini.bundle_price != null ? parseFloat(mini.bundle_price) : null,
  issuesCertificate: mini.issues_certificate,
  isPublished: mini.is_published,
  microCount: microRows.length || parseInt(mini.micro_count || 0, 10),
  microCourses: microRows.map(mapMicroCourseRow),
  createdAt: mini.created_at,
  updatedAt: mini.updated_at,
});

async function getMiniCourseMicroRows(miniCourseId, getRows) {
  return getRows(
    `SELECT c.id, c.title, c.topic, c.price, c.duration, c.format, c.is_published, mcm.order_index
     FROM mini_course_micros mcm
     JOIN courses c ON mcm.course_id = c.id
     WHERE mcm.mini_course_id = $1 AND c.deleted_at IS NULL
     ORDER BY mcm.order_index ASC`,
    [miniCourseId]
  );
}

async function getMiniCoursesMicroRowsMap(miniCourseIds, getRows) {
  if (!miniCourseIds.length) return {};

  const rows = await getRows(
    `SELECT mcm.mini_course_id, c.id, c.title, c.topic, c.price, c.duration, c.format, c.is_published, mcm.order_index
     FROM mini_course_micros mcm
     JOIN courses c ON mcm.course_id = c.id
     WHERE mcm.mini_course_id = ANY($1::uuid[]) AND c.deleted_at IS NULL
     ORDER BY mcm.mini_course_id, mcm.order_index ASC`,
    [miniCourseIds]
  );

  return rows.reduce((acc, row) => {
    const miniId = row.mini_course_id;
    if (!acc[miniId]) acc[miniId] = [];
    acc[miniId].push(row);
    return acc;
  }, {});
}

async function validateMicroCourseIds(courseIds, getRow) {
  const validated = [];
  for (const courseId of courseIds) {
    const micro = await getRow(
      `SELECT id, title FROM courses WHERE id = $1 AND format = 'micro' AND deleted_at IS NULL`,
      [courseId]
    );
    if (!micro) {
      throw new AppError(`Micro course not found: ${courseId}`, 400, 'VALIDATION_ERROR');
    }
    validated.push(courseId);
  }
  return validated;
}

async function resolveMicroCourseIds({ microCourseIds = [], microCourseTitles = [] }, getRow) {
  const ids = [...microCourseIds];

  for (const title of microCourseTitles) {
    const trimmed = (title || '').trim();
    if (!trimmed) continue;

    const micro = await getRow(
      `SELECT id, title FROM courses
       WHERE format = 'micro' AND deleted_at IS NULL AND LOWER(TRIM(title)) = LOWER(TRIM($1))
       ORDER BY is_published DESC, created_at ASC
       LIMIT 1`,
      [trimmed]
    );

    if (!micro) {
      throw new AppError(`Micro course not found by title: ${trimmed}`, 400, 'VALIDATION_ERROR');
    }

    if (!ids.includes(micro.id)) {
      ids.push(micro.id);
    }
  }

  return ids;
}

async function setMiniCourseMicros(miniCourseId, courseIds, query, getRow, mode = 'replace') {
  let finalIds = courseIds;

  if (mode === 'append') {
    const existing = await getRows(
      'SELECT course_id FROM mini_course_micros WHERE mini_course_id = $1 ORDER BY order_index ASC',
      [miniCourseId]
    );
    const existingIds = existing.map((row) => row.course_id);
    finalIds = [...existingIds];
    for (const courseId of courseIds) {
      if (!finalIds.includes(courseId)) {
        finalIds.push(courseId);
      }
    }
  }

  finalIds = await validateMicroCourseIds(finalIds, getRow);

  await query('DELETE FROM mini_course_micros WHERE mini_course_id = $1', [miniCourseId]);

  for (let i = 0; i < finalIds.length; i += 1) {
    await query(
      `INSERT INTO mini_course_micros (mini_course_id, course_id, order_index) VALUES ($1, $2, $3)`,
      [miniCourseId, finalIds[i], i + 1]
    );
  }

  return finalIds;
}

module.exports = {
  slugify,
  generateUniqueSlug,
  MICRO_MAX_LESSONS,
  mapMiniCourseAdmin,
  mapMicroCourseRow,
  getMiniCourseMicroRows,
  getMiniCoursesMicroRowsMap,
  validateMicroCourseIds,
  resolveMicroCourseIds,
  setMiniCourseMicros,
};
