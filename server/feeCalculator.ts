/**
 * Fee Calculator Utility
 *
 * Handles platform fee calculations with support for per-company fee overrides.
 * Per Section 4.3.H of the specification, companies can have custom platform fees.
 *
 * Default fees (configurable via platform_settings):
 * - Platform fee: 4% (0.04)
 * - Stripe processing fee: 3% (0.03)
 * - Total: 7%
 */

import { db } from './db';
import { vendorProfiles, platformSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Default fee constants (fallbacks if platform_settings not configured)
export const DEFAULT_PLATFORM_FEE_PERCENTAGE = 0.04; // 4%
export const DEFAULT_STRIPE_PROCESSING_FEE_PERCENTAGE = 0.03; // 3%
export const DEFAULT_TOTAL_FEE_PERCENTAGE = DEFAULT_PLATFORM_FEE_PERCENTAGE + DEFAULT_STRIPE_PROCESSING_FEE_PERCENTAGE; // 7%

// Legacy export for backwards compatibility
export const STRIPE_PROCESSING_FEE_PERCENTAGE = DEFAULT_STRIPE_PROCESSING_FEE_PERCENTAGE;

// Cache for platform fee settings (refreshes every 5 minutes)
let feeSettingsCache: { platformFee: number; stripeFee: number; lastFetched: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch fee settings from platform_settings table with caching
 */
export async function getPlatformFeeSettings(): Promise<{ platformFee: number; stripeFee: number }> {
  const now = Date.now();

  // Return cached values if still valid
  if (feeSettingsCache && (now - feeSettingsCache.lastFetched) < CACHE_TTL_MS) {
    return { platformFee: feeSettingsCache.platformFee, stripeFee: feeSettingsCache.stripeFee };
  }

  try {
    const settings = await db
      .select({ key: platformSettings.key, value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.category, 'fees'));

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const platformFeeValue = settingsMap.get('platform_fee_percentage');
    const stripeFeeValue = settingsMap.get('stripe_processing_fee_percentage');

    const platformFee = platformFeeValue ? parseFloat(platformFeeValue) / 100 : DEFAULT_PLATFORM_FEE_PERCENTAGE;
    const stripeFee = stripeFeeValue ? parseFloat(stripeFeeValue) / 100 : DEFAULT_STRIPE_PROCESSING_FEE_PERCENTAGE;

    // Update cache
    feeSettingsCache = { platformFee, stripeFee, lastFetched: now };

    return { platformFee, stripeFee };
  } catch (error) {
    console.error('[FeeCalculator] Error fetching platform fee settings:', error);
    return { platformFee: DEFAULT_PLATFORM_FEE_PERCENTAGE, stripeFee: DEFAULT_STRIPE_PROCESSING_FEE_PERCENTAGE };
  }
}

/**
 * Clear the fee settings cache (useful when settings are updated)
 */
export function clearFeeSettingsCache(): void {
  feeSettingsCache = null;
}

/**
 * Get current stripe processing fee (from cache or default)
 */
export async function getStripeProcessingFee(): Promise<number> {
  const { stripeFee } = await getPlatformFeeSettings();
  return stripeFee;
}

/**
 * Get current default platform fee (from cache or default)
 */
export async function getDefaultPlatformFee(): Promise<number> {
  const { platformFee } = await getPlatformFeeSettings();
  return platformFee;
}

export interface FeeCalculation {
  grossAmount: number;
  platformFeeAmount: number;
  stripeFeeAmount: number;
  netAmount: number;
  platformFeePercentage: number;
  isCustomFee: boolean;
}

export interface FeeCalculationFormatted {
  grossAmount: string;
  platformFeeAmount: string;
  stripeFeeAmount: string;
  netAmount: string;
  platformFeePercentage: number;
  isCustomFee: boolean;
}

/**
 * Get the platform fee percentage for a company.
 * Returns the custom fee if set, otherwise returns the default from platform_settings.
 */
export async function getCompanyPlatformFeePercentage(companyId: string): Promise<{ percentage: number; isCustom: boolean }> {
  try {
    const company = await db
      .select({ customPlatformFeePercentage: vendorProfiles.customPlatformFeePercentage })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.id, companyId))
      .limit(1);

    if (company.length > 0 && company[0].customPlatformFeePercentage !== null) {
      return {
        percentage: parseFloat(company[0].customPlatformFeePercentage.toString()),
        isCustom: true,
      };
    }
  } catch (error) {
    console.error(`[FeeCalculator] Error fetching company fee for ${companyId}:`, error);
  }

  // Get default from platform settings
  const { platformFee } = await getPlatformFeeSettings();
  return {
    percentage: platformFee,
    isCustom: false,
  };
}

