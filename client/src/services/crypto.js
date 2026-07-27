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
