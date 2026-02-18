/**
 * Simple Mustache-style template engine
 * Replaces {{variable}} with data values and handles conditionals
 */
class TemplateEngine {
  /**
   * Render template with data
   * @param {string} template - HTML template string
   * @param {Object} data - Data to inject
   * @returns {string} - Rendered HTML
   */
  render(template, data) {
    let result = template;
    
    // Handle conditional blocks first {{#key}}...{{/key}}
    result = this.handleConditionals(result, data);
    
    // Replace simple variables {{variable}}
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const value = data[key] !== null && data[key] !== undefined ? data[key] : '';
      result = result.replace(regex, this.escapeHtml(String(value)));
    });
    
    // Clean up unused placeholders
    result = result.replace(/{{[^}]+}}/g, '');
    
    return result;
  }
  
  /**
   * Handle conditional blocks in template
   * Supports {{#key}}content{{/key}}
   */
  handleConditionals(template, data) {
    let result = template;
    
    // Match {{#key}}content{{/key}}
    const conditionalRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g;
    
    result = result.replace(conditionalRegex, (match, key, content) => {
      const value = data[key];
      
      // If value is array, repeat content for each item
      if (Array.isArray(value)) {
        return value.map(item => this.render(content, item)).join('');
      }
      
      // If value is truthy, include content
      if (value) {
        return this.render(content, typeof value === 'object' ? value : data);
      }
      
      // Otherwise, exclude content
      return '';
    });
    
    return result;
  }
  
  /**
   * Escape HTML to prevent injection
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = new TemplateEngine();
