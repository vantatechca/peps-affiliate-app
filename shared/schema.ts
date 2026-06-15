import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
// 'company' is kept in the enum only because Postgres can't drop enum values
// easily. No live code creates users with role='company' anymore.
export const userRoleEnum = pgEnum('user_role', ['creator', 'company', 'admin', 'merchant']);
export const userAccountStatusEnum = pgEnum('user_account_status', ['active', 'suspended', 'banned']);
export const companyStatusEnum = pgEnum('company_status', ['pending', 'approved', 'rejected', 'suspended']);
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'pending_review', 'approved', 'paused', 'archived']);
export const commissionTypeEnum = pgEnum('commission_type', ['per_sale', 'per_lead', 'per_click', 'monthly_retainer', 'hybrid', 'promo_code']);
// AFFEXCH peptide pivot: cross-niche creator tier driven by approved content_links count (0/1/5/10/20 thresholds)
export const affiliateTierEnum = pgEnum('affiliate_tier', ['pending', 'verified', 'silver', 'gold', 'elite']);
export const promoCodeStatusEnum = pgEnum('promo_code_status', ['active', 'paused', 'revoked']);
export const contentLinkStatusEnum = pgEnum('content_link_status', ['pending', 'approved', 'rejected']);
export const applicationStatusEnum = pgEnum('application_status', [
  'pending',
  'approved',
  'active',
  'paused',
  'completed',
  'rejected',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'application_status_change',
  'new_message',
  'payment_received',
  'payment_pending',
  'payment_approved',
  'payment_disputed',
  'payment_dispute_resolved',
  'payment_refunded',
  'payment_failed_insufficient_funds',
  'offer_approved',
  'offer_rejected',
  'offer_edit_requested',
  'offer_removed',
  'offer_delete_requested',
  'offer_delete_approved',
  'offer_delete_rejected',
  'offer_suspend_requested',
  'offer_suspend_approved',
  'offer_suspend_rejected',
  'new_application',
  'review_received',
  'system_announcement',
  'registration_approved',
  'registration_rejected',
  'work_completion_approval',
  'priority_listing_expiring',
  'deliverable_rejected',
  'deliverable_submitted',
  'deliverable_resubmitted',
  'revision_requested',
  'email_verification',
  'password_reset',
  'content_flagged',
  'high_risk_company',
  'account_deletion_otp',
  'password_change_otp',
  'invoice_sent',
  'invoice_paid',
  'invoice_expired',
  'wallet_credited',
  'withdrawal_requested',
  'withdrawal_completed',
  'withdrawal_failed'
]);
export const offerPendingActionEnum = pgEnum('offer_pending_action', ['delete', 'suspend']);
export const affiliateOrderStatusEnum = pgEnum('affiliate_order_status', ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'returned', 'refunded']);

// DEPRECATED enum stubs — the cleanup migration dropped these from the DB
// but the corresponding (now-dropped or dead-partial) tables still reference
// them. Stubs are typed `any` so they compose without TS errors.
export const payoutMethodEnum: any = pgEnum('__deprecated_payout_method', ['etransfer', 'wire', 'paypal', 'crypto']);
export const paymentStatusEnum: any = pgEnum('__deprecated_payment_status', ['pending', 'processing', 'completed', 'failed', 'refunded']);
export const invoiceStatusEnum: any = pgEnum('__deprecated_invoice_status', ['draft', 'sent', 'paid', 'cancelled', 'expired', 'refunded']);
export const walletTransactionTypeEnum: any = pgEnum('__deprecated_wallet_transaction_type', ['credit', 'debit', 'withdrawal', 'refund', 'adjustment']);
export const withdrawalStatusEnum: any = pgEnum('__deprecated_withdrawal_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);
export const retainerStatusEnum: any = pgEnum('__deprecated_retainer_status', ['open', 'in_progress', 'completed', 'cancelled', 'paused']);
export const retainerApplicationStatusEnum: any = pgEnum('__deprecated_retainer_application_status', ['pending', 'approved', 'rejected']);
export const deliverableStatusEnum: any = pgEnum('__deprecated_deliverable_status', ['pending_review', 'approved', 'revision_requested', 'rejected']);
export const emailTemplateCategoryEnum: any = pgEnum('__deprecated_email_template_category', ['application', 'payment', 'offer', 'company', 'system', 'moderation', 'authentication']);
export const keywordCategoryEnum: any = pgEnum('__deprecated_keyword_category', ['profanity', 'spam', 'legal', 'harassment', 'custom']);
export const contentTypeEnum: any = pgEnum('__deprecated_content_type', ['message', 'review']);
export const flagStatusEnum: any = pgEnum('__deprecated_flag_status', ['pending', 'reviewed', 'dismissed', 'action_taken']);

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
// CUTOVER: mapped to the OLD shared "User" table. DB column names match the
// old Prisma camelCase + the additive columns from migrations/old-db-prep.
// `password` reuses the old `passwordHash`; `role` holds the old enum values
// (AFFILIATE/ADMIN/SUPER_ADMIN) — mapped to app roles in app code.
export const users = pgTable("User", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("passwordHash"),
  googleId: varchar("googleId").unique(),
  firstName: varchar("firstName"),
  lastName: varchar("lastName"),
  profileImageUrl: varchar("profileImageUrl"),
  role: varchar("role").notNull().default('AFFILIATE'),
  accountStatus: varchar("accountStatus").notNull().default('active'),
  emailVerified: boolean("emailVerified").notNull().default(false),
  emailVerificationToken: varchar("emailVerificationToken"),
  emailVerificationTokenExpiry: timestamp("emailVerificationTokenExpiry"),
  passwordResetToken: varchar("passwordResetToken"),
  passwordResetTokenExpiry: timestamp("passwordResetTokenExpiry"),
  accountDeletionOtp: varchar("accountDeletionOtp"),
  accountDeletionOtpExpiry: timestamp("accountDeletionOtpExpiry"),
  passwordChangeOtp: varchar("passwordChangeOtp"),
  passwordChangeOtpExpiry: timestamp("passwordChangeOtpExpiry"),
  // Two-Factor Authentication fields
  twoFactorSecret: varchar("twoFactorSecret", { length: 64 }),
  twoFactorEnabled: boolean("twoFactorEnabled").notNull().default(false),
  twoFactorBackupCodes: text("twoFactorBackupCodes"), // JSON array of hashed backup codes
  // Terms and Privacy acceptance
  tosAcceptedAt: timestamp("tosAcceptedAt"),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  // Cookie consent
  cookieConsentAt: timestamp("cookieConsentAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  creatorProfile: one(creatorProfiles, {
    fields: [users.id],
    references: [creatorProfiles.userId],
  }),
  companyProfile: one(vendorProfiles, {
    fields: [users.id],
    references: [vendorProfiles.userId],
  }),
  applications: many(applications),
  messages: many(messages),
  reviews: many(reviews),
  favorites: many(favorites),
}));

// Social Account Platform Enum (kept — used by contentLinks table)
export const socialPlatformEnum = pgEnum('social_platform', ['youtube', 'tiktok', 'instagram']);

