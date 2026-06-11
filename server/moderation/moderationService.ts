/**
 * Content Moderation Service — STUBBED
 *
 * The AFFEXCH database cleanup dropped the banned_keywords + content_flags
 * tables. The per-offer messaging + reviews flows are also gone. This file
 * exports no-op stubs with the original signatures so the rest of the
 * codebase still compiles, while no code path tries to touch the dropped
 * tables.
 *
 * Drop this whole file + its imports in a follow-up cleanup.
 */

export async function initializeModerationKeywords(): Promise<void> {
  /* no-op */
}

export async function checkContent(
  _content: string,
  _contentType: 'message' | 'review',
): Promise<{ flagged: boolean; matchedKeywords: string[]; severity: string | null }> {
  return { flagged: false, matchedKeywords: [], severity: null };
}

export async function flagContent(
  _contentId: string,
  _userId: string,
  _contentType: 'message' | 'review',
  _matchedKeywords: string[],
  _severity: string,
  _flagReason?: string,
): Promise<void> {
  /* no-op */
}

export async function moderateReview(
  _reviewId: string,
  _storage?: unknown,
): Promise<void> {
  /* no-op */
}

export async function moderateMessage(
  _messageId: string,
  _storage?: unknown,
): Promise<void> {
  /* no-op */
}

export async function reviewFlaggedContent(
  _flagId: string,
  _reviewerId: string,
  _action: string,
  _reviewNotes?: string,
): Promise<{ ok: boolean }> {
  return { ok: false };
}

export async function getPendingFlags(): Promise<any[]> {
  return [];
}

export async function getFlagStatistics(): Promise<{ total: number; pending: number; reviewed: number; dismissed: number }> {
  return { total: 0, pending: 0, reviewed: 0, dismissed: 0 };
}
