const express = require('express');
const { getRow, getRows } = require('../database/config');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/search/suggestions?scope=classes|discussions&q=...
router.get('/suggestions', asyncHandler(async (req, res) => {
	const { scope = 'classes', q = '', limit = 10 } = req.query;
	const searchTerm = String(q).trim();
	const max = Math.min(parseInt(limit) || 10, 20);

	if (!searchTerm) {
		return res.json({ suggestions: [] });
	}

	if (!['classes', 'discussions'].includes(scope)) {
		throw new AppError('Invalid scope', 400, 'VALIDATION_ERROR');
	}

	let suggestions = [];
	if (scope === 'classes') {
		const rows = await getRows(
			`SELECT id, title, topic, start_date
			 FROM classes
			 WHERE is_published = true AND (title ILIKE $1 OR topic ILIKE $1)
			 ORDER BY start_date DESC
			 LIMIT $2`,
			[`%${searchTerm}%`, max]
		);
		suggestions = rows.map(r => ({
			id: r.id,
			label: r.title,
			subtitle: r.topic,
			type: 'class'
		}));
	} else if (scope === 'discussions') {
		const rows = await getRows(
			`SELECT id, title, last_activity_at
			 FROM discussions
			 WHERE title ILIKE $1 OR content ILIKE $1
			 ORDER BY last_activity_at DESC
			 LIMIT $2`,
			[`%${searchTerm}%`, max]
		);
		suggestions = rows.map(r => ({
			id: r.id,
			label: r.title,
			type: 'discussion'
		}));
	}

	res.json({ suggestions });
}));

module.exports = router; 