// Creator profiles
export const creatorProfiles = pgTable("creator_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  bio: text("bio"),
  youtubeUrl: varchar("youtube_url"),
  tiktokUrl: varchar("tiktok_url"),
  instagramUrl: varchar("instagram_url"),
  youtubeFollowers: integer("youtube_followers"),
  tiktokFollowers: integer("tiktok_followers"),
  instagramFollowers: integer("instagram_followers"),
  niches: text("niches").array().default(sql`ARRAY[]::text[]`),
  // AFFEXCH peptide pivot — see docs/AFFEXCH_SESSION_HANDOFF.md Phases 2-3
  affiliateTier: affiliateTierEnum("affiliate_tier").notNull().default('pending'),
  city: varchar("city"),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creatorProfilesRelations = relations(creatorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [creatorProfiles.userId],
    references: [users.id],
  }),
}));

// Website verification method enum
export const websiteVerificationMethodEnum = pgEnum('website_verification_method', ['meta_tag', 'dns_txt']);

// Company profiles
// Peptide vendor metadata. Originally named `company_profiles` when the
// `company` user role existed. The role was removed in the AFFEXCH revision —
// vendors no longer log in. This table is now pure metadata that admin
// maintains on behalf of the external vendor sites.
export const vendorProfiles = pgTable("vendor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  legalName: varchar("legal_name").notNull(),
  tradeName: varchar("trade_name"),
  industry: varchar("industry"),
  websiteUrl: varchar("website_url"),
  companySize: varchar("company_size"),
  yearFounded: integer("year_founded"),
  logoUrl: varchar("logo_url"),
  description: text("description"),
  contactName: varchar("contact_name"),
  contactJobTitle: varchar("contact_job_title"),
  phoneNumber: varchar("phone_number"),
  businessAddress: text("business_address"),
  // AFFEXCH peptide pivot — see docs/AFFEXCH_SESSION_HANDOFF.md Phase 5.
  // Used by GET /api/affiliate/offers?city=... to surface 4 closest peptide vendors.
  city: varchar("city"),
  country: varchar("country"),
  verificationDocumentUrl: varchar("verification_document_url"),
  linkedinUrl: varchar("linkedin_url"),
  twitterUrl: varchar("twitter_url"),
  facebookUrl: varchar("facebook_url"),
  instagramUrl: varchar("instagram_url"),
  // Website verification fields
  websiteVerificationToken: varchar("website_verification_token"),
  websiteVerified: boolean("website_verified").notNull().default(false),
  websiteVerificationMethod: websiteVerificationMethodEnum("website_verification_method"),
  websiteVerifiedAt: timestamp("website_verified_at"),
  // Per-company fee override (null means use default platform fee)
  customPlatformFeePercentage: decimal("custom_platform_fee_percentage", { precision: 5, scale: 4 }),
  // API key for postback/tracking integrations
  trackingApiKey: varchar("tracking_api_key", { length: 64 }),
  trackingApiKeyCreatedAt: timestamp("tracking_api_key_created_at"),
  // Rejection retry restriction
  lastRejectedAt: timestamp("last_rejected_at"),
  rejectionCount: integer("rejection_count").default(0),
  status: companyStatusEnum("status").notNull().default('pending'),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorProfilesRelations = relations(vendorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [vendorProfiles.userId],
    references: [users.id],
  }),
  offers: many(offers),
}));

// Offers
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // DB column was renamed company_id -> vendor_id in the cleanup migration,
  // but we keep the TS field name `companyId` for backward compat with the
  // dead-partial server endpoints that still reference it.
  companyId: varchar("vendor_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 100 }).notNull(),
  productName: varchar("product_name").notNull(),
  shortDescription: varchar("short_description", { length: 200 }).notNull(),
  fullDescription: text("full_description").notNull(),
  primaryNiche: varchar("primary_niche").notNull(),
  additionalNiches: text("additional_niches").array().default(sql`ARRAY[]::text[]`),
  productUrl: varchar("product_url").notNull(),
  featuredImageUrl: varchar("featured_image_url"),
  commissionType: commissionTypeEnum("commission_type").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }),
  cookieDuration: integer("cookie_duration"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  minimumPayout: decimal("minimum_payout", { precision: 10, scale: 2 }),
  retainerAmount: decimal("retainer_amount", { precision: 10, scale: 2 }),
  retainerDeliverables: jsonb("retainer_deliverables"),
  paymentSchedule: varchar("payment_schedule"),
  minimumFollowers: integer("minimum_followers"),
  allowedPlatforms: text("allowed_platforms").array().default(sql`ARRAY[]::text[]`),
  geographicRestrictions: text("geographic_restrictions").array().default(sql`ARRAY[]::text[]`),
  ageRestriction: varchar("age_restriction"),
  contentStyleRequirements: text("content_style_requirements"),
  brandSafetyRequirements: text("brand_safety_requirements"),
  customTerms: text("custom_terms"),
  creatorRequirements: text("creator_requirements"),
  status: offerStatusEnum("status").notNull().default('pending_review'),
  viewCount: integer("view_count").default(0),
  applicationCount: integer("application_count").default(0),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  featuredOnHomepage: boolean("featured_on_homepage").default(false),
  listingFee: decimal("listing_fee", { precision: 10, scale: 2 }).default('0'),
  editRequests: jsonb("edit_requests").default(sql`'[]'::jsonb`),
  priorityExpiresAt: timestamp("priority_expires_at"),
  priorityPurchasedAt: timestamp("priority_purchased_at"),
  exclusivityRequired: boolean("exclusivity_required").default(false),
  contentApprovalRequired: boolean("content_approval_required").default(false),
  pendingAction: offerPendingActionEnum("pending_action"),
  pendingActionRequestedAt: timestamp("pending_action_requested_at"),
  pendingActionReason: text("pending_action_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const offersRelations = relations(offers, ({ one, many }) => ({
  vendor: one(vendorProfiles, {
    fields: [offers.companyId],
    references: [vendorProfiles.id],
  }),
  applications: many(applications),
  favorites: many(favorites),
}));

// Applications
export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  message: text("message"),
  status: applicationStatusEnum("status").notNull().default('pending'),
  trackingLink: varchar("tracking_link"),
  trackingCode: varchar("tracking_code"),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  autoApprovalScheduledAt: timestamp("auto_approval_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  creator: one(users, {
    fields: [applications.creatorId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [applications.offerId],
    references: [offers.id],
  }),
  reviews: many(reviews),
  analytics: many(analytics),
}));

// Conversations
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  lastMessageAt: timestamp("last_message_at"),
  creatorUnreadCount: integer("creator_unread_count").default(0),
  companyUnreadCount: integer("company_unread_count").default(0),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  application: one(applications, {
    fields: [conversations.applicationId],
    references: [applications.id],
  }),
  creator: one(users, {
    fields: [conversations.creatorId],
    references: [users.id],
  }),
  company: one(vendorProfiles, {
    fields: [conversations.companyId],
    references: [vendorProfiles.id],
  }),
  messages: many(messages),
}));

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  isRead: boolean("is_read").default(false),
  deletedFor: text("deleted_for").array().default(sql`ARRAY[]::text[]`), // Array of user IDs who deleted "for me"
  senderType: varchar("sender_type", { length: 20 }).default("user"), // 'user' | 'platform' - platform messages are from admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  reviewText: text("review_text"),
  overallRating: integer("overall_rating").notNull(),
  paymentSpeedRating: integer("payment_speed_rating"),
  communicationRating: integer("communication_rating"),
  offerQualityRating: integer("offer_quality_rating"),
  supportRating: integer("support_rating"),
  companyResponse: text("company_response"),
  companyRespondedAt: timestamp("company_responded_at"),
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  respondedBy: varchar("responded_by").references(() => users.id, { onDelete: 'set null' }),
  isEdited: boolean("is_edited").default(false),
  adminNote: text("admin_note"),
  isApproved: boolean("is_approved").default(true),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  application: one(applications, {
    fields: [reviews.applicationId],
    references: [applications.id],
  }),
  creator: one(users, {
    fields: [reviews.creatorId],
    references: [users.id],
  }),
  company: one(vendorProfiles, {
    fields: [reviews.companyId],
    references: [vendorProfiles.id],
  }),
}));

