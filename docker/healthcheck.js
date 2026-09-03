const http = require('node:http');

const request = http.get(
  {
    host: '127.0.0.1',
    port: process.env.PORT || 3000,
    path: '/api/v1/health',
    timeout: 2000,
  },
  (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => {
      body += chunk;
    });
    response.on('end', () => {
      try {
        const payload = JSON.parse(body);
        process.exit(
          response.statusCode === 200 && payload.status === 'ok' ? 0 : 1,
        );
      } catch {
        process.exit(1);
      }
    });
  },
);

request.on('timeout', () => request.destroy());
request.on('error', () => process.exit(1));
