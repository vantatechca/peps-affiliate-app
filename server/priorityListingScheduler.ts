// Priority Listing Scheduler
// Automatically expires priority listings and sends expiration notifications

import { storage } from "./storage";
import type { NotificationService } from "./notifications/notificationService";
import { db } from "./db";
import { offers } from "../shared/schema";
import { lt, and, eq, isNotNull } from "drizzle-orm";

export class PriorityListingScheduler {
  constructor(private notificationService: NotificationService) {}

  /**
   * Process expired priority listings
   * This should be called daily via a cron job
   */
  async processExpiredPriorityListings(): Promise<{
    expired: number;
    notified: number;
    errors: Array<{ offerId: string; error: string }>;
  }> {
    console.log('[Priority Listing Scheduler] Starting expiration check...');

    const results = {
      expired: 0,
      notified: 0,
      errors: [] as Array<{ offerId: string; error: string }>,
    };

    try {
      const now = new Date();

      // Find all offers with expired priority listings
      const expiredOffers = await db
        .select()
        .from(offers)
        .where(
          and(
            isNotNull(offers.priorityExpiresAt),
            lt(offers.priorityExpiresAt, now),
            eq(offers.featuredOnHomepage, true)
          )
        );

      console.log(`[Priority Listing Scheduler] Found ${expiredOffers.length} expired priority listings`);

      for (const offer of expiredOffers) {
        try {
          // Disable featured status
          await db
            .update(offers)
            .set({
              featuredOnHomepage: false,
              updatedAt: now,
            })
            .where(eq(offers.id, offer.id));

          results.expired++;

          // Get company profile to send notification
          const company = await storage.getCompanyProfileById(offer.companyId);

          if (company && company.userId) {
            // Send expiration notification
            await this.notificationService.sendNotification(
              company.userId,
              'priority_listing_expiring',
              'Priority Listing Expired',
              `Your priority listing for "${offer.title}" has expired. Renew now to keep your offer featured.`,
              {
                linkUrl: `/company/offers/${offer.id}`,
                offerId: offer.id,
                offerTitle: offer.title,
              }
            );

            results.notified++;
          }

          console.log(`[Priority Listing Scheduler] Expired priority listing for offer ${offer.id}`);
        } catch (error: any) {
          console.error(`[Priority Listing Scheduler] Error processing offer ${offer.id}:`, error);
          results.errors.push({
            offerId: offer.id,
            error: error.message,
          });
        }
      }

      console.log(`[Priority Listing Scheduler] Expiration processing complete:`, results);
      return results;
    } catch (error: any) {
      console.error('[Priority Listing Scheduler] Fatal error during expiration processing:', error);
      throw error;
    }
  }

  /**
   * Send reminder notifications for priority listings expiring soon (7 days)
   */
  async sendExpirationReminders(): Promise<{
    reminded: number;
    errors: Array<{ offerId: string; error: string }>;
  }> {
    console.log('[Priority Listing Scheduler] Checking for expiring priority listings...');

    const results = {
      reminded: 0,
      errors: [] as Array<{ offerId: string; error: string }>,
    };

    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Find all offers with priority listings expiring in the next 7 days
      const expiringOffers = await db
        .select()
        .from(offers)
        .where(
          and(
            isNotNull(offers.priorityExpiresAt),
            lt(offers.priorityExpiresAt, sevenDaysFromNow),
            eq(offers.featuredOnHomepage, true)
          )
        );

      console.log(`[Priority Listing Scheduler] Found ${expiringOffers.length} priority listings expiring soon`);

      for (const offer of expiringOffers) {
        try {
          // Calculate days until expiration
          const expiresAt = new Date(offer.priorityExpiresAt!);
          const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          // Only send reminder if expiring in 1-7 days
          if (daysUntilExpiration < 1 || daysUntilExpiration > 7) {
            continue;
          }

          // Get company profile to send notification
          const company = await storage.getCompanyProfileById(offer.companyId);

          if (company && company.userId) {
            // Send reminder notification
            await this.notificationService.sendNotification(
              company.userId,
              'priority_listing_expiring',
              'Priority Listing Expiring Soon',
              `Your priority listing for "${offer.title}" expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}. Renew now to maintain your featured placement.`,
              {
                linkUrl: `/company/offers/${offer.id}`,
                offerId: offer.id,
                offerTitle: offer.title,
                daysUntilExpiration: daysUntilExpiration,
              }
            );

            results.reminded++;
          }

          console.log(`[Priority Listing Scheduler] Sent reminder for offer ${offer.id} (expires in ${daysUntilExpiration} days)`);
        } catch (error: any) {
          console.error(`[Priority Listing Scheduler] Error sending reminder for offer ${offer.id}:`, error);
          results.errors.push({
            offerId: offer.id,
            error: error.message,
          });
        }
      }

      console.log(`[Priority Listing Scheduler] Reminder processing complete:`, results);
      return results;
    } catch (error: any) {
      console.error('[Priority Listing Scheduler] Fatal error during reminder processing:', error);
      throw error;
    }
  }

  /**
   * Run all scheduled tasks
   */
  async runScheduledTasks(): Promise<void> {
    console.log('[Priority Listing Scheduler] Running scheduled tasks...');

    try {
      // Process expired listings
      await this.processExpiredPriorityListings();

      // Send expiration reminders
      await this.sendExpirationReminders();

      console.log('[Priority Listing Scheduler] All scheduled tasks completed');
    } catch (error: any) {
      console.error('[Priority Listing Scheduler] Error running scheduled tasks:', error);
      throw error;
    }
  }
}