// Favorites
export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favoritesRelations = relations(favorites, ({ one }) => ({
  creator: one(users, {
    fields: [favorites.creatorId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [favorites.offerId],
    references: [offers.id],
  }),
}));

// Saved Searches
export type SavedSearchFilters = {
  searchTerm?: string;
  selectedNiches?: string[];
  selectedCategories?: string[];
  commissionType?: string;
  commissionRange?: number[];
  minimumPayout?: number[];
  minRating?: number;
  showTrending?: boolean;
  showPriority?: boolean;
  sortBy?: string;
};

export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  filters: jsonb("filters").$type<SavedSearchFilters>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  creator: one(users, {
    fields: [savedSearches.creatorId],
    references: [users.id],
  }),
}));

// Analytics
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  clicks: integer("clicks").default(0),
  uniqueClicks: integer("unique_clicks").default(0),
  conversions: integer("conversions").default(0),
  earnings: decimal("earnings", { precision: 10, scale: 2 }).default('0'),
  earningsPaid: decimal("earnings_paid", { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analyticsRelations = relations(analytics, ({ one }) => ({
  application: one(applications, {
    fields: [analytics.applicationId],
    references: [applications.id],
  }),
}));

// Click Events
export const clickEvents = pgTable("click_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar("ip_address").notNull(),
  userAgent: text("user_agent"),
  referer: text("referer"),
  country: varchar("country"),
  city: varchar("city"),
  fraudScore: integer("fraud_score").default(0),
  fraudFlags: text("fraud_flags"),
  utmSource: varchar("utm_source"),
  utmMedium: varchar("utm_medium"),
  utmCampaign: varchar("utm_campaign"),
  utmTerm: varchar("utm_term"),
  utmContent: varchar("utm_content"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  application: one(applications, {
    fields: [clickEvents.applicationId],
    references: [applications.id],
  }),
}));

// Affiliate Sales - tracks individual sales made through affiliate links
export const affiliateSales = pgTable("affiliate_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: 'cascade' }),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),

  // External order info from the platform
  externalOrderId: varchar("external_order_id").notNull(),
  externalPlatform: varchar("external_platform"), // shopify, woocommerce, etc.

  // Order details
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  orderCurrency: varchar("order_currency", { length: 3 }).default('CAD'),
  itemName: varchar("item_name"),
  itemQuantity: integer("item_quantity").default(1),

  // Commission calculation
  commissionType: commissionTypeEnum("commission_type").notNull(),
  commissionRate: decimal("commission_rate", { precision: 10, scale: 2 }), // percentage or fixed amount
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),

  // Order status tracking
  orderStatus: affiliateOrderStatusEnum("order_status").notNull().default('pending'),
  statusHistory: jsonb("status_history").default(sql`'[]'::jsonb`), // [{status, timestamp, note}]

  // Waiting period for returns/cancellations (in days)
  holdPeriodDays: integer("hold_period_days").default(14),
  holdExpiresAt: timestamp("hold_expires_at"),

  // Payment tracking
  paymentId: varchar("payment_id"),
  commissionReleased: boolean("commission_released").default(false),
  commissionReleasedAt: timestamp("commission_released_at"),

  // Metadata
  customerEmail: varchar("customer_email"),
  trackingCode: varchar("tracking_code"), // the affiliate tracking code used
  clickEventId: varchar("click_event_id"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliateSalesRelations = relations(affiliateSales, ({ one }) => ({
  application: one(applications, {
    fields: [affiliateSales.applicationId],
    references: [applications.id],
  }),
  offer: one(offers, {
    fields: [affiliateSales.offerId],
    references: [offers.id],
  }),
  creator: one(users, {
    fields: [affiliateSales.creatorId],
    references: [users.id],
  }),
  company: one(vendorProfiles, {
    fields: [affiliateSales.companyId],
    references: [vendorProfiles.id],
  }),
}));

// AFFEXCH peptide pivot — Phase 2 tables (see docs/AFFEXCH_SESSION_HANDOFF.md)

// Promo codes — one PEP-XXXX-XXXX code per affiliate, generated at registration
// applicationId is nullable because the code is minted before any offer application exists
// CUTOVER: mapped to the OLD shared "DiscountCode" table.
//   creatorId    -> affiliateId
//   discount/commission -> discountPercent / commissionRateOverride
//   status       -> new additive column (old `active` flag stays for old system)
export const promoCodes = pgTable("DiscountCode", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("affiliateId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  code: varchar("code").notNull().unique(),
  status: varchar("status").notNull().default('active'),
  legacyDiscountPercent: decimal("discountPercent", { precision: 5, scale: 4 }),
  legacyCommissionRate: decimal("commissionRateOverride", { precision: 5, scale: 4 }),
  legacyExpiresAt: timestamp("expiresAt"),
  legacyLabel: varchar("label"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  creator: one(users, {
    fields: [promoCodes.creatorId],
    references: [users.id],
  }),
  redemptions: many(codeRedemptions),
}));

// Content links — affiliate-submitted social posts/videos awaiting admin approval
// Approved count drives affiliate_tier (0/1/5/10/20 thresholds: pending/verified/silver/gold/elite)
export const contentLinks = pgTable("content_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: 'set null' }),
  url: varchar("url").notNull(),
  platform: socialPlatformEnum("platform").notNull(),
  status: contentLinkStatusEnum("status").notNull().default('pending'),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentLinksRelations = relations(contentLinks, ({ one }) => ({
  creator: one(users, {
    fields: [contentLinks.creatorId],
    references: [users.id],
    relationName: "contentLinkCreator",
  }),
  application: one(applications, {
    fields: [contentLinks.applicationId],
    references: [applications.id],
  }),
  approver: one(users, {
    fields: [contentLinks.approvedBy],
    references: [users.id],
    relationName: "contentLinkApprover",
  }),
}));

// Code redemptions — recorded by vendor webhook when a PEP-XXXX-XXXX code is used at checkout
// customer_email_hash is a one-way hash (sha256) so we never store raw customer emails
export const codeRedemptions = pgTable("code_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").notNull().references(() => promoCodes.id, { onDelete: 'cascade' }),
  vendorId: varchar("vendor_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  saleAmount: decimal("sale_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  customerEmailHash: varchar("customer_email_hash"),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

export const codeRedemptionsRelations = relations(codeRedemptions, ({ one }) => ({
  promoCode: one(promoCodes, {
    fields: [codeRedemptions.promoCodeId],
    references: [promoCodes.id],
  }),
  vendor: one(vendorProfiles, {
    fields: [codeRedemptions.vendorId],
    references: [vendorProfiles.id],
  }),
}));

// ============================================================
// LEGACY peps_affiliate migration tables
// ============================================================
// These mirror the old peps_affiliate Order / OrderCommission / CommissionSplit
// models 1:1 so the storefront integration (theme.liquid + pepscheckoutportal.com,
// served via the /api/webhooks/* compatibility layer) behaves byte-for-byte like
// the old backend. Unlike code_redemptions / affiliate_sales, legacy_orders does
// NOT require an affiliate — 87% of historical orders had no discount code — so it
// is the system of record for ALL orders (attributed or not). Attributed orders are
// additionally projected into code_redemptions so they surface in the new dashboard.

// Mirrors old "Order". promoCodeId is nullable (most orders have no code).
// CUTOVER: mapped to the OLD shared "Order" table (system of record for sales).
//   promoCodeId -> discountCodeId
export const legacyOrders = pgTable("Order", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalOrderId: varchar("externalOrderId"),
  promoCodeId: varchar("discountCodeId").references(() => promoCodes.id, { onDelete: 'set null' }),
  customerFirstName: varchar("customerFirstName").notNull(),
  customerLastName: varchar("customerLastName"),
  itemsSummary: text("itemsSummary").notNull().default(''),
  orderTotal: decimal("orderTotal", { precision: 12, scale: 2 }).notNull(),
  commissionEarned: decimal("commissionEarned", { precision: 12, scale: 2 }).notNull().default('0'),
  attributed: boolean("attributed").notNull().default(false),
  source: varchar("source").notNull().default('shopify'),
  storeName: varchar("storeName"),
  currency: varchar("currency", { length: 3 }).notNull().default('USD'),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Mirrors old "OrderCommission" — per-recipient ledger row (source of truth for earnings).
// CUTOVER: mapped to the OLD shared "OrderCommission" table (earnings ledger).
export const legacyOrderCommissions = pgTable("OrderCommission", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("orderId").notNull().references(() => legacyOrders.id, { onDelete: 'cascade' }),
  recipientUserId: varchar("recipientUserId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  sharePercent: decimal("sharePercent", { precision: 6, scale: 5 }).notNull().default('1'),
  payoutId: varchar("payoutId").references(() => creatorPayouts.id, { onDelete: 'set null' }),
  createdAt: timestamp("createdAt").defaultNow(),
});

// CUTOVER: mapped to the OLD shared "CommissionSplit" table.
//   promoCodeId -> discountCodeId
export const legacyCommissionSplits = pgTable("CommissionSplit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("discountCodeId").notNull().references(() => promoCodes.id, { onDelete: 'cascade' }),
  recipientUserId: varchar("recipientUserId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sharePercent: decimal("sharePercent", { precision: 6, scale: 5 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const legacyOrdersRelations = relations(legacyOrders, ({ one, many }) => ({
  promoCode: one(promoCodes, {
    fields: [legacyOrders.promoCodeId],
    references: [promoCodes.id],
  }),
  commissions: many(legacyOrderCommissions),
}));

export const legacyOrderCommissionsRelations = relations(legacyOrderCommissions, ({ one }) => ({
  order: one(legacyOrders, {
    fields: [legacyOrderCommissions.orderId],
    references: [legacyOrders.id],
  }),
  recipient: one(users, {
    fields: [legacyOrderCommissions.recipientUserId],
    references: [users.id],
  }),
  payout: one(creatorPayouts, {
    fields: [legacyOrderCommissions.payoutId],
    references: [creatorPayouts.id],
  }),
}));

export const legacyCommissionSplitsRelations = relations(legacyCommissionSplits, ({ one }) => ({
  promoCode: one(promoCodes, {
    fields: [legacyCommissionSplits.promoCodeId],
    references: [promoCodes.id],
  }),
  recipient: one(users, {
    fields: [legacyCommissionSplits.recipientUserId],
    references: [users.id],
  }),
}));

// Retainer Contracts
export const retainerContracts = pgTable("retainer_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  monthlyAmount: decimal("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  videosPerMonth: integer("videos_per_month").notNull(),
  durationMonths: integer("duration_months").notNull(),
  requiredPlatform: varchar("required_platform").notNull(),
  platformAccountDetails: text("platform_account_details"),
  contentGuidelines: text("content_guidelines"),
  brandSafetyRequirements: text("brand_safety_requirements"),
  contentApprovalRequired: boolean("content_approval_required").notNull().default(false),
  exclusivityRequired: boolean("exclusivity_required").notNull().default(false),
  minimumVideoLengthSeconds: integer("minimum_video_length_seconds"),
  postingSchedule: text("posting_schedule"),
  retainerTiers: jsonb("retainer_tiers").default(sql`'[]'::jsonb`),
  minimumFollowers: integer("minimum_followers"),
  niches: text("niches").array().default(sql`ARRAY[]::text[]`),
  status: retainerStatusEnum("status").notNull().default('open'),
  assignedCreatorId: varchar("assigned_creator_id").references(() => users.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerContractsRelations = relations(retainerContracts, ({ one, many }) => ({
  company: one(vendorProfiles, {
    fields: [retainerContracts.companyId],
    references: [vendorProfiles.id],
  }),
  assignedCreator: one(users, {
    fields: [retainerContracts.assignedCreatorId],
    references: [users.id],
  }),
  applications: many(retainerApplications),
  deliverables: many(retainerDeliverables),
}));

// Retainer Applications
export const retainerApplications = pgTable("retainer_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  portfolioLinks: text("portfolio_links").array().default(sql`ARRAY[]::text[]`),
  proposedStartDate: timestamp("proposed_start_date"),
  status: retainerApplicationStatusEnum("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerApplicationsRelations = relations(retainerApplications, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerApplications.contractId],
    references: [retainerContracts.id],
  }),
  creator: one(users, {
    fields: [retainerApplications.creatorId],
    references: [users.id],
  }),
}));

// Retainer Deliverables
export const retainerDeliverables = pgTable("retainer_deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  monthNumber: integer("month_number").notNull(),
  videoNumber: integer("video_number").notNull(),
  videoUrl: varchar("video_url").notNull(),
  platformUrl: varchar("platform_url"),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  viewCount: integer("view_count"),
  engagement: jsonb("engagement"),
  status: deliverableStatusEnum("status").notNull().default('pending_review'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const retainerDeliverablesRelations = relations(retainerDeliverables, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerDeliverables.contractId],
    references: [retainerContracts.id],
  }),
  creator: one(users, {
    fields: [retainerDeliverables.creatorId],
    references: [users.id],
  }),
}));

