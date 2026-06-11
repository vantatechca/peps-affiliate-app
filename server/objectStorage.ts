import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import { Response } from "express";
import { randomUUID } from "crypto";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Initialize Google Cloud Storage
function initializeStorage(): Storage {
  if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
    // Use credentials from environment variable (for Render/production)
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON);
    return new Storage({
      projectId: credentials.project_id || process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: credentials,
    });
  } else if (process.env.GOOGLE_CLOUD_KEYFILE) {
    // Use keyfile path (for local development)
    return new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
    });
  } else {
    // Use Application Default Credentials
    return new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
}

const storage = initializeStorage();
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'myapp-media-affiliate';
const GCS_FOLDER = process.env.GCS_FOLDER || "affiliatexchange/videos";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

type ResourceType = 'image' | 'video' | 'raw' | 'auto';

function detectResourceType(publicId: string, fallback: ResourceType = 'auto'): ResourceType {
  const ext = path.extname(publicId).toLowerCase();
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) return 'video';
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) return 'image';
  return fallback;
}

function getContentType(fileName: string, resourceType?: ResourceType): string {
  const ext = path.extname(fileName).toLowerCase();

  // Common MIME types
  const mimeTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v',
    '.flv': 'video/x-flv',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  if (mimeTypes[ext]) {
    return mimeTypes[ext];
  }

  // Fallback based on resource type
  if (resourceType === 'image') return 'image/jpeg';
  if (resourceType === 'video') return 'video/mp4';
  return 'application/octet-stream';
}

export class ObjectStorageService {
  private bucket = storage.bucket(BUCKET_NAME);

  constructor() {}

  getStorageFolder(): string {
    return GCS_FOLDER;
  }

  getBucketName(): string {
    return BUCKET_NAME;
  }

  private buildObjectPath(folder: string, fileName: string): string {
    return `${folder}/${fileName}`.replace(/\\/g, '/');
  }

  /**
   * Generate a signed URL for client-side uploads to GCS
   */
  async getObjectEntityUploadURL(
    customFolder?: string,
    resourceType: ResourceType = 'auto',
    clientContentType?: string,
    originalFileName?: string
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    objectPath: string;
    contentType?: string;
    bucket?: string;
  }> {
    const folder = customFolder || this.getStorageFolder();

    // Generate unique filename
    let fileName: string;
    if (originalFileName) {
      // Preserve extension from original filename
      const ext = path.extname(originalFileName);
      const nameWithoutExt = originalFileName.replace(/\.[^.]+$/, '');
      // Sanitize: replace spaces and special chars with underscores
      const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
      // Add a unique suffix to prevent overwrites
      fileName = `${sanitized}_${randomUUID().slice(0, 8)}${ext}`;
    } else {
      fileName = randomUUID();
    }

    const objectPath = this.buildObjectPath(folder, fileName);
    const contentType = clientContentType || getContentType(fileName, resourceType);

    const file = this.bucket.file(objectPath);

    // Generate signed URL for upload (PUT method)
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    };

    const [signedUrl] = await file.getSignedUrl(options);

    // Public URL for the uploaded file
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;

