const express = require('express');
const { getRow, getRows, query } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/certification-programs
router.get('/', asyncHandler(async (req, res) => {
	const programs = await getRows(
		`SELECT id, title, description, duration, level, prerequisites, price, is_active, created_at
		 FROM certification_programs
		 WHERE is_active = true
		 ORDER BY created_at DESC`
	);

	// Load modules for listed programs in one query
	const programIds = programs.map(p => p.id);
	let modules = [];
	if (programIds.length > 0) {
		modules = await getRows(
			`SELECT id, program_id, title, order_index
			 FROM certification_program_modules
			 WHERE program_id = ANY($1)
			 ORDER BY program_id, order_index ASC`,
			[programIds]
		);
	}

	const programIdToModules = new Map();
	for (const m of modules) {
		if (!programIdToModules.has(m.program_id)) programIdToModules.set(m.program_id, []);
		programIdToModules.get(m.program_id).push({ id: m.id, title: m.title, orderIndex: m.order_index });
	}

	res.json({
		programs: programs.map(p => ({
			id: p.id,
			title: p.title,
			description: p.description,
			duration: p.duration,
			level: p.level,
			prerequisites: p.prerequisites,
			price: p.price,
			modules: programIdToModules.get(p.id) || []
		}))
	});
}));

// POST /api/certification-programs/:id/enroll
router.post('/:id/enroll', authenticateToken, asyncHandler(async (req, res) => {
	const { id } = req.params;
	const userId = req.user.id;

	// Verify program exists and active
	const program = await getRow('SELECT id FROM certification_programs WHERE id = $1 AND is_active = true', [id]);
	if (!program) {
		throw new AppError('Certification program not found or inactive', 404, 'Program Not Found');
	}

	// Check existing enrollment
	const existing = await getRow('SELECT id FROM certification_program_enrollments WHERE user_id = $1 AND program_id = $2', [userId, id]);
	if (existing) {
		throw new AppError('Already enrolled in this program', 400, 'ALREADY_ENROLLED');
	}

	const result = await query(
		`INSERT INTO certification_program_enrollments (user_id, program_id, status, progress)
		 VALUES ($1, $2, 'in_progress', 0)
		 RETURNING *`,
		[userId, id]
	);

	res.status(201).json({
		enrollment: {
			id: result.rows[0].id,
			programId: result.rows[0].program_id,
			status: result.rows[0].status,
			progress: result.rows[0].progress,
			enrolledAt: result.rows[0].enrolled_at
		}
	});
}));

module.exports = router; 