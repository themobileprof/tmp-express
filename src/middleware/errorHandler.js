const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let error = 'Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'Validation Error';
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    error = 'Invalid ID';
    message = 'The provided ID is not valid';
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    error = 'Duplicate Entry';
    message = 'A record with this information already exists';
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    statusCode = 400;
    error = 'Reference Error';
    message = 'Cannot delete or update due to existing references';
  } else if (err.code === '23502') { // PostgreSQL not null constraint violation
    statusCode = 400;
    error = 'Missing Required Field';
    message = 'Required field is missing';
  } else if (err.code === '42P01') { // PostgreSQL undefined table
    statusCode = 500;
    error = 'Database Error';
    message = 'Database table not found';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    error = 'Service Unavailable';
    message = 'Database connection failed';
  } else if (err.status) {
    statusCode = err.status;
    error = err.error || 'Error';
    message = err.message || 'An error occurred';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, error = 'Error') {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler
}; 