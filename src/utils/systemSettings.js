const { getRow, query } = require('../database/config');

// Cache for system settings (5 minute TTL)
let settingsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all system settings with caching
 * @returns {Promise<Object>} Object with setting keys and values
 */
const getSystemSettings = async () => {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (settingsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return settingsCache;
  }

  // Fetch from database
  const settings = await query('SELECT * FROM system_settings ORDER BY key');
  
  // Convert to key-value object
  const settingsObject = {};
  settings.rows.forEach(row => {
    settingsObject[row.key] = row.value;
  });

  // Update cache
  settingsCache = settingsObject;
  cacheTimestamp = now;

  return settingsObject;
};

/**
 * Get a specific system setting
 * @param {string} key - Setting key
 * @param {string} defaultValue - Default value if setting not found
 * @returns {Promise<string>} Setting value or default
 */
const getSystemSetting = async (key, defaultValue = '') => {
  const settings = await getSystemSettings();
  return settings[key] || defaultValue;
};

/**
 * Clear the settings cache (useful after updates)
 */
const clearSettingsCache = () => {
  settingsCache = null;
  cacheTimestamp = null;
};

module.exports = {
  getSystemSettings,
  getSystemSetting,
  clearSettingsCache
}; 