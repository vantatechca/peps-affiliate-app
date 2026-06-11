import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
// @ts-ignore - Some @uppy/react versions don't export DashboardModal in the typings but runtime may provide it
import { DashboardModal } from "@uppy/react";
// CSS imports temporarily removed due to Vite resolution issues
// Styles will be added via global CSS if needed
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { normalizeUploadResult, type NormalizedUploadResult } from "../lib/uppyAdapter";
import { Button } from "./ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: NormalizedUploadResult
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
        .on("complete", (result) => {
          onComplete?.(normalizeUploadResult(result as UploadResult<any, any>));
        })
  );

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} data-testid="button-upload">
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
