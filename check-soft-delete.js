const { query } = require('./src/database/config');

async function check() {
    try {
        const result = await query(`
            SELECT table_name
            FROM information_schema.columns 
            WHERE column_name = 'deleted_at' 
            AND table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📊 Tables with deleted_at column:\n');
        const expectedTables = [
            'courses', 'classes', 'lessons', 'tests', 
            'discussions', 'sponsorships', 
            'certification_programs', 'sponsorship_opportunities'
        ];
        
        const foundTables = result.rows.map(r => r.table_name);
        
        expectedTables.forEach(table => {
            if (foundTables.includes(table)) {
                console.log(`  ✅ ${table}`);
            } else {
                console.log(`  ❌ ${table} - MISSING!`);
            }
        });
        
        console.log(`\n✅ Found ${foundTables.length} of ${expectedTables.length} expected tables\n`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

check();
