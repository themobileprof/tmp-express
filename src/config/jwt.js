/**
 * JWT session lifetime. Mobile learners typically stay signed in on their phones;
 * override with JWT_EXPIRES_IN in production (e.g. 90d, 180d).
 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '90d';

module.exports = { JWT_EXPIRES_IN };
