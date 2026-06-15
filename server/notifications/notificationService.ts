// Notification service for AFFEXCH.
//
// Email sending was removed in Phase 6.5 (per boss directive: disconnect Stripe
// + email + similar integrations so no AFFEXCH activity is visible on the
// legacy AffiliateXchange mailer dashboard).
//
// What this service still does:
//   - In-app notifications (DB-stored, surfaced via the bell icon)
//   - Web Push (browser push API, doesn't touch any external SaaS)
//
// What it no longer does:
//   - SendGrid email
//   - Custom email templates from the DB
//   - email_verification / password_reset / *_otp emails
//
// `sendEmailNotification(...)` is intentionally kept as a no-op stub so existing
// callsites continue to compile; they'll be cleaned up in a follow-up pass.

import webpush from 'web-push';
import type { DatabaseStorage } from '../storage';
import type { InsertNotification, UserNotificationPreferences } from '../../shared/schema';
// affexchFlags module was removed alongside the legacy payment integrations.
// Email and admin-notification disabling is now hard-coded.
const affexchFlags = { disableEmails: true, disableAdminNotifications: true };

let webPushConfigured = false;

if (affexchFlags.disableEmails) {
  console.log('[Notifications] AFFEXCH_DISABLE_EMAILS=true — Web Push also suppressed');
} else if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:notifications@affexch.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  webPushConfigured = true;
  console.log('[Notifications] Web Push configured successfully');
} else {
  console.warn('[Notifications] VAPID keys not found - push notifications disabled');
}

export type NotificationType =
  | 'application_status_change'
  | 'new_message'
  | 'payment_received'
  | 'payment_pending'
  | 'payment_approved'
  | 'payment_disputed'
  | 'payment_dispute_resolved'
  | 'payment_refunded'
  | 'payment_failed_insufficient_funds'
  | 'offer_approved'
  | 'offer_rejected'
  | 'offer_edit_requested'
  | 'offer_removed'
  | 'offer_delete_requested'
  | 'offer_delete_approved'
  | 'offer_delete_rejected'
  | 'offer_suspend_requested'
  | 'offer_suspend_approved'
  | 'offer_suspend_rejected'
  | 'new_application'
  | 'review_received'
  | 'system_announcement'
  | 'registration_approved'
  | 'registration_rejected'
  | 'work_completion_approval'
  | 'priority_listing_expiring'
  | 'deliverable_rejected'
  | 'deliverable_submitted'
  | 'deliverable_resubmitted'
  | 'revision_requested'
  | 'email_verification'
  | 'password_reset'
  | 'account_deletion_otp'
  | 'password_change_otp'
  | 'content_flagged'
  | 'high_risk_company'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_expired'
  | 'wallet_credited'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_failed';

interface NotificationData {
  userName?: string;
  userEmail?: string;
  companyName?: string;
  companyUserId?: string;
  offerTitle?: string;
  applicationId?: string;
  offerId?: string;
  conversationId?: string;
  messageId?: string;
  reviewId?: string;
  contractId?: string;
  deliverableId?: string;
  paymentId?: string;
  trackingLink?: string;
  trackingCode?: string;
  amount?: string;
  invoiceNumber?: string;
  grossAmount?: string;
  platformFee?: string;
  processingFee?: string;
  platformFeePercentage?: string;
  processingFeePercentage?: string;
  transactionId?: string;
  reviewRating?: number;
  reviewText?: string;
  messagePreview?: string;
  daysUntilExpiration?: number;
  linkUrl?: string;
  applicationStatus?: string;
  announcementTitle?: string;
  announcementMessage?: string;
  contractTitle?: string;
  reason?: string;
  revisionInstructions?: string;
  verificationUrl?: string;
  resetUrl?: string;
  otpCode?: string;
  contentType?: string;
  contentId?: string;
  matchedKeywords?: string[];
  reviewStatus?: string;
  actionTaken?: string;
  companyId?: string;
  riskScore?: number;
  riskLevel?: string;
  riskIndicators?: string[];
  monthNumber?: number;
  videoNumber?: number;
  creatorName?: string;
}

export class NotificationService {
  constructor(private storage: DatabaseStorage) {}