export const retainerPayments = pgTable("retainer_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => retainerContracts.id, { onDelete: 'cascade' }),
  deliverableId: varchar("deliverable_id").references(() => retainerDeliverables.id, { onDelete: 'cascade' }), // Optional for monthly auto-payments
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  monthNumber: integer("month_number"), // Which month of the contract (1-12, etc.)
  paymentType: varchar("payment_type").notNull().default('deliverable'), // 'deliverable', 'monthly', 'bonus'
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(), // Full amount before fees
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  processingFeeAmount: decimal("processing_fee_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(), // Amount creator receives
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Legacy field, kept for backwards compatibility
  providerTransactionId: varchar("provider_transaction_id"), // PayPal batch ID, bank TX ID, crypto hash
  providerResponse: jsonb("provider_response"), // Full response from payment provider
  paymentMethod: varchar("payment_method"), // 'paypal', 'wire', 'crypto', 'etransfer'
  status: paymentStatusEnum("status").notNull().default('pending'),
  description: text("description"),
  initiatedAt: timestamp("initiated_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const retainerPaymentsRelations = relations(retainerPayments, ({ one }) => ({
  contract: one(retainerContracts, {
    fields: [retainerPayments.contractId],
    references: [retainerContracts.id],
  }),
  deliverable: one(retainerDeliverables, {
    fields: [retainerPayments.deliverableId],
    references: [retainerDeliverables.id],
  }),
  creator: one(users, {
    fields: [retainerPayments.creatorId],
    references: [users.id],
  }),
  company: one(vendorProfiles, {
    fields: [retainerPayments.companyId],
    references: [vendorProfiles.id],
  }),
}));

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updater: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// Banned Keywords
export const bannedKeywords = pgTable("banned_keywords", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  category: keywordCategoryEnum("category").notNull().default('custom'),
  isActive: boolean("is_active").notNull().default(true),
  severity: integer("severity").notNull().default(1), // 1-5, where 5 is most severe
  description: text("description"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bannedKeywordsRelations = relations(bannedKeywords, ({ one }) => ({
  creator: one(users, {
    fields: [bannedKeywords.createdBy],
    references: [users.id],
  }),
}));

// Content Flags
export const contentFlags = pgTable("content_flags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: contentTypeEnum("content_type").notNull(),
  contentId: varchar("content_id").notNull(), // ID of message or review
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // User who created the flagged content
  flagReason: text("flag_reason").notNull(), // Why it was flagged
  matchedKeywords: text("matched_keywords").array().default(sql`ARRAY[]::text[]`), // Which keywords triggered the flag
  status: flagStatusEnum("status").notNull().default('pending'),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp("reviewed_at"),
  adminNotes: text("admin_notes"),
  actionTaken: text("action_taken"), // What action was taken (e.g., content removed, user warned, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentFlagsRelations = relations(contentFlags, ({ one }) => ({
  user: one(users, {
    fields: [contentFlags.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [contentFlags.reviewedBy],
    references: [users.id],
  }),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  linkUrl: varchar("link_url"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// User Notification Preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  inAppNotifications: boolean("in_app_notifications").notNull().default(true),
  emailApplicationStatus: boolean("email_application_status").notNull().default(true),
  emailNewMessage: boolean("email_new_message").notNull().default(true),
  emailPayment: boolean("email_payment").notNull().default(true),
  emailOffer: boolean("email_offer").notNull().default(true),
  emailReview: boolean("email_review").notNull().default(true),
  emailSystem: boolean("email_system").notNull().default(true),
  pushApplicationStatus: boolean("push_application_status").notNull().default(true),
  pushNewMessage: boolean("push_new_message").notNull().default(true),
  pushPayment: boolean("push_payment").notNull().default(true),
  pushSubscription: jsonb("push_subscription"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id],
  }),
}));