/**
 * Calculate fees for a given gross amount and company.
 * Supports per-company fee overrides and dynamic fee settings from platform_settings.
 */
export async function calculateFees(grossAmount: number, companyId: string): Promise<FeeCalculation> {
  const { percentage: platformFeePercentage, isCustom } = await getCompanyPlatformFeePercentage(companyId);
  const { stripeFee } = await getPlatformFeeSettings();

  const platformFeeAmount = grossAmount * platformFeePercentage;
  const stripeFeeAmount = grossAmount * stripeFee;
  const netAmount = grossAmount - platformFeeAmount - stripeFeeAmount;

  return {
    grossAmount,
    platformFeeAmount,
    stripeFeeAmount,
    netAmount,
    platformFeePercentage,
    isCustomFee: isCustom,
  };
}

/**
 * Calculate fees and return formatted string values (2 decimal places).
 * Useful for database storage.
 */
export async function calculateFeesFormatted(grossAmount: number, companyId: string): Promise<FeeCalculationFormatted> {
  const fees = await calculateFees(grossAmount, companyId);

  return {
    grossAmount: fees.grossAmount.toFixed(2),
    platformFeeAmount: fees.platformFeeAmount.toFixed(2),
    stripeFeeAmount: fees.stripeFeeAmount.toFixed(2),
    netAmount: fees.netAmount.toFixed(2),
    platformFeePercentage: fees.platformFeePercentage,
    isCustomFee: fees.isCustomFee,
  };
}

/**
 * Calculate fees synchronously using a known platform fee percentage.
 * Use this when you already have the company's fee percentage.
 */
export function calculateFeesWithPercentage(grossAmount: number, platformFeePercentage: number): Omit<FeeCalculation, 'isCustomFee'> {
  const platformFeeAmount = grossAmount * platformFeePercentage;
  const stripeFeeAmount = grossAmount * STRIPE_PROCESSING_FEE_PERCENTAGE;
  const netAmount = grossAmount - platformFeeAmount - stripeFeeAmount;

  return {
    grossAmount,
    platformFeeAmount,
    stripeFeeAmount,
    netAmount,
    platformFeePercentage,
  };
}

/**
 * Calculate fees using default percentages (no company override).
 * Synchronous version for cases where company lookup isn't needed.
 */
export function calculateFeesDefault(grossAmount: number): Omit<FeeCalculation, 'isCustomFee'> {
  return calculateFeesWithPercentage(grossAmount, DEFAULT_PLATFORM_FEE_PERCENTAGE);
}

/**
 * Get the total fee percentage for a company (platform + Stripe processing).
 */
export async function getTotalFeePercentage(companyId: string): Promise<number> {
  const { percentage } = await getCompanyPlatformFeePercentage(companyId);
  const { stripeFee } = await getPlatformFeeSettings();
  return percentage + stripeFee;
}

/**
 * Format fee percentage for display (e.g., 0.04 -> "4%")
 */
export function formatFeePercentage(percentage: number): string {
  return `${(percentage * 100).toFixed(percentage % 0.01 === 0 ? 0 : 2)}%`;
}

/**
 * Parse fee percentage from string input (e.g., "4" or "4%" -> 0.04)
 */
export function parseFeePercentage(input: string): number | null {
  const cleaned = input.replace('%', '').trim();
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed / 100;
}

/**
 * Validate a fee percentage is within acceptable range.
 * Platform fee should be between 0% and 50%.
 */
export function isValidPlatformFeePercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 0.5;
}
