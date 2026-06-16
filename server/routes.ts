import type { Express, Request as ExpressRequest } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "url";
import { parse as parseCookie } from "cookie";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { registerAffexchRoutes } from "./affexchRoutes";
import { registerLegacyCompatRoutes } from "./legacyCompatRoutes";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { db } from "./db";
import { offerVideos, applications, analytics, offers, vendorProfiles, payments, retainerPayments, conversations, messages, bannedKeywords, contentFlags, companyInvoices, legacyOrders } from "../shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import express from "express";
import { z } from "zod";
import { checkClickFraud, logFraudDetection } from "./fraudDetection";
import {
  generatePostbackSignature,
  validatePostbackSignature,
  isTimestampValid,
  generateConversionId,
  generateShortTrackingCode,
  generateCompanyApiKey,
  getTransparentPixel,
  generateTrackingSnippet,
  generatePostbackUrlExample,
  type ConversionEventType,
} from "./trackingService";
import { calculateFees, formatFeePercentage, DEFAULT_PLATFORM_FEE_PERCENTAGE, STRIPE_PROCESSING_FEE_PERCENTAGE, getCompanyPlatformFeePercentage, clearFeeSettingsCache, getPlatformFeeSettings } from "./feeCalculator";
import { NotificationService } from "./notifications/notificationService";
import bcrypt from "bcrypt";
import { PriorityListingScheduler } from "./priorityListingScheduler";
import * as QRCode from "qrcode";
// @ts-ignore - multer may not have types in all environments
import multer from "multer";

// Reusable object storage helper for normalizing stored paths
const sharedObjectStorageService = new ObjectStorageService();

// Define multer file interface for type safety
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// Extend Express Request type to include multer's file property
type Request = ExpressRequest;

import {
  insertCreatorProfileSchema,
  insertCompanyProfileSchema,
  insertOfferSchema,
  createOfferSchema,
  insertOfferVideoSchema,
  insertApplicationSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertFavoriteSchema,
  insertSavedSearchSchema,
  savedSearchFiltersSchema,
  insertPaymentSettingSchema,
  adminReviewUpdateSchema,
  adminNoteSchema,
  adminResponseSchema,
  createRetainerContractSchema,
  insertRetainerApplicationSchema,
  insertRetainerDeliverableSchema,
  insertBannedKeywordSchema,
  insertContentFlagSchema,
} from "../shared/schema";
import {
  checkContent,
  flagContent,
  moderateReview,
  moderateMessage,
  reviewFlaggedContent,
  getPendingFlags,
  getFlagStatistics,
} from "./moderation/moderationService";
import {
  getPlatformHealthReport,
  getRecentApiMetrics,
  getApiMetricsTimeSeries,
  getStorageMetricsTimeSeries,
  getVideoCostsTimeSeries,
  getRecentErrorLogs,
  getLatestHealthSnapshot,
  calculateStorageUsage,
  calculateVideoHostingCosts,
  createHealthSnapshot,
  recordDailyStorageMetrics,
  recordDailyVideoCosts,
  flushMetrics,
} from "./platformHealthService";

// Alias for convenience
const requireAuth = isAuthenticated;

