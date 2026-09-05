export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'naio_default_dev_jwt_secret_key_2026';
  return new TextEncoder().encode(secret);
}
