// Re-export from gcs-upload.ts for backwards compatibility
// All new code should import from gcs-upload.ts directly

export type { GCSUploadParams as CloudinaryUploadParams, GCSUploadParams } from './gcs-upload';
export { uploadToGCS as uploadToCloudinary, uploadToGCS } from './gcs-upload';