    return {
      uploadUrl: signedUrl,
      publicUrl,
      objectPath,
      contentType,
      bucket: BUCKET_NAME,
    };
  }

  /**
   * Upload a file from local path to GCS
   */
  async uploadFile(
    filePath: string,
    options?: {
      folder?: string;
      resourceType?: ResourceType;
      publicId?: string;
    }
  ): Promise<{ url: string; objectPath: string }> {
    const folder = options?.folder || this.getStorageFolder();
    const fileName = options?.publicId || path.basename(filePath);
    const objectPath = this.buildObjectPath(folder, fileName);
    const contentType = getContentType(fileName, options?.resourceType);

    await this.bucket.upload(filePath, {
      destination: objectPath,
      contentType,
      metadata: {
        contentType,
      },
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;
    return { url: publicUrl, objectPath };
  }

  /**
   * Upload a buffer to GCS
   */
  async uploadBuffer(
    buffer: Buffer,
    options?: {
      folder?: string;
      resourceType?: ResourceType;
      publicId?: string;
      contentType?: string;
    }
  ): Promise<{ url: string; objectPath: string }> {
    const folder = options?.folder || this.getStorageFolder();
    const fileName = options?.publicId || randomUUID();
    const objectPath = this.buildObjectPath(folder, fileName);
    const contentType = options?.contentType || getContentType(fileName, options?.resourceType);

    const file = this.bucket.file(objectPath);
    await file.save(buffer, {
      contentType,
      metadata: {
        contentType,
      },
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;
    return { url: publicUrl, objectPath };
  }

  /**
   * Get the public URL for a video
   */
  getVideoUrl(
    objectPath: string,
    _options?: {
      quality?: string;
      format?: string;
      transformation?: any[];
    }
  ): string {
    // GCS doesn't support on-the-fly transformations like Cloudinary
    // Return the direct URL
    if (objectPath.startsWith('https://')) {
      return objectPath;
    }
    return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;
  }

  /**
   * Get a thumbnail URL for a video
   * Note: GCS doesn't auto-generate thumbnails like Cloudinary
   * Returns the video URL as a fallback
   */
  getVideoThumbnail(objectPath: string): string {
    // GCS doesn't support auto-generating thumbnails
    // Return a placeholder or the video URL itself
    if (objectPath.startsWith('https://')) {
      return objectPath;
    }
    return `https://storage.googleapis.com/${BUCKET_NAME}/${objectPath}`;
  }

  /**
   * Redirect to download an object
   */
  async downloadObject(
    objectPath: string,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    try {
      const file = this.bucket.file(objectPath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new ObjectNotFoundError();
      }

      // Generate a signed URL for download
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + cacheTtlSec * 1000,
      });

      res.redirect(signedUrl);
    } catch (error) {
      console.error("Error getting GCS URL:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  /**
   * Generate a signed URL for viewing/downloading a file
   */
  async getSignedViewUrl(
    objectPath: string,
    options?: {
      resourceType?: ResourceType;
      expiresIn?: number; // seconds, default 3600 (1 hour)
    }
  ): Promise<string> {
    const expiresIn = options?.expiresIn || 3600;

    // Extract object path if it's a full URL
    let path = objectPath;
    if (objectPath.includes('storage.googleapis.com')) {
      const url = new URL(objectPath);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Remove bucket name, keep the rest
      path = pathParts.slice(1).join('/');
    }

    const file = this.bucket.file(path);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return signedUrl;
  }

  /**
   * Delete a video from GCS
   */
  async deleteVideo(objectPath: string): Promise<any> {
    return await this.deleteResource(objectPath);
  }

  /**
   * Delete an image from GCS
   */
  async deleteImage(objectPath: string): Promise<any> {
    return await this.deleteResource(objectPath);
  }

  /**
   * Delete a resource from GCS
   */
  async deleteResource(objectPath: string, _resourceType?: ResourceType): Promise<any> {
    try {
      // Extract object path if it's a full URL
      let path = objectPath;
      if (objectPath.includes('storage.googleapis.com')) {
        const url = new URL(objectPath);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Remove bucket name, keep the rest
        path = pathParts.slice(1).join('/');
      }

      const file = this.bucket.file(path);
      const [exists] = await file.exists();

      if (!exists) {
        return { result: 'not found' };
      }

      await file.delete();
      return { result: 'ok' };
    } catch (error: any) {
      if (error.code === 404) {
        return { result: 'not found' };
      }
      throw error;
    }
  }

  /**
   * Delete all objects in a folder
   */
  async deleteFolder(folderPath: string): Promise<any> {
    try {
      const [files] = await this.bucket.getFiles({ prefix: folderPath });

      if (files.length === 0) {
        return { deleted: {} };
      }

      const deletePromises = files.map(file => file.delete());
      await Promise.all(deletePromises);

      console.info(`[ObjectStorage] Deleted ${files.length} resources from folder ${folderPath}`);
      return { deleted: files.map(f => f.name) };
    } catch (error) {
      const message = (error as any)?.message || JSON.stringify(error);
      throw new Error(message);
    }
  }

  /**
   * Get metadata for an object
   */
  async getVideoInfo(objectPath: string): Promise<any> {
    try {
      // Extract object path if it's a full URL
      let path = objectPath;
      if (objectPath.includes('storage.googleapis.com')) {
        const url = new URL(objectPath);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Remove bucket name, keep the rest
        path = pathParts.slice(1).join('/');
      }

      const file = this.bucket.file(path);
      const [metadata] = await file.getMetadata();

      return {
        public_id: path,
        format: path.split('.').pop(),
        bytes: parseInt(metadata.size as string, 10),
        created_at: metadata.timeCreated,
        url: `https://storage.googleapis.com/${BUCKET_NAME}/${path}`,
        secure_url: `https://storage.googleapis.com/${BUCKET_NAME}/${path}`,
        resource_type: detectResourceType(path),
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Search for a public object
   */
  async searchPublicObject(filePath: string): Promise<any | null> {
    try {
      return await this.getVideoInfo(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get file info for an object entity
   */
  async getObjectEntityFile(objectPath: string): Promise<any> {
    const normalized = this.normalizeObjectEntityPath(objectPath);
    const path = normalized.startsWith('/objects/')
      ? normalized.replace('/objects/', '')
      : normalized;
    try {
      return await this.getVideoInfo(path);
    } catch (error) {
      throw new ObjectNotFoundError();
    }
  }

  /**
   * Extract object path from a GCS URL
   */
  extractPublicIdFromUrl(gcsUrl: string): string | null {
    try {
      // Handle GCS URLs
      if (gcsUrl.includes('storage.googleapis.com')) {
        const url = new URL(gcsUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Remove bucket name, keep the rest as object path
        return pathParts.slice(1).join('/');
      }

      // Handle legacy Cloudinary URLs (for migration)
      if (gcsUrl.includes('cloudinary.com')) {
        const url = new URL(gcsUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const uploadIndex = pathParts.findIndex((p) => p === 'upload');
        if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) return null;
        const publicIdWithVersion = pathParts.slice(uploadIndex + 1).join('/');
        const publicId = publicIdWithVersion.replace(/v\d+\//, '');
        return publicId;
      }

      return null;
    } catch (error) {
      console.error('[extractPublicIdFromUrl] Error parsing URL:', error);
      return null;
    }
  }

  /**
   * Normalize a path to the /objects/ format
   */
  normalizeObjectEntityPath(rawPath: string): string {
    // Handle GCS URLs
    if (rawPath.includes('storage.googleapis.com')) {
      const objectPath = this.extractPublicIdFromUrl(rawPath);
      if (objectPath) {
        return '/objects/' + objectPath;
      }
    }

    // Handle legacy Cloudinary URLs
    if (rawPath.includes('cloudinary.com')) {
      const publicId = this.extractPublicIdFromUrl(rawPath);
      if (publicId) {
        return '/objects/' + publicId;
      }
    }

    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: any;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return true;
  }

  getPublicObjectSearchPaths(): Array<string> {
    return [this.getStorageFolder()];
  }

  getPrivateObjectDir(): string {
    return this.getStorageFolder();
  }
}

export const objectStorage = new ObjectStorageService();
