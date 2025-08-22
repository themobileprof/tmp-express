const { getRow, getRows, query } = require('./config');

(async () => {
	try {
		console.log('🌱 Seeding certification programs...');

		const existing = await getRow(`SELECT id FROM certification_programs WHERE title = $1`, ['Full-Stack Web Developer']);
		let programId;
		if (!existing) {
			const result = await query(
				`INSERT INTO certification_programs (title, description, duration, level, prerequisites, price, is_active)
				 VALUES ($1, $2, $3, $4, $5, $6, true)
				 RETURNING id`,
				[
					'Full-Stack Web Developer',
					'End-to-end track covering frontend, backend, and databases',
					'12 weeks',
					'intermediate',
					'Basic JS/HTML/CSS',
					199.0
				]
			);
			programId = result.rows[0].id;
			console.log('✅ Created program:', programId);
		} else {
			programId = existing.id;
			console.log('ℹ️ Program already exists:', programId);
		}

		// Seed modules if not present
		const moduleCountRow = await getRow(`SELECT COUNT(*)::int as cnt FROM certification_program_modules WHERE program_id = $1`, [programId]);
		if ((moduleCountRow?.cnt || 0) === 0) {
			const modules = [
				{ title: 'Frontend Foundations', order_index: 1 },
				{ title: 'Backend APIs with Node.js', order_index: 2 },
				{ title: 'Databases and SQL', order_index: 3 },
				{ title: 'Capstone Project', order_index: 4 }
			];
			for (const m of modules) {
				await query(
					`INSERT INTO certification_program_modules (program_id, title, order_index) VALUES ($1, $2, $3)`,
					[programId, m.title, m.order_index]
				);
			}
			console.log('✅ Seeded program modules');
		} else {
			console.log('ℹ️ Modules already exist for program');
		}

		console.log('🌱 Seeding complete.');
		process.exit(0);
	} catch (err) {
		console.error('❌ Seeding failed:', err);
		process.exit(1);
	}
})(); 