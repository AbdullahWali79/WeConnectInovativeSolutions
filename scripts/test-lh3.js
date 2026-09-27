const https = require('https');

https.get('https://lh3.googleusercontent.com/d/1Z1-I1iOyntHdEKycjWhhgIRIUWP-KzmH=w1000', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Data length:', data.length));
});
