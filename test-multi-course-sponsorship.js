const { query, getRow, getRows } = require('./src/database/config');

// Test multi-course sponsorship functionality
const testMultiCourseSponsorship = async () => {
  try {
    console.log('🧪 Testing Multi-Course Sponsorship Functionality...\n');

    // 1. Create a test sponsor user
    console.log('1️⃣ Creating test sponsor user...');
    const sponsorResult = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET role = $5
      RETURNING id, email, role
    `, ['test-sponsor@example.com', 'hashed_password', 'Test', 'Sponsor', 'sponsor']);
    
    const sponsor = sponsorResult.rows[0];
    console.log(`✅ Sponsor created: ${sponsor.email} (ID: ${sponsor.id})`);

    // 2. Get some existing courses
    console.log('\n2️⃣ Getting existing courses...');
    const courses = await getRows('SELECT id, title, price FROM courses LIMIT 3');
    if (courses.length === 0) {
      console.log('❌ No courses found. Please create some courses first.');
      return;
    }
    console.log(`✅ Found ${courses.length} courses:`);
    courses.forEach(course => {
      console.log(`   - ${course.title} ($${course.price})`);
    });

    // 3. Create a multi-course sponsorship
    console.log('\n3️⃣ Creating multi-course sponsorship...');
    const courseIds = courses.map(c => c.id);
    const discountCode = 'MULTI50';
    
    // First, create the sponsorship
    const sponsorshipResult = await query(`
      INSERT INTO sponsorships (sponsor_id, discount_code, discount_type, discount_value, max_students, start_date, end_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (discount_code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id, discount_code
    `, [sponsor.id, discountCode, 'percentage', 50, 100, new Date(), new Date(Date.now() + 30*24*60*60*1000), 'Multi-course 50% discount']);
    
    const sponsorship = sponsorshipResult.rows[0];
    console.log(`✅ Sponsorship created: ${sponsorship.discount_code} (ID: ${sponsorship.id})`);

    // Then, link it to all courses
    for (const courseId of courseIds) {
      await query(`
        INSERT INTO sponsorship_courses (sponsorship_id, course_id)
        VALUES ($1, $2)
        ON CONFLICT (sponsorship_id, course_id) DO NOTHING
      `, [sponsorship.id, courseId]);
    }
    console.log(`✅ Linked sponsorship to ${courseIds.length} courses`);

    // 4. Test sponsorship validation
    console.log('\n4️⃣ Testing sponsorship validation...');
    const validationResult = await getRow(`
      SELECT s.*, 
              array_agg(c.title) as course_titles,
              array_agg(c.price) as course_prices,
              array_agg(c.id) as course_ids
       FROM sponsorships s
       JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
       JOIN courses c ON sc.course_id = c.id
       WHERE s.discount_code = $1 AND s.status = 'active'
       GROUP BY s.id
    `, [discountCode]);

    if (validationResult) {
      console.log('✅ Sponsorship validation successful:');
      console.log(`   - Code: ${validationResult.discount_code}`);
      console.log(`   - Type: ${validationResult.discount_type}`);
      console.log(`   - Value: ${validationResult.discount_value}%`);
      console.log(`   - Courses: ${validationResult.course_titles.join(', ')}`);
      console.log(`   - Course IDs: ${validationResult.course_ids.join(', ')}`);
    } else {
      console.log('❌ Sponsorship validation failed');
    }

    // 5. Test course-specific validation
    console.log('\n5️⃣ Testing course-specific validation...');
    const testCourseId = courseIds[0];
    const courseValidation = await getRow(`
      SELECT s.*, c.title as course_title, c.price as course_price
       FROM sponsorships s
       JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
       JOIN courses c ON sc.course_id = c.id
       WHERE s.discount_code = $1 AND s.status = 'active' AND c.id = $2
    `, [discountCode, testCourseId]);

    if (courseValidation) {
      console.log(`✅ Course validation successful for: ${courseValidation.course_title}`);
      console.log(`   - Course Price: $${courseValidation.course_price}`);
      console.log(`   - Discount Amount: $${(courseValidation.course_price * courseValidation.discount_value / 100).toFixed(2)}`);
      console.log(`   - Final Price: $${(courseValidation.course_price * (1 - courseValidation.discount_value / 100)).toFixed(2)}`);
    } else {
      console.log('❌ Course validation failed');
    }

    // 6. Test invalid course validation
    console.log('\n6️⃣ Testing invalid course validation...');
    const invalidCourseId = '00000000-0000-0000-0000-000000000000';
    const invalidValidation = await getRow(`
      SELECT s.*, c.title as course_title, c.price as course_price
       FROM sponsorships s
       JOIN sponsorship_courses sc ON s.id = sc.sponsorship_id
       JOIN courses c ON sc.course_id = c.id
       WHERE s.discount_code = $1 AND s.status = 'active' AND c.id = $2
    `, [discountCode, invalidCourseId]);

    if (!invalidValidation) {
      console.log('✅ Invalid course validation correctly rejected');
    } else {
      console.log('❌ Invalid course validation should have been rejected');
    }

    console.log('\n🎉 Multi-course sponsorship test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Sponsor: ${sponsor.email}`);
    console.log(`   - Discount Code: ${discountCode}`);
    console.log(`   - Applies to: ${courseIds.length} courses`);
    console.log(`   - Discount: ${validationResult?.discount_value}% off`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('💥 Error details:', error.message);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testMultiCourseSponsorship().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testMultiCourseSponsorship }; 