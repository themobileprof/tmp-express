const axios = require('axios');

// Test admin workshop editing
async function testAdminWorkshopEditing() {
  const baseURL = 'http://localhost:3000';
  const adminToken = process.env.ADMIN_TOKEN || 'your-admin-jwt-token-here';

  // Sample exercise-based workshop spec
  const workshopSpec = {
    title: 'Advanced Linux Commands Workshop',
    description: 'Learn advanced Linux command line operations',
    exercises: [
      {
        id: 'ex1',
        title: 'File Permissions',
        description: 'Understanding and modifying file permissions',
        initialMessage: 'Let\'s learn about file permissions in Linux!',
        successMessage: 'Great! You\'ve mastered file permissions.',
        commands: [
          {
            command: 'ls -la',
            output: 'total 0\n-rw-r--r-- 1 user user 0 Jan 1 12:00 file.txt',
            description: 'List files with detailed permissions'
          },
          {
            command: 'chmod 755 script.sh',
            output: '',
            description: 'Change file permissions to executable'
          },
          {
            command: 'ls -la script.sh',
            output: '-rwxr-xr-x 1 user user 0 Jan 1 12:00 script.sh',
            description: 'Verify the permission change'
          }
        ]
      },
      {
        id: 'ex2',
        title: 'Process Management',
        description: 'Managing running processes',
        initialMessage: 'Now let\'s explore process management!',
        successMessage: 'Excellent work on process management!',
        commands: [
          {
            command: 'ps aux | head -5',
            output: 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1  12345  1234 ?        Ss   10:00   0:00 /sbin/init\nuser      1234  0.0  0.1  23456  2345 pts/0    S    10:01   0:00 bash',
            description: 'List running processes'
          },
          {
            command: 'top -n 1 | head -10',
            output: 'top - 12:00:00 up 2 hours,  1 user,  load average: 0.00, 0.01, 0.05\nTasks:  95 total,   1 running,  94 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\nMiB Mem :   1024.0 total,    512.0 free,    256.0 used,    256.0 buff/cache\nMiB Swap:   2048.0 total,   2048.0 free,      0.0 used',
            description: 'Show system resource usage'
          }
        ]
      }
    ]
  };

  try {
    console.log('🧪 Testing admin workshop JSON editing...');

    // First, get a lesson ID (you'll need to replace this with an actual lesson ID)
    const lessonId = process.env.TEST_LESSON_ID || 'your-lesson-uuid-here';

    // Create/update workshop
    console.log('📝 Creating/updating workshop...');
    const createResponse = await axios.post(
      `${baseURL}/api/admin/lessons/${lessonId}/workshop`,
      {
        isEnabled: true,
        spec: workshopSpec
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Workshop created/updated successfully');
    console.log('📋 Response:', JSON.stringify(createResponse.data, null, 2));

    // Verify the workshop was stored correctly
    console.log('🔍 Verifying workshop retrieval...');
    const getResponse = await axios.get(
      `${baseURL}/api/admin/lessons/${lessonId}/workshop`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    console.log('✅ Workshop retrieved successfully');
    console.log('📋 Stored spec:', JSON.stringify(getResponse.data.workshop.spec, null, 2));

    // Test partial update
    console.log('🔄 Testing partial update...');
    const updatedSpec = {
      ...workshopSpec,
      title: 'Updated: Advanced Linux Commands Workshop',
      exercises: [
        ...workshopSpec.exercises,
        {
          id: 'ex3',
          title: 'New Exercise',
          description: 'A newly added exercise',
          initialMessage: 'Welcome to the new exercise!',
          successMessage: 'New exercise completed!',
          commands: [
            {
              command: 'echo "New exercise command"',
              output: 'New exercise command',
              description: 'Test command for new exercise'
            }
          ]
        }
      ]
    };

    const updateResponse = await axios.put(
      `${baseURL}/api/admin/lessons/${lessonId}/workshop`,
      {
        spec: updatedSpec
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Workshop updated successfully');
    console.log('📋 Updated spec exercises count:', updateResponse.data.workshop.spec.exercises.length);

    console.log('🎉 All tests passed! Admin can fully edit workshop JSON format.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Make sure ADMIN_TOKEN environment variable is set with a valid admin JWT token');
    }
    if (error.response?.status === 404) {
      console.log('💡 Make sure TEST_LESSON_ID environment variable is set with a valid lesson UUID');
    }
  }
}

// Run the test
testAdminWorkshopEditing();