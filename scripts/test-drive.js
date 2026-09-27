const https = require('https');

https.get('https://drive.google.com/uc?export=view&id=1Z1-I1iOyntHdEKycjWhhgIRIUWP-KzmH', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Data sample:', data.substring(0, 200)));
});
