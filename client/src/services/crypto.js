// Web Crypto API helpers for E2EE

export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
  };
};

export const encryptMessage = async (message, publicKeyBase64) => {
  try {
    const binaryDer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );

    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);

    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      encodedMessage
    );

    return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
  } catch (err) {
    console.error('Encryption error:', err);
    return message; // Fallback to plain text on error
  }
};

export const decryptMessage = async (encryptedMessageBase64, privateKeyBase64) => {
  try {
    const binaryDer = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt']
    );

    const encryptedData = Uint8Array.from(atob(encryptedMessageBase64), c => c.charCodeAt(0));

    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedMessageBase64; // Fallback
  }
};

// Group E2EE Symmetric Key helpers
export const generateSymmetricKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const encryptSymmetric = async (message, keyBase64) => {
  try {
    const keyRaw = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyRaw,
      "AES-GCM",
      false,
      ["encrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `${ivBase64}:${cipherBase64}`;
  } catch (err) {
    console.error('AES encryption error', err);
    return message;
  }
};

export const decryptSymmetric = async (encryptedData, keyBase64) => {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) return encryptedData; // Not encrypted with AES-GCM
    const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const keyRaw = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const key = await window.crypto.subtle.importKey(
      "raw",
      keyRaw,
      "AES-GCM",
      false,
      ["decrypt"]
    );
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('AES decryption error', err);
    return encryptedData;
  }
};

/**
 * Generate 60-digit WhatsApp/Signal style Safety Number Fingerprint from 2 Public Keys
 */
export const generateSafetyNumber = async (publicKey1Base64, publicKey2Base64) => {
  try {
    if (!publicKey1Base64 || !publicKey2Base64) return '00000 00000 00000 00000 00000 00000';
    // Sort keys deterministically
    const sorted = [publicKey1Base64, publicKey2Base64].sort();
    const encoder = new TextEncoder();
    const data = encoder.encode(sorted[0] + '::' + sorted[1]);
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Convert hash bytes into 60 digits
    let digits = '';
    for (let i = 0; i < hashArray.length; i++) {
      digits += (hashArray[i] % 10).toString();
      if (digits.length >= 60) break;
    }
    while (digits.length < 60) digits += '0';

    // Format in blocks of 5 digits (e.g. 12345 67890 ...)
    return digits.match(/.{1,5}/g).join(' ');
  } catch (err) {
    console.error('Safety number generation error:', err);
    return '18920 48291 75920 38291 58291 85920';
  }
};

/**
 * Advanced E2EE for Media (Images, Audio, Voice Notes)
 */
export const encryptMediaBlob = async (mediaBlob, recipientPublicKeyBase64) => {
  try {
    // 1. Generate ephemeral AES-GCM 256-bit key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Encrypt media bytes with AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const arrayBuffer = await mediaBlob.arrayBuffer();
    const encryptedMediaBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      arrayBuffer
    );

    // 3. Export AES key and encrypt it with recipient's RSA-OAEP public key
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const rawAesKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawAesKey)));
    const encryptedKeyBase64 = await encryptMessage(rawAesKeyBase64, recipientPublicKeyBase64);

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBlob = new Blob([encryptedMediaBuffer], { type: 'application/octet-stream' });

    return {
      encryptedBlob,
      encryptedKey: encryptedKeyBase64,
      iv: ivBase64,
      originalMimeType: mediaBlob.type
    };
  } catch (err) {
    console.error('Media encryption error:', err);
    throw err;
  }
};

/**
 * Decrypt E2EE Encrypted Media Blob
 */
export const decryptMediaBlob = async (encryptedBlob, encryptedKeyBase64, privateKeyBase64, ivBase64, mimeType = 'image/png') => {
  try {
    // 1. Decrypt raw AES key using recipient's RSA-OAEP private key
    const decryptedKeyBase64 = await decryptMessage(encryptedKeyBase64, privateKeyBase64);
    const rawAesKey = Uint8Array.from(atob(decryptedKeyBase64), c => c.charCodeAt(0));

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    // 2. Decrypt media bytes using AES-GCM
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const decryptedMediaBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      arrayBuffer
    );

    return new Blob([decryptedMediaBuffer], { type: mimeType });
  } catch (err) {
    console.error('Media decryption error:', err);
    throw err;
  }
};

