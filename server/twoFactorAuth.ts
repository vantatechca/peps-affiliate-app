/**
 * Two-Factor Authentication (2FA) Service
 *
 * Provides TOTP (Time-based One-Time Password) functionality for 2FA
 * using authenticator apps like Google Authenticator, Authy, or 1Password.
 */

import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Configure TOTP options
authenticator.options = {
  digits: 6,       // 6-digit codes
  step: 30,        // 30-second validity window
  window: 1,       // Allow 1 step before/after for clock drift
};

const APP_NAME = 'AffiliateXchange';

/**
 * Generate a new TOTP secret for a user
 * @returns Base32-encoded secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate a QR code URL for authenticator app setup
 * @param secret - The TOTP secret
 * @param email - User's email for identification
 * @returns otpauth:// URL for QR code
 */
export function generateOtpauthUrl(secret: string, email: string): string {
  return authenticator.keyuri(email, APP_NAME, secret);
}

/**
 * Generate a QR code as data URL for authenticator app setup
 * @param secret - The TOTP secret
 * @param email - User's email for identification
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCodeDataURL(secret: string, email: string): Promise<string> {
  const otpauthUrl = generateOtpauthUrl(secret, email);
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  });
}

/**
 * Verify a TOTP code against a secret
 * @param code - The 6-digit code from authenticator app
 * @param secret - The user's TOTP secret
 * @returns boolean - Whether the code is valid
 */
export function verifyTOTP(code: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: code, secret });
  } catch (error) {
    console.error('[2FA] TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes for recovery
 * @param count - Number of backup codes to generate (default 10)
 * @returns Array of plaintext backup codes and their hashed versions
 */
export async function generateBackupCodes(count: number = 10): Promise<{
  plaintextCodes: string[];
  hashedCodes: string[];
}> {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code (format: XXXX-XXXX)
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;

    plaintextCodes.push(code);

    // Hash the backup code for storage
    const hashedCode = await bcrypt.hash(code, 10);
    hashedCodes.push(hashedCode);
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Verify a backup code against stored hashed codes
 * @param inputCode - The backup code provided by user (with or without dash)
 * @param hashedCodes - Array of hashed backup codes from database
 * @returns Index of the matched code if valid, -1 if invalid
 */
export async function verifyBackupCode(
  inputCode: string,
  hashedCodes: string[]
): Promise<number> {
  // Normalize input: remove spaces and dashes, convert to uppercase
  const normalizedInput = inputCode.replace(/[-\s]/g, '').toUpperCase();

  // Reconstruct format for comparison: XXXX-XXXX
  const formattedCode = normalizedInput.length === 8
    ? `${normalizedInput.slice(0, 4)}-${normalizedInput.slice(4)}`
    : inputCode.toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(formattedCode, hashedCodes[i]);
    if (isMatch) {
      return i; // Return index of matched code
    }
  }

  return -1; // No match found
}

/**
 * Remove a used backup code from the array
 * @param hashedCodes - Array of hashed backup codes
 * @param usedIndex - Index of the used code to remove
 * @returns Updated array with the used code removed
 */
export function removeUsedBackupCode(hashedCodes: string[], usedIndex: number): string[] {
  return hashedCodes.filter((_, index) => index !== usedIndex);
}

/**
 * Format backup codes for display to user
 * @param codes - Array of plaintext backup codes
 * @returns Formatted string with one code per line
 */
export function formatBackupCodesForDisplay(codes: string[]): string {
  return codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
}

/**
 * Validate TOTP code format
 * @param code - The input code to validate
 * @returns boolean - Whether the code format is valid (6 digits)
 */
export function isValidTOTPFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Validate backup code format
 * @param code - The input code to validate
 * @returns boolean - Whether the code format is valid (XXXX-XXXX or XXXXXXXX)
 */
export function isValidBackupCodeFormat(code: string): boolean {
  // Accept both XXXX-XXXX and XXXXXXXX formats
  const normalized = code.replace(/[-\s]/g, '').toUpperCase();
  return /^[A-F0-9]{8}$/.test(normalized);
}

export const twoFactorService = {
  generateSecret,
  generateOtpauthUrl,
  generateQRCodeDataURL,
  verifyTOTP,
  generateBackupCodes,
  verifyBackupCode,
  removeUsedBackupCode,
  formatBackupCodesForDisplay,
  isValidTOTPFormat,
  isValidBackupCodeFormat,
};
