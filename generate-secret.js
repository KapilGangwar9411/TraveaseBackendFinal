const crypto = require('crypto');

// Generate a 64-byte random string
const secret = crypto.randomBytes(64).toString('hex');

console.log('Generated JWT Secret:');
console.log(secret);
