import type { UploadResult, UppyFile } from "@uppy/core";

// A small normalized shape the app uses for upload callbacks.
export type NormalizedFile = {
  id: string;
  name?: string;
  size?: number;
  response?: any;
  error?: any;
};

export type NormalizedUploadResult = {
  successful: NormalizedFile[];
  failed: NormalizedFile[];
};

export function normalizeUploadResult(result: UploadResult<any, any>): NormalizedUploadResult {
  const successful: NormalizedFile[] = (result.successful ?? []).map((f: UppyFile<any, any>) => ({
    id: f.id,
    name: (f.name as string) || undefined,
    size: (f.size as number) || undefined,
    response: (f.response ?? (f as any).uploadURL) ?? null,
  }));

  const failed: NormalizedFile[] = (result.failed ?? []).map((f: UppyFile<any, any>) => ({
    id: f.id,
    name: (f.name as string) || undefined,
    size: (f.size as number) || undefined,
    error: (f.error ?? null) as any,
  }));

  return { successful, failed };
}

export default normalizeUploadResult;
