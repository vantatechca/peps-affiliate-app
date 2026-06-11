import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import { normalizeUploadResult, type NormalizedUploadResult } from "../lib/uppyAdapter";
// @ts-ignore - Some @uppy/react versions don't export DashboardModal in the typings but runtime may provide it
import { DashboardModal } from "@uppy/react";
import XHRUpload from "@uppy/xhr-upload";
import { Button } from "./ui/button";

interface CloudinaryUploadParams {
  uploadUrl: string;
  uploadPreset?: string;
  signature?: string;
  timestamp?: number;
  apiKey?: string;
  folder?: string;
  fields?: { [key: string]: string };
}

interface CloudinaryUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<CloudinaryUploadParams>;
  onComplete?: (result: NormalizedUploadResult) => void;
  buttonClassName?: string;
  children: ReactNode;
  allowedFileTypes?: string[];
}

export function CloudinaryUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 524288000, // 500MB for videos
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  allowedFileTypes = ['video/*', 'image/*'],
}: CloudinaryUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : undefined,
      },
      autoProceed: false,
    }).use(XHRUpload, {
      endpoint: "placeholder", // Will be updated before upload
      method: "POST",
      formData: true, // Cloudinary expects multipart form data
      fieldName: "file",
      responseType: "json",
      getResponseData: (xhr: XMLHttpRequest) => {
        try {
          const response =
            typeof xhr.response === "string" && xhr.response.trim()
              ? JSON.parse(xhr.response)
              : xhr.response;

          if (response && typeof response === "object") {
            const secureUrl = response.secure_url ?? response.url ?? "";

            return {
              public_id: response.public_id ?? response.asset_id ?? "",
              secure_url: secureUrl,
              url: response.url ?? secureUrl,
              uploadURL: secureUrl,
              ...response,
            };
          }
        } catch (error) {
          console.error("Failed to parse Cloudinary response", error, xhr.response);
        }

        return xhr.response;
      },
    })
  );

  useEffect(() => {
    const handleComplete = (result: UploadResult<any, any>) => {
      const failed = result.failed ?? [];
      const successful = result.successful ?? [];

      if (failed.length > 0 && successful.length === 0) {
        uppy.info("Upload failed. Please try again.", "error", 5000);
        return;
      }

      if (successful.length > 0) {
        setShowModal(false);
        onComplete?.(normalizeUploadResult(result as UploadResult<any, any>));
        // Some Uppy versions don't expose reset on the type; cast to any for runtime call
        (uppy as any).reset?.();
      }
    };

    const handleUploadError = (file: UppyFile<any, any> | any, error: Error) => {
      console.error("Upload error", error, file);
      uppy.info("Upload failed. Please try again.", "error", 5000);
    };

    // cast handlers when registering with Uppy to avoid strict generic mismatch in event signatures
    uppy.on("complete", handleComplete as any);
    uppy.on("upload-error", handleUploadError as any);

    return () => {
      uppy.off("complete", handleComplete as any);
      uppy.off("upload-error", handleUploadError as any);
    };
  }, [onComplete, uppy]);

  useEffect(() => {
    const prepareUpload = async (fileIDs: string[]) => {
      await Promise.all(
        fileIDs.map(async (fileID) => {
          const file = uppy.getFile(fileID) as UppyFile<any, any> | undefined;

          if (!file) {
            return;
          }

          try {
            const params = await onGetUploadParameters();
            const xhrUpload = uppy.getPlugin<any>("XHRUpload") as any | undefined;

            if (xhrUpload) {
              try {
                xhrUpload.setOptions({
                  endpoint: params.uploadUrl,
                  method: "POST",
                  formData: true,
                  fieldName: "file",
                });
              } catch (e) {
                // ignore setOptions typing/runtime mismatches
              }
            }

            const xhrOptions = {
              ...(file.xhrUpload ?? {}),
              endpoint: params.uploadUrl,
              method: "POST",
              formData: true,
              fieldName: "file",
            };

            // setFileState XHR options can be typed differently across Uppy versions — cast to any
            uppy.setFileState(fileID, {
              xhrUpload: xhrOptions,
            } as any);

            const meta: Record<string, string> = {};
            if (params.uploadPreset) {
              meta.upload_preset = params.uploadPreset;
            }
            if (params.folder) {
              meta.folder = params.folder;
            }
            if (params.apiKey) {
              meta.api_key = params.apiKey;
            }
            if (params.signature) {
              meta.signature = String(params.signature);
            }
            if (params.timestamp) {
              meta.timestamp = String(params.timestamp);
            }
            if (params.fields) {
              Object.assign(meta, params.fields);
            }

            uppy.setFileMeta(fileID, meta);
          } catch (error) {
            console.error("Failed to prepare Cloudinary upload", error);
            uppy.info("Failed to prepare upload. Please try again.", "error", 5000);
            uppy.removeFile(fileID);
          }
        })
      );
    };

    uppy.addPreProcessor(prepareUpload);

    return () => {
      uppy.removePreProcessor(prepareUpload);
    };
  }, [onGetUploadParameters, uppy]);

  useEffect(() => {
    return () => {
      // Some Uppy versions expect close() without args; cast to any to be safe
      try {
        (uppy as any).close?.({ reason: "unmount" });
      } catch {
        try { (uppy as any).close?.(); } catch {}
      }
    };
  }, [uppy]);

  return (
    <div>
      <Button
        onClick={() => setShowModal(true)}
        className={buttonClassName}
        data-testid="button-upload"
        type="button"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
