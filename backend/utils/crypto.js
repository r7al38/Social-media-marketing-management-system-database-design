'use strict';

const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY || 'fallback_dev_key_32_characters!!';

/**
 * Encrypts a plaintext string using AES-256.
 * @param {string} plaintext
 * @returns {string} Encrypted ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  return CryptoJS.AES.encrypt(plaintext, KEY).toString();
}

/**
 * Decrypts an AES-256 ciphertext string.
 * @param {string} ciphertext
 * @returns {string} Decrypted plaintext
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };