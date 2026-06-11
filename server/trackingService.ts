/**
 * Tracking Service - Handles conversion tracking via multiple methods
 *
 * Methods supported:
 * 1. Postback URL (Server-to-server) - Most secure, recommended for SaaS/Apps
 * 2. Tracking Pixel - Easy integration for websites
 * 3. JavaScript Snippet - Full-featured client-side tracking
 */

import crypto from 'crypto';

// Secret key for HMAC signature validation (should be in env vars in production)
const TRACKING_SECRET = process.env.TRACKING_SECRET || 'affiliate-xchange-tracking-secret-key-2024';

// Conversion event types
export type ConversionEventType = 'sale' | 'lead' | 'click' | 'signup' | 'install' | 'custom';

export interface PostbackConversion {
  trackingCode: string;
  eventType: ConversionEventType;
  saleAmount?: number;
  currency?: string;
  orderId?: string;
  customData?: Record<string, any>;
  timestamp?: number;
  signature?: string;
}

export interface ConversionResult {
  success: boolean;
  message: string;
  conversionId?: string;
  earnings?: number;
}

/**
 * Generate HMAC signature for postback URL validation
 * Companies use this to sign their postback requests
 */
export function generatePostbackSignature(
  trackingCode: string,
  eventType: string,
  saleAmount: number | undefined,
  timestamp: number,
  secretKey: string = TRACKING_SECRET
): string {
  const dataToSign = `${trackingCode}:${eventType}:${saleAmount || 0}:${timestamp}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('hex');
}

/**
 * Validate postback signature
 */
export function validatePostbackSignature(
  trackingCode: string,
  eventType: string,
  saleAmount: number | undefined,
  timestamp: number,
  providedSignature: string,
  secretKey: string = TRACKING_SECRET
): boolean {
  const expectedSignature = generatePostbackSignature(trackingCode, eventType, saleAmount, timestamp, secretKey);

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Check if timestamp is within valid window (5 minutes)
 */
export function isTimestampValid(timestamp: number, windowMinutes: number = 5): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= windowMinutes * 60 * 1000;
}

/**
 * Generate a unique conversion ID
 */
export function generateConversionId(): string {
  return `conv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate short tracking code (8 alphanumeric characters)
 */
export function generateShortTrackingCode(): string {
  // Use base62 (alphanumeric) for URL-friendly codes
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate API key for company to use in postbacks
 */
export function generateCompanyApiKey(companyId: string): string {
  const data = `${companyId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Generate 1x1 transparent GIF for pixel tracking
 */
export function getTransparentPixel(): Buffer {
  // 1x1 transparent GIF
  return Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x01, 0x00, 0x01, 0x00,             // 1x1 dimensions
    0x80, 0x00, 0x00,                   // Global color table flag
    0xff, 0xff, 0xff,                   // White
    0x00, 0x00, 0x00,                   // Black
    0x21, 0xf9, 0x04,                   // Graphic control extension
    0x01, 0x00, 0x00, 0x00, 0x00,       // Transparent
    0x2c, 0x00, 0x00, 0x00, 0x00,       // Image descriptor
    0x01, 0x00, 0x01, 0x00, 0x00,       // Image dimensions
    0x02, 0x02, 0x44, 0x01, 0x00, 0x3b // Image data
  ]);
}

/**
 * Generate JavaScript tracking snippet for companies
 */
export function generateTrackingSnippet(companyId: string, apiKey: string, baseUrl: string): string {
  return `<!-- AffiliateXchange Tracking Snippet -->
<script>
(function() {
  var AX = window.AffiliateXchange = window.AffiliateXchange || {};
  AX.companyId = '${companyId}';
  AX.apiKey = '${apiKey}';
  AX.baseUrl = '${baseUrl}';

  // Get tracking code from URL or cookie
  AX.getTrackingCode = function() {
    var urlParams = new URLSearchParams(window.location.search);
    var code = urlParams.get('ax_ref') || urlParams.get('ref');
    if (code) {
      // Store in cookie for attribution window
      document.cookie = 'ax_tracking=' + code + '; max-age=' + (30 * 24 * 60 * 60) + '; path=/';
      return code;
    }
    // Try to get from cookie
    var match = document.cookie.match(/ax_tracking=([^;]+)/);
    return match ? match[1] : null;
  };

  // Track conversion
  AX.trackConversion = function(eventType, data) {
    var trackingCode = AX.getTrackingCode();
    if (!trackingCode) {
      console.warn('[AffiliateXchange] No tracking code found');
      return;
    }

    var payload = {
      trackingCode: trackingCode,
      eventType: eventType || 'sale',
      saleAmount: data && data.amount,
      currency: data && data.currency || 'USD',
      orderId: data && data.orderId,
      timestamp: Date.now()
    };

    // Generate signature
    var sig = AX.sign(payload);
    payload.signature = sig;

    // Send conversion
    fetch(AX.baseUrl + '/api/tracking/postback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AX.apiKey
      },
      body: JSON.stringify(payload)
    }).then(function(r) { return r.json(); })
      .then(function(result) {
        console.log('[AffiliateXchange] Conversion tracked:', result);
      }).catch(function(err) {
        console.error('[AffiliateXchange] Error:', err);
      });
  };

  // Simple client-side signature (for basic validation)
  AX.sign = function(payload) {
    // Note: For production, signature should be generated server-side
    var data = payload.trackingCode + ':' + payload.eventType + ':' + (payload.saleAmount || 0) + ':' + payload.timestamp;
    // This is a placeholder - real signature should come from your server
    return 'client_' + btoa(data).substring(0, 16);
  };

  // Auto-detect conversion on thank-you pages
  AX.autoTrack = function() {
    var isThankYouPage = /thank|success|confirmation|complete/i.test(window.location.pathname);
    if (isThankYouPage) {
      console.log('[AffiliateXchange] Thank you page detected, tracking conversion');
      AX.trackConversion('sale');
    }
  };

  // Initialize
  AX.getTrackingCode();
})();
</script>
<!-- End AffiliateXchange Tracking Snippet -->`;
}

/**
 * Generate server-side postback URL example
 */
export function generatePostbackUrlExample(baseUrl: string): string {
  return `
# AffiliateXchange Postback URL Integration Guide

## Postback URL Format
POST ${baseUrl}/api/tracking/postback

## Request Headers
Content-Type: application/json
X-API-Key: YOUR_API_KEY

## Request Body
{
  "trackingCode": "AB12CD34",
  "eventType": "sale",        // sale, lead, click, signup, install, custom
  "saleAmount": 99.99,        // Required for per_sale commissions
  "currency": "USD",          // Optional, defaults to USD
  "orderId": "ORDER-12345",   // Optional, for your reference
  "timestamp": 1701234567890, // Unix timestamp in milliseconds
  "signature": "abc123..."    // HMAC-SHA256 signature
}

## Generating Signature (Node.js Example)
const crypto = require('crypto');

function generateSignature(trackingCode, eventType, saleAmount, timestamp, secretKey) {
  const data = \`\${trackingCode}:\${eventType}:\${saleAmount || 0}:\${timestamp}\`;
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

## PHP Example
function generateSignature($trackingCode, $eventType, $saleAmount, $timestamp, $secretKey) {
  $data = "{$trackingCode}:{$eventType}:" . ($saleAmount ?? 0) . ":{$timestamp}";
  return hash_hmac('sha256', $data, $secretKey);
}

## Response
{
  "success": true,
  "message": "Conversion recorded successfully",
  "conversionId": "conv_1701234567890_abc123",
  "earnings": 19.99
}
`;
}

export default {
  generatePostbackSignature,
  validatePostbackSignature,
  isTimestampValid,
  generateConversionId,
  generateShortTrackingCode,
  generateCompanyApiKey,
  getTransparentPixel,
  generateTrackingSnippet,
  generatePostbackUrlExample,
};