  /**
   * Generate the correct linkUrl based on notification type and metadata
   * This ensures clicking a notification takes the user to the right page
   */
  private generateLinkUrl(type: NotificationType, data: NotificationData, userRole: 'creator' | 'company' | 'admin' | 'merchant'): string {
    if (data.linkUrl) return data.linkUrl;

    switch (type) {
      case 'application_status_change':
        if (data.applicationId) return `/applications/${data.applicationId}`;
        return '/applications';
      case 'new_application':
        if (userRole === 'admin') {
          if (data.offerId) return `/admin/offers?highlight=${data.offerId}`;
          return '/admin/offers';
        }
        if (data.applicationId) return `/company/applications?highlight=${data.applicationId}`;
        return '/company/applications';
      case 'new_message':
        if (data.conversationId) {
          return userRole === 'company'
            ? `/company/messages/${data.conversationId}`
            : `/messages/${data.conversationId}`;
        }
        if (data.applicationId) {
          return userRole === 'company'
            ? `/company/messages?application=${data.applicationId}`
            : `/messages?application=${data.applicationId}`;
        }
        return userRole === 'company' ? '/company/messages' : '/messages';
      case 'offer_approved':
      case 'offer_rejected':
      case 'offer_delete_approved':
      case 'offer_delete_rejected':
      case 'offer_suspend_approved':
      case 'offer_suspend_rejected':
        if (data.offerId) return `/company/offers/${data.offerId}`;
        return '/company/offers';
      case 'offer_delete_requested':
      case 'offer_suspend_requested':
        if (data.offerId) return `/admin-offer-detail/${data.offerId}`;
        return '/admin/offers';
      case 'review_received':
        if (data.reviewId) return `/company/reviews?highlight=${data.reviewId}`;
        return '/company/reviews';
      case 'registration_approved':
        return userRole === 'company' ? '/company/dashboard' : '/creator/dashboard';
      case 'registration_rejected':
        return '/';
      case 'priority_listing_expiring':
        if (data.offerId) return `/company/offers/${data.offerId}?tab=priority`;
        return '/company/offers';
      case 'deliverable_rejected':
      case 'deliverable_submitted':
      case 'deliverable_resubmitted':
      case 'revision_requested':
        if (data.contractId && data.deliverableId) {
          return `/retainer-contracts/${data.contractId}/deliverables/${data.deliverableId}`;
        }
        if (data.contractId) return `/retainer-contracts/${data.contractId}`;
        return '/retainer-contracts';
      case 'system_announcement':
        return data.linkUrl || '/';
      case 'content_flagged':
        return '/notifications';
      case 'high_risk_company':
        if (data.companyId) return `/admin/companies/${data.companyId}`;
        return '/admin/companies';
      default:
        if (userRole === 'company') return '/company/dashboard';
        if (userRole === 'creator') return '/creator/dashboard';
        return '/';
    }
  }

  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData = {}
  ): Promise<void> {
    try {
      // Suppress admin-targeted in-app notifications during isolation so old
      // admin accounts (admin@affiliatexchange.ca) don't see AFFEXCH activity.
      if (affexchFlags.disableAdminNotifications) {
        const user = await this.storage.getUserById(userId);
        if (user?.role === 'admin') {
          console.log(`[AFFEXCH] suppressed admin notification user=${userId} type=${type}`);
          return;
        }
      }

      const preferences = await this.storage.getUserNotificationPreferences(userId);
      const user = await this.storage.getUserById(userId);
      if (!user) {
        console.error(`[Notifications] User ${userId} not found`);
        return;
      }

      data.userName = data.userName || user.firstName || user.username;
      data.userEmail = data.userEmail || user.email;

      const linkUrl = this.generateLinkUrl(type, data, user.role as any);

      if (preferences?.inAppNotifications !== false) {
        await this.sendInAppNotification(userId, type, title, message, linkUrl, data);
      }

      if (preferences?.pushNotifications !== false && this.shouldSendPush(type, preferences)) {
        await this.sendPushNotification(preferences, title, message, { ...data, linkUrl });
      }
    } catch (error) {
      console.error('[Notifications] Error sending notification:', error);
    }
  }

  private async sendInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    linkUrl: string,
    data: NotificationData
  ): Promise<void> {
    try {
      const notification: InsertNotification = {
        userId,
        type,
        title,
        message,
        linkUrl,
        metadata: data,
        isRead: false,
      };
      await this.storage.createNotification(notification);
    } catch (error) {
      console.error('[Notifications] Error creating in-app notification:', error);
    }
  }

  /**
   * No-op stub. Email sending was removed in Phase 6.5.
   * Callsites are preserved temporarily so the build doesn't break; they'll be
   * pruned in the follow-up callsite cleanup pass.
   */
  async sendEmailNotification(
    email: string,
    type: NotificationType,
    _data: NotificationData
  ): Promise<void> {
    console.log(`[Notifications] (no-op) email type=${type} to=${email} — email integration removed`);
  }

  private async sendPushNotification(
    preferences: UserNotificationPreferences | null,
    title: string,
    message: string,
    data: NotificationData
  ): Promise<void> {
    if (!webPushConfigured) return;
    if (!preferences?.pushSubscription) return;

    try {
      const payload = JSON.stringify({
        title,
        body: message,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: { url: data.linkUrl || '/' },
      });
      await webpush.sendNotification(
        preferences.pushSubscription as webpush.PushSubscription,
        payload
      );
    } catch (error) {
      console.error('[Notifications] Error sending push notification:', error);
      if ((error as any)?.statusCode === 410 || (error as any)?.statusCode === 404) {
        await this.storage.updateUserNotificationPreferences(preferences.userId, {
          pushSubscription: null,
        });
      }
    }
  }

  private shouldSendPush(type: NotificationType, preferences: UserNotificationPreferences | null): boolean {
    if (!preferences) return true;
    switch (type) {
      case 'application_status_change':
        return preferences.pushApplicationStatus;
      case 'new_message':
        return preferences.pushNewMessage;
      case 'payment_received':
      case 'payment_approved':
      case 'payment_pending':
      case 'payment_disputed':
      case 'payment_dispute_resolved':
      case 'payment_refunded':
      case 'payment_failed_insufficient_funds':
      case 'work_completion_approval':
        return preferences.pushPayment;
      default:
        return true;
    }
  }

  async broadcastSystemAnnouncement(
    title: string,
    message: string,
    linkUrl?: string,
    targetRole?: 'creator' | 'company' | 'admin'
  ): Promise<void> {
    try {
      const users = await this.storage.getAllUsers();
      const filteredUsers = targetRole
        ? users.filter((user) => user.role === targetRole)
        : users;

      for (const user of filteredUsers) {
        await this.sendNotification(
          user.id,
          'system_announcement',
          title,
          message,
          { linkUrl, announcementTitle: title, announcementMessage: message }
        );
      }
    } catch (error) {
      console.error('[Notifications] Error broadcasting system announcement:', error);
    }
  }
}
