const { getSystemSetting } = require('../utils/systemSettings');
const { asyncHandler } = require('./errorHandler');

// Maintenance mode middleware
// Allows public endpoints to be blocked when maintenance is enabled
// Admin routes (/api/admin) are allowed through
module.exports = asyncHandler(async (req, res, next) => {
	// Allow health checks, admin routes, and public NGO interest form
	if (
		req.path.startsWith('/health') ||
		req.path.startsWith('/api/admin') ||
		req.path.startsWith('/api/ngo-submissions')
	) {
		return next();
	}

	const maintenance = await getSystemSetting('maintenance_mode', 'false');
	if (String(maintenance).toLowerCase() === 'true') {
		return res.status(503).json({
			status: 'maintenance',
			message: 'The system is currently under maintenance. Please try again later.'
		});
	}

	next();
}); 