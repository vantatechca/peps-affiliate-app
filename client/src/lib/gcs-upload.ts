export type GCSUploadParams = {
  uploadUrl: string;
  publicUrl: string;
  objectPath: string;
  contentType?: string;
  bucket?: string;
};

/**
 * Upload a file directly to Google Cloud Storage using a signed URL
 * @param uploadParams - Parameters received from the backend containing the signed URL
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress
 * @returns Promise resolving to the upload result with the public URL
 */
export function uploadToGCS(
  uploadParams: GCSUploadParams,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; secure_url: string; objectPath: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // GCS signed URLs use PUT method
    xhr.open("PUT", uploadParams.uploadUrl);

    // Set the content type header (must match what was used to generate the signed URL)
    if (uploadParams.contentType) {
      xhr.setRequestHeader("Content-Type", uploadParams.contentType);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // GCS returns empty response on success
        // Return the public URL from the upload params
        // Include secure_url for backwards compatibility with Cloudinary response format
        resolve({
          url: uploadParams.publicUrl,
          secure_url: uploadParams.publicUrl,
          objectPath: uploadParams.objectPath,
          public_id: uploadParams.objectPath,
        });
      } else {
        console.error('[GCS Upload] Failed with status:', xhr.status, xhr.responseText);
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      console.error('[GCS Upload] Network error');
      reject(new Error("Upload failed due to network error"));
    };

    // Send the file directly (not as FormData)
    xhr.send(file);
  });
}

// Re-export with legacy name for backwards compatibility
export type CloudinaryUploadParams = GCSUploadParams;
export const uploadToCloudinary = uploadToGCS;