// Audit Logs (for admin action tracking)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  changes: jsonb("changes"),
  reason: text("reason"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Platform Settings (for admin configuration)
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: varchar("category"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [platformSettings.updatedBy],
    references: [users.id],
  }),
}));

// Niches (for categorizing offers and creator profiles)
export const niches = pgTable("niches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Funding Accounts (for admin payment management)
export const platformFundingAccounts = pgTable("platform_funding_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "bank", "wallet", "card"
  last4: varchar("last4").notNull(),
  status: varchar("status").notNull().default("pending"), // "active", "pending", "disabled"
  isPrimary: boolean("is_primary").default(false),
  bankName: varchar("bank_name"),
  accountHolderName: varchar("account_holder_name"),
  routingNumber: varchar("routing_number"),
  accountNumber: varchar("account_number"),
  swiftCode: varchar("swift_code"),
  walletAddress: text("wallet_address"),
  walletNetwork: varchar("wallet_network"),
  cardBrand: varchar("card_brand"),
  cardExpiry: varchar("card_expiry"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformFundingAccountsRelations = relations(platformFundingAccounts, ({ one }) => ({
  createdByUser: one(users, {
    fields: [platformFundingAccounts.createdBy],
    references: [users.id],
  }),
}));

// Creator Wallets - Track creator's platform balance
export const creatorWallets = pgTable("creator_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  availableBalance: decimal("available_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  pendingBalance: decimal("pending_balance", { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).notNull().default('0.00'),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).notNull().default('0.00'),
  currency: varchar("currency", { length: 3 }).notNull().default('CAD'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const creatorWalletsRelations = relations(creatorWallets, ({ one, many }) => ({
  creator: one(users, {
    fields: [creatorWallets.creatorId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
  withdrawals: many(withdrawals),
}));

// Wallet Transactions - Track all wallet activity
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => creatorWallets.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: walletTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }), // 'payment', 'retainer_payment', 'withdrawal', 'refund'
  referenceId: varchar("reference_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(creatorWallets, {
    fields: [walletTransactions.walletId],
    references: [creatorWallets.id],
  }),
  creator: one(users, {
    fields: [walletTransactions.creatorId],
    references: [users.id],
  }),
}));

// Company Invoices - Track invoices sent to companies
export const companyInvoices = pgTable("company_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  companyId: varchar("company_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentId: varchar("payment_id").references(() => payments.id, { onDelete: 'set null' }),
  retainerPaymentId: varchar("retainer_payment_id").references(() => retainerPayments.id, { onDelete: 'set null' }),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(),
  stripeFeeAmount: decimal("stripe_fee_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull().default('draft'),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  cancelledAt: timestamp("cancelled_at"),
  expiredAt: timestamp("expired_at"),
  refundedAt: timestamp("refunded_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companyInvoicesRelations = relations(companyInvoices, ({ one }) => ({
  company: one(vendorProfiles, {
    fields: [companyInvoices.companyId],
    references: [vendorProfiles.id],
  }),
  creator: one(users, {
    fields: [companyInvoices.creatorId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [companyInvoices.paymentId],
    references: [payments.id],
  }),
  retainerPayment: one(retainerPayments, {
    fields: [companyInvoices.retainerPaymentId],
    references: [retainerPayments.id],
  }),
}));

// Withdrawals - Track creator withdrawal requests
export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => creatorWallets.id, { onDelete: 'cascade' }),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 10, scale: 2 }).notNull().default('0.00'),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  payoutMethod: varchar("payout_method", { length: 20 }).notNull(), // 'paypal', 'etransfer', 'wire', 'crypto'
  payoutDetails: jsonb("payout_details"), // Store payout-specific details
  status: withdrawalStatusEnum("status").notNull().default('pending'),
  providerTransactionId: varchar("provider_transaction_id"),
  providerResponse: jsonb("provider_response"),
  failureReason: text("failure_reason"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processingStartedAt: timestamp("processing_started_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  wallet: one(creatorWallets, {
    fields: [withdrawals.walletId],
    references: [creatorWallets.id],
  }),
  creator: one(users, {
    fields: [withdrawals.creatorId],
    references: [users.id],
  }),
}));

// Email Templates (for admin-managed email templates)
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // Unique identifier for template lookup
  category: emailTemplateCategoryEnum("category").notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  htmlContent: text("html_content").notNull(),
  visualData: jsonb("visual_data"), // Visual email builder data (blocks, header, etc.)
  description: text("description"), // Admin-facing description of when this template is used
  availableVariables: text("available_variables").array().default(sql`ARRAY[]::text[]`), // List of variables like {{userName}}, {{offerTitle}}
  isActive: boolean("is_active").notNull().default(true),
  isSystem: boolean("is_system").notNull().default(false), // System templates cannot be deleted
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  creator: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [emailTemplates.updatedBy],
    references: [users.id],
  }),
}));

