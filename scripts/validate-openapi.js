#!/usr/bin/env node

/**
 * OpenAPI validation script for the modular structure
 * This script validates individual files and the main structure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OPENAPI_DIR = 'docs/openapi';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFile(filePath) {
  try {
    execSync(`npx swagger-cli validate "${filePath}"`, { stdio: 'pipe' });
    log(`✓ ${path.relative(OPENAPI_DIR, filePath)}`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${path.relative(OPENAPI_DIR, filePath)}`, 'red');
    return false;
  }
}

function validateDirectory(dirPath, fileExtension = '.yaml') {
  const files = fs.readdirSync(dirPath)
    .filter(file => file.endsWith(fileExtension))
    .map(file => path.join(dirPath, file));
  
  let validCount = 0;
  let totalCount = files.length;
  
  log(`\nValidating ${path.relative(OPENAPI_DIR, dirPath)}/ (${totalCount} files):`, 'blue');
  
  files.forEach(file => {
    if (validateFile(file)) {
      validCount++;
    }
  });
  
  return { valid: validCount, total: totalCount };
}

function validateMainFile() {
  const mainFile = path.join(OPENAPI_DIR, 'openapi.yaml');
  
  if (!fs.existsSync(mainFile)) {
    log('Main OpenAPI file not found!', 'red');
    return false;
  }
  
  log('\nValidating main OpenAPI file:', 'blue');
  return validateFile(mainFile);
}

function generateConsolidatedFile() {
  try {
    log('\nGenerating consolidated file...', 'blue');
    execSync('npm run openapi:bundle', { stdio: 'pipe' });
    log('✓ Consolidated file generated successfully', 'green');
    return true;
  } catch (error) {
    log('✗ Failed to generate consolidated file', 'red');
    return false;
  }
}

function main() {
  log('OpenAPI Validation Tool', 'blue');
  log('======================\n', 'blue');
  
  let allValid = true;
  
  // Validate main file
  if (!validateMainFile()) {
    allValid = false;
  }
  
  // Validate components
  const componentsDir = path.join(OPENAPI_DIR, 'components');
  if (fs.existsSync(componentsDir)) {
    const schemasResult = validateDirectory(path.join(componentsDir, 'schemas'));
    const responsesResult = validateDirectory(path.join(componentsDir, 'responses'));
    
    if (schemasResult.valid < schemasResult.total || responsesResult.valid < responsesResult.total) {
      allValid = false;
    }
  }
  
  // Validate paths
  const pathsDir = path.join(OPENAPI_DIR, 'paths');
  if (fs.existsSync(pathsDir)) {
    const pathsResult = validateDirectory(pathsDir);
    if (pathsResult.valid < pathsResult.total) {
      allValid = false;
    }
  }
  
  // Generate consolidated file if all validations pass
  if (allValid) {
    generateConsolidatedFile();
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  if (allValid) {
    log('🎉 All OpenAPI files are valid!', 'green');
  } else {
    log('❌ Some OpenAPI files have validation errors', 'red');
    log('Please fix the errors above and run validation again.', 'yellow');
  }
  log('='.repeat(50), 'blue');
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = { validateFile, validateDirectory, validateMainFile }; 