// Middleware to ensure user has specific role
function requireRole(...roles: string[]) {
  return (req: Request, res: any, next: any) => {
    if (!req.user || !roles.includes((req.user as any).role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Local Auth
  await setupAuth(app);

  // AFFEXCH peptide pivot — Phase 4 endpoints (promo code, content links, tier)
  registerAffexchRoutes(app);

  // Legacy peps_affiliate storefront compatibility layer (/api/webhooks/*)
  registerLegacyCompatRoutes(app);

  // Initialize notification service
  const notificationService = new NotificationService(storage);

  // Initialize priority listing scheduler
  const priorityListingScheduler = new PriorityListingScheduler(notificationService);

  // Run priority listing checks daily at 2 AM
  // In production, use a proper cron scheduler like node-cron
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      try {
        await priorityListingScheduler.runScheduledTasks();
      } catch (error) {
        console.error('[Priority Listing Scheduler] Error running scheduled tasks:', error);
      }
    }
  }, 60000); // Check every minute

  app.get("/api/documents/signed-url/:publicId(*)", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role;
      
      // Get the public ID from the URL params (the (*) allows slashes in the publicId)
      const publicId = req.params.publicId;
      
      // Get resource type from query params (default: 'raw' for documents)
      const resourceType = (req.query.resourceType as string) || 'raw';
      
      console.log('[Signed URL] Request received');
      console.log('[Signed URL] User ID:', userId);
      console.log('[Signed URL] User Role:', userRole);
      console.log('[Signed URL] Public ID:', publicId);
      console.log('[Signed URL] Resource type:', resourceType);
      
      // Validate public ID
      if (!publicId || publicId.trim() === '') {
        console.error('[Signed URL] Empty public ID provided');
        return res.status(400).json({ 
          error: "Bad Request",
          message: "Public ID is required"
        });
      }

      // Generate signed URL valid for 1 hour using the shared object storage service
      const signedUrl = sharedObjectStorageService.getSignedViewUrl(publicId, {
        resourceType: resourceType as any,
        expiresIn: 3600, // 1 hour in seconds
      });
      
      // Calculate expiry date
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      
      console.log('[Signed URL] Successfully generated signed URL');
      console.log('[Signed URL] Expires at:', expiresAt);
      
      // Return the signed URL to the client
      res.json({ 
        url: signedUrl,
        expiresAt: expiresAt,
        publicId: publicId
      });
      
    } catch (error) {
      console.error('[Signed URL] Error generating signed URL:', error);
      
      // Return error to client
      res.status(500).json({ 
        error: "Internal Server Error",
        message: "Failed to generate signed URL",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Email change verification endpoint - validates password and checks email availability
  app.post("/api/auth/verify-email-change", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      const { password, newEmail } = req.body;

      if (!newEmail) {
        return res.status(400).json({ error: "New email is required" });
      }

      const normalizedCurrentEmail = (user.email || "").toLowerCase();
      if (newEmail.toLowerCase() === normalizedCurrentEmail) {
        return res.status(400).json({ error: "New email must be different from current email" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Email is already registered to another account" });
      }

      if (user.googleId && !user.password) {
        return res.json({
          success: true,
          message: "Email change verified for OAuth account",
          canChange: true,
        });
      }

      if (!password) {
        return res.status(400).json({ error: "Password is required for email change" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.password) {
        return res.status(400).json({ error: "Account authentication error" });
      }

      const isValidPassword = await bcrypt.compare(password, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      res.json({
        success: true,
        message: "Password verified successfully",
        canChange: true,
      });
    } catch (error: any) {
      console.error("Email change verification error:", error);
      res.status(500).json({ error: error.message || "Failed to verify email change" });
    }
  });

  // Update email endpoint - changes the email after verification
  app.put("/api/auth/email", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      const { newEmail, password } = req.body;

      if (!newEmail) {
        return res.status(400).json({ error: "New email is required" });
      }

      const normalizedCurrentEmail = (user.email || "").toLowerCase();
      if (newEmail.toLowerCase() === normalizedCurrentEmail) {
        return res.status(400).json({ error: "New email must be different from current email" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingUser = await storage.getUserByEmail(newEmail);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Email is already registered to another account" });
      }

      // Phase 6.5: email-change notifications removed (no mailer integration).
      const sendEmailChangeNotifications = async (_oldEmail: string | null | undefined) => {
        // no-op
      };

      if (user.googleId && !user.password) {
        const oldEmail = user.email;
        await storage.updateUser(userId, {
          email: newEmail,
          emailVerified: false,
        });

        await sendEmailChangeNotifications(oldEmail);

        if (req.user) {
          (req.user as any).email = newEmail;
          (req.user as any).emailVerified = false;
        }

        return res.json({
          success: true,
          message: "Email updated successfully",
          requiresVerification: true,
        });
      }

      if (!password) {
        return res.status(400).json({ error: "Password is required for email change" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.password) {
        return res.status(400).json({ error: "Account authentication error" });
      }

      const isValidPassword = await bcrypt.compare(password, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }

      const oldEmail = currentUser.email || user.email;
      await storage.updateUser(userId, {
        email: newEmail,
        emailVerified: false,
      });

      await sendEmailChangeNotifications(oldEmail);

      if (req.user) {
        (req.user as any).email = newEmail;
        (req.user as any).emailVerified = false;
      }

      res.json({
        success: true,
        message: "Email updated successfully. Please verify your new email address.",
        requiresVerification: true,
      });
    } catch (error: any) {
      console.error("Email update error:", error);
      res.status(500).json({ error: error.message || "Failed to update email" });
    }
  });

  // Profile routes
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;

      if (user.role === 'creator') {
        const profile = await storage.getCreatorProfile(userId);
        if (!profile) {
          // Create default profile if doesn't exist
          const newProfile = await storage.createCreatorProfile({ userId });
          return res.json(newProfile);
        }
        return res.json(profile);
      } else if (user.role === 'company') {
        const profile = await storage.getCompanyProfile(userId);
        return res.json(profile);
      }

      res.json(null);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;

      console.log("[Profile Update] User role:", user.role);
      console.log("[Profile Update] Request body:", req.body);

      // Extract profileImageUrl if provided (for user table update)
      const { profileImageUrl, ...profileData } = req.body;

      // Update user's profile image if provided
      if (profileImageUrl !== undefined) {
        await storage.updateUser(userId, { profileImageUrl });
      }

      if (user.role === 'creator') {
        const validated = insertCreatorProfileSchema.partial().parse(profileData);
        console.log("[Profile Update] Validated data:", validated);

        const profile = await storage.updateCreatorProfile(userId, validated);
        console.log("[Profile Update] Updated profile:", profile);
        return res.json(profile);
      } else if (user.role === 'company') {
        // Don't normalize URLs - save full Cloudinary URLs
        const normalizedProfileData = {
          ...profileData,
        };

        const validated = insertCompanyProfileSchema.partial().parse(normalizedProfileData);
        const profile = await storage.updateCompanyProfile(userId, validated);
        return res.json(profile);
      }

      res.status(400).send("Invalid role");
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company onboarding
  app.post("/api/company/onboarding", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const {
        legalName,
        tradeName,
        industry,
        websiteUrl,
        companySize,
        yearFounded,
        logoUrl,
        description,
        contactName,
        contactJobTitle,
        phoneNumber,
        businessAddress,
        verificationDocumentUrl,
        linkedinUrl,
        twitterUrl,
        facebookUrl,
        instagramUrl,
      } = req.body;

      // Validate required fields
      if (!legalName || !websiteUrl || !logoUrl || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!contactName || !phoneNumber || !businessAddress) {
        return res.status(400).json({ error: "Missing required contact information" });
      }

      if (!verificationDocumentUrl) {
        return res.status(400).json({ error: "Verification document is required" });
      }

      // Update company profile with all onboarding data
      const profile = await storage.updateCompanyProfile(userId, {
        legalName,
        tradeName,
        industry,
        websiteUrl,
        companySize,
        yearFounded,
        logoUrl,
        description,
        contactName,
        contactJobTitle,
        phoneNumber,
        businessAddress,
        verificationDocumentUrl,
        linkedinUrl,
        twitterUrl,
        facebookUrl,
        instagramUrl,
        status: 'pending', // Keep as pending for admin approval
      });

      return res.json({ success: true, profile });
    } catch (error: any) {
      console.error("Company onboarding error:", error);
      res.status(500).json({ error: error.message || "Failed to complete onboarding" });
    }
  });

  // Get company profile by ID (public/authenticated)
  app.get("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompanyProfile(id);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get associated user info
      const user = await storage.getUserById(company.userId);

      // Return company profile with limited user info
      return res.json({
        ...company,
        user: user ? {
          id: user.id,
          email: user.email,
          username: user.username,
        } : null,
      });
    } catch (error: any) {
      console.error("Get company profile error:", error);
      res.status(500).json({ error: error.message || "Failed to get company profile" });
    }
  });

  // ===== Company Fee Info Route =====

  // Get fee info for the logged-in company
  app.get("/api/company/fee", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      const { percentage: platformFeePercentage, isCustom } = await getCompanyPlatformFeePercentage(companyProfile.id);
      const { stripeFee: stripeFeePercentage } = await getPlatformFeeSettings();
      const totalFeePercentage = platformFeePercentage + stripeFeePercentage;
      const creatorPayoutPercentage = 1 - totalFeePercentage;

      return res.json({
        platformFeePercentage,
        platformFeeDisplay: formatFeePercentage(platformFeePercentage),
        processingFeePercentage: stripeFeePercentage,
        processingFeeDisplay: formatFeePercentage(stripeFeePercentage),
        totalFeePercentage,
        totalFeeDisplay: formatFeePercentage(totalFeePercentage),
        creatorPayoutPercentage,
        creatorPayoutDisplay: formatFeePercentage(creatorPayoutPercentage),
        isCustomFee: isCustom,
        defaultPlatformFeePercentage: DEFAULT_PLATFORM_FEE_PERCENTAGE,
        defaultPlatformFeeDisplay: formatFeePercentage(DEFAULT_PLATFORM_FEE_PERCENTAGE),
      });
    } catch (error: any) {
      console.error("Get company fee info error:", error);
      res.status(500).json({ error: error.message || "Failed to get company fee info" });
    }
  });

  // ===== Company Verification Documents Routes =====

  // Get verification documents for the logged-in company user
  app.get("/api/company/verification-documents", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const documents = await storage.getVerificationDocumentsByUserId(userId);
      return res.json(documents);
    } catch (error: any) {
      console.error("Get verification documents error:", error);
      res.status(500).json({ error: error.message || "Failed to get verification documents" });
    }
  });

  // Add a new verification document
  app.post("/api/company/verification-documents", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { documentUrl, documentName, documentType, fileSize } = req.body;

      if (!documentUrl || !documentName || !documentType) {
        return res.status(400).json({ error: "Missing required fields: documentUrl, documentName, documentType" });
      }

      // Get company profile for this user
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      const document = await storage.addVerificationDocument({
        companyId: companyProfile.id,
        documentUrl,
        documentName,
        documentType,
        fileSize: fileSize || null,
      });

      return res.json({ success: true, document });
    } catch (error: any) {
      console.error("Add verification document error:", error);
      res.status(500).json({ error: error.message || "Failed to add verification document" });
    }
  });

  // Delete a verification document
  app.delete("/api/company/verification-documents/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const documentId = req.params.id;

      // Get the document and verify ownership
      const document = await storage.getVerificationDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get company profile and verify the document belongs to this company
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || document.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Not authorized to delete this document" });
      }

      // Delete from GCS storage first
      if (document.documentUrl) {
        try {
          const objectStorageService = new ObjectStorageService();
          const url = new URL(document.documentUrl);
          const pathParts = url.pathname.split('/').filter(Boolean);
          // Remove bucket name, keep the rest as file path
          // URL format: https://storage.googleapis.com/bucket-name/path/to/file
          const filePath = pathParts.slice(1).join('/');

          if (filePath) {
            const result = await objectStorageService.deleteResource(filePath, 'raw');
            console.log('[Verification Documents] Deleted file from GCS:', filePath, 'Result:', result);
          }
        } catch (storageError) {
          console.error('[Verification Documents] Error deleting from GCS:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      const deleted = await storage.deleteVerificationDocument(documentId);
      if (deleted) {
        return res.json({ success: true });
      } else {
        return res.status(500).json({ error: "Failed to delete document" });
      }
    } catch (error: any) {
      console.error("Delete verification document error:", error);
      res.status(500).json({ error: error.message || "Failed to delete verification document" });
    }
  });

  // Serve/proxy a verification document with authentication
  app.get("/api/company/verification-documents/:id/file", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;
      const documentId = req.params.id;
      const isDownload = req.query.download === 'true';

      // Get the document
      const document = await storage.getVerificationDocumentById(documentId);
      if (!document) {
        return res.status(404).send("Document not found");
      }

      // Verify authorization: must be the document owner or an admin
      if (userRole !== 'admin') {
        const companyProfile = await storage.getCompanyProfile(userId);
        if (!companyProfile || document.companyId !== companyProfile.id) {
          return res.status(403).send("Not authorized to access this document");
        }
      }

      const documentUrl = document.documentUrl;
      if (!documentUrl) {
        return res.status(404).send("Document URL not found");
      }

      console.log('[Verification Document] Original URL:', documentUrl);

      // Fetch the document from GCS using a signed URL
      try {
        // Generate a signed URL to access the document from GCS
        const objectStorageService = new ObjectStorageService();
        const signedUrl = await objectStorageService.getSignedViewUrl(documentUrl, {
          expiresIn: 300, // 5 minutes, just enough to fetch the document
        });

        console.log('[Verification Document] Generated signed URL for fetch');

        // Fetch the document using the signed URL
        const fetchRes = await fetch(signedUrl, {
          method: "GET",
          headers: {
            'User-Agent': 'AffiliateXchange-Server/1.0',
          },
        });

        if (!fetchRes.ok) {
          console.error('[Verification Document Proxy] Failed to fetch:', fetchRes.status, fetchRes.statusText);
          console.error('[Verification Document Proxy] Original URL:', documentUrl);
          return res.status(fetchRes.status).send("Failed to fetch document from storage");
        }

        console.log('[Verification Document] Successfully fetched document');

        // Set appropriate headers
        const contentType = fetchRes.headers.get("content-type");
        if (contentType) {
          res.setHeader("Content-Type", contentType);
        } else {
          // Fallback content type based on file extension
          if (document.documentType === 'pdf' || documentUrl.toLowerCase().endsWith('.pdf')) {
            res.setHeader("Content-Type", "application/pdf");
          } else if (documentUrl.toLowerCase().match(/\.(jpg|jpeg)$/i)) {
            res.setHeader("Content-Type", "image/jpeg");
          } else if (documentUrl.toLowerCase().endsWith('.png')) {
            res.setHeader("Content-Type", "image/png");
          }
        }

        const contentLength = fetchRes.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);

        // Set content disposition based on download mode
        if (isDownload) {
          // Force download with attachment disposition
          res.setHeader("Content-Disposition", `attachment; filename="${document.documentName}"`);
        } else if (document.documentType === 'pdf' || documentUrl.toLowerCase().endsWith('.pdf')) {
          // Display inline for PDFs when viewing
          res.setHeader("Content-Disposition", `inline; filename="${document.documentName}"`);
        } else {
          // Display inline for images when viewing
          res.setHeader("Content-Disposition", `inline; filename="${document.documentName}"`);
        }

        // Stream the response
        if (fetchRes.body) {
          const reader = fetchRes.body.getReader();
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
              }
              res.end();
            } catch (error) {
              console.error('[Verification Document Proxy] Error streaming document:', error);
              res.end();
            }
          };
          await pump();
        } else {
          const arrayBuffer = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.send(buffer);
        }
      } catch (urlError: any) {
        console.error('[Verification Document] URL parsing error:', urlError);
        return res.status(500).send("Failed to parse document URL");
      }
    } catch (error: any) {
      console.error("Serve verification document error:", error);
      res.status(500).send(error?.message || "Failed to serve document");
    }
  });

  // Admin: Get verification documents for a specific company
  app.get("/api/admin/companies/:id/verification-documents", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const documents = await storage.getVerificationDocumentsByCompanyId(companyId);
      return res.json(documents);
    } catch (error: any) {
      console.error("Admin get verification documents error:", error);
      res.status(500).json({ error: error.message || "Failed to get verification documents" });
    }
  });

  // Creator stats
  app.get("/api/creator/stats", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getApplicationsByCreator(userId);
      const analyticsData = await storage.getAnalyticsByCreator(userId);
      const unreadMessages = await storage.getUnreadMessageCountForCreator(userId);

      const formatCurrency = (value: number) => Number(value || 0).toFixed(2);

      const stats = {
        totalEarnings: formatCurrency(analyticsData?.totalEarnings || 0),
        monthlyEarnings: formatCurrency(analyticsData?.monthlyEarnings || 0),
        activeOffers: applications.filter(a => a.status === 'active' || a.status === 'approved').length,
        pendingApplications: applications.filter(a => a.status === 'pending').length,
        totalClicks: analyticsData?.totalClicks || 0,
        monthlyClicks: analyticsData?.monthlyClicks || 0,
        unreadMessages,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Offers routes
  app.get("/api/offers", requireAuth, async (req, res) => {
    try {
      const offers = await storage.getOffers(req.query);
      res.json(offers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/offers/trending", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offers = await storage.getTrendingOffers(limit);
      res.json(offers);
    } catch (error: any) {
      console.error('[Trending Offers] Error:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/offers/recommended", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // Get creator profile with niches
      const creatorProfile = await storage.getCreatorProfile(userId);
      if (!creatorProfile) {
        console.log('[Recommendations] Profile not found for user:', userId);
        // Return empty array instead of 404 to allow page to render properly
        return res.json([]);
      }

  const creatorNiches = (creatorProfile.niches || []).map((n: string) => (n || '').toString().trim()).filter(Boolean);
  console.log('[Recommendations] User niches:', creatorNiches);

      // Check if user has set any niches
      if (creatorNiches.length === 0) {
        console.log('[Recommendations] No niches set for user:', userId);
        return res.status(200).json({
          error: 'no_niches',
          message: 'Please set your content niches in your profile to get personalized recommendations.'
        });
      }

      // Normalize niches for case-insensitive comparison
      const creatorNichesNorm = creatorNiches.map((n: string) => n.toLowerCase());

      // Get all approved offers
      const allOffers = await storage.getOffers({ status: 'approved' });
      console.log('[Recommendations] Total approved offers:', allOffers.length);
      console.log('[Recommendations] Sample offer niches:', allOffers.slice(0, 3).map(o => ({
        id: o.id,
        title: o.title,
        primaryNiche: o.primaryNiche,
        additionalNiches: o.additionalNiches
      })));

      // Get creator's past applications
      const pastApplications = await db
        .select({
          offerId: applications.offerId,
          status: applications.status,
        })
        .from(applications)
        .where(eq(applications.creatorId, userId));

      const appliedOfferIds = new Set(pastApplications.map(app => app.offerId));

      // Get creator's performance by niche
      const performanceByNiche: Record<string, number> = {};

      if (pastApplications.length > 0) {
        const approvedAppIds = pastApplications
          .filter(app => app.status === 'approved' || app.status === 'active')
          .map(app => app.offerId);

        if (approvedAppIds.length > 0) {
          // Get analytics for approved applications
          const performanceData = await db
            .select({
              offerId: analytics.offerId,
              totalConversions: sql<number>`SUM(${analytics.conversions})`,
              totalClicks: sql<number>`SUM(${analytics.clicks})`,
            })
            .from(analytics)
            .where(eq(analytics.creatorId, userId))
            .groupBy(analytics.offerId);

          // Map performance to niches
          for (const perf of performanceData) {
            const offer = allOffers.find(o => o.id === perf.offerId);
            if (offer) {
              const conversionRate = perf.totalClicks > 0
                ? (Number(perf.totalConversions) / Number(perf.totalClicks)) * 100
                : 0;

              // Track performance for primary niche (normalized key)
              if (offer.primaryNiche) {
                const key = (offer.primaryNiche || '').toString().toLowerCase();
                performanceByNiche[key] = (performanceByNiche[key] || 0) + conversionRate;
              }

              // Track performance for additional niches (normalized keys)
              if (offer.additionalNiches) {
                for (const niche of offer.additionalNiches) {
                  const key = (niche || '').toString().toLowerCase();
                  performanceByNiche[key] = (performanceByNiche[key] || 0) + conversionRate;
                }
              }
            }
          }
        }
      }

      // Score each offer - ONLY include offers with at least one matching niche
      const scoredOffers = allOffers
        .filter(offer => !appliedOfferIds.has(offer.id))
        .map(offer => {
          let score = 0;

          // 1. Niche matching (0-100 points)
          // Build raw and normalized niche lists for the offer
          const offerNichesRaw = [offer.primaryNiche, ...(offer.additionalNiches || [])].filter(Boolean);
          const offerNichesNorm = offerNichesRaw.map((n: string) => n.toString().toLowerCase());

          // Determine matching niches by normalized intersection
          const matchingNiches = offerNichesRaw.filter((n: string, idx: number) => creatorNichesNorm.includes(offerNichesNorm[idx]));

          // IMPORTANT: If no niche match, mark this offer as invalid
          if (matchingNiches.length === 0) {
            return null; // Will be filtered out later
          }

          // Primary niche match = 50 points, additional niche match = 25 points each
          if (offer.primaryNiche && creatorNichesNorm.includes((offer.primaryNiche || '').toString().toLowerCase())) {
            score += 50;
          }

          const additionalMatches = matchingNiches.filter(niche => niche !== offer.primaryNiche).length;
          score += additionalMatches * 25;

          // Cap niche score at 100
          const nicheScore = Math.min(score, 100);

          // 2. Performance in similar niches (0-50 points)
          let performanceScore = 0;
          for (const nicheNorm of offerNichesNorm) {
            if (performanceByNiche[nicheNorm]) {
              performanceScore += performanceByNiche[nicheNorm];
            }
          }
          performanceScore = Math.min(performanceScore, 50);

          // 3. Offer popularity (0-30 points)
          const viewScore = Math.min((offer.viewCount || 0) / 10, 15);
          const applicationScore = Math.min((offer.applicationCount || 0) / 5, 15);
          const popularityScore = viewScore + applicationScore;

          // 4. Commission attractiveness (0-20 points)
          let commissionScore = 0;
          if (offer.commissionType === 'per_sale' && offer.commissionAmount) {
            commissionScore = Math.min(Number(offer.commissionAmount) / 10, 20);
          } else if (offer.commissionType === 'per_sale' && offer.commissionPercentage) {
            commissionScore = Math.min(Number(offer.commissionPercentage) / 2, 20);
          } else if (offer.commissionType === 'monthly_retainer' && offer.retainerAmount) {
            commissionScore = Math.min(Number(offer.retainerAmount) / 100, 20);
          } else if (offer.commissionType === 'per_click') {
            commissionScore = 10; // Base score for per-click
          } else if (offer.commissionType === 'per_lead') {
            commissionScore = 12; // Base score for per-lead
          }

          const totalScore = nicheScore + performanceScore + popularityScore + commissionScore;

          return {
            offer,
            score: totalScore,
            matchingNiches: matchingNiches.length,
          };
        })
        .filter(item => item !== null) // Remove offers with no niche match
        .sort((a, b) => b!.score - a!.score);

      console.log('[Recommendations] Total scored offers with matching niches:', scoredOffers.length);
      console.log('[Recommendations] Top 3 scored offers:', scoredOffers.slice(0, 3).map(s => ({
        title: s!.offer.title,
        score: s!.score,
        matchingNiches: s!.matchingNiches,
        primaryNiche: s!.offer.primaryNiche
      })));

      // If no niche matches, fallback to popular offers
      let topOffers = scoredOffers.slice(0, 10).map(item => item!.offer);

      if (topOffers.length === 0) {
        console.log('[Recommendations] No niche matches found. Falling back to popular offers.');
        // Return popular offers that user hasn't applied to yet
        topOffers = allOffers
          .filter(offer => !appliedOfferIds.has(offer.id))
          .sort((a, b) => {
            const scoreA = (a.viewCount || 0) + (a.applicationCount || 0) * 2;
            const scoreB = (b.viewCount || 0) + (b.applicationCount || 0) * 2;
            return scoreB - scoreA;
          })
          .slice(0, 10);
        console.log('[Recommendations] Returning', topOffers.length, 'popular offers as fallback');
      } else {
        console.log('[Recommendations] Returning', topOffers.length, 'niche-matched offers');
      }

      res.json(topOffers);
    } catch (error: any) {
      console.error('[Recommendations] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Dev-only: debug recommendations for a specific user (bypass auth)
  // Usage: /api/debug/recommendations?userId=<userId>
  if (process.env.NODE_ENV !== 'production') {
    app.get("/api/debug/recommendations", async (req, res) => {
      try {
        const userId = String(req.query.userId || '');
        if (!userId) return res.status(400).json({ error: 'missing_userId' });

        // Reuse recommendation logic from /api/offers/recommended but bypass auth
        const creatorProfile = await storage.getCreatorProfile(userId);
        if (!creatorProfile) {
          return res.status(404).json({ error: 'profile_not_found' });
        }

        const creatorNiches = (creatorProfile.niches || []).map((n: string) => (n || '').toString().trim()).filter(Boolean);
        if (creatorNiches.length === 0) {
          return res.status(200).json({ error: 'no_niches' });
        }
        const creatorNichesNorm = creatorNiches.map((n: string) => n.toLowerCase());

        const allOffers = await storage.getOffers({ status: 'approved' });

        // Get creator's past applications
        const pastApplications = await db
          .select({ offerId: applications.offerId, status: applications.status })
          .from(applications)
          .where(eq(applications.creatorId, userId));

        const appliedOfferIds = new Set(pastApplications.map(app => app.offerId));

        // Compute performance by niche for this user
        const performanceByNiche: Record<string, number> = {};
        if (pastApplications.length > 0) {
          const approvedAppIds = pastApplications
            .filter(app => app.status === 'approved' || app.status === 'active')
            .map(app => app.offerId);

          if (approvedAppIds.length > 0) {
            const performanceData = await db
              .select({ offerId: analytics.offerId, totalConversions: sql<number>`SUM(${analytics.conversions})`, totalClicks: sql<number>`SUM(${analytics.clicks})` })
              .from(analytics)
              .where(eq(analytics.creatorId, userId))
              .groupBy(analytics.offerId);

            for (const perf of performanceData) {
              const offer = allOffers.find(o => o.id === perf.offerId);
              if (!offer) continue;
              const conversionRate = perf.totalClicks > 0 ? (Number(perf.totalConversions) / Number(perf.totalClicks)) * 100 : 0;
              if (offer.primaryNiche) {
                const key = (offer.primaryNiche || '').toString().toLowerCase();
                performanceByNiche[key] = (performanceByNiche[key] || 0) + conversionRate;
              }
              if (offer.additionalNiches) {
                for (const niche of offer.additionalNiches) {
                  const key = (niche || '').toString().toLowerCase();
                  performanceByNiche[key] = (performanceByNiche[key] || 0) + conversionRate;
                }
              }
            }
          }
        }

        const scoredOffers = allOffers
          .filter(offer => !appliedOfferIds.has(offer.id))
          .map(offer => {
            let score = 0;
            const offerNichesRaw = [offer.primaryNiche, ...(offer.additionalNiches || [])].filter(Boolean);
            const offerNichesNorm = offerNichesRaw.map((n: string) => n.toString().toLowerCase());
            const matchingNiches = offerNichesRaw.filter((n: string, idx: number) => creatorNichesNorm.includes(offerNichesNorm[idx]));
            if (matchingNiches.length === 0) return null;
            if (offer.primaryNiche && creatorNichesNorm.includes((offer.primaryNiche || '').toString().toLowerCase())) score += 50;
            const additionalMatches = matchingNiches.filter(n => n !== offer.primaryNiche).length;
            score += additionalMatches * 25;
            const nicheScore = Math.min(score, 100);
            let performanceScore = 0;
            for (const nicheNorm of offerNichesNorm) {
              if (performanceByNiche[nicheNorm]) performanceScore += performanceByNiche[nicheNorm];
            }
            performanceScore = Math.min(performanceScore, 50);
            const viewScore = Math.min((offer.viewCount || 0) / 10, 15);
            const applicationScore = Math.min((offer.applicationCount || 0) / 5, 15);
            const popularityScore = viewScore + applicationScore;
            let commissionScore = 0;
            if (offer.commissionType === 'per_sale' && offer.commissionAmount) {
              commissionScore = Math.min(Number(offer.commissionAmount) / 10, 20);
            } else if (offer.commissionType === 'per_sale' && offer.commissionPercentage) {
              commissionScore = Math.min(Number(offer.commissionPercentage) / 2, 20);
            } else if (offer.commissionType === 'monthly_retainer' && offer.retainerAmount) {
              commissionScore = Math.min(Number(offer.retainerAmount) / 100, 20);
            } else if (offer.commissionType === 'per_click') {
              commissionScore = 10;
            } else if (offer.commissionType === 'per_lead') {
              commissionScore = 12;
            }
            const totalScore = nicheScore + performanceScore + popularityScore + commissionScore;
            return { offer, score: totalScore };
          })
          .filter(item => item !== null)
          .sort((a, b) => b!.score - a!.score);

        const topOffers = scoredOffers.slice(0, 10).map(item => item!.offer);
        return res.json(topOffers);
      } catch (error: any) {
        console.error('[Debug Recommendations] Error:', error);
        res.status(500).send(error.message);
      }
    });
  }

  app.get("/api/offers/:id", requireAuth, async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      // 🆕 INCREMENT VIEW COUNT
      await storage.incrementOfferViewCount(offer.id);

      const videos = await storage.getOfferVideos(offer.id);
      const company = await storage.getCompanyProfileById(offer.companyId);

      // 🆕 GET OFFER STATS
      const activeCreatorsCount = await storage.getActiveCreatorsCountForOffer(offer.id);
      const clickStats = await storage.getOfferClickStats(offer.id);

      res.json({
        ...offer,
        videos,
        company,
        activeCreatorsCount,
        totalClicks: clickStats.totalClicks,
        uniqueClicks: clickStats.uniqueClicks,
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get reviews for an offer (public endpoint)
  app.get("/api/offers/:id/reviews", async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      // Get reviews for the company that owns this offer
      const reviews = await storage.getReviewsByCompany(offer.companyId);

      // Filter out hidden reviews for non-admin users
      const visibleReviews = reviews.filter(review => !review.isHidden);

      // Fetch creator records for each review. `username` + `profileImageUrl`
      // live on `users`; `creatorProfiles` only carries bio/socials/city.
      const reviewsWithCreators = await Promise.all(
        visibleReviews.map(async (review) => {
          const creatorUser = await storage.getUser(review.creatorId);
          if (!creatorUser) return { ...review, creator: null };
          const displayName =
            [creatorUser.firstName, creatorUser.lastName].filter(Boolean).join(" ") ||
            creatorUser.username;
          return {
            ...review,
            creator: {
              displayName,
              username: creatorUser.username,
              profilePhotoUrl: creatorUser.profileImageUrl,
            },
          };
        })
      );

      res.json(reviewsWithCreators);
    } catch (error: any) {
      console.error('[Reviews] Error fetching offer reviews:', error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/offers", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(403).json({ error: "Company profile not found" });
      }

      // DEBUG: Log what frontend is sending
      console.log('[CREATE OFFER] Received from frontend:', {
        minimumFollowers: req.body.minimumFollowers,
        allowedPlatforms: req.body.allowedPlatforms,
        geographicRestrictions: req.body.geographicRestrictions,
        ageRestriction: req.body.ageRestriction,
        contentStyleRequirements: req.body.contentStyleRequirements?.substring(0, 50),
        brandSafetyRequirements: req.body.brandSafetyRequirements?.substring(0, 50),
      });

      const validated = createOfferSchema.parse(req.body);

      // DEBUG: Log what Zod validated
      console.log('[CREATE OFFER] After Zod validation:', {
        minimumFollowers: validated.minimumFollowers,
        allowedPlatforms: validated.allowedPlatforms,
        geographicRestrictions: validated.geographicRestrictions,
        ageRestriction: validated.ageRestriction,
        contentStyleRequirements: validated.contentStyleRequirements?.substring(0, 50),
        brandSafetyRequirements: validated.brandSafetyRequirements?.substring(0, 50),
      });

      // Don't normalize featured image URLs - keep the full Cloudinary URL for proper display
      const featuredImagePath = validated.featuredImageUrl;

      // Always create offers as "draft" first
      // Offers are submitted for review via POST /api/offers/:id/submit-for-review
      const offer = await storage.createOffer({
        ...validated,
        featuredImageUrl: featuredImagePath,
        companyId: companyProfile.id,
        status: 'draft',
      });

      // Note: Admin notification happens when offer is submitted for review
      // via POST /api/offers/:id/submit-for-review endpoint

      res.json(offer);
    } catch (error: any) {
      if (error instanceof z.ZodError || error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('[POST /api/offers] Error creating offer:', error);
      res.status(500).json({ error: error.message || "Failed to create offer" });
    }
  });

  app.put("/api/offers/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Debug: Log received payload
      console.log('[PUT /api/offers/:id] Received payload:', JSON.stringify(req.body, null, 2));

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      const validated = insertOfferSchema.partial().parse(req.body);

      // Debug: Log validated data
      console.log('[PUT /api/offers/:id] Validated data:', JSON.stringify(validated, null, 2));

      // Don't normalize featured image URLs - keep the full Cloudinary URL for proper display
      // No ACL normalization needed for Cloudinary URLs

      const updatedOffer = await storage.updateOffer(offerId, validated);

      // Debug: Log updated offer
      console.log('[PUT /api/offers/:id] Updated offer:', JSON.stringify(updatedOffer, null, 2));

      res.json(updatedOffer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      console.error('[PUT /api/offers/:id] Error:', error);
      res.status(500).json({ error: error.message || "Failed to update offer" });
    }
  });

  // DELETE offer endpoint - FIXED
  app.delete("/api/offers/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check for active applications
      const applications = await storage.getApplicationsByOffer(offerId);
      const hasActiveApplications = applications.some(
        app => app.status === 'active' || app.status === 'approved'
      );

      if (hasActiveApplications) {
        return res.status(400).json({
          error: "Cannot delete offer with active applications",
          message: "This offer has active applications. Please complete or reject them first."
        });
      }

      // Delete assets from cloud storage before deleting the offer
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();

      // Delete featured image if exists
      if (offer.featuredImageUrl) {
        try {
          const imagePublicId = objectStorage.extractPublicIdFromUrl(offer.featuredImageUrl);
          if (imagePublicId) {
            await objectStorage.deleteResource(imagePublicId, 'image');
            console.log(`[Offer Delete] Deleted featured image: ${imagePublicId}`);
          }
        } catch (error: any) {
          console.error(`[Offer Delete] Failed to delete featured image: ${error.message}`);
        }
      }

      // Delete all offer videos and their thumbnails
      const offerVideos = await storage.getOfferVideos(offerId);
      for (const video of offerVideos) {
        if (video.videoUrl) {
          try {
            const videoPublicId = objectStorage.extractPublicIdFromUrl(video.videoUrl);
            if (videoPublicId) {
              await objectStorage.deleteResource(videoPublicId, 'video');
              console.log(`[Offer Delete] Deleted video: ${videoPublicId}`);
            }
          } catch (error: any) {
            console.error(`[Offer Delete] Failed to delete video ${video.id}: ${error.message}`);
          }
        }
        if (video.thumbnailUrl) {
          try {
            const thumbnailPublicId = objectStorage.extractPublicIdFromUrl(video.thumbnailUrl);
            if (thumbnailPublicId) {
              await objectStorage.deleteResource(thumbnailPublicId, 'image');
              console.log(`[Offer Delete] Deleted thumbnail: ${thumbnailPublicId}`);
            }
          } catch (error: any) {
            console.error(`[Offer Delete] Failed to delete thumbnail: ${error.message}`);
          }
        }
      }

      // Delete the offer (cascades to videos, applications, favorites per DB constraints)
      await storage.deleteOffer(offerId);

      res.json({ success: true, message: "Offer deleted successfully" });
    } catch (error: any) {
      console.error('[DELETE /api/offers/:id] Error:', error);
      res.status(500).json({ error: error.message || "Failed to delete offer" });
    }
  });

  // Request offer deletion (requires admin approval)
  app.post("/api/offers/:id/request-delete", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;
      const { reason } = req.body;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if there's already a pending action
      if (offer.pendingAction) {
        return res.status(400).json({
          error: "Pending action exists",
          message: `This offer already has a pending ${offer.pendingAction} request.`
        });
      }

      // Request deletion
      const updatedOffer = await storage.requestOfferDelete(offerId, reason || "No reason provided");

      // Notify all admins about the delete request
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await storage.createNotification({
          userId: admin.id,
          type: 'offer_delete_requested',
          title: 'Offer Deletion Request',
          message: `Company "${companyProfile.tradeName || companyProfile.legalName}" has requested to delete offer "${offer.title}". Reason: ${reason || "No reason provided"}`,
          linkUrl: `/admin/offers/${offerId}`,
          metadata: { offerId, companyId: companyProfile.id, reason },
        });
      }

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/request-delete] Error:', error);
      res.status(500).json({ error: error.message || "Failed to request offer deletion" });
    }
  });

  // Request offer suspension (requires admin approval)
  app.post("/api/offers/:id/request-suspend", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;
      const { reason } = req.body;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if already paused
      if (offer.status === 'paused') {
        return res.status(400).json({
          error: "Already suspended",
          message: "This offer is already suspended."
        });
      }

      // Check if there's already a pending action
      if (offer.pendingAction) {
        return res.status(400).json({
          error: "Pending action exists",
          message: `This offer already has a pending ${offer.pendingAction} request.`
        });
      }

      // Request suspension
      const updatedOffer = await storage.requestOfferSuspend(offerId, reason || "No reason provided");

      // Notify all admins about the suspend request
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await storage.createNotification({
          userId: admin.id,
          type: 'offer_suspend_requested',
          title: 'Offer Suspension Request',
          message: `Company "${companyProfile.tradeName || companyProfile.legalName}" has requested to suspend offer "${offer.title}". Reason: ${reason || "No reason provided"}`,
          linkUrl: `/admin/offers/${offerId}`,
          metadata: { offerId, companyId: companyProfile.id, reason },
        });
      }

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/request-suspend] Error:', error);
      res.status(500).json({ error: error.message || "Failed to request offer suspension" });
    }
  });

  // Cancel pending action request
  app.post("/api/offers/:id/cancel-pending-action", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if there's a pending action to cancel
      if (!offer.pendingAction) {
        return res.status(400).json({
          error: "No pending action",
          message: "This offer doesn't have a pending action to cancel."
        });
      }

      // Cancel the pending action
      const updatedOffer = await storage.cancelOfferPendingAction(offerId);

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/cancel-pending-action] Error:', error);
      res.status(500).json({ error: error.message || "Failed to cancel pending action" });
    }
  });

  // Submit offer for review - validates 6-12 video requirement
  app.post("/api/offers/:id/submit-for-review", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if offer is in draft status
      if (offer.status !== 'draft') {
        return res.status(400).json({
          error: "Invalid status",
          message: "Only draft offers can be submitted for review"
        });
      }

      // CRITICAL: Validate 6-12 video requirement
      const videos = await storage.getOfferVideos(offerId);
      if (videos.length < 6) {
        return res.status(400).json({
          error: "Insufficient videos",
          message: `Offers must have at least 6 example videos. Currently: ${videos.length}/6`
        });
      }

      if (videos.length > 12) {
        return res.status(400).json({
          error: "Too many videos",
          message: `Offers can have maximum 12 example videos. Currently: ${videos.length}/12`
        });
      }

      // Update offer status to pending_review
      const updatedOffer = await storage.updateOffer(offerId, {
        status: 'pending_review'
      });

      // Notify admins about new offer pending review
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await notificationService.sendNotification(
          admin.id,
          'new_application',
          'New Offer Pending Review',
          `${companyProfile.legalName || companyProfile.tradeName} has submitted offer "${offer.title}" for review.`,
          {
            userName: admin.firstName || admin.username,
            companyName: companyProfile.legalName || companyProfile.tradeName || '',
            offerTitle: offer.title,
            offerId: offer.id,
          }
        );
      }
      console.log(`[Submit for Review] Notified admins about offer ${offer.id} (${videos.length} videos)`);

      res.json({
        success: true,
        message: "Offer submitted for review successfully",
        offer: updatedOffer,
        videoCount: videos.length
      });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/submit-for-review] Error:', error);
      res.status(500).json({ error: error.message || "Failed to submit offer for review" });
    }
  });

  // Priority Listing Purchase endpoint
  app.post("/api/offers/:id/purchase-priority", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if offer is approved
      if (offer.status !== 'approved') {
        return res.status(400).json({
          error: "Invalid status",
          message: "Only approved offers can be made priority listings"
        });
      }

      // Check if already has active priority listing
      if (offer.featuredOnHomepage && offer.priorityExpiresAt) {
        const now = new Date();
        if (new Date(offer.priorityExpiresAt) > now) {
          return res.status(400).json({
            error: "Already featured",
            message: "This offer already has an active priority listing"
          });
        }
      }

      // Get priority listing settings from platform_settings
      const feeSettings = await storage.getPlatformSetting('priority_listing_fee');
      const durationSettings = await storage.getPlatformSetting('priority_listing_duration_days');

      const priorityFee = feeSettings ? parseFloat(feeSettings.value) : 199;
      const priorityDuration = durationSettings ? parseInt(durationSettings.value) : 30;

      // In a real implementation, you would:
      // 1. Create Stripe Payment Intent
      // 2. Process payment via Stripe
      // 3. Only update offer if payment succeeds

      // For now, simulate successful payment processing
      const now = new Date();
      const expiresAt = new Date(now.getTime() + priorityDuration * 24 * 60 * 60 * 1000);

      // Update offer with priority listing
      const updatedOffer = await storage.updateOffer(offerId, {
        featuredOnHomepage: true,
        priorityExpiresAt: expiresAt,
        priorityPurchasedAt: now,
      });

      // Send confirmation notification
      await notificationService.sendNotification(
        userId,
        'system_announcement',
        'Priority Listing Activated!',
        `Your offer "${offer.title}" is now a priority listing until ${expiresAt.toLocaleDateString()}.`,
        {
          linkUrl: `/company/offers/${offer.id}`,
          offerId: offer.id,
          offerTitle: offer.title,
        }
      );

      res.json({
        success: true,
        message: "Priority listing purchased successfully",
        offer: updatedOffer,
        expiresAt: expiresAt,
        fee: priorityFee,
      });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/purchase-priority] Error:', error);
      res.status(500).json({ error: error.message || "Failed to purchase priority listing" });
    }
  });

  // Priority Listing Renewal endpoint
  app.post("/api/offers/:id/renew-priority", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const offerId = req.params.id;

      // Verify ownership
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized: You don't own this offer" });
      }

      // Check if offer is approved
      if (offer.status !== 'approved') {
        return res.status(400).json({
          error: "Invalid status",
          message: "Only approved offers can have priority listings"
        });
      }

      // Get priority listing settings
      const feeSettings = await storage.getPlatformSetting('priority_listing_fee');
      const durationSettings = await storage.getPlatformSetting('priority_listing_duration_days');

      const priorityFee = feeSettings ? parseFloat(feeSettings.value) : 199;
      const priorityDuration = durationSettings ? parseInt(durationSettings.value) : 30;

      // Calculate new expiration date
      const now = new Date();
      let newExpiresAt: Date;

      if (offer.priorityExpiresAt && new Date(offer.priorityExpiresAt) > now) {
        // Extend from current expiration date
        newExpiresAt = new Date(new Date(offer.priorityExpiresAt).getTime() + priorityDuration * 24 * 60 * 60 * 1000);
      } else {
        // Start from now
        newExpiresAt = new Date(now.getTime() + priorityDuration * 24 * 60 * 60 * 1000);
      }

      // Update offer with renewed priority listing
      const updatedOffer = await storage.updateOffer(offerId, {
        featuredOnHomepage: true,
        priorityExpiresAt: newExpiresAt,
        priorityPurchasedAt: now,
      });

      // Send confirmation notification
      await notificationService.sendNotification(
        userId,
        'system_announcement',
        'Priority Listing Renewed!',
        `Your priority listing for "${offer.title}" has been extended until ${newExpiresAt.toLocaleDateString()}.`,
        {
          linkUrl: `/company/offers/${offer.id}`,
          offerId: offer.id,
          offerTitle: offer.title,
        }
      );

      res.json({
        success: true,
        message: "Priority listing renewed successfully",
        offer: updatedOffer,
        expiresAt: newExpiresAt,
        fee: priorityFee,
      });
    } catch (error: any) {
      console.error('[POST /api/offers/:id/renew-priority] Error:', error);
      res.status(500).json({ error: error.message || "Failed to renew priority listing" });
    }
  });

  // Applications routes
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getApplicationsByCreator(userId);

      // Fetch offer details for each application
      const applicationsWithOffers = await Promise.all(
        applications.map(async (app) => {
          const offer = await storage.getOffer(app.offerId);
          const company = offer ? await storage.getCompanyProfileById(offer.companyId) : null;
          return { ...app, offer: offer ? { ...offer, company } : null };
        })
      );

      res.json(applicationsWithOffers);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get applications" });
    }
  });

  // \u2705 NEW: Get single application by ID
  app.get("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applicationId = req.params.id;

      // Get the application
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify the user owns this application
      if (application.creatorId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Fetch offer and company details
      const offer = await storage.getOffer(application.offerId);
      const company = offer ? await storage.getCompanyProfileById(offer.companyId) : null;

      res.json({
        ...application,
        offer: offer ? { ...offer, company } : null
      });
    } catch (error: any) {
      console.error('[GET /api/applications/:id] Error:', error);
      res.status(500).json({ error: error.message || "Failed to get application" });
    }
  });

  // QR Code generation endpoint for tracking links
  app.get("/api/applications/:id/qrcode", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applicationId = req.params.id;

      // Get the application
      const application = await storage.getApplication(applicationId);

      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify the user owns this application
      if (application.creatorId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check if application is approved and has a tracking link
      if (application.status !== 'approved' && application.status !== 'active') {
        return res.status(400).json({
          error: "Application not approved",
          message: "QR codes are only available for approved applications"
        });
      }

      if (!application.trackingLink) {
        return res.status(400).json({
          error: "No tracking link",
          message: "This application doesn't have a tracking link yet"
        });
      }

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(application.trackingLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({
        success: true,
        qrCodeDataUrl: qrCodeDataUrl,
        trackingLink: application.trackingLink
      });
    } catch (error: any) {
      console.error('[GET /api/applications/:id/qrcode] Error:', error);
      res.status(500).json({ error: error.message || "Failed to generate QR code" });
    }
  });

  app.post("/api/applications", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // ACCOUNT TYPE RESTRICTION: Check if creator has at least one video platform
      const creatorProfile = await storage.getCreatorProfile(userId);
      const hasVideoPlatform = creatorProfile && (
        creatorProfile.youtubeUrl ||
        creatorProfile.tiktokUrl ||
        creatorProfile.instagramUrl
      );

      if (!hasVideoPlatform) {
        return res.status(400).json({
          error: "Video platform required",
          message: "You must add at least one video platform (YouTube, TikTok, or Instagram) to your profile before applying to offers. Please complete your profile setup first."
        });
      }

      const validated = insertApplicationSchema.parse({
        ...req.body,
        creatorId: userId,
        status: 'pending',
      });

      // 🆕 CHECK IF CREATOR HAS ALREADY APPLIED TO THIS OFFER
      const existingApplication = await storage.getExistingApplication(userId, validated.offerId);
      if (existingApplication) {
        return res.status(400).json({
          error: "You have already applied to this offer. Only one application per offer is allowed."
        });
      }

      const application = await storage.createApplication(validated);

      // 🆕 GET OFFER, CREATOR, AND COMPANY INFO FOR NOTIFICATION
      const offer = await storage.getOffer(application.offerId);
      const creator = await storage.getUserById(application.creatorId);
      
      if (offer && creator) {
        const company = await storage.getCompanyProfileById(offer.companyId);
        
        if (company) {
          // 🆕 SEND NOTIFICATION TO COMPANY
          await notificationService.sendNotification(
            company.userId,
            'new_application',
            'New Application Received! 📩',
            `${creator.firstName || creator.username} has applied to your offer "${offer.title}". Review their application now.`,
            {
              userName: company.contactName || 'there',
              offerTitle: offer.title,
              applicationId: application.id,
            }
          );
          console.log(`[Notification] Sent new application notification to company ${company.legalName}`);
        }
      }

      // Schedule auto-approval for 7 minutes later
      const autoApprovalTime = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from now
      await storage.setAutoApprovalTime(application.id, autoApprovalTime);
      console.log(`[Auto-Approval] Scheduled auto-approval for application ${application.id} at ${autoApprovalTime.toISOString()}`);

      res.json({ ...application, autoApprovalScheduledAt: autoApprovalTime });
    } catch (error: any) {
      console.error('[POST /api/applications] Error:', error);
      res.status(500).json({ error: error.message || "Failed to create application" });
    }
  });

  app.put("/api/applications/:id/approve", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Generate tracking link and code (short 8-character alphanumeric code)
      const trackingCode = generateShortTrackingCode();
      const port = process.env.PORT || 3000;
      const baseURL = process.env.BASE_URL || `http://localhost:${port}`;
      const trackingLink = `${baseURL}/go/${trackingCode}`;

      const approved = await storage.approveApplication(
        application.id,
        trackingLink,
        trackingCode
      );

      // 🆕 GET OFFER AND CREATOR INFO FOR NOTIFICATION
      const offer = await storage.getOffer(application.offerId);
      const creator = await storage.getUserById(application.creatorId);

      // 🆕 SEND NOTIFICATION TO CREATOR
      if (offer && creator) {
        await notificationService.sendNotification(
          application.creatorId,
          'application_status_change',
          'Your application has been approved! \u1F389',
          `Congratulations! Your application for "${offer.title}" has been approved. You can now start promoting this offer.`,
          {
            userName: creator.firstName || creator.username,
            offerTitle: offer.title,
            trackingLink: trackingLink,
            trackingCode: trackingCode,
            applicationId: application.id,
            applicationStatus: 'approved',
          }
        );
        console.log(`[Notification] Sent approval notification to creator ${creator.username}`);
      }

      res.json(approved);
    } catch (error: any) {
      console.error('[Approve Application] Error:', error);
      res.status(500).json({ error: error.message || "Failed to approve application" });
    }
  });

  app.put("/api/applications/:id/reject", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify the application belongs to one of the company's offers
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      // Verify ownership
      if (offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const rejected = await storage.updateApplication(application.id, {
        status: 'rejected',
      });

      // 🆕 GET CREATOR INFO FOR NOTIFICATION
      const creator = await storage.getUserById(application.creatorId);

      // 🆕 SEND NOTIFICATION TO CREATOR
      if (creator) {
        await notificationService.sendNotification(
          application.creatorId,
          'application_status_change',
          'Application Update',
          `Your application for "${offer.title}" was not approved at this time. Don't worry - there are many other great offers available!`,
          {
            userName: creator.firstName || creator.username,
            offerTitle: offer.title,
            linkUrl: `/browse`,
            applicationStatus: 'rejected',
          }
        );
        console.log(`[Notification] Sent rejection notification to creator ${creator.username}`);
      }

      res.json(rejected);
    } catch (error: any) {
      console.error('[Reject Application] Error:', error);
      res.status(500).json({ error: error.message || "Failed to reject application" });
    }
  });

  app.post("/api/applications/:id/complete", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Verify the application belongs to one of the company's offers
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      // Compare offer.companyId against companyProfile.id (not userId)
      if (offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify application is approved before marking complete
      if (application.status !== 'approved' && application.status !== 'active') {
        return res.status(400).json({ error: "Only approved applications can be marked as complete" });
      }

      const completed = await storage.completeApplication(application.id);

      // Automatically create payment when work is completed
      // Calculate payment amounts based on offer commission
      let grossAmount = 0;
      // Calculate gross amount based on configured commission type
      // The canonical commission types are defined as: 'per_sale', 'per_lead', 'per_click', 'monthly_retainer', 'hybrid'
      // If it's a per_sale type and a commissionPercentage is present, use percentage logic
      if (offer.commissionType === 'per_sale' && offer.commissionPercentage) {
        // For percentage-based, use a base amount (this should come from actual sale data)
        // For now, we'll use a placeholder - in production, this would come from tracked conversions
        const baseAmount = parseFloat(req.body.saleAmount || '100');
        grossAmount = baseAmount * (parseFloat(offer.commissionPercentage.toString()) / 100);
      } else if (offer.commissionType !== 'per_sale' && offer.commissionAmount) {
        // For non per_sale commission types we expect a fixed amount (per_click, per_lead, monthly_retainer, etc.)
        grossAmount = parseFloat(offer.commissionAmount.toString());
      }

      // Calculate fees with per-company override support (Section 4.3.H)
      const fees = await calculateFees(grossAmount, companyProfile.id);

      // Create payment record
      const payment = await storage.createPayment({
        applicationId: application.id,
        creatorId: application.creatorId,
        companyId: companyProfile.id,
        offerId: offer.id,
        grossAmount: fees.grossAmount.toFixed(2),
        platformFeeAmount: fees.platformFeeAmount.toFixed(2),
        stripeFeeAmount: fees.stripeFeeAmount.toFixed(2),
        netAmount: fees.netAmount.toFixed(2),
        status: 'pending',
        description: `Payment for ${offer.title}`,
      });

      const feeLabel = fees.isCustomFee ? `Custom ${formatFeePercentage(fees.platformFeePercentage)}` : formatFeePercentage(DEFAULT_PLATFORM_FEE_PERCENTAGE);
      console.log(`[Payment] Created payment ${payment.id} for application ${application.id} - Platform Fee: ${feeLabel}`);

      // Send notification to creator
      const creator = await storage.getUserById(application.creatorId);
      if (creator) {
        // \u2705 FIXED: Added paymentId to notification
        await notificationService.sendNotification(
          application.creatorId,
          'payment_pending',
          'Work Completed - Payment Pending \u1F4B0',
          `Your work for "${offer.title}" has been marked as complete! Payment of CA$${fees.netAmount.toFixed(2)} is pending company approval.`,
          {
            userName: creator.firstName || creator.username,
            offerTitle: offer.title,
            amount: `CA$${fees.netAmount.toFixed(2)}`,
            paymentId: payment.id, // \u2705 ADDED
          }
        );
      }

      // Send notification to admins about new payment to process
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await notificationService.sendNotification(
          admin.id,
          'payment_pending',
          'New Affiliate Payment Ready for Processing',
          `A payment of CA$${fees.netAmount.toFixed(2)} for creator ${creator?.username || 'Unknown'} on "${offer.title}" is ready for processing.`,
          {
            userName: admin.firstName || admin.username,
            offerTitle: offer.title,
            amount: `CA$${fees.netAmount.toFixed(2)}`,
            paymentId: payment.id,
            linkUrl: `/payments/${payment.id}`, // Link to specific payment detail page
          }
        );
      }
      console.log(`[Notification] Notified admins about new affiliate payment ${payment.id}`);

      // Check if this is the first completed campaign between this company and creator
      // to show review prompt
      const allApplications = await storage.getApplicationsByCreator(application.creatorId);
      const completedApplicationsWithThisCompany = allApplications.filter(app => {
        // Get all completed applications with offers from this company
        return app.status === 'completed' && app.completedAt;
      });

      // Get the offers for these applications to check if they're from the same company
      let completedWithThisCompanyCount = 0;
      for (const app of completedApplicationsWithThisCompany) {
        const appOffer = await storage.getOffer(app.offerId);
        if (appOffer && appOffer.companyId === offer.companyId) {
          completedWithThisCompanyCount++;
        }
      }

      // Check if creator has already reviewed this company
      const existingReviews = await storage.getReviewsByCreatorAndCompany(
        application.creatorId,
        offer.companyId
      );

      const shouldPromptReview = completedWithThisCompanyCount === 1 && existingReviews.length === 0;

      res.json({
        application: completed,
        payment,
        promptReview: shouldPromptReview,
        companyId: offer.companyId,
        companyName: companyProfile.legalName || companyProfile.tradeName,
      });
    } catch (error: any) {
      console.error('[Complete Application] Error:', error);
      res.status(500).json({ error: error.message || "Failed to complete application" });
    }
  });

  app.get("/api/company/applications", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      console.log('[/api/company/applications] userId:', userId);
      const companyProfile = await storage.getCompanyProfile(userId);
      console.log('[/api/company/applications] companyProfile:', companyProfile);
      if (!companyProfile) {
        console.log('[/api/company/applications] No company profile found for user:', userId);
        // Return empty array instead of 404 to allow page to render properly
        return res.json([]);
      }

      // Pass company profile ID, not user ID
      const applications = await storage.getApplicationsByCompany(companyProfile.id);
      console.log('[/api/company/applications] Found', applications.length, 'applications');
      res.json(applications);
    } catch (error: any) {
      console.error('[/api/company/applications] Error:', error);
      res.status(500).json({ error: error.message || "Failed to get company applications" });
    }
  });

  app.patch("/api/company/applications/:id/status", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const { status } = req.body as { status?: string };
      const allowedStatuses = ['pending', 'approved', 'active', 'paused', 'completed', 'rejected'];

      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided' });
      }

      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).json({ error: 'Company profile not found' });
      }

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const offer = await storage.getOffer(application.offerId);
      if (!offer || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updated = await storage.updateApplication(application.id, { status: status as any });
      res.json(updated);
    } catch (error: any) {
      console.error('[Update Application Status] Error:', error);
      res.status(500).json({ error: error.message || "Failed to update application status" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const favorites = await storage.getFavoritesByCreator(userId);

      // Fetch offer details for each favorite
      const favoritesWithOffers = await Promise.all(
        favorites.map(async (fav) => {
          const offer = await storage.getOffer(fav.offerId);
          const company = offer ? await storage.getCompanyProfileById(offer.companyId) : null;
          return { ...fav, offer: offer ? { ...offer, company } : null };
        })
      );

      res.json(favoritesWithOffers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/favorites/:offerId", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const isFav = await storage.isFavorite(userId, req.params.offerId);
      res.json(isFav);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/favorites", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertFavoriteSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const favorite = await storage.createFavorite(validated);
      res.json(favorite);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/favorites/:offerId", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.deleteFavorite(userId, req.params.offerId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Saved searches routes
  const savedSearchUpdateSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    filters: savedSearchFiltersSchema.optional(),
  });

  app.get("/api/saved-searches", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const savedSearches = await storage.getSavedSearchesByCreator(userId);
      res.json(savedSearches);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/saved-searches", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertSavedSearchSchema
        .omit({ creatorId: true })
        .parse({ ...req.body });

      const savedSearch = await storage.createSavedSearch({ ...validated, creatorId: userId });
      res.json(savedSearch);
    } catch (error: any) {
      console.error("[Create Saved Search] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid saved search payload" });
      }
      res.status(500).send(error.message);
    }
  });

  app.put("/api/saved-searches/:id", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const updates = savedSearchUpdateSchema.parse(req.body);

      const existing = await storage.getSavedSearch(req.params.id, userId);
      if (!existing) {
        return res.status(404).json({ error: "Saved search not found" });
      }

      const updated = await storage.updateSavedSearch(req.params.id, userId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Saved search not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("[Update Saved Search] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid saved search payload" });
      }
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/saved-searches/:id", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const existing = await storage.getSavedSearch(req.params.id, userId);
      if (!existing) {
        return res.status(404).json({ error: "Saved search not found" });
      }

      await storage.deleteSavedSearch(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Saved Search] Error:", error);
      res.status(500).send(error.message);
    }
  });

  // Tracking & Redirect System
  app.get("/go/:code", async (req, res) => {
    try {
      const trackingCode = req.params.code;
      console.log(`[Tracking] Received tracking code: ${trackingCode}`);

      // Look up application by tracking code
      const application = await storage.getApplicationByTrackingCode(trackingCode);
      if (!application) {
        console.error(`[Tracking] Application not found for tracking code: ${trackingCode}`);
        return res.status(404).send("Tracking link not found");
      }

      console.log(`[Tracking] Found application: ${application.id}, status: ${application.status}`);

      // Get offer details for product URL
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).send("Offer not found");
      }

      // Extract client IP (normalize for proxies/load balancers)
      let clientIp = 'unknown';
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        // X-Forwarded-For can be comma-separated, take first (client) IP
        const forwardedIpValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        const ips = String(forwardedIpValue).split(',').map(ip => ip.trim());
        clientIp = ips[0];
      } else if (req.socket.remoteAddress) {
        clientIp = req.socket.remoteAddress;
      } else if (req.ip) {
        clientIp = req.ip;
      }

      // Clean IPv6-mapped IPv4 addresses (::ffff:192.168.1.1 → 192.168.1.1)
      if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }

      const userAgent = req.headers['user-agent'] || 'unknown';
      const refererRaw = req.headers['referer'] || req.headers['referrer'];
      const referer = Array.isArray(refererRaw) ? refererRaw[0] : (refererRaw || 'direct');

      // Parse UTM parameters from query string
      const utmSource = req.query.utm_source as string | undefined;
      const utmMedium = req.query.utm_medium as string | undefined;
      const utmCampaign = req.query.utm_campaign as string | undefined;
      const utmTerm = req.query.utm_term as string | undefined;
      const utmContent = req.query.utm_content as string | undefined;

      // Perform fraud detection check
      const fraudCheck = await checkClickFraud(clientIp, userAgent, referer, application.id);

      // Log fraud detection result
      if (!fraudCheck.isValid) {
        logFraudDetection(trackingCode, clientIp, fraudCheck);
      }

      // Log the click asynchronously (don't block redirect)
      // Note: We still log even if fraud is detected, but mark it with fraud score
      console.log(`[Tracking] Logging click for application ${application.id}, IP: ${clientIp}, fraud score: ${fraudCheck.fraudScore}`);
      storage.logTrackingClick(application.id, {
        ip: clientIp,
        userAgent,
        referer,
        timestamp: new Date(),
        fraudScore: fraudCheck.fraudScore,
        fraudFlags: fraudCheck.flags.join(','),
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      }).then(() => {
        console.log(`[Tracking] Successfully logged click for application ${application.id}`);
      }).catch(err => {
        console.error('[Tracking] Error logging click:', err);
        console.error('[Tracking] Error stack:', err.stack);
      });

      // Always redirect to maintain good UX
      // Even fraudulent clicks get redirected (but won't count toward analytics if fraud score > 50)
      res.redirect(302, offer.productUrl);
    } catch (error: any) {
      console.error('[Tracking] Error:', error);
      res.status(500).send("Internal server error");
    }
  });

  // Record conversion (companies can report sales/conversions)
  app.post("/api/conversions/:applicationId", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { saleAmount } = req.body;

      // Verify the application belongs to an offer owned by this company
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile || offer.companyId !== companyProfile.id) {
        return res.status(403).json({ error: "Forbidden: You don't own this offer" });
      }

      // Record the conversion and calculate earnings
      await storage.recordConversion(applicationId, saleAmount ? parseFloat(saleAmount) : undefined);

      res.json({
        success: true,
        message: "Conversion recorded successfully"
      });
    } catch (error: any) {
      console.error('[Record Conversion] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Analytics routes
  app.get("/api/analytics", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.id;
      const userRole = user.role;
      const dateRange = (req.query.range as string) || '30d';
      const applicationId = req.query.applicationId as string | undefined;

      // If applicationId is provided, return analytics for that specific application
      if (applicationId) {
        const application = await storage.getApplication(applicationId);
        if (!application) {
          return res.status(404).send("Application not found");
        }

        // Verify the user has access to this application
        if (userRole === 'creator' && application.creatorId !== userId) {
          return res.status(403).send("Access denied");
        }
        if (userRole === 'company') {
          const offer = await storage.getOffer(application.offerId);
          const companyProfile = await storage.getCompanyProfile(userId);
          if (!offer || !companyProfile || offer.companyId !== companyProfile.id) {
            return res.status(403).send("Access denied");
          }
        }

        // Get analytics for this specific application
        const appAnalytics = await storage.getAnalyticsByApplication(applicationId);
        const offer = await storage.getOffer(application.offerId);
        const companyProfile = offer ? await storage.getCompanyProfile(offer.companyId) : null;

        // Calculate totals (including unique clicks)
        const totals = appAnalytics && appAnalytics.length > 0
          ? appAnalytics.reduce((acc: any, curr: any) => ({
              clicks: acc.clicks + (Number(curr.clicks) || 0),
              uniqueClicks: acc.uniqueClicks + (Number(curr.uniqueClicks) || 0),
              conversions: acc.conversions + (Number(curr.conversions) || 0),
              earnings: acc.earnings + (Number(curr.earnings) || 0),
            }), { clicks: 0, uniqueClicks: 0, conversions: 0, earnings: 0 })
          : { clicks: 0, uniqueClicks: 0, conversions: 0, earnings: 0 };

        // Get time series data
        const chartData = await storage.getAnalyticsTimeSeriesByApplication(applicationId, dateRange);

        const stats = {
          totalEarnings: totals.earnings,
          totalClicks: totals.clicks,
          uniqueClicks: totals.uniqueClicks,
          conversions: totals.conversions,
          conversionRate: totals.clicks > 0
            ? ((totals.conversions / totals.clicks) * 100).toFixed(1)
            : 0,
          activeOffers: 1,
          chartData: chartData,
          offerTitle: offer?.title,
          companyName: companyProfile?.legalName || companyProfile?.tradeName,
          offerBreakdown: [], // Empty for single application view
        };

        return res.json(stats);
      }

      if (userRole === 'company') {
        // Company analytics
        const [
          analyticsData,
          chartData,
          applicationsTimeline,
          conversionFunnel,
          acquisitionSources,
          geography,
        ] = await Promise.all([
          storage.getAnalyticsByCompany(userId),
          storage.getAnalyticsTimeSeriesByCompany(userId, dateRange),
          storage.getApplicationsTimeSeriesByCompany(userId, dateRange),
          storage.getConversionFunnelByCompany(userId),
          storage.getCreatorAcquisitionSourcesByCompany(userId),
          storage.getCreatorGeographyByCompany(userId),
        ]);

        // Get offer breakdown for company
        const companyProfile = await storage.getCompanyProfile(userId);
        const offerBreakdown: any[] = [];

        if (companyProfile) {
          const companyOffers = await storage.getOffersByCompany(companyProfile.id);

          for (const offer of companyOffers) {
            const offerApplications = await storage.getApplicationsByOffer(offer.id);

            let offerClicks = 0;
            let offerConversions = 0;
            let offerSpent = 0;

            for (const app of offerApplications) {
              const appAnalytics = await storage.getAnalyticsByApplication(app.id);
              if (appAnalytics && appAnalytics.length > 0) {
                const totals = appAnalytics.reduce((acc: any, curr: any) => ({
                  clicks: acc.clicks + (Number(curr.clicks) || 0),
                  conversions: acc.conversions + (Number(curr.conversions) || 0),
                  earnings: acc.earnings + (Number(curr.earnings) || 0),
                }), { clicks: 0, conversions: 0, earnings: 0 });

                offerClicks += totals.clicks;
                offerConversions += totals.conversions;
                offerSpent += totals.earnings;
              }
            }

            if (offerClicks > 0 || offerConversions > 0 || offerSpent > 0) {
              offerBreakdown.push({
                offerId: offer.id,
                offerTitle: offer.title,
                companyName: companyProfile.legalName || companyProfile.tradeName || 'Unknown Company',
                clicks: offerClicks,
                conversions: offerConversions,
                earnings: offerSpent,
              });
            }
          }
        }

        const stats = {
          totalEarnings: analyticsData?.totalSpent || 0,
          totalSpent: analyticsData?.totalSpent || 0,
          affiliateSpent: analyticsData?.affiliateSpent || 0,
          retainerSpent: analyticsData?.retainerSpent || 0,
          activeOffers: analyticsData?.activeOffers || 0,
          activeCreators: analyticsData?.activeCreators || 0,
          totalClicks: analyticsData?.totalClicks || 0,
          uniqueClicks: analyticsData?.uniqueClicks || 0,
          conversions: analyticsData?.conversions || 0,
          conversionRate: analyticsData?.totalClicks > 0
            ? ((analyticsData?.conversions || 0) / analyticsData.totalClicks * 100).toFixed(1)
            : 0,
          chartData: chartData,
          offerBreakdown: offerBreakdown,
          applicationsTimeline,
          conversionFunnel,
          acquisitionSources,
          geography,
        };

        res.json(stats);
      } else {
        // Creator analytics
        const analyticsData = await storage.getAnalyticsByCreator(userId);
        const applications = await storage.getApplicationsByCreator(userId);
        const chartData = await storage.getAnalyticsTimeSeriesByCreator(userId, dateRange);

        // Get offer breakdown for creator
        const offerBreakdown: any[] = [];

        for (const app of applications) {
          if (app.status === 'active' || app.status === 'approved') {
            const offer = await storage.getOffer(app.offerId);
            const companyProfile = offer ? await storage.getCompanyProfile(offer.companyId) : null;
            const appAnalytics = await storage.getAnalyticsByApplication(app.id);

            if (appAnalytics && appAnalytics.length > 0) {
              const totals = appAnalytics.reduce((acc: any, curr: any) => ({
                clicks: acc.clicks + (curr.clicks || 0),
                conversions: acc.conversions + (curr.conversions || 0),
                earnings: acc.earnings + (curr.earnings || 0),
              }), { clicks: 0, conversions: 0, earnings: 0 });

              if (totals.clicks > 0 || totals.conversions > 0 || totals.earnings > 0) {
                offerBreakdown.push({
                  offerId: offer?.id,
                  offerTitle: offer?.title || 'Unknown Offer',
                  companyName: companyProfile?.legalName || companyProfile?.tradeName || 'Unknown Company',
                  clicks: totals.clicks,
                  conversions: totals.conversions,
                  earnings: totals.earnings,
                });
              }
            }
          }
        }

        const stats = {
          totalEarnings: analyticsData?.totalEarnings || 0,
          affiliateEarnings: analyticsData?.affiliateEarnings || 0,
          retainerEarnings: analyticsData?.retainerEarnings || 0,
          activeOffers: applications.filter(a => a.status === 'active' || a.status === 'approved').length,
          totalClicks: analyticsData?.totalClicks || 0,
          uniqueClicks: analyticsData?.uniqueClicks || 0,
          conversions: analyticsData?.conversions || 0,
          conversionRate: analyticsData?.totalClicks > 0
            ? ((analyticsData?.conversions || 0) / analyticsData.totalClicks * 100).toFixed(1)
            : 0,
          chartData: chartData,
          offerBreakdown: offerBreakdown,
        };

        res.json(stats);
      }
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/analytics/export/zapier", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const { webhookUrl, payload } = req.body as { webhookUrl?: string; payload?: any };
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).send("Company profile not found");
      }

      if (!webhookUrl || typeof webhookUrl !== 'string' || !/^https?:\/\//i.test(webhookUrl)) {
        return res.status(400).json({ error: 'A valid webhookUrl is required' });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          companyId: companyProfile.id,
          generatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(502).json({
          error: 'Webhook responded with an error',
          status: response.status,
          body: text,
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('[Zapier Export] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Messages routes
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.id;
      const userRole = user.role;
      
      // Get company profile ID if user is a company
      let companyProfileId = null;
      if (userRole === 'company') {
        const companyProfile = await storage.getCompanyProfile(userId);
        companyProfileId = companyProfile?.id;
      }
      
      const conversations = await storage.getConversationsByUser(userId, userRole, companyProfileId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/messages/:conversationId", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const allMessages = await storage.getMessages(req.params.conversationId);
      // Filter out messages deleted for the current user
      const filteredMessages = allMessages.filter(msg => {
        const deletedFor = msg.deletedFor || [];
        return !deletedFor.includes(userId);
      });
      res.json(filteredMessages);
    } catch (error: any) {
      console.error('[GET /api/messages/:conversationId] Error:', error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const message = await storage.createMessage(validated);

      // Send persistent notification to recipient about new message
      const conversation = await storage.getConversation(message.conversationId);
      if (conversation) {
        const isCreatorSender = message.senderId === conversation.creatorId;

        // Get company user ID if recipient is company
        let recipientId: string | null = null;
        if (isCreatorSender && conversation.companyId) {
          const companyProfile = await storage.getCompanyProfileById(conversation.companyId);
          recipientId = companyProfile?.userId || null;
        } else {
          recipientId = conversation.creatorId;
        }

        if (recipientId) {
          const senderUser = await storage.getUserById(message.senderId);
          const senderName = senderUser?.firstName || senderUser?.username || 'Someone';
          const messagePreview = message.content.length > 100
            ? message.content.substring(0, 100) + '...'
            : message.content;

          // Get company name for context if sender is company
          let companyName = '';
          if (!isCreatorSender && conversation.companyId) {
            const companyProfile = await storage.getCompanyProfileById(conversation.companyId);
            companyName = companyProfile?.legalName || companyProfile?.tradeName || '';
          }

          await notificationService.sendNotification(
            recipientId,
            'new_message',
            `New message from ${senderName}`,
            messagePreview,
            {
              userName: senderName,
              companyName: companyName,
              messagePreview: messagePreview,
              conversationId: conversation.id,
              messageId: message.id,
              linkUrl: `/messages/${conversation.id}`,
            }
          );
        }
      }

      // Auto-moderate message for banned content
      try {
        await moderateMessage(message.id, storage);
      } catch (moderationError) {
        console.error('[Moderation] Error auto-moderating message:', moderationError);
        // Don't fail the message creation if moderation fails
      }

      res.json(message);
    } catch (error: any) {
      console.error('[POST /api/messages] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Delete message for current user only ("delete for me")
  app.delete("/api/messages/:messageId/for-me", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const messageId = req.params.messageId;

      // Verify the message exists and user is part of the conversation
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Get conversation to verify user is part of it
      const conversation = await storage.getConversation(message.conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check if user is part of the conversation
      const isCreator = conversation.creatorId === userId;
      const companyProfile = await storage.getCompanyProfile(userId);
      const isCompany = companyProfile?.id === conversation.companyId;

      if (!isCreator && !isCompany) {
        return res.status(403).json({ error: "You don't have permission to delete this message" });
      }

      const success = await storage.deleteMessageForUser(messageId, userId);
      if (success) {
        res.json({ success: true, message: "Message deleted for you" });
      } else {
        res.status(500).json({ error: "Failed to delete message" });
      }
    } catch (error: any) {
      console.error('[DELETE /api/messages/:messageId/for-me] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Delete message for both users ("delete for everyone")
  app.delete("/api/messages/:messageId/for-both", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const messageId = req.params.messageId;

      // Verify the message exists
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Only the sender can delete for both
      if (message.senderId !== userId) {
        return res.status(403).json({ error: "Only the sender can delete a message for everyone" });
      }

      const success = await storage.deleteMessageForBoth(messageId, userId);
      if (success) {
        res.json({ success: true, message: "Message deleted for everyone" });
      } else {
        res.status(500).json({ error: "Failed to delete message" });
      }
    } catch (error: any) {
      console.error('[DELETE /api/messages/:messageId/for-both] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Get company average response time
  app.get("/api/companies/:companyId/response-time", async (req, res) => {
    try {
      const companyId = req.params.companyId;

      // Get company profile to find userId
      const companyProfile = await storage.getCompanyProfileById(companyId);
      if (!companyProfile) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get all conversations for this company
      const companyConversations = await db.query.conversations.findMany({
        where: eq(conversations.companyId, companyId),
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
        },
      });

      if (companyConversations.length === 0) {
        return res.json({
          averageResponseTime: null,
          responseTimeHours: null,
          conversationCount: 0,
        });
      }

      // Calculate response times for each conversation
      const responseTimes: number[] = [];

      for (const conversation of companyConversations) {
        const msgs = conversation.messages;
        if (msgs.length < 2) continue;

        // Find first creator message and first company response
        let firstCreatorMessageTime: Date | null = null;
        let firstCompanyResponseTime: Date | null = null;

        for (const msg of msgs) {
          if (msg.senderId === conversation.creatorId && !firstCreatorMessageTime && msg.createdAt) {
            firstCreatorMessageTime = new Date(msg.createdAt);
          } else if (msg.senderId === companyProfile.userId && firstCreatorMessageTime && !firstCompanyResponseTime && msg.createdAt) {
            firstCompanyResponseTime = new Date(msg.createdAt);
            break;
          }
        }

        // If we found both, calculate the response time
        if (firstCreatorMessageTime && firstCompanyResponseTime) {
          const responseTimeMs = firstCompanyResponseTime.getTime() - firstCreatorMessageTime.getTime();
          responseTimes.push(responseTimeMs);
        }
      }

      if (responseTimes.length === 0) {
        return res.json({
          averageResponseTime: null,
          responseTimeHours: null,
          conversationCount: companyConversations.length,
        });
      }

      // Calculate average
      const averageMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const averageHours = averageMs / (1000 * 60 * 60);

      res.json({
        averageResponseTime: Math.round(averageMs / 1000), // in seconds
        responseTimeHours: Math.round(averageHours * 10) / 10, // rounded to 1 decimal
        conversationCount: companyConversations.length,
        responseCount: responseTimes.length,
      });
    } catch (error: any) {
      console.error('[GET /api/companies/:companyId/response-time] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Get or create conversation for an application
  app.post("/api/conversations/start", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { applicationId } = req.body;

      if (!applicationId) {
        return res.status(400).json({ error: "applicationId is required" });
      }

      // Get the application
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Get user role and company profile
      const user = req.user as any;
      let companyId: string | null = null;
      let companyProfileId: string | null = null;

      if (user.role === 'company') {
        const companyProfile = await storage.getCompanyProfile(userId);
        companyId = companyProfile?.id || null;
        companyProfileId = companyProfile?.id || null;
      } else {
        // If creator, get company from offer
        const offer = await storage.getOffer(application.offerId);
        companyId = offer?.companyId || null;
      }

      if (!companyId) {
        return res.status(400).json({ error: "Could not determine company" });
      }

      // Find existing conversation for this application
      const existingConversations = await storage.getConversationsByUser(userId, user.role, companyProfileId);
      const existingConversation = existingConversations.find(
        (c: any) => c.applicationId === applicationId
      );

      if (existingConversation) {
        return res.json({ conversationId: existingConversation.id });
      }

      // Create new conversation
      const conversation = await storage.createConversation({
        applicationId,
        creatorId: application.creatorId,
        companyId,
        offerId: application.offerId,
        lastMessageAt: new Date(),
      });

      res.json({ conversationId: conversation.id });
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      res.status(500).send(error.message);
    }
  });

  // Reviews routes
  app.post("/api/reviews", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertReviewSchema.parse({
        ...req.body,
        creatorId: userId,
      });

      const review = await storage.createReview(validated);

      // Send notification to company about new review
      const companyProfile = await storage.getCompanyProfileById(review.companyId);
      if (companyProfile) {
        const creatorUser = await storage.getUserById(userId);
        await notificationService.sendNotification(
          companyProfile.userId,
          'review_received',
          `New Review Received (${review.overallRating} stars)`,
          `${creatorUser?.firstName || creatorUser?.username || 'A creator'} left you a ${review.overallRating}-star review${review.reviewText ? ': "' + review.reviewText.substring(0, 50) + (review.reviewText.length > 50 ? '..."' : '"') : '.'}`,
          {
            userName: companyProfile.legalName || companyProfile.tradeName || 'Company',
            reviewRating: review.overallRating,
            reviewText: review.reviewText ?? undefined,
            linkUrl: '/company-reviews',
          }
        );
      }

      // Auto-moderate review for banned content and low ratings
      try {
        await moderateReview(review.id, storage);
      } catch (moderationError) {
        console.error('[Moderation] Error auto-moderating review:', moderationError);
        // Don't fail the review creation if moderation fails
      }

      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get reviews by creator (creator only)
  app.get("/api/user/reviews", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const reviews = await storage.getReviewsByCreator(userId);
      res.json(reviews);
    } catch (error: any) {
      console.error('[Reviews] Error fetching creator reviews:', error);
      res.status(500).send(error.message);
    }
  });

  // Get reviews for a company (company only)
  app.get("/api/company/reviews", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        // Return empty array instead of 404 to allow page to render properly
        return res.json([]);
      }

      const reviews = await storage.getReviewsByCompany(companyProfile.id);
      res.json(reviews);
    } catch (error: any) {
      console.error('[Reviews] Error fetching company reviews:', error);
      res.status(500).send(error.message);
    }
  });

  // Add company response to a review (company only)
  app.patch("/api/reviews/:id/respond", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const reviewId = req.params.id;
      const { response } = req.body;

      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        return res.status(400).send("Response text is required");
      }

      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).send("Company profile not found");
      }

      // Verify the review belongs to this company
      const review = await storage.getReview(reviewId);
      if (!review) {
        return res.status(404).send("Review not found");
      }

      if (review.companyId !== companyProfile.id) {
        return res.status(403).send("You can only respond to reviews for your company");
      }

      // Update the review with company response
      const updatedReview = await storage.updateReview(reviewId, {
        companyResponse: response.trim(),
        companyRespondedAt: new Date(),
      });

      res.json(updatedReview);
    } catch (error: any) {
      console.error('[Reviews] Error adding company response:', error);
      res.status(500).send(error.message);
    }
  });


  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/notifications/unread/count", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get single notification by id
  app.get("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const notification = await storage.getNotification(req.params.id);
      if (!notification) return res.status(404).send("Not found");
      if ((notification as any).userId !== userId) return res.status(403).send("Forbidden");
      res.json(notification);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      await storage.clearAllNotifications(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Notification preferences routes
  app.get("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      let preferences = await storage.getUserNotificationPreferences(userId);
      
      if (!preferences) {
        preferences = await storage.createUserNotificationPreferences({ userId });
      }
      
      res.json(preferences);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const preferences = await storage.updateUserNotificationPreferences(userId, req.body);
      res.json(preferences);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/notifications/subscribe-push", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { subscription } = req.body;
      
      await storage.updateUserNotificationPreferences(userId, {
        pushSubscription: subscription,
        pushNotifications: true,
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/notifications/vapid-public-key", (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  // Admin routes
  app.get("/api/admin/stats", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const pendingCompanies = await storage.getPendingCompanies();
      const pendingOffers = await storage.getPendingOffers();
      const allUsers = await storage.getAllUsers();
      const activeOffers = await storage.getOffers({ status: 'approved' });

      // Split users by role
      const creators = allUsers.filter(user => user.role === 'creator');
      const companies = allUsers.filter(user => user.role === 'company');

      // Calculate new users created in the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newCreatorsThisWeek = creators.filter(user =>
        user.createdAt && new Date(user.createdAt) >= oneWeekAgo
      ).length;
      const newCompaniesThisWeek = companies.filter(user =>
        user.createdAt && new Date(user.createdAt) >= oneWeekAgo
      ).length;

      const stats = {
        totalCreators: creators.length,
        totalCompanies: companies.length,
        newCreatorsThisWeek: newCreatorsThisWeek,
        newCompaniesThisWeek: newCompaniesThisWeek,
        pendingCompanies: pendingCompanies.length,
        pendingOffers: pendingOffers.length,
        activeOffers: activeOffers.length,
      };

      res.json(stats);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get comprehensive admin analytics (admin only)
  app.get("/api/admin/analytics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const range = (req.query.range as string) || '30d';

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (range) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get all users
      const allUsers = await storage.getAllUsers();
      const creators = allUsers.filter(user => user.role === 'creator');
      const companies = allUsers.filter(user => user.role === 'company');
      const admins = allUsers.filter(user => user.role === 'admin');

      // Calculate new users this week
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newCreatorsThisWeek = creators.filter(user =>
        user.createdAt && new Date(user.createdAt) >= oneWeekAgo
      ).length;
      const newCompaniesThisWeek = companies.filter(user =>
        user.createdAt && new Date(user.createdAt) >= oneWeekAgo
      ).length;

      // Get all affiliate payments (from offers/commissions)
      const allAffiliatePayments = await db
        .select()
        .from(payments);

      const filteredAffiliatePayments = allAffiliatePayments.filter(p =>
        !p.initiatedAt || new Date(p.initiatedAt) >= startDate
      );

      // Get all retainer payments (from contracts/deliverables)
      const allRetainerPayments = await db
        .select()
        .from(retainerPayments);

      const filteredRetainerPayments = allRetainerPayments.filter(p =>
        !p.initiatedAt || new Date(p.initiatedAt) >= startDate
      );

      // Calculate financial metrics - Affiliate payments
      let affiliatePayouts = 0;
      let affiliatePendingPayouts = 0;
      let affiliateCompletedPayouts = 0;
      let affiliateDisputedPayouts = 0;
      let affiliatePlatformFees = 0;
      let affiliateProcessingFees = 0;

      for (const payment of filteredAffiliatePayments) {
        const platform = Number(payment.platformFeeAmount || 0);
        const processing = Number(payment.stripeFeeAmount || 0);
        const net = Number(payment.netAmount || 0);

        affiliatePayouts += net;
        affiliatePlatformFees += platform;
        affiliateProcessingFees += processing;

        if (payment.status === 'pending' || payment.status === 'processing') {
          affiliatePendingPayouts += net;
        } else if (payment.status === 'completed') {
          affiliateCompletedPayouts += net;
        } else if (payment.status === 'failed') {
          affiliateDisputedPayouts += net;
        }
      }

      // Calculate financial metrics - Retainer payments
      let retainerPayouts = 0;
      let retainerPendingPayouts = 0;
      let retainerCompletedPayouts = 0;
      let retainerDisputedPayouts = 0;
      let retainerPlatformFees = 0;
      let retainerProcessingFees = 0;

      for (const payment of filteredRetainerPayments) {
        const platform = Number(payment.platformFeeAmount || 0);
        const processing = Number(payment.processingFeeAmount || 0);
        const net = Number(payment.netAmount || 0);

        retainerPayouts += net;
        retainerPlatformFees += platform;
        retainerProcessingFees += processing;

        if (payment.status === 'pending' || payment.status === 'processing') {
          retainerPendingPayouts += net;
        } else if (payment.status === 'completed') {
          retainerCompletedPayouts += net;
        } else if (payment.status === 'failed') {
          retainerDisputedPayouts += net;
        }
      }

      // Combined totals
      const totalPayouts = affiliatePayouts + retainerPayouts;
      const pendingPayouts = affiliatePendingPayouts + retainerPendingPayouts;
      const completedPayouts = affiliateCompletedPayouts + retainerCompletedPayouts;
      const disputedPaymentsAmt = affiliateDisputedPayouts + retainerDisputedPayouts;
      const platformFees = affiliatePlatformFees + retainerPlatformFees;
      const processingFees = affiliateProcessingFees + retainerProcessingFees;

      // Get offers for listing fees
      const allOffers = await storage.getOffers({});
      const filteredOffers = allOffers.filter((o: any) =>
        !o.createdAt || new Date(o.createdAt) >= startDate
      );
      const listingFees = filteredOffers.reduce((sum: number, o: any) => sum + Number(o.listingFee || 0), 0);

      const totalRevenue = listingFees + platformFees + processingFees;

      // Calculate growth (compare to previous period) - include both affiliate and retainer
      const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      const previousAffiliatePayments = allAffiliatePayments.filter(p =>
        p.initiatedAt && new Date(p.initiatedAt) >= previousStartDate && new Date(p.initiatedAt) < startDate
      );
      const previousRetainerPaymentsFiltered = allRetainerPayments.filter(p =>
        p.initiatedAt && new Date(p.initiatedAt) >= previousStartDate && new Date(p.initiatedAt) < startDate
      );
      const previousAffiliateRevenue = previousAffiliatePayments.reduce((sum, p) =>
        sum + Number(p.platformFeeAmount || 0) + Number(p.stripeFeeAmount || 0), 0);
      const previousRetainerRevenue = previousRetainerPaymentsFiltered.reduce((sum, p) =>
        sum + Number(p.platformFeeAmount || 0) + Number(p.processingFeeAmount || 0), 0);
      const previousRevenue = previousAffiliateRevenue + previousRetainerRevenue;
      const revenueGrowth = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      // Get applications data directly from db
      const allApplications = await db.select().from(applications);
      const filteredApplications = allApplications.filter(a =>
        !a.createdAt || new Date(a.createdAt) >= startDate
      );

      // Get analytics data for clicks and conversions
      const allAnalytics = await db.select().from(analytics);
      const filteredAnalytics = allAnalytics.filter(a =>
        !a.createdAt || new Date(a.createdAt) >= startDate
      );
      const totalClicks = filteredAnalytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
      const totalConversions = filteredAnalytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
      const averageConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Group applications by status
      const applicationsByStatus = ['pending', 'approved', 'active', 'paused', 'completed', 'rejected'].map(status => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count: filteredApplications.filter(a => a.status === status).length,
      })).filter(s => s.count > 0);

      // Get niches data (use primaryNiche)
      const nicheMap = new Map<string, number>();
      for (const offer of filteredOffers) {
        const primaryNiche = (offer as any).primaryNiche;
        if (primaryNiche) {
          nicheMap.set(primaryNiche, (nicheMap.get(primaryNiche) || 0) + 1);
        }
      }
      const offersByNiche = Array.from(nicheMap.entries())
        .map(([niche, count]) => ({ niche, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate revenue by period (group by week/day) - include both affiliate and retainer
      const revenueByPeriod: Array<{ period: string; listingFees: number; platformFees: number; processingFees: number; affiliateFees: number; retainerFees: number; total: number }> = [];
      const periodMap = new Map<string, { listingFees: number; platformFees: number; processingFees: number; affiliateFees: number; retainerFees: number }>();

      // Add affiliate payments to period map
      for (const payment of filteredAffiliatePayments) {
        const date = payment.initiatedAt ? new Date(payment.initiatedAt) : new Date();
        const periodKey = date.toISOString().split('T')[0];
        const existing = periodMap.get(periodKey) || { listingFees: 0, platformFees: 0, processingFees: 0, affiliateFees: 0, retainerFees: 0 };
        const fees = Number(payment.platformFeeAmount || 0) + Number(payment.stripeFeeAmount || 0);
        existing.platformFees += Number(payment.platformFeeAmount || 0);
        existing.processingFees += Number(payment.stripeFeeAmount || 0);
        existing.affiliateFees += fees;
        periodMap.set(periodKey, existing);
      }

      // Add retainer payments to period map
      for (const payment of filteredRetainerPayments) {
        const date = payment.initiatedAt ? new Date(payment.initiatedAt) : new Date();
        const periodKey = date.toISOString().split('T')[0];
        const existing = periodMap.get(periodKey) || { listingFees: 0, platformFees: 0, processingFees: 0, affiliateFees: 0, retainerFees: 0 };
        const fees = Number(payment.platformFeeAmount || 0) + Number(payment.processingFeeAmount || 0);
        existing.platformFees += Number(payment.platformFeeAmount || 0);
        existing.processingFees += Number(payment.processingFeeAmount || 0);
        existing.retainerFees += fees;
        periodMap.set(periodKey, existing);
      }

      for (const offer of filteredOffers) {
        const date = offer.createdAt ? new Date(offer.createdAt) : new Date();
        const periodKey = date.toISOString().split('T')[0];
        const existing = periodMap.get(periodKey) || { listingFees: 0, platformFees: 0, processingFees: 0, affiliateFees: 0, retainerFees: 0 };
        existing.listingFees += Number(offer.listingFee || 0);
        periodMap.set(periodKey, existing);
      }

      const sortedPeriods = Array.from(periodMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [period, data] of sortedPeriods.slice(-14)) {
        revenueByPeriod.push({
          period: new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          listingFees: data.listingFees,
          platformFees: data.platformFees,
          processingFees: data.processingFees,
          affiliateFees: data.affiliateFees,
          retainerFees: data.retainerFees,
          total: data.listingFees + data.platformFees + data.processingFees,
        });
      }

      // User growth by period
      const userGrowthMap = new Map<string, { creators: number; companies: number; total: number }>();
      for (const user of allUsers) {
        if (!user.createdAt || new Date(user.createdAt) < startDate) continue;
        const date = new Date(user.createdAt);
        const periodKey = date.toISOString().split('T')[0];
        const existing = userGrowthMap.get(periodKey) || { creators: 0, companies: 0, total: 0 };
        if (user.role === 'creator') existing.creators++;
        else if (user.role === 'company') existing.companies++;
        existing.total++;
        userGrowthMap.set(periodKey, existing);
      }

      const userGrowth = Array.from(userGrowthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([period, data]) => ({
          period: new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...data,
        }));

      // Get top creators by earnings
      const creatorEarnings = new Map<string, { earnings: number; clicks: number; conversions: number }>();
      for (const analytic of filteredAnalytics) {
        if (!analytic.creatorId) continue;
        const existing = creatorEarnings.get(analytic.creatorId) || { earnings: 0, clicks: 0, conversions: 0 };
        existing.earnings += Number(analytic.earnings || 0);
        existing.clicks += analytic.clicks || 0;
        existing.conversions += analytic.conversions || 0;
        creatorEarnings.set(analytic.creatorId, existing);
      }

      const topCreators = await Promise.all(
        Array.from(creatorEarnings.entries())
          .sort((a, b) => b[1].earnings - a[1].earnings)
          .slice(0, 10)
          .map(async ([creatorId, data]) => {
            const user = await storage.getUserById(creatorId);
            return {
              id: creatorId,
              name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
              email: user?.email || '',
              earnings: data.earnings,
              clicks: data.clicks,
              conversions: data.conversions,
            };
          })
      );

      // Get top companies by spend
      const companySpend = new Map<string, { spend: number; offers: number; creators: number }>();
      for (const offer of filteredOffers) {
        if (!offer.companyId) continue;
        const existing = companySpend.get(offer.companyId) || { spend: 0, offers: 0, creators: 0 };
        existing.offers++;
        companySpend.set(offer.companyId, existing);
      }

      // Add affiliate payment spend
      for (const payment of filteredAffiliatePayments) {
        if (!payment.companyId) continue;
        const existing = companySpend.get(payment.companyId) || { spend: 0, offers: 0, creators: 0 };
        existing.spend += Number(payment.grossAmount || 0);
        companySpend.set(payment.companyId, existing);
      }

      // Add retainer payment spend
      for (const payment of filteredRetainerPayments) {
        if (!payment.companyId) continue;
        const existing = companySpend.get(payment.companyId) || { spend: 0, offers: 0, creators: 0 };
        existing.spend += Number(payment.grossAmount || 0);
        companySpend.set(payment.companyId, existing);
      }

      // Count unique creators per company
      for (const app of filteredApplications) {
        const offer = allOffers.find(o => o.id === app.offerId);
        if (!offer?.companyId) continue;
        const existing = companySpend.get(offer.companyId) || { spend: 0, offers: 0, creators: 0 };
        existing.creators++;
        companySpend.set(offer.companyId, existing);
      }

      const topCompanies = await Promise.all(
        Array.from(companySpend.entries())
          .sort((a, b) => b[1].spend - a[1].spend)
          .slice(0, 10)
          .map(async ([companyId, data]) => {
            const profile = await storage.getCompanyProfileById(companyId);
            return {
              id: companyId,
              name: profile?.legalName || profile?.tradeName || 'Unknown',
              offers: data.offers,
              spend: data.spend,
              creators: data.creators,
            };
          })
      );

      // Count active users
      const activeApplications = allApplications.filter(a => a.status === 'active' || a.status === 'approved');
      const activeCreatorIds = new Set(activeApplications.map(a => a.creatorId).filter(Boolean));
      const activeCompanyIds = new Set(filteredOffers.filter((o: any) => o.status === 'approved').map((o: any) => o.companyId).filter(Boolean));

      // Get pending companies count
      const pendingCompanyProfiles = await db.select().from(vendorProfiles);
      const pendingCompaniesCount = pendingCompanyProfiles.filter((c: any) => c.verificationStatus === 'pending').length;

      // Get suspended users (those without active status)
      const suspendedUsersCount = allUsers.filter((u: any) => u.isSuspended).length;

      // Calculate total fees by type for revenue breakdown
      const totalAffiliateFees = affiliatePlatformFees + affiliateProcessingFees;
      const totalRetainerFees = retainerPlatformFees + retainerProcessingFees;

      const response = {
        financial: {
          totalRevenue,
          listingFees,
          platformFees,
          processingFees,
          // Affiliate breakdown
          affiliatePlatformFees,
          affiliateProcessingFees,
          affiliatePayouts,
          affiliatePendingPayouts,
          affiliateCompletedPayouts,
          // Retainer breakdown
          retainerPlatformFees,
          retainerProcessingFees,
          retainerPayouts,
          retainerPendingPayouts,
          retainerCompletedPayouts,
          // Combined totals
          totalPayouts,
          pendingPayouts,
          completedPayouts,
          disputedPayments: disputedPaymentsAmt,
          revenueGrowth,
          payoutGrowth: 0,
          revenueByPeriod,
          payoutsByPeriod: [],
          revenueBySource: [
            { source: 'Listing Fees', amount: listingFees, type: 'listing' },
            { source: 'Affiliate Fees', amount: totalAffiliateFees, type: 'affiliate' },
            { source: 'Retainer Fees', amount: totalRetainerFees, type: 'retainer' },
          ].filter(s => s.amount > 0),
          // Transaction counts
          affiliateTransactionCount: filteredAffiliatePayments.length,
          retainerTransactionCount: filteredRetainerPayments.length,
          totalTransactionCount: filteredAffiliatePayments.length + filteredRetainerPayments.length,
        },
        users: {
          totalUsers: allUsers.length,
          totalCreators: creators.length,
          totalCompanies: companies.length,
          totalAdmins: admins.length,
          newUsersThisWeek: newCreatorsThisWeek + newCompaniesThisWeek,
          newCreatorsThisWeek,
          newCompaniesThisWeek,
          activeCreators: activeCreatorIds.size,
          activeCompanies: activeCompanyIds.size,
          pendingCompanies: pendingCompaniesCount,
          suspendedUsers: suspendedUsersCount,
          userGrowth,
          topCreators,
          topCompanies,
        },
        platform: {
          totalOffers: allOffers.length,
          activeOffers: allOffers.filter((o: any) => o.status === 'approved').length,
          pendingOffers: allOffers.filter((o: any) => o.status === 'pending_review').length,
          totalApplications: filteredApplications.length,
          totalConversions,
          totalClicks,
          averageConversionRate,
          offersByNiche,
          applicationsByStatus,
        },
      };

      res.json(response);
    } catch (error: any) {
      console.error('[Admin Analytics Error]:', error);
      res.status(500).send(error.message);
    }
  });

  // Get churn analytics for admin dashboard (admin only)
  app.get("/api/admin/churn-analytics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const range = (req.query.range as string) || '30d';
      const churnData = await storage.getChurnAnalytics(range);
      res.json(churnData);
    } catch (error: any) {
      console.error('[Churn Analytics Error]:', error);
      res.status(500).send(error.message);
    }
  });

  // Notify admins about existing pending offers and payments (admin only)
  app.post("/api/admin/notify-pending-items", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      console.log('[Admin] Sending notifications for pending items...');

      let notificationCount = 0;
      const adminUsers = await storage.getUsersByRole('admin');

      // Notify about pending offers
      const pendingOffers = await storage.getPendingOffers();
      for (const offer of pendingOffers) {
        const companyProfile = await storage.getCompanyProfileById(offer.companyId);

        for (const admin of adminUsers) {
          await notificationService.sendNotification(
            admin.id,
            'new_application',
            'Offer Pending Review',
            `${companyProfile?.legalName || companyProfile?.tradeName || 'A company'} has an offer "${offer.title}" pending review.`,
            {
              userName: admin.firstName || admin.username,
              companyName: companyProfile?.legalName || companyProfile?.tradeName || '',
              offerTitle: offer.title,
              offerId: offer.id,
            }
          );
          notificationCount++;
        }
      }

      // Notify about pending payments
      const pendingPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.status, 'pending'));

      for (const payment of pendingPayments) {
        const creator = await storage.getUserById(payment.creatorId);
        const application = payment.applicationId
          ? await storage.getApplication(payment.applicationId)
          : null;
        const offer = application?.offerId
          ? await storage.getOffer(application.offerId)
          : null;

        for (const admin of adminUsers) {
          await notificationService.sendNotification(
            admin.id,
            'payment_pending',
            'Payment Ready for Processing',
            `A payment of CA$${(Number(payment.netAmount) / 100).toFixed(2)} for creator ${creator?.username || 'Unknown'} is ready for processing.`,
            {
              userName: admin.firstName || admin.username,
              offerTitle: offer?.title || 'Unknown Offer',
              amount: `CA$${(Number(payment.netAmount) / 100).toFixed(2)}`,
              paymentId: payment.id,
            }
          );
          notificationCount++;
        }
      }

      console.log(`[Admin] Sent ${notificationCount} notifications for ${pendingOffers.length} pending offers and ${pendingPayments.length} pending payments`);
      res.json({
        success: true,
        notificationsSent: notificationCount,
        pendingOffers: pendingOffers.length,
        pendingPayments: pendingPayments.length
      });
    } catch (error: any) {
      console.error('[Admin] Error sending pending item notifications:', error);
      res.status(500).send(error.message);
    }
  });

  // Fix tracking codes for existing approved applications (admin only)
  app.post("/api/admin/fix-tracking-codes", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      console.log('[Admin] Starting tracking code fix...');

      // Get all approved applications
      const allApprovedApplications = await db
        .select()
        .from(applications)
        .where(eq(applications.status, 'approved'));

      let fixed = 0;
      let skipped = 0;

      for (const application of allApprovedApplications) {
        // Check if tracking code is missing or invalid
        if (!application.trackingCode || !application.trackingLink) {
          console.log(`[Admin] Fixing tracking code for application ${application.id}`);

          // Generate new tracking code
          const trackingCode = `CR-${application.creatorId.substring(0, 8)}-${application.offerId.substring(0, 8)}-${application.id.substring(0, 8)}`;
          const port = process.env.PORT || 3000;
          const baseURL = process.env.BASE_URL || `http://localhost:${port}`;
          const trackingLink = `${baseURL}/go/${trackingCode}`;

          // Update the application
          await db
            .update(applications)
            .set({
              trackingCode,
              trackingLink,
              updatedAt: new Date(),
            })
            .where(eq(applications.id, application.id));

          fixed++;
        } else {
          skipped++;
        }
      }

      console.log(`[Admin] Tracking code fix complete. Fixed: ${fixed}, Skipped: ${skipped}`);
      res.json({
        success: true,
        fixed,
        skipped,
        total: allApprovedApplications.length,
      });
    } catch (error: any) {
      console.error('[Admin] Error fixing tracking codes:', error);
      res.status(500).send(error.message);
    }
  });

  // Get pending companies (legacy endpoint for backward compatibility)
  app.get("/api/admin/companies", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companies = await storage.getPendingCompanies();
      res.json(companies);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // DEBUG: Check if company ID exists in database
  app.get("/api/admin/companies/debug/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      console.log(`[DEBUG] Checking if company ${companyId} exists in database`);

      // Raw query to check company_profiles table
      const { db } = await import('./db');
      const { vendorProfiles } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const rawResult = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, companyId));
      console.log(`[DEBUG] Raw query result:`, rawResult);

      // Also check if any company exists with similar ID
      const allCompanies = await db.select().from(vendorProfiles);
      console.log(`[DEBUG] Total companies in DB: ${allCompanies.length}`);
      console.log(`[DEBUG] All company IDs: ${allCompanies.map(c => c.id).join(', ')}`);

      res.json({
        requestedId: companyId,
        found: rawResult.length > 0,
        result: rawResult[0] || null,
        totalCompanies: allCompanies.length,
        allIds: allCompanies.map(c => c.id)
      });
    } catch (error: any) {
      console.error(`[DEBUG] Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all companies with filters (new comprehensive endpoint)
  app.get("/api/admin/companies/all", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status, industry, startDate, endDate } = req.query;
      const filters: any = {};

      if (status) filters.status = status;
      if (industry) filters.industry = industry;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const companies = await storage.getAllCompanies(filters);

      // Sales/commission per store, keyed on the normalized order storeName
      // (strips the " | ref:ORD-..." suffix) so each store aggregates once.
      const storeExpr = sql`trim(split_part(${legacyOrders.storeName}, '|', 1))`;
      const storeRows = await db
        .select({
          storeName: sql<string>`${storeExpr}`,
          orderCount: sql<number>`count(*)::int`,
          gross: sql<string>`coalesce(sum(${legacyOrders.orderTotal}),0)`,
          commission: sql<string>`coalesce(sum(${legacyOrders.commissionEarned}),0)`,
          firstAt: sql<string>`min(${legacyOrders.createdAt})`,
        })
        .from(legacyOrders)
        .where(sql`${legacyOrders.storeName} is not null and ${legacyOrders.storeName} <> ''`)
        .groupBy(storeExpr)
        .orderBy(sql`sum(${legacyOrders.orderTotal}) desc`);
      const salesByDomain = new Map(storeRows.map((s) => [s.storeName, s]));

      if (companies.length > 0) {
        // Real vendor_profiles exist (imported stores) — return those, enriched
        // with sales matched by domain. (No derived rows → no duplicates.)
        const result = companies.map((c: any) => {
          const s = c.domain ? salesByDomain.get(c.domain) : undefined;
          return {
            ...c,
            salesCount: s?.orderCount ?? 0,
            grossSales: parseFloat(s?.gross ?? "0"),
            totalCommission: parseFloat(s?.commission ?? "0"),
          };
        });
        const filtered = status ? result.filter((c) => c.status === status) : result;
        console.log(`[Admin] companies/all -> ${filtered.length} merchant records`);
        return res.json(filtered);
      }

      // Fallback (before the store CSV is imported): derive merchants from orders.
      const storeMerchants = storeRows.map((s) => ({
        id: `store:${s.storeName}`,
        legalName: s.storeName,
        tradeName: s.storeName,
        industry: "Peptides",
        websiteUrl: /^https?:\/\//.test(s.storeName ?? "") ? s.storeName : `https://${s.storeName}`,
        logoUrl: null,
        status: "approved",
        createdAt: s.firstAt,
        approvedAt: s.firstAt,
        salesCount: s.orderCount,
        grossSales: parseFloat(s.gross),
        totalCommission: parseFloat(s.commission),
        user: null,
      }));
      const result = status ? storeMerchants.filter((c) => c.status === status) : storeMerchants;
      console.log(`[Admin] companies/all -> 0 records, ${storeMerchants.length} derived stores`);
      res.json(result);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get individual company details
  app.get("/api/admin/companies/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      console.log(`[Admin] Fetching company with ID: ${companyId}`);
      const company = await storage.getCompanyById(companyId);
      if (!company) {
        console.log(`[Admin] Company not found with ID: ${companyId}`);
        return res.status(404).send("Company not found");
      }
      console.log(`[Admin] Company found: ${company.legalName} (ID: ${company.id})`);
      res.json(company);
    } catch (error: any) {
      console.error(`[Admin] Error fetching company ${req.params.id}:`, error);
      res.status(500).send(error.message);
    }
  });

  // Get company offers
  app.get("/api/admin/companies/:id/offers", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offers = await storage.getCompanyOffers(req.params.id);
      res.json(offers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get company payments
  app.get("/api/admin/companies/:id/payments", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const payments = await storage.getCompanyPayments(req.params.id);
      res.json(payments);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get company creator relationships
  app.get("/api/admin/companies/:id/creators", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const relationships = await storage.getCompanyCreatorRelationships(req.params.id);
      res.json(relationships);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Approve company
  app.post("/api/admin/companies/:id/approve", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const company = await storage.approveCompany(req.params.id);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Reject company
  app.post("/api/admin/companies/:id/reject", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { reason } = req.body;
      const company = await storage.rejectCompany(req.params.id, reason);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Suspend company
  app.post("/api/admin/companies/:id/suspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const company = await storage.suspendCompany(req.params.id);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Unsuspend company
  app.post("/api/admin/companies/:id/unsuspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const company = await storage.unsuspendCompany(req.params.id);
      res.json(company);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Website Verification - Generate verification token
  app.post("/api/admin/companies/:id/generate-verification-token", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const company = await storage.generateWebsiteVerificationToken(companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json({
        success: true,
        verificationToken: company.websiteVerificationToken,
        instructions: {
          meta_tag: `Add this meta tag to the <head> section of your website's homepage:\n<meta name="affiliatexchange-site-verification" content="${company.websiteVerificationToken}">`,
          dns_txt: `Add this TXT record to your domain's DNS settings:\n${company.websiteVerificationToken}`,
        },
      });
    } catch (error: any) {
      console.error('[generate-verification-token] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Website Verification - Verify website ownership
  app.post("/api/admin/companies/:id/verify-website", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const { method } = req.body;

      if (!method || !['meta_tag', 'dns_txt'].includes(method)) {
        return res.status(400).json({ error: "Invalid verification method. Use 'meta_tag' or 'dns_txt'." });
      }

      const result = await storage.verifyWebsiteOwnership(companyId, method);

      if (result.success) {
        res.json({
          success: true,
          message: `Website verified successfully via ${method === 'meta_tag' ? 'Meta Tag' : 'DNS TXT Record'}`,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('[verify-website] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Website Verification - Reset verification status (admin)
  app.post("/api/admin/companies/:id/reset-website-verification", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const company = await storage.updateWebsiteVerificationStatus(companyId, false);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json({
        success: true,
        message: "Website verification status has been reset",
      });
    } catch (error: any) {
      console.error('[reset-website-verification] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // Per-Company Platform Fee Override Endpoints (Section 4.3.H)
  // ============================================================

  // Get company's custom platform fee percentage
  app.get("/api/admin/companies/:id/fee", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const company = await storage.getCompanyById(companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const { platformFee: defaultPlatformFee, stripeFee: processingFee } = await getPlatformFeeSettings();
      const customFee = company.customPlatformFeePercentage;
      const hasCustomFee = customFee !== null && customFee !== undefined;

      res.json({
        companyId: company.id,
        companyName: company.legalName,
        customPlatformFeePercentage: hasCustomFee ? parseFloat(customFee.toString()) : null,
        customPlatformFeeDisplay: hasCustomFee ? `${(parseFloat(customFee.toString()) * 100).toFixed(2)}%` : null,
        defaultPlatformFeePercentage: defaultPlatformFee,
        defaultPlatformFeeDisplay: `${(defaultPlatformFee * 100)}%`,
        processingFeePercentage: processingFee,
        processingFeeDisplay: `${(processingFee * 100)}%`,
        effectivePlatformFee: hasCustomFee ? parseFloat(customFee.toString()) : defaultPlatformFee,
        effectiveTotalFee: (hasCustomFee ? parseFloat(customFee.toString()) : defaultPlatformFee) + processingFee,
        isUsingCustomFee: hasCustomFee,
      });
    } catch (error: any) {
      console.error('[get-company-fee] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update company's custom platform fee percentage
  app.put("/api/admin/companies/:id/fee", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const { platformFeePercentage } = req.body;

      // Validate input
      if (platformFeePercentage === undefined || platformFeePercentage === null) {
        return res.status(400).json({ error: "platformFeePercentage is required" });
      }

      const feeValue = parseFloat(platformFeePercentage);

      // Validate fee percentage is between 0% and 50%
      if (isNaN(feeValue) || feeValue < 0 || feeValue > 0.5) {
        return res.status(400).json({
          error: "Platform fee percentage must be between 0 and 0.5 (0% to 50%)",
          received: platformFeePercentage,
        });
      }

      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Update company profile with custom fee
      const updatedCompany = await storage.updateCompanyProfileById(companyId, {
        customPlatformFeePercentage: feeValue.toFixed(4),
      });

      // Log audit event
      const adminUser = req.user as any;
      await storage.createAuditLog({
        userId: adminUser.id,
        action: 'update_company_fee',
        entityType: 'company',
        entityId: companyId,
        reason: `Updated platform fee for ${company.legalName} to ${(feeValue * 100).toFixed(2)}%`,
        changes: {
          previousFee: company.customPlatformFeePercentage,
          newFee: feeValue,
          companyName: company.legalName,
        },
      });

      console.log(`[Admin] Updated platform fee for company ${companyId} (${company.legalName}) to ${(feeValue * 100).toFixed(2)}%`);

      const { stripeFee: processingFee } = await getPlatformFeeSettings();

      res.json({
        success: true,
        message: `Platform fee updated to ${(feeValue * 100).toFixed(2)}% for ${company.legalName}`,
        companyId: companyId,
        customPlatformFeePercentage: feeValue,
        customPlatformFeeDisplay: `${(feeValue * 100).toFixed(2)}%`,
        effectiveTotalFee: feeValue + processingFee,
      });
    } catch (error: any) {
      console.error('[update-company-fee] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Remove company's custom platform fee (revert to default)
  app.delete("/api/admin/companies/:id/fee", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;

      const company = await storage.getCompanyById(companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const previousFee = company.customPlatformFeePercentage;
      const { platformFee: defaultPlatformFee, stripeFee: processingFee } = await getPlatformFeeSettings();

      // Update company profile to remove custom fee
      await storage.updateCompanyProfileById(companyId, {
        customPlatformFeePercentage: null,
      });

      // Log audit event
      const adminUser = req.user as any;
      await storage.createAuditLog({
        userId: adminUser.id,
        action: 'remove_company_fee',
        entityType: 'company',
        entityId: companyId,
        reason: `Removed custom platform fee for ${company.legalName}, reverting to default ${(defaultPlatformFee * 100)}%`,
        changes: {
          previousFee: previousFee,
          companyName: company.legalName,
        },
      });

      console.log(`[Admin] Removed custom platform fee for company ${companyId} (${company.legalName}), reverted to default`);

      res.json({
        success: true,
        message: `Custom platform fee removed for ${company.legalName}. Now using default ${(defaultPlatformFee * 100)}%`,
        companyId: companyId,
        defaultPlatformFeePercentage: defaultPlatformFee,
        defaultPlatformFeeDisplay: `${(defaultPlatformFee * 100)}%`,
        effectiveTotalFee: defaultPlatformFee + processingFee,
      });
    } catch (error: any) {
      console.error('[remove-company-fee] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all companies with custom fees (for admin dashboard)
  app.get("/api/admin/companies-with-custom-fees", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companies = await storage.getCompaniesWithCustomFees();
      const { platformFee: defaultPlatformFee, stripeFee: processingFee } = await getPlatformFeeSettings();

      res.json({
        count: companies.length,
        defaultPlatformFeePercentage: defaultPlatformFee,
        defaultPlatformFeeDisplay: `${(defaultPlatformFee * 100)}%`,
        companies: companies.map(company => ({
          id: company.id,
          legalName: company.legalName,
          tradeName: company.tradeName,
          customPlatformFeePercentage: company.customPlatformFeePercentage ? parseFloat(company.customPlatformFeePercentage.toString()) : null,
          customPlatformFeeDisplay: company.customPlatformFeePercentage ? `${(parseFloat(company.customPlatformFeePercentage.toString()) * 100).toFixed(2)}%` : null,
          effectiveTotalFee: company.customPlatformFeePercentage
            ? parseFloat(company.customPlatformFeePercentage.toString()) + processingFee
            : defaultPlatformFee + processingFee,
        })),
      });
    } catch (error: any) {
      console.error('[get-companies-with-custom-fees] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get company risk indicators for fee adjustment decisions
  app.get("/api/admin/companies/:id/risk-indicators", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const company = await storage.getCompanyById(companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get company payments to analyze
      const companyPayments = await storage.getPaymentsByCompany(companyId);

      // Calculate risk indicators
      const indicators: Array<{
        type: 'warning' | 'info' | 'success';
        category: string;
        title: string;
        description: string;
        recommendation: 'increase' | 'decrease' | 'neutral';
      }> = [];

      // 1. Check dispute rate
      const disputedPayments = companyPayments.filter(p =>
        p.description?.toLowerCase().includes('disputed')
      );
      const disputeRate = companyPayments.length > 0
        ? (disputedPayments.length / companyPayments.length) * 100
        : 0;

      if (disputedPayments.length > 0) {
        if (disputeRate >= 10) {
          indicators.push({
            type: 'warning',
            category: 'Disputes',
            title: 'High Dispute Rate',
            description: `${disputedPayments.length} disputed payments (${disputeRate.toFixed(1)}% of total). High dispute rates increase platform risk.`,
            recommendation: 'increase',
          });
        } else if (disputeRate >= 5) {
          indicators.push({
            type: 'info',
            category: 'Disputes',
            title: 'Moderate Dispute Rate',
            description: `${disputedPayments.length} disputed payments (${disputeRate.toFixed(1)}% of total). Monitor for potential issues.`,
            recommendation: 'neutral',
          });
        }
      }

      // 2. Check failed payments
      const failedPayments = companyPayments.filter(p =>
        p.status === 'failed' && !p.description?.toLowerCase().includes('disputed')
      );
      const failureRate = companyPayments.length > 0
        ? (failedPayments.length / companyPayments.length) * 100
        : 0;

      if (failedPayments.length >= 3 || failureRate >= 15) {
        indicators.push({
          type: 'warning',
          category: 'Payment Issues',
          title: 'High Payment Failure Rate',
          description: `${failedPayments.length} failed payments (${failureRate.toFixed(1)}% failure rate). May indicate payment reliability issues.`,
          recommendation: 'increase',
        });
      }

      // 3. Check refund rate
      const refundedPayments = companyPayments.filter(p => p.status === 'refunded');
      const refundRate = companyPayments.length > 0
        ? (refundedPayments.length / companyPayments.length) * 100
        : 0;

      if (refundRate >= 20) {
        indicators.push({
          type: 'warning',
          category: 'Refunds',
          title: 'High Refund Rate',
          description: `${refundedPayments.length} refunded payments (${refundRate.toFixed(1)}% of total). High refund rates may indicate issues.`,
          recommendation: 'increase',
        });
      }

      // 4. Check website verification status
      if (!company.websiteVerified) {
        indicators.push({
          type: 'warning',
          category: 'Verification',
          title: 'Website Not Verified',
          description: 'Company website has not been verified. Unverified companies pose higher risk.',
          recommendation: 'increase',
        });
      } else {
        indicators.push({
          type: 'success',
          category: 'Verification',
          title: 'Website Verified',
          description: `Website verified on ${company.websiteVerifiedAt ? new Date(company.websiteVerifiedAt).toLocaleDateString() : 'N/A'}`,
          recommendation: 'neutral',
        });
      }

      // 5. Check account age (new accounts are higher risk)
      const accountAgeDays = Math.floor(
        (Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (accountAgeDays < 30) {
        indicators.push({
          type: 'info',
          category: 'Account Age',
          title: 'New Account',
          description: `Account created ${accountAgeDays} days ago. New accounts may require closer monitoring.`,
          recommendation: 'neutral',
        });
      } else if (accountAgeDays >= 180) {
        indicators.push({
          type: 'success',
          category: 'Account Age',
          title: 'Established Account',
          description: `Account is ${Math.floor(accountAgeDays / 30)} months old with established history.`,
          recommendation: 'neutral',
        });
      }

      // 6. Check payment volume (high volume trusted partners may warrant lower fees)
      const completedPayments = companyPayments.filter(p => p.status === 'completed');
      const totalVolume = completedPayments.reduce((sum, p) => sum + parseFloat(p.grossAmount?.toString() || '0'), 0);

      if (completedPayments.length >= 50 && disputeRate < 2 && failureRate < 5) {
        indicators.push({
          type: 'success',
          category: 'Payment History',
          title: 'High-Volume Trusted Partner',
          description: `${completedPayments.length} successful payments totaling $${totalVolume.toFixed(2)} with low dispute/failure rates. Consider reduced fees.`,
          recommendation: 'decrease',
        });
      } else if (completedPayments.length >= 20 && disputeRate < 5) {
        indicators.push({
          type: 'success',
          category: 'Payment History',
          title: 'Good Payment History',
          description: `${completedPayments.length} successful payments with acceptable dispute rate.`,
          recommendation: 'neutral',
        });
      } else if (companyPayments.length === 0) {
        indicators.push({
          type: 'info',
          category: 'Payment History',
          title: 'No Payment History',
          description: 'Company has no payment history yet. Default fee recommended until track record is established.',
          recommendation: 'neutral',
        });
      }

      // Calculate overall risk score (0-100)
      let riskScore = 50; // Start neutral
      indicators.forEach(ind => {
        if (ind.recommendation === 'increase') riskScore += 15;
        if (ind.recommendation === 'decrease') riskScore -= 10;
      });
      riskScore = Math.max(0, Math.min(100, riskScore));

      // Generate overall recommendation
      const increaseIndicators = indicators.filter(i => i.recommendation === 'increase').length;
      const decreaseIndicators = indicators.filter(i => i.recommendation === 'decrease').length;

      let overallRecommendation: 'increase' | 'decrease' | 'maintain' = 'maintain';
      let recommendationText = 'Current fee appears appropriate based on company profile.';

      if (increaseIndicators >= 2) {
        overallRecommendation = 'increase';
        recommendationText = 'Multiple risk indicators suggest considering a fee increase.';
      } else if (decreaseIndicators > 0 && increaseIndicators === 0) {
        overallRecommendation = 'decrease';
        recommendationText = 'Strong payment history suggests this company may qualify for reduced fees.';
      }

      res.json({
        companyId: company.id,
        companyName: company.legalName,
        riskScore,
        riskLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
        overallRecommendation,
        recommendationText,
        indicators,
        stats: {
          totalPayments: companyPayments.length,
          completedPayments: completedPayments.length,
          failedPayments: failedPayments.length,
          refundedPayments: refundedPayments.length,
          disputedPayments: disputedPayments.length,
          totalVolume: totalVolume.toFixed(2),
          accountAgeDays,
        },
      });
    } catch (error: any) {
      console.error('[get-company-risk-indicators] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check and notify admins about high-risk companies
  app.post("/api/admin/check-high-risk-companies", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      // Get all approved companies
      const approvedCompanies = await storage.getAllCompanies({ status: 'approved' });

      // Get all admin users
      const allUsers = await storage.getAllUsers();
      const adminUsers = allUsers.filter(u => u.role === 'admin');

      if (adminUsers.length === 0) {
        return res.json({ message: 'No admin users found', notificationsSent: 0 });
      }

      let notificationsSent = 0;
      const highRiskCompanies: Array<{ id: string; legalName: string; riskScore: number; riskIndicators: string[] }> = [];

      // Calculate risk for each company
      for (const company of approvedCompanies as any[]) {
        const companyPayments = await storage.getPaymentsByCompany(company.id);

        // Calculate risk indicators
        const disputedPayments = companyPayments.filter(p =>
          p.description?.toLowerCase().includes('disputed')
        );
        const disputeRate = companyPayments.length > 0
          ? (disputedPayments.length / companyPayments.length) * 100
          : 0;

        const failedPayments = companyPayments.filter(p =>
          p.status === 'failed' && !p.description?.toLowerCase().includes('disputed')
        );
        const failureRate = companyPayments.length > 0
          ? (failedPayments.length / companyPayments.length) * 100
          : 0;

        const refundedPayments = companyPayments.filter(p => p.status === 'refunded');
        const refundRate = companyPayments.length > 0
          ? (refundedPayments.length / companyPayments.length) * 100
          : 0;

        const completedPayments = companyPayments.filter(p => p.status === 'completed');

        // Calculate risk score
        let riskScore = 50;
        const riskIndicators: string[] = [];

        if (disputeRate >= 10) {
          riskScore += 15;
          riskIndicators.push(`High dispute rate (${disputeRate.toFixed(1)}%)`);
        }

        if (failedPayments.length >= 3 || failureRate >= 15) {
          riskScore += 15;
          riskIndicators.push(`High payment failure rate (${failedPayments.length} failed)`);
        }

        if (refundRate >= 20) {
          riskScore += 15;
          riskIndicators.push(`High refund rate (${refundRate.toFixed(1)}%)`);
        }

        if (!company.websiteVerified) {
          riskScore += 15;
          riskIndicators.push('Website not verified');
        }

        if (completedPayments.length >= 50 && disputeRate < 2 && failureRate < 5) {
          riskScore -= 10;
        }

        riskScore = Math.max(0, Math.min(100, riskScore));

        // Check if company is high risk (score >= 70)
        if (riskScore >= 70) {
          highRiskCompanies.push({
            id: company.id,
            legalName: company.legalName,
            riskScore,
            riskIndicators,
          });
        }
      }

      // Send notifications to all admins for each high-risk company
      for (const company of highRiskCompanies) {
        for (const admin of adminUsers) {
          // Check if a notification was already sent recently (within 24 hours)
          const recentNotifications = await storage.getNotifications(admin.id, 100);
          const alreadyNotified = recentNotifications.some((n: any) =>
            n.type === 'high_risk_company' &&
            (n.metadata as any)?.companyId === company.id &&
            new Date(n.createdAt!).getTime() > Date.now() - 24 * 60 * 60 * 1000
          );

          if (!alreadyNotified) {
            await notificationService.sendNotification(
              admin.id,
              'high_risk_company',
              `High Risk Company: ${company.legalName}`,
              `${company.legalName} has been flagged as high risk (score: ${company.riskScore}/100). Consider reviewing their platform fee.`,
              {
                companyId: company.id,
                companyName: company.legalName,
                riskScore: company.riskScore,
                riskLevel: 'high',
                riskIndicators: company.riskIndicators,
                linkUrl: `/admin/companies/${company.id}`,
              }
            );
            notificationsSent++;
          }
        }
      }

      res.json({
        message: `Found ${highRiskCompanies.length} high-risk companies`,
        highRiskCount: highRiskCompanies.length,
        notificationsSent,
        companies: highRiskCompanies.map(c => ({
          id: c.id,
          name: c.legalName,
          riskScore: c.riskScore,
          indicators: c.riskIndicators,
        })),
      });
    } catch (error: any) {
      console.error('[check-high-risk-companies] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Company self-service - Get verification token (for company users)
  app.get("/api/company/website-verification", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const company = await storage.getCompanyProfile(userId);

      if (!company) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      res.json({
        websiteUrl: company.websiteUrl,
        websiteVerified: company.websiteVerified,
        websiteVerificationToken: company.websiteVerificationToken,
        websiteVerificationMethod: company.websiteVerificationMethod,
        websiteVerifiedAt: company.websiteVerifiedAt,
        instructions: company.websiteVerificationToken ? {
          meta_tag: `Add this meta tag to the <head> section of your website's homepage:\n<meta name="affiliatexchange-site-verification" content="${company.websiteVerificationToken}">`,
          dns_txt: `Add this TXT record to your domain's DNS settings:\n${company.websiteVerificationToken}`,
        } : null,
      });
    } catch (error: any) {
      console.error('[get-website-verification] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Company self-service - Generate verification token
  app.post("/api/company/generate-verification-token", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      let company = await storage.getCompanyProfile(userId);

      if (!company) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      if (!company.websiteUrl) {
        return res.status(400).json({ error: "Please add a website URL to your company profile first" });
      }

      company = await storage.generateWebsiteVerificationToken(company.id);

      res.json({
        success: true,
        verificationToken: company?.websiteVerificationToken,
        instructions: {
          meta_tag: `Add this meta tag to the <head> section of your website's homepage:\n<meta name="affiliatexchange-site-verification" content="${company?.websiteVerificationToken}">`,
          dns_txt: `Add this TXT record to your domain's DNS settings:\n${company?.websiteVerificationToken}`,
        },
      });
    } catch (error: any) {
      console.error('[company-generate-verification-token] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Company self-service - Request verification check
  app.post("/api/company/verify-website", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { method } = req.body;

      if (!method || !['meta_tag', 'dns_txt'].includes(method)) {
        return res.status(400).json({ error: "Invalid verification method. Use 'meta_tag' or 'dns_txt'." });
      }

      const company = await storage.getCompanyProfile(userId);

      if (!company) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      const result = await storage.verifyWebsiteOwnership(company.id, method);

      if (result.success) {
        res.json({
          success: true,
          message: `Website verified successfully via ${method === 'meta_tag' ? 'Meta Tag' : 'DNS TXT Record'}`,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error('[company-verify-website] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Offer Management
  app.get("/api/admin/offers", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { status, niche, commissionType } = req.query;
      const filters: any = {};

      // Only add filters if they're not "all" or empty
      if (status && status !== 'all') filters.status = status;
      if (niche && niche !== 'all') filters.niche = niche;
      if (commissionType && commissionType !== 'all') filters.commissionType = commissionType;

      const offers = await storage.getAllOffersForAdmin(filters);
      res.json(offers);
    } catch (error: any) {
      console.error('Error fetching admin offers:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/offers/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offerData = await storage.getOfferWithStats(req.params.id);
      if (!offerData.offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      res.json(offerData);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/offers/:id/approve", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Check if company has payment method configured
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const paymentSettings = await storage.getPaymentSettings(company.userId);
      if (!paymentSettings || paymentSettings.length === 0) {
        return res.status(400).json({
          error: `Company "${company.legalName || company.tradeName}" does not have a payment method configured. Please ask them to add payment settings before approving this offer.`
        });
      }

      // Approve the offer
      const approvedOffer = await storage.approveOffer(req.params.id);
      if (!approvedOffer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Send notification to company with direct link to their offer
      await storage.createNotification({
        userId: company.userId,
        type: 'offer_approved',
        title: 'Offer Approved',
        message: `Your offer "${approvedOffer.title}" has been approved and is now live!`,
        linkUrl: `/company/offers/${approvedOffer.id}`,
        metadata: { offerId: approvedOffer.id },
      });

      res.json(approvedOffer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/offers/:id/reject", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const offer = await storage.rejectOffer(req.params.id, reason);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Send notification to company with direct link to their offer
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_rejected',
          title: 'Offer Rejected',
          message: `Your offer "${offer.title}" has been rejected. Reason: ${reason}`,
          linkUrl: `/company/offers/${offer.id}`,
          metadata: { offerId: offer.id, reason },
        });
      }

      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/offers/:id/request-edits", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ error: "Edit notes are required" });
      }

      const userId = (req.user as any)?.id || '';
      const offer = await storage.requestOfferEdits(req.params.id, notes, userId);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Send notification to company with direct link to edit their offer
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_edit_requested',
          title: 'Edits Requested for Offer',
          message: `An admin has requested edits to your offer "${offer.title}". Please review the notes and make the necessary changes.`,
          linkUrl: `/company/offers/${offer.id}/edit`,
          metadata: { offerId: offer.id, notes },
        });
      }

      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/offers/:id/feature", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { featured } = req.body;
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ error: "Featured status (boolean) is required" });
      }

      const offer = await storage.featureOfferOnHomepage(req.params.id, featured);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/admin/offers/:id/remove", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offer = await storage.removeOfferFromPlatform(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      // Send notification to company
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_removed',
          title: 'Offer Removed',
          message: `Your offer "${offer.title}" has been removed from the platform.`,
          metadata: { offerId: offer.id },
        });
      }

      res.json({ success: true, offer });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/admin/offers/:id/listing-fee", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { fee } = req.body;
      if (fee === undefined || fee === null) {
        return res.status(400).json({ error: "Listing fee is required" });
      }

      const offer = await storage.adjustOfferListingFee(req.params.id, fee.toString());
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      res.json(offer);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get offers with pending actions (delete/suspend requests)
  app.get("/api/admin/offers/pending-actions", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offers = await storage.getOffersWithPendingActions();
      res.json(offers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin approve delete request
  app.post("/api/admin/offers/:id/approve-delete", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.pendingAction !== 'delete') {
        return res.status(400).json({ error: "This offer does not have a pending delete request" });
      }

      // Get company info for notification before deletion
      const company = await storage.getCompanyProfileById(offer.companyId);
      const offerTitle = offer.title;

      // Delete assets from cloud storage before deleting the offer
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      const assetDeletionErrors: string[] = [];

      // Delete featured image if exists
      if (offer.featuredImageUrl) {
        try {
          const imagePublicId = objectStorage.extractPublicIdFromUrl(offer.featuredImageUrl);
          if (imagePublicId) {
            await objectStorage.deleteResource(imagePublicId, 'image');
            console.log(`[Offer Delete] Deleted featured image: ${imagePublicId}`);
          }
        } catch (error: any) {
          const errorMsg = `Failed to delete featured image: ${error.message}`;
          console.error(`[Offer Delete] ${errorMsg}`);
          assetDeletionErrors.push(errorMsg);
        }
      }

      // Delete all offer videos and their thumbnails
      const offerVideos = await storage.getOfferVideos(offer.id);
      for (const video of offerVideos) {
        // Delete video file
        if (video.videoUrl) {
          try {
            const videoPublicId = objectStorage.extractPublicIdFromUrl(video.videoUrl);
            if (videoPublicId) {
              await objectStorage.deleteResource(videoPublicId, 'video');
              console.log(`[Offer Delete] Deleted video: ${videoPublicId}`);
            }
          } catch (error: any) {
            const errorMsg = `Failed to delete video ${video.id}: ${error.message}`;
            console.error(`[Offer Delete] ${errorMsg}`);
            assetDeletionErrors.push(errorMsg);
          }
        }

        // Delete thumbnail if exists
        if (video.thumbnailUrl) {
          try {
            const thumbnailPublicId = objectStorage.extractPublicIdFromUrl(video.thumbnailUrl);
            if (thumbnailPublicId) {
              await objectStorage.deleteResource(thumbnailPublicId, 'image');
              console.log(`[Offer Delete] Deleted thumbnail: ${thumbnailPublicId}`);
            }
          } catch (error: any) {
            const errorMsg = `Failed to delete thumbnail for video ${video.id}: ${error.message}`;
            console.error(`[Offer Delete] ${errorMsg}`);
            assetDeletionErrors.push(errorMsg);
          }
        }
      }

      if (assetDeletionErrors.length > 0) {
        console.warn(`[Offer Delete] Asset deletion completed with ${assetDeletionErrors.length} error(s)`);
      }

      // Approve and delete the offer
      await storage.approveOfferDelete(req.params.id);

      // Notify company about approval
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_delete_approved',
          title: 'Offer Deletion Approved',
          message: `Your request to delete offer "${offerTitle}" has been approved. The offer has been permanently deleted.`,
          metadata: { offerTitle },
        });
      }

      res.json({ success: true, message: "Offer deleted successfully" });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin reject delete request
  app.post("/api/admin/offers/:id/reject-delete", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { reason } = req.body;

      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.pendingAction !== 'delete') {
        return res.status(400).json({ error: "This offer does not have a pending delete request" });
      }

      // Reject the delete request (clears pending action)
      const updatedOffer = await storage.rejectOfferDelete(req.params.id);

      // Notify company about rejection
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_delete_rejected',
          title: 'Offer Deletion Request Rejected',
          message: `Your request to delete offer "${offer.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          linkUrl: `/company/offers/${offer.id}`,
          metadata: { offerId: offer.id, reason },
        });
      }

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin approve suspend request
  app.post("/api/admin/offers/:id/approve-suspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.pendingAction !== 'suspend') {
        return res.status(400).json({ error: "This offer does not have a pending suspend request" });
      }

      // Approve and suspend the offer (changes status to 'paused')
      const updatedOffer = await storage.approveOfferSuspend(req.params.id);

      // Notify company about approval
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_suspend_approved',
          title: 'Offer Suspension Approved',
          message: `Your request to suspend offer "${offer.title}" has been approved. The offer is now paused and not visible to creators.`,
          linkUrl: `/company/offers/${offer.id}`,
          metadata: { offerId: offer.id },
        });
      }

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin reject suspend request
  app.post("/api/admin/offers/:id/reject-suspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { reason } = req.body;

      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.pendingAction !== 'suspend') {
        return res.status(400).json({ error: "This offer does not have a pending suspend request" });
      }

      // Reject the suspend request (clears pending action)
      const updatedOffer = await storage.rejectOfferSuspend(req.params.id);

      // Notify company about rejection
      const company = await storage.getCompanyProfileById(offer.companyId);
      if (company) {
        await storage.createNotification({
          userId: company.userId,
          type: 'offer_suspend_rejected',
          title: 'Offer Suspension Request Rejected',
          message: `Your request to suspend offer "${offer.title}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          linkUrl: `/company/offers/${offer.id}`,
          metadata: { offerId: offer.id, reason },
        });
      }

      res.json({ success: true, offer: updatedOffer });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/creators", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const creators = await storage.getCreatorsForAdmin();
      res.json(creators);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/creators/:id/suspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const creator = await storage.suspendCreator(req.params.id);
      res.json({ success: true, creator });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/creators/:id/unsuspend", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const creator = await storage.unsuspendCreator(req.params.id);
      res.json({ success: true, creator });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/creators/:id/ban", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const creator = await storage.banCreator(req.params.id);
      res.json({ success: true, creator });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Admin review routes
  app.get("/api/admin/reviews", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/admin/reviews/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validated = adminReviewUpdateSchema.parse(req.body);
      const review = await storage.updateReview(req.params.id, validated);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/reviews/:id/hide", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const review = await storage.hideReview(req.params.id);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/reviews/:id/unhide", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const review = await storage.unhideReview(req.params.id);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/admin/reviews/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await storage.deleteReview(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/reviews/:id/note", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = adminNoteSchema.parse(req.body);
      const review = await storage.updateAdminNote(req.params.id, validated.note, userId);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/reviews/:id/approve", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const review = await storage.approveReview(req.params.id, userId);
      res.json(review);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/admin/reviews/:id/respond", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const reviewId = req.params.id;
      const validated = adminResponseSchema.parse(req.body);

      // Verify the review exists
      const review = await storage.getReview(reviewId);
      if (!review) {
        return res.status(404).send("Review not found");
      }

      const updatedReview = await storage.respondToReview(reviewId, validated.response, userId);
      res.json(updatedReview);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).send(error.errors[0]?.message || "Invalid request");
      }
      res.status(500).send(error.message);
    }
  });

  // Content Moderation routes

  // Banned Keywords Management
  app.post("/api/admin/moderation/keywords", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = insertBannedKeywordSchema.parse(req.body);

      const [keyword] = await db.insert(bannedKeywords).values({
        ...(validated as any),
        createdBy: userId,
      }).returning();

      res.json(keyword);
    } catch (error: any) {
      console.error('[Moderation] Error creating banned keyword:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/moderation/keywords", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const isActive = req.query.isActive as string | undefined;

      let query = db.select().from(bannedKeywords).$dynamic();

      if (category) {
        query = query.where(eq(bannedKeywords.category, category as any));
      }

      if (isActive !== undefined) {
        query = query.where(eq(bannedKeywords.isActive, isActive === 'true'));
      }

      const keywords = await query;
      res.json(keywords);
    } catch (error: any) {
      console.error('[Moderation] Error fetching banned keywords:', error);
      res.status(500).send(error.message);
    }
  });

  app.put("/api/admin/moderation/keywords/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const validated = insertBannedKeywordSchema.parse(req.body);

      const [keyword] = await db
        .update(bannedKeywords)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(bannedKeywords.id, req.params.id))
        .returning();

      if (!keyword) {
        return res.status(404).send("Keyword not found");
      }

      res.json(keyword);
    } catch (error: any) {
      console.error('[Moderation] Error updating banned keyword:', error);
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/admin/moderation/keywords/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await db.delete(bannedKeywords).where(eq(bannedKeywords.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Moderation] Error deleting banned keyword:', error);
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/admin/moderation/keywords/:id/toggle", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const keyword = await db.query.bannedKeywords.findFirst({
        where: eq(bannedKeywords.id, req.params.id),
      });

      if (!keyword) {
        return res.status(404).send("Keyword not found");
      }

      const [updated] = await db
        .update(bannedKeywords)
        .set({
          isActive: !keyword.isActive,
          updatedAt: new Date(),
        })
        .where(eq(bannedKeywords.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error('[Moderation] Error toggling banned keyword:', error);
      res.status(500).send(error.message);
    }
  });

  // Content Flags Management
  app.get("/api/admin/moderation/flags", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const contentType = req.query.contentType as string | undefined;

      let query = db.query.contentFlags.findMany({
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: (contentFlags, { desc }) => [desc(contentFlags.createdAt)],
      });

      let flags = await query;

      // Filter in memory since drizzle-orm query builder is limited
      if (status) {
        flags = flags.filter(f => f.status === status);
      }
      if (contentType) {
        flags = flags.filter(f => f.contentType === contentType);
      }

      res.json(flags);
    } catch (error: any) {
      console.error('[Moderation] Error fetching content flags:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/moderation/flags/pending", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const flags = await getPendingFlags();
      res.json(flags);
    } catch (error: any) {
      console.error('[Moderation] Error fetching pending flags:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/moderation/flags/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const flag = await db.query.contentFlags.findFirst({
        where: eq(contentFlags.id, req.params.id),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
      });

      if (!flag) {
        return res.status(404).send("Content flag not found");
      }

      res.json(flag);
    } catch (error: any) {
      console.error('[Moderation] Error fetching content flag:', error);
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/admin/moderation/flags/:id/review", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { status, adminNotes, actionTaken } = req.body;

      if (!status || !['reviewed', 'dismissed', 'action_taken'].includes(status)) {
        return res.status(400).send("Invalid status. Must be: reviewed, dismissed, or action_taken");
      }

      await reviewFlaggedContent(req.params.id, userId, status, adminNotes);

      const flag = await db.query.contentFlags.findFirst({
        where: eq(contentFlags.id, req.params.id),
      });

      res.json(flag);
    } catch (error: any) {
      console.error('[Moderation] Error reviewing content flag:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/moderation/statistics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const stats = await getFlagStatistics();
      res.json(stats);
    } catch (error: any) {
      console.error('[Moderation] Error fetching moderation statistics:', error);
      res.status(500).send(error.message);
    }
  });

  // Audit Log routes
  app.get("/api/admin/audit-logs", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;

      const logs = await storage.getAuditLogs({
        userId,
        action,
        entityType,
        entityId,
        limit,
        offset,
      });

      res.json(logs);
    } catch (error: any) {
      console.error('[Audit Logs] Error fetching logs:', error);
      res.status(500).send(error.message);
    }
  });

  // Platform Settings routes
  app.get("/api/admin/settings", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const settings = category
        ? await storage.getPlatformSettingsByCategory(category)
        : await storage.getAllPlatformSettings();
      res.json(settings);
    } catch (error: any) {
      console.error('[Platform Settings] Error fetching settings:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/settings/:key", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const setting = await storage.getPlatformSetting(req.params.key);
      if (!setting) {
        return res.status(404).send("Setting not found");
      }
      res.json(setting);
    } catch (error: any) {
      console.error('[Platform Settings] Error fetching setting:', error);
      res.status(500).send(error.message);
    }
  });

  app.put("/api/admin/settings/:key", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { value } = req.body;

      if (value === undefined || value === null) {
        return res.status(400).send("Value is required");
      }

      const setting = await storage.updatePlatformSetting(req.params.key, value.toString(), userId);

      // Clear fee settings cache if fee-related setting was updated
      if (req.params.key.includes('fee') || req.params.key.includes('percentage')) {
        clearFeeSettingsCache();
      }

      // Log the settings change
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.UPDATE_PLATFORM_SETTINGS,
        entityType: EntityTypes.PLATFORM_SETTINGS,
        entityId: req.params.key,
        changes: { value },
        reason: req.body.reason,
      }, req);

      res.json(setting);
    } catch (error: any) {
      console.error('[Platform Settings] Error updating setting:', error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/settings", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { key, value, description, category } = req.body;

      if (!key || value === undefined || value === null) {
        return res.status(400).send("Key and value are required");
      }

      const setting = await storage.createPlatformSetting({
        key,
        value: value.toString(),
        description: description || null,
        category: category || null,
        updatedBy: userId,
      });

      // Clear fee settings cache if fee-related setting was created
      if (key.includes('fee') || key.includes('percentage')) {
        clearFeeSettingsCache();
      }

      res.json(setting);
    } catch (error: any) {
      console.error('[Platform Settings] Error creating setting:', error);
      res.status(500).send(error.message);
    }
  });

  // Public endpoint to get current platform fee settings (for client display)
  app.get("/api/platform/fees", async (req, res) => {
    try {
      const { platformFee, stripeFee } = await getPlatformFeeSettings();
      const totalFee = platformFee + stripeFee;

      res.json({
        platformFeePercentage: platformFee,
        platformFeeDisplay: `${(platformFee * 100).toFixed(0)}%`,
        stripeFeePercentage: stripeFee,
        stripeFeeDisplay: `${(stripeFee * 100).toFixed(0)}%`,
        totalFeePercentage: totalFee,
        totalFeeDisplay: `${(totalFee * 100).toFixed(0)}%`,
      });
    } catch (error: any) {
      console.error('[Platform Fees] Error fetching fee settings:', error);
      res.status(500).send(error.message);
    }
  });

  // Admin messaging monitoring routes
  app.get("/api/admin/conversations", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const conversations = await storage.getAllConversationsForAdmin({ search, limit, offset });
      res.json(conversations);
    } catch (error: any) {
      console.error('[Admin Conversations] Error fetching conversations:', error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/admin/messages/:conversationId", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.conversationId);
      res.json(messages);
    } catch (error: any) {
      console.error('[Admin Messages] Error fetching messages:', error);
      res.status(500).send(error.message);
    }
  });

  // Admin send message as platform - allows admins to join conversations and send messages
  app.post("/api/admin/messages", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { conversationId, content } = req.body;
      const adminId = (req.user as any).id;

      if (!conversationId || !content?.trim()) {
        return res.status(400).send("Conversation ID and content are required");
      }

      // Verify conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).send("Conversation not found");
      }

      // Create the message as platform
      const message = await storage.createAdminMessage(conversationId, adminId, content.trim());

      // Log admin action for audit trail
      await storage.createAuditLog({
        userId: adminId,
        action: 'admin_message_sent',
        entityType: 'message',
        entityId: message.id,
        changes: {
          conversationId,
          messagePreview: content.substring(0, 100),
        },
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error('[Admin Messages] Error sending message:', error);
      res.status(500).send(error.message);
    }
  });

  // Admin conversation export for legal compliance/dispute resolution
  app.get("/api/admin/conversations/:conversationId/export", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { conversationId } = req.params;
      const format = (req.query.format as string) || 'json';

      if (!['json', 'csv'].includes(format)) {
        return res.status(400).send("Invalid format. Supported formats: json, csv");
      }

      // Get conversation details
      const conversation = await storage.getConversationWithDetails(conversationId);
      if (!conversation) {
        return res.status(404).send("Conversation not found");
      }

      // Get all messages
      const messages = await storage.getMessages(conversationId);

      // Get user details for sender names
      const creatorUser = await storage.getUser(conversation.creatorId);
      const companyProfile = await storage.getCompanyProfile(conversation.companyId);
      const companyUser = companyProfile ? await storage.getUser(companyProfile.userId) : null;

      const creatorName = creatorUser
        ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() || creatorUser.email
        : 'Unknown Creator';
      const companyName = companyProfile?.tradeName || companyProfile?.legalName || 'Unknown Company';

      // Format messages with sender info
      const formattedMessages = messages.map(msg => {
        // Check if this is a platform/admin message
        const isPlatformMessage = (msg as any).senderType === 'platform';

        let senderName: string;
        let senderType: string;

        if (isPlatformMessage) {
          senderName = 'Platform';
          senderType = 'platform';
        } else if (msg.senderId === conversation.creatorId) {
          senderName = creatorName;
          senderType = 'creator';
        } else {
          senderName = companyName;
          senderType = 'company';
        }

        return {
          id: msg.id,
          senderId: msg.senderId,
          senderName,
          senderType,
          content: msg.content,
          attachments: msg.attachments || [],
          createdAt: msg.createdAt,
          isRead: msg.isRead,
        };
      });

      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportedBy: (req.user as any).id,
          exportPurpose: 'Legal compliance and dispute resolution',
          platform: 'AffiliateXchange',
        },
        conversation: {
          id: conversationId,
          offerTitle: conversation.offerTitle || 'Unknown Offer',
          creator: {
            id: conversation.creatorId,
            name: creatorName,
            email: creatorUser?.email || '',
          },
          company: {
            id: conversation.companyId,
            name: companyName,
          },
          createdAt: conversation.createdAt,
          lastMessageAt: conversation.lastMessageAt,
          totalMessages: messages.length,
        },
        messages: formattedMessages,
      };

      if (format === 'csv') {
        // Generate CSV format
        const csvHeaders = ['Message ID', 'Timestamp', 'Sender Name', 'Sender Type', 'Message Content', 'Has Attachments', 'Attachment Count', 'Is Read'];
        const csvRows = [
          ['--- CONVERSATION METADATA ---', '', '', '', '', '', '', ''],
          ['Conversation ID', conversationId, '', '', '', '', '', ''],
          ['Offer', exportData.conversation.offerTitle, '', '', '', '', '', ''],
          ['Creator', creatorName, creatorUser?.email || '', '', '', '', '', ''],
          ['Company', companyName, '', '', '', '', '', ''],
          ['Started', exportData.conversation.createdAt?.toString() || '', '', '', '', '', '', ''],
          ['Last Message', exportData.conversation.lastMessageAt?.toString() || '', '', '', '', '', '', ''],
          ['Total Messages', messages.length.toString(), '', '', '', '', '', ''],
          ['Export Date', new Date().toISOString(), '', '', '', '', '', ''],
          ['--- MESSAGE HISTORY ---', '', '', '', '', '', '', ''],
          csvHeaders,
          ...formattedMessages.map(msg => [
            msg.id,
            new Date(msg.createdAt!).toISOString(),
            msg.senderName,
            msg.senderType,
            msg.content || '',
            msg.attachments.length > 0 ? 'Yes' : 'No',
            msg.attachments.length.toString(),
            msg.isRead ? 'Yes' : 'No',
          ]),
        ];

        const csvContent = csvRows
          .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}-export.csv"`);
        return res.send(csvContent);
      }

      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}-export.json"`);
      res.json(exportData);
    } catch (error: any) {
      console.error('[Admin Conversation Export] Error:', error);
      res.status(500).send(error.message);
    }
  });


  // Admin niche categories management
  app.get("/api/admin/niches", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const niches = await storage.getNiches();
      res.json(niches);
    } catch (error: any) {
      console.error('[Admin Niches] Error fetching niches:', error);
      res.status(500).send(error.message);
    }
  });

  app.post("/api/admin/niches", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, description, isActive } = req.body;

      if (!name) {
        return res.status(400).send("Niche name is required");
      }

      const niche = await storage.addNiche(name, description, isActive !== false, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.CREATE_NICHE,
        entityType: EntityTypes.NICHE,
        entityId: niche.id,
        changes: { name, description, isActive },
        reason: 'Added new niche category',
      }, req);

      res.json(niche);
    } catch (error: any) {
      console.error('[Admin Niches] Error adding niche:', error);
      res.status(500).send(error.message);
    }
  });

  // Reorder niches (drag-and-drop) - MUST be before /:id route to avoid matching "reorder" as an id
  app.put("/api/admin/niches/reorder", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { orderedIds } = req.body;

      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).send("orderedIds array is required");
      }

      const niches = await storage.reorderNiches(orderedIds, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.REORDER_NICHES,
        entityType: EntityTypes.NICHE,
        changes: { orderedIds },
        reason: 'Reordered niche categories',
      }, req);

      res.json(niches);
    } catch (error: any) {
      console.error('[Admin Niches] Error reordering niches:', error);
      res.status(500).send(error.message);
    }
  });

  app.put("/api/admin/niches/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const nicheId = req.params.id;
      const { name, description, isActive } = req.body;

      const niche = await storage.updateNiche(nicheId, { name, description, isActive }, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.UPDATE_NICHE,
        entityType: EntityTypes.NICHE,
        entityId: nicheId,
        changes: { name, description, isActive },
        reason: 'Updated niche category',
      }, req);

      res.json(niche);
    } catch (error: any) {
      console.error('[Admin Niches] Error updating niche:', error);
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/admin/niches/:id", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const nicheId = req.params.id;

      await storage.deleteNiche(nicheId, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.DELETE_NICHE,
        entityType: EntityTypes.NICHE,
        entityId: nicheId,
        reason: 'Deleted niche category',
      }, req);

      res.json({ success: true, message: 'Niche deleted successfully' });
    } catch (error: any) {
      console.error('[Admin Niches] Error deleting niche:', error);
      res.status(500).send(error.message);
    }
  });

  // Set a niche as primary
  app.put("/api/admin/niches/:id/set-primary", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const nicheId = req.params.id;

      const niche = await storage.setNicheAsPrimary(nicheId, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.SET_PRIMARY_NICHE,
        entityType: EntityTypes.NICHE,
        entityId: nicheId,
        changes: { isPrimary: true },
        reason: 'Set niche as primary',
      }, req);

      res.json(niche);
    } catch (error: any) {
      console.error('[Admin Niches] Error setting primary niche:', error);
      res.status(500).send(error.message);
    }
  });

  // Merge niches
  app.post("/api/admin/niches/merge", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { sourceId, targetId } = req.body;

      if (!sourceId || !targetId) {
        return res.status(400).send("sourceId and targetId are required");
      }

      if (sourceId === targetId) {
        return res.status(400).send("Cannot merge a niche with itself");
      }

      const result = await storage.mergeNiches(sourceId, targetId, userId);

      // Log the action
      const { logAuditAction, AuditActions, EntityTypes } = await import('./auditLog');
      await logAuditAction(userId, {
        action: AuditActions.MERGE_NICHES,
        entityType: EntityTypes.NICHE,
        entityId: targetId,
        changes: {
          sourceId,
          targetId,
          updatedOffers: result.updatedOffers,
          updatedCreators: result.updatedCreators
        },
        reason: 'Merged niche categories',
      }, req);

      res.json(result);
    } catch (error: any) {
      console.error('[Admin Niches] Error merging niches:', error);
      res.status(500).send(error.message);
    }
  });

  // Public endpoint to get active niches
  app.get("/api/niches", async (req, res) => {
    try {
      const niches = await storage.getActiveNiches();
      res.json(niches);
    } catch (error: any) {
      console.error('[Niches] Error fetching niches:', error);
      res.status(500).send(error.message);
    }
  });

  // Object Storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(filePath, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Simple image proxy for allowed external hosts (e.g., GCS, Cloudinary)
  // This makes images same-origin and helps avoid browser tracking-prevention blocking
  app.get("/proxy/image", async (req, res) => {
    try {
      const url = (req.query.url as string) || req.query.u as string;
      if (!url) return res.status(400).send("url query param is required");

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (e) {
        return res.status(400).send("invalid url");
      }

      // Only allow known safe hosts to avoid open proxy / SSRF
      const allowedHosts = ["res.cloudinary.com", "cloudinary.com", "storage.googleapis.com"];
      const hostname = parsed.hostname || "";
      const allowed = allowedHosts.some((h) => hostname.endsWith(h));
      if (!allowed) return res.status(403).send("forbidden host");

      if (parsed.protocol !== "https:") return res.status(400).send("only https urls are allowed");

      // Generate signed URLs for GCS files (they are private by default)
      let fetchUrl = url;
      if (hostname.endsWith("storage.googleapis.com") || hostname.endsWith("googleapis.com")) {
        try {
          const pathParts = parsed.pathname.split('/').filter(p => p);
          if (pathParts.length >= 2) {
            const filePath = pathParts.slice(1).join('/');
            const { Storage } = await import('@google-cloud/storage');
            const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
            const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
            let gcsStorage: any;
            const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
            if (credentialsJson) {
              const credentials = JSON.parse(credentialsJson);
              gcsStorage = new Storage({
                projectId: projectId || credentials.project_id,
                credentials,
              });
            } else if (process.env.GOOGLE_CLOUD_KEYFILE) {
              const { existsSync } = await import('node:fs');
              if (existsSync(process.env.GOOGLE_CLOUD_KEYFILE)) {
                gcsStorage = new Storage({
                  projectId,
                  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
                });
              } else {
                if (!(globalThis as any).__gcsKeyfileWarned) {
                  console.warn(
                    `[Proxy Image] GOOGLE_CLOUD_KEYFILE points to a missing file (${process.env.GOOGLE_CLOUD_KEYFILE}); skipping signed-URL generation. Set GOOGLE_CLOUD_CREDENTIALS_JSON or fix the path to enable private GCS image proxying.`
                  );
                  (globalThis as any).__gcsKeyfileWarned = true;
                }
                gcsStorage = null;
              }
            } else {
              gcsStorage = new Storage({ projectId });
            }
            if (gcsStorage) {
              const [signedUrl] = await gcsStorage
                .bucket(bucketName)
                .file(filePath)
                .getSignedUrl({
                  version: 'v4',
                  action: 'read',
                  expires: Date.now() + 60 * 60 * 1000,
                });
              fetchUrl = signedUrl;
              console.log('[Proxy Image] Generated signed URL for GCS file:', filePath);
            }
          }
        } catch (signedUrlError) {
          console.error('[Proxy Image] Failed to generate signed URL:', signedUrlError);
        }
      }

      const fetchRes = await fetch(fetchUrl, { method: "GET" });
      if (!fetchRes.ok) return res.status(fetchRes.status).send("failed to fetch image");

      const contentType = fetchRes.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      const cacheControl = fetchRes.headers.get("cache-control");
      if (cacheControl) res.setHeader("Cache-Control", cacheControl);

      // Allow browsers to fetch this proxied resource from same-origin
      res.setHeader("Access-Control-Allow-Origin", "*");

      const arrayBuffer = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error: any) {
      console.error('[Proxy] Error fetching image:', error);
      res.status(500).send(error?.message || 'proxy error');
    }
  });

  // Video proxy with range request support for proper video streaming
  app.get("/proxy/video", async (req, res) => {
    try {
      const url = (req.query.url as string) || req.query.u as string;
      if (!url) return res.status(400).send("url query param is required");

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (e) {
        return res.status(400).send("invalid url");
      }

      // Only allow known safe hosts to avoid open proxy / SSRF
      const allowedHosts = ["res.cloudinary.com", "cloudinary.com", "storage.googleapis.com"];
      const hostname = parsed.hostname || "";
      const allowed = allowedHosts.some((h) => hostname.endsWith(h));
      if (!allowed) return res.status(403).send("forbidden host");

      if (parsed.protocol !== "https:") return res.status(400).send("only https urls are allowed");

      // Generate signed URLs for GCS files (they are private by default)
      let fetchUrl = url;
      if (hostname.endsWith("storage.googleapis.com") || hostname.endsWith("googleapis.com")) {
        try {
          const pathParts = parsed.pathname.split('/').filter(p => p);
          if (pathParts.length >= 2) {
            const filePath = pathParts.slice(1).join('/');
            const { Storage } = await import('@google-cloud/storage');
            const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
            const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
            let gcsStorage: any;
            const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
            if (credentialsJson) {
              const credentials = JSON.parse(credentialsJson);
              gcsStorage = new Storage({
                projectId: projectId || credentials.project_id,
                credentials,
              });
            } else if (process.env.GOOGLE_CLOUD_KEYFILE) {
              const { existsSync } = await import('node:fs');
              if (existsSync(process.env.GOOGLE_CLOUD_KEYFILE)) {
                gcsStorage = new Storage({
                  projectId,
                  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
                });
              } else {
                if (!(globalThis as any).__gcsKeyfileWarned) {
                  console.warn(
                    `[Proxy Video] GOOGLE_CLOUD_KEYFILE points to a missing file (${process.env.GOOGLE_CLOUD_KEYFILE}); skipping signed-URL generation. Set GOOGLE_CLOUD_CREDENTIALS_JSON or fix the path to enable private GCS video proxying.`
                  );
                  (globalThis as any).__gcsKeyfileWarned = true;
                }
                gcsStorage = null;
              }
            } else {
              gcsStorage = new Storage({ projectId });
            }
            if (gcsStorage) {
              const [signedUrl] = await gcsStorage
                .bucket(bucketName)
                .file(filePath)
                .getSignedUrl({
                  version: 'v4',
                  action: 'read',
                  expires: Date.now() + 60 * 60 * 1000,
                });
              fetchUrl = signedUrl;
              console.log('[Proxy Video] Generated signed URL for GCS file:', filePath);
            }
          }
        } catch (signedUrlError) {
          console.error('[Proxy Video] Failed to generate signed URL:', signedUrlError);
        }
      }

      // Get the range header from the request (for video seeking)
      const range = req.headers.range;

      // Prepare headers for the upstream request
      const headers: Record<string, string> = {};
      if (range) {
        headers['Range'] = range;
      }

      const fetchRes = await fetch(fetchUrl, {
        method: "GET",
        headers
      });

      if (!fetchRes.ok && fetchRes.status !== 206) {
        return res.status(fetchRes.status).send("failed to fetch video");
      }

      // Forward the status code (200 for full content, 206 for partial content)
      res.status(fetchRes.status);

      // Forward important headers
      const contentType = fetchRes.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      const contentLength = fetchRes.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const contentRange = fetchRes.headers.get("content-range");
      if (contentRange) res.setHeader("Content-Range", contentRange);

      const acceptRanges = fetchRes.headers.get("accept-ranges");
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
      else res.setHeader("Accept-Ranges", "bytes"); // Enable range requests

      const cacheControl = fetchRes.headers.get("cache-control");
      if (cacheControl) res.setHeader("Cache-Control", cacheControl);

      // Allow browsers to fetch this proxied resource
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Stream the video content (don't load into memory)
      if (fetchRes.body) {
        const reader = fetchRes.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (error) {
            console.error('[Video Proxy] Error streaming video:', error);
            res.end();
          }
        };
        await pump();
      } else {
        // Fallback for when body is not available
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
      }
    } catch (error: any) {
      console.error('[Video Proxy] Error fetching video:', error);
      res.status(500).send(error?.message || 'video proxy error');
    }
  });

  // Generic file proxy to support documents and other assets
  app.get("/proxy/file", async (req, res) => {
    try {
      const url = (req.query.url as string) || req.query.u as string;
      if (!url) return res.status(400).send("url query param is required");

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch (e) {
        return res.status(400).send("invalid url");
      }

      // Only allow known safe hosts to avoid open proxy / SSRF
      const allowedHosts = ["res.cloudinary.com", "cloudinary.com", "storage.googleapis.com"];
      const hostname = parsed.hostname || "";
      const allowed = allowedHosts.some((h) => hostname === h || hostname.endsWith("." + h));
      if (!allowed) return res.status(403).send("forbidden host");

      if (parsed.protocol !== "https:") return res.status(400).send("only https urls are allowed");

      const fetchRes = await fetch(url, { method: "GET" });
      if (!fetchRes.ok) return res.status(fetchRes.status).send("failed to fetch file");

      const contentType = fetchRes.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);

      const contentLength = fetchRes.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const cacheControl = fetchRes.headers.get("cache-control");
      if (cacheControl) res.setHeader("Cache-Control", cacheControl);

      res.setHeader("Access-Control-Allow-Origin", "*");

      if (fetchRes.body) {
        const reader = fetchRes.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
            res.end();
          } catch (error) {
            console.error('[File Proxy] Error streaming file:', error);
            res.end();
          }
        };
        await pump();
      } else {
        const arrayBuffer = await fetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.send(buffer);
      }
    } catch (error: any) {
      console.error('[File Proxy] Error fetching file:', error);
      res.status(500).send(error?.message || 'file proxy error');
    }
  });

  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    console.log("🔍 Requested object path:", req.path);
    const userId = (req.user as any)?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      const publicId = req.path.replace("/objects/", "");
      objectStorageService.downloadObject(publicId, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        // FALLBACK: Try to serve from Cloudinary directly
        // This handles legacy normalized URLs that haven't been migrated yet
        const publicId = req.path.replace("/objects/", "");
        const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dilp6tuin";

        console.log(`[Objects Fallback] Trying Cloudinary URLs for ${publicId}`);

        // FIRST: Check if this is a video in the database - we can get the company/offer context.
        // AFFEXCH Phase 6.5: offer_videos was deprecated; skip the DB lookup
        // and fall through to the brute-force folder scan below.
        try {
          const videoRecord: Array<{ offer: any }> = [];

          if (videoRecord && videoRecord.length > 0 && videoRecord[0].offer) {
            const { offer } = videoRecord[0];
            console.log(`[Objects Fallback] Found video in DB: company=${offer.companyId}, offer=${offer.id}`);

            // Try the nested folder structure where videos are actually stored
            const specificFolders = [
              `creatorlink/videos/${offer.companyId}/${offer.id}`,
              `creatorlink/videos/${offer.companyId}`,
            ];

            for (const folder of specificFolders) {
              const path = `${folder}/${publicId}`;

              for (const ext of ['mp4', 'mov', 'webm', 'avi']) {
                const videoUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${path}.${ext}`;
                try {
                  const headRes = await fetch(videoUrl, { method: 'HEAD' });
                  if (headRes.ok) {
                    console.log(`[Objects Fallback] \u2713 Found video at: ${videoUrl}`);

                    const range = req.headers.range;
                    const headers: Record<string, string> = {};
                    if (range) headers['Range'] = range;

                    const videoRes = await fetch(videoUrl, { method: "GET", headers });
                    if (!videoRes.ok && videoRes.status !== 206) continue;

                    res.status(videoRes.status);

                    const contentType = videoRes.headers.get("content-type");
                    if (contentType) res.setHeader("Content-Type", contentType);

                    const contentLength = videoRes.headers.get("content-length");
                    if (contentLength) res.setHeader("Content-Length", contentLength);

                    const contentRange = videoRes.headers.get("content-range");
                    if (contentRange) res.setHeader("Content-Range", contentRange);

                    const acceptRanges = videoRes.headers.get("accept-ranges");
                    if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
                    else res.setHeader("Accept-Ranges", "bytes");

                    res.setHeader("Cache-Control", "public, max-age=31536000");
                    res.setHeader("Access-Control-Allow-Origin", "*");

                    if (videoRes.body) {
                      const reader = videoRes.body.getReader();
                      try {
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          res.write(Buffer.from(value));
                        }
                        return res.end();
                      } catch (streamError) {
                        console.error('[Objects Fallback] Error streaming:', streamError);
                        return res.end();
                      }
                    } else {
                      const buffer = await videoRes.arrayBuffer();
                      return res.send(Buffer.from(buffer));
                    }
                  }
                } catch (e) {
                  // Try next extension
                }
              }
            }
          }
        } catch (dbError) {
          console.error('[Objects Fallback] Database lookup error:', dbError);
        }

        // FALLBACK: Try common folder patterns if database lookup didn't find it
        const folderPatterns = [
          'creatorlink/videos/thumbnails',
          'creatorlink/videos',
          'creatorlink/retainer',
          'company-logos',
          'profile-images',
          'verification-documents',
          '' // Root folder (no prefix)
        ];

        // Try to fetch as image with different folder patterns
        // We'll try the most common extension (jpg) first
        for (const folder of folderPatterns) {
          const path = folder ? `${folder}/${publicId}` : publicId;

          // Try common image extensions
          for (const ext of ['jpg', 'png', 'jpeg']) {
            const imageUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}.${ext}`;
            try {
              const imageRes = await fetch(imageUrl);
              if (imageRes.ok) {
                console.log(`[Objects Fallback] \u2713 Found as image: ${imageUrl}`);
                const contentType = imageRes.headers.get("content-type");
                if (contentType) res.setHeader("Content-Type", contentType);
                res.setHeader("Cache-Control", "public, max-age=31536000");
                res.setHeader("Access-Control-Allow-Origin", "*");
                const buffer = await imageRes.arrayBuffer();
                return res.send(Buffer.from(buffer));
              }
            } catch (e) {
              // Try next extension
            }
          }
        }

        // Try to fetch as video with different folder patterns (with range request support)
        for (const folder of folderPatterns) {
          const path = folder ? `${folder}/${publicId}` : publicId;

          // Try common video extensions
          for (const ext of ['mp4', 'mov', 'webm', 'avi']) {
            const videoUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${path}.${ext}`;
            try {
              // Check if the video exists first with a HEAD request
              const headRes = await fetch(videoUrl, { method: 'HEAD' });
              if (headRes.ok) {
                console.log(`[Objects Fallback] \u2713 Found as video: ${videoUrl}`);

                // Get the range header from the request (for video seeking)
                const range = req.headers.range;
                const headers: Record<string, string> = {};
                if (range) {
                  headers['Range'] = range;
                }

                // Fetch the video with range support
                const videoRes = await fetch(videoUrl, {
                  method: "GET",
                  headers
                });

                if (!videoRes.ok && videoRes.status !== 206) {
                  continue; // Try next extension
                }

                // Forward the status code (200 for full content, 206 for partial content)
                res.status(videoRes.status);

                // Forward important headers
                const contentType = videoRes.headers.get("content-type");
                if (contentType) res.setHeader("Content-Type", contentType);

                const contentLength = videoRes.headers.get("content-length");
                if (contentLength) res.setHeader("Content-Length", contentLength);

                const contentRange = videoRes.headers.get("content-range");
                if (contentRange) res.setHeader("Content-Range", contentRange);

                const acceptRanges = videoRes.headers.get("accept-ranges");
                if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
                else res.setHeader("Accept-Ranges", "bytes");

                res.setHeader("Cache-Control", "public, max-age=31536000");
                res.setHeader("Access-Control-Allow-Origin", "*");

                // Stream the video content instead of loading into memory
                if (videoRes.body) {
                  const reader = videoRes.body.getReader();
                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      res.write(Buffer.from(value));
                    }
                    return res.end();
                  } catch (streamError) {
                    console.error('[Objects Fallback] Error streaming video:', streamError);
                    return res.end();
                  }
                } else {
                  // Fallback if streaming not available
                  const buffer = await videoRes.arrayBuffer();
                  return res.send(Buffer.from(buffer));
                }
              }
            } catch (e) {
              // Try next extension
            }
          }
        }

        console.log(`[Objects Fallback] ✗ Not found in any Cloudinary folder`);
        return res.sendStatus(404);
      }
      // Log unexpected errors only
      console.error("Error checking object access:", error);
      return res.sendStatus(500);
    }
  });

  // Debug endpoint to check video URLs in database
  app.get("/api/debug/videos", requireAuth, async (req, res) => {
    try {
      const videos = await db.select().from(offerVideos);

      const videoStats = {
        total: videos.length,
        withCloudinaryUrls: videos.filter(v => v.videoUrl?.includes('cloudinary.com')).length,
        withObjectsUrls: videos.filter(v => v.videoUrl?.startsWith('/objects/')).length,
        withOtherUrls: videos.filter(v => v.videoUrl && !v.videoUrl.includes('cloudinary.com') && !v.videoUrl.startsWith('/objects/')).length,
        videos: videos.map(v => ({
          id: v.id,
          offerId: v.offerId,
          title: v.title,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl,
          urlType: v.videoUrl?.includes('cloudinary.com') ? 'cloudinary' :
                   v.videoUrl?.startsWith('/objects/') ? 'objects' : 'other'
        }))
      };

      res.json(videoStats);
    } catch (error: any) {
      console.error('[Debug Videos] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const folder = req.body.folder || undefined; // Optional folder parameter
    const resourceType = req.body.resourceType || 'auto'; // Optional resource type (image, video, auto)
    const contentType = req.body.contentType || undefined; // Optional content type from client
    const fileName = req.body.fileName || undefined; // Optional original filename
    console.log('[Upload API] Requested folder:', req.body.folder);
    console.log('[Upload API] Requested resourceType:', req.body.resourceType);
    console.log('[Upload API] Requested contentType:', contentType);
    console.log('[Upload API] Requested fileName:', fileName);
    console.log('[Upload API] Folder parameter passed to service:', folder);
    const uploadParams = await objectStorageService.getObjectEntityUploadURL(folder, resourceType, contentType, fileName);
    console.log('[Upload API] Upload params returned:', uploadParams);
    res.json(uploadParams);
  });

  // Configure multer for file uploads (store in memory as buffer)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
  });

  // Endpoint to generate signed URL for reading an existing file
  // Query params: download=true (forces download with Content-Disposition), name=filename (custom download name)
  app.get("/api/get-signed-url/:filename(*)", requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;
      const isDownload = req.query.download === 'true';
      const ext = filename.split('.').pop()?.toLowerCase();
      const resourceType = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '') ? 'video' : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '') ? 'image' : 'raw';

      const objectStorageService = new ObjectStorageService();
      const url = await objectStorageService.getSignedViewUrl(filename, {
        resourceType: resourceType as any,
        expiresIn: 3600, // 1 hour
      });

      console.log('[Signed URL API] Generated GCS signed URL for:', filename, isDownload ? '(download)' : '(view)');
      res.json({ url });
    } catch (error: any) {
      console.error('Error generating signed URL:', error);
      res.status(500).json({ error: 'Failed to generate URL', details: error.message });
    }
  });

  // Endpoint to upload a file directly and get its signed URL
  app.post("/api/upload-file", requireAuth, upload.single('file'), async (req: ExpressRequest, res) => {
    try {
      // Type assertion for multer's file property
      const multerReq = req as ExpressRequest & { file?: MulterFile };

      if (!multerReq.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = multerReq.file;
      const folder = req.body.folder || 'affiliatexchange/uploads';
      const resourceType = (req.body.resourceType as any) || 'auto';

      const objectStorageService = new ObjectStorageService();
      const uploadResult = await objectStorageService.uploadBuffer(file.buffer, {
        folder,
        resourceType,
        publicId: file.originalname,
        contentType: file.mimetype,
      });

      res.json({
        message: 'File uploaded successfully',
        filename: uploadResult.objectPath,
        originalName: file.originalname,
        url: uploadResult.url,
        publicUrl: uploadResult.url,
      });
    } catch (error: any) {
      console.error('Error in direct upload:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/company-logos", requireAuth, requireRole('company'), async (req, res) => {
    if (!req.body.logoUrl) {
      return res.status(400).json({ error: "logoUrl is required" });
    }
    const userId = (req.user as any).id;
    try {
      // Save full Cloudinary URL like creator profile does
      const logoUrl = req.body.logoUrl;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (companyProfile) {
        await storage.updateCompanyProfile(userId, { logoUrl });
      }
      res.status(200).json({ objectPath: logoUrl });
    } catch (error) {
      console.error("Error setting company logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete company logo - removes from storage and database
  app.delete("/api/company-logos", requireAuth, requireRole('company'), async (req, res) => {
    const userId = (req.user as any).id;
    try {
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      const currentLogoUrl = companyProfile.logoUrl;

      // Delete from Google Cloud Storage if logo exists
      if (currentLogoUrl) {
        try {
          const logoPublicId = sharedObjectStorageService.extractPublicIdFromUrl(currentLogoUrl);
          if (logoPublicId) {
            await sharedObjectStorageService.deleteResource(logoPublicId, 'image');
            console.log(`[Company Logo Delete] Deleted logo from storage: ${logoPublicId}`);
          }
        } catch (storageError: any) {
          // Log but don't fail if storage deletion fails - still update database
          console.error(`[Company Logo Delete] Storage deletion error: ${storageError.message}`);
        }
      }

      // Update database to remove logo URL
      await storage.updateCompanyProfile(userId, { logoUrl: null });

      res.status(200).json({ success: true, message: "Logo deleted successfully" });
    } catch (error) {
      console.error("Error deleting company logo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Offer Videos endpoints
  app.get("/api/offers/:offerId/videos", requireAuth, async (req, res) => {
    try {
      const videos = await storage.getOfferVideos(req.params.offerId);
      res.json(videos);
    } catch (error: any) {
      console.error("Error fetching offer videos:", error);
      res.status(500).send(error.message);
    }
  });

  // AFFEXCH Phase 6.5: offer_videos table is deprecated. The peptide-promo-code
  // model doesn't use per-offer video uploads, so these write endpoints are
  // permanently disabled. Existing clients get a 410 Gone instead of a 500.
  app.post("/api/offers/:offerId/videos", requireAuth, async (_req, res) => {
    res.status(410).json({ error: "Offer video uploads are no longer supported" });
  });

  app.delete("/api/offer-videos/:id", requireAuth, async (_req, res) => {
    res.status(410).json({ error: "Offer video uploads are no longer supported" });
  });

  // =====================================================
  // RETAINER CONTRACTS ROUTES
  // =====================================================

  // Get all retainer contracts for creator (open contracts + contracts with approved applications)
  app.get("/api/retainer-contracts", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // Get open contracts (for browsing/applying)
      const openContracts = await storage.getOpenRetainerContracts();

      // Get contracts where the creator has an approved application
      const myApprovedContracts = await storage.getContractsWithApprovedApplicationsByCreator(userId);

      // Combine and deduplicate (in case a contract is both open and has approved application)
      const contractMap = new Map();

      // Add approved contracts first (higher priority - these are the creator's active retainers)
      myApprovedContracts.forEach(contract => {
        contractMap.set(contract.id, contract);
      });

      // Add open contracts (only if not already in map)
      openContracts.forEach(contract => {
        if (!contractMap.has(contract.id)) {
          contractMap.set(contract.id, contract);
        }
      });

      // Convert map back to array and add submitted video counts
      const allContracts = Array.from(contractMap.values());

      // Add submittedVideos count to each contract
      const contractsWithCounts = await Promise.all(
        allContracts.map(async (contract) => {
          const submittedVideos = await storage.getRetainerDeliverableCountByContract(contract.id);
          return {
            ...contract,
            submittedVideos,
          };
        })
      );

      res.json(contractsWithCounts);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get specific retainer contract
  app.get("/api/retainer-contracts/:id", requireAuth, async (req, res) => {
    try {
      const contract = await storage.getRetainerContract(req.params.id);
      if (!contract) return res.status(404).send("Not found");
      res.json(contract);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Get their retainer contracts
  app.get("/api/company/retainer-contracts", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) {
        // Return empty array instead of 404 to allow page to render properly
        return res.json([]);
      }
      const contracts = await storage.getRetainerContractsByCompany(companyProfile.id);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Create retainer contract
  app.post("/api/company/retainer-contracts", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const validated = createRetainerContractSchema.parse(req.body);
      const contract = await storage.createRetainerContract({ ...validated, companyId: companyProfile.id });
      res.json(contract);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Update retainer contract
  app.patch("/api/company/retainer-contracts/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const contract = await storage.getRetainerContract(req.params.id);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      const validated = createRetainerContractSchema.partial().parse(req.body);
      const updated = await storage.updateRetainerContract(req.params.id, validated);
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Delete retainer contract
  app.delete("/api/company/retainer-contracts/:id", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const contract = await storage.getRetainerContract(req.params.id);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      await storage.deleteRetainerContract(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Get assigned contracts
  app.get("/api/creator/retainer-contracts", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const contracts = await storage.getRetainerContractsByCreator(userId);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get applications for a contract
  app.get("/api/retainer-contracts/:id/applications", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const contract = await storage.getRetainerContract(req.params.id);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      const applications = await storage.getRetainerApplicationsByContract(req.params.id);
      res.json(applications);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Get their applications
  app.get("/api/creator/retainer-applications", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const applications = await storage.getRetainerApplicationsByCreator(userId);
      res.json(applications);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Apply to contract
  app.post("/api/creator/retainer-contracts/:id/apply", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;

      // ACCOUNT TYPE RESTRICTION: Check if creator has at least one video platform
      const creatorProfile = await storage.getCreatorProfile(userId);
      const hasVideoPlatform = creatorProfile && (
        creatorProfile.youtubeUrl ||
        creatorProfile.tiktokUrl ||
        creatorProfile.instagramUrl
      );

      if (!hasVideoPlatform) {
        return res.status(400).json({
          error: "Video platform required",
          message: "You must add at least one video platform (YouTube, TikTok, or Instagram) to your profile before applying to retainer contracts. Please complete your profile setup first."
        });
      }

      const body = {
        ...req.body,
        proposedStartDate: req.body.proposedStartDate ? new Date(req.body.proposedStartDate) : undefined,
      };
      const validated = (insertRetainerApplicationSchema as any).omit({ creatorId: true, contractId: true }).parse(body);
      const application = await storage.createRetainerApplication({ ...validated, contractId: req.params.id, creatorId: userId });
      res.json(application);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Approve application
  app.patch("/api/company/retainer-applications/:id/approve", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const application = await storage.getRetainerApplication(req.params.id);
      if (!application) return res.status(404).send("Application not found");
      const contract = await storage.getRetainerContract(application.contractId);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      const approved = await storage.approveRetainerApplication(req.params.id, application.contractId, application.creatorId);
      res.json(approved);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Company: Reject application
  app.patch("/api/company/retainer-applications/:id/reject", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const application = await storage.getRetainerApplication(req.params.id);
      if (!application) return res.status(404).send("Application not found");
      const contract = await storage.getRetainerContract(application.contractId);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      const rejected = await storage.rejectRetainerApplication(req.params.id);
      res.json(rejected);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get deliverables for contract
  app.get("/api/retainer-contracts/:id/deliverables", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = req.user as any;
      const contract = await storage.getRetainerContract(req.params.id);
      if (!contract) return res.status(404).send("Contract not found");
      if (user.role === 'company') {
        const companyProfile = await storage.getCompanyProfile(userId);
        if (!companyProfile || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      } else if (user.role === 'creator') {
        if (contract.assignedCreatorId !== userId) return res.status(403).send("Forbidden");
      }
      const deliverables = await storage.getRetainerDeliverablesByContract(req.params.id);
      res.json(deliverables);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Get their deliverables
  app.get("/api/creator/retainer-deliverables", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const deliverables = await storage.getRetainerDeliverablesByCreator(userId);
      res.json(deliverables);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Submit deliverable
  app.post("/api/creator/retainer-deliverables", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const validated = (insertRetainerDeliverableSchema as any).omit({ creatorId: true }).parse(req.body);
      const contract = await storage.getRetainerContract(validated.contractId);
      if (!contract || contract.assignedCreatorId !== userId) return res.status(403).send("Forbidden");
      const deliverable = await storage.createRetainerDeliverable({ ...validated, creatorId: userId });

      // Send notification to company user about new video upload
      console.log(`[Deliverable] Sending notification for contract ${contract.id}, companyId: ${contract.companyId}`);
      const companyProfile = await storage.getCompanyProfileById(contract.companyId);
      console.log(`[Deliverable] Company profile found:`, companyProfile ? `userId: ${companyProfile.userId}` : 'null');
      if (companyProfile) {
        const creatorUser = await storage.getUserById(userId);
        const creatorName = creatorUser?.firstName || creatorUser?.username || 'A creator';
        console.log(`[Deliverable] Sending notification to company user ${companyProfile.userId} for deliverable from ${creatorName}`);
        try {
          await notificationService.sendNotification(
            companyProfile.userId,
            'deliverable_submitted',
            'New Video Uploaded for Review',
            `${creatorName} uploaded a new video for "${contract.title}" (Month ${deliverable.monthNumber}, Video #${deliverable.videoNumber}). Please review the deliverable.`,
            {
              creatorName,
              contractTitle: contract.title,
              monthNumber: deliverable.monthNumber,
              videoNumber: deliverable.videoNumber,
              contractId: contract.id,
              deliverableId: deliverable.id,
              linkUrl: `/company/retainers/${contract.id}`,
            }
          );
          console.log(`[Deliverable] Notification sent successfully`);
        } catch (notifError) {
          console.error(`[Deliverable] Error sending notification:`, notifError);
        }
      } else {
        console.warn(`[Deliverable] No company profile found for companyId: ${contract.companyId}`);
      }

      res.json(deliverable);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Creator: Resubmit deliverable (for revisions)
  app.patch("/api/creator/retainer-deliverables/:id/resubmit", requireAuth, requireRole('creator'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const deliverable = await storage.getRetainerDeliverable(req.params.id);

      if (!deliverable) return res.status(404).send("Deliverable not found");
      if (deliverable.creatorId !== userId) return res.status(403).send("Forbidden");
      if (deliverable.status !== 'revision_requested') {
        return res.status(400).send("Can only resubmit deliverables with revision_requested status");
      }

      // Delete old video from Cloudinary
      const oldVideoUrl = deliverable.videoUrl;
      if (oldVideoUrl) {
        try {
          const objectStorageService = new ObjectStorageService();
          const publicId = objectStorageService.extractPublicIdFromUrl(oldVideoUrl);
          if (publicId) {
            console.log(`[Resubmit] Deleting old video from Cloudinary: ${publicId}`);
            await objectStorageService.deleteVideo(publicId);
            console.log(`[Resubmit] Successfully deleted old video`);
          }
        } catch (error) {
          console.error(`[Resubmit] Error deleting old video:`, error);
          // Continue even if deletion fails - we don't want to block the resubmission
        }
      }

      // Update deliverable with new video and reset status to pending_review
      const updated = await storage.updateRetainerDeliverable(req.params.id, {
        videoUrl: req.body.videoUrl,
        platformUrl: req.body.platformUrl,
        title: req.body.title,
        description: req.body.description,
        status: 'pending_review',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewNotes: null,
      } as any);

      // Send notification to company user about resubmitted video
      const contract = await storage.getRetainerContract(deliverable.contractId);
      if (contract) {
        const companyProfile = await storage.getCompanyProfileById(contract.companyId);
        if (companyProfile) {
          const creatorUser = await storage.getUserById(userId);
          const creatorName = creatorUser?.firstName || creatorUser?.username || 'A creator';
          await notificationService.sendNotification(
            companyProfile.userId,
            'deliverable_resubmitted',
            'Video Resubmitted After Revision',
            `${creatorName} has resubmitted the video for "${contract.title}" (Month ${deliverable.monthNumber}, Video #${deliverable.videoNumber}) after making requested revisions. Please review the updated deliverable.`,
            {
              creatorName,
              contractTitle: contract.title,
              monthNumber: deliverable.monthNumber,
              videoNumber: deliverable.videoNumber,
              contractId: contract.id,
              deliverableId: deliverable.id,
              linkUrl: `/company/retainers/${contract.id}`,
            }
          );
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error('[Resubmit Deliverable] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Company: Approve deliverable
  app.patch("/api/company/retainer-deliverables/:id/approve", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const deliverable = await storage.getRetainerDeliverable(req.params.id);
      if (!deliverable) return res.status(404).send("Deliverable not found");
      const contract = await storage.getRetainerContract(deliverable.contractId);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
// Approve the deliverable
const approved = await storage.approveRetainerDeliverable(req.params.id, req.body.reviewNotes);

// Calculate payment amount per video (monthly amount / videos per month)
const monthlyAmount = parseFloat(contract.monthlyAmount);
const videosPerMonth = contract.videosPerMonth || 1;
const paymentPerVideo = monthlyAmount / videosPerMonth;

// Calculate fees with per-company override support (Section 4.3.H)
const retainerFees = await calculateFees(paymentPerVideo, contract.companyId);

// Create payment for the approved deliverable with 'pending' status
// This puts it in the admin queue for processing
const payment = await storage.createRetainerPayment({
  contractId: contract.id,
  deliverableId: deliverable.id,
  creatorId: deliverable.creatorId,
  companyId: contract.companyId,
  amount: paymentPerVideo.toFixed(2),
  grossAmount: retainerFees.grossAmount.toFixed(2),
  platformFeeAmount: retainerFees.platformFeeAmount.toFixed(2),
  processingFeeAmount: retainerFees.stripeFeeAmount.toFixed(2),
  netAmount: retainerFees.netAmount.toFixed(2),
  status: 'pending', // \u2705 FIXED: Changed from 'completed' to 'pending' for admin review
  description: `Retainer payment for ${contract.title} - Month ${deliverable.monthNumber}, Video ${deliverable.videoNumber}`,
  initiatedAt: new Date(),
});

const retainerFeeLabel = retainerFees.isCustomFee ? `Custom ${formatFeePercentage(retainerFees.platformFeePercentage)}` : formatFeePercentage(DEFAULT_PLATFORM_FEE_PERCENTAGE);
console.log(`[Retainer Payment] Created pending payment of $${retainerFees.netAmount.toFixed(2)} (net) for creator ${deliverable.creatorId} - Platform Fee: ${retainerFeeLabel}`);

// 🆕 SEND NOTIFICATION TO CREATOR ABOUT PENDING PAYMENT
const creatorUser = await storage.getUserById(deliverable.creatorId);
if (creatorUser) {
  await notificationService.sendNotification(
    deliverable.creatorId,
    'payment_pending',
    'Deliverable Approved - Payment Pending \u1F4B0',
    `Your deliverable for "${contract.title}" has been approved! Payment of $${retainerFees.netAmount.toFixed(2)} is pending admin processing.`,
    {
      userName: creatorUser.firstName || creatorUser.username,
      offerTitle: contract.title,
      amount: `$${retainerFees.netAmount.toFixed(2)}`,
      paymentId: payment.id,
    }
  );
  console.log(`[Notification] Sent payment pending notification to creator ${creatorUser.username}`);
}

// 🆕 SEND NOTIFICATION TO ADMIN ABOUT NEW PAYMENT TO PROCESS
// Get admin users to notify them
const adminUsers = await storage.getUsersByRole('admin');
for (const admin of adminUsers) {
  await notificationService.sendNotification(
    admin.id,
    'payment_pending',
    'New Retainer Payment Ready for Processing',
    `A retainer payment of $${retainerFees.netAmount.toFixed(2)} for creator ${creatorUser?.username || 'Unknown'} on "${contract.title}" is ready for processing.`,
    {
      offerTitle: contract.title,
      amount: `$${retainerFees.netAmount.toFixed(2)}`,
      paymentId: payment.id,
    }
  );
}
console.log(`[Notification] Notified admins about new payment ${payment.id}`);

res.json(approved);
    } catch (error: any) {
      console.error('[Approve Deliverable] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Company: Reject deliverable
  app.patch("/api/company/retainer-deliverables/:id/reject", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const deliverable = await storage.getRetainerDeliverable(req.params.id);
      if (!deliverable) return res.status(404).send("Deliverable not found");
      const contract = await storage.getRetainerContract(deliverable.contractId);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      if (!req.body.reviewNotes) return res.status(400).send("Review notes required");

      const rejected = await storage.rejectRetainerDeliverable(req.params.id, req.body.reviewNotes);

      // 🆕 SEND NOTIFICATION TO CREATOR ABOUT REJECTION
      const creator = await storage.getUserById(deliverable.creatorId);
      if (creator) {
        await notificationService.sendNotification(
          deliverable.creatorId,
          'deliverable_rejected',
          'Deliverable Rejected',
          `Your deliverable for "${contract.title}" (Month ${deliverable.monthNumber}, Video #${deliverable.videoNumber}) has been rejected. Please review the feedback.`,
          {
            userName: creator.firstName || creator.username,
            contractTitle: contract.title,
            reason: req.body.reviewNotes,
            linkUrl: `/retainers/${contract.id}`,
          }
        );
        console.log(`[Notification] Sent deliverable rejection notification to creator ${creator.username}`);
      }

      res.json(rejected);
    } catch (error: any) {
      console.error('[Reject Deliverable] Error:', error);
      res.status(500).send(error.message);
    }
  });

  // Company: Request revision
  app.patch("/api/company/retainer-deliverables/:id/request-revision", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);
      if (!companyProfile) return res.status(404).send("Company profile not found");
      const deliverable = await storage.getRetainerDeliverable(req.params.id);
      if (!deliverable) return res.status(404).send("Deliverable not found");
      const contract = await storage.getRetainerContract(deliverable.contractId);
      if (!contract || contract.companyId !== companyProfile.id) return res.status(403).send("Forbidden");
      if (!req.body.reviewNotes) return res.status(400).send("Review notes required");

      const revised = await storage.requestRevision(req.params.id, req.body.reviewNotes);

      // 🆕 SEND NOTIFICATION TO CREATOR ABOUT REVISION REQUEST
      const creator = await storage.getUserById(deliverable.creatorId);
      if (creator) {
        await notificationService.sendNotification(
          deliverable.creatorId,
          'revision_requested',
          'Revision Requested',
          `A revision has been requested for your deliverable on "${contract.title}" (Month ${deliverable.monthNumber}, Video #${deliverable.videoNumber}). Please review the feedback and resubmit.`,
          {
            userName: creator.firstName || creator.username,
            contractTitle: contract.title,
            revisionInstructions: req.body.reviewNotes,
            linkUrl: `/retainers/${contract.id}`,
          }
        );
        console.log(`[Notification] Sent revision request notification to creator ${creator.username}`);
      }

      res.json(revised);
    } catch (error: any) {
      console.error('[Request Revision] Error:', error);
      res.status(500).send(error.message);
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({
    noServer: true // We'll handle the upgrade manually for authentication
  });

  // Store connected clients
  const clients = new Map<string, WebSocket>();

  // Handle WebSocket upgrade with authentication
  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = parseUrl(req.url || '', true);

    // Only handle our own /ws path. Don't destroy the socket for other paths —
    // Vite HMR (in dev) attaches its own upgrade listener on the root path
    // with a `?token=...` query, and tearing down its socket here breaks HMR.
    if (pathname !== '/ws') {
      return;
    }

    // Get session from cookie
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    const sessionId = cookies['connect.sid'];

    if (!sessionId) {
      console.log('[WebSocket] No session cookie found');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Create a mock request/response to use express-session
    const mockReq: any = Object.create(req);
    mockReq.session = null;
    mockReq.sessionStore = null;
    mockReq.user = null;
    mockReq.isAuthenticated = function() {
      return !!this.user;
    };

    const mockRes: any = {
      getHeader: () => {},
      setHeader: () => {},
      end: () => {}
    };

    // Use the session middleware from the app
    const sessionMiddleware = (app as any)._router.stack
      .find((layer: any) => layer.name === 'session')?.handle;

    if (!sessionMiddleware) {
      console.error('[WebSocket] Session middleware not found');
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
      return;
    }

    sessionMiddleware(mockReq, mockRes, () => {
      passport.initialize()(mockReq, mockRes, () => {
        passport.session()(mockReq, mockRes, () => {
          if (!mockReq.user || !mockReq.isAuthenticated()) {
            console.log('[WebSocket] User not authenticated');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          // User is authenticated, complete the WebSocket handshake
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, mockReq);
          });
        });
      });
    });
  });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const userId = req.user?.id;

    if (!userId) {
      console.log('[WebSocket] No user ID found after authentication');
      ws.close();
      return;
    }

    console.log(`[WebSocket] User ${userId} connected`);
    clients.set(userId, ws);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat_message') {
          // Save message to database
          const savedMessage = await storage.createMessage({
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            attachments: message.attachments || [],
          });

          // Auto-moderate message for banned content
          try {
            await moderateMessage(savedMessage.id, storage);
          } catch (moderationError) {
            console.error('[WebSocket] Error auto-moderating message:', moderationError);
            // Don't fail the message if moderation fails
          }

          // Find all participants in the conversation
          const conversation = await storage.getConversation(message.conversationId);
          const companyProfile = conversation?.companyId
            ? await storage.getCompanyProfileById(conversation.companyId)
            : null;

          // Send to all participants (company profile -> user account)
          const recipientIds = [conversation.creatorId, companyProfile?.userId || conversation.companyId];
          for (const recipientId of recipientIds) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'new_message',
                message: savedMessage,
              }));
            }
          }
        } else if (message.type === 'typing_start') {
          // Broadcast typing indicator to other participants
          const conversation = await storage.getConversation(message.conversationId);
          const companyProfile = conversation?.companyId
            ? await storage.getCompanyProfileById(conversation.companyId)
            : null;
          const recipientIds = [conversation.creatorId, companyProfile?.userId || conversation.companyId].filter(id => id !== userId);
          
          for (const recipientId of recipientIds) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'user_typing',
                conversationId: message.conversationId,
                userId: userId,
              }));
            }
          }
        } else if (message.type === 'typing_stop') {
          // Broadcast stop typing indicator
          const conversation = await storage.getConversation(message.conversationId);
          const companyProfile = conversation?.companyId
            ? await storage.getCompanyProfileById(conversation.companyId)
            : null;
          const recipientIds = [conversation.creatorId, companyProfile?.userId || conversation.companyId].filter(id => id !== userId);
          
          for (const recipientId of recipientIds) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'user_stop_typing',
                conversationId: message.conversationId,
                userId: userId,
              }));
            }
          }
        } else if (message.type === 'mark_read') {
          // Mark messages as read
          await storage.markMessagesAsRead(message.conversationId, userId);
          
          // Notify the sender that messages have been read
          const conversation = await storage.getConversation(message.conversationId);
          const companyProfile = conversation?.companyId
            ? await storage.getCompanyProfileById(conversation.companyId)
            : null;
          const recipientIds = [conversation.creatorId, companyProfile?.userId || conversation.companyId].filter(id => id !== userId);
          
          for (const recipientId of recipientIds) {
            const recipientWs = clients.get(recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(JSON.stringify({
                type: 'messages_read',
                conversationId: message.conversationId,
                readBy: userId,
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (userId) {
        console.log(`[WebSocket] User ${userId} disconnected`);
        clients.delete(userId);
      }
    });
  });

  // Auto-approval scheduler removed in the AFFEXCH revision — the per-offer
  // application flow no longer exists.

  // ============ Platform Health Monitoring Endpoints (Section 4.3.G) ============

  // Get comprehensive platform health report
  app.get("/api/admin/platform-health", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const report = await getPlatformHealthReport();
      res.json(report);
    } catch (error: any) {
      console.error('[Platform Health] Error getting health report:', error);
      res.status(500).json({ error: "Failed to get platform health report", details: error.message });
    }
  });

  // Get latest health snapshot
  app.get("/api/admin/platform-health/snapshot", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const snapshot = await getLatestHealthSnapshot();
      res.json(snapshot || { message: "No health snapshots available" });
    } catch (error: any) {
      console.error('[Platform Health] Error getting snapshot:', error);
      res.status(500).json({ error: "Failed to get health snapshot", details: error.message });
    }
  });

  // Get API metrics summary
  app.get("/api/admin/platform-health/api-metrics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const metrics = await getRecentApiMetrics(hours);
      res.json(metrics);
    } catch (error: any) {
      console.error('[Platform Health] Error getting API metrics:', error);
      res.status(500).json({ error: "Failed to get API metrics", details: error.message });
    }
  });

  // Get API metrics time series for charts
  app.get("/api/admin/platform-health/api-metrics/timeseries", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const timeSeries = await getApiMetricsTimeSeries(days);
      res.json(timeSeries);
    } catch (error: any) {
      console.error('[Platform Health] Error getting API metrics time series:', error);
      res.status(500).json({ error: "Failed to get API metrics time series", details: error.message });
    }
  });

  // Get storage metrics
  app.get("/api/admin/platform-health/storage", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const storage = await calculateStorageUsage();
      res.json(storage);
    } catch (error: any) {
      console.error('[Platform Health] Error getting storage metrics:', error);
      res.status(500).json({ error: "Failed to get storage metrics", details: error.message });
    }
  });

  // Get storage metrics time series
  app.get("/api/admin/platform-health/storage/timeseries", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const timeSeries = await getStorageMetricsTimeSeries(days);
      res.json(timeSeries);
    } catch (error: any) {
      console.error('[Platform Health] Error getting storage time series:', error);
      res.status(500).json({ error: "Failed to get storage time series", details: error.message });
    }
  });

  // Get video hosting costs
  app.get("/api/admin/platform-health/video-costs", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const costs = await calculateVideoHostingCosts();
      res.json(costs);
    } catch (error: any) {
      console.error('[Platform Health] Error getting video costs:', error);
      res.status(500).json({ error: "Failed to get video costs", details: error.message });
    }
  });

  // Get video costs time series
  app.get("/api/admin/platform-health/video-costs/timeseries", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const timeSeries = await getVideoCostsTimeSeries(days);
      res.json(timeSeries);
    } catch (error: any) {
      console.error('[Platform Health] Error getting video costs time series:', error);
      res.status(500).json({ error: "Failed to get video costs time series", details: error.message });
    }
  });

  // Get recent error logs
  app.get("/api/admin/platform-health/errors", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const errors = await getRecentErrorLogs(limit);
      res.json(errors);
    } catch (error: any) {
      console.error('[Platform Health] Error getting error logs:', error);
      res.status(500).json({ error: "Failed to get error logs", details: error.message });
    }
  });

  // Manually trigger health snapshot (for testing/admin)
  app.post("/api/admin/platform-health/snapshot", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await createHealthSnapshot();
      const snapshot = await getLatestHealthSnapshot();
      res.json({ message: "Health snapshot created", snapshot });
    } catch (error: any) {
      console.error('[Platform Health] Error creating snapshot:', error);
      res.status(500).json({ error: "Failed to create health snapshot", details: error.message });
    }
  });

  // Manually trigger metrics flush (for testing/admin)
  app.post("/api/admin/platform-health/flush-metrics", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await flushMetrics();
      res.json({ message: "Metrics flushed successfully" });
    } catch (error: any) {
      console.error('[Platform Health] Error flushing metrics:', error);
      res.status(500).json({ error: "Failed to flush metrics", details: error.message });
    }
  });

  // Manually record daily metrics (for testing/admin)
  app.post("/api/admin/platform-health/record-daily", requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await Promise.all([
        recordDailyStorageMetrics(),
        recordDailyVideoCosts(),
      ]);
      res.json({ message: "Daily metrics recorded successfully" });
    } catch (error: any) {
      console.error('[Platform Health] Error recording daily metrics:', error);
      res.status(500).json({ error: "Failed to record daily metrics", details: error.message });
    }
  });

  // ============ End Platform Health Monitoring Endpoints ============

  // Debug endpoint to check database URLs
  app.get("/api/admin/debug-urls", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get sample URLs from database
      const sampleOffers = await db.select().from(offers).limit(3);
      const sampleVideos = await db.select().from(offerVideos).limit(5);

      res.json({
        offers: sampleOffers.map(o => ({
          id: o.id,
          title: o.title,
          featuredImageUrl: o.featuredImageUrl
        })),
        videos: sampleVideos.map(v => ({
          id: v.id,
          title: v.title,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl
        }))
      });
    } catch (error: any) {
      console.error('[Debug] Error:', error);
      res.status(500).json({ error: "Debug failed", details: error.message });
    }
  });

  // Migration endpoint to fix normalized Cloudinary URLs
  app.post("/api/admin/migrate-cloudinary-urls", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);

      // Only allow admins to run migrations
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      console.log('[Migration] Starting Cloudinary URL fix...');

      const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dilp6tuin";
      let totalFixed = 0;

      // Function to denormalize paths
      const denormalizeCloudinaryPath = (normalizedPath: string, resourceType: 'image' | 'video' = 'image'): string => {
        if (!normalizedPath || !normalizedPath.startsWith('/objects/')) {
          return normalizedPath;
        }
        const publicId = normalizedPath.replace('/objects/', '');
        const extension = resourceType === 'video' ? 'mp4' : 'jpg';
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${publicId}.${extension}`;
      };

      // Fix offer featured images
      const offersResult = await db.select().from(offers).where(sql`featured_image_url LIKE '/objects/%'`);
      console.log(`[Migration] Found ${offersResult.length} offers with normalized featured images`);

      for (const offer of offersResult) {
        if (offer.featuredImageUrl) {
          const newUrl = denormalizeCloudinaryPath(offer.featuredImageUrl, 'image');
          await db.update(offers)
            .set({ featuredImageUrl: newUrl })
            .where(eq(offers.id, offer.id));
          totalFixed++;
          console.log(`  \u2713 Fixed offer ${offer.id}: ${offer.featuredImageUrl} -> ${newUrl}`);
        }
      }

      // Fix video thumbnails + URLs \u2014 skipped in AFFEXCH Phase 6.5
      // (offer_videos was deprecated; nothing to normalize).
      console.log(`[Migration] Skipping offer-video normalization (table deprecated)`);

      // Fix company logos
      const companiesResult = await db.select().from(vendorProfiles).where(sql`logo_url LIKE '/objects/%'`);
      console.log(`[Migration] Found ${companiesResult.length} companies with normalized logos`);

      for (const company of companiesResult) {
        if (company.logoUrl) {
          const newUrl = denormalizeCloudinaryPath(company.logoUrl, 'image');
          await db.update(vendorProfiles)
            .set({ logoUrl: newUrl })
            .where(eq(vendorProfiles.id, company.id));
          totalFixed++;
          console.log(`  \u2713 Fixed company logo ${company.id}: ${company.logoUrl} -> ${newUrl}`);
        }
      }

      console.log(`[Migration] \u2713 Complete! Fixed ${totalFixed} URLs`);

      res.json({
        success: true,
        message: `Migration completed successfully`,
        stats: {
          offersFixed: offersResult.length,
          videoThumbnailsFixed: 0,
          videoUrlsFixed: 0,
          companyLogosFixed: companiesResult.length,
          totalFixed
        }
      });
    } catch (error: any) {
      console.error('[Migration] Error:', error);
      res.status(500).json({ error: "Migration failed", details: error.message });
    }
  });

  // ============ Advanced Tracking Endpoints (Postback, Pixel, JS Snippet) ============

  /**
   * Postback URL Endpoint - Server-to-server conversion tracking
   * METHOD A from specification: Most secure, recommended for SaaS/Apps/eCommerce
   *
   * POST /api/tracking/postback
   * Headers: X-API-Key: company_api_key
   * Body: { trackingCode, eventType, saleAmount, currency, orderId, timestamp, signature }
   */
  app.post("/api/tracking/postback", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      const {
        trackingCode,
        eventType = 'sale',
        saleAmount,
        currency = 'USD',
        orderId,
        timestamp,
        signature,
        customData
      } = req.body;

      // Validate required fields
      if (!trackingCode) {
        return res.status(400).json({ success: false, error: "Missing trackingCode" });
      }

      // Look up application by tracking code
      const application = await storage.getApplicationByTrackingCode(trackingCode);
      if (!application) {
        return res.status(404).json({ success: false, error: "Invalid tracking code" });
      }

      // Get offer and company for API key validation
      const offer = await storage.getOffer(application.offerId);
      if (!offer) {
        return res.status(404).json({ success: false, error: "Offer not found" });
      }

      const company = await storage.getCompanyProfileById(offer.companyId);
      if (!company) {
        return res.status(404).json({ success: false, error: "Company not found" });
      }

      // Validate API key if company has one set up
      if (company.trackingApiKey) {
        if (!apiKey) {
          return res.status(401).json({ success: false, error: "Missing API key" });
        }
        if (apiKey !== company.trackingApiKey) {
          return res.status(403).json({ success: false, error: "Invalid API key" });
        }

        // Validate signature if timestamp is provided
        if (timestamp && signature) {
          if (!isTimestampValid(timestamp)) {
            return res.status(400).json({ success: false, error: "Timestamp expired (must be within 5 minutes)" });
          }

          const isValidSignature = validatePostbackSignature(
            trackingCode,
            eventType,
            saleAmount,
            timestamp,
            signature,
            company.trackingApiKey
          );

          if (!isValidSignature) {
            return res.status(403).json({ success: false, error: "Invalid signature" });
          }
        }
      }

      // Validate event type
      const validEventTypes: ConversionEventType[] = ['sale', 'lead', 'click', 'signup', 'install', 'custom'];
      if (!validEventTypes.includes(eventType as ConversionEventType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`
        });
      }

      // Map event type to commission calculation
      let effectiveSaleAmount = saleAmount;
      if (eventType === 'lead' || eventType === 'signup') {
        // For leads, use the offer's fixed commission amount
        effectiveSaleAmount = undefined;
      } else if (eventType === 'click') {
        // Click tracking is handled by the /go/:code endpoint
        return res.json({
          success: true,
          message: "Click events are tracked via the redirect endpoint",
          note: "Use /go/:trackingCode for click tracking"
        });
      }

      // Record the conversion
      const conversionId = generateConversionId();
      await storage.recordConversion(application.id, effectiveSaleAmount ? parseFloat(effectiveSaleAmount) : undefined);

      // Log the postback for audit trail
      console.log(`[Postback] Conversion recorded - Code: ${trackingCode}, Event: ${eventType}, Amount: ${saleAmount}, Order: ${orderId}`);

      res.json({
        success: true,
        message: "Conversion recorded successfully",
        conversionId,
        eventType,
        trackingCode,
        orderId: orderId || null
      });

    } catch (error: any) {
      console.error('[Postback] Error:', error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  /**
   * Tracking Pixel Endpoint - Image-based conversion tracking
   * METHOD B from specification: Easy for websites/ecommerce
   *
   * GET /api/tracking/pixel/:code
   * Query params: ?event=sale&amount=99.99&order_id=123
   *
   * Usage: <img src="https://yourapp.com/api/tracking/pixel/AB12CD34?event=sale&amount=99.99" />
   */
  app.get("/api/tracking/pixel/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const {
        event = 'sale',
        amount,
        order_id,
        currency = 'USD'
      } = req.query;

      // Set headers for pixel response (1x1 transparent GIF)
      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Look up application by tracking code
      const application = await storage.getApplicationByTrackingCode(code);
      if (!application) {
        console.log(`[Pixel] Invalid tracking code: ${code}`);
        return res.send(getTransparentPixel());
      }

      // Record conversion asynchronously (don't block pixel response)
      const saleAmount = amount ? parseFloat(amount as string) : undefined;

      storage.recordConversion(application.id, saleAmount)
        .then(() => {
          console.log(`[Pixel] Conversion recorded - Code: ${code}, Event: ${event}, Amount: ${amount}`);
        })
        .catch((err: any) => {
          console.error('[Pixel] Error recording conversion:', err);
        });

      // Return transparent 1x1 GIF immediately
      res.send(getTransparentPixel());

    } catch (error: any) {
      console.error('[Pixel] Error:', error);
      // Always return pixel to avoid breaking page load
      res.set('Content-Type', 'image/gif');
      res.send(getTransparentPixel());
    }
  });

  /**
   * Alternative pixel endpoint using /conversion path for cleaner URLs
   * GET /conversion?code=AB12CD34&event=sale&amount=99.99
   */
  app.get("/conversion", async (req, res) => {
    try {
      const { code, event = 'sale', amount, order_id } = req.query;

      res.set({
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      if (!code) {
        return res.send(getTransparentPixel());
      }

      const application = await storage.getApplicationByTrackingCode(code as string);
      if (!application) {
        return res.send(getTransparentPixel());
      }

      const saleAmount = amount ? parseFloat(amount as string) : undefined;

      storage.recordConversion(application.id, saleAmount)
        .then(() => {
          console.log(`[Pixel] Conversion via /conversion - Code: ${code}, Amount: ${amount}`);
        })
        .catch((err: any) => {
          console.error('[Pixel] Error:', err);
        });

      res.send(getTransparentPixel());

    } catch (error: any) {
      res.set('Content-Type', 'image/gif');
      res.send(getTransparentPixel());
    }
  });

  /**
   * Generate/Regenerate API Key for company's tracking integration
   * POST /api/company/tracking/api-key
   */
  app.post("/api/company/tracking/api-key", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      // Generate new API key
      const apiKey = generateCompanyApiKey(companyProfile.id);

      // Update company profile with new API key
      await db.update(vendorProfiles)
        .set({
          trackingApiKey: apiKey,
          trackingApiKeyCreatedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(vendorProfiles.id, companyProfile.id));

      res.json({
        success: true,
        apiKey,
        createdAt: new Date().toISOString(),
        message: "API key generated successfully. Store this securely - it won't be shown again in full."
      });

    } catch (error: any) {
      console.error('[API Key] Error generating:', error);
      res.status(500).json({ error: "Failed to generate API key" });
    }
  });

  /**
   * Get tracking integration details for company
   * GET /api/company/tracking/integration
   */
  app.get("/api/company/tracking/integration", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      const port = process.env.PORT || 3000;
      const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

      // Mask API key if it exists
      const maskedApiKey = companyProfile.trackingApiKey
        ? `${companyProfile.trackingApiKey.substring(0, 8)}...${companyProfile.trackingApiKey.substring(companyProfile.trackingApiKey.length - 4)}`
        : null;

      res.json({
        hasApiKey: !!companyProfile.trackingApiKey,
        apiKeyMasked: maskedApiKey,
        apiKeyCreatedAt: companyProfile.trackingApiKeyCreatedAt,
        endpoints: {
          postback: `${baseURL}/api/tracking/postback`,
          pixel: `${baseURL}/api/tracking/pixel/{trackingCode}`,
          pixelAlt: `${baseURL}/conversion?code={trackingCode}&event=sale&amount={amount}`,
          redirect: `${baseURL}/go/{trackingCode}`
        },
        documentation: generatePostbackUrlExample(baseURL),
        javascriptSnippet: companyProfile.trackingApiKey
          ? generateTrackingSnippet(companyProfile.id, companyProfile.trackingApiKey, baseURL)
          : "Generate an API key first to get your JavaScript snippet"
      });

    } catch (error: any) {
      console.error('[Integration] Error:', error);
      res.status(500).json({ error: "Failed to get integration details" });
    }
  });

  /**
   * Get JavaScript tracking snippet
   * GET /api/company/tracking/snippet
   */
  app.get("/api/company/tracking/snippet", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      if (!companyProfile.trackingApiKey) {
        return res.status(400).json({
          error: "No API key found",
          message: "Generate an API key first using POST /api/company/tracking/api-key"
        });
      }

      const port = process.env.PORT || 3000;
      const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

      const snippet = generateTrackingSnippet(companyProfile.id, companyProfile.trackingApiKey, baseURL);

      res.type('text/javascript').send(snippet);

    } catch (error: any) {
      console.error('[Snippet] Error:', error);
      res.status(500).json({ error: "Failed to generate snippet" });
    }
  });

  /**
   * Generate signature for postback (helper endpoint for testing)
   * POST /api/company/tracking/generate-signature
   */
  app.post("/api/company/tracking/generate-signature", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile || !companyProfile.trackingApiKey) {
        return res.status(400).json({ error: "Generate an API key first" });
      }

      const { trackingCode, eventType = 'sale', saleAmount } = req.body;
      const timestamp = Date.now();

      const signature = generatePostbackSignature(
        trackingCode,
        eventType,
        saleAmount,
        timestamp,
        companyProfile.trackingApiKey
      );

      res.json({
        trackingCode,
        eventType,
        saleAmount,
        timestamp,
        signature,
        exampleRequest: {
          method: 'POST',
          url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/tracking/postback`,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': companyProfile.trackingApiKey
          },
          body: {
            trackingCode,
            eventType,
            saleAmount,
            timestamp,
            signature
          }
        }
      });

    } catch (error: any) {
      console.error('[Generate Signature] Error:', error);
      res.status(500).json({ error: "Failed to generate signature" });
    }
  });


  // ============ Company Re-apply Restriction (90-Day) ============

  /**
   * Check if a rejected company can re-apply
   * GET /api/company/can-reapply
   */
  app.get("/api/company/can-reapply", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.json({
          canReapply: true,
          daysRemaining: 0,
          message: "No company profile found - you can create one"
        });
      }

      const result = await storage.canCompanyReapply(companyProfile.id);
      res.json(result);

    } catch (error: any) {
      console.error('[Can Reapply] Error:', error);
      res.status(500).json({ error: "Failed to check re-apply status" });
    }
  });

  /**
   * Company re-applies after rejection (with 90-day restriction)
   * POST /api/company/reapply
   */
  app.post("/api/company/reapply", requireAuth, requireRole('company'), async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const companyProfile = await storage.getCompanyProfile(userId);

      if (!companyProfile) {
        return res.status(404).json({ error: "Company profile not found" });
      }

      // Check 90-day restriction
      const reapplyCheck = await storage.canCompanyReapply(companyProfile.id);
      if (!reapplyCheck.canReapply) {
        return res.status(403).json({
          error: "Re-apply restriction active",
          message: reapplyCheck.message,
          daysRemaining: reapplyCheck.daysRemaining
        });
      }

      // Reset company status to pending for re-review
      await db.update(vendorProfiles)
        .set({
          status: 'pending',
          rejectionReason: null,
          updatedAt: new Date()
        })
        .where(eq(vendorProfiles.id, companyProfile.id));

      // Notify admins
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await notificationService.sendNotification(
          admin.id,
          'high_risk_company',
          'Company Re-application',
          `${companyProfile.legalName || companyProfile.tradeName} has re-applied after rejection (attempt #${(companyProfile.rejectionCount || 0) + 1}).`,
          {
            userName: admin.firstName || admin.username,
            companyName: companyProfile.legalName || companyProfile.tradeName || '',
            companyId: companyProfile.id,
          }
        );
      }

      res.json({
        success: true,
        message: "Re-application submitted successfully. Your application is now pending review."
      });

    } catch (error: any) {
      console.error('[Reapply] Error:', error);
      res.status(500).json({ error: "Failed to submit re-application" });
    }
  });



  return httpServer;
}
