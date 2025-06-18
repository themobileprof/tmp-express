const jwt = require('jsonwebtoken');
const { getRow } = require('../database/config');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await getRow(
      'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
      [decoded.user_id]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found or account is inactive'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

const authorizeInstructor = (req, res, next) => {
  return authorizeRoles('instructor', 'admin')(req, res, next);
};

const authorizeSponsor = (req, res, next) => {
  return authorizeRoles('sponsor', 'admin')(req, res, next);
};

const authorizeAdmin = (req, res, next) => {
  return authorizeRoles('admin')(req, res, next);
};

const authorizeOwnerOrAdmin = (tableName, idField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Admins can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[idField];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          message: 'Please provide a valid resource ID'
        });
      }

      // Check if user owns the resource
      const resource = await getRow(
        `SELECT * FROM ${tableName} WHERE ${idField} = $1`,
        [resourceId]
      );

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found',
          message: 'The requested resource does not exist'
        });
      }

      // Check ownership based on common field names
      const ownerField = resource.instructor_id || resource.author_id || resource.user_id || resource.sponsor_id;
      
      if (ownerField && ownerField === req.user.id) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      });

    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Authorization failed',
        message: 'An error occurred during authorization'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeInstructor,
  authorizeSponsor,
  authorizeAdmin,
  authorizeOwnerOrAdmin
}; 