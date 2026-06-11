import { db } from "./db";
import { clickEvents } from "../shared/schema";
import { sql, and, gte, eq } from "drizzle-orm";

/**
 * Fraud Detection Service
 *
 * Detects and prevents fraudulent click activity:
 * - Rate limiting per IP (10 clicks/minute)
 * - Bot detection (known bot user agents)
 * - Suspicious pattern detection (same IP, rapid clicks)
 * - Fraud score calculation
 */

// Known bot user agents (common crawlers, bots, scrapers)
const BOT_USER_AGENTS = [
  'bot', 'crawl', 'spider', 'slurp', 'scan', 'scrape',
  'curl', 'wget', 'python-requests', 'go-http-client',
  'postman', 'insomnia', 'facebookexternalhit', 'twitterbot',
  'linkedinbot', 'whatsapp', 'telegram', 'discordbot',
  'headlesschrome', 'phantomjs', 'selenium', 'scrapy'
];

// Suspicious IP patterns (data centers, proxies, VPNs)
const SUSPICIOUS_IP_PATTERNS = [
  // Common VPN/Proxy patterns
  /^10\./, // Private network
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
  /^192\.168\./, // Private network
];

export interface FraudCheckResult {
  isValid: boolean;
  fraudScore: number; // 0-100, higher = more suspicious
  reason?: string;
  flags: string[];
}

/**
 * Check if a user agent is a known bot
 */
export function isBotUserAgent(userAgent: string): boolean {
  if (!userAgent) return false;

  const lowerAgent = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => lowerAgent.includes(bot));
}

/**
 * Check if an IP address is suspicious
 */
export function isSuspiciousIP(ip: string): boolean {
  return SUSPICIOUS_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Get recent click count for an IP address (last minute)
 */
export async function getRecentClickCount(ip: string): Promise<number> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(clickEvents)
    .where(
      and(
        eq(clickEvents.ipAddress, ip),
        gte(clickEvents.timestamp, oneMinuteAgo)
      )
    );

  return result[0]?.count || 0;
}

/**
 * Get click count for same IP + application combination (last hour)
 */
export async function getSameIPApplicationClicks(
  ip: string,
  applicationId: string
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(clickEvents)
    .where(
      and(
        eq(clickEvents.ipAddress, ip),
        eq(clickEvents.applicationId, applicationId),
        gte(clickEvents.timestamp, oneHourAgo)
      )
    );

  return result[0]?.count || 0;
}

/**
 * Calculate fraud score based on various factors
 */
function calculateFraudScore(flags: string[]): number {
  let score = 0;

  // Assign weights to different fraud indicators
  const weights: Record<string, number> = {
    'rate_limit_exceeded': 40,
    'bot_user_agent': 30,
    'suspicious_ip': 20,
    'repeated_clicks': 25,
    'no_user_agent': 15,
    'no_referer': 10,
  };

  flags.forEach(flag => {
    score += weights[flag] || 10;
  });

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Comprehensive fraud check for a click event
 */
export async function checkClickFraud(
  ip: string,
  userAgent: string,
  referer: string,
  applicationId: string
): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let reason = '';

  // 1. Rate limiting check (10 clicks per minute per IP)
  const recentClicks = await getRecentClickCount(ip);
  if (recentClicks >= 10) {
    flags.push('rate_limit_exceeded');
    reason = `IP ${ip} exceeded rate limit (${recentClicks} clicks in last minute)`;
  }

  // 2. Bot detection
  if (isBotUserAgent(userAgent)) {
    flags.push('bot_user_agent');
    if (!reason) reason = `Bot user agent detected: ${userAgent}`;
  }

  // 3. Missing user agent (highly suspicious)
  if (!userAgent || userAgent.trim() === '') {
    flags.push('no_user_agent');
    if (!reason) reason = 'No user agent provided';
  }

  // 4. Suspicious IP patterns
  if (isSuspiciousIP(ip)) {
    flags.push('suspicious_ip');
    if (!reason) reason = `Suspicious IP pattern: ${ip}`;
  }

  // 5. Missing referer (slightly suspicious)
  if (!referer || referer.trim() === '') {
    flags.push('no_referer');
  }

  // 6. Repeated clicks from same IP to same application
  const sameIPClicks = await getSameIPApplicationClicks(ip, applicationId);
  if (sameIPClicks >= 5) {
    flags.push('repeated_clicks');
    if (!reason) reason = `Same IP clicked same link ${sameIPClicks} times in last hour`;
  }

  // Calculate fraud score
  const fraudScore = calculateFraudScore(flags);

  // Determine if click is valid (fraud score threshold: 50)
  const isValid = fraudScore < 50;

  return {
    isValid,
    fraudScore,
    reason: reason || undefined,
    flags,
  };
}

/**
 * Log fraud detection to console (for admin monitoring)
 */
export function logFraudDetection(
  trackingCode: string,
  ip: string,
  result: FraudCheckResult
): void {
  console.log('[FRAUD DETECTION]', {
    timestamp: new Date().toISOString(),
    trackingCode,
    ip,
    fraudScore: result.fraudScore,
    isValid: result.isValid,
    reason: result.reason,
    flags: result.flags,
  });
}

/**
 * Get fraud statistics (for admin dashboard)
 */
export async function getFraudStats(days: number = 7): Promise<{
  totalClicks: number;
  flaggedClicks: number;
  blockedClicks: number;
  fraudRate: number;
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get total clicks in period
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clickEvents)
    .where(gte(clickEvents.timestamp, startDate));

  const totalClicks = totalResult[0]?.count || 0;

  // In a production system, we'd track fraud flags in the clickEvents table
  // For now, return placeholder data
  return {
    totalClicks,
    flaggedClicks: 0,
    blockedClicks: 0,
    fraudRate: 0,
  };
}

/**
 * Clean up old click events (data retention policy)
 * Remove clicks older than 90 days to comply with GDPR
 */
export async function cleanupOldClickEvents(days: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(clickEvents)
    .where(sql`${clickEvents.timestamp} < ${cutoffDate}`)
    .returning({ id: clickEvents.id });

  return result.length;
}
