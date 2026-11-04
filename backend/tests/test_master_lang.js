const http = require('http');

http.get('http://localhost:5002/api/master/languages', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('JSON:', json);
    } catch (e) {
      console.log('Raw:', data.slice(0, 300));
    }
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});

