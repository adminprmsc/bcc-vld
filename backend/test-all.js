// Start server and test login
require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);
server.listen(3000, '0.0.0.0', () => {
  console.log('SERVER READY on port 3000');
  
  // Test login
  const data = JSON.stringify({
    email: 'haroonfareed20@gmail.com',
    password: '12345678'
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/users/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('\n=== LOGIN TEST ===');
      console.log('STATUS:', res.statusCode);
      try {
        const parsed = JSON.parse(body);
        if (parsed.token) {
          console.log('TOKEN:', parsed.token.substring(0, 40) + '...');
          console.log('USER:', parsed.user?.name, '/', parsed.user?.role, '/', parsed.user?.email);
          console.log('LOGIN: SUCCESS ✅');
        } else {
          console.log('RESPONSE:', JSON.stringify(parsed));
          console.log('LOGIN: FAILED ❌');
        }
      } catch (e) {
        console.log('BODY:', body.substring(0, 300));
      }
      
      // Test requisitions list
      const token = JSON.parse(body).token;
      if (token) {
        const req2 = http.request({
          hostname: '127.0.0.1',
          port: 3000,
          path: '/requisition',
          method: 'GET',
          headers: { 'x-auth-token': token }
        }, (res2) => {
          let b = '';
          res2.on('data', (c) => b += c);
          res2.on('end', () => {
            console.log('\n=== REQUISITIONS TEST ===');
            console.log('STATUS:', res2.statusCode);
            try {
              const p = JSON.parse(b);
              if (Array.isArray(p)) {
                console.log('COUNT:', p.length, 'requisitions');
                console.log('REQUISITIONS: SUCCESS ✅');
              } else if (p.requisitions) {
                console.log('COUNT:', p.requisitions.length, 'requisitions');
                console.log('REQUISITIONS: SUCCESS ✅');
              } else {
                console.log('RESPONSE:', JSON.stringify(p).substring(0, 200));
              }
            } catch (e) {
              console.log('BODY:', b.substring(0, 200));
            }
            
            server.close(() => {
              console.log('\n=== ALL TESTS DONE ===');
              process.exit(0);
            });
          });
        });
        req2.on('error', (e) => console.error('REQ ERR:', e.message));
        req2.end();
      } else {
        server.close(() => process.exit(1));
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('LOGIN REQUEST ERROR:', e.message);
    server.close(() => process.exit(1));
  });
  req.write(data);
  req.end();
});

server.on('error', (e) => {
  console.error('SERVER ERROR:', e.message);
  process.exit(1);
});
