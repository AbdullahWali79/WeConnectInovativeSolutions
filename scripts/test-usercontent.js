const https = require('https');

https.get('https://drive.usercontent.google.com/download?id=1Z1-I1iOyntHdEKycjWhhgIRIUWP-KzmH&export=view', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});