// Platform Health Monitoring Tables (Section 4.3.G)

// API Metrics - aggregated API performance data
export const apiMetrics = pgTable("api_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  date: timestamp("date").notNull(),
  hour: integer("hour").notNull().default(0),
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  errorRequests: integer("error_requests").notNull().default(0),
  avgResponseTimeMs: decimal("avg_response_time_ms", { precision: 10, scale: 2 }).default('0'),
  minResponseTimeMs: integer("min_response_time_ms").default(0),
  maxResponseTimeMs: integer("max_response_time_ms").default(0),
  p50ResponseTimeMs: integer("p50_response_time_ms").default(0),
  p95ResponseTimeMs: integer("p95_response_time_ms").default(0),
  p99ResponseTimeMs: integer("p99_response_time_ms").default(0),
  error4xxCount: integer("error_4xx_count").default(0),
  error5xxCount: integer("error_5xx_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API Error Logs - individual error occurrences
export const apiErrorLogs = pgTable("api_error_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  statusCode: integer("status_code").notNull(),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  requestId: varchar("request_id", { length: 100 }),
  userId: varchar("user_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  requestBody: jsonb("request_body"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const apiErrorLogsRelations = relations(apiErrorLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiErrorLogs.userId],
    references: [users.id],
  }),
}));

