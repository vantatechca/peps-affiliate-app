import { z } from "zod";

// ================================
// Password Validation
// ================================

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Password must contain at least one special character");

/**
 * Validate password complexity - returns array of unmet requirements
 */
export function validatePasswordComplexity(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("At least one special character (!@#$%^&*...)");
  }

  return errors;
}

/**
 * Check if password meets all complexity requirements
 */
export function isValidPassword(password: string): boolean {
  return validatePasswordComplexity(password).length === 0;
}

// ================================
// Email Validation
// ================================

/**
 * Stricter email validation regex (RFC 5322 compliant subset)
 * This validates:
 * - Local part can contain letters, numbers, and certain special chars
 * - Domain must have at least one dot
 * - TLD must be at least 2 characters
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .regex(EMAIL_REGEX, "Please enter a valid email address");

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// ================================
// Name Validation
// ================================

/**
 * Name validation - allows letters, spaces, hyphens, and apostrophes
 */
export const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

export const firstNameSchema = z
  .string()
  .min(1, "First name is required")
  .max(50, "First name must be less than 50 characters")
  .regex(NAME_REGEX, "First name can only contain letters, spaces, hyphens, and apostrophes")
  .optional()
  .or(z.literal(""));

export const lastNameSchema = z
  .string()
  .min(1, "Last name is required")
  .max(50, "Last name must be less than 50 characters")
  .regex(NAME_REGEX, "Last name can only contain letters, spaces, hyphens, and apostrophes")
  .optional()
  .or(z.literal(""));

/**
 * Validate name format
 */
export function isValidName(name: string): boolean {
  if (!name || name.trim() === "") return true; // Optional field
  return NAME_REGEX.test(name) && name.length <= 50;
}

// ================================
// Username Validation
// ================================

/**
 * Username validation - alphanumeric with underscores, 3-30 characters
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(USERNAME_REGEX, "Username can only contain letters, numbers, and underscores");

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username) && username.length >= 3 && username.length <= 30;
}

// ================================
// URL Validation
// ================================

/**
 * URL validation regex for http/https URLs
 */
export const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

export const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .regex(URL_REGEX, "Please enter a valid URL starting with http:// or https://");

export const optionalUrlSchema = z
  .string()
  .url("Please enter a valid URL")
  .regex(URL_REGEX, "Please enter a valid URL starting with http:// or https://")
  .optional()
  .or(z.literal(""));

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Optional field
  return URL_REGEX.test(url);
}

// ================================
// Phone Number Validation
// ================================

/**
 * Phone number validation - flexible format supporting international numbers
 * Accepts formats like: +1-234-567-8900, (234) 567-8900, 234.567.8900, etc.
 */
export const PHONE_REGEX = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;

export const phoneSchema = z
  .string()
  .min(7, "Phone number must be at least 7 digits")
  .max(20, "Phone number must be less than 20 characters")
  .regex(PHONE_REGEX, "Please enter a valid phone number");

export const optionalPhoneSchema = z
  .string()
  .min(7, "Phone number must be at least 7 digits")
  .max(20, "Phone number must be less than 20 characters")
  .regex(PHONE_REGEX, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return true; // Optional field
  return PHONE_REGEX.test(phone) && phone.length >= 7 && phone.length <= 20;
}

// ================================
// Content Length Validation
// ================================

/**
 * Message content validation - reasonable limits
 */
export const messageContentSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(5000, "Message must be less than 5000 characters");

/**
 * Review content validation
 */
export const reviewContentSchema = z
  .string()
  .max(2000, "Review must be less than 2000 characters")
  .optional();

/**
 * Bio validation
 */
export const bioSchema = z
  .string()
  .max(1000, "Bio must be less than 1000 characters")
  .optional();

/**
 * Description validation (for offers, companies, etc.)
 */
export const shortDescriptionSchema = z
  .string()
  .min(10, "Description must be at least 10 characters")
  .max(200, "Description must be less than 200 characters");

export const fullDescriptionSchema = z
  .string()
  .min(50, "Description must be at least 50 characters")
  .max(5000, "Description must be less than 5000 characters");

// ================================
// Bank/Payment Validation
// ================================

/**
 * US Bank routing number validation (9 digits with checksum)
 */
export const ROUTING_NUMBER_REGEX = /^[0-9]{9}$/;

export function isValidRoutingNumber(routingNumber: string): boolean {
  if (!ROUTING_NUMBER_REGEX.test(routingNumber)) return false;

  // ABA routing number checksum validation
  const digits = routingNumber.split('').map(Number);
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    1 * (digits[2] + digits[5] + digits[8]);

  return checksum % 10 === 0;
}

export const routingNumberSchema = z
  .string()
  .length(9, "Routing number must be 9 digits")
  .regex(ROUTING_NUMBER_REGEX, "Routing number must be 9 digits")
  .refine(isValidRoutingNumber, "Invalid routing number");

/**
 * Bank account number validation (4-17 digits)
 */
export const ACCOUNT_NUMBER_REGEX = /^[0-9]{4,17}$/;

export const accountNumberSchema = z
  .string()
  .min(4, "Account number must be at least 4 digits")
  .max(17, "Account number must be less than 17 digits")
  .regex(ACCOUNT_NUMBER_REGEX, "Account number must contain only digits");

// ================================
// Social URL Validation
// ================================

export const YOUTUBE_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|user\/|@)?|youtu\.be\/)[a-zA-Z0-9_-]+\/?$/;
export const TIKTOK_URL_REGEX = /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/;
export const INSTAGRAM_URL_REGEX = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/;

export const youtubeUrlSchema = z
  .string()
  .regex(YOUTUBE_URL_REGEX, "Please enter a valid YouTube channel URL")
  .optional()
  .or(z.literal(""));

export const tiktokUrlSchema = z
  .string()
  .regex(TIKTOK_URL_REGEX, "Please enter a valid TikTok profile URL")
  .optional()
  .or(z.literal(""));

export const instagramUrlSchema = z
  .string()
  .regex(INSTAGRAM_URL_REGEX, "Please enter a valid Instagram profile URL")
  .optional()
  .or(z.literal(""));

// ================================
// Combined Registration Schema
// ================================

export const registrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  role: z.enum(["creator", "company"]),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// ================================
// Combined Login Schema
// ================================

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ================================
// Reset Password Schema
// ================================

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ================================
// Forgot Password Schema
// ================================

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
