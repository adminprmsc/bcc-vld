const http = require('http');

const data = JSON.stringify({
  email: 'haroonfareed20@gmail.com',
  password: '12345678'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/users/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log('TOKEN:', parsed.token ? parsed.token.substring(0, 30) + '...' : 'NO TOKEN');
      console.log('USER:', parsed.user ? parsed.user.name + ' / ' + parsed.user.role : 'NO USER');
    } catch (e) {
      console.log('BODY:', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => console.error('ERROR:', e.message));
req.write(data);
req.end();
