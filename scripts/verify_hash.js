const crypto = require('crypto');

const password = 'naveen-123';
const storedHash = '4a63542708f4eb375bcb29c5dbd68b1e:2b1d4a158d95fa1376eefd4c61b93fb7bd95097794e9ab40b2fa2bf5de6063caada49227eb2fee0ef14a2df2e53e91bff0e41c664ff582a337497f5e2e97b3d4';

const [salt, hash] = storedHash.split(':');
const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

console.log('Password:', password);
console.log('Stored Hash:', hash);
console.log('Computed Hash:', verifyHash);
console.log('Match:', hash === verifyHash);
