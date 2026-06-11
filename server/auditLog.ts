import { db } from "./db";
import { auditLogs, type InsertAuditLog } from "../shared/schema";
import type { Request } from "express";

/**
 * Audit Log Service
 * Tracks all admin actions for compliance and security
 */

interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, any>;
  reason?: string;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAuditAction(
  userId: string,
  data: AuditLogData,
  req?: Request
): Promise<void> {
  try {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req?.headers['user-agent'] || 'unknown';

    await db.insert(auditLogs).values({
      userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes as any,
      reason: data.reason,
      ipAddress,
      userAgent,
    });

    console.log(`[Audit] ${data.action} on ${data.entityType} ${data.entityId || ''} by user ${userId}`);
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Common admin actions for easy reference
 */
export const AuditActions = {
  // Company actions
  APPROVE_COMPANY: 'approve_company',
  REJECT_COMPANY: 'reject_company',
  SUSPEND_COMPANY: 'suspend_company',

  // Offer actions
  APPROVE_OFFER: 'approve_offer',
  REJECT_OFFER: 'reject_offer',
  PAUSE_OFFER: 'pause_offer',
  ARCHIVE_OFFER: 'archive_offer',

  // User actions
  SUSPEND_USER: 'suspend_user',
  BAN_USER: 'ban_user',
  ACTIVATE_USER: 'activate_user',
  CHANGE_USER_ROLE: 'change_user_role',

  // Payment actions
  APPROVE_PAYMENT: 'approve_payment',
  REJECT_PAYMENT: 'reject_payment',
  REFUND_PAYMENT: 'refund_payment',
  RESOLVE_PAYMENT_DISPUTE: 'resolve_payment_dispute',

  // Review actions
  APPROVE_REVIEW: 'approve_review',
  HIDE_REVIEW: 'hide_review',
  DELETE_REVIEW: 'delete_review',

  // Settings actions
  UPDATE_PLATFORM_SETTINGS: 'update_platform_settings',
  ENABLE_MAINTENANCE_MODE: 'enable_maintenance_mode',
  DISABLE_MAINTENANCE_MODE: 'disable_maintenance_mode',

  // Niche actions
  CREATE_NICHE: 'create_niche',
  UPDATE_NICHE: 'update_niche',
  DELETE_NICHE: 'delete_niche',
  REORDER_NICHES: 'reorder_niches',
  SET_PRIMARY_NICHE: 'set_primary_niche',
  MERGE_NICHES: 'merge_niches',

  // Email Template actions
  CREATE_EMAIL_TEMPLATE: 'create_email_template',
  UPDATE_EMAIL_TEMPLATE: 'update_email_template',
  DELETE_EMAIL_TEMPLATE: 'delete_email_template',
  DUPLICATE_EMAIL_TEMPLATE: 'duplicate_email_template',
} as const;

/**
 * Entity types for audit logging
 */
export const EntityTypes = {
  COMPANY: 'company',
  OFFER: 'offer',
  USER: 'user',
  PAYMENT: 'payment',
  REVIEW: 'review',
  APPLICATION: 'application',
  PLATFORM_SETTINGS: 'platform_settings',
  NICHE: 'niche',
  EMAIL_TEMPLATE: 'email_template',
} as const;
