/**
 * Wallet address validation utilities
 *
 * BUG FIX: Wallet addresses were accepted from clients without format validation,
 * potentially allowing malformed addresses to be used in database queries.
 * These utilities provide consistent validation across all API endpoints.
 */

/**
 * Validates a Stellar wallet address format
 * Stellar addresses start with 'G' and are 56 characters long
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Stellar public keys start with 'G' and are 56 characters (base32 encoded)
  const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
  return stellarAddressRegex.test(address);
}

/**
 * Validates an Ethereum/EVM wallet address format
 * Ethereum addresses are 42 characters (0x + 40 hex chars)
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // EVM addresses: 0x followed by 40 hexadecimal characters
  const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return evmAddressRegex.test(address);
}

/**
 * Validates wallet address for either Stellar or Ethereum
 * Use this when the platform supports multiple wallet types
 */
export function isValidWalletAddress(address: string): boolean {
  return isValidStellarAddress(address) || isValidEthereumAddress(address);
}

/**
 * Validates and sanitizes a session ID
 * Session IDs should be alphanumeric with underscores only
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Allow alphanumeric and underscores, reasonable length
  const sessionIdRegex = /^[a-zA-Z0-9_-]{10,100}$/;
  return sessionIdRegex.test(sessionId);
}
