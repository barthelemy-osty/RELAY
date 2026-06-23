import sodium from 'libsodium-wrappers'

export async function initCrypto(): Promise<void> {
  await sodium.ready
}

// ─── Key generation ───────────────────────────────────────────────────────────

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  await sodium.ready
  const kp = sodium.crypto_box_keypair()
  return {
    publicKey: sodium.to_base64(kp.publicKey),
    privateKey: sodium.to_base64(kp.privateKey),
  }
}

export async function fingerprintKey(publicKeyB64: string): Promise<string> {
  await sodium.ready
  const pubKey = sodium.from_base64(publicKeyB64)
  const hash = sodium.crypto_generichash(8, pubKey)
  return Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase()
}

// ─── Private key storage (encrypted with passphrase via Argon2id) ─────────────

export async function encryptPrivateKey(
  privateKeyB64: string,
  passphrase: string
): Promise<{ encryptedKey: string; salt: string; nonce: string }> {
  await sodium.ready
  const privateKey = sodium.from_base64(privateKeyB64)
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)

  const derivedKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  )

  const encryptedKey = sodium.crypto_secretbox_easy(privateKey, nonce, derivedKey)

  return {
    encryptedKey: sodium.to_base64(encryptedKey),
    salt: sodium.to_base64(salt),
    nonce: sodium.to_base64(nonce),
  }
}

export async function decryptPrivateKey(
  encryptedKeyB64: string,
  saltB64: string,
  nonceB64: string,
  passphrase: string
): Promise<string> {
  await sodium.ready
  const encryptedKey = sodium.from_base64(encryptedKeyB64)
  const salt = sodium.from_base64(saltB64)
  const nonce = sodium.from_base64(nonceB64)

  const derivedKey = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  )

  const privateKey = sodium.crypto_secretbox_open_easy(encryptedKey, nonce, derivedKey)
  return sodium.to_base64(privateKey)
}

// ─── 1-to-1 message encryption ───────────────────────────────────────────────

export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderPrivateKeyB64: string
): Promise<{ ciphertext: string; nonce: string }> {
  await sodium.ready
  const message = sodium.from_string(plaintext)
  const recipientPublicKey = sodium.from_base64(recipientPublicKeyB64)
  const senderPrivateKey = sodium.from_base64(senderPrivateKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)

  const ciphertext = sodium.crypto_box_easy(message, nonce, recipientPublicKey, senderPrivateKey)

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  }
}

export async function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  recipientPrivateKeyB64: string
): Promise<string> {
  await sodium.ready
  const ciphertext = sodium.from_base64(ciphertextB64)
  const nonce = sodium.from_base64(nonceB64)
  const senderPublicKey = sodium.from_base64(senderPublicKeyB64)
  const recipientPrivateKey = sodium.from_base64(recipientPrivateKeyB64)

  const plaintext = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientPrivateKey
  )
  return sodium.to_string(plaintext)
}

// ─── Group key encryption (each member gets the group key encrypted for them) ─

export async function generateGroupKey(): Promise<string> {
  await sodium.ready
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
  return sodium.to_base64(key)
}

export async function encryptGroupKeyForMember(
  groupKeyB64: string,
  memberPublicKeyB64: string,
  senderPrivateKeyB64: string
): Promise<{ encryptedGroupKey: string; nonce: string }> {
  await sodium.ready
  const groupKey = sodium.from_base64(groupKeyB64)
  const memberPublicKey = sodium.from_base64(memberPublicKeyB64)
  const senderPrivateKey = sodium.from_base64(senderPrivateKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)

  const encryptedGroupKey = sodium.crypto_box_easy(
    groupKey,
    nonce,
    memberPublicKey,
    senderPrivateKey
  )

  return {
    encryptedGroupKey: sodium.to_base64(encryptedGroupKey),
    nonce: sodium.to_base64(nonce),
  }
}

export async function decryptGroupKey(
  encryptedGroupKeyB64: string,
  nonceB64: string,
  senderPublicKeyB64: string,
  recipientPrivateKeyB64: string
): Promise<string> {
  await sodium.ready
  const encryptedGroupKey = sodium.from_base64(encryptedGroupKeyB64)
  const nonce = sodium.from_base64(nonceB64)
  const senderPublicKey = sodium.from_base64(senderPublicKeyB64)
  const recipientPrivateKey = sodium.from_base64(recipientPrivateKeyB64)

  const groupKey = sodium.crypto_box_open_easy(
    encryptedGroupKey,
    nonce,
    senderPublicKey,
    recipientPrivateKey
  )
  return sodium.to_base64(groupKey)
}

export async function encryptGroupMessage(
  plaintext: string,
  groupKeyB64: string
): Promise<{ ciphertext: string; nonce: string }> {
  await sodium.ready
  const message = sodium.from_string(plaintext)
  const groupKey = sodium.from_base64(groupKeyB64)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)

  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, groupKey)
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  }
}

export async function decryptGroupMessage(
  ciphertextB64: string,
  nonceB64: string,
  groupKeyB64: string
): Promise<string> {
  await sodium.ready
  const ciphertext = sodium.from_base64(ciphertextB64)
  const nonce = sodium.from_base64(nonceB64)
  const groupKey = sodium.from_base64(groupKeyB64)

  const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, groupKey)
  return sodium.to_string(plaintext)
}
