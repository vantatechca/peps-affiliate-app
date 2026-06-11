/**
 * Platform Health Monitoring Service — STUBBED
 *
 * The AFFEXCH database cleanup dropped the api_metrics, api_error_logs,
 * storage_metrics, video_hosting_costs, and platform_health_snapshots tables.
 * This module now exports no-op stubs with the same signatures so the rest
 * of the codebase still compiles, while no code path tries to read or write
 * to the dropped tables.
 *
 * Drop this whole file in a follow-up cleanup along with the imports in
 * server/index.ts and server/routes.ts.
 */

// In-memory recorders — accept calls and ignore them.
export function recordApiMetric(
  _endpoint: string,
  _method: string,
  _responseTimeMs: number,
  _statusCode: number,
): void {
  /* no-op */
}

export async function recordApiError(
  _endpoint: string,
  _method: string,
  _statusCode: number,
  _errorMessage: string,
  _stackTrace?: string,
  _userId?: string,
  _ip?: string,
  _userAgent?: string,
): Promise<void> {
  /* no-op */
}

export function initializeHealthMonitoring(): void {
  /* no-op — schedulers disabled */
}

export async function flushMetrics(): Promise<void> {
  /* no-op */
}

// Read APIs — return empty data so any /admin endpoint still wired to them
// just shows "no data" instead of crashing.
export async function getRecentApiMetrics(_hours: number): Promise<any[]> {
  return [];
}

export async function getApiMetricsTimeSeries(_days: number): Promise<any[]> {
  return [];
}

export async function getStorageMetricsTimeSeries(_days: number): Promise<any[]> {
  return [];
}

export async function getVideoCostsTimeSeries(_days: number): Promise<any[]> {
  return [];
}

export async function getRecentErrorLogs(_hours: number, _limit?: number): Promise<any[]> {
  return [];
}

export async function getLatestHealthSnapshot(): Promise<null> {
  return null;
}

export async function getPlatformHealthReport(): Promise<{
  api: { avgResponseTimeMs: number; errorRate: number; requestCount: number };
  storage: { totalBytes: number; objectCount: number };
  videos: { totalCostUsd: number; videoCount: number };
}> {
  return {
    api: { avgResponseTimeMs: 0, errorRate: 0, requestCount: 0 },
    storage: { totalBytes: 0, objectCount: 0 },
    videos: { totalCostUsd: 0, videoCount: 0 },
  };
}

export async function calculateStorageUsage(): Promise<{ totalBytes: number; objectCount: number }> {
  return { totalBytes: 0, objectCount: 0 };
}

export async function calculateVideoHostingCosts(): Promise<{ totalCostUsd: number; videoCount: number }> {
  return { totalCostUsd: 0, videoCount: 0 };
}

export async function createHealthSnapshot(): Promise<void> {
  /* no-op */
}

export async function recordDailyStorageMetrics(): Promise<void> {
  /* no-op */
}

export async function recordDailyVideoCosts(): Promise<void> {
  /* no-op */
}
