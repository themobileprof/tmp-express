# migrate-create-only.js - Fresh Database Setup with Soft Delete

## Overview

The `migrate-create-only.js` file has been updated to include **built-in soft delete support** for all relevant tables. This means when setting up a fresh database, no additional migration files are needed for soft delete functionality.

## What Was Updated

### Tables with Soft Delete Built-In

All CREATE TABLE statements now include `deleted_at TIMESTAMP DEFAULT NULL` column:

1. **courses** - Line ~184
2. **classes** - Line ~302  
3. **sponsorships** - Line ~217
4. **sponsorship_opportunities** - Line ~267 (also added `created_by` foreign key)
5. **lessons** - Line ~358
6. **tests** - Line ~396
7. **discussions** - Line ~479
8. **certification_programs** - Line ~548

### Soft Delete Indexes Added

Partial indexes created for efficient soft delete queries (Lines ~781-832):

```javascript
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at 
ON courses(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_classes_deleted_at 
ON classes(deleted_at) WHERE deleted_at IS NULL;

// ... (6 more similar indexes)
```

**Why partial indexes?** They only index rows where `deleted_at IS NULL`, making queries that filter out deleted items extremely efficient.

### Enhanced sponsorship_opportunities

Added `created_by` column with foreign key to track who created each opportunity:
```sql
created_by UUID,
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
```

## Benefits

### 1. **Single Migration File**
- No need to run separate `add-soft-delete.js` or `add-soft-delete-extended.js` 
- Fresh database setup is complete in one command

### 2. **No ALTER Statements**
- All columns created directly in CREATE TABLE
- Cleaner, faster execution
- No schema changes needed post-creation

### 3. **Production Ready**
- Includes all optimizations (partial indexes)
- Consistent with existing implementation
- Full soft delete support from day one

### 4. **Zero Breaking Changes**
- Backward compatible with existing code
- Route handlers already check `deleted_at IS NULL`
- Existing databases unaffected

## Usage

### Fresh Database Setup

```bash
# Run the migration
node src/database/migrate-create-only.js

# Or use npm script
npm run migrate
```

This single command will:
1. Create all ENUM types
2. Create all tables with soft delete columns
3. Create all indexes including soft delete partial indexes
4. Seed default discussion categories
5. Create workshop support tables

### Query Pattern

All queries automatically work with soft delete:

```javascript
// Get active items only
SELECT * FROM courses WHERE deleted_at IS NULL;

// Soft delete an item
UPDATE courses SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1;

// Restore a deleted item
UPDATE courses SET deleted_at = NULL WHERE id = $1;

// Get only deleted items
SELECT * FROM courses WHERE deleted_at IS NOT NULL;
```

## Comparison with Migration Approach

### Old Approach (Existing Databases)
```bash
node src/database/migrate.js              # Create tables
node src/database/migrations/add-soft-delete.js  # Add courses/classes
node src/database/migrations/add-soft-delete-extended.js  # Add 6 more tables
```

### New Approach (Fresh Databases)
```bash
node src/database/migrate-create-only.js  # Everything in one step
```

## Tables Summary

| Table | Soft Delete | Index | Status |
|-------|-------------|-------|--------|
| users | ❌ | - | No soft delete needed |
| courses | ✅ | ✅ | Complete |
| classes | ✅ | ✅ | Complete |
| sponsorships | ✅ | ✅ | Complete |
| sponsorship_opportunities | ✅ | ✅ | Complete |
| lessons | ✅ | ✅ | Complete |
| tests | ✅ | ✅ | Complete |
| discussions | ✅ | ✅ | Complete |
| certification_programs | ✅ | ✅ | Complete |
| enrollments | ❌ | - | No soft delete |
| payments | ❌ | - | No soft delete |
| notifications | ❌ | - | No soft delete |

## Console Output

When running the migration, you'll see:

