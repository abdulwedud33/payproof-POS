import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const TAG_LENGTH = 16; // Standard 128-bit authentication tag

export function encryptAesGcm(plainText: string, keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes (256 bits)');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Format: [12-byte IV][Encrypted data][16-byte Tag]
  return Buffer.concat([iv, encrypted, tag]);
}

export function decryptAesGcm(encryptedBuffer: Buffer, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes (256 bits)');
  }

  if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext length for AES-GCM');
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(encryptedBuffer.length - TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH, encryptedBuffer.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
}
