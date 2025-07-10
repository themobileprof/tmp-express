const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken, authorizeInstructor, authorizeOwnerOrAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Validation middleware
const validateTest = [
  body('title').trim().isLength({ min: 1 }).withMessage('Test title is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('durationMinutes').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
  body('passingScore').isInt({ min: 0, max: 100 }).withMessage('Passing score must be between 0 and 100'),
  body('maxAttempts').isInt({ min: 1 }).withMessage('Max attempts must be at least 1'),
  body('orderIndex').isInt({ min: 0 }).withMessage('Order index must be a non-negative integer')
];

const validateQuestion = [
  body('question').trim().isLength({ min: 1 }).withMessage('Question text is required'),
  body('questionType').isIn(['multiple_choice', 'true_false', 'short_answer']).withMessage('Invalid question type'),
  body('points').isInt({ min: 1 }).withMessage('Points must be at least 1'),
  body('orderIndex').isInt({ min: 0 }).withMessage('Order index must be a non-negative integer')
];

const validateAnswer = [
  body('questionId').isUUID().withMessage('Valid question ID is required'),
  body('selectedAnswer').optional().isInt({ min: 0 }).withMessage('Selected answer must be a non-negative integer'),
  body('answerText').optional().isString().withMessage('Answer text must be a string')
];

// Multer storage config for question images
const questionImagesDir = path.join(process.env.UPLOAD_PATH || './uploads', 'question-images');
if (!fs.existsSync(questionImagesDir)) {
  fs.mkdirSync(questionImagesDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, questionImagesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${req.params.questionId}-${Date.now()}${ext}`;
    cb(null, unique);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  }
});

// Get test by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const test = await getRow(
    `SELECT t.*, c.title as course_title, c.id as course_id
     FROM tests t
     JOIN courses c ON t.course_id = c.id
     WHERE t.id = $1`,
    [id]
  );

  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  res.json({
    id: test.id,
    courseId: test.course_id,
    courseTitle: test.course_title,
    title: test.title,
    description: test.description,
    durationMinutes: test.duration_minutes,
    passingScore: test.passing_score,
    maxAttempts: test.max_attempts,
    orderIndex: test.order_index,
    isPublished: test.is_published,
    createdAt: test.created_at,
    updatedAt: test.updated_at
  });
}));

// Update test
router.put('/:id', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), validateTest, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { title, description, durationMinutes, passingScore, maxAttempts, orderIndex, isPublished } = req.body;

  // Verify test exists
  const test = await getRow('SELECT * FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Update test
  const result = await query(
    `UPDATE tests 
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         duration_minutes = COALESCE($3, duration_minutes),
         passing_score = COALESCE($4, passing_score),
         max_attempts = COALESCE($5, max_attempts),
         order_index = COALESCE($6, order_index),
         is_published = COALESCE($7, is_published),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [title, description, durationMinutes, passingScore, maxAttempts, orderIndex, isPublished, id]
  );

  const updatedTest = result.rows[0];

  res.json({
    id: updatedTest.id,
    title: updatedTest.title,
    description: updatedTest.description,
    durationMinutes: updatedTest.duration_minutes,
    passingScore: updatedTest.passing_score,
    maxAttempts: updatedTest.max_attempts,
    orderIndex: updatedTest.order_index,
    isPublished: updatedTest.is_published,
    updatedAt: updatedTest.updated_at
  });
}));

// Delete test
router.delete('/:id', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if test has attempts
  const attempts = await getRow('SELECT id FROM test_attempts WHERE test_id = $1 LIMIT 1', [id]);
  if (attempts) {
    throw new AppError('Cannot delete test that has attempts', 400, 'Test Has Attempts');
  }

  await query('DELETE FROM tests WHERE id = $1', [id]);

  res.json({
    message: 'Test deleted successfully'
  });
}));

// Get test questions
router.get('/:id/questions', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify test exists
  const test = await getRow('SELECT * FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  const questions = await getRows(
    'SELECT * FROM test_questions WHERE test_id = $1 ORDER BY order_index',
    [id]
  );

  res.json({
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      questionType: q.question_type,
      options: q.options,
      correctAnswer: q.correct_answer,
      correctAnswerText: q.correct_answer_text,
      points: q.points,
      orderIndex: q.order_index
    }))
  });
}));

// Add question to test
router.post('/:id/questions', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), validateQuestion, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id } = req.params;
  const { question, questionType, options, correctAnswer, correctAnswerText, points, orderIndex } = req.body;

  // Verify test exists
  const test = await getRow('SELECT * FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Validate question type specific requirements
  if (questionType === 'multiple_choice') {
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new AppError('Multiple choice questions must have at least 2 options', 400, 'Invalid Question');
    }
    if (correctAnswer === undefined || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new AppError('Valid correct answer index is required for multiple choice', 400, 'Invalid Answer');
    }
  } else if (questionType === 'true_false') {
    if (correctAnswer === undefined || ![0, 1].includes(correctAnswer)) {
      throw new AppError('Correct answer must be 0 (false) or 1 (true) for true/false questions', 400, 'Invalid Answer');
    }
  } else if (questionType === 'short_answer') {
    if (!correctAnswerText || correctAnswerText.trim().length === 0) {
      throw new AppError('Correct answer text is required for short answer questions', 400, 'Invalid Answer');
    }
  }

  // Create question
  const result = await query(
    `INSERT INTO test_questions (
      test_id, question, question_type, options, correct_answer, 
      correct_answer_text, points, order_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [id, question, questionType, options, correctAnswer, correctAnswerText, points, orderIndex]
  );

  const newQuestion = result.rows[0];

  res.status(201).json({
    id: newQuestion.id,
    question: newQuestion.question,
    questionType: newQuestion.question_type,
    options: newQuestion.options,
    correctAnswer: newQuestion.correct_answer,
    correctAnswerText: newQuestion.correct_answer_text,
    points: newQuestion.points,
    orderIndex: newQuestion.order_index
  });
}));

// Update question
router.put('/:id/questions/:questionId', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), validateQuestion, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id, questionId } = req.params;
  const { question, questionType, options, correctAnswer, correctAnswerText, points, orderIndex } = req.body;

  // Verify question exists and belongs to test
  const existingQuestion = await getRow(
    'SELECT * FROM test_questions WHERE id = $1 AND test_id = $2',
    [questionId, id]
  );

  if (!existingQuestion) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  // Update question
  const result = await query(
    `UPDATE test_questions 
     SET question = COALESCE($1, question),
         question_type = COALESCE($2, question_type),
         options = COALESCE($3, options),
         correct_answer = COALESCE($4, correct_answer),
         correct_answer_text = COALESCE($5, correct_answer_text),
         points = COALESCE($6, points),
         order_index = COALESCE($7, order_index),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8 AND test_id = $9
     RETURNING *`,
    [question, questionType, options, correctAnswer, correctAnswerText, points, orderIndex, questionId, id]
  );

  const updatedQuestion = result.rows[0];

  res.json({
    id: updatedQuestion.id,
    question: updatedQuestion.question,
    questionType: updatedQuestion.question_type,
    options: updatedQuestion.options,
    correctAnswer: updatedQuestion.correct_answer,
    correctAnswerText: updatedQuestion.correct_answer_text,
    points: updatedQuestion.points,
    orderIndex: updatedQuestion.order_index
  });
}));

// Delete question
router.delete('/:id/questions/:questionId', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), asyncHandler(async (req, res) => {
  const { id, questionId } = req.params;

  // Check if question has been answered
  const answers = await getRow('SELECT id FROM test_attempt_answers WHERE question_id = $1 LIMIT 1', [questionId]);
  if (answers) {
    throw new AppError('Cannot delete question that has been answered', 400, 'Question Has Answers');
  }

  await query('DELETE FROM test_questions WHERE id = $1 AND test_id = $2', [questionId, id]);

  res.json({
    message: 'Question deleted successfully'
  });
}));

// Start test attempt
router.post('/:id/start', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify test exists and is published
  const test = await getRow('SELECT * FROM tests WHERE id = $1 AND is_published = true', [id]);
  if (!test) {
    throw new AppError('Test not found or not published', 404, 'Test Not Found');
  }

  // Check if user has reached max attempts
  const attemptCount = await getRow(
    'SELECT COUNT(*) as count FROM test_attempts WHERE test_id = $1 AND user_id = $2',
    [id, userId]
  );

  if (parseInt(attemptCount.count) >= test.max_attempts) {
    throw new AppError('Maximum attempts reached for this test', 400, 'Max Attempts Reached');
  }

  // Check if user has an in-progress attempt
  const inProgressAttempt = await getRow(
    'SELECT * FROM test_attempts WHERE test_id = $1 AND user_id = $2 AND status = $3',
    [id, userId, 'in_progress']
  );

  if (inProgressAttempt) {
    throw new AppError('You already have an in-progress attempt for this test', 400, 'Attempt In Progress');
  }

  // Get questions for the test
  const questions = await getRows(
    'SELECT id, question, question_type, options, points, order_index FROM test_questions WHERE test_id = $1 ORDER BY order_index',
    [id]
  );

  if (questions.length === 0) {
    throw new AppError('Test has no questions', 400, 'No Questions');
  }

  // Create new attempt
  const attemptNumber = parseInt(attemptCount.count) + 1;
  const result = await query(
    `INSERT INTO test_attempts (
      test_id, user_id, attempt_number, total_questions, status
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [id, userId, attemptNumber, questions.length, 'in_progress']
  );

  const attempt = result.rows[0];

  res.json({
    attempt: {
      id: attempt.id,
      testId: attempt.test_id,
      userId: attempt.user_id,
      attemptNumber: attempt.attempt_number,
      status: attempt.status,
      startedAt: attempt.started_at
    },
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      questionType: q.question_type,
      options: q.question_type === 'multiple_choice' ? q.options : undefined,
      points: q.points,
      orderIndex: q.order_index
    }))
  });
}));

