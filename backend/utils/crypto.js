'use strict';

const CryptoJS = require('crypto-js');

// Key must be present; falls back to a dev key so the app doesn't crash.
// In production, always set ENCRYPTION_KEY in Replit Secrets.
const KEY = process.env.ENCRYPTION_KEY || 'dev_fallback_key_32_chars_minimum';

function encrypt(plaintext) {
  if (!plaintext) return null;
  try {
    return CryptoJS.AES.encrypt(String(plaintext), KEY).toString();
  } catch {
    return null;
  }
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || null;
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