// Storage Metrics - daily storage usage tracking
export const storageMetrics = pgTable("storage_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().unique(),
  totalFiles: integer("total_files").notNull().default(0),
  totalStorageBytes: decimal("total_storage_bytes", { precision: 20, scale: 0 }).notNull().default('0'),
  videoFiles: integer("video_files").notNull().default(0),
  videoStorageBytes: decimal("video_storage_bytes", { precision: 20, scale: 0 }).notNull().default('0'),
  imageFiles: integer("image_files").notNull().default(0),
  imageStorageBytes: decimal("image_storage_bytes", { precision: 20, scale: 0 }).notNull().default('0'),
  documentFiles: integer("document_files").notNull().default(0),
  documentStorageBytes: decimal("document_storage_bytes", { precision: 20, scale: 0 }).notNull().default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video Hosting Costs - daily cost tracking
export const videoHostingCosts = pgTable("video_hosting_costs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().unique(),
  totalVideos: integer("total_videos").notNull().default(0),
  totalVideoStorageGb: decimal("total_video_storage_gb", { precision: 12, scale: 4 }).notNull().default('0'),
  totalBandwidthGb: decimal("total_bandwidth_gb", { precision: 12, scale: 4 }).notNull().default('0'),
  storageCostUsd: decimal("storage_cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  bandwidthCostUsd: decimal("bandwidth_cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  transcodingCostUsd: decimal("transcoding_cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  costPerVideoUsd: decimal("cost_per_video_usd", { precision: 10, scale: 4 }).notNull().default('0'),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Health Snapshots - periodic health status
export const platformHealthSnapshots = pgTable("platform_health_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  overallHealthScore: integer("overall_health_score").notNull().default(100),
  apiHealthScore: integer("api_health_score").notNull().default(100),
  storageHealthScore: integer("storage_health_score").notNull().default(100),
  databaseHealthScore: integer("database_health_score").notNull().default(100),
  avgResponseTimeMs: decimal("avg_response_time_ms", { precision: 10, scale: 2 }).default('0'),
  errorRatePercent: decimal("error_rate_percent", { precision: 5, scale: 2 }).default('0'),
  activeUsersCount: integer("active_users_count").default(0),
  requestsPerMinute: integer("requests_per_minute").default(0),
  memoryUsagePercent: decimal("memory_usage_percent", { precision: 5, scale: 2 }).default('0'),
  cpuUsagePercent: decimal("cpu_usage_percent", { precision: 5, scale: 2 }).default('0'),
  diskUsagePercent: decimal("disk_usage_percent", { precision: 5, scale: 2 }).default('0'),
  databaseConnections: integer("database_connections").default(0),
  uptimeSeconds: decimal("uptime_seconds", { precision: 20, scale: 0 }).default('0'),
  alerts: jsonb("alerts").default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

// AFFEXCH manual payout flow
// ---------------------------------------------------------------
// Stripe Connect was removed per boss directive (Phase 6.5). Until a
// payment processor is wired we run an off-platform payout flow:
//   - Creators save their preferred payout destination
//     (PayPal email, Interac e-transfer, crypto wallet, wire details).
//   - Commissions accrue from code_redemptions.
//   - Admin sees a pending-balance queue and marks payouts as paid after
//     transferring money manually. Balance = sum(commission) - sum(paid).
//
// When a real payment processor is wired later, this same table schema
// will store automated payout txn refs without UI churn.

export const creatorPayoutMethods = pgTable("creator_payout_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  method: varchar("method", { length: 20 }).notNull(), // 'paypal' | 'interac' | 'crypto' | 'wire' | 'other'
  // Method-specific payload. PayPal/Interac: { email }. Crypto: { wallet, network }.
  // Wire: { accountHolder, accountNumber, routing, bank }. Other: { details }.
  details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CUTOVER: mapped to the OLD shared "Payout" table.
//   creatorId -> affiliateId; method/reference/paidByUserId are additive columns.
//   NOTE: old `status` is enum PayoutStatus (PENDING|PROCESSING|PAID). Storage
//   must write those UPPERCASE values (M3) — app 'pending'/'paid' is translated.
export const creatorPayouts = pgTable("Payout", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("affiliateId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  reference: varchar("reference", { length: 200 }),
  notes: text("notes"),
  paidByUserId: varchar("paidByUserId").references(() => users.id),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ============================================================
// DEPRECATED TABLE STUBS
// ============================================================
// The cleanup migration (migrations/affexch_db_cleanup.sql) dropped these
// tables from the live database. They survive as `any` stubs here so that
// dead-partial server code (legacy `requireRole('company')` endpoints
// and other unreachable paths) still typechecks. Anything that actually
// queries these at runtime would crash — but those code paths cannot be
// reached since the company role was removed and no user has it.
//
// When the time comes to delete the dead server code, drop these too.

// Minimal pgTable stubs so dead code paths still typecheck.
// The actual DB tables are dropped — any query would error at runtime,
// but those paths are unreachable (company role removed; no caller has it).
// Each stub carries `any`-typed columns so deep accesses (e.g. .videoUrl,
// .initiatedAt) don't break the build.
const __deadCol = () => varchar("__col") as any;
export const offerVideos: any = pgTable("__deprecated_offer_videos", {
  id: varchar("id").primaryKey(),
  offerId: __deadCol(), videoUrl: __deadCol(), thumbnailUrl: __deadCol(),
  title: __deadCol(), durationSeconds: __deadCol(), createdAt: __deadCol(),
});
export const payments: any = pgTable("__deprecated_payments", {
  id: varchar("id").primaryKey(),
  applicationId: __deadCol(), amount: __deadCol(), grossAmount: __deadCol(),
  platformFeeAmount: __deadCol(), processingFeeAmount: __deadCol(), netAmount: __deadCol(),
  status: __deadCol(), method: __deadCol(), initiatedAt: __deadCol(),
  completedAt: __deadCol(), failedAt: __deadCol(), refundedAt: __deadCol(),
  createdAt: __deadCol(), updatedAt: __deadCol(),
});
export const paymentSettings: any = pgTable("__deprecated_payment_settings", {
  id: varchar("id").primaryKey(), userId: __deadCol(),
  payoutMethod: __deadCol(), payoutEmail: __deadCol(),
  bankAccountNumber: __deadCol(), bankRoutingNumber: __deadCol(),
  createdAt: __deadCol(), updatedAt: __deadCol(),
});
export const socialAccountConnections: any = pgTable("__deprecated_social_account_connections", {
  id: varchar("id").primaryKey(), userId: __deadCol(), platform: __deadCol(),
  platformUserId: __deadCol(), platformUsername: __deadCol(),
  accessToken: __deadCol(), refreshToken: __deadCol(), tokenExpiresAt: __deadCol(),
  profileUrl: __deadCol(), profileImageUrl: __deadCol(), followerCount: __deadCol(),
  connectionStatus: __deadCol(), errorMessage: __deadCol(),
  createdAt: __deadCol(), updatedAt: __deadCol(),
});
export const companyVerificationDocuments: any = pgTable("__deprecated_company_verification_documents", {
  id: varchar("id").primaryKey(), companyId: __deadCol(),
  documentUrl: __deadCol(), documentName: __deadCol(), documentType: __deadCol(),
  uploadedAt: __deadCol(), createdAt: __deadCol(),
});

export const insertOfferVideoSchema = z.object({});
export const insertPaymentSchema = z.object({});
export const insertPaymentSettingSchema = z.object({});
export const insertSocialAccountConnectionSchema = z.object({});
export const insertCompanyVerificationDocumentSchema = z.object({});

// ============================================================

// AFFEXCH community chat — anonymous landing-page chat popup messages
// See client/src/landing-affexch/community/AffiliateCommunityChat.jsx
export const communityChatMessages = pgTable("community_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  handle: varchar("handle", { length: 32 }).notNull(),
  text: varchar("text", { length: 280 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_community_chat_created_at").on(table.createdAt),
]);

// Type exports for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Insert schemas
// URL validation regex for http/https URLs
const urlRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

// Phone number validation regex - flexible format supporting international numbers
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

// Social URL validation regexes
const youtubeUrlRegex = /^https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?|youtu\.be\/)[a-zA-Z0-9_-]+\/?$/;
const tiktokUrlRegex = /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/;
const instagramUrlRegex = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreatorProfileSchema = createInsertSchema(creatorProfiles).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  bio: z.string().max(1000, "Bio must be less than 1000 characters").optional().nullable(),
  youtubeUrl: z.string().regex(youtubeUrlRegex, "Please enter a valid YouTube channel URL").optional().nullable().or(z.literal("")),
  tiktokUrl: z.string().regex(tiktokUrlRegex, "Please enter a valid TikTok profile URL").optional().nullable().or(z.literal("")),
  instagramUrl: z.string().regex(instagramUrlRegex, "Please enter a valid Instagram profile URL").optional().nullable().or(z.literal("")),
  youtubeFollowers: z.number().min(0, "Followers cannot be negative").max(1000000000, "Follower count seems unrealistic").optional().nullable(),
  tiktokFollowers: z.number().min(0, "Followers cannot be negative").max(1000000000, "Follower count seems unrealistic").optional().nullable(),
  instagramFollowers: z.number().min(0, "Followers cannot be negative").max(1000000000, "Follower count seems unrealistic").optional().nullable(),
});
export const insertCompanyProfileSchema = createInsertSchema(vendorProfiles).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true }).extend({
  description: z.string().max(5000, "Description must be less than 5000 characters").optional().nullable(),
  phoneNumber: z.string().min(7, "Phone number must be at least 7 digits").max(20, "Phone number must be less than 20 characters").regex(phoneRegex, "Please enter a valid phone number").optional().nullable().or(z.literal("")),
  websiteUrl: z.string().regex(urlRegex, "Please enter a valid URL starting with http:// or https://").optional().nullable().or(z.literal("")),
  businessAddress: z.string().max(500, "Business address must be less than 500 characters").optional().nullable(),
});
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true, approvedAt: true });

export const createOfferSchema = createInsertSchema(offers).omit({ id: true, companyId: true, createdAt: true, updatedAt: true, viewCount: true, applicationCount: true, approvedAt: true, status: true }).extend({
  productUrl: z.string().min(1, "Product URL is required").regex(urlRegex, "Please enter a valid URL starting with http:// or https://"),
  fullDescription: z.string().min(50, "Description must be at least 50 characters").max(5000, "Description must be less than 5000 characters"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters").max(200, "Short description must be less than 200 characters"),
  contentStyleRequirements: z.string().max(2000, "Content style requirements must be less than 2000 characters").optional().nullable(),
  brandSafetyRequirements: z.string().max(2000, "Brand safety requirements must be less than 2000 characters").optional().nullable(),
  customTerms: z.string().max(5000, "Custom terms must be less than 5000 characters").optional().nullable(),
  creatorRequirements: z.string().max(2000, "Creator requirements must be less than 2000 characters").optional().nullable(),
});
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true, approvedAt: true, trackingLink: true, trackingCode: true, autoApprovalScheduledAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true }).extend({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message must be less than 5000 characters"),
});
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true, updatedAt: true, companyResponse: true, companyRespondedAt: true, adminResponse: true, respondedAt: true, respondedBy: true, isEdited: true, adminNote: true, isApproved: true, approvedBy: true, approvedAt: true, isHidden: true }).extend({
  reviewText: z.string().max(2000, "Review must be less than 2000 characters").optional().nullable(),
  overallRating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  paymentSpeedRating: z.number().min(1).max(5).optional().nullable(),
  communicationRating: z.number().min(1).max(5).optional().nullable(),
  offerQualityRating: z.number().min(1).max(5).optional().nullable(),
  supportRating: z.number().min(1).max(5).optional().nullable(),
});
export const adminReviewUpdateSchema = createInsertSchema(reviews).pick({ reviewText: true, overallRating: true, paymentSpeedRating: true, communicationRating: true, offerQualityRating: true, supportRating: true }).partial();
export const adminNoteSchema = z.object({ note: z.string() });
export const adminResponseSchema = z.object({ response: z.string().min(1, "Response text is required") });
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export const savedSearchFiltersSchema = z.object({
  searchTerm: z.string().trim().max(200).optional(),
  selectedNiches: z.array(z.string()).default([]),
  selectedCategories: z.array(z.string()).default([]),
  commissionType: z.string().optional(),
  commissionRange: z.array(z.number()).length(2).default([0, 10000]),
  minimumPayout: z.array(z.number()).min(1).default([0]),
  minRating: z.number().default(0),
  showTrending: z.boolean().default(false),
  showPriority: z.boolean().default(false),
  sortBy: z.string().optional(),
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({ filters: savedSearchFiltersSchema });
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true, updatedAt: true });
const decimalInput = z.union([z.string(), z.number()]).transform((val, ctx) => {
  const parsed = typeof val === "number" ? val : parseFloat(val);
  if (Number.isNaN(parsed)) {
    ctx.addIssue({ code: "custom", message: "Invalid number" });
    return z.NEVER;
  }
  return parsed.toString();
});

