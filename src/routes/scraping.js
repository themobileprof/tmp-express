const express = require('express');
const { query, getRow, getRows } = require('../database/config');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all scraped URLs with filtering and pagination
router.get('/urls', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      status,
      category,
      level,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Build WHERE conditions
    if (status) {
      whereConditions.push('status = $' + (params.length + 1));
      params.push(status);
    }

    if (category) {
      whereConditions.push('category = $' + (params.length + 1));
      params.push(category);
    }

    if (level) {
      whereConditions.push('level = $' + (params.length + 1));
      params.push(level);
    }

    if (search) {
      whereConditions.push('(url ILIKE $' + (params.length + 1) + ' OR title ILIKE $' + (params.length + 1) + ')');
      params.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM scraped_urls 
      ${whereClause}
    `;
    const countResult = await getRow(countQuery, params);
    const total = parseInt(countResult.total);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM scraped_urls 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, limit, offset];
    const urls = await getRows(dataQuery, dataParams);

    res.json({
      success: true,
      data: {
        urls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching scraped URLs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch scraped URLs',
        details: error.message
      }
    });
  }
});

// Add a new URL to be scraped
router.post('/urls', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      url,
      title,
      description,
      category,
      level,
      metadata
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URL is required'
        }
      });
    }

    // Check if URL already exists
    const existingUrl = await query(
      'SELECT id, status FROM scraped_urls WHERE url = $1',
      [url]
    );

    if (existingUrl.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'URL already exists in scraping queue',
          data: {
            id: existingUrl.rows[0].id,
            status: existingUrl.rows[0].status
          }
        }
      });
    }

    // Insert new URL
    const result = await query(`
      INSERT INTO scraped_urls (url, title, description, category, level, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [url, title, description, category, level, metadata ? JSON.stringify(metadata) : null]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding URL to scraping queue:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add URL to scraping queue',
        details: error.message
      }
    });
  }
});

// Add multiple URLs to be scraped
router.post('/urls/bulk', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URLs array is required and must not be empty'
        }
      });
    }

    const results = [];
    const errors = [];

    for (const urlData of urls) {
      try {
        const {
          url,
          title,
          description,
          category,
          level,
          metadata
        } = urlData;

        if (!url) {
          errors.push({ url: 'N/A', error: 'URL is required' });
          continue;
        }

        // Check if URL already exists
        const existingUrl = await getRow(
          'SELECT id, status FROM scraped_urls WHERE url = $1',
          [url]
        );

        if (existingUrl) {
          errors.push({
            url,
            error: 'URL already exists',
            data: {
              id: existingUrl.id,
              status: existingUrl.status
            }
          });
          continue;
        }

        // Insert new URL
        const result = await query(`
          INSERT INTO scraped_urls (url, title, description, category, level, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [url, title, description, category, level, metadata ? JSON.stringify(metadata) : null]);

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({
          url: urlData.url || 'Unknown',
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        added: results,
        errors,
        summary: {
          total: urls.length,
          added: results.length,
          errors: errors.length
        }
      }
    });
  } catch (error) {
    console.error('Error adding URLs to scraping queue:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to add URLs to scraping queue',
        details: error.message
      }
    });
  }
});

// Get pending URLs for scraping
router.get('/urls/pending', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const urls = await getRows(`
      SELECT * FROM scraped_urls 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      data: urls
    });
  } catch (error) {
    console.error('Error fetching pending URLs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch pending URLs',
        details: error.message
      }
    });
  }
});

// Update URL status (for scraping agent)
router.put('/urls/:id/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      title,
      description,
      category,
      level,
      metadata,
      error_message
    } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Status is required'
        }
      });
    }

    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    updateFields.push(`status = $${paramIndex++}`);
    params.push(status);

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      params.push(title);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(description);
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (level !== undefined) {
      updateFields.push(`level = $${paramIndex++}`);
      params.push(level);
    }

    if (metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(metadata));
    }

    if (error_message !== undefined) {
      updateFields.push(`error_message = $${paramIndex++}`);
      params.push(error_message);
    }

    // Update timestamps based on status
    if (status === 'in_progress') {
      updateFields.push(`last_attempt_at = CURRENT_TIMESTAMP`);
    } else if (status === 'completed') {
      updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'failed') {
      updateFields.push(`retry_count = retry_count + 1`);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(`
      UPDATE scraped_urls 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'URL not found'
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating URL status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update URL status',
        details: error.message
      }
    });
  }
});

// Delete a scraped URL
router.delete('/urls/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM scraped_urls WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'URL not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'URL deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete URL',
        details: error.message
      }
    });
  }
});

// Get scraping statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const statsResult = await getRows(`
      SELECT 
        status,
        COUNT(*) as count
      FROM scraped_urls 
      GROUP BY status
    `);

    const totalResult = await getRow('SELECT COUNT(*) as total FROM scraped_urls');
    const total = parseInt(totalResult.total);

    const stats = {
      total,
      by_status: {},
      summary: {
        pending: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
        skipped: 0
      }
    };

    statsResult.forEach(row => {
      stats.by_status[row.status] = parseInt(row.count);
      stats.summary[row.status] = parseInt(row.count);
    });

    // Get recent activity
    const recentActivity = await getRows(`
      SELECT * FROM scraped_urls 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        stats,
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching scraping stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch scraping statistics',
        details: error.message
      }
    });
  }
});

// Reset failed URLs for retry
router.post('/urls/reset-failed', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(`
      UPDATE scraped_urls 
      SET status = 'pending', 
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'failed'
      RETURNING *
    `);

    res.json({
      success: true,
      data: {
        reset_count: result.rows.length,
        message: `Reset ${result.rows.length} failed URLs to pending status`
      }
    });
  } catch (error) {
    console.error('Error resetting failed URLs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reset failed URLs',
        details: error.message
      }
    });
  }
});

module.exports = router; 