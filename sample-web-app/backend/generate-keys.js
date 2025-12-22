const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');

// Ensure certs directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Generate RSA key pair (2048 bits)
// Using PKCS#1 format for private key to match OpenSSL's genrsa output
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',  // PKCS#1 format (matches OpenSSL genrsa output)
    format: 'pem'
  }
});

// Write private key
const privateKeyPath = path.join(certsDir, 'private.pem');
fs.writeFileSync(privateKeyPath, privateKey);
console.log(`✓ Private key generated: ${privateKeyPath}`);

// Write public key (in SPKI format, which is standard)
const publicKeyPath = path.join(certsDir, 'public.pem');
fs.writeFileSync(publicKeyPath, publicKey);
console.log(`✓ Public key generated: ${publicKeyPath}`);

console.log('\n✓ RSA key pair generation complete!');