```
📋 Creating database tables (create-only)...
🔗 Database URL: Set
🌍 Environment: development
⏰ Migration started at: 2025-10-19T...

[... table creation messages ...]

📊 Creating soft delete indexes...
✓ Created soft delete index on courses
✓ Created soft delete index on classes
✓ Created soft delete index on sponsorships
✓ Created soft delete index on sponsorship_opportunities
✓ Created soft delete index on lessons
✓ Created soft delete index on tests
✓ Created soft delete index on discussions
✓ Created soft delete index on certification_programs

✅ Database create-only migration completed successfully!
🎉 All tables created with soft delete support!
📝 Soft delete enabled for: courses, classes, sponsorships, 
   sponsorship_opportunities, lessons, tests, discussions, 
   certification_programs
⏰ Migration completed at: 2025-10-19T...
```

## Technical Details

### Partial Index Performance

Partial indexes only index rows where `deleted_at IS NULL`:

**Without Partial Index:**
```sql
-- Index must scan all rows including deleted ones
SELECT * FROM courses WHERE deleted_at IS NULL;
-- Slower for large tables with many deleted items
```

**With Partial Index:**
```sql
-- Index only contains active items
SELECT * FROM courses WHERE deleted_at IS NULL;
-- Always fast regardless of deletion count
```

### Column Characteristics

```sql
deleted_at TIMESTAMP DEFAULT NULL
```

- **Type:** TIMESTAMP - Stores when item was deleted
- **Default:** NULL - Items are active by default
- **Nullable:** Yes - NULL = active, timestamp = deleted
- **Indexed:** Yes - Partial index for efficiency

## Migration Path for Existing Databases

If you have an **existing database**, do NOT use `migrate-create-only.js`. Instead:

1. Use the existing migration approach:
   ```bash
   node src/database/migrations/add-soft-delete.js
   node src/database/migrations/add-soft-delete-extended.js
   ```

2. Or run the SQL schema directly:
   ```bash
   psql -U username -d database -f src/database/schema-with-soft-delete.sql
   ```

## Files in This Implementation

1. **migrate-create-only.js** (THIS FILE - Updated)
   - Fresh database setup with built-in soft delete
   - No ALTER statements
   - Single command setup

2. **schema-with-soft-delete.sql** (NEW)
   - Pure SQL version of the same schema
   - Alternative for DBAs preferring SQL
   - Same functionality as migrate-create-only.js

3. **add-soft-delete.js** (Existing)
   - For existing databases
   - Adds courses/classes soft delete
   - Uses ALTER TABLE

4. **add-soft-delete-extended.js** (Existing)
   - For existing databases  
   - Adds 6 more tables
   - Uses ALTER TABLE

5. **migrate.js** (Existing)
   - Production migration with ALTER statements
   - For databases with existing data
   - Maintains backward compatibility

## Recommendation

### For New Projects
✅ Use `migrate-create-only.js`
- Clean, single-step setup
- All features included
- No migration chain needed

### For Existing Projects
✅ Use migration chain:
1. `migrate.js` (if not already run)
2. `add-soft-delete.js`
3. `add-soft-delete-extended.js`

### For DBAs/Production
✅ Use `schema-with-soft-delete.sql`
- Full SQL control
- Easy to review before execution
- Can be version controlled separately

## Testing

After running `migrate-create-only.js`, verify soft delete setup:

```bash
# Connect to database
psql -U your_user -d your_database

# Check tables have deleted_at column
\d courses
\d classes
\d lessons
# ... etc

# Check indexes exist
\di idx_courses_deleted_at
\di idx_classes_deleted_at
# ... etc

# Verify partial index definition
SELECT indexdef FROM pg_indexes 
WHERE indexname = 'idx_courses_deleted_at';
-- Should show: WHERE deleted_at IS NULL
```

## Conclusion

The `migrate-create-only.js` file is now a **complete, production-ready** database setup script with full soft delete support. No additional migrations needed for fresh database installations.

For existing databases, continue using the migration chain approach to safely add soft delete functionality without data loss.