const numericInput = z.union([z.string(), z.number()]).transform((val, ctx) => {
  const parsed = typeof val === "number" ? val : parseFloat(val);
  if (Number.isNaN(parsed)) {
    ctx.addIssue({ code: "custom", message: "Invalid number" });
    return z.NEVER;
  }
  return parsed;
});

const integerInput = z.union([z.string(), z.number()]).transform((val, ctx) => {
  const parsed = typeof val === "number" ? val : parseInt(val, 10);
  if (!Number.isInteger(parsed)) {
    ctx.addIssue({ code: "custom", message: "Invalid whole number" });
    return z.NEVER;
  }
  return parsed;
});

const retainerTierInputSchema = z
  .object({
    name: z.string().min(1, "Tier name is required"),
    monthlyAmount: numericInput,
    videosPerMonth: integerInput,
    durationMonths: integerInput,
  })
  .strict();

export const insertRetainerContractSchema = createInsertSchema(retainerContracts)
  .omit({ id: true, createdAt: true, updatedAt: true, assignedCreatorId: true, startDate: true, endDate: true })
  .extend({
    monthlyAmount: decimalInput,
    videosPerMonth: integerInput,
    durationMonths: integerInput,
    minimumFollowers: integerInput.optional(),
    minimumVideoLengthSeconds: integerInput.optional(),
    retainerTiers: z.array(retainerTierInputSchema).max(5).default([]),
    niches: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((val) => {
        if (!val) return [] as string[];
        if (Array.isArray(val)) return val.filter(Boolean);
        return val
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);
      }),
  });

export const createRetainerContractSchema = insertRetainerContractSchema.omit({ companyId: true, status: true });
export const insertRetainerApplicationSchema = createInsertSchema(retainerApplications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRetainerDeliverableSchema = (createInsertSchema(retainerDeliverables) as any).omit({ id: true, createdAt: true, submittedAt: true, reviewedAt: true });
export const insertRetainerPaymentSchema = (createInsertSchema(retainerPayments) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNicheSchema = createInsertSchema(niches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformFundingAccountSchema = createInsertSchema(platformFundingAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreatorWalletSchema = createInsertSchema(creatorWallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWalletTransactionSchema = (createInsertSchema(walletTransactions) as any).omit({ id: true, createdAt: true });
export const insertCompanyInvoiceSchema = (createInsertSchema(companyInvoices) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWithdrawalSchema = (createInsertSchema(withdrawals) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBannedKeywordSchema = (createInsertSchema(bannedKeywords) as any).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentFlagSchema = (createInsertSchema(contentFlags) as any).omit({ id: true, createdAt: true });
export const insertEmailTemplateSchema = (createInsertSchema(emailTemplates) as any).omit({ id: true, createdAt: true, updatedAt: true });

// Platform Health Monitoring insert schemas
export const insertApiMetricsSchema = createInsertSchema(apiMetrics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApiErrorLogSchema = createInsertSchema(apiErrorLogs).omit({ id: true, timestamp: true });
export const insertStorageMetricsSchema = createInsertSchema(storageMetrics).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVideoHostingCostsSchema = createInsertSchema(videoHostingCosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformHealthSnapshotSchema = createInsertSchema(platformHealthSnapshots).omit({ id: true, createdAt: true });

// AFFEXCH peptide pivot — Phase 2 insert schemas
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true }).extend({
  code: z.string().regex(/^PEP-[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Promo code must match PEP-XXXX-XXXX format"),
});
export const insertContentLinkSchema = createInsertSchema(contentLinks).omit({ id: true, createdAt: true, approvedBy: true, approvedAt: true, status: true }).extend({
  url: z.string().regex(urlRegex, "Please enter a valid URL starting with http:// or https://"),
});
export const insertCodeRedemptionSchema = createInsertSchema(codeRedemptions).omit({ id: true, redeemedAt: true });

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type InsertCreatorProfile = z.infer<typeof insertCreatorProfileSchema>;
export type CompanyProfile = typeof vendorProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
// DEPRECATED stubs — table dropped from DB but type names still referenced.
export type OfferVideo = any;
export type InsertOfferVideo = any;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type AffiliateSale = typeof affiliateSales.$inferSelect;
export type InsertAffiliateSale = typeof affiliateSales.$inferInsert;
// DEPRECATED stubs — payment/payment-settings tables dropped from DB.
export type Payment = any;
export type InsertPayment = any;
export type PaymentSetting = any;
export type InsertPaymentSetting = any;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type RetainerContract = typeof retainerContracts.$inferSelect;
export type InsertRetainerContract = z.infer<typeof insertRetainerContractSchema>;
export type RetainerApplication = typeof retainerApplications.$inferSelect;
export type InsertRetainerApplication = z.infer<typeof insertRetainerApplicationSchema>;
export type RetainerDeliverable = typeof retainerDeliverables.$inferSelect;
export type InsertRetainerDeliverable = z.infer<typeof insertRetainerDeliverableSchema>;
export type RetainerPayment = typeof retainerPayments.$inferSelect;
export type InsertRetainerPayment = z.infer<typeof insertRetainerPaymentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type Niche = typeof niches.$inferSelect;
export type InsertNiche = z.infer<typeof insertNicheSchema>;
export type PlatformFundingAccount = typeof platformFundingAccounts.$inferSelect;
export type InsertPlatformFundingAccount = z.infer<typeof insertPlatformFundingAccountSchema>;
export type CreatorWallet = typeof creatorWallets.$inferSelect;
export type InsertCreatorWallet = z.infer<typeof insertCreatorWalletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type CompanyInvoice = typeof companyInvoices.$inferSelect;
export type InsertCompanyInvoice = z.infer<typeof insertCompanyInvoiceSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type BannedKeyword = typeof bannedKeywords.$inferSelect;
export type InsertBannedKeyword = z.infer<typeof insertBannedKeywordSchema>;
export type ContentFlag = typeof contentFlags.$inferSelect;
export type InsertContentFlag = z.infer<typeof insertContentFlagSchema>;
// DEPRECATED stubs — company KYC document table dropped from DB.
export type CompanyVerificationDocument = any;
export type InsertCompanyVerificationDocument = any;
// DEPRECATED stubs — social OAuth connection table dropped from DB.
export type SocialAccountConnection = any;
export type InsertSocialAccountConnection = any;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type ApiMetrics = typeof apiMetrics.$inferSelect;
export type InsertApiMetrics = z.infer<typeof insertApiMetricsSchema>;
export type ApiErrorLog = typeof apiErrorLogs.$inferSelect;
export type InsertApiErrorLog = z.infer<typeof insertApiErrorLogSchema>;
export type StorageMetrics = typeof storageMetrics.$inferSelect;
export type InsertStorageMetrics = z.infer<typeof insertStorageMetricsSchema>;
export type VideoHostingCosts = typeof videoHostingCosts.$inferSelect;
export type InsertVideoHostingCosts = z.infer<typeof insertVideoHostingCostsSchema>;
export type PlatformHealthSnapshot = typeof platformHealthSnapshots.$inferSelect;
export type InsertPlatformHealthSnapshot = z.infer<typeof insertPlatformHealthSnapshotSchema>;

// AFFEXCH peptide pivot — Phase 2 type exports
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type ContentLink = typeof contentLinks.$inferSelect;
export type InsertContentLink = z.infer<typeof insertContentLinkSchema>;
export type CodeRedemption = typeof codeRedemptions.$inferSelect;
export type InsertCodeRedemption = z.infer<typeof insertCodeRedemptionSchema>;