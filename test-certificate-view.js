const { spawn } = require('child_process');
const http = require('http');

// Start the server
console.log('Starting server...');
const server = spawn('npm', ['run', 'dev'], {
  cwd: '/home/samuel/sites/tmp-mixer/backend',
  detached: true,
  stdio: 'ignore'
});

server.unref();

// Wait for server to start
setTimeout(() => {
  console.log('Testing certificate view endpoint...');

  // Test the dev users endpoint
  http.get('http://localhost:3000/dev/users', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const users = JSON.parse(data);
        console.log('Dev users:', users);

        if (users.length > 0) {
          const email = users[0].email;
          console.log('Getting token for:', email);

          // Get token
          http.get(`http://localhost:3000/dev/token/${email}`, (res2) => {
            let tokenData = '';
            res2.on('data', (chunk) => tokenData += chunk);
            res2.on('end', () => {
              try {
                const tokenResponse = JSON.parse(tokenData);
                const token = tokenResponse.token;
                console.log('Got token, testing certificate view...');

                // Test certificate view
                const certId = '5947fe77-4cf5-475b-99e8-c61c90523188'; // The test cert we created
                const options = {
                  hostname: 'localhost',
                  port: 3000,
                  path: `/api/certifications/${certId}/view`,
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                };

                const req = http.request(options, (res3) => {
                  console.log('Certificate view response status:', res3.statusCode);
                  let html = '';
                  res3.on('data', (chunk) => html += chunk);
                  res3.on('end', () => {
                    if (res3.statusCode === 200) {
                      console.log('✅ Certificate view endpoint working!');
                      console.log('HTML length:', html.length);
                      console.log('Contains certificate image:', html.includes('certificate-image'));
                      console.log('Contains print button:', html.includes('print-btn'));
                    } else {
                      console.log('❌ Certificate view failed:', html);
                    }
                    process.exit(0);
                  });
                });

                req.on('error', (e) => {
                  console.error('Request error:', e);
                  process.exit(1);
                });

                req.end();

              } catch (e) {
                console.error('Token parse error:', e);
                process.exit(1);
              }
            });
          }).on('error', (e) => {
            console.error('Token request error:', e);
            process.exit(1);
          });
        } else {
          console.log('No users found');
          process.exit(1);
        }
      } catch (e) {
        console.error('Users parse error:', e);
        process.exit(1);
      }
    });
  }).on('error', (e) => {
    console.error('Users request error:', e);
    process.exit(1);
  });

}, 5000);