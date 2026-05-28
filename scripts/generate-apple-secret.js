const crypto = require('crypto');
const fs = require('fs');

const TEAM_ID = '262N8RTXLL';
const KEY_ID = '55HWJDVC8S';
const CLIENT_ID = 'com.padrinks.web';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Uso: node scripts/generate-apple-secret.js <ruta-al-archivo.p8>');
  process.exit(1);
}

const privateKey = fs.readFileSync(keyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + 15777000;

const b64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url');

const header = { alg: 'ES256', kid: KEY_ID };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
};

const signingInput = `${b64url(header)}.${b64url(payload)}`;
const signature = crypto
  .sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  })
  .toString('base64url');

console.log('');
console.log('=== APPLE CLIENT SECRET (válido ~6 meses) ===');
console.log(`${signingInput}.${signature}`);
console.log('');
console.log(`Caduca: ${new Date(exp * 1000).toLocaleDateString()}`);
