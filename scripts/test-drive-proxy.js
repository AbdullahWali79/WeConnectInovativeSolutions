const https = require('https');

const id = '1Z1-l1iOyntHdEKycjWhhgIRlUWP-KzmH';
const url = `https://drive.google.com/uc?export=view&id=${id}`;

https.get(url, (res) => {
  console.log('Step 1:', res.statusCode);
  if (res.statusCode === 303 || res.statusCode === 302) {
    console.log('Redirect to:', res.headers.location);
    https.get(res.headers.location, (res2) => {
      console.log('Step 2:', res2.statusCode);
      console.log('Headers:', res2.headers['content-type']);
      let size = 0;
      res2.on('data', chunk => size += chunk.length);
      res2.on('end', () => console.log('Downloaded bytes:', size));
    });
  }
});