// Submit answer
router.put('/:id/attempts/:attemptId/answer', authenticateToken, validateAnswer, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, 'Validation Error');
  }

  const { id, attemptId } = req.params;
  const { questionId, selectedAnswer, answerText } = req.body;
  const userId = req.user.id;

  // Verify attempt exists and belongs to user
  const attempt = await getRow(
    'SELECT * FROM test_attempts WHERE id = $1 AND test_id = $2 AND user_id = $3 AND status = $4',
    [attemptId, id, userId, 'in_progress']
  );

  if (!attempt) {
    throw new AppError('Attempt not found or not in progress', 404, 'Attempt Not Found');
  }

  // Verify question exists and belongs to test
  const question = await getRow(
    'SELECT * FROM test_questions WHERE id = $1 AND test_id = $2',
    [questionId, id]
  );

  if (!question) {
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  // Check if answer already exists
  const existingAnswer = await getRow(
    'SELECT * FROM test_attempt_answers WHERE attempt_id = $1 AND question_id = $2',
    [attemptId, questionId]
  );

  if (existingAnswer) {
    throw new AppError('Answer already submitted for this question', 400, 'Answer Already Submitted');
  }

  // Validate answer based on question type
  if (question.question_type === 'multiple_choice') {
    if (selectedAnswer === undefined || selectedAnswer < 0 || selectedAnswer >= question.options.length) {
      throw new AppError('Valid selected answer is required for multiple choice', 400, 'Invalid Answer');
    }
  } else if (question.question_type === 'true_false') {
    if (selectedAnswer === undefined || ![0, 1].includes(selectedAnswer)) {
      throw new AppError('Selected answer must be 0 (false) or 1 (true) for true/false questions', 400, 'Invalid Answer');
    }
  } else if (question.question_type === 'short_answer') {
    if (!answerText || answerText.trim().length === 0) {
      throw new AppError('Answer text is required for short answer questions', 400, 'Invalid Answer');
    }
  }

  // Check if answer is correct
  let isCorrect = false;
  let pointsEarned = 0;

  if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
    isCorrect = selectedAnswer === question.correct_answer;
  } else if (question.question_type === 'short_answer') {
    // Simple case-insensitive comparison for short answer
    isCorrect = answerText.trim().toLowerCase() === question.correct_answer_text.trim().toLowerCase();
  }

  if (isCorrect) {
    pointsEarned = question.points;
  }

  // Save answer
  await query(
    `INSERT INTO test_attempt_answers (
      attempt_id, question_id, selected_answer, answer_text, is_correct, points_earned
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [attemptId, questionId, selectedAnswer, answerText, isCorrect, pointsEarned]
  );

  res.json({
    success: true,
    message: 'Answer saved successfully',
    isCorrect,
    pointsEarned
  });
}));

// Submit test
router.post('/:id/attempts/:attemptId/submit', authenticateToken, asyncHandler(async (req, res) => {
  const { id, attemptId } = req.params;
  const userId = req.user.id;

  // Verify attempt exists and belongs to user
  const attempt = await getRow(
    'SELECT * FROM test_attempts WHERE id = $1 AND test_id = $2 AND user_id = $3 AND status = $4',
    [attemptId, id, userId, 'in_progress']
  );

  if (!attempt) {
    throw new AppError('Attempt not found or not in progress', 404, 'Attempt Not Found');
  }

  // Get test details
  const test = await getRow('SELECT * FROM tests WHERE id = $1', [id]);

  // Calculate score
  const answers = await getRows(
    'SELECT * FROM test_attempt_answers WHERE attempt_id = $1',
    [attemptId]
  );

  const totalPoints = answers.reduce((sum, answer) => sum + answer.points_earned, 0);
  const maxPoints = answers.reduce((sum, answer) => sum + answer.points_earned, 0);
  const correctAnswers = answers.filter(answer => answer.is_correct).length;

  // Calculate percentage score
  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
  const passed = score >= test.passing_score;

  // Calculate time taken
  const timeTakenMinutes = Math.round((Date.now() - new Date(attempt.started_at).getTime()) / (1000 * 60));

  // Update attempt
  await query(
    `UPDATE test_attempts 
     SET score = $1, correct_answers = $2, status = $3, completed_at = CURRENT_TIMESTAMP, time_taken_minutes = $4
     WHERE id = $5`,
    [score, correctAnswers, 'completed', timeTakenMinutes, attemptId]
  );

  res.json({
    results: {
      attemptId: attempt.id,
      score,
      totalQuestions: attempt.total_questions,
      correctAnswers,
      timeTakenMinutes,
      completedAt: new Date().toISOString(),
      passed
    }
  });
}));

// Get test results
router.get('/:id/attempts/:attemptId/results', authenticateToken, asyncHandler(async (req, res) => {
  const { id, attemptId } = req.params;
  const userId = req.user.id;

  // Verify attempt exists and belongs to user
  const attempt = await getRow(
    'SELECT * FROM test_attempts WHERE id = $1 AND test_id = $2 AND user_id = $3 AND status = $4',
    [attemptId, id, userId, 'completed']
  );

  if (!attempt) {
    throw new AppError('Completed attempt not found', 404, 'Attempt Not Found');
  }

  // Get questions and answers
  const questions = await getRows(
    `SELECT q.*, a.selected_answer, a.answer_text, a.is_correct, a.points_earned
     FROM test_questions q
     LEFT JOIN test_attempt_answers a ON q.id = a.question_id AND a.attempt_id = $1
     WHERE q.test_id = $2
     ORDER BY q.order_index`,
    [attemptId, id]
  );

  res.json({
    attempt: {
      id: attempt.id,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      timeTakenMinutes: attempt.time_taken_minutes,
      status: attempt.status,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at
    },
    questions: questions.map(q => ({
      id: q.id,
      question: q.question,
      questionType: q.question_type,
      options: q.options,
      correctAnswer: q.correct_answer,
      correctAnswerText: q.correct_answer_text,
      userAnswer: q.selected_answer,
      userAnswerText: q.answer_text,
      isCorrect: q.is_correct,
      pointsEarned: q.points_earned,
      points: q.points
    }))
  });
}));

// Upload image for a test question
router.post('/:id/questions/:questionId/image/upload', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
  const { id, questionId } = req.params;
  if (!req.file) {
    throw new AppError('No image file uploaded', 400, 'NO_FILE');
  }

  // Check if question exists and belongs to test
  const question = await getRow('SELECT * FROM test_questions WHERE id = $1 AND test_id = $2', [questionId, id]);
  if (!question) {
    // Remove uploaded file if question not found
    fs.unlinkSync(req.file.path);
    throw new AppError('Question not found', 404, 'Question Not Found');
  }

  // Build image URL (assuming /uploads is served statically)
  const imageUrl = `/uploads/question-images/${req.file.filename}`;

  // Update question's image_url
  await query('UPDATE test_questions SET image_url = $1 WHERE id = $2', [imageUrl, questionId]);

  res.status(200).json({
    success: true,
    imageUrl,
    message: 'Image uploaded successfully'
  });
}));

// Get test analytics (admin/instructor only)
router.get('/:id/analytics', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify test exists
  const test = await getRow('SELECT * FROM tests WHERE id = $1', [id]);
  if (!test) {
    throw new AppError('Test not found', 404, 'Test Not Found');
  }

  // Get overall test statistics
  const testStats = await getRow(
    `SELECT 
       COUNT(*) as total_attempts,
       AVG(score) as average_score,
       COUNT(CASE WHEN score >= $1 THEN 1 END) as passed_attempts,
       AVG(time_taken_minutes) as average_time_minutes
     FROM test_attempts 
     WHERE test_id = $2 AND status = 'completed'`,
    [test.passing_score, id]
  );

  // Calculate pass rate
  const passRate = testStats.total_attempts > 0 
    ? Math.round((testStats.passed_attempts / testStats.total_attempts) * 100 * 10) / 10
    : 0;

  // Get question analytics
  const questionAnalytics = await getRows(
    `SELECT 
       q.id,
       q.question,
       q.question_type,
       q.points,
       COUNT(taa.id) as total_answers,
       COUNT(CASE WHEN taa.is_correct = true THEN 1 END) as correct_answers,
       ROUND(COUNT(CASE WHEN taa.is_correct = true THEN 1 END) * 100.0 / COUNT(taa.id), 1) as correct_rate
     FROM test_questions q
     LEFT JOIN test_attempt_answers taa ON q.id = taa.question_id
     LEFT JOIN test_attempts ta ON taa.attempt_id = ta.id
     WHERE q.test_id = $1 AND ta.status = 'completed'
     GROUP BY q.id, q.question, q.question_type, q.points
     ORDER BY q.order_index`,
    [id]
  );

  res.json({
    totalAttempts: parseInt(testStats.total_attempts) || 0,
    averageScore: Math.round(testStats.average_score * 10) / 10 || 0,
    passRate: passRate,
    averageTimeMinutes: Math.round(testStats.average_time_minutes * 10) / 10 || 0,
    questionAnalytics: questionAnalytics.map(q => ({
      questionId: q.id,
      question: q.question,
      questionType: q.question_type,
      points: q.points,
      totalAnswers: parseInt(q.total_answers) || 0,
      correctAnswers: parseInt(q.correct_answers) || 0,
      correctRate: parseFloat(q.correct_rate) || 0
    }))
  });
}));

// List all attempts for a test (admin/instructor only)
router.get('/:id/attempts', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get all attempts for the test, joined with user info
  const attempts = await getRows(
    `SELECT a.id, a.user_id, a.attempt_number, a.score, a.time_taken_minutes, a.completed_at, a.status,
            u.first_name, u.last_name, u.email
     FROM test_attempts a
     JOIN users u ON a.user_id = u.id
     WHERE a.test_id = $1
     ORDER BY a.completed_at DESC NULLS LAST, a.started_at DESC` ,
    [id]
  );

  res.json({
    attempts: attempts.map(a => ({
      id: a.id,
      studentName: `${a.first_name} ${a.last_name}`,
      studentEmail: a.email,
      score: a.score,
      timeSpent: a.time_taken_minutes,
      attemptNumber: a.attempt_number,
      completedAt: a.completed_at,
      status: a.status
    }))
  });
}));

// Per-student detailed answers for an attempt (admin/instructor only)
router.get('/:id/attempts/:attemptId/details', authenticateToken, authorizeOwnerOrAdmin('tests', 'id'), asyncHandler(async (req, res) => {
  const { id, attemptId } = req.params;

  // Get attempt and user info
  const attempt = await getRow(
    `SELECT a.*, u.first_name, u.last_name, u.email
     FROM test_attempts a
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1 AND a.test_id = $2`,
    [attemptId, id]
  );
  if (!attempt) {
    throw new AppError('Attempt not found', 404, 'Attempt Not Found');
  }

  // Get answers for this attempt
  const answers = await getRows(
    `SELECT q.id as question_id, q.question, q.question_type, q.options, q.correct_answer, q.correct_answer_text,
            a.selected_answer, a.answer_text, a.is_correct, a.points_earned
     FROM test_questions q
     LEFT JOIN test_attempt_answers a ON q.id = a.question_id AND a.attempt_id = $1
     WHERE q.test_id = $2
     ORDER BY q.order_index`,
    [attemptId, id]
  );

  res.json({
    attempt: {
      id: attempt.id,
      studentName: `${attempt.first_name} ${attempt.last_name}`,
      studentEmail: attempt.email,
      score: attempt.score,
      timeSpent: attempt.time_taken_minutes,
      attemptNumber: attempt.attempt_number,
      completedAt: attempt.completed_at,
      status: attempt.status
    },
    answers: answers.map(q => ({
      questionId: q.question_id,
      question: q.question,
      questionType: q.question_type,
      options: q.options,
      correctAnswer: q.correct_answer,
      correctAnswerText: q.correct_answer_text,
      userAnswer: q.selected_answer,
      userAnswerText: q.answer_text,
      isCorrect: q.is_correct,
      pointsEarned: q.points_earned
    }))
  });
}));

module.exports = router; 