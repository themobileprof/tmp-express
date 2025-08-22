const express = require('express');
const { getRows, getRow } = require('../database/config');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/meta/classes-facets
router.get('/classes-facets', asyncHandler(async (req, res) => {
	const topics = await getRows(
		`SELECT topic, COUNT(*)::int as count
		 FROM classes WHERE is_published = true AND topic IS NOT NULL AND topic <> ''
		 GROUP BY topic ORDER BY count DESC, topic ASC LIMIT 100`
	);

	const types = await getRows(
		`SELECT type, COUNT(*)::int as count
		 FROM classes WHERE is_published = true
		 GROUP BY type ORDER BY count DESC`
	);

	const priceBuckets = await getRow(
		`SELECT 
			SUM(CASE WHEN price = 0 THEN 1 ELSE 0 END)::int as free,
			SUM(CASE WHEN price > 0 AND price < 50 THEN 1 ELSE 0 END)::int as under50,
			SUM(CASE WHEN price >= 50 AND price <= 100 THEN 1 ELSE 0 END)::int as between50And100,
			SUM(CASE WHEN price > 100 THEN 1 ELSE 0 END)::int as over100
		 FROM classes WHERE is_published = true`
	);

	res.json({
		topics: topics.map(t => ({ topic: t.topic, count: t.count })),
		types: types.map(t => ({ type: t.type, count: t.count })),
		priceRanges: priceBuckets || { free: 0, under50: 0, between50And100: 0, over100: 0 }
	});
}));

module.exports = router